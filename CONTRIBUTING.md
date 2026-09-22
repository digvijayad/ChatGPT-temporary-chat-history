# Contributing

Contributions are welcome.

## Development Setup

```bash
git clone <your-fork-url>
cd chatgpt-temporary-chat-history
npm install
npm run check
```

## Pull Requests

Please keep changes focused and describe:

- What changed.
- Why the change is needed.
- Which ChatGPT UI states were tested.
- Which browser(s) were tested.

For visual/header changes, test at minimum:

1. A normal new-chat page.
2. Temporary Chat immediately after activation.
3. Temporary Chat after the first message, including Personalized controls when present.
4. An existing normal conversation.

Do not include private conversation IDs, URLs, screenshots containing sensitive information, or exported history files in commits or issues.

## Code Style

Run:

```bash
npm run check
```

The project uses ESLint and Prettier. Avoid relying on minified or obfuscated code because public userscript hosts may reject it and it makes review more difficult.

## Releases

For a release:

1. Update `@version` in the userscript metadata.
2. Update `version` in `package.json`.
3. Update `CHANGELOG.md`.
4. Run `npm run check`.
5. Test installation in Tampermonkey.
6. Create a Git tag matching the release version.
