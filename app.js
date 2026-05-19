/**
 * 公考学习控制台 - app.js
 */

// ============================================================
// 数据存储层
// ============================================================

var STORAGE_KEYS = { TASKS: 'gk_tasks', POINTS: 'gk_points', SETTINGS: 'gk_settings' };

function loadFromStorage(key) {
  try { var d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch(e) { return null; }
}
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch(e) {
    console.error('saveToStorage失败:', key, e.name, e.message);
    return false;
  }
}
function getAllTasks()  { return loadFromStorage(STORAGE_KEYS.TASKS)  || []; }
function getAllPoints() { return loadFromStorage(STORAGE_KEYS.POINTS) || []; }
function getSettings() { return loadFromStorage(STORAGE_KEYS.SETTINGS) || { professionalName: '国考', dailyTarget: 240 }; }

// ============================================================
// 排期算法
// ============================================================

var REVIEW_INTERVALS = {
  blind:    [1, 3, 7, 14, 30],
  thinking: [2, 4, 9, 18, 35],
  careless: [3, 7, 21]
};

function calcNextReview(nature, round) {
  var intervals = REVIEW_INTERVALS[nature] || REVIEW_INTERVALS.thinking;
  if (round >= intervals.length) return null;
  var d = new Date();
  d.setDate(d.getDate() + intervals[round]);
  return d.toISOString().slice(0, 10);
}

function applyReviewFeedback(point, result) {
  var nature   = point.nature || 'thinking';
  var maxRound = (REVIEW_INTERVALS[nature] || REVIEW_INTERVALS.thinking).length;
  var round    = point.reviewRound || 0;
  if (result === 'wrong')      round = 0;
  else if (result === 'solid') round = round + 1;
  var nextReview = calcNextReview(nature, round);
  var mastered   = (result === 'solid' && round >= maxRound);
  return Object.assign({}, point, {
    reviewRound: round, nextReview: nextReview,
    status: mastered ? 'mastered' : (result === 'wrong' ? 'new' : 'learning'),
    reviewCount: (point.reviewCount || 0) + 1,
    lastReviewed: todayStr(), updatedAt: new Date().toISOString()
  });
}

// ============================================================
// 按科目预置错因标签
// ============================================================

var ERROR_TAGS_BY_SUBJECT = {
  '言语理解': ['没看清题干', '排除不彻底', '思路走偏', '时间不够蒙的'],
  '判断推理': ['思路走偏', '排除不彻底', '知识点不熟', '时间不够蒙的'],
  '数量关系': ['知识点不熟', '计算错误', '时间不够蒙的'],
  '资料分析': ['概念混淆', '没看清题干', '公式记错', '计算错误', '时间不够蒙的'],
  '常识判断': ['知识点不熟', '时间不够蒙的'],
  '申论':     ['没看清题干', '思路走偏', '概念混淆', '排除不彻底', '知识点不熟']
};

var MODULE_PLACEHOLDER = {
  '言语理解': '例如：中心理解题',
  '判断推理': '例如：图形推理',
  '数量关系': '例如：行程问题',
  '资料分析': '例如：增长率计算',
  '常识判断': '例如：法律常识',
  '申论':     '例如：归纳概括题'
};

function updateModulePlaceholder(subject) {
  var el = document.getElementById('pointModule');
  if (el) el.placeholder = MODULE_PLACEHOLDER[subject] || '例如：中心理解题';
}

function renderErrorTagGroup(subject, selectedTags) {
  selectedTags = selectedTags || [];
  var tags      = ERROR_TAGS_BY_SUBJECT[subject] || [];
  var container = document.getElementById('errorTagGroup');
  if (!container) return;
  container.innerHTML = tags.map(function(tag) {
    var checked = selectedTags.indexOf(tag) !== -1 ? ' checked' : '';
    return '<label class="tag-checkbox"><input type="checkbox" value="' + tag + '"' + checked + '> ' + tag + '</label>';
  }).join('');
}

// ============================================================
// 拖拽调整 textarea 高度
// ============================================================

function initTextareaResize() {
  document.querySelectorAll('.textarea-resize-handle').forEach(function(handle) {
    var targetId = handle.dataset.target;
    var textarea = document.getElementById(targetId);
    if (!textarea) return;

    var startY = 0, startHeight = 0, dragging = false, rafId = null, pendingY = 0;

    function applyHeight(clientY) {
      var newHeight = Math.min(Math.max(startHeight + (clientY - startY), 72), window.innerHeight * 0.6);
      textarea.style.height = newHeight + 'px';
    }

    function onMove(clientY) {
      pendingY = clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(function() { rafId = null; if (dragging) applyHeight(pendingY); });
    }

    // touch：绑在handle上，只拦截拖拽条本身的触摸
    handle.addEventListener('touchstart', function(e) {
      e.preventDefault();
      dragging = true;
      startY = e.touches[0].clientY;
      startHeight = textarea.offsetHeight;
    }, { passive: false });

    handle.addEventListener('touchmove', function(e) {
      e.preventDefault();
      onMove(e.touches[0].clientY);
    }, { passive: false });

    handle.addEventListener('touchend', function() { dragging = false; });

    // mouse：mousemove/mouseup 需要绑 document 才能追踪拖出范围的情况
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragging = true;
      startY = e.clientY;
      startHeight = textarea.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) { if (dragging) onMove(e.clientY); });

    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  });
}

// ============================================================
// 工具函数
// ============================================================

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

function todayStr() {
  var now = new Date();
  var bj  = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return bj.toISOString().slice(0, 10);
}

function beijingDateDisplay() {
  var now = new Date();
  var bj  = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  var y   = bj.getUTCFullYear();
  var m   = String(bj.getUTCMonth() + 1).padStart(2, '0');
  var d   = String(bj.getUTCDate()).padStart(2, '0');
  return { iso: y + '-' + m + '-' + d };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d    = new Date(dateStr + 'T00:00:00');
  var year = d.getFullYear();
  var mon  = d.getMonth() + 1;
  var day  = d.getDate();
  if (year === new Date().getFullYear()) {
    return mon + '月' + day + '日';
  }
  return year + '年' + mon + '月' + day + '日';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
}

var NATURE_LABEL  = { blind: '不会', thinking: '会但做错', careless: '马虎' };
var NATURE_COLOR  = { blind: '#C53030', thinking: '#B7791F', careless: '#2C5282' };
var PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
var SUBJECT_LABEL  = {
  xingce: '行测', shenlun: '申论',
  '言语理解': '言语理解', '判断推理': '判断推理', '数量关系': '数量关系',
  '资料分析': '资料分析', '常识判断': '常识判断', '申论': '申论'
};

// ============================================================
// Toast
// ============================================================

function showToast(message, duration) {
  duration = duration || 2200;
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(function() { toast.classList.remove('is-visible'); }, duration);
}

// ============================================================
// 导航
// ============================================================

function switchTab(tabName) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('is-active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('is-active'); });
  var view   = document.getElementById('view-' + tabName);
  var navBtn = document.querySelector('.nav-item[data-tab="' + tabName + '"]');
  if (view)   view.classList.add('is-active');
  if (navBtn) navBtn.classList.add('is-active');

  // fab 只在对应板块显示
  var fabTask  = document.getElementById('fabAddTask');
  var fabPoint = document.getElementById('fabAddPoint');
  if (fabTask)  fabTask.style.display  = tabName === 'plan'      ? 'flex' : 'none';
  if (fabPoint) fabPoint.style.display = tabName === 'knowledge' ? 'flex' : 'none';

  if (tabName === 'dashboard') updateDashboard();
  if (tabName === 'plan')      renderTaskList();
  if (tabName === 'knowledge') { renderPointList(); renderOutlineGrid(); }
  if (tabName === 'review')    renderReviewList();
  if (tabName === 'data')      updateStorageStatus();
}

// ============================================================
// 底部详情面板
// ============================================================

