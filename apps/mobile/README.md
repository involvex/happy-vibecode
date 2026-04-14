# @happy-vibecode/mobile

![Version](https://img.shields.io/badge/version-0.0.4-blue)
![Runtime](https://img.shields.io/badge/runtime-Expo%2055-black)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-green)
![License](https://img.shields.io/badge/license-MIT-green)

Mobile companion app for the Happy Vibecode platform. Built with Expo SDK 55 and React Native, it provides a native chat interface for interacting with AI agents, session history, gallery, and settings. Uses NativeWind (Tailwind CSS for React Native) for styling and Better Auth for authentication.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Styling](#styling)
- [Navigation](#navigation)
- [Authentication](#authentication)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.x
- [Expo CLI](https://docs.expo.dev/get-started/set-up-your-environment/)
- Android SDK (for Android builds) or access to Expo Go
- EAS CLI for cloud builds: `bun install -g eas-cli`

### Installation

```bash
# From the monorepo root
bun install

# Or directly in this package
cd apps/mobile
bun install
```

### Development

```bash
# Start the Expo dev server
bun run start

# Run on Android
bun run android

# Run on iOS (requires macOS)
bun run ios
```

### Building with EAS

```bash
# Development build
eas build --profile development

# Preview build (APK)
eas build --profile preview

# Production build
eas build --profile production
```

## Features

- **Chat interface** — Real-time conversation with AI agents via the Happy Vibecode backend
- **Tab navigation** — Four main sections: Chat, Gallery, History, Settings
- **Session management** — View and resume previous agent sessions
- **NativeWind styling** — Tailwind CSS v3 utility classes in React Native
- **Dark theme** — Dark-first design with light mode toggle
- **Prompt presets** — Quick-access prompt templates for common tasks
- **Workspace support** — Switch between configured workspaces
- **Expo Go compatible** — Shims for native modules allow running in Expo Go

## Architecture

The app uses Expo Router with file-based routing and a shim system for native module compatibility.

### Metro Shims

The `shims/` directory provides JavaScript fallbacks for native modules that aren't available in Expo Go:

| Shim                         | Native Module       | Purpose                |
| ---------------------------- | ------------------- | ---------------------- |
| `shims/expo-secure-store.js` | `expo-secure-store` | Token storage fallback |
| `shims/expo-web-browser.js`  | `expo-web-browser`  | OAuth browser fallback |
| `shims/expo-network.js`      | `expo-network`      | Network info fallback  |

These shims are resolved via the Metro config (`metro.config.js`) and allow the app to run in Expo Go without requiring development builds.

### Theme System

Theme persistence is handled via AsyncStorage, defaulting to dark mode. The theme is applied at the root layout level using React Navigation's theme support.

## Project Structure

```
apps/mobile/
├── app/                        # Expo Router file-based routes
│   ├── (tabs)/                 # Tab navigator
│   │   ├── _layout.tsx         # Tab layout (Chat, Gallery, History, Settings)
│   │   ├── index.tsx           # Chat tab (main)
│   │   ├── gallery.tsx         # Gallery tab
│   │   ├── history.tsx         # History tab
│   │   └── settings.tsx        # Settings tab
│   ├── session/
│   │   └── [id].tsx            # Dynamic session detail route
│   ├── _layout.tsx             # Root layout (Stack, GestureHandler, theme)
│   └── index.tsx               # Redirect to /(tabs)
├── assets/                     # App icons (icon.png, icon512x512.png)
├── components/                 # Shared components (placeholder)
├── hooks/
│   ├── useAuth.ts              # Authentication hook
│   ├── usePromptPresets.ts     # Prompt presets hook
│   └── useWorkspaces.ts        # Workspaces hook
├── lib/
│   ├── auth-client.ts          # Better Auth client setup
│   └── scale.ts                # Responsive scaling utility
├── shims/                      # Native module fallbacks for Expo Go
│   ├── expo-network.js
│   ├── expo-secure-store.js
│   └── expo-web-browser.js
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build profiles
├── babel.config.js             # Babel config (nativewind preset)
├── metro.config.js             # Metro bundler config (shims + NativeWind)
├── tailwind.config.js          # Tailwind CSS config
├── global.css                  # Tailwind imports
├── tsconfig.json               # TypeScript config
└── eslint.config.js            # ESLint config
```

## Configuration

### Expo Configuration (`app.json`)

| Field               | Value                   |
| ------------------- | ----------------------- |
| Name                | Happy Vibecode          |
| Slug                | `happy-vibecode`        |
| Version             | `0.0.4`                 |
| Scheme              | `happy-vibecode`        |
| Bundle ID           | `com.happyvibecode.app` |
| Platforms           | Android, Web            |
| Owner               | `involvex`              |
| Android versionCode | 4                       |

### EAS Build Profiles (`eas.json`)

| Profile       | Type               | Distribution | Notes                  |
| ------------- | ------------------ | ------------ | ---------------------- |
| `development` | Development client | Internal     | Includes dev tools     |
| `preview`     | APK                | Internal     | For testing            |
| `production`  | AAB                | Store        | Auto-increment version |

### Environment Variables

| Variable               | Description     | Required |
| ---------------------- | --------------- | -------- |
| `EXPO_PUBLIC_API_URL`  | Backend API URL | Yes      |
| `EXPO_PUBLIC_AUTH_URL` | Better Auth URL | Yes      |

### Plugins

The following Expo plugins are configured in `app.json`:

- `expo-router` — File-based routing
- `expo-secure-store` — Secure token storage
- `expo-font` — Custom font loading
- `expo-dev-client` — Development client support
- `expo-web-browser` — OAuth browser sessions

## Styling

The app uses [NativeWind v4](https://www.nativewind.dev/) which provides Tailwind CSS v3 utility classes for React Native.

### Custom Color Palette

Defined in `tailwind.config.js`:

| Token                | Value     | Usage                    |
| -------------------- | --------- | ------------------------ |
| `primary`            | `#7c3aed` | Brand accent color       |
| `dark.background`    | `#0a0a0f` | Dark mode background     |
| `dark.surface`       | `#141420` | Dark mode card/surface   |
| `dark.surfaceHover`  | `#1e1e2e` | Dark mode hover state    |
| `dark.border`        | `#2a2a3a` | Dark mode borders        |
| `dark.textPrimary`   | `#e4e4e7` | Dark mode primary text   |
| `dark.textSecondary` | `#a1a1aa` | Dark mode secondary text |

### Usage

```tsx
<View className="bg-dark-surface p-4 rounded-lg border border-dark-border">
	<Text className="text-dark-textPrimary text-lg font-bold">Title</Text>
	<Text className="text-dark-textSecondary text-sm">Subtitle</Text>
</View>
```

## Navigation

The app uses [Expo Router](https://docs.expo.dev/router/introduction/) with file-based routing.

### Route Map

| File                      | Route              | Description              |
| ------------------------- | ------------------ | ------------------------ |
| `app/index.tsx`           | `/`                | Redirects to `/(tabs)`   |
| `app/(tabs)/index.tsx`    | `/(tabs)`          | Chat tab (main screen)   |
| `app/(tabs)/gallery.tsx`  | `/(tabs)/gallery`  | Gallery tab              |
| `app/(tabs)/history.tsx`  | `/(tabs)/history`  | History tab              |
| `app/(tabs)/settings.tsx` | `/(tabs)/settings` | Settings tab             |
| `app/session/[id].tsx`    | `/session/:id`     | Session detail (dynamic) |

### Tab Configuration

Tabs are defined in `app/(tabs)/_layout.tsx` with four entries: Chat, Gallery, History, and Settings.

## Authentication

Authentication uses [Better Auth](https://www.better-auth.com/) with the `@better-auth/expo` adapter for React Native compatibility.

The auth client is configured in `lib/auth-client.ts` and provides:

- GitHub OAuth via `expo-web-browser`
- Session management via `expo-secure-store` (or AsyncStorage shim in Expo Go)
- Token persistence across app restarts

## Dependencies

### External

| Package                                     | Version  | Purpose                          |
| ------------------------------------------- | -------- | -------------------------------- |
| `expo`                                      | ^55.0.8  | Expo SDK                         |
| `react`                                     | 19.2.0   | UI framework                     |
| `react-native`                              | 0.83.2   | Native runtime                   |
| `expo-router`                               | ^55.0.7  | File-based routing               |
| `better-auth`                               | ^1.5.6   | Authentication                   |
| `@better-auth/expo`                         | ^1.5.6   | Better Auth React Native adapter |
| `nativewind`                                | ^4.0.36  | Tailwind CSS for React Native    |
| `react-native-reanimated`                   | 4.2.1    | Animations                       |
| `react-native-gesture-handler`              | ~2.30.0  | Gesture handling                 |
| `react-native-screens`                      | ~4.23.0  | Native screen containers         |
| `react-native-safe-area-context`            | ~5.6.2   | Safe area handling               |
| `@react-native-async-storage/async-storage` | ^2.1.2   | Persistent key-value storage     |
| `expo-secure-store`                         | ~55.0.9  | Secure token storage             |
| `expo-dev-client`                           | ~55.0.18 | Development builds               |
| `expo-web-browser`                          | ~55.0.10 | In-app browser for OAuth         |
| `react-native-web`                          | ^0.21.0  | Web platform support             |

### Dev Dependencies

| Package                            | Purpose       |
| ---------------------------------- | ------------- |
| `typescript` ~5.9.2                | Type checking |
| `eslint` ^9 + `eslint-config-expo` | Linting       |

## Scripts

| Script          | Command                                                                         | Description                         |
| --------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `start`         | `expo start`                                                                    | Start Expo dev server               |
| `android`       | `expo run:android`                                                              | Run on Android                      |
| `ios`           | `expo run:ios`                                                                  | Run on iOS                          |
| `check`         | `bun run lint:fix && bun run typecheck && bun run expo:check && bun run doctor` | Full pre-flight check               |
| `lint`          | `eslint .`                                                                      | Lint source files                   |
| `lint:fix`      | `eslint . --fix`                                                                | Lint and auto-fix                   |
| `typecheck`     | `tsc --noEmit`                                                                  | TypeScript type checking            |
| `doctor`        | `bunx expo-doctor --verbose`                                                    | Expo environment diagnostics        |
| `expo:check`    | `bunx expo install --check`                                                     | Check Expo dependency compatibility |
| `version:build` | `expo-version-bump`                                                             | Bump build version                  |
| `version:major` | `expo-version-bump --major`                                                     | Bump major version                  |
| `version:minor` | `expo-version-bump --minor`                                                     | Bump minor version                  |
| `version:patch` | `expo-version-bump --patch`                                                     | Bump patch version                  |

## Examples

### Using the Auth Hook

```tsx
import {useAuth} from '@/hooks/useAuth'

function LoginScreen() {
	const {signIn, signOut, session} = useAuth()

	if (session) {
		return (
			<Button
				onPress={signOut}
				title="Sign Out"
			/>
		)
	}

	return (
		<Button
			onPress={() => signIn('github')}
			title="Sign In with GitHub"
		/>
	)
}
```

### Fetching Workspaces

```tsx
import {useWorkspaces} from '@/hooks/useWorkspaces'

function WorkspaceList() {
	const {workspaces, isLoading} = useWorkspaces()

	if (isLoading) return <ActivityIndicator />

	return (
		<FlatList
			data={workspaces}
			renderItem={({item}) => (
				<Text className="text-dark-textPrimary">{item.name}</Text>
			)}
		/>
	)
}
```

### Navigation to Session Detail

```tsx
import {router} from 'expo-router'

function navigateToSession(sessionId: string) {
	router.push(`/session/${sessionId}`)
}
```

## Troubleshooting

### Native module not available in Expo Go

The app includes shims for `expo-secure-store`, `expo-web-browser`, and `expo-network` that provide fallback behavior in Expo Go. For full functionality, use a development build:

```bash
eas build --profile development
```

### Metro bundler cache issues

Clear the Metro cache:

```bash
bun run start -- --clear-cache
```

### NativeWind styles not applying

Ensure `global.css` is imported in your root layout and that `babel.config.js` includes the `nativewind/babel` preset. Restart the dev server after config changes.

### EAS build failures

Run `bun run doctor` to diagnose environment issues. Ensure your `eas.json` profiles match your target platform (Android requires SDK, iOS requires macOS + Xcode).

### Authentication redirects not working

Verify that the `happy-vibecode` URL scheme is registered in `app.json` and that your OAuth provider's callback URL includes `happy-vibecode://auth/callback`.

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- Follow Expo Router file-based routing conventions in `app/`
- Use NativeWind utility classes for all styling — avoid inline styles
- Test in both Expo Go (with shims) and a development build
- Run `bun run check` before submitting changes
- Keep native module shims up to date if adding new native dependencies

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.
