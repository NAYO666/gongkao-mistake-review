# Gongkao Mistake Review PWA

Turn mistakes into reviewable learning assets.

Gongkao Mistake Review PWA is an early-stage, local-first PWA for civil service exam and Xingce mistake review. It is designed for personal study workflows where learners enter, paste, or import their own mistake content, then turn each mistake into a structured card for later review.

This project is not an online question bank. It does not distribute civil service exam papers, official questions, or copyrighted study material.

## Why This Exists

Many exam learners answer a large number of practice questions, but their mistakes often stay as one-time notes, screenshots, or scattered explanations. A traditional mistake notebook can record the question and answer, but it may not capture why the answer went wrong.

This project explores a small workflow:

- collect user-provided mistake content;
- organize each mistake into reviewable fields;
- focus on the wrong path, error cause, shortcut formula, and summary;
- schedule repeated review;
- keep learning data under the user's control through local storage and JSON backup.

In Chinese: 把错题从一次性记录，变成可持续复习资产。

## Current Status

This project is early-stage and experimental.

The current app is a single-page browser PWA. It stores data mainly in browser `localStorage`, supports JSON backup and restore, and includes a configurable AI-assisted organization workflow. Some features work well enough for personal use, while others still need careful validation.

Use it as a personal learning tool, not as a finished product or a complete exam preparation system.

## Core Ideas

- Local-first learning tool
- Mistake-centered review
- Structured error analysis
- Spaced repetition
- Mobile-first PWA
- Human-reviewable AI assistance
- Personal learning data ownership
- Offline-friendly study workflow
- User-provided mistake content
- Exportable learning data

## Current Features

- Add and edit mistake cards manually.
- Paste structured text and turn it into draft mistake cards.
- Confirm imported drafts before saving them.
- Search and filter mistakes by subject and text.
- Track subjects and modules for Xingce and Shenlun-style study areas.
- Record error tags, wrong path, core trap, shortcut formula, summary, correct answer, and personal answer.
- Review due and overdue mistakes.
- Give review feedback: `wrong`, `shaky`, or `solid`.
- Schedule the next review using simple built-in intervals.
- Mark mistakes as mastered after enough solid reviews.
- Create study tasks with date, minutes, priority, and notes.
- View tasks by day, week, or month.
- Configure AI API base URL, model, and API key in the browser.
- Test the configured AI connection.
- Export and import JSON backups.
- Install or cache the app as a PWA when served over HTTP or HTTPS.

## Experimental Features

These features exist in the codebase but should be treated carefully:

- AI-assisted text organization: the app calls a configurable OpenAI-style `/chat/completions` endpoint from the browser. SiliconFlow-style configuration is currently usable in this workflow when the endpoint supports the expected API shape. Other OpenAI-compatible endpoints may work, but CORS, model support, response format, and provider behavior can vary.
- Image AI recognition: image files can be sent to the configured AI endpoint as image inputs, but quality depends on model capability, browser limits, provider behavior, and image content. This is experimental.
- Image attachments: images are stored as data URLs inside browser storage. This is convenient, but it can quickly increase storage size.
- Duplicate detection: the current check is simple and title-based.
- Offline behavior: the service worker caches the app shell, but user data still depends on browser storage and manual backup.

## Planned Features

See [ROADMAP.md](ROADMAP.md) for the staged plan.

Near-term directions include better documentation, more reliable import/export examples, improved AI organization, safer image handling, duplicate detection improvements, review analytics, and clearer privacy controls.

## Data Model Overview

The app stores its main data in browser `localStorage` under the current key:

```text
gk_brain_xingce_v1
```

The stored object contains:

- `mistakes`: saved mistake cards;
- `tasks`: study tasks;
- `settings`: daily target and AI configuration;
- `createdAt` and `updatedAt`: timestamps.

A mistake card currently uses fields such as:

- `id`
- `title`
- `source`
- `subject`
- `module`
- `errorTags`
- `formula`
- `summary`
- `correctAnswer`
- `wrongPath`
- `trap`
- `myAnswer`
- `images`
- `raw`
- `nature`
- `status`
- `reviewRound`
- `reviewCount`
- `nextReview`
- `lastReviewed`
- `createdAt`
- `updatedAt`

