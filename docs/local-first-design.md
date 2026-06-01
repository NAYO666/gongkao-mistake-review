# Local-First Design

This project uses a local-first design because mistake review is often personal, iterative, and private.

## Why Local-First

Local-first behavior supports:

- quick personal use;
- user-owned learning data;
- lower setup burden;
- offline-friendly study sessions;
- simple JSON backup and restore.

The current project does not require a login or remote database.

## Browser Storage

The current storage layer is browser `localStorage`. This keeps the app simple, but it also creates limits.

Good fit:

- small to medium personal study records;
- quick local experiments;
- portable JSON backup;
- single-user browser workflow.

Poor fit:

- encrypted sensitive data;
- large image archives;
- automatic multi-device sync;
- team collaboration;
- guaranteed long-term storage without backups.

## Data Ownership

Users own their study data and can export it as JSON. The project should continue to make export and restore easy to understand.

## Current Limitations

- Clearing site data may delete records.
- Moving to another device requires manual export/import.
- Browser storage limits vary.
- Image data URLs can make backups large.
- API keys stored in settings need careful handling.
- Offline caching covers app files, not a cloud backup.

