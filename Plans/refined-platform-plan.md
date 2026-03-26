# Refined Plan: Evolve Happy-Vibecode Monorepo

**Objective:**  
Build a production-grade remote control platform for LLM agents. Enable users to manage, interact, and bridge their local agents to a remote web/mobile interface securely.

---

## 1. Monorepo Structure & Evolution

- **`apps/web`**: **Vinext** (Vite + Next.js-like routing) with **React Server Components (RSC)**. Deployed as a standard **Cloudflare Worker**.
- **`apps/mobile`**: **Expo (React Native)** with **Expo Router**. Targeted for Android (Primary), iOS, and Web.
- **`packages/cli`**: **Bun CLI** for remote agent configuration and bridging.
- **`packages/api`**: **Hono** or **Kumo** based API routes, deployed as Cloudflare Workers.
- **`packages/db`**: **Drizzle ORM** with **Cloudflare D1** (Serverless SQL).
- **`packages/shared`**: Shared Zod schemas, types, and utility functions (e.g., Auth models, Agent protocols).

---

## 2. Detailed Component Breakdown

### A. Web App (The Core Interface)

- **Framework**: Vinext + RSC.
- **Runtime**: Standard Cloudflare Worker (using `wrangler`).
- **UI Architecture**:
  - **Radix UI** primitives for accessibility.
  - **Tailwind CSS v4** for styling.
  - **Lucide React** for iconography.
- **Features**:
  - Real-time chat interface with streaming (via `ai` package).
  - Agent Dashboard: Monitor status, connected devices, and session history.
  - Credentials Management: Securely store and sync API keys (optionally using Cloudflare Secrets/KV).
  - Responsive design for desktop-first experience.

### B. Mobile App (The Remote Control)

- **Framework**: **Expo (React Native)**.
- **Android Focus**: Prioritize APK builds and Play Store compatibility.
- **Why Expo?**:
  - **Expo Router** provides a file-based routing experience identical to the web app.
  - **Native API Access**: Easily implement push notifications (for long-running agent tasks) and biometric auth.
  - **Universal Components**: Share UI logic where possible, though styled-components or Tailwind (via NativeWind v5 or Uniwind) will be used for native layout.
- **Key Flow**: Quick handoff from web to mobile. Start a prompt on your desktop, get the response on your phone while on the go.

### C. The Happy CLI (The Remote Bridge)

- **Framework**: Bun + `commander`.
- **Primary Function**: Bridge local agents (like `gemini-cli`, `claude-code`) to the `happy-vibecode` platform.
- **Commands**:
  - `happy-vibecode login`: Device-code flow or API token authentication.
  - `happy-vibecode connect <agent>`:
    - Spawns/attaches to a local agent process.
    - Establishes a secure **WebSocket (WSS)** tunnel to the Cloudflare Worker API.
    - Relays prompt/response messages between the local agent and the remote platform.
  - `happy-vibecode init`: Scaffolds agent configuration files.
  - `happy-vibecode status`: Checks connectivity and remote session health.

---

## 3. Technical Architecture & Data Flow

1.  **Local Side**:
    - User runs `happy-vibecode connect gemini-cli`.
    - CLI starts the local agent and opens a WebSocket to `happy-vibecode.involvex.workers.dev`.
2.  **Platform Side**:
    - Cloudflare Worker (API) receives the WebSocket connection and maps it to the `user_id`.
    - Store the "Connected" state in **Cloudflare KV** or **Durable Objects**.
3.  **Client Side (Web/Mobile)**:
    - User sends a message via the UI.
    - API routes the message through the persistent WebSocket to the local CLI.
    - CLI executes the agent and streams the response back.

---

## 4. Database & Storage Strategy (Cloudflare D1)

- **`users`**: ID, Email, Auth Metadata.
- **`agent_sessions`**: ID, UserID, AgentType, ConnectionStatus, StartedAt.
- **`message_logs`**: ID, SessionID, Role (user/agent), Content, Timestamp.
- **`device_tokens`**: For push notifications.

