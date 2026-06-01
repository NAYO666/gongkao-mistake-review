# AI Usage Notes

AI support in this project is meant to reduce manual formatting work. It is not meant to replace human review.

## Current Behavior

The app can:

- send pasted mistake text to a configurable AI endpoint;
- ask the model to return structured JSON;
- parse the result into draft mistake cards;
- send image inputs to a vision-capable endpoint for experimental image recognition;
- let the user confirm drafts before saving.

The app calls:

```text
/chat/completions
```

with an OpenAI-style request and response shape.

## Provider Notes

SiliconFlow-style configuration is currently usable when the endpoint supports the expected API behavior. OpenAI-compatible endpoints may also work, but compatibility is not guaranteed.

Common failure reasons include:

- browser CORS restrictions;
- wrong base URL;
- wrong model name;
- missing or invalid API key;
- provider-specific response format differences;
- model not supporting image input;
- rate limits or insufficient credits.

## Human Review Required

AI output should be treated as draft content. Users should confirm:

- subject;
- module;
- error tags;
- wrong path;
- formula;
- answer;
- summary;
- whether the card split is correct.

Do not treat AI explanations as certainly correct.

## API Key Safety

Do not paste API keys into:

- source code;
- README files;
- docs;
- examples;
- public issues;
- screenshots;
- commit messages.

If a key is exposed, revoke or rotate it.

## Experimental Image Recognition

Image AI recognition is experimental. It may fail or produce inaccurate cards. It may also store large image data in browser storage after import. Use placeholder image fields in examples and avoid committing real mistake screenshots.

