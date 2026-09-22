# Security Policy

## Reporting a Vulnerability

Please do not publish sensitive security details, private ChatGPT conversation IDs, Temporary Chat URLs, account data, or exported history in a public issue.

For a security-sensitive report, use GitHub's private vulnerability reporting feature if it is enabled for this repository.

## Data Handling

The userscript stores captured Temporary Chat history through Tampermonkey storage. Exported JSON files can contain conversation IDs, URLs, timestamps, and first-prompt text and should therefore be treated as sensitive user data.

The project should not add remote telemetry, analytics, or external history synchronization without clearly documenting the behavior and obtaining deliberate user opt-in.