---

## 5. Deployment & CI/CD

- **Environment**: 100% Cloudflare (Free Tier optimized).
- **Tools**: `wrangler`, `turbo`, `bun`, `eas-cli`.

### A. Web & API (Local Workflow)

- **Deployment Process**:
  - **Manual/Local Deploys**: All deployments for `apps/web` and `packages/api` are performed via `wrangler deploy` from the developer's local environment.
  - Run `turbo run build typecheck lint` locally before deployment to ensure monorepo integrity.

### B. Mobile App (Android APK Build Workflow)

To build the Android application as an APK for direct installation or testing:

1.  **Configure `eas.json`**:
    - Define a `preview` or `production` profile with `buildType: "apk"`.
2.  **Run Build**:
    - Execute `eas build --platform android --profile preview` to build in the cloud and receive an APK download link.
    - Alternatively, run `eas build --platform android --profile preview --local` for a local build (requires Android Studio/SDK setup).
3.  **Sideload APK**:
    - Use `adb install` or transfer the generated `.apk` file to an Android device.
4.  **Verification**:
    - Launch the app on an Android emulator or physical device.
    - Test deep linking from the web app (handoff) and push notification delivery.

---

## 6. Milestones

1.  **Monorepo Fixes**: Standardize `packages/shared` and `packages/db`.
2.  **CLI MVP**: Implement `happy-vibecode login` and a basic WebSocket echo bridge.
3.  **Web Core**: Build the chat interface and D1 integration as a standard Worker.
4.  **Mobile Setup**: Initialize Expo project and connect to the API.
5.  **APK Generation**: Successfully build and sideload the first Android APK.
6.  **Remote Integration**: End-to-end test of Web UI -> API -> CLI -> Local Agent.

---

## Verification Plan

1.  **CLI Connectivity**: Verify `happy-vibecode connect` establishes a tunnel and receives test messages.
2.  **Web UI Real-time**: Confirm messages stream correctly from the "remote" agent.
3.  **Mobile Navigation**: Verify `expo-router` handles deep links and shared state on Android.
4.  **APK Installation**: Confirm the generated APK installs and runs without crashes.
5.  **D1 Persistence**: Ensure session history is correctly stored and retrievable.

## Web Ui

## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project

ID: 16170134109792201713

## Screens:

1. Settings & Credentials
   ID: 3b5a352e78a242afa9739df09b012fc5

2. Chat Interface
   ID: faa53c13d31e4b68836ba9b267bb1c99

3. System Settings
   ID: 826341600fec4f48bec003a1fe06c6da

4. Design System
   ID: asset-stub-assets-8ba2f86b6622471aae13e74e1cd6e789-1774506108293

5. Dashboard
   ID: 3df9f85b541b41a8874c37e4985131f1

6. Authentication
   ID: 09bb25dd83d9408fb52f112524713946

7. Happy Landing Page
   ID: 8c9865ea61924829b21023b148dec78f

8. Project Plan (plan.md)
   ID: 93b895a641bc4ae88f56af17ca8a6c1d

Use a utility like `curl -L` to download the hosted URLs.

## Mobile Ui

## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project

ID: 17134232173258000288

## Screens:

1. Design System
   ID: asset-stub-assets-62b38aefedcb45cea5f3eb64a092e764-1774505879932

2. Agent Gallery
   ID: 286e1f243d8b4d7c917338c21c130eef

3. Active Session
   ID: b5dab28f219d4c33b934caf84e272cc7

4. Settings
   ID: 7bd76c2d7f9a497bbb6e35dd4ecd8473

5. History
   ID: 8e9f98d99d114699a799130ae2b584ed

6. Agent Configuration
   ID: e7509be413fd4fc1b1da1b899652eae9

Use a utility like `curl -L` to download the hosted URLs.
