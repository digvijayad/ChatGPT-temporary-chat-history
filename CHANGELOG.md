# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where practical.

## [2.3.3] - 2026-09-30

### Fixed

- Restores `history_and_training_disabled: true` when continuing a locally saved Temporary Chat if ChatGPT omits the flag after reopening its URL.
- Handles both `POST /backend-api/f/conversation` and `POST /backend-api/f/conversation/prepare` request variants.
- Leaves regular and unknown conversation requests unchanged.

## [2.3.2] - 2026-09-30

### Fixed

- Anchored the history button to ChatGPT's page/app-shell header obstacle instead of switching between individual header controls as the interface updates.
- Detects new Temporary Chats from the exact `POST /backend-api/f/conversation/prepare` request when its payload contains both `history_and_training_disabled: true` and a valid `conversation_id`.
- Ignores normal prepare requests, where `history_and_training_disabled` is absent, as well as unrelated request and response payloads.
- Removed the ambiguous UI-text and generic payload heuristics that could classify regular chats as Temporary Chats.

## [2.3.1] - 2026-09-22

### Changed

- Prepared the userscript for public GitHub and userscript-hosting distribution.
- Reworked header-button placement to avoid inserting the custom button into unstable ChatGPT wrapper elements.
- The history button now anchors to the current native header controls and repositions as the ChatGPT header changes.
- Improved handling of Share, Temporary Chat, Personalized, bookmark/save, and overflow header states.
- Added MIT license metadata.
- Added ESLint, Prettier, EditorConfig, repository documentation, and contribution/security guidance.

### Fixed

- Fixed the history button retaining a stale horizontal offset after the Personalized control appeared.
- Fixed the history button stacking vertically when injected into certain ChatGPT header wrappers.

## [2.2.0] - 2026-09-22

### Changed

- Moved the history button from a bottom-right floating position toward the ChatGPT header.
- Added dynamic position tracking for ChatGPT interface changes.

## [2.1.0]

### Added

- Local Temporary Chat history storage.
- Conversation ID and URL capture.
- First-prompt titles.
- Search, open, copy, delete, import, and export functions.
