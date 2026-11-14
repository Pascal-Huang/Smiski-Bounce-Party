# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a minimal scaffold. `README.md` contains the project title; no application source, tests, assets, or dependency manifests exist yet. Run repository commands from `hackhaven/`, the directory containing `.git`.

When adding the first implementation, organize application code, tests, and static assets into clearly named directories such as `src/`, `tests/`, and `assets/`, where appropriate for the chosen framework. Update `README.md` to describe the actual layout and setup process.

## Build, Test, and Development Commands

No build, development server, lint, or test commands are configured. Do not assume commands such as `npm test` or `npm run build` are available.

Useful checks at this stage:

- `git status --short`: inspect pending changes before committing.
- `git diff --check`: detect whitespace errors in tracked changes.
- `git diff`: review the content of tracked changes.

When introducing tooling, document installation prerequisites and exact run, build, and test commands in `README.md`.

## Coding Style & Naming Conventions

No language-specific formatter or linter is configured. Keep Markdown headings descriptive, use consistent list formatting, and write concise instructions. For new code, follow the selected language's conventions and add shared formatting configuration when needed. Use descriptive filenames and avoid unrelated formatting changes.

## Testing Guidelines

There is no testing framework or coverage threshold yet. When adding executable behavior, include suitable automated tests and document how to run them. Use descriptive test names that identify the behavior and expected result; adopt the chosen framework's filename conventions consistently.

## Commit & Pull Request Guidelines

Git history contains only `Initial commit`, so no established commit convention exists. Write short, imperative commit subjects, for example `Add project setup instructions`, and keep each commit focused.

Pull requests should explain the change, its purpose, and validation performed. Link related issues when available. Include screenshots for visual changes, and explicitly state when automated checks are unavailable.

## Security & Configuration

Never commit credentials or private configuration. If environment variables are introduced, document their names and provide placeholder values in an example configuration file.
