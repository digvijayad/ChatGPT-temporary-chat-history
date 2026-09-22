# Publishing Checklist

## GitHub

1. Create a repository named `chatgpt-temporary-chat-history`.
2. Upload the contents of this folder to the repository root.
3. Commit and push.
4. Enable Issues if you want public bug reports.
5. Optionally enable GitHub private vulnerability reporting.
6. Create a release tag matching the userscript version, for example `v2.3.1`.

After the repository URL is final, consider adding these metadata fields to the userscript:

```text
// @homepageURL   https://github.com/digvijayad/chatgpt-temporary-chat-history
// @supportURL    https://github.com/digvijayad/chatgpt-temporary-chat-history/issues
// @downloadURL   https://raw.githubusercontent.com/digvijayad/chatgpt-temporary-chat-history/main/chatgpt-temporary-chat-history.user.js
// @updateURL     https://raw.githubusercontent.com/digvijayad/chatgpt-temporary-chat-history/main/chatgpt-temporary-chat-history.user.js
```

Do not add placeholder URLs to the publicly released userscript. Replace them with real URLs first.

## Greasy Fork

1. Create a new script entry.
2. Paste or upload `chatgpt-temporary-chat-history.user.js`.
3. Use the README summary as the basis for the public description.
4. Select MIT as the license.
5. Clearly state that the project is unofficial and not affiliated with OpenAI.
6. Confirm the userscript host accepts the current grants and metadata.
7. Test the installed hosted version on ChatGPT before announcing the release.

## OpenUserJS

The same `.user.js` file can be used. Review the service's current metadata and publishing requirements before submission.

## Release Validation

Run:

```bash
npm install
npm run check
```

Then manually test these ChatGPT states:

- New chat.
- Temporary Chat selected.
- First message sent in Temporary Chat.
- Personalized control shown, when applicable.
- Existing normal conversation.
- History modal search.
- Open, Copy URL, Copy ID, Delete.
- Export and Import.
- Light and dark appearance.
- Browser resize.

## Versioning

Keep the following versions synchronized:

- `@version` in `chatgpt-temporary-chat-history.user.js`.
- `version` in `package.json`.
- Latest entry in `CHANGELOG.md`.