function openDetailSheet(point) {
  var overlay = document.getElementById('detailOverlay');
  var sheet   = document.getElementById('detailSheet');
  if (!overlay || !sheet) return;

  var nature   = point.nature || 'thinking';
  var maxRound = (REVIEW_INTERVALS[nature] || REVIEW_INTERVALS.thinking).length;
  var round    = point.reviewRound || 0;
  var days     = daysUntil(point.nextReview);

  var reviewStatus = '';
  if (point.status === 'mastered') {
    reviewStatus = '✓ 已掌握';
  } else if (point.nextReview) {
    if (days < 0)        reviewStatus = '逾期' + Math.abs(days) + '天';
    else if (days === 0) reviewStatus = '今天复习';
    else                 reviewStatus = days + '天后复习';
  }

  document.getElementById('detailSubject').textContent = point.subject + (point.module ? ' · ' + point.module : '');

  var bodyHtml = '';

  // 1. 题目文字
  if (point.title) {
    bodyHtml += '<div class="detail-row">'
      + '<div class="detail-row-label">题目</div>'
      + '<div class="detail-question">' + point.title.replace(/\n/g, '<br>') + '</div>'
      + '</div>';
  }

  // 2. 题目图片（文字之后，有就显示）
  if (point.image) {
    bodyHtml += '<div class="detail-row">'
      + '<img class="detail-image" src="' + point.image + '" alt="题目图片" id="detailImg">'
      + '</div>';
  }

  // 3. 错因标签
  if ((point.errorTags || []).length) {
    var tagSpans = point.errorTags.map(function(t) {
      return '<span class="detail-tag">' + t + '</span>';
    }).join('');
    bodyHtml += '<div class="detail-row">'
      + '<div class="detail-row-label">错因</div>'
      + '<div class="detail-tags">' + tagSpans + '</div>'
      + '</div>';
  }

  // 4. 笔记（默认隐藏）
  if (point.note) {
    bodyHtml += '<div class="detail-row">'
      + '<button class="note-toggle-btn" id="noteToggleBtn" type="button">显示笔记 ▾</button>'
      + '<div class="detail-note-content" id="noteContent" style="display:none">'
      + '<div class="detail-row-value" style="margin-top:8px">' + point.note.replace(/\n/g, '<br>') + '</div>'
      + '</div>'
      + '</div>';
  }

  // 5. 排期信息
  var createdLabel = point.createdAt ? formatDate(new Date(point.createdAt).toISOString().slice(0,10)) : '';

  bodyHtml += '<div class="detail-schedule">'
    + '<span>第 <strong>' + (round + 1) + '</strong>/' + maxRound + ' 轮</span>'
    + (createdLabel ? '<span>收录于 ' + createdLabel + '</span>' : '')
    + '<span>下次：' + (point.nextReview ? formatDate(point.nextReview) : '待安排') + '</span>'
    + '<span>已复习 ' + (point.reviewCount || 0) + ' 次</span>'
    + (reviewStatus ? '<span style="color:' + (days <= 0 ? 'var(--priority-high)' : 'var(--text-secondary)') + '">' + reviewStatus + '</span>' : '')
    + '</div>';

  document.getElementById('detailBody').innerHTML = bodyHtml;

  // 图片点击全屏
  var detailImg = document.getElementById('detailImg');
  if (detailImg) {
    detailImg.addEventListener('click', function() { openLightbox(point.image); });
  }

  // 笔记展开/收起
  var noteToggleBtn = document.getElementById('noteToggleBtn');
  var noteContent   = document.getElementById('noteContent');
  if (noteToggleBtn && noteContent) {
    noteToggleBtn.addEventListener('click', function() {
      var isHidden = noteContent.style.display === 'none';
      noteContent.style.display = isHidden ? 'block' : 'none';
      noteToggleBtn.textContent = isHidden ? '收起笔记 ▴' : '显示笔记 ▾';
    });
  }

  // footer
  var footerHtml = '';
  if (point.status !== 'mastered') {
    footerHtml += '<div class="detail-footer-label">本次复习结果</div>'
      + '<div class="detail-feedback-row">'
      + '<button class="feedback-btn wrong" data-action="sheet-feedback" data-id="' + point.id + '" data-result="wrong">❌ 还是错</button>'
      + '<button class="feedback-btn shaky" data-action="sheet-feedback" data-id="' + point.id + '" data-result="shaky">😅 磕磕绊绊</button>'
      + '<button class="feedback-btn solid" data-action="sheet-feedback" data-id="' + point.id + '" data-result="solid">✅ 秒杀</button>'
      + '</div>';
  }
  footerHtml += '<div style="display:flex;gap:8px;margin-top:4px">'
    + '<button class="primary-button" style="flex:1" data-action="sheet-edit" data-id="' + point.id + '"><svg><use href="#icon-edit"></use></svg>编辑</button>'
    + '<button class="text-button" style="color:var(--priority-high)" data-action="sheet-delete" data-id="' + point.id + '">删除</button>'
    + '</div>';

  document.getElementById('detailFooter').innerHTML = footerHtml;

  document.getElementById('detailFooter').querySelectorAll('[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = btn.dataset.action, id = btn.dataset.id, result = btn.dataset.result;
      if (action === 'sheet-feedback') { handleReviewFeedback(id, result); closeDetailSheet(); }
      if (action === 'sheet-edit')     { closeDetailSheet(); var p = getAllPoints().find(function(p) { return p.id === id; }); if (p) { setTimeout(function() { loadPointToForm(p); }, 320); } }
      if (action === 'sheet-delete')   { closeDetailSheet(); setTimeout(function() { deletePoint(id); }, 320); }
    });
  });

  overlay.classList.add('is-open');
  sheet.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // 每次打开重新绑定关闭按钮，避免事件干扰
  var closeBtn = document.getElementById('detailClose');
  if (closeBtn) {
    var newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeDetailSheet();
    });
  }
}

function closeDetailSheet() {
  var overlay = document.getElementById('detailOverlay');
  var sheet   = document.getElementById('detailSheet');
  if (overlay) overlay.classList.remove('is-open');
  if (sheet)   sheet.classList.remove('is-open');
  document.body.style.overflow = '';
}

