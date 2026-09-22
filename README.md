## Install

### One-click install

[Install with Tampermonkey](https://raw.githubusercontent.com/digvijayad/ChatGPT-temporary-chat-history/main/chatgpt-temporary-chat-history.user.js)

> Requires the Tampermonkey browser extension.

# ChatGPT Temporary Chat History

A Tampermonkey userscript that keeps a **local recovery history for ChatGPT Temporary Chats**.

Temporary Chats are intentionally absent from ChatGPT's normal sidebar history. This userscript records the temporary conversation ID and URL locally in your browser so you can reopen a temporary conversation while it is still available to your account/session.

> This project is independent and is not affiliated with or endorsed by OpenAI.

## Features

- Saves detected Temporary Chat conversation IDs and canonical URLs locally.
- Uses the first user prompt as a readable title when available.
- Adds a compact history button beside ChatGPT's current header controls.
- Automatically repositions when the ChatGPT header changes between new chats, Temporary Chat, Personalized mode, Share controls, saved chats, and existing conversations.
- Search saved temporary chats.
- Open a saved conversation in a new tab.
- Copy a conversation URL or ID.
- Delete individual history entries.
- Export history as JSON.
- Import previously exported JSON history.
- Stores history with Tampermonkey storage; no external server is used by this script.

## Install

### Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open Tampermonkey and choose **Create a new script**.
3. Replace the starter template with the contents of `chatgpt-temporary-chat-history.user.js`.
4. Save the script.
5. Make sure the script is enabled.
6. Refresh `https://chatgpt.com/`.

### From GitHub

If you already have Tampermonkey installed, open the raw userscript:
https://raw.githubusercontent.com/digvijayad/ChatGPT-temporary-chat-history/main/chatgpt-temporary-chat-history.user.js

Tampermonkey should automatically detect the `.user.js` file and display its installation screen.

The script includes:

- `@downloadURL` for downloading the latest release from GitHub.
- `@updateURL` so Tampermonkey can periodically check GitHub for newer versions.

When publishing an update, increment the `@version` value in the userscript. Tampermonkey compares that version against the installed version and offers/installs the newer copy according to the user's Tampermonkey update settings.

## Greasy Fork / OpenUserJS

The main `.user.js` file is intended to be directly publishable to a userscript host.

Before publishing:

1. Replace any repository placeholders in your listing description.
2. Confirm the current ChatGPT UI still works with the script.
3. Increment `@version` for each release.
4. Update `CHANGELOG.md`.
5. Run the validation commands below.

Greasy Fork may impose additional code-quality and metadata requirements. Review its current publishing rules before submitting a new version.

## Development

Requirements:

- Node.js 20+ recommended.
- npm.

Install development dependencies:

```bash
npm install
```

Validate:

```bash
npm run check
```

Format:

```bash
npm run format
```

Check formatting only:

```bash
npm run format:check
```

Lint:

```bash
npm run lint
```

Syntax-only validation without installing dependencies:

```bash
node --check chatgpt-temporary-chat-history.user.js
```

## Repository Structure

```text
.
├── chatgpt-temporary-chat-history.user.js
├── chatgpt-temporary-chat-history.meta.js
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── package.json
├── eslint.config.js
├── .prettierrc.json
├── .prettierignore
├── .editorconfig
└── .gitignore
```

## How It Works

The userscript observes several sources to identify a Temporary Chat conversation:

- ChatGPT navigation state and URLs.
- Temporary Chat indicators in the interface.
- Conversation IDs seen in relevant browser/network activity.
- The first user message, which is used as a display title when available.

History is stored using Tampermonkey's `GM_getValue` and `GM_setValue` APIs.

The header history button is intentionally **not inserted into ChatGPT's React component hierarchy**. ChatGPT can use different nested wrappers depending on the current page state, which can cause injected controls to stack vertically or move unpredictably. Instead, the script locates the active native header controls and positions its button immediately to their left, updating as the interface changes.

## Privacy

The script does not intentionally send saved history to a third-party service. Saved entries are maintained through Tampermonkey storage in the browser profile.

Exporting history creates a local JSON download. Treat exported files as potentially sensitive because they may contain conversation IDs, URLs, and first-prompt text.

## Limitations

- ChatGPT is a frequently changing web application. UI changes can require selector or positioning updates.
- A locally saved URL does not guarantee that a Temporary Chat will remain accessible indefinitely.
- The script is designed specifically for Temporary Chats and does not attempt to replace ChatGPT's normal conversation history.
- Browser extensions, custom stylesheets, experimental ChatGPT layouts, or narrow viewport sizes may affect header placement.

## Reporting Bugs

When opening an issue, include:

- Browser and version.
- Tampermonkey version.
- Script version.
- ChatGPT page state where the issue occurs.
- A screenshot if the issue is visual.
- Console errors beginning with `[Temp History]`, if any.

Do not post private conversation URLs, conversation IDs, account details, or sensitive chat content in a public GitHub issue.

## License

MIT. See [LICENSE](LICENSE).
