# Happy Vibecode

Happy Vibecode is a full-stack monorepo containing the web, mobile, API, database, and CLI components used to build and run the Happy Vibecode platform.

This README gives a concise overview, quick setup steps, and pointers to the most common developer workflows.

---

## Table of contents

- [Overview](#overview)
- [Monorepo layout](#monorepo-layout)
- [Prerequisites](#prerequisites)
- [Setup (quickstart)](#setup-quickstart)
- [Development - common commands](#development---common-commands)
- [Linting & Formatting](#linting--formatting)
- [Testing](#testing)
- [CLI](#cli)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

This repository uses a monorepo layout to keep related applications and packages together for easier development and sharing of code. Components include:

- apps/web — Next.js web application and server logic (Cloudflare Workers bridges exist)
- apps/mobile — Expo / React Native mobile app
- packages/api — HTTP API and server middleware
- packages/db — Database utilities and schemas
- packages/cli — Developer CLI (login, whoami, status, etc.)
- packages/shared — Shared types, schemas, and utilities

## Monorepo layout

Root folder highlights:

- `apps/` — consumer apps (web, mobile)
- `packages/` — reusable packages (api, db, cli, shared)
- `plans/`, `.agents/`, and infra helpers for automation and tooling

## Prerequisites

- Node.js >= 18
- A package manager: npm, pnpm or yarn (pnpm recommended for monorepos)
- Expo CLI for mobile development (if working on `apps/mobile`): `npm install -g expo-cli` or `pnpm dlx expo-cli`
- (Optional) Docker for services if you run them locally in containers

## Setup (quickstart)

1. Clone the repo:

   git clone <repo-url>
   cd happy-vibecode

2. Install dependencies (choose one):

   npm install

   # or

   pnpm install

   # or

   yarn install

3. Review package scripts at the root and inside `apps/*` and `packages/*` for exact commands. Many tasks are run from the workspace root or from each package/app folder.

## Development - common commands

- Start web (development):
  cd apps/web
  npm run dev

- Start mobile (Expo):
  cd apps/mobile
  expo start

- Run the API locally:
  cd packages/api
  npm run dev

- Run the CLI locally (development):
  cd packages/cli
  npm run build && node ./dist/index.js --help

Note: exact script names vary by package. Use `npm run` in each folder to discover available scripts.

## Linting & Formatting

This repo uses ESLint and Prettier conventions across packages. To lint the monorepo or a specific package:

- Lint everything (root):
  npm run lint

- Lint a single package:
  cd apps/mobile
  npm run lint

If you're adding an ESLint config for mobile packages (e.g., packages starting with `mobile`), add or update `.eslintrc` / `eslint.config.js` in `apps/mobile` or shared configs in `packages/shared`.

## Testing

Run tests from the package or root depending on configuration. Example:

cd packages/api
npm test

Investigate each package's test scripts for specifics.

## CLI

The `packages/cli` package provides developer commands such as `login`, `whoami`, and `status`.

- Build and run the CLI locally:

  cd packages/cli
  npm run build
  node ./dist/index.js <command>

- Useful commands:
  - `whoami` — shows authenticated user info
  - `status` — shows auth / connection status
  - `login` — authenticate

## Contributing

- Create feature branches from `main` or the appropriate release branch.
- Follow commit conventions (conventional commits help with changelogs).
- Run linting and tests before opening PRs.
- Keep code focused in the relevant package and share utilities in `packages/shared`.

## Troubleshooting

- If agents (Copilot/Gemini/etc.) fail to start with `ENOENT` or similar errors, check that the required CLI binaries are installed and available on PATH. These agent errors are external tools, not repository code.
- If authentication prompts appear frequently (e.g., when opening history), check token persistence and whether local storage or environment variables are cleared between sessions.

## License

This repository does not include a LICENSE file by default. Add an appropriate license (e.g., MIT, Apache-2.0) at the project root if you intend to open source this project.

---

If you'd like the README to include package-specific scripts and examples (exact `npm`/`pnpm` scripts, environment variables, or CI/deployment instructions), tell me which areas to expand and I'll update the file.
