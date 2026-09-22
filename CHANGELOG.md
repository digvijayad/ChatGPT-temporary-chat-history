# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where practical.

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