function openPointSheet(title) {
  title = title || '添加错题';
  document.getElementById('pointFormTitle').textContent = title;
  document.getElementById('pointFormOverlay').classList.add('is-open');
  document.getElementById('pointFormSheet').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closePointSheet() {
  document.getElementById('pointFormOverlay').classList.remove('is-open');
  document.getElementById('pointFormSheet').classList.remove('is-open');
  document.body.style.overflow = '';
}

function openTaskSheet(title) {
  title = title || '添加任务';
  document.getElementById('taskFormTitle').textContent = title;
  document.getElementById('taskFormOverlay').classList.add('is-open');
  document.getElementById('taskFormSheet').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeTaskSheet() {
  document.getElementById('taskFormOverlay').classList.remove('is-open');
  document.getElementById('taskFormSheet').classList.remove('is-open');
  document.body.style.overflow = '';
}

// ============================================================
// 仪表盘
// ============================================================

function updateDashboard() {
  var today    = todayStr();
  var tasks    = getAllTasks();
  var points   = getAllPoints();
  var settings = getSettings();
  var now      = new Date();

  document.getElementById('todayLabel').textContent =
    now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

  var todayTasks     = tasks.filter(function(t) { return t.dueDate === today; });
  var doneTodayCount = todayTasks.filter(function(t) { return t.status === 'done'; }).length;
  var doneMinutes    = todayTasks.filter(function(t) { return t.status === 'done'; })
    .reduce(function(s, t) { return s + (t.minutes || 0); }, 0);
  var activeCount    = points.filter(function(p) { return p.status !== 'mastered'; }).length;
  var dueCount       = points.filter(function(p) {
    return p.nextReview && p.nextReview <= today && p.status !== 'mastered';
  }).length;
  var dueColor = dueCount > 0 ? 'var(--priority-high)' : 'var(--accent)';

  document.getElementById('statsGrid').innerHTML =
    '<div class="stat-card"><div class="stat-value">' + doneTodayCount + '/' + todayTasks.length + '</div><div class="stat-label">今日任务完成</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + doneMinutes + '<span style="font-size:1rem">分</span></div><div class="stat-label">今日学习 / 目标' + (settings.dailyTarget || 240) + '分钟</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + activeCount + '</div><div class="stat-label">在库错题</div></div>'
    + '<div class="stat-card"><div class="stat-value" style="color:' + dueColor + '">' + dueCount + '</div><div class="stat-label">今日待复习</div></div>';

  var xingceSubjects = ['言语理解', '判断推理', '数量关系', '资料分析', '常识判断'];
  var subjectGroups  = [
    { label: '行测', keys: xingceSubjects.concat(['xingce']) },
    { label: '申论', keys: ['申论', 'shenlun'] }
  ];
  document.getElementById('subjectProgress').innerHTML = subjectGroups.map(function(sg) {
    var subTasks = todayTasks.filter(function(t) { return sg.keys.indexOf(t.subject) !== -1; });
    var done = subTasks.filter(function(t) { return t.status === 'done'; }).length;
    var pct  = subTasks.length ? Math.round(done / subTasks.length * 100) : 0;
    return '<div class="progress-item">'
      + '<div class="progress-header"><span class="progress-label">' + sg.label + '</span>'
      + '<span class="progress-value">' + done + '/' + subTasks.length + ' 任务 · ' + pct + '%</span></div>'
      + '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';
  }).join('');

  var todayContainer = document.getElementById('todayTasks');
  if (todayTasks.length === 0) {
    todayContainer.innerHTML = '<p class="muted-text" style="padding:8px 0">今天还没有计划，去"计划"页面添加吧</p>';
  } else {
    todayContainer.innerHTML = todayTasks.map(function(t) { return renderTaskItem(t, true); }).join('');
    bindTaskItemEvents(todayContainer);
  }

  var reviewContainer = document.getElementById('nextReviewsHome');
  var duePoints = points
    .filter(function(p) { return p.nextReview && p.nextReview <= today && p.status !== 'mastered'; })
    .sort(function(a, b) { return a.nextReview.localeCompare(b.nextReview); })
    .slice(0, 5);
  if (duePoints.length === 0) {
    reviewContainer.innerHTML = '<p class="muted-text" style="padding:8px 0">暂无到期复习，继续保持</p>';
  } else {
    reviewContainer.innerHTML = duePoints.map(function(p) { return renderPointCard(p); }).join('');
    // 首页点击：跳转到复习板块并高亮对应错题
    reviewContainer.querySelectorAll('.point-card').forEach(function(card) {
      card.addEventListener('click', function() {
        jumpToReviewPoint(card.dataset.id);
      });
    });
  }
}

// ============================================================
// 任务表单 & 列表
// ============================================================

function captureTaskForm() {
  var taskId   = document.getElementById('taskId').value.trim();
  var subject  = document.getElementById('taskSubject').value;
  var title    = document.getElementById('taskTitle').value.trim();
  var dueDate  = document.getElementById('taskDueDate').value || todayStr();
  var minutes  = parseInt(document.getElementById('taskMinutes').value, 10) || 60;
  var priority = document.getElementById('taskPriority').value;
  var note     = document.getElementById('taskNote').value.trim();
  if (!subject || !title) { showToast('请填写必填字段：科目和任务名称'); return null; }
  return { id: taskId || generateId(), subject: subject, title: title, dueDate: dueDate,
    minutes: minutes, priority: priority, note: note, status: 'open',
    createdAt: taskId ? undefined : new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function handleTaskSubmit(e) {
  e.preventDefault();
  var task = captureTaskForm();
  if (!task) return;
  var tasks = getAllTasks();
  var idx   = tasks.findIndex(function(t) { return t.id === task.id; });
  if (idx !== -1) { task.createdAt = tasks[idx].createdAt; task.status = tasks[idx].status; tasks[idx] = task; showToast('任务已更新'); }
  else            { tasks.push(task); showToast('任务已保存'); }
  if (saveToStorage(STORAGE_KEYS.TASKS, tasks)) {
    resetTaskForm(); renderTaskList(); updateDashboard(); closeTaskSheet();
  }
}

function resetTaskForm() {
  document.getElementById('taskId').value       = '';
  document.getElementById('taskTitle').value    = '';
  document.getElementById('taskNote').value     = '';
  document.getElementById('taskSubject').value  = '言语理解';
  document.getElementById('taskMinutes').value  = '60';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskDueDate').value  = beijingDateDisplay().iso;
}

function loadTaskToForm(task) {
  document.getElementById('taskId').value       = task.id;
  document.getElementById('taskSubject').value  = task.subject;
  document.getElementById('taskTitle').value    = task.title;
  document.getElementById('taskDueDate').value  = task.dueDate;
  document.getElementById('taskMinutes').value  = task.minutes;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskNote').value     = task.note || '';
  openTaskSheet('编辑任务');
}

function renderTaskItem(task, compact) {
  compact = compact || false;
  var priorityClass = task.priority || 'medium';
  var doneAttr  = task.status === 'done' ? ' style="opacity:0.5"' : '';
  var checkIcon = task.status === 'done'
    ? '<svg style="color:var(--priority-low)"><use href="#icon-check"></use></svg>'
    : '<svg><use href="#icon-list"></use></svg>';
  var dateSpan  = compact
    ? '<span>' + task.minutes + '分钟</span>'
    : '<span>' + formatDate(task.dueDate) + ' · ' + task.minutes + '分钟</span>';
  var noteHtml  = task.note ? '<div class="muted-text" style="margin-top:4px;font-size:0.8rem">' + task.note + '</div>' : '';
  var editBtn   = !compact ? '<button class="icon-button" data-action="edit-task" data-id="' + task.id + '" title="编辑"><svg><use href="#icon-edit"></use></svg></button>' : '';
  var deleteBtn = !compact ? '<button class="icon-button" data-action="delete-task" data-id="' + task.id + '" title="删除"><svg><use href="#icon-trash"></use></svg></button>' : '';
  return '<div class="list-item" data-id="' + task.id + '" data-type="task"' + doneAttr + '>'
    + '<div class="list-item-icon">' + checkIcon + '</div>'
    + '<div class="list-item-content">'
    + '<div class="list-item-title">' + task.title + '</div>'
    + '<div class="list-item-meta">'
    + '<span>' + (SUBJECT_LABEL[task.subject] || task.subject) + '</span>'
    + '<span class="priority-tag ' + priorityClass + '">' + (PRIORITY_LABEL[priorityClass] || '') + '优先</span>'
    + dateSpan + '</div>' + noteHtml + '</div>'
    + '<div class="list-item-actions">' + editBtn
    + '<button class="icon-button" data-action="toggle-task" data-id="' + task.id + '"><svg><use href="#icon-check"></use></svg></button>'
    + deleteBtn + '</div></div>';
}

function bindTaskItemEvents(container) {
  container.querySelectorAll('[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = btn.dataset.action, id = btn.dataset.id;
      if (action === 'toggle-task') toggleTask(id);
      if (action === 'edit-task')   { var t = getAllTasks().find(function(t) { return t.id === id; }); if (t) { switchTab('plan'); setTimeout(function() { loadTaskToForm(t); }, 50); } }
      if (action === 'delete-task') deleteTask(id);
    });
  });
}

// ============================================================
// 计划板块 - 日期视图（参考滴答清单）
// ============================================================

var _planViewMode       = 'day';   // 'day' | 'week' | 'month'
var _planSelectedDate   = '';       // yyyy-mm-dd — currently selected date
var _planMonthViewDate = '';       // yyyy-mm-dd — which month the calendar is showing
var _planWeekBaseDate   = '';       // yyyy-mm-dd — the Mon that anchors the displayed week
var _planMonthExpanded  = null;     // yyyy-mm-dd | null — which day is expanded in month view

// ---- 北京时间辅助 ----

function _bjNow() {
  return new Date(new Date().getTime() + 8 * 3600000);
}

function _isoDate(d) {
  var y = d.getUTCFullYear();
  var m = String(d.getUTCMonth() + 1).padStart(2, '0');
  var day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _planInit() {
  _planViewMode       = 'day';
  _planSelectedDate    = todayStr();
  _planMonthViewDate  = todayStr();
  _planWeekBaseDate   = _weekMonday(todayStr());
  _planMonthExpanded  = null;
}

// Returns the Monday of the week containing dateStr (yyyy-mm-dd)
function _weekMonday(dateStr) {
  var d = new Date(dateStr + 'T00:00:00Z');
  var dow = d.getUTCDay(); // 0=Sun
  var mondayOffset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return _isoDate(d);
}

function _addDays(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return _isoDate(d);
}

function _weekDates(mondayStr) {
  var d = new Date(mondayStr + 'T00:00:00Z');
  var days = [];
  for (var i = 0; i < 7; i++) {
    days.push(_isoDate(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

function _weekLabel(mondayStr) {
  var days = _weekDates(mondayStr);
  var first = new Date(days[0] + 'T00:00:00Z');
  var last  = new Date(days[6] + 'T00:00:00Z');
  var fY = first.getUTCFullYear(), fM = first.getUTCMonth() + 1, fD = first.getUTCDate();
  var lY = last.getUTCFullYear(),  lM = last.getUTCMonth() + 1,  lD = last.getUTCDate();
  if (fY === lY && fM === lM) return fM + '月' + fD + '日 – ' + lD + '日';
  if (fY === lY) return fY + '年' + fM + '月' + fD + '日 – ' + lM + '月' + lD + '日';
  return fY + '年' + fM + '月' + fD + '日 – ' + lY + '年' + lM + '月' + lD + '日';
}

function _CN_DOW(dateStr) {
  var d = new Date(dateStr + 'T00:00:00Z');
  var labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[d.getUTCDay()];
}

function _CN_MON(dateStr) {
  var d = new Date(dateStr + 'T00:00:00Z');
  return (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日';
}

function _isToday(dateStr) {
  return dateStr === todayStr();
}

// ---- 任务数据（带完整对象） ----

function _getDayTasks(dateStr) {
  var tasks = getAllTasks();
  var fs = (document.getElementById('taskFilterSubject') || {}).value || 'all';
  var ft = (document.getElementById('taskFilterStatus')  || {}).value || 'open';
  if (fs !== 'all') tasks = tasks.filter(function(t) { return t.subject === fs; });
  if (ft !== 'all') tasks = tasks.filter(function(t) { return t.status  === ft; });
  return tasks.filter(function(t) { return t.dueDate === dateStr; });
}

// ---- 渲染：日期栏 ----

function _renderDateDisplay() {
  var el = document.getElementById('planDateDisplay');
  if (!el) return;
  if (_planViewMode === 'week') {
    el.innerHTML = '<span id="planWeekLabel">' + _weekLabel(_planWeekBaseDate) + '</span>';
  } else {
    var today = _isToday(_planSelectedDate);
    el.innerHTML = (today ? '<span>今天&nbsp;</span>' : '') +
      '<span>' + _CN_MON(_planSelectedDate) + '&nbsp;' + _CN_DOW(_planSelectedDate) + '</span>';
  }
}

// ---- 渲染：视图切换 ----

function _updateViewTabs() {
  document.querySelectorAll('.plan-tab-btn').forEach(function(btn) {
    btn.classList.toggle('is-active', btn.dataset.view === _planViewMode);
  });
}

function _renderViewContainers() {
  var dayHdr  = document.getElementById('planDayHeader');
  var weekVw  = document.getElementById('planWeekView');
  var monthVw = document.getElementById('planMonthView');
  var filterR = document.getElementById('taskFilterRow');
  var taskLst = document.getElementById('taskList');

  if (_planViewMode === 'day') {
    dayHdr.style.display  = 'flex';
    weekVw.style.display  = 'none';
    monthVw.style.display = 'none';
    filterR.style.display = 'none';
    taskLst.style.display = '';
  } else if (_planViewMode === 'week') {
    dayHdr.style.display  = 'flex';
    weekVw.style.display = '';
    monthVw.style.display = 'none';
    filterR.style.display = 'none';
    taskLst.style.display = 'none';
  } else {
    dayHdr.style.display  = 'none';
    weekVw.style.display = 'none';
    monthVw.style.display = '';
    filterR.style.display = 'none';
    taskLst.style.display = 'none';
  }
  _renderDateDisplay();
}

// ---- 渲染：周视图 ----

function _renderWeekView() {
  var scroll  = document.getElementById('planWeekScroll');
  var wrap    = document.getElementById('planWeekScrollWrap');
  if (!scroll) return;

  var days    = _weekDates(_planWeekBaseDate);
  var labels  = ['一', '二', '三', '四', '五', '六', '日'];
  var labels2 = ['日', '一', '二', '三', '四', '五', '六'];

  scroll.innerHTML = days.map(function(d, idx) {
    var tasks     = _getDayTasks(d);
    var colCls = 'plan-week-col';

    var stripsHtml = '';
    if (tasks.length === 0) {
      stripsHtml = '<div class="plan-week-col-empty"></div>';
    } else {
      stripsHtml = tasks.slice(0, 5).map(function(t) {
        var isShenlun = t.subject === '申论';
        var isDone    = t.status === 'done';
        var sCls = 'plan-week-task-strip' +
          (isShenlun ? ' is-shenlun' : ' is-xingce') +
          (isDone    ? ' is-done'    : '');
        return '<div class="' + sCls + '" data-task-id="' + t.id + '">' +
          '<div class="plan-week-task-title">' + _escHtml(t.title) + '</div>' +
          '<div class="plan-week-task-subject">' + (isShenlun ? '申论' : '行测') + '</div></div>';
      }).join('');
      if (tasks.length > 5) {
        stripsHtml += '<div class="plan-week-task-more">+' + (tasks.length - 5) + ' 更多</div>';
      }
    }

    return '<div class="' + colCls + '" data-date="' + d + '">' +
      '<div class="plan-week-col-header">' +
        '<span class="plan-week-col-label">' + labels2[idx] + '</span>' +
        '<span class="plan-week-col-num">' + new Date(d + 'T00:00:00Z').getUTCDate() + '</span>' +
        '<span class="plan-week-col-count">' + tasks.length + '项</span>' +
      '</div>' +
      '<div class="plan-week-col-body">' + stripsHtml + '</div></div>';
  }).join('');

  // Bind column clicks → select that day
  scroll.querySelectorAll('.plan-week-col').forEach(function(col) {
    col.addEventListener('click', function(e) {
      // Don't switch if clicking a task strip (it has its own handler)
      if (e.target.closest('.plan-week-task-strip')) return;
      _planSelectedDate = col.dataset.date;
      _planViewMode    = 'day';
      _updateViewTabs();
      _renderViewContainers();
      _renderPlanTasks();
    });
  });

  // 周视图任务条点击不做任何操作
  scroll.querySelectorAll('.plan-week-task-strip').forEach(function(strip) {
    strip.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  });
}

// ---- 渲染：月视图 ----

function _renderMonthView() {
  var calGrid  = document.getElementById('planCalGrid');
  var monthTit = document.getElementById('planMonthTitle');
  if (!calGrid) return;

  var ref  = _planMonthViewDate || todayStr();
  var refD = new Date(ref + 'T00:00:00');
  var year  = refD.getUTCFullYear();
  var month = refD.getUTCMonth() + 1;

  if (monthTit) monthTit.textContent = year + '年' + month + '月';

  var firstDay = new Date(Date.UTC(year, month - 1, 1));
  var lastDay  = new Date(Date.UTC(year, month, 0));
  var startDow = firstDay.getUTCDay(); // 0=Sun
  var mondayStart = startDow === 0 ? 6 : startDow - 1; // Mon=0
  var totalCells = mondayStart + lastDay.getUTCDate();
  var rows = Math.ceil(totalCells / 7);

  var headLabels = ['一', '二', '三', '四', '五', '六', '日'];
  var today = todayStr();

  var cellsHtml = headLabels.map(function(l) {
    return '<div class="plan-cal-head-cell">' + l + '</div>';
  }).join('');

  var cellCount = rows * 7;
  for (var i = 0; i < cellCount; i++) {
    var dayOffset = i - mondayStart;
    var cellD   = new Date(Date.UTC(year, month - 1, dayOffset));
    var cellStr = _isoDate(cellD);
    var isCurrentMonth = cellD.getUTCMonth() + 1 === month;
    var isToday  = cellStr === today;
    var isExpanded = cellStr === _planMonthExpanded;
    var cls = 'plan-cal-cell';
    if (!isCurrentMonth) cls += ' other-month';
    if (isToday)         cls += ' is-today';
    if (isExpanded)       cls += ' is-selected';

    var counts = _getDayTasks(cellStr);
    var dotsHtml = '';
    for (var xi = 0; xi < Math.min(counts.length, 3); xi++) {
      var isShen = counts[xi].subject === '申论';
      dotsHtml += '<span class="plan-cal-dot" style="background-color:' +
        (isShen ? '#F59E0B' : '#2C3E50') + '"></span>';
    }
    if (counts.length > 3) {
      dotsHtml += '<span class="plan-cal-dot-more">+' + (counts.length - 3) + '</span>';
    }

    cellsHtml += '<div class="' + cls + '" data-date="' + cellStr + '">' +
      '<span class="plan-cal-num">' + cellD.getUTCDate() + '</span>' +
      '<div class="plan-cal-dots">' + dotsHtml + '</div></div>';
  }

  calGrid.innerHTML = cellsHtml;

  // Bind day cells
  calGrid.querySelectorAll('.plan-cal-cell').forEach(function(cell) {
    cell.addEventListener('click', function() {
      var clicked = cell.dataset.date;
      if (_planMonthExpanded === clicked) {
        _planMonthExpanded = null;
      } else {
        _planMonthExpanded = clicked;
        _planSelectedDate  = clicked;
      }
      _renderMonthView();
      _renderMonthDayList();
    });
  });
}

function _renderMonthDayList() {
  var el = document.getElementById('planMonthDayList');
  if (!el) return;
  if (!_planMonthExpanded) {
    el.style.display = 'none';
    return;
  }

  var tasks = _getDayTasks(_planMonthExpanded);
  var dateLabel = _CN_MON(_planMonthExpanded) + ' ' + _CN_DOW(_planMonthExpanded);
  var listHtml = tasks.map(function(t) { return renderTaskItem(t, false); }).join('');

  el.innerHTML =
    '<div class="plan-month-day-list-header">' +
      '<span class="plan-month-day-list-date">' + dateLabel + ' · ' + tasks.length + '项任务</span>' +
      '<button class="plan-month-day-list-close" type="button" aria-label="关闭">' +
        '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="list-stack">' + (listHtml || '<p class="muted-text" style="padding:8px 0;text-align:center">该日期暂无任务</p>') + '</div>';
  el.style.display = '';

  bindTaskItemEvents(el);

  var closeBtn = el.querySelector('.plan-month-day-list-close');
  if (closeBtn) closeBtn.addEventListener('click', function() {
    _planMonthExpanded = null;
    _renderMonthView();
    _renderMonthDayList();
  });
}

// ---- 渲染：日视图任务列表 ----

function _renderPlanTasks() {
  var container = document.getElementById('taskList');
  if (!container) return;
  var tasks = _getDayTasks(_planSelectedDate);
  tasks.sort(function(a, b) { return a.dueDate.localeCompare(b.dueDate); });
  container.innerHTML = tasks.length
    ? tasks.map(function(t) { return renderTaskItem(t, false); }).join('')
    : '<p class="muted-text" style="padding:16px 0;text-align:center">该日期暂无任务</p>';
  bindTaskItemEvents(container);
}

// ---- 主入口 ----

function renderTaskList() {
  if (!_planSelectedDate) _planInit();
  _renderViewContainers();
  if (_planViewMode === 'week')  _renderWeekView();
  if (_planViewMode === 'month') { _renderMonthView(); _renderMonthDayList(); }
  if (_planViewMode === 'day')   _renderPlanTasks();
}

function toggleTask(id) {
  var tasks = getAllTasks();
  var idx   = tasks.findIndex(function(t) { return t.id === id; });
  if (idx === -1) return;
  tasks[idx].status    = tasks[idx].status === 'done' ? 'open' : 'done';
  tasks[idx].updatedAt = new Date().toISOString();
  saveToStorage(STORAGE_KEYS.TASKS, tasks);
  renderTaskList(); updateDashboard();
  showToast(tasks[idx].status === 'done' ? '已标为完成 ✓' : '已标为未完成');
}

function deleteTask(id) {
  if (!confirm('确认删除该任务？')) return;
  saveToStorage(STORAGE_KEYS.TASKS, getAllTasks().filter(function(t) { return t.id !== id; }));
  renderTaskList(); updateDashboard(); showToast('任务已删除');
}

function _escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// 错题卡表单
// ============================================================

function capturePointForm() {
  var pointId  = document.getElementById('pointId').value.trim();
  var subject  = document.getElementById('pointSubject').value;
  var module   = document.getElementById('pointModule').value.trim();
  var title    = document.getElementById('pointTitle').value.trim();
  var note     = document.getElementById('pointNote').value.trim();
  if (!subject || !module || !title) { showToast('请填写必填字段：科目、模块和错题/考点'); return null; }

  var checkedTags = [];
  document.querySelectorAll('#errorTagGroup input[type=checkbox]:checked').forEach(function(cb) {
    checkedTags.push(cb.value);
  });
  var extraRaw  = document.getElementById('pointExtraTags').value.trim();
  var extraTags = extraRaw ? extraRaw.split(/[,，]/).map(function(t) { return t.trim(); }).filter(Boolean) : [];
  var errorTags = checkedTags.concat(extraTags);

  var isEdit        = !!pointId;
  var existingRound = parseInt(document.getElementById('pointReviewRound').value, 10) || 0;
  var existingNext  = document.getElementById('pointNextReview').value || null;
  var reviewRound   = isEdit ? existingRound : 0;
  var nextReview    = isEdit ? existingNext  : calcNextReview('thinking', 0);

  // 收录日期：不管新增还是编辑，都优先读取表单里用户选的日期
  var createdDateVal = document.getElementById('pointCreatedDate').value;
  var createdAt;
  if (createdDateVal) {
    createdAt = new Date(createdDateVal + 'T00:00:00+08:00').toISOString();
  } else if (isEdit) {
    createdAt = document.getElementById('pointCreatedAt').value || new Date().toISOString();
  } else {
    createdAt = new Date().toISOString();
  }

  return { id: pointId || generateId(), subject: subject, module: module, title: title,
    note: note, errorTags: errorTags, reviewRound: reviewRound, nextReview: nextReview,
    image: window._pendingPointImage || null,
    status: 'new', reviewCount: 0,
    createdAt: createdAt,
    updatedAt: new Date().toISOString() };
}

function handlePointSubmit(e) {
  e.preventDefault();
  var point  = capturePointForm();
  if (!point) return;
  var points = getAllPoints();
  var idx    = points.findIndex(function(p) { return p.id === point.id; });
  if (idx !== -1) {
    // createdAt 已在 capturePointForm 里从表单读取，保持不变
    point.reviewCount = points[idx].reviewCount;
    point.status      = points[idx].status;
    point.nature      = points[idx].nature;
    if (!point.image && points[idx].image) point.image = points[idx].image;
    points[idx] = point;
    showToast('错题卡已更新');
  } else {
    points.push(point);
    showToast('错题已保存 · 第1次复习安排在 ' + formatDate(point.nextReview));
  }
  if (saveToStorage(STORAGE_KEYS.POINTS, points)) {
    resetPointForm(); renderPointList(); renderOutlineGrid(); updateDashboard(); closePointSheet();
  } else {
    showToast('保存失败，请检查存储空间是否已满', 4000);
  }
}

function resetPointForm() {
  document.getElementById('pointId').value          = '';
  document.getElementById('pointReviewRound').value = '0';
  document.getElementById('pointNextReview').value  = '';
  document.getElementById('pointSubject').value     = '言语理解';
  document.getElementById('pointModule').value      = '';
  document.getElementById('pointTitle').value = '';
  document.getElementById('pointTitle').style.height = '';
  document.getElementById('pointNote').value        = '';
  document.getElementById('pointExtraTags').value   = '';
  var todayIso = beijingDateDisplay().iso;
  document.getElementById('pointCreatedAt').value   = '';
  var cdEl = document.getElementById('pointCreatedDate');
  cdEl.value = todayIso;
  cdEl.max   = todayIso;
  var info = document.getElementById('pointScheduleInfo');
  if (info) info.style.display = 'none';
  renderErrorTagGroup('言语理解', []);
  updateModulePlaceholder('言语理解');
  window._pendingPointImage = null;
  resetImageUI();
}

function loadPointToForm(point) {
  document.getElementById('pointCreatedAt').value   = point.createdAt || '';
  // 把 ISO 字符串转成 yyyy-mm-dd 填入日期输入框
  var createdDateStr = '';
  if (point.createdAt) {
    // 加8小时偏移转北京时间再取日期
    var bjMs = new Date(point.createdAt).getTime() + 8 * 60 * 60 * 1000;
    createdDateStr = new Date(bjMs).toISOString().slice(0, 10);
  }
  var cdEditEl = document.getElementById('pointCreatedDate');
  cdEditEl.value = createdDateStr;
  cdEditEl.max   = beijingDateDisplay().iso;
  document.getElementById('pointReviewRound').value = point.reviewRound || 0;
  document.getElementById('pointNextReview').value  = point.nextReview || '';
  document.getElementById('pointSubject').value     = point.subject;
  document.getElementById('pointModule').value      = point.module;
  document.getElementById('pointTitle').value = point.title;
  document.getElementById('pointNote').value        = point.note || '';

  var presetTags    = ERROR_TAGS_BY_SUBJECT[point.subject] || [];
  var presetSelected = (point.errorTags || []).filter(function(t) { return presetTags.indexOf(t) !== -1; });
  renderErrorTagGroup(point.subject, presetSelected);
  updateModulePlaceholder(point.subject);
  var extraTags = (point.errorTags || []).filter(function(t) { return presetTags.indexOf(t) === -1; });
  document.getElementById('pointExtraTags').value = extraTags.join('，');

  var infoEl = document.getElementById('pointScheduleInfo');
  if (infoEl) {
    var nature   = point.nature || 'thinking';
    var maxRound = (REVIEW_INTERVALS[nature] || REVIEW_INTERVALS.thinking).length;
    infoEl.style.display = 'block';
    infoEl.innerHTML = '<span>第 <strong>' + ((point.reviewRound || 0) + 1) + '</strong> 轮 / 共' + maxRound + '轮</span>'
      + '<span>下次：<strong>' + (point.nextReview ? formatDate(point.nextReview) : '待安排') + '</strong></span>'
      + '<span>已复习 ' + (point.reviewCount || 0) + ' 次</span>';
  }

  window._pendingPointImage = null;
  if (point.image) { showImagePreview(point.image); window._pendingPointImage = point.image; }
  else { resetImageUI(); }

  openPointSheet('编辑错题');
}

// ============================================================
// 错题卡列表 —— 简化卡片（点击打开详情）
// ============================================================

function renderPointCard(point) {
  var titleFirstLine = (point.title || '').split('\n')[0];
  var days = daysUntil(point.nextReview);
  var reviewBadge = '';
  if (point.status === 'mastered') {
    reviewBadge = '<span style="color:var(--priority-low);font-size:0.75rem">✓ 已掌握</span>';
  } else if (point.nextReview) {
    if (days < 0)        reviewBadge = '<span style="color:var(--priority-high);font-size:0.75rem">逾期' + Math.abs(days) + '天</span>';
    else if (days === 0) reviewBadge = '<span style="color:var(--priority-high);font-size:0.75rem">今天复习</span>';
    else                 reviewBadge = '<span style="color:var(--text-muted);font-size:0.75rem">' + days + '天后</span>';
  }

  var hasImage = point.image ? '<span style="font-size:0.72rem;color:var(--text-muted)">📷</span>' : '';

  // 标题截断由 CSS 处理（white-space:nowrap + text-overflow:ellipsis）
  var createdDisplay = point.createdAt ? formatDate(new Date(point.createdAt).toISOString().slice(0,10)) : '';

  return '<div class="list-item point-card" data-id="' + point.id + '" data-type="point">'
    + '<div class="list-item-content" style="min-width:0">'
    + '<div class="point-card-subject">' + point.subject + ' · ' + point.module + '</div>'
    + '<div class="point-card-title">' + titleFirstLine + '</div>'
    + '<div class="point-card-meta" style="justify-content:space-between">'
    + '<span>' + reviewBadge + (hasImage ? ' ' + hasImage : '') + '</span>'
    + (createdDisplay ? '<span style="font-size:0.72rem;color:var(--text-muted)">' + createdDisplay + '</span>' : '')
    + '</div>'
    + '</div>'
    + '</div>';
}

function jumpToReviewPoint(pointId) {
  switchTab('review');
  // 等复习列表渲染完成后定位
  setTimeout(function() {
    var card = document.querySelector('#reviewList .point-card[data-id="' + pointId + '"]');
    if (!card) return;
    // 滚动到顶部显示
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 短暂延迟后触发闪烁，确保滚动已完成
    setTimeout(function() {
      card.classList.add('point-card-flash');
      card.addEventListener('animationend', function() {
        card.classList.remove('point-card-flash');
      }, { once: true });
    }, 400);
  }, 80);
}

function bindPointCardEvents(container) {
  container.querySelectorAll('.point-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var id = card.dataset.id;
      var p  = getAllPoints().find(function(p) { return p.id === id; });
      if (p) openDetailSheet(p);
    });
  });
}

function renderPointList() {
  var container = document.getElementById('pointList');
  if (!container) return;
  var points = getAllPoints();
  var fs = (document.getElementById('pointFilterSubject') || {}).value || 'all';
  var fn = (document.getElementById('pointFilterNature')  || {}).value || 'all';
  var sq = ((document.getElementById('pointSearch') || {}).value || '').trim().toLowerCase();
  if (fs !== 'all') points = points.filter(function(p) { return p.subject === fs; });
  if (fn !== 'all') points = points.filter(function(p) { return p.nature  === fn; });
  if (sq) points = points.filter(function(p) {
    return p.title.toLowerCase().indexOf(sq) !== -1
      || p.module.toLowerCase().indexOf(sq) !== -1
      || (p.note || '').toLowerCase().indexOf(sq) !== -1
      || (p.errorTags || []).some(function(t) { return t.toLowerCase().indexOf(sq) !== -1; });
  });
  points.sort(function(a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  container.innerHTML = points.length
    ? points.map(function(p) { return renderPointCard(p); }).join('')
    : '<p class="muted-text" style="padding:12px 0">暂无错题卡，填写上方表单添加吧</p>';
  bindPointCardEvents(container);
}

function deletePoint(id) {
  if (!confirm('确认删除该错题卡？')) return;
  saveToStorage(STORAGE_KEYS.POINTS, getAllPoints().filter(function(p) { return p.id !== id; }));
  renderPointList(); renderOutlineGrid(); updateDashboard(); showToast('错题卡已删除');
}

// ============================================================
// 复盘反馈
// ============================================================

function handleReviewFeedback(id, result) {
  var points = getAllPoints();
  var idx    = points.findIndex(function(p) { return p.id === id; });
  if (idx === -1) return;
  points[idx] = applyReviewFeedback(points[idx], result);
  saveToStorage(STORAGE_KEYS.POINTS, points);
  var p   = points[idx];
  var msg = result === 'wrong' ? '重置第1轮 · 下次 ' + formatDate(p.nextReview) + ' 再来'
    : result === 'shaky' ? '保持轮次 · 下次 ' + formatDate(p.nextReview) + ' 复习'
    : p.status === 'mastered' ? '全轮完成，已掌握 🎉'
    : '进入第' + ((p.reviewRound || 0) + 1) + '轮 · 下次 ' + formatDate(p.nextReview);
  showToast(msg, 3000);
  renderReviewList(); renderPointList(); updateDashboard();
}

// ============================================================
// 复盘视图
// ============================================================

function renderReviewList() {
  var container = document.getElementById('reviewList');
  if (!container) return;
  var today        = todayStr();
  var subjectOrder = ['言语理解','判断推理','数量关系','资料分析','常识判断','申论'];

  var points = getAllPoints()
    .filter(function(p) { return p.status !== 'mastered'; })
    .sort(function(a, b) {
      // 第一层：到期优先
      var aDue = (a.nextReview && a.nextReview <= today) ? 0 : 1;
      var bDue = (b.nextReview && b.nextReview <= today) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      // 第二层：科目顺序
      var oi = subjectOrder.indexOf(a.subject), oj = subjectOrder.indexOf(b.subject);
      var ra = oi === -1 ? 99 : oi, rb = oj === -1 ? 99 : oj;
      if (ra !== rb) return ra - rb;
      // 第三层：创建时间倒序
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  if (points.length === 0) {
    container.innerHTML = '<p class="muted-text" style="padding:12px 0">暂无错题，去错题卡板块添加吧</p>';
    return;
  }
  container.innerHTML = points.map(function(p) { return renderPointCard(p); }).join('');
  bindPointCardEvents(container);
}

function createReviewTasks() {
  var today  = todayStr();
  var points = getAllPoints().filter(function(p) {
    return p.nextReview && p.nextReview <= today && p.status !== 'mastered';
  });
  if (points.length === 0) { showToast('没有到期的复习错题'); return; }
  var tasks = getAllTasks(), added = 0;
  points.forEach(function(p) {
    if (!tasks.some(function(t) { return t.title.indexOf(p.title) !== -1 && t.dueDate === today; })) {
      tasks.push({ id: generateId(), subject: p.subject,
        title: '复习：' + p.module + ' — ' + p.title, dueDate: today, minutes: 20,
        priority: 'medium',
        note: '第' + ((p.reviewRound || 0) + 1) + '轮',
        status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      added++;
    }
  });
  saveToStorage(STORAGE_KEYS.TASKS, tasks);
  showToast('已生成 ' + added + ' 条复习任务');
  updateDashboard();
}

// ============================================================
// 错题卡汇总网格
// ============================================================

function renderOutlineGrid() {
  var container = document.getElementById('outlineGrid');
  if (!container) return;
  var points   = getAllPoints();
  var today    = todayStr();
  var subjects = ['言语理解', '判断推理', '数量关系', '资料分析', '常识判断', '申论'];
  container.innerHTML = subjects.map(function(sub) {
    var subPts = points.filter(function(p) { return p.subject === sub && p.status !== 'mastered'; });
    var duePts = subPts.filter(function(p) { return p.nextReview && p.nextReview <= today; }).length;
    var dueHtml = duePts > 0 ? ' · <span style="color:var(--priority-high)">' + duePts + ' 到期</span>' : '';
    return '<div class="outline-item" data-filter-subject="' + sub + '">'
      + '<div class="outline-item-title">' + sub + '</div>'
      + '<div class="outline-item-count">' + subPts.length + ' 条' + dueHtml + '</div></div>';
  }).join('');
  container.querySelectorAll('.outline-item').forEach(function(item) {
    item.addEventListener('click', function() {
      document.getElementById('pointFilterSubject').value = item.dataset.filterSubject;
      renderPointList();
      document.getElementById('pointList').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

// ============================================================
// 图片处理
// ============================================================

function resetImageUI() {
  var placeholder = document.getElementById('imagePlaceholder');
  var preview     = document.getElementById('pointImagePreview');
  var removeBtn   = document.getElementById('removeImageBtn');
  var fileInput   = document.getElementById('pointImageInput');
  if (placeholder) placeholder.style.display = 'flex';
  if (preview)     { preview.style.display = 'none'; preview.src = ''; }
  if (removeBtn)   removeBtn.style.display = 'none';
  if (fileInput)   fileInput.value = '';
}

function showImagePreview(base64) {
  var placeholder = document.getElementById('imagePlaceholder');
  var preview     = document.getElementById('pointImagePreview');
  var removeBtn   = document.getElementById('removeImageBtn');
  if (placeholder) placeholder.style.display = 'none';
  if (preview)     { preview.src = base64; preview.style.display = 'block'; }
  if (removeBtn)   removeBtn.style.display = 'block';
}

function openLightbox(src) {
  var box = document.createElement('div');
  box.className = 'image-lightbox';
  var img = document.createElement('img');
  img.src = src; img.alt = '题目图片';
  box.appendChild(img);
  box.addEventListener('click', function() { box.remove(); });
  document.body.appendChild(box);
}

function initImageUpload() {
  var input     = document.getElementById('pointImageInput');
  var removeBtn = document.getElementById('removeImageBtn');
  if (!input) return;
  input.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) showToast('图片较大，建议截图后上传（1.5MB以内）', 3000);
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var MAX = 1200, w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        window._pendingPointImage = canvas.toDataURL('image/jpeg', 0.82);
        showImagePreview(window._pendingPointImage);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  if (removeBtn) removeBtn.addEventListener('click', function() {
    window._pendingPointImage = null; resetImageUI();
  });
}

// ============================================================
// 数据页面
// ============================================================

function updateStorageStatus() {
  var el = document.getElementById('storageStatus');
  if (!el) return;
  var tasks    = getAllTasks();
  var points   = getAllPoints();
  var settings = getSettings();
  var active   = points.filter(function(p) { return p.status !== 'mastered'; }).length;
  var mastered = points.filter(function(p) { return p.status === 'mastered'; }).length;
  el.textContent = '任务 ' + tasks.length + ' 条 · 在库错题 ' + active + ' 条 · 已掌握 ' + mastered + ' 条';
}

function handleSettingsSubmit(e) {
  e.preventDefault();
  var target = parseInt(document.getElementById('dailyTarget').value, 10) || 240;
  var existing = getSettings();
  saveToStorage(STORAGE_KEYS.SETTINGS, { professionalName: existing.professionalName || '', dailyTarget: target });
  showToast('设置已保存');
  updateDashboard();
}

function loadSettings() {
  var s = getSettings();
  var nameEl   = document.getElementById('professionalName');
  var targetEl = document.getElementById('dailyTarget');
  if (nameEl)   nameEl.value   = s.professionalName || '';
  if (targetEl) targetEl.value = s.dailyTarget || 240;
}

// ============================================================
// 导出 / 导入
// ============================================================

function downloadFile(content, filename, type) {
  var blob = new Blob([content], { type: type });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  downloadFile(JSON.stringify({ exportedAt: new Date().toISOString(),
    tasks: getAllTasks(), points: getAllPoints(), settings: getSettings() }, null, 2),
    '公考备份_' + todayStr() + '.json', 'application/json');
  showToast('备份文件已下载');
}

function exportCsv() {
  var points = getAllPoints();
  var header = '科目,模块,错题考点,复习轮次,下次复习,错因标签,笔记\n';
  var rows = points.map(function(p) {
    return [p.subject, p.module, p.title,
      (p.reviewRound || 0) + 1, p.nextReview || '',
      (p.errorTags || []).join('|'), (p.note || '').replace(/\n/g, ' ')
    ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
  downloadFile('\uFEFF' + header + rows, '错题卡_' + todayStr() + '.csv', 'text/csv');
  showToast('错题卡表格已下载');
}

function exportTodayTxt() {
  var today = todayStr();
  var tasks = getAllTasks().filter(function(t) { return t.dueDate === today; });
  if (tasks.length === 0) { showToast('今天没有任务'); return; }
  var lines = ['公考学习计划 ' + today + '\n'];
  tasks.forEach(function(t) {
    lines.push('[' + (t.status === 'done' ? '✓' : ' ') + '] ' + (SUBJECT_LABEL[t.subject] || t.subject) + ' · ' + t.title + ' (' + t.minutes + '分钟)');
    if (t.note) lines.push('    备注：' + t.note);
  });
  downloadFile(lines.join('\n'), '今日计划_' + today + '.txt', 'text/plain');
}

function importJson() { document.getElementById('importFile').click(); }

function handleImportFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (data.tasks)    saveToStorage(STORAGE_KEYS.TASKS, data.tasks);
      if (data.points)   saveToStorage(STORAGE_KEYS.POINTS, data.points);
      if (data.settings) saveToStorage(STORAGE_KEYS.SETTINGS, data.settings);
      showToast('备份导入成功');
      loadSettings(); updateDashboard(); updateStorageStatus();
    } catch(err) { showToast('文件格式错误，请使用正确的备份文件'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetApp() {
  if (!confirm('确认重置？这将清空所有任务和错题卡，请先下载备份。')) return;
  saveToStorage(STORAGE_KEYS.TASKS, []); saveToStorage(STORAGE_KEYS.POINTS, []);
  showToast('已重置');
  updateDashboard(); renderTaskList(); renderPointList(); renderOutlineGrid(); updateStorageStatus();
}

// ============================================================
// 初始化
// ============================================================

function init() {
  var tf = document.getElementById('taskForm');     if (tf) tf.addEventListener('submit', handleTaskSubmit);

  var fab = document.getElementById('fabAddTask');
  if (fab) fab.addEventListener('click', function() { resetTaskForm(); openTaskSheet('添加任务'); });
  var tfc = document.getElementById('taskFormClose');
  if (tfc) tfc.addEventListener('click', closeTaskSheet);
  var tfo = document.getElementById('taskFormOverlay');
  if (tfo) tfo.addEventListener('click', closeTaskSheet);
  var pf = document.getElementById('pointForm');    if (pf) pf.addEventListener('submit', handlePointSubmit);
  var sf = document.getElementById('settingsForm'); if (sf) sf.addEventListener('submit', handleSettingsSubmit);
  var ct = document.getElementById('cancelTaskEdit');
  if (ct) ct.addEventListener('click', function() { resetTaskForm(); closeTaskSheet(); });
  var cp = document.getElementById('cancelPointEdit');
  if (cp) cp.addEventListener('click', function() { resetPointForm(); closePointSheet(); });

  var fabPoint = document.getElementById('fabAddPoint');
  if (fabPoint) fabPoint.addEventListener('click', function() { resetPointForm(); openPointSheet('添加错题'); });
  var pfc = document.getElementById('pointFormClose');
  if (pfc) pfc.addEventListener('click', closePointSheet);
  var pfo = document.getElementById('pointFormOverlay');
  if (pfo) pfo.addEventListener('click', closePointSheet);

  document.querySelectorAll('.nav-item[data-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });
  document.querySelectorAll('[data-jump]').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.jump); });
  });

  // 科目切换时更新错因标签
  var ps = document.getElementById('pointSubject');
  if (ps) ps.addEventListener('change', function() {
    renderErrorTagGroup(ps.value, []);
    updateModulePlaceholder(ps.value);
  });

  var tfs = document.getElementById('taskFilterSubject');
  if (tfs) tfs.addEventListener('change', renderTaskList);
  var tft = document.getElementById('taskFilterStatus'); if (tft) tft.addEventListener('change', renderTaskList);

  // 计划板块视图切换（日/周/月）
  _planInit();
  var viewTabs = document.querySelector('.plan-view-tabs');
  if (viewTabs) viewTabs.addEventListener('click', function(e) {
    var btn = e.target.closest('.plan-tab-btn');
    if (!btn) return;
    _planViewMode = btn.dataset.view;
    _updateViewTabs();
    _renderViewContainers();
    if (_planViewMode === 'week')  _renderWeekView();
    if (_planViewMode === 'month') { _renderMonthView(); _renderMonthDayList(); }
  });

  // 箭头切换日期（日视图/周视图共用），用 cloneNode 防止重复绑定
  function _bindArrowBtns() {
    var prevBtn = document.getElementById('dayPrevBtn');
    var nextBtn = document.getElementById('dayNextBtn');
    if (prevBtn) {
      var pNew = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(pNew, prevBtn);
      pNew.addEventListener('click', function() {
        if (_planViewMode === 'week') {
          // 周视图：直接移动7天
          _planWeekBaseDate = _addDays(_planWeekBaseDate, -7);
          _planSelectedDate = _addDays(_planSelectedDate, -7);
          _renderDateDisplay();
          _renderWeekView();
        } else {
          // 日视图：移动1天
          _planSelectedDate = _addDays(_planSelectedDate, -1);
          _renderDateDisplay();
          _renderPlanTasks();
        }
      });
    }
    if (nextBtn) {
      var nNew = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(nNew, nextBtn);
      nNew.addEventListener('click', function() {
        if (_planViewMode === 'week') {
          // 周视图：直接移动7天
          _planWeekBaseDate = _addDays(_planWeekBaseDate, 7);
          _planSelectedDate = _addDays(_planSelectedDate, 7);
          _renderDateDisplay();
          _renderWeekView();
        } else {
          // 日视图：移动1天
          _planSelectedDate = _addDays(_planSelectedDate, 1);
          _renderDateDisplay();
          _renderPlanTasks();
        }
      });
    }
  }
  _bindArrowBtns();

  // 日期显示栏点击 → 弹出系统日期选择器
  var dateDisplay = document.getElementById('planDateDisplay');
  if (dateDisplay) dateDisplay.addEventListener('click', function() {
    var inp = document.createElement('input');
    inp.type = 'date';
    inp.value = _planSelectedDate;
    inp.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px';
    document.body.appendChild(inp);
    inp.showPicker ? inp.showPicker() : inp.focus();
    inp.addEventListener('change', function() {
      _planSelectedDate = inp.value;
      if (_planViewMode === 'week') _planWeekBaseDate = _weekMonday(_planSelectedDate);
      _updateViewTabs();
      _renderViewContainers();
      if (_planViewMode === 'week')  _renderWeekView();
      if (_planViewMode === 'month') { _planMonthViewDate = _planSelectedDate.slice(0, 7) + '-01'; _renderMonthView(); }
      _renderPlanTasks();
      inp.remove();
    });
    inp.addEventListener('blur', function() { inp.remove(); });
  });

  // 周视图：左右滑动切换上一周/下一周
  var weekWrap = document.getElementById('planWeekScrollWrap');
  if (weekWrap) {
    weekWrap.addEventListener('scroll', function() {
      var el = weekWrap;
      // Right swipe (next week): scrolled right past threshold
      if (el.scrollLeft > 60) {
        el.scrollLeft = 0;
        _planWeekBaseDate = _addDays(_planWeekBaseDate, 7);
        _planSelectedDate = _addDays(_planSelectedDate, 7);
        _renderDateDisplay();
        _renderWeekView();
      }
      // Left swipe (prev week): scrolled left past threshold
      if (el.scrollLeft < -60) {
        el.scrollLeft = 0;
        _planWeekBaseDate = _addDays(_planWeekBaseDate, -7);
        _planSelectedDate = _addDays(_planSelectedDate, -7);
        _renderDateDisplay();
        _renderWeekView();
      }
    });
  }

  // 月视图：月份切换箭头
  var monthPrevBtn = document.getElementById('monthPrevBtn');
  var monthNextBtn = document.getElementById('monthNextBtn');
  if (monthPrevBtn) monthPrevBtn.addEventListener('click', function() {
    var ref = _planMonthViewDate || todayStr();
    var refD = new Date(ref + 'T00:00:00');
    var prevD = new Date(Date.UTC(refD.getUTCFullYear(), refD.getUTCMonth() - 1, 15));
    _planMonthViewDate = _isoDate(prevD);
    _renderMonthView();
    _renderMonthDayList();
  });
  if (monthNextBtn) monthNextBtn.addEventListener('click', function() {
    var ref = _planMonthViewDate || todayStr();
    var refD = new Date(ref + 'T00:00:00');
    var nextD = new Date(Date.UTC(refD.getUTCFullYear(), refD.getUTCMonth() + 1, 15));
    _planMonthViewDate = _isoDate(nextD);
    _renderMonthView();
    _renderMonthDayList();
  });

  var pfs = document.getElementById('pointFilterSubject'); if (pfs) pfs.addEventListener('change', renderPointList);
  var pfn = document.getElementById('pointFilterNature');  if (pfn) pfn.addEventListener('change', renderPointList);
  var pse = document.getElementById('pointSearch');        if (pse) pse.addEventListener('input',  renderPointList);

  // 详情面板关闭
  var dc = document.getElementById('detailClose');   if (dc) dc.addEventListener('click', closeDetailSheet);
  var ov = document.getElementById('detailOverlay'); if (ov) ov.addEventListener('click', closeDetailSheet);

  var qe = document.getElementById('quickExport');       if (qe) qe.addEventListener('click', exportJson);
  var ej = document.getElementById('exportJson');        if (ej) ej.addEventListener('click', exportJson);
  var ec = document.getElementById('exportCsv');         if (ec) ec.addEventListener('click', exportCsv);
  var et = document.getElementById('exportTodayTxt');    if (et) et.addEventListener('click', exportTodayTxt);
  var ij = document.getElementById('importJson');        if (ij) ij.addEventListener('click', importJson);
  var fi = document.getElementById('importFile');        if (fi) fi.addEventListener('change', handleImportFile);
  var ra = document.getElementById('resetApp');          if (ra) ra.addEventListener('click', resetApp);
  var cr = document.getElementById('createReviewTasks'); if (cr) cr.addEventListener('click', createReviewTasks);
  loadSettings();
  resetTaskForm();
  setTimeout(function() {
    resetPointForm();
    renderErrorTagGroup('言语理解', []);
    updateModulePlaceholder('言语理解');
  }, 0);
  initTextareaResize();
  initImageUpload();
  updateDashboard();
  console.log('公考学习控制台已初始化');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
