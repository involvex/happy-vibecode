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
    - `happy login`: Device-code flow or API token authentication.
    - `happy connect <agent>`: 
        - Spawns/attaches to a local agent process.
        - Establishes a secure **WebSocket (WSS)** tunnel to the Cloudflare Worker API.
        - Relays prompt/response messages between the local agent and the remote platform.
    - `happy init`: Scaffolds agent configuration files.
    - `happy status`: Checks connectivity and remote session health.

---

## 3. Technical Architecture & Data Flow

1.  **Local Side**: 
    - User runs `happy connect gemini-cli`.
    - CLI starts the local agent and opens a WebSocket to `api.happy-vibecode.com`.
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
2.  **CLI MVP**: Implement `happy login` and a basic WebSocket echo bridge.
3.  **Web Core**: Build the chat interface and D1 integration as a standard Worker.
4.  **Mobile Setup**: Initialize Expo project and connect to the API.
5.  **APK Generation**: Successfully build and sideload the first Android APK.
6.  **Remote Integration**: End-to-end test of Web UI -> API -> CLI -> Local Agent.

---

## Verification Plan

1.  **CLI Connectivity**: Verify `happy connect` establishes a tunnel and receives test messages.
2.  **Web UI Real-time**: Confirm messages stream correctly from the "remote" agent.
3.  **Mobile Navigation**: Verify `expo-router` handles deep links and shared state on Android.
4.  **APK Installation**: Confirm the generated APK installs and runs without crashes.
5.  **D1 Persistence**: Ensure session history is correctly stored and retrievable.