See [schemas/mistake.schema.json](schemas/mistake.schema.json) and [examples/sample_mistake_card.json](examples/sample_mistake_card.json).

## Example Mistake Card

```json
{
  "id": "mistake-sample-001",
  "title": "A fictional data-analysis question about comparing growth rates",
  "source": "Sample mock practice set",
  "subject": "资料分析",
  "module": "增长率计算",
  "errorTags": ["公式记错", "没看清题干"],
  "formula": "Growth rate = growth amount / base amount.",
  "summary": "Confirm the base period before comparing growth rates.",
  "correctAnswer": "B",
  "wrongPath": "Compared absolute growth amounts instead of percentage-point changes.",
  "trap": "The wording asks for rate comparison, not amount comparison.",
  "myAnswer": "C",
  "images": [],
  "nature": "thinking",
  "status": "new",
  "reviewRound": 0,
  "reviewCount": 0,
  "nextReview": "2026-06-01"
}
```

The example is fictional and is not copied from any official exam paper.

## How It Works

1. Add a mistake manually, paste structured notes, or create a draft from AI-assisted organization.
2. Review the draft fields and correct anything that looks wrong.
3. Save the mistake card.
4. Revisit due cards from the review view.
5. Mark each review as `wrong`, `shaky`, or `solid`.
6. Export a JSON backup regularly.

The app focuses on why an answer went wrong, not only what the correct answer is.

## Privacy And Local-First Design

The app is local-first. It primarily stores study data in your browser through `localStorage`.

This has benefits:

- quick personal use;
- no required account system;
- user-owned JSON backup;
- offline-friendly app shell after caching.

It also has limits:

- `localStorage` is not an encrypted database;
- clearing browser data can delete your study records;
- changing devices does not automatically move your data;
- large image attachments can exceed browser storage limits;
- API keys saved in browser settings should be handled carefully.

Export backups regularly through the settings page.

## AI Usage Notes

AI is used to help organize raw mistake notes into draft cards. AI output should always be checked by the user before saving.

Current behavior:

- the app sends requests from the browser to a configurable API base URL;
- the request path is `/chat/completions`;
- the app expects an OpenAI-style response format;
- SiliconFlow-style configuration is usable when the endpoint supports the expected API shape;
- OpenAI-compatible providers may work, but compatibility is not guaranteed.

Do not commit API keys to a public repository, issue, README, example file, screenshot, or commit history.

## PWA Usage Notes

The app includes:

- `manifest.webmanifest`
- `service-worker.js`
- an SVG icon
- app-shell caching

To use PWA behavior reliably, serve the folder through a local or hosted HTTP server instead of opening `index.html` directly from the file system. Browser support and installation prompts vary by platform.

If the app appears stale after updates, refresh the page, clear site data, or unregister the service worker from browser developer tools.

## Backup And Restore

Use the settings page to export a JSON backup. The export removes the saved API key from the backup payload.

Importing a backup replaces current mistakes, tasks, settings, and review progress. Export before importing if you want a rollback point.

See [examples/sample_backup.json](examples/sample_backup.json) for a fictional backup shape.

## Copyright Notes

This repository should not include full civil service exam papers, official question sets, copyrighted explanations, private screenshots, or paid course materials.

Use mock, fictional, or personally owned sample content in examples and documentation.

## Who This Is For

This project may be useful for:

- civil service exam learners who maintain their own mistake notes;
- people who want a structured review workflow rather than a simple note list;
- learners who prefer local-first tools and manual data backup;
- contributors interested in small PWA learning workflows.

It is not for:

- redistributing exam content;
- building a full public bank of exam questions;
- promising exam score outcomes;
- replacing human judgment with autonomous AI tutoring.

## Roadmap

The project is currently closest to Stage 1: local mistake storage, mistake card structure, review scheduling, backup and restore, mobile PWA interface, and configurable AI-assisted organization.

See [ROADMAP.md](ROADMAP.md).

## Contributing

Contributions are welcome when they respect the project's boundaries:

- keep examples fictional;
- do not include API keys or private study data;
- mark experimental behavior clearly;
- avoid claims that the project is official, complete, or mature enough for critical use;
- preserve the local-first data model unless a change is discussed first.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license file is currently included in this folder. Add an explicit open-source license before presenting this as a reusable open-source project.
