# Data Privacy

This project is local-first, privacy-conscious, and user-controlled, but it is not a security product.

## Where Data Is Stored

The current app stores data mainly in browser `localStorage` under:

```text
gk_brain_xingce_v1
```

This includes mistake cards, task records, review state, and settings.

## Benefits

- No account is required for the current app.
- Study data stays in the user's browser by default.
- Data can be exported as JSON.
- The app shell can be cached for offline-friendly access.

## Limits

- `localStorage` is not encrypted.
- Browser cleanup can delete the data.
- Device changes do not automatically transfer the data.
- Large image attachments may exceed browser storage limits.
- Other browser profiles or devices will not see the same data unless a backup is imported.

## Backups

Users should export JSON backups regularly. Importing a backup replaces current local data, so export before importing if rollback matters.

The current export flow removes the saved API key from the backup payload.

## API Keys

If users save an API key in the app settings, it is stored in browser local storage as part of settings. Treat it carefully:

- do not share screenshots that reveal keys;
- do not paste keys into public issues or docs;
- do not commit keys to the repository;
- rotate keys if they are accidentally exposed.

## Public Repository Safety

Do not add private mistake content, screenshots, backups, or copyrighted exam material to this repository.

The project does not currently provide cloud sync.

