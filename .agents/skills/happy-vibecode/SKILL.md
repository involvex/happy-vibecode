---
name: happy-vibecode
description: Configure and set up Happy Vibecode — a remote control platform for AI coding agents. Use when asked to "configure happy-vibecode", "set up happy-vibecode", "install happy-vibecode CLI", "pair with happy-vibecode", or when a user wants to control AI agents from their phone or browser. Covers CLI install, bridge pairing, mobile app, and EAS deployment.
---

# Happy Vibecode

Happy Vibecode lets you run and control AI coding agents (Kilo, Claude, Copilot) remotely from your phone or any browser — real-time via WebSockets on Cloudflare Workers.

## When to Use This Skill

- User says "configure happy-vibecode for me"
- User wants to remote-control their coding agent from a phone
- User needs to pair a mobile app with their local CLI bridge
- User wants to deploy the Happy Vibecode mobile app via EAS
- User asks about setting up `happy-vibecode` or `@happy-vibecode/cli`

## Prerequisites

- Node.js 18+ or Bun 1.3+
- Git
- (Optional) EAS CLI for mobile deployment: `npm i -g eas-cli`

---

## Step-by-Step: Configure Happy Vibecode

### 1. Install the CLI

```bash
npm i -g @happy-vibecode/cli
```

Or with Bun:

```bash
bun add -g @happy-vibecode/cli
```

### 2. Run the Configuration Wizard

```bash
happy-vibecode config
```

This walks through:
- Choosing your agent type (Kilo / Claude / Copilot CLI / custom)
- Entering your Happy Vibecode server URL (default: `https://happy-vibecode.pages.dev`)
- Generating a **bridge code** (short alphanumeric) for pairing

### 3. Pair with the Mobile App

1. Open the Happy Vibecode mobile app (Android: internal preview build or Play Store)
2. On the home screen, tap **"Pair with CLI"**
3. Enter the bridge code shown by `happy-vibecode config`
4. Tap **Connect** — the CLI and app are now linked in real-time

### 4. Start the Bridge

```bash
happy-vibecode start
```

Keeps a persistent WebSocket connection open. Your agent now receives prompts sent from the app.

---

## Mobile App — EAS Build & Deploy

The mobile source lives at `apps/mobile/` in the monorepo.

### Build a Preview APK (Android)

```bash
cd apps/mobile
eas build --platform android --profile preview
```

This produces a shareable `.apk` downloadable from the EAS dashboard.

### Build Production (Play Store)

```bash
eas build --platform android --profile production
```

### OTA Update (No Rebuild)

```bash
eas update --channel preview --message "fix: keyboard input"
```

### Required: Firebase / FCM Setup

The app uses Expo Notifications with FCM for push. Before building:

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → Project Settings → Add Android app with package `com.happyvibecode.app`
2. Download `google-services.json`
3. Place it at `apps/mobile/google-services.json`
4. `app.json` already has `"googleServicesFile": "./google-services.json"` configured

---

## Repository Structure

```
apps/
  mobile/          # Expo React Native app (Android + Web)
  web/             # Cloudflare Worker + Next.js frontend (vinext)
packages/
  api/             # Hono API routes
  db/              # Drizzle ORM (D1 SQLite)
  shared/          # Shared types + Zod schemas
```

## Key Commands

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Dev (all) | `bun run dev` |
| Dev (web only) | `bun run dev:web` |
| Build | `bun run build` |
| Typecheck | `bun run typecheck` |
| Lint | `bun run lint:fix` |
| Deploy web | `bun run -F @happy-vibecode/web deploy` |
| DB migrate | `bun run -F @happy-vibecode/db migrate` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `FirebaseApp not initialized` | Place `google-services.json` at `apps/mobile/google-services.json` and rebuild via EAS |
| Keyboard covers input on Android | `KeyboardAvoidingView behavior="padding"` + `adjustResize` in AndroidManifest |
| `drizzle-orm` type errors | Run `bun dedupe && bun install` (overrides already set in root `package.json`) |
| Bridge code expired | Re-run `happy-vibecode config` to generate a new code |
