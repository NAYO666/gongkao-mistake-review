(function () {
  "use strict";

  var STORE_KEY = "gk_brain_xingce_v1";
  var SUBJECTS = ["言语理解", "判断推理", "数量关系", "资料分析", "常识判断", "申论"];
  var XINGCE_SUBJECTS = SUBJECTS.slice(0, 5);
  var MODULES_BY_SUBJECT = {
    "言语理解": ["逻辑填空", "片段阅读", "语句表达", "篇章阅读"],
    "判断推理": ["图形推理", "定义判断", "类比推理", "逻辑判断"],
    "数量关系": ["数字推理", "数学运算", "行程问题", "工程问题", "概率问题", "几何问题"],
    "资料分析": ["增长率计算", "比重计算", "平均数", "倍数问题", "基期现期"],
    "常识判断": ["法律常识", "政治常识", "经济常识", "科技常识", "历史文化"],
    "申论": ["归纳概括题", "综合分析题", "提出对策题", "贯彻执行题", "文章写作题"]
  };
  var ERROR_TAGS_BY_SUBJECT = {
    "言语理解": ["没看清题干", "排除不彻底", "思路走偏", "时间不够蒙的", "看错问题", "看不懂题目"],
    "判断推理": ["思路走偏", "排除不彻底", "知识点不熟", "时间不够蒙的", "看错问题", "看不懂题目"],
    "数量关系": ["知识点不熟", "计算错误", "时间不够蒙的", "看错问题", "看不懂题目"],
    "资料分析": ["概念混淆", "没看清题干", "公式记错", "计算错误", "时间不够蒙的", "看错问题", "看不懂题目"],
    "常识判断": ["知识点不熟", "时间不够蒙的", "看错问题", "看不懂题目"],
    "申论": ["没看清题干", "思路走偏", "要点遗漏", "逻辑混乱", "审题偏差", "知识点不熟"]
  };
  var REVIEW_INTERVALS = {
    blind: [1, 3, 7, 14, 30],
    thinking: [2, 4, 9, 18, 35],
    careless: [3, 7, 21]
  };
  var REVIEW_LABELS = {
    blind: "不会",
    thinking: "会但错",
    careless: "马虎"
  };

  var state = {
    data: loadData(),
    view: "home",
    drafts: [],
    subjectFilter: "全部",
    search: "",
    calendarMode: "day",
    selectedDate: todayStr()
  };

  var $ = function (id) { return document.getElementById(id); };

  function defaultData() {
    return {
      mistakes: [],
      tasks: [],
      settings: defaultSettings(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function defaultSettings() {
    return {
      dailyTarget: 240,
      apiBaseUrl: "https://api.openai.com/v1",
      apiModel: "gpt-4o-mini",
      apiKey: ""
    };
  }

  function loadData() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return defaultData();
      return Object.assign(defaultData(), parsed, {
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        settings: Object.assign(defaultSettings(), parsed.settings || {})
      });
    } catch (error) {
      return defaultData();
    }
  }

  function saveData() {
    var updatedAt = new Date().toISOString();
    var nextData = Object.assign({}, state.data, { updatedAt: updatedAt });
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(nextData));
      state.data.updatedAt = updatedAt;
      return true;
    } catch (error) {
      showToast("保存失败，请先导出备份或减少图片数量");
      return false;
    }
  }

  function id(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "待安排";
    var parts = dateStr.split("-");
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function daysUntil(dateStr) {
    if (!dateStr) return 9999;
    var a = new Date(todayStr() + "T00:00:00");
    var b = new Date(dateStr + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  function addDays(dateStr, count) {
    var d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + count);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function addMonths(dateStr, count) {
    var d = new Date(dateStr + "T00:00:00");
    d.setMonth(d.getMonth() + count);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function splitList(value) {
    if (Array.isArray(value)) return value.map(String).map(function (s) { return s.trim(); }).filter(Boolean);
    return String(value || "")
      .split(/[,，、|；;\n]/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function normalizeSubject(value, text) {
    var raw = String(value || "").trim();
    var exact = SUBJECTS.find(function (s) { return s === raw; });
    if (exact) return exact;
    var fuzzy = SUBJECTS.find(function (s) { return raw.indexOf(s) >= 0 || s.indexOf(raw) >= 0; });
    if (fuzzy) return fuzzy;
    return inferSubject(text || raw);
  }

  function inferSubject(text) {
    var source = String(text || "");
    var rules = [
      ["资料分析", /增长率|比重|平均数|倍数|基期|现期|百分点|资料分析|图表|表格|同比|环比/],
      ["数量关系", /方程|行程|工程|概率|排列|组合|几何|数字推理|数量关系|数学运算|利润|浓度/],
      ["判断推理", /图形|定义判断|类比|逻辑判断|真假|充分|必要|削弱|加强|翻译推理|排列组合不是/],
      ["言语理解", /逻辑填空|片段阅读|主旨|意图|语句排序|成语|中心句|言语理解|文段/],
      ["常识判断", /法律|宪法|行政法|经济|科技|历史|文化|地理|常识/],
      ["申论", /申论|作答|材料|概括|对策|贯彻执行|作文/]
    ];
    for (var i = 0; i < rules.length; i += 1) {
      if (rules[i][1].test(source)) return rules[i][0];
    }
    return "言语理解";
  }

  function inferModule(subject, text) {
    var source = String(text || "");
    var modules = MODULES_BY_SUBJECT[subject] || [];
    var exact = modules.find(function (m) { return source.indexOf(m) >= 0; });
    if (exact) return exact;
    var rules = {
      "言语理解": [["逻辑填空", /成语|实词|语境|空格|填入/], ["片段阅读", /主旨|意图|文段|中心|概括/], ["语句表达", /排序|衔接|病句/]],
      "判断推理": [["图形推理", /图形|对称|旋转|折叠/], ["定义判断", /定义|符合|不符合/], ["类比推理", /类比|关系/], ["逻辑判断", /加强|削弱|推出|真假|充分|必要/]],
      "数量关系": [["行程问题", /速度|路程|相遇|追及/], ["工程问题", /效率|工程|完成/], ["概率问题", /概率|至少|至多/], ["几何问题", /面积|体积|三角|圆/]],
      "资料分析": [["增长率计算", /增长率|同比|环比|增速/], ["比重计算", /比重|占比/], ["平均数", /平均|均值/], ["倍数问题", /倍|倍数/]],
      "常识判断": [["法律常识", /法律|宪法|行政|民法|刑法/], ["政治常识", /政治|党|政府/], ["经济常识", /经济|货币|财政/], ["科技常识", /科技|物理|化学|生物/]]
    };
    var subjectRules = rules[subject] || [];
    for (var i = 0; i < subjectRules.length; i += 1) {
      if (subjectRules[i][1].test(source)) return subjectRules[i][0];
    }
    return modules[0] || "";
  }

  function normalizeErrorTags(subject, value, text) {
    var tags = splitList(value);
    var source = String(text || "");
    if (tags.length === 0) {
      if (/计算|算错|小数|单位|百分点/.test(source)) tags.push("计算错误");
      if (/公式|模型|方法/.test(source)) tags.push("公式记错");
      if (/审题|没看清|问法|题干/.test(source)) tags.push("没看清题干");
      if (/排除|选项/.test(source)) tags.push("排除不彻底");
      if (/思路|误判|想偏/.test(source)) tags.push("思路走偏");
    }
    if (tags.length === 0) tags.push((ERROR_TAGS_BY_SUBJECT[subject] || ["知识点不熟"])[0]);
    return Array.from(new Set(tags)).slice(0, 5);
  }

  function calcNextReview(nature, round) {
    var intervals = REVIEW_INTERVALS[nature || "thinking"] || REVIEW_INTERVALS.thinking;
    if (round >= intervals.length) return null;
    return addDays(todayStr(), intervals[round]);
  }

  function applyReviewFeedback(mistake, result) {
    var nature = mistake.nature || "thinking";
    var maxRound = (REVIEW_INTERVALS[nature] || REVIEW_INTERVALS.thinking).length;
    var round = mistake.reviewRound || 0;
    if (result === "wrong") round = Math.max(0, round - 1);
    if (result === "solid") round += 1;
    var nextReview = calcNextReview(nature, round);
    var mastered = result === "solid" && round >= maxRound;
    return Object.assign({}, mistake, {
      reviewRound: round,
      nextReview: mastered ? null : nextReview,
      status: mastered ? "mastered" : "learning",
      reviewCount: (mistake.reviewCount || 0) + 1,
      lastReviewed: todayStr(),
      updatedAt: new Date().toISOString()
    });
  }

  function jsonCandidates(text) {
    var candidates = [];
    String(text || "").replace(/```(?:json)?\s*([\s\S]*?)```/gi, function (_, body) {
      candidates.push(body.trim());
      return "";
    });
    candidates.push(String(text || "").trim());
    return candidates;
  }

  function tryParseJsonCards(text) {
    var candidates = jsonCandidates(text);
    for (var i = 0; i < candidates.length; i += 1) {
      var raw = candidates[i];
      var snippets = [raw];
      var arrayStart = raw.indexOf("[");
      var arrayEnd = raw.lastIndexOf("]");
      var objStart = raw.indexOf("{");
      var objEnd = raw.lastIndexOf("}");
      if (arrayStart >= 0 && arrayEnd > arrayStart) snippets.push(raw.slice(arrayStart, arrayEnd + 1));
      if (objStart >= 0 && objEnd > objStart) snippets.push(raw.slice(objStart, objEnd + 1));
      for (var j = 0; j < snippets.length; j += 1) {
        try {
          var parsed = JSON.parse(snippets[j]);
          var list = Array.isArray(parsed)
            ? parsed
            : parsed.mistakes || parsed.cards || parsed.items || parsed.错题 || parsed.错题卡 || [parsed];
          if (Array.isArray(list) && list.length) return list.map(function (item) { return normalizeImportedCard(item, text); });
        } catch (error) {
          // keep trying
        }
      }
    }
    return [];
  }

  function getValue(obj, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (obj && obj[keys[i]] !== undefined && obj[keys[i]] !== null && obj[keys[i]] !== "") return obj[keys[i]];
    }
    return "";
  }

  function normalizeImportedCard(obj, rawBlock) {
    var allText = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    var subject = normalizeSubject(getValue(obj, ["推荐科目", "科目", "subject"]), allText);
    var module = String(getValue(obj, ["推荐模块", "模块", "module"]) || "").trim() || inferModule(subject, allText);
    var source = String(getValue(obj, ["错题来源", "题目来源", "试卷来源", "考试来源", "来源", "source", "examSource"]) || "").trim();
    var title = String(getValue(obj, ["题目", "题干", "title", "question"]) || "").trim();
    var formula = String(getValue(obj, ["秒杀公式", "公式", "formula"]) || "").trim();
    var summary = String(getValue(obj, ["本题解答总结", "解答总结", "总结", "summary"]) || "").trim();
    var correctAnswer = String(getValue(obj, ["正确答案", "答案", "correctAnswer"]) || "").trim();
    var wrongPath = String(getValue(obj, ["错误路径", "错误思路", "wrongPath"]) || "").trim();
    var trap = String(getValue(obj, ["核心陷阱", "陷阱", "trap"]) || "").trim();
    return {
      tempId: id("draft"),
      title: title || summary || "未命名错题",
      source: source,
      subject: subject,
      module: module,
      errorTags: normalizeErrorTags(subject, getValue(obj, ["推荐错因", "错因", "错因标签", "errorTags"]), allText),
      formula: formula,
      summary: summary,
      correctAnswer: correctAnswer,
      wrongPath: wrongPath,
      trap: trap,
      myAnswer: String(getValue(obj, ["我的作答", "myAnswer"]) || "").trim(),
      raw: rawBlock || allText,
      nature: inferNature(allText)
    };
  }

  function parseMarkdownCards(text) {
    var source = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!source) return [];
    return parseLooseCards(source).filter(function (card) {
      return card.title || card.formula || card.summary;
    });
  }

  function parseLooseCards(text) {
    var cards = [];
    var fields = {};
    var rawLines = [];
    var current = "";

    function hasUsefulContent() {
      return Boolean(fields["题目"] || fields["题干"] || fields["秒杀公式"] || fields["本题解答总结"] || fields["解答总结"] || fields["总结"]);
    }

    function pushCard() {
      if (!hasUsefulContent()) return;
      cards.push(normalizeImportedCard(fields, rawLines.join("\n")));
      fields = {};
      rawLines = [];
      current = "";
    }

    text.split("\n").forEach(function (line) {
      var clean = line.replace(/^\s*[-*]\s*/, "").trim();
      if (/^-{3,}$/.test(clean)) {
        pushCard();
        return;
      }
      if (!clean) {
        if (current) rawLines.push(line);
        return;
      }
      var match = clean.match(/^(.{1,12}?)\s*[:：]\s*(.*)$/);
      var label = match ? canonicalField(match[1]) : "";
      if (label) {
        if ((label === "错题来源" && hasUsefulContent()) || (label === "题目" && fields["题目"])) {
          pushCard();
        }
        current = label;
        fields[current] = fields[current] ? fields[current] + "\n" + (match[2] || "") : (match[2] || "");
        rawLines.push(line);
        return;
      }
      if (current) {
        fields[current] = (fields[current] ? fields[current] + "\n" : "") + clean;
      } else if (!fields["题目"]) {
        current = "题目";
        fields[current] = clean;
      }
      rawLines.push(line);
    });

    pushCard();
    return cards;
  }

  function canonicalField(label) {
    var clean = String(label || "").replace(/\s/g, "");
    var map = {
      "题目": "题目",
      "题干": "题目",
      "正确答案": "正确答案",
      "答案": "正确答案",
      "错误路径": "错误路径",
      "错误思路": "错误路径",
      "核心陷阱": "核心陷阱",
      "陷阱": "核心陷阱",
      "秒杀公式": "秒杀公式",
      "公式": "秒杀公式",
      "本题解答总结": "本题解答总结",
      "解答总结": "本题解答总结",
      "总结": "本题解答总结",
      "推荐科目": "推荐科目",
      "科目": "推荐科目",
      "推荐模块": "推荐模块",
      "模块": "推荐模块",
      "推荐错因": "推荐错因",
      "错因": "推荐错因",
      "错因标签": "推荐错因",
      "推荐错因标签": "推荐错因",
      "我的作答": "我的作答",
      "错题来源": "错题来源",
      "题目来源": "错题来源",
      "试卷来源": "错题来源",
      "考试来源": "错题来源",
      "来源": "错题来源"
    };
    return map[clean] || "";
  }

  function parseClaudeText(text) {
    var jsonCards = tryParseJsonCards(text);
    var cards = jsonCards.length ? jsonCards : parseMarkdownCards(text);
    return cards.map(function (card) {
      var subject = normalizeSubject(card.subject, card.raw + card.title + card.summary);
      return Object.assign(card, {
        subject: subject,
        module: card.module || inferModule(subject, card.raw + card.title + card.summary),
        errorTags: normalizeErrorTags(subject, card.errorTags, card.raw + card.title + card.summary)
      });
    });
  }

  async function parseClaudeTextWithAI(text) {
    var settings = state.data.settings || {};
    var apiKey = String(settings.apiKey || "").trim();
    if (!apiKey) throw new Error("还没有在设置里填写 API Key。");
    var baseUrl = String(settings.apiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    var model = String(settings.apiModel || "gpt-4o-mini").trim();
    var prompt = [
      "你是公考行测错题整理助手。请把用户粘贴的内容拆分为准确的多道错题卡。",
      "注意：不要把“错题来源”单独拆成一题；一条错题通常从错题来源或题目开始，到下一条错题来源/题目之前结束。",
      "只返回 JSON 对象，不要 Markdown。格式：",
      JSON.stringify({
        mistakes: [{
          "错题来源": "如：2026年浙江省公务员考试(C类)",
          "题目": "完整题干和选项",
          "正确答案": "选项或答案",
          "错误路径": "做错原因或错误思路",
          "核心陷阱": "核心陷阱",
          "秒杀公式": "方法、公式、秒杀思路",
          "本题解答总结": "解答总结",
          "推荐科目": "言语理解|判断推理|数量关系|资料分析|常识判断|申论",
          "推荐模块": "具体模块",
          "推荐错因": ["错因1", "错因2"]
        }]
      }),
      "用户内容：",
      text
    ].join("\n");

    var response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.05,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });
    var bodyText = await response.text();
    if (!response.ok) throw new Error("AI 请求失败：" + bodyText.slice(0, 180));
    var payload = JSON.parse(bodyText);
    var content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
    if (!content) throw new Error("AI 没有返回可解析内容。");
    var parsed = JSON.parse(content);
    var list = Array.isArray(parsed) ? parsed : parsed.mistakes || parsed.cards || parsed.items || [];
    if (!Array.isArray(list) || !list.length) throw new Error("AI 没有整理出错题。");
    return list.map(function (item) { return normalizeImportedCard(item, text); });
  }

  async function parseImagesWithAI(files) {
    var settings = state.data.settings || {};
    var apiKey = String(settings.apiKey || "").trim();
    if (!apiKey) throw new Error("还没有在设置里填写 API Key。");
    var baseUrl = String(settings.apiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    var model = String(settings.apiModel || "gpt-4o-mini").trim();
    var imageParts = [];
    for (var i = 0; i < files.length; i += 1) {
      imageParts.push({ type: "text", text: "图片 " + (i + 1) + "：" + files[i].name });
      imageParts.push({ type: "image_url", image_url: { url: await readFileAsDataUrl(files[i]) } });
    }
    var prompt = [
      "你是公考行测错题图片识别助手。请识别图片中的题目、答案或解析，并整理为错题卡。",
      "如果多张图片属于同一道题，请合并；如果是多道题，请拆分。",
      "只返回 JSON 对象，不要 Markdown。格式：",
      JSON.stringify({
        mistakes: [{
          "错题来源": "能从图片或文件名判断则填写，否则留空",
          "题目": "题干和选项",
          "正确答案": "答案",
          "错误路径": "",
          "核心陷阱": "",
          "秒杀公式": "解法或公式",
          "本题解答总结": "简要总结",
          "推荐科目": "言语理解|判断推理|数量关系|资料分析|常识判断|申论",
          "推荐模块": "具体模块",
          "推荐错因": ["待确认"]
        }]
      })
    ].join("\n");

    var response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.05,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [{ type: "text", text: prompt }].concat(imageParts)
        }]
      })
    });
    var bodyText = await response.text();
    if (!response.ok) throw new Error("图片识别失败：" + bodyText.slice(0, 180));
    var payload = JSON.parse(bodyText);
    var content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
    if (!content) throw new Error("AI 没有返回可解析内容。");
    var parsed = JSON.parse(content);
    var list = Array.isArray(parsed) ? parsed : parsed.mistakes || parsed.cards || parsed.items || [];
    if (!Array.isArray(list) || !list.length) throw new Error("AI 没有识别出错题。");
    var attachments = [];
    for (var j = 0; j < files.length; j += 1) {
      attachments.push(await fileToAttachment(files[j]));
    }
    return list.map(function (item, index) {
      var draft = normalizeImportedCard(item, "图片 AI 识别");
      draft.images = index === 0 ? attachments : [];
      return draft;
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function fileToAttachment(file) {
    return {
      id: id("img"),
      name: file.name,
      type: file.type || "image/*",
      dataUrl: await readFileAsDataUrl(file),
      createdAt: new Date().toISOString()
    };
  }

  function inferNature(text) {
    if (/不会|没思路|知识点不熟|完全/.test(text)) return "blind";
    if (/马虎|粗心|看错|没看清|计算错误/.test(text)) return "careless";
    return "thinking";
  }

  function mistakeFromDraft(draft) {
    return {
      id: id("mistake"),
      title: String(draft.title || "未命名错题").trim(),
      source: String(draft.source || "").trim(),
      subject: draft.subject,
      module: String(draft.module || "").trim(),
      errorTags: splitList(draft.errorTags),
      formula: String(draft.formula || "").trim(),
      summary: String(draft.summary || "").trim(),
      correctAnswer: String(draft.correctAnswer || "").trim(),
      wrongPath: String(draft.wrongPath || "").trim(),
      trap: String(draft.trap || "").trim(),
      myAnswer: String(draft.myAnswer || "").trim(),
      images: Array.isArray(draft.images) ? draft.images : [],
      raw: String(draft.raw || "").trim(),
      nature: draft.nature || "thinking",
      status: "new",
      reviewRound: 0,
      reviewCount: 0,
      nextReview: draft.addedDate || todayStr(),
      createdAt: (draft.addedDate || todayStr()) + "T00:00:00.000Z",
      updatedAt: new Date().toISOString()
    };
  }

  function dueMistakes() {
    var today = todayStr();
    return state.data.mistakes
      .filter(function (m) { return m.status !== "mastered" && m.nextReview && m.nextReview <= today; })
      .sort(function (a, b) { return a.nextReview.localeCompare(b.nextReview) || a.subject.localeCompare(b.subject); });
  }

  function todayTasks() {
    var today = todayStr();
    return state.data.tasks
      .filter(function (t) { return t.date === today && !t.sourceMistakeId; })
      .sort(function (a, b) { return Number(a.done) - Number(b.done) || a.title.localeCompare(b.title); });
  }

  function render() {
    $("dateLabel").textContent = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
    renderTopAction();
    renderHome();
    renderImport();
    renderLibrary();
    renderPlan();
    renderReview();
    renderSettings();
  }

  function renderTopAction() {
    var btn = $("quickImportBtn");
    if (!btn) return;
    var visible = state.view === "plan" || state.view === "library";
    btn.style.visibility = visible ? "visible" : "hidden";
    btn.setAttribute("aria-hidden", visible ? "false" : "true");
    btn.title = state.view === "plan" ? "新建计划" : "新建错题";
    btn.dataset.topAction = state.view === "plan" ? "task" : "mistake";
  }

  function renderHome() {
    var tasks = todayTasks();
    var doneTasks = tasks.filter(function (t) { return t.done; });
    var doneMinutes = doneTasks.reduce(function (sum, t) { return sum + Number(t.minutes || 0); }, 0);
    var due = dueMistakes();
    var totalMistakes = state.data.mistakes.length;
    var targetMinutes = Number(state.data.settings.dailyTarget || 240);
    var progress = targetMinutes ? Math.min(100, Math.round(doneMinutes / targetMinutes * 100)) : 0;
    $("metricGrid").innerHTML = [
      '<div class="home-dashboard home-hero-card" style="--progress:' + Number(progress || 0) + '">',
      '<div class="home-hero-progress">',
      '<div class="home-progress-ring" aria-label="今日专注进度 ' + Number(progress || 0) + '%">',
      '<div class="home-progress-center"><strong class="home-progress-value">' + Number(doneMinutes || 0) + '</strong><span class="home-progress-unit">分钟</span></div>',
      '</div>',
      '<div class="home-progress-meta"><span>今日专注</span><strong>' + Number(progress || 0) + '%</strong><small>目标 ' + Number(targetMinutes || 0) + ' 分钟</small></div>',
      '</div>',
      '<div class="home-hero-stats">',
      '<div class="home-stat-item" style="--i:1"><strong>' + Number(due.length || 0) + '</strong><span>待复习</span></div>',
      '<div class="home-stat-item" style="--i:2"><strong>' + escapeHtml(doneTasks.length + "/" + tasks.length) + '</strong><span>今日任务</span></div>',
      '<div class="home-stat-item" style="--i:3"><strong>' + Number(totalMistakes || 0) + '</strong><span>错题总数</span></div>',
      '</div>',
      '</div>'
    ].join("");
    $("dueList").innerHTML = renderHomeReviewEntry(due.length);
    $("todayTaskList").innerHTML = tasks.length ? tasks.map(function (t, index) { return renderTaskCard(t, index); }).join("") : empty("今天还没有任务");
  }

  function metric(label, value, hint, index) {
    return '<div class="metric-card metric-card-small" style="--i:' + Number(index || 0) + '"><strong>' + escapeHtml(value) + '</strong><span>' + label + " · " + hint + "</span></div>";
  }

  function heroMetric(doneMinutes, targetMinutes, progress) {
    return [
      '<div class="metric-card metric-card-hero" style="--i:0">',
      '<span class="hero-label">今日专注进度</span>',
      '<strong>' + Number(doneMinutes || 0) + '<small>/' + Number(targetMinutes || 0) + ' 分钟</small></strong>',
      '<div class="hero-progress" aria-hidden="true"><i style="width:' + Number(progress || 0) + '%"></i></div>',
      '<span class="hero-hint">已完成 ' + Number(progress || 0) + '% · ' + (progress >= 100 ? "今日目标已达成" : "继续推进今日目标") + '</span>',
      "</div>"
    ].join("");
  }

  function empty(text) {
    return '<div class="empty-state">' + escapeHtml(text) + "</div>";
  }

  function renderHomeReviewEntry(count) {
    var title = count ? "今天有 " + Number(count) + " 道错题待复习" : "今天暂无到期复习";
    var hint = count ? "进入复习页逐题处理，避免在首页误触反馈。" : "复习入口会保留在这里，到期后直接从这里进入。";
    return [
      '<button class="home-review-entry" data-home-review-entry type="button">',
      '<span class="home-review-copy"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(hint) + '</span></span>',
      '<span class="home-review-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>',
      "</button>"
    ].join("");
  }

  function renderMistakeCard(m, index, options) {
    options = Object.assign({ feedback: true }, options || {});
    var days = daysUntil(m.nextReview);
    var statusClass = days < 0 ? "overdue" : days === 0 ? "due" : "";
    var statusText = m.status === "mastered" ? "已掌握" : days < 0 ? "逾期" + Math.abs(days) + "天" : days === 0 ? "今天复习" : days + "天后";
    var feedbackHtml = options.feedback === false ? "" : [
      '<div class="feedback-row">',
      '<button data-review="' + m.id + '" data-result="wrong" type="button">不会</button>',
      '<button data-review="' + m.id + '" data-result="shaky" type="button">不稳</button>',
      '<button data-review="' + m.id + '" data-result="solid" type="button">掌握</button>',
      '</div>'
    ].join("");
    return [
      '<article class="mistake-card" data-mistake-id="' + m.id + '" style="--i:' + Number(index || 0) + '">',
      '<div class="card-top"><h3>' + escapeHtml(m.title) + '</h3><span class="status-pill ' + statusClass + '">' + statusText + '</span></div>',
      '<div class="mistake-source-row">' + (m.source ? '<span>' + escapeHtml(m.source) + '</span>' : '<span>未填写来源</span>') + '</div>',
      '<div class="mistake-reason-row">' + (m.errorTags && m.errorTags.length ? m.errorTags.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join("") : '<span>未填写错因</span>') + '</div>',
      feedbackHtml,
      "</article>"
    ].join("");
  }

  function renderLibraryMistakeCard(m, index) {
    var days = daysUntil(m.nextReview);
    var statusClass = days < 0 ? "overdue" : days === 0 ? "due" : "";
    var statusText = m.status === "mastered" ? "已掌握" : days < 0 ? "逾期" + Math.abs(days) + "天" : days === 0 ? "今天复习" : days + "天后";
    var tagItems = [];
    tagItems.push('<span class="tag-pill source-tag">' + escapeHtml(m.source || "未填写来源") + '</span>');
    if (m.errorTags && m.errorTags.length) {
      tagItems = tagItems.concat(m.errorTags.map(function (tag) {
        return '<span class="tag-pill">' + escapeHtml(tag) + '</span>';
      }));
    } else {
      tagItems.push('<span class="tag-pill">未填写错因</span>');
    }
    return [
      '<article class="mistake-card library-mistake-card" data-mistake-id="' + m.id + '" style="--i:' + Number(index || 0) + '">',
      '<span class="review-badge ' + statusClass + '">' + escapeHtml(statusText) + '</span>',
      '<h3 class="library-question-text">' + escapeHtml(m.title) + '</h3>',
      '<div class="tags-container">' + tagItems.join("") + '</div>',
      "</article>"
    ].join("");
  }

  function renderTaskCard(t, index) {
    return [
      '<article class="task-card ' + (t.done ? "is-done" : "") + '" data-task-id="' + t.id + '" style="--i:' + Number(index || 0) + '">',
      '<span class="task-state" aria-hidden="true">' + (t.done ? taskIcon("check") : "") + '</span>',
      '<div class="task-main"><h3>' + escapeHtml(t.title) + '</h3><div class="task-meta"><span>' + escapeHtml(t.subject || "行测") + '</span><strong class="priority-' + (t.priority || "medium") + '">' + priorityLabel(t.priority) + '</strong><span>' + formatDate(t.date) + '</span><span>' + Number(t.minutes || 0) + '分钟</span></div>' + (t.note ? '<p>' + escapeHtml(t.note) + '</p>' : "") + '</div>',
      '<div class="task-actions"><button data-task-edit="' + t.id + '" type="button" title="编辑" aria-label="编辑">' + taskIcon("edit") + '</button><button data-task-done="' + t.id + '" type="button" title="完成" aria-label="完成">' + taskIcon("check") + '</button><button data-task-delete="' + t.id + '" type="button" title="删除" aria-label="删除">' + taskIcon("trash") + '</button></div>',
      "</article>"
    ].join("");
  }

  function taskIcon(name) {
    var paths = {
      check: '<path d="M20 6 9 17l-5-5"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.list) + '</svg>';
  }

  function priorityLabel(priority) {
    if (priority === "high") return "高优先";
    if (priority === "low") return "低优先";
    return "中优先";
  }

  function renderImport() {
    var list = $("draftList");
    if (!list) return;
    var summary = $("draftSummary");
    if (summary) summary.textContent = "待保存草稿" + (state.drafts.length ? "（" + state.drafts.length + "）" : "");
    list.innerHTML = state.drafts.length ? state.drafts.map(renderDraftCard).join("") : empty("暂无草稿");
  }

  function renderDraftCard(draft, index) {
    var moduleOptions = (MODULES_BY_SUBJECT[draft.subject] || []).map(function (m) {
      return '<option value="' + escapeHtml(m) + '"' + (draft.module === m ? " selected" : "") + ">" + escapeHtml(m) + "</option>";
    }).join("");
    var subjectOptions = SUBJECTS.map(function (s) {
      return '<option value="' + s + '"' + (draft.subject === s ? " selected" : "") + ">" + s + "</option>";
    }).join("");
    return [
      '<article class="draft-card" data-draft-index="' + index + '" style="--i:' + Number(index || 0) + '">',
      '<div class="card-top"><h3>草稿 ' + (index + 1) + '</h3><button class="text-button" data-remove-draft="' + index + '" type="button">移除</button></div>',
      '<div class="draft-fields">',
      field("题目", '<textarea data-draft-field="title" rows="3">' + escapeHtml(draft.title) + "</textarea>", "wide"),
      field("错题来源", '<input data-draft-field="source" value="' + escapeHtml(draft.source || "") + '" placeholder="如：2025年江苏省公务员考试（C类）">', "wide"),
      field("添加日期", '<input data-draft-field="addedDate" type="date" value="' + escapeHtml(draft.addedDate || todayStr()) + '">'),
      field("科目", '<select data-draft-field="subject">' + subjectOptions + "</select>"),
      field("模块", '<select data-draft-field="module"><option value="">未选择</option>' + moduleOptions + "</select>"),
      field("错因", '<input data-draft-field="errorTags" value="' + escapeHtml(draft.errorTags.join("，")) + '">', "wide"),
      field("秒杀公式", '<textarea data-draft-field="formula" rows="3">' + escapeHtml(draft.formula) + "</textarea>", "wide"),
      field("解答总结", '<textarea data-draft-field="summary" rows="3">' + escapeHtml(draft.summary) + "</textarea>", "wide"),
      renderImageStrip(draft.images || [], "draft", index),
      "</div>",
      "</article>"
    ].join("");
  }

  function renderImageStrip(images, scope, owner) {
    if (!images || !images.length) return '<div class="image-strip empty wide">暂无图片</div>';
    return '<div class="image-strip wide">' + images.map(function (image) {
      return [
        '<figure class="image-thumb">',
        '<img src="' + image.dataUrl + '" alt="' + escapeHtml(image.name || "错题图片") + '">',
        '<figcaption>' + escapeHtml(image.name || "图片") + '</figcaption>',
        scope ? '<button data-remove-image="' + image.id + '" data-image-scope="' + scope + '" data-image-owner="' + owner + '" type="button">移除</button>' : "",
        '</figure>'
      ].join("");
    }).join("") + "</div>";
  }

  function field(label, control, cls) {
    return '<label class="field-label ' + (cls || "") + '">' + label + control + "</label>";
  }

  function renderLibrary() {
    var subjectFilter = $("subjectFilter");
    if (!subjectFilter.dataset.ready) {
      subjectFilter.innerHTML = ['<option value="全部">全部</option>'].concat(SUBJECTS.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; })).join("");
      subjectFilter.dataset.ready = "1";
    }
    subjectFilter.value = state.subjectFilter;
    $("searchInput").value = state.search;
    $("subjectChips").innerHTML = ["全部"].concat(SUBJECTS).map(function (s) {
      return '<button class="' + (state.subjectFilter === s ? "is-active" : "") + '" data-subject-chip="' + s + '" type="button">' + s + "</button>";
    }).join("");
    renderSubjectStats();
    var query = state.search.trim().toLowerCase();
    var list = state.data.mistakes.filter(function (m) {
      var subjectOk = state.subjectFilter === "全部" || m.subject === state.subjectFilter;
      var text = [m.title, m.source, m.subject, m.module, m.formula, m.summary, m.errorTags.join(" "), m.raw].join(" ").toLowerCase();
      return subjectOk && (!query || text.indexOf(query) >= 0);
    });
    $("mistakeList").innerHTML = list.length ? list.map(renderLibraryMistakeCard).join("") : empty("没有匹配的错题");
  }

  function renderSubjectStats() {
    var el = $("subjectStats");
    if (!el) return;
    var counts = {};
    state.data.mistakes.forEach(function (m) {
      var key = m.subject || "未分类";
      counts[key] = (counts[key] || 0) + 1;
    });
    el.innerHTML = SUBJECTS.map(function (subject) {
      return '<span class="stat-chip"><strong>' + Number(counts[subject] || 0) + '</strong>' + escapeHtml(subject) + '</span>';
    }).join("");
  }

  function renderReview() {
    var overdueEl = $("reviewOverdueList");
    var todayEl = $("reviewTodayList");
    if (!overdueEl || !todayEl) return;
    var today = todayStr();
    var overdue = state.data.mistakes
      .filter(function (m) { return m.status !== "mastered" && m.nextReview && m.nextReview < today; })
      .sort(function (a, b) { return a.nextReview.localeCompare(b.nextReview); })
    var todayList = state.data.mistakes
      .filter(function (m) { return m.status !== "mastered" && m.nextReview === today; })
      .sort(function (a, b) { return a.subject.localeCompare(b.subject); });
    overdueEl.innerHTML = overdue.length ? overdue.map(function (m, index) { return renderMistakeCard(m, index, { feedback: true }); }).join("") : empty("没有逾期错题");
    todayEl.innerHTML = todayList.length ? todayList.map(function (m, index) { return renderMistakeCard(m, index, { feedback: true }); }).join("") : empty("今天没有待复习错题");
  }

  function renderPlan() {
    Array.from($("calendarMode").querySelectorAll("button")).forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.mode === state.calendarMode);
    });
    if (state.calendarMode === "day") renderDayPlan();
    if (state.calendarMode === "week") renderWeekPlan();
    if (state.calendarMode === "month") renderMonthPlan();
  }

  function tasksForDate(date) {
    return state.data.tasks.filter(function (t) { return t.date === date && !t.sourceMistakeId; });
  }

  function reviewsForDate(date) {
    return state.data.mistakes.filter(function (m) { return m.nextReview === date && m.status !== "mastered"; });
  }

  function renderDayPlan() {
    var date = state.selectedDate;
    var tasks = tasksForDate(date);
    $("calendarShell").innerHTML = [
      renderPlanNav("day", date),
      '<div class="item-list task-list">',
      tasks.map(function (t, index) { return renderTaskCard(t, index); }).join("") || empty("这天没有安排"),
      "</div>"
    ].join("");
  }

  function renderWeekPlan() {
    var monday = startOfWeek(state.selectedDate);
    var html = renderPlanNav("week", monday) + '<div class="week-board">';
    for (var i = 0; i < 7; i += 1) {
      html += renderWeekColumn(addDays(monday, i));
    }
    html += "</div>";
    $("calendarShell").innerHTML = html;
  }

  function renderMonthPlan() {
    var d = new Date(state.selectedDate + "T00:00:00");
    var first = new Date(d.getFullYear(), d.getMonth(), 1);
    var start = startOfWeek(first.toISOString().slice(0, 10));
    var html = renderPlanNav("month", state.selectedDate) + '<div class="calendar-grid month-grid">';
    for (var i = 0; i < 42; i += 1) {
      html += renderCalendarDay(addDays(start, i), "month");
    }
    html += '</div><div class="selected-day-panel">' + renderDateTaskSection(state.selectedDate, "month") + "</div>";
    $("calendarShell").innerHTML = html;
  }

  function renderPlanNav(mode, date) {
    var title = "";
    if (mode === "day") {
      title = (date === todayStr() ? "今天 " : "") + formatDate(date) + " " + new Date(date + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "short" });
    }
    if (mode === "week") title = formatDate(date) + " - " + formatDate(addDays(date, 6));
    if (mode === "month") {
      var d = new Date(date + "T00:00:00");
      title = d.getFullYear() + "年" + (d.getMonth() + 1) + "月";
    }
    return '<div class="plan-nav"><button class="round-button" data-period-move="-1" type="button">‹</button><strong>' + escapeHtml(title) + '</strong><button class="round-button" data-period-move="1" type="button">›</button></div>';
  }

  function startOfWeek(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function renderCalendarDay(date, mode) {
    var tasks = tasksForDate(date);
    var dots = tasks.slice(0, 3).map(function () { return '<span class="mini-dot"></span>'; }).join("");
    var cls = [
      "calendar-day",
      date === todayStr() ? "is-today" : "",
      date === state.selectedDate ? "is-selected" : ""
    ].join(" ");
    return '<button class="' + cls + '" data-pick-date="' + date + '" data-calendar-pick-mode="' + (mode || state.calendarMode) + '" type="button"><strong>' + Number(date.slice(8)) + "</strong>" + (tasks.length > 3 ? '<em>+' + (tasks.length - 3) + '</em>' : "") + '<span class="dot-row">' + dots + "</span></button>";
  }

  function renderWeekColumn(date) {
    var d = new Date(date + "T00:00:00");
    var tasks = tasksForDate(date);
    return [
      '<section class="week-column ' + (date === state.selectedDate ? "is-selected" : "") + '">',
      '<button class="week-day-head" data-pick-date="' + date + '" data-calendar-pick-mode="week" type="button">',
      '<span>' + d.toLocaleDateString("zh-CN", { weekday: "short" }) + '</span><strong>' + Number(date.slice(8)) + '</strong><small>' + tasks.length + '项</small>',
      '</button>',
      '<div class="week-day-tasks">',
      tasks.length ? tasks.map(function (task, index) { return renderWeekTask(task, index); }).join("") : "",
      "</div>",
      "</section>"
    ].join("");
  }

  function renderWeekTask(task, index) {
    return '<button class="week-task ' + (task.done ? "is-done" : "") + '" data-task-edit="' + task.id + '" type="button" style="--i:' + Number(index || 0) + '"><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(task.subject || "") + '</span></button>';
  }

  function renderDateTaskSection(date, mode) {
    var tasks = tasksForDate(date);
    var title = mode === "week"
      ? new Date(date + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "short", month: "numeric", day: "numeric" })
      : formatDate(date);
    return [
      '<section class="date-task-section">',
      '<div class="section-head compact"><h3>' + escapeHtml(title) + '</h3>' + (mode === "week" ? '<button class="text-button" data-open-day="' + date + '" type="button">查看日</button>' : "") + '</div>',
      '<div class="item-list compact-list task-list">',
      tasks.length ? tasks.map(function (t, index) { return renderTaskCard(t, index); }).join("") : empty("这天没有计划"),
      "</div>",
      "</section>"
    ].join("");
  }

  function renderSettings() {
    var settings = Object.assign(defaultSettings(), state.data.settings || {});
    $("dailyTargetInput").value = settings.dailyTarget || 240;
    $("apiBaseUrlInput").value = settings.apiBaseUrl || "https://api.openai.com/v1";
    $("apiModelInput").value = settings.apiModel || "gpt-4o-mini";
    $("apiKeyInput").value = "";
    $("apiKeyInput").placeholder = settings.apiKey ? "已保存，留空则不修改" : "请输入 API Key";
    setApiTestStatus("", "");
  }

  function readAiSettingsFromForm() {
    var saved = state.data.settings || {};
    return {
      apiBaseUrl: $("apiBaseUrlInput").value.trim() || "https://api.openai.com/v1",
      apiModel: $("apiModelInput").value.trim() || "gpt-4o-mini",
      apiKey: $("apiKeyInput").value.trim() || String(saved.apiKey || "").trim()
    };
  }

  function setApiTestStatus(text, type) {
    var el = $("apiTestStatus");
    if (!el) return;
    el.textContent = text || "";
    el.className = "api-test-status" + (type ? " " + type : "");
  }

  function explainApiError(status, bodyText) {
    var body = String(bodyText || "").slice(0, 220);
    if (status === 401 || status === 403) return "Key 无效或没有权限，请检查 API Key。";
    if (status === 404) return "地址或模型可能不对，接口没有找到。";
    if (status === 429) return "额度不足或请求太频繁，稍后再试。";
    if (status >= 500) return "中转站或模型服务暂时异常。";
    if (body) return "请求失败：" + body;
    return "请求失败，状态码：" + status;
  }

  async function testApiConnection() {
    var btn = $("testApiBtn");
    var settings = readAiSettingsFromForm();
    if (!settings.apiKey) {
      setApiTestStatus("请先填写 API Key，或保存过一个 Key。", "error");
      return;
    }
    if (!settings.apiModel) {
      setApiTestStatus("请填写模型名称。", "error");
      return;
    }
    var baseUrl = settings.apiBaseUrl.replace(/\/$/, "");
    setApiTestStatus("正在测试...", "");
    if (btn) btn.disabled = true;
    try {
      var response = await fetch(baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + settings.apiKey
        },
        body: JSON.stringify({
          model: settings.apiModel,
          temperature: 0,
          max_tokens: 8,
          messages: [{ role: "user", content: "请只回复 OK" }]
        })
      });
      var bodyText = await response.text();
      if (!response.ok) {
        setApiTestStatus(explainApiError(response.status, bodyText), "error");
        return;
      }
      var payload = JSON.parse(bodyText);
      var content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      setApiTestStatus(content ? "连接成功，模型可用。" : "连接成功，但返回格式异常。", content ? "success" : "error");
    } catch (error) {
      setApiTestStatus("连接失败：可能是地址错误、网络问题，或浏览器跨域拦截。", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function switchView(view) {
    state.view = view;
    Array.from(document.querySelectorAll(".view")).forEach(function (el) {
      var active = el.dataset.view === view;
      el.classList.toggle("is-active", active);
      el.classList.remove("is-entering");
      el.classList.remove("fade-in-up");
      if (active) {
        window.requestAnimationFrame(function () {
          el.classList.add("is-entering");
          el.classList.add("fade-in-up");
          clearTimeout(el.enterTimer);
          el.enterTimer = setTimeout(function () {
            el.classList.remove("is-entering");
            el.classList.remove("fade-in-up");
          }, 360);
        });
      }
    });
    Array.from(document.querySelectorAll("[data-nav]")).forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.nav === view);
    });
    renderTopAction();
  }

  function openMistakeSheet(mistake, options) {
    options = options || {};
    var isNew = !mistake;
    mistake = mistake || {
      id: "",
      title: "",
      source: "",
      subject: "判断推理",
      module: "",
      errorTags: [],
      formula: "",
      summary: "",
      correctAnswer: "",
      wrongPath: "",
      trap: "",
      myAnswer: "",
      addedDate: todayStr(),
      images: []
    };
    $("mistakeSheetBody").innerHTML = (isNew || options.editing)
      ? renderMistakeEditForm(mistake, isNew)
      : renderMistakeReadonly(mistake);
    $("mistakeSheetBackdrop").classList.add("is-open");
    $("mistakeSheet").classList.add("is-open");
    $("mistakeSheet").setAttribute("aria-hidden", "false");
  }

  function renderMistakeEditForm(mistake, isNew) {
    var moduleOptions = (MODULES_BY_SUBJECT[mistake.subject] || []).map(function (m) {
      return '<option value="' + escapeHtml(m) + '"' + (mistake.module === m ? " selected" : "") + ">" + escapeHtml(m) + "</option>";
    }).join("");
    var subjectOptions = SUBJECTS.map(function (s) {
      return '<option value="' + s + '"' + (mistake.subject === s ? " selected" : "") + ">" + s + "</option>";
    }).join("");
    return [
      '<form class="detail-section" id="mistakeEditForm" data-edit-mistake-id="' + mistake.id + '">',
      '<div class="mistake-sticky-head">',
      '<div class="mistake-route">',
      '<label><span>科目</span><select name="subject">' + subjectOptions + "</select></label>",
      '<strong>·</strong>',
      '<label><span>模块</span><select name="module"><option value="">未选择</option>' + moduleOptions + "</select></label>",
      '</div>',
      '<button class="mistake-close-button" id="closeMistakeSheetBtn" type="button" aria-label="关闭">×</button>',
      '</div>',
      field("错题来源", '<input name="source" value="' + escapeHtml(mistake.source || "") + '">', "wide"),
      field("添加日期", '<input name="addedDate" type="date" value="' + escapeHtml(isNew ? todayStr() : (mistake.createdAt ? String(mistake.createdAt).slice(0, 10) : todayStr())) + '">'),
      field("题目", '<textarea name="title" rows="5">' + escapeHtml(mistake.title) + "</textarea>", "wide"),
      isNew ? "" : '<div class="wide mistake-image-field"><strong>图片</strong>' + renderImageStrip(mistake.images || [], "mistake", mistake.id) + '<label class="secondary-button file-label import-file-button">添加图片<input data-add-image-to-mistake="' + mistake.id + '" type="file" accept="image/*" multiple></label></div>',
      field("错因", '<input name="errorTags" value="' + escapeHtml((mistake.errorTags || []).join("，")) + '">', "wide"),
      field("秒杀公式", '<textarea name="formula" rows="4">' + escapeHtml(mistake.formula || "") + "</textarea>", "wide"),
      field("总结", '<textarea name="summary" rows="4">' + escapeHtml(mistake.summary || "") + "</textarea>", "wide"),
      field("正确答案", '<textarea name="correctAnswer" rows="2">' + escapeHtml(mistake.correctAnswer || "") + "</textarea>", "wide"),
      field("错误路径", '<textarea name="wrongPath" rows="3">' + escapeHtml(mistake.wrongPath || "") + "</textarea>", "wide"),
      '<input name="trap" type="hidden" value="' + escapeHtml(mistake.trap || "") + '">',
      field("我的作答", '<textarea name="myAnswer" rows="4">' + escapeHtml(mistake.myAnswer || "") + "</textarea>", "wide"),
      isNew ? "" : '<div class="button-row wide"><button class="secondary-button danger-button" data-delete-mistake="' + mistake.id + '" type="button">删除错题</button><button class="secondary-button" data-cancel-mistake-edit="' + mistake.id + '" type="button">取消编辑</button></div>',
      '<button class="primary-button wide" type="submit">' + (isNew ? "保存错题" : "保存修改") + '</button>',
      "</form>"
    ].join("");
  }

  function renderMistakeReadonly(mistake) {
    var createdDate = mistake.createdAt ? String(mistake.createdAt).slice(0, 10) : "";
    var days = daysUntil(mistake.nextReview);
    var statusText = !mistake.nextReview ? "未安排" : mistake.status === "mastered" ? "已掌握" : days < 0 ? "逾期" + Math.abs(days) + "天" : days === 0 ? "今天复习" : days + "天后";
    var tags = mistake.errorTags && mistake.errorTags.length
      ? mistake.errorTags.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join("")
      : '<span>未填写错因</span>';
    return [
      '<section class="detail-section mistake-readonly" data-readonly-mistake-id="' + mistake.id + '">',
      '<div class="mistake-sticky-head">',
      '<div class="mistake-route readonly-route">',
      '<label><span>科目</span><em>' + escapeHtml(mistake.subject || "未分类") + '</em></label>',
      '<strong>·</strong>',
      '<label><span>模块</span><em>' + escapeHtml(mistake.module || "未选择") + '</em></label>',
      '</div>',
      '<button class="mistake-close-button" id="closeMistakeSheetBtn" type="button" aria-label="关闭">×</button>',
      '</div>',
      '<div class="detail-actions">',
      '<button class="primary-button" data-edit-mistake="' + mistake.id + '" type="button">编辑</button>',
      '<button class="secondary-button" data-schedule-review-today="' + mistake.id + '" type="button">安排今天复习</button>',
      '</div>',
      '<div class="detail-meta-row"><span>状态：' + escapeHtml(statusText) + '</span><span>下次复习：' + escapeHtml(mistake.nextReview ? formatDate(mistake.nextReview) : "未安排") + '</span></div>',
      '<div class="detail-pair-grid">',
      detailBox("错题来源", mistake.source || "未填写"),
      detailBox("添加日期", createdDate ? formatDate(createdDate) : "未填写"),
      '</div>',
      detailBox("题目", mistake.title || "未命名错题"),
      '<div class="wide mistake-image-field readonly-images"><strong>图片</strong>' + renderImageStrip(mistake.images || []) + '</div>',
      '<div><strong>错因</strong><div class="mistake-reason-row readonly-tags">' + tags + '</div></div>',
      detailBox("秒杀公式", mistake.formula || "未填写"),
      detailBox("总结", mistake.summary || "未填写"),
      detailBox("正确答案", mistake.correctAnswer || "未填写"),
      detailBox("错误路径", mistake.wrongPath || "未填写"),
      detailBox("我的作答", mistake.myAnswer || "未填写"),
      "</section>"
    ].join("");
  }

  function detailBox(label, value) {
    if (!value) return "";
    return '<div><strong>' + label + '</strong><div class="detail-box">' + escapeHtml(value) + "</div></div>";
  }

  function closeMistakeSheet() {
    $("mistakeSheetBackdrop").classList.remove("is-open");
    $("mistakeSheet").classList.remove("is-open");
    $("mistakeSheet").setAttribute("aria-hidden", "true");
  }

  function openTaskSheet(task) {
    $("taskFormTitle").textContent = task ? "编辑任务" : "新建任务";
    $("taskId").value = task ? task.id : "";
    $("taskTitle").value = task ? task.title : "";
    $("taskDate").value = task ? task.date : todayStr();
    $("taskMinutes").value = task ? task.minutes : 30;
    $("taskNote").value = task ? task.note || "" : "";
    $("taskPriority").value = task ? task.priority || "medium" : "medium";
    $("taskSheetBackdrop").classList.add("is-open");
    $("taskSheet").classList.add("is-open");
    $("taskSheet").setAttribute("aria-hidden", "false");
  }

  function closeTaskSheet() {
    $("taskSheetBackdrop").classList.remove("is-open");
    $("taskSheet").classList.remove("is-open");
    $("taskSheet").setAttribute("aria-hidden", "true");
  }

  function openImportSheet() {
    $("importSheetBackdrop").classList.add("is-open");
    $("importSheet").classList.add("is-open");
    $("importSheet").setAttribute("aria-hidden", "false");
  }

  function closeImportSheet() {
    $("importSheetBackdrop").classList.remove("is-open");
    $("importSheet").classList.remove("is-open");
    $("importSheet").setAttribute("aria-hidden", "true");
    var btn = $("openImportSheetBtn");
    if (btn) btn.classList.remove("is-open");
  }

  function scheduleReviewToday(mistake) {
    mistake.nextReview = todayStr();
    if (mistake.status === "mastered") mistake.status = "learning";
    mistake.updatedAt = new Date().toISOString();
  }

  function toggleTaskDone(taskId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;
    task.done = !task.done;
    if (!saveData()) return;
    render();
  }

  function showToast(message) {
    var el = $("toast");
    el.textContent = message;
    el.classList.add("is-open");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { el.classList.remove("is-open"); }, 2200);
  }

  function normalizeTitleForCompare(title) {
    return String(title || "").replace(/\s+/g, "").trim();
  }

  function findDuplicateMistake(title, currentId) {
    var normalized = normalizeTitleForCompare(title);
    if (!normalized) return null;
    return state.data.mistakes.find(function (m) {
      return m.id !== currentId && normalizeTitleForCompare(m.title) === normalized;
    }) || null;
  }

  function bindEvents() {
    document.body.addEventListener("click", function (event) {
      var target = event.target;
      var nav = target.closest("[data-nav]");
      if (nav) switchView(nav.dataset.nav);

      if (target.closest("[data-home-review-entry]")) {
        switchView("review");
        renderReview();
      }

      if (target.closest("#quickImportBtn")) {
        if ($("quickImportBtn").dataset.topAction === "task") openTaskSheet();
        else openMistakeSheet();
      }
      var openImport = target.closest("#openImportSheetBtn");
      if (openImport) {
        openImport.classList.add("is-open");
        openImportSheet();
      }
      if (target.closest("#openDraftsBtn")) {
        switchView("drafts");
        renderImport();
      }
      if (target.closest("#backToLibraryBtn")) switchView("library");
      if (target.closest("#addTaskBtn") || target.closest("#planAddTaskBtn")) openTaskSheet();
      if (target.closest("#taskCancelBtn") || target.closest("#taskSheetBackdrop")) closeTaskSheet();
      if (target.closest("#importSheetBackdrop")) closeImportSheet();
      if (target.closest("#mistakeSheetBackdrop") || target.closest("#closeMistakeSheetBtn")) closeMistakeSheet();

      var card = target.closest("[data-mistake-id]");
      if (card && !target.closest("[data-review]")) {
        var mistake = state.data.mistakes.find(function (m) { return m.id === card.dataset.mistakeId; });
        if (mistake) openMistakeSheet(mistake);
      }

      var reviewBtn = target.closest("[data-review]");
      if (reviewBtn) handleReview(reviewBtn.dataset.review, reviewBtn.dataset.result);

      var editMistake = target.closest("[data-edit-mistake]");
      if (editMistake) {
        var editable = state.data.mistakes.find(function (m) { return m.id === editMistake.dataset.editMistake; });
        if (editable) openMistakeSheet(editable, { editing: true });
      }

      var cancelMistakeEdit = target.closest("[data-cancel-mistake-edit]");
      if (cancelMistakeEdit) {
        var readonly = state.data.mistakes.find(function (m) { return m.id === cancelMistakeEdit.dataset.cancelMistakeEdit; });
        if (readonly) openMistakeSheet(readonly);
      }

      var taskCard = target.closest("[data-task-id]");
      if (taskCard && !target.closest(".task-state") && !target.closest("[data-task-done]") && !target.closest("[data-task-edit]") && !target.closest("[data-task-delete]")) {
        var task = state.data.tasks.find(function (t) { return t.id === taskCard.dataset.taskId; });
        if (task) openTaskSheet(task);
      }

      var editTask = target.closest("[data-task-edit]");
      if (editTask) {
        var edit = state.data.tasks.find(function (t) { return t.id === editTask.dataset.taskEdit; });
        if (edit) openTaskSheet(edit);
      }

      var doneTask = target.closest("[data-task-done]");
      if (doneTask) {
        toggleTaskDone(doneTask.dataset.taskDone);
      }

      var deleteTask = target.closest("[data-task-delete]");
      if (deleteTask && confirm("确认删除这个任务？")) {
        state.data.tasks = state.data.tasks.filter(function (t) { return t.id !== deleteTask.dataset.taskDelete; });
        if (!saveData()) return;
        render();
        showToast("任务已删除");
      }

      var removeDraft = target.closest("[data-remove-draft]");
      if (removeDraft) {
        state.drafts.splice(Number(removeDraft.dataset.removeDraft), 1);
        renderImport();
      }

      var removeImage = target.closest("[data-remove-image]");
      if (removeImage) {
        removeStoredImage(removeImage.dataset.imageScope, removeImage.dataset.imageOwner, removeImage.dataset.removeImage);
      }

      var chip = target.closest("[data-subject-chip]");
      if (chip) {
        state.subjectFilter = chip.dataset.subjectChip;
        renderLibrary();
      }

      var dateMove = target.closest("[data-date-move]");
      if (dateMove) {
        state.selectedDate = addDays(state.selectedDate, Number(dateMove.dataset.dateMove));
        renderPlan();
      }

      var periodMove = target.closest("[data-period-move]");
      if (periodMove) {
        var step = Number(periodMove.dataset.periodMove);
        if (state.calendarMode === "day") state.selectedDate = addDays(state.selectedDate, step);
        if (state.calendarMode === "week") state.selectedDate = addDays(state.selectedDate, step * 7);
        if (state.calendarMode === "month") state.selectedDate = addMonths(state.selectedDate, step);
        renderPlan();
      }

      var pickDate = target.closest("[data-pick-date]");
      if (pickDate) {
        state.selectedDate = pickDate.dataset.pickDate;
        if (pickDate.dataset.calendarPickMode === "week") {
          state.calendarMode = "day";
        }
        renderPlan();
      }

      var openDay = target.closest("[data-open-day]");
      if (openDay) {
        state.selectedDate = openDay.dataset.openDay;
        state.calendarMode = "day";
        renderPlan();
      }

      var deleteMistake = target.closest("[data-delete-mistake]");
      if (deleteMistake && confirm("确认删除这条错题？")) {
        state.data.mistakes = state.data.mistakes.filter(function (m) { return m.id !== deleteMistake.dataset.deleteMistake; });
        if (!saveData()) return;
        closeMistakeSheet();
        render();
        showToast("错题已删除");
      }

      var scheduleReview = target.closest("[data-schedule-review-today]");
      if (scheduleReview) {
        var m = state.data.mistakes.find(function (item) { return item.id === scheduleReview.dataset.scheduleReviewToday; });
        if (m) {
          scheduleReviewToday(m);
          if (!saveData()) return;
          closeMistakeSheet();
          render();
          showToast("已安排到今日复习");
        }
      }
    });

    document.body.addEventListener("change", function (event) {
      var target = event.target;
      var addImage = target.closest("[data-add-image-to-mistake]");
      if (addImage) {
        addImagesToMistake(addImage.dataset.addImageToMistake, Array.from(addImage.files || []));
        return;
      }

      var draftField = target.closest("[data-draft-field]");
      if (draftField) updateDraftFromField(draftField);
    });

    document.body.addEventListener("input", function (event) {
      var target = event.target;
      var draftField = target.closest("[data-draft-field]");
      if (draftField) updateDraftFromField(draftField);
    });

    $("parseBtn").addEventListener("click", function () {
      var cards = parseClaudeText($("claudeInput").value);
      state.drafts = cards;
      renderImport();
      showToast(cards.length ? "已整理出 " + cards.length + " 条草稿" : "没有识别到可导入内容");
    });

    $("aiParseBtn").addEventListener("click", async function () {
      var text = $("claudeInput").value.trim();
      if (!text) return showToast("请先粘贴错题内容");
      var btn = $("aiParseBtn");
      btn.disabled = true;
      btn.textContent = "整理中";
      try {
        state.drafts = await parseClaudeTextWithAI(text);
        renderImport();
        showToast("AI 已整理出 " + state.drafts.length + " 条草稿");
      } catch (error) {
        state.drafts = parseClaudeText(text);
        renderImport();
        showToast((error && error.message ? error.message : "AI 整理失败") + "；已改用本地解析");
      } finally {
        btn.disabled = false;
        btn.textContent = "AI 整理";
      }
    });

    $("clearImportBtn").addEventListener("click", function () {
      $("claudeInput").value = "";
      state.drafts = [];
      renderImport();
    });

    $("sampleBtn").addEventListener("click", function () {
      $("claudeInput").value = sampleText();
    });

    $("imageAiInput").addEventListener("change", async function (event) {
      var files = Array.from(event.target.files || []);
      if (!files.length) return;
      try {
        state.drafts = await parseImagesWithAI(files);
        renderImport();
        showToast("图片 AI 已识别出 " + state.drafts.length + " 条草稿");
      } catch (error) {
        showToast(error && error.message ? error.message : "图片识别失败");
      } finally {
        event.target.value = "";
      }
    });

    $("imageAttachInput").addEventListener("change", async function (event) {
      var files = Array.from(event.target.files || []);
      if (!files.length) return;
      var attachments = [];
      for (var i = 0; i < files.length; i += 1) attachments.push(await fileToAttachment(files[i]));
      state.drafts = [{
        tempId: id("draft"),
        title: "",
        source: "",
        addedDate: todayStr(),
        subject: "言语理解",
        module: "",
        errorTags: [],
        formula: "",
        summary: "",
        correctAnswer: "",
        wrongPath: "",
        trap: "",
        myAnswer: "",
        raw: "手动图片草稿",
        nature: "thinking",
        images: attachments
      }].concat(state.drafts);
      renderImport();
      event.target.value = "";
      showToast("已添加图片草稿");
    });

    $("saveDraftsBtn").addEventListener("click", function () {
      if (!state.drafts.length) return showToast("没有草稿可保存");
      var saved = state.drafts.map(mistakeFromDraft);
      state.data.mistakes = saved.concat(state.data.mistakes);
      state.drafts = [];
      $("claudeInput").value = "";
      if (!saveData()) return;
      render();
      showToast("已保存 " + saved.length + " 条错题");
      switchView("library");
    });

    $("subjectFilter").addEventListener("change", function () {
      state.subjectFilter = $("subjectFilter").value;
      renderLibrary();
    });

    $("searchInput").addEventListener("input", function () {
      state.search = $("searchInput").value;
      renderLibrary();
    });

    $("calendarMode").addEventListener("click", function (event) {
      var btn = event.target.closest("[data-mode]");
      if (!btn) return;
      state.calendarMode = btn.dataset.mode;
      renderPlan();
    });

    $("showDueLibraryBtn").addEventListener("click", function () {
      state.subjectFilter = "全部";
      switchView("review");
      renderReview();
    });

    $("taskForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var taskId = $("taskId").value;
      var task = taskId ? state.data.tasks.find(function (t) { return t.id === taskId; }) : null;
      var payload = {
        id: taskId || id("task"),
        title: $("taskTitle").value.trim(),
        subject: task ? task.subject || "" : "",
        date: $("taskDate").value,
        minutes: Number($("taskMinutes").value || 30),
        priority: $("taskPriority").value || "medium",
        note: $("taskNote").value.trim(),
        done: task ? Boolean(task.done) : false,
        createdAt: task ? task.createdAt : new Date().toISOString()
      };
      if (!payload.title) return showToast("请填写任务名称");
      if (task) Object.assign(task, payload);
      else state.data.tasks.push(payload);
      if (!saveData()) return;
      closeTaskSheet();
      render();
      showToast("任务已保存");
    });

    document.body.addEventListener("submit", function (event) {
      var form = event.target.closest("#mistakeEditForm");
      if (!form) return;
      event.preventDefault();
      saveMistakeEdit(form);
    });

    $("saveSettingsBtn").addEventListener("click", function () {
      state.data.settings.dailyTarget = Number($("dailyTargetInput").value || 240);
      state.data.settings.apiBaseUrl = $("apiBaseUrlInput").value.trim() || "https://api.openai.com/v1";
      state.data.settings.apiModel = $("apiModelInput").value.trim() || "gpt-4o-mini";
      if ($("apiKeyInput").value.trim()) {
        state.data.settings.apiKey = $("apiKeyInput").value.trim();
      }
      if (!saveData()) return;
      render();
      showToast("设置已保存");
    });

    $("testApiBtn").addEventListener("click", testApiConnection);
    $("exportBtn").addEventListener("click", exportBackup);
    $("importFileInput").addEventListener("change", importBackup);
  }

  function updateDraftFromField(input) {
    var card = input.closest("[data-draft-index]");
    if (!card) return;
    var draft = state.drafts[Number(card.dataset.draftIndex)];
    if (!draft) return;
    var field = input.dataset.draftField;
    if (field === "errorTags") draft[field] = splitList(input.value);
    else draft[field] = input.value;
    if (field === "subject") {
      draft.module = inferModule(draft.subject, draft.raw + draft.title + draft.summary);
      draft.errorTags = normalizeErrorTags(draft.subject, draft.errorTags, draft.raw);
      renderImport();
    }
  }

  async function addImagesToMistake(mistakeId, files) {
    var mistake = state.data.mistakes.find(function (m) { return m.id === mistakeId; });
    if (!mistake || !files.length) return;
    if (!Array.isArray(mistake.images)) mistake.images = [];
    for (var i = 0; i < files.length; i += 1) {
      mistake.images.push(await fileToAttachment(files[i]));
    }
    mistake.updatedAt = new Date().toISOString();
    if (!saveData()) return;
    render();
    openMistakeSheet(mistake, { editing: true });
    showToast("图片已添加");
  }

  function removeStoredImage(scope, owner, imageId) {
    if (scope === "draft") {
      var draft = state.drafts[Number(owner)];
      if (draft) {
        draft.images = (draft.images || []).filter(function (image) { return image.id !== imageId; });
        renderImport();
      }
      return;
    }
    if (scope === "mistake") {
      var mistake = state.data.mistakes.find(function (m) { return m.id === owner; });
      if (!mistake) return;
      mistake.images = (mistake.images || []).filter(function (image) { return image.id !== imageId; });
      mistake.updatedAt = new Date().toISOString();
      if (!saveData()) return;
      render();
      openMistakeSheet(mistake, { editing: true });
      showToast("图片已移除");
    }
  }

  function saveMistakeEdit(form) {
    var mistakeId = form.dataset.editMistakeId || "";
    var mistake = state.data.mistakes.find(function (m) { return m.id === mistakeId; });
    var isNew = !mistake;
    var data = new FormData(form);
    var title = String(data.get("title") || "").trim() || "未命名错题";
    var duplicate = findDuplicateMistake(title, mistakeId);
    if (duplicate) {
      showToast("《" + title.slice(0, 28) + (title.length > 28 ? "..." : "") + "》已经存在");
      return;
    }
    var subject = normalizeSubject(data.get("subject"), data.get("title"));
    var payload = {
      id: isNew ? id("mistake") : mistake.id,
      title: title,
      source: String(data.get("source") || "").trim(),
      subject: subject,
      module: String(data.get("module") || "").trim() || inferModule(subject, data.get("title")),
      errorTags: normalizeErrorTags(subject, data.get("errorTags"), data.get("title") + " " + data.get("summary")),
      formula: String(data.get("formula") || "").trim(),
      summary: String(data.get("summary") || "").trim(),
      correctAnswer: String(data.get("correctAnswer") || "").trim(),
      wrongPath: String(data.get("wrongPath") || "").trim(),
      trap: String(data.get("trap") || "").trim(),
      myAnswer: String(data.get("myAnswer") || "").trim(),
      images: isNew ? [] : mistake.images || [],
      status: isNew ? "new" : mistake.status,
      nature: isNew ? "thinking" : mistake.nature || "thinking",
      reviewCount: isNew ? 0 : Number(mistake.reviewCount || 0),
      nextReview: isNew ? String(data.get("addedDate") || todayStr()) : mistake.nextReview || String(data.get("addedDate") || todayStr()),
      createdAt: isNew ? String(data.get("addedDate") || todayStr()) + "T00:00:00.000Z" : mistake.createdAt,
      updatedAt: new Date().toISOString()
    };
    if (isNew) state.data.mistakes.unshift(payload);
    else Object.assign(mistake, payload);
    if (!saveData()) return;
    render();
    if (isNew) closeMistakeSheet();
    else openMistakeSheet(mistake);
    showToast(isNew ? "错题已添加" : "错题已更新");
  }

  function handleReview(mistakeId, result) {
    var index = state.data.mistakes.findIndex(function (m) { return m.id === mistakeId; });
    if (index < 0) return;
    if (state.data.mistakes[index].status === "mastered") return showToast("该题已掌握，无需调整");
    state.data.mistakes[index] = applyReviewFeedback(state.data.mistakes[index], result);
    if (!saveData()) return;
    render();
    showToast(result === "wrong" ? "已重置复习轮次" : result === "solid" ? "已记录掌握情况" : "已保持当前轮次");
  }

  function exportBackup() {
    var exportData = Object.assign({}, state.data, {
      settings: Object.assign({}, state.data.settings || {}, {
        apiKey: ""
      })
    });
    var payload = {
      app: "gk-brain-xingce-pwa",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: exportData
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "考公Brain备份-" + todayStr() + ".json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result || ""));
        var incomingData = normalizeIncomingData(parsed.data || parsed);
        var confirmed = confirm("导入会覆盖当前全部错题、任务、设置和复习进度。建议先导出备份。确认继续导入吗？");
        if (!confirmed) return;
        var oldData = state.data;
        state.data = incomingData;
        if (!saveData()) {
          state.data = oldData;
          showToast("导入失败，已保留原数据");
          return;
        }
        render();
        showToast("备份已导入");
      } catch (error) {
        showToast("备份文件格式不正确");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function normalizeIncomingData(incoming) {
    if (Array.isArray(incoming.mistakes) && Array.isArray(incoming.tasks)) {
      return Object.assign(defaultData(), incoming, {
        settings: Object.assign(defaultSettings(), incoming.settings || {})
      });
    }
    if (Array.isArray(incoming.points) || Array.isArray(incoming.tasks)) {
      return {
        mistakes: (incoming.points || []).map(legacyPointToMistake),
        tasks: (incoming.tasks || []).map(legacyTaskToTask),
        settings: Object.assign(defaultSettings(), incoming.settings || {}),
        createdAt: incoming.exportedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    throw new Error("bad file");
  }

  function legacyPointToMistake(point) {
    var subject = normalizeSubject(point.subject, point.title + " " + point.note);
    return {
      id: point.id || id("mistake"),
      title: point.title || "旧版错题",
      source: point.source || point.examSource || point.origin || "",
      subject: subject,
      module: point.module || inferModule(subject, point.title + " " + point.note),
      errorTags: normalizeErrorTags(subject, point.errorTags, point.title + " " + point.note),
      formula: "",
      summary: point.note || "",
      correctAnswer: "",
      wrongPath: "",
      trap: "",
      myAnswer: "",
      images: Array.isArray(point.images) ? point.images : (point.image ? [{ id: id("img"), name: "旧版图片", type: "image/*", dataUrl: point.image, createdAt: point.createdAt || new Date().toISOString() }] : []),
      raw: point.note || point.title || "",
      nature: point.nature || "thinking",
      status: point.status === "mastered" ? "mastered" : point.status || "new",
      reviewRound: Number(point.reviewRound || 0),
      reviewCount: Number(point.reviewCount || 0),
      nextReview: point.nextReview || null,
      createdAt: point.createdAt || new Date().toISOString(),
      updatedAt: point.updatedAt || new Date().toISOString()
    };
  }

  function legacyTaskToTask(task) {
    return {
      id: task.id || id("task"),
      title: task.title || "旧版任务",
      subject: normalizeSubject(task.subject, task.title),
      date: task.date || task.dueDate || todayStr(),
      minutes: Number(task.minutes || 30),
      priority: task.priority || "medium",
      note: task.note || "",
      done: task.done === true || task.status === "done",
      createdAt: task.createdAt || new Date().toISOString()
    };
  }

  function sampleText() {
    return [
      "错题来源：2025年江苏省公务员考试（C类）",
      "题目：某资料分析题要求比较两年增长率，选项里有明显的百分点陷阱。",
      "正确答案：B",
      "错误路径：把增长率差值当成增长量差值，直接相减后判断。",
      "核心陷阱：增长率比较必须先确认基期和现期，不能只看绝对增量。",
      "秒杀公式：增长率 = 增长量 / 基期量；百分点变化 = 现期增长率 - 前期增长率。",
      "本题解答总结：先定位两个时期的基期，再分别算增长率，最后比较百分点变化。",
      "推荐科目：资料分析",
      "推荐模块：增长率计算",
      "推荐错因：公式记错，没看清题干",
      "",
      "---",
      "",
      "错题来源：2024年四川省公务员考试",
      "题目：文段强调基层治理需要多方协同，问主旨概括。",
      "正确答案：C",
      "错误路径：被例子里的单一主体带偏，选择了过窄选项。",
      "核心陷阱：例子不是重点，转折和总结句才是主旨。",
      "秒杀公式：主旨题优先找总括句；例子、背景、问题描述都让位于对策句。",
      "本题解答总结：抓住“需要协同”的核心表达，排除只强调某一个主体的选项。",
      "推荐科目：言语理解",
      "推荐模块：片段阅读",
      "推荐错因：思路走偏，排除不彻底"
    ].join("\n");
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
  }

  window.gkBrainDebug = { parseClaudeText: parseClaudeText };
  bindEvents();
  render();
  var initialView = new URLSearchParams(location.search).get("view");
  if (initialView && document.querySelector('[data-view="' + initialView + '"]')) switchView(initialView);
  if (new URLSearchParams(location.search).get("mode")) {
    state.calendarMode = new URLSearchParams(location.search).get("mode");
    renderPlan();
  }
  registerServiceWorker();
}());
