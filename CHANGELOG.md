## [0.0.6](https://github.com/involvex/happy-vibecode/compare/v0.0.5...v0.0.6) (2026-04-04)

## [0.0.5](https://github.com/involvex/happy-vibecode/compare/v0.0.4...v0.0.5) (2026-04-03)

### Features

- add code-analyzer agent for comprehensive code quality analysis ([026b073](https://github.com/involvex/happy-vibecode/commit/026b073d155f128caa6be45206fab67d4b6960df))
- **chat:** add file upload and improve session handling ([029c4b9](https://github.com/involvex/happy-vibecode/commit/029c4b97e2c2a355161266e9d66e3e2bf4b4018a))

## [0.0.4](https://github.com/involvex/happy-vibecode/compare/v0.0.3...v0.0.4) (2026-04-03)

### Features

- add agent logs terminal and workspace selector to chat ([22a2519](https://github.com/involvex/happy-vibecode/commit/22a25195d670cc40c755c84de6a7b217cb4f626a))
- add comprehensive Firebase AI Logic integration skill ([9d71d7e](https://github.com/involvex/happy-vibecode/commit/9d71d7ea37884bd9f048b04448294a804da224e1))
- add environment configuration template and setup tooling ([16c2bc1](https://github.com/involvex/happy-vibecode/commit/16c2bc187444255688aefcb5844ce11a2705dac7))
- add interactive stdin input support during agent streaming ([e1a7f5f](https://github.com/involvex/happy-vibecode/commit/e1a7f5f74f264f685c05f25dd3587450feec86c3))
- add multi-model selection and database schema updates ([5e061e6](https://github.com/involvex/happy-vibecode/commit/5e061e619ef18671e5f4d288ece459b092049b28))
- add opencode URL relay to web and mobile clients ([ca59db9](https://github.com/involvex/happy-vibecode/commit/ca59db960fe4e745c10f2f1ee8b49c77dd6d4271))
- **cli:** integrate OpenCode SDK adapter replacing process spawning ([82b6353](https://github.com/involvex/happy-vibecode/commit/82b63536a9541f68121f9412fb844aa62575980c))
- **mobile:** add model settings modal with multi-provider support ([f118d1c](https://github.com/involvex/happy-vibecode/commit/f118d1c2060aca8fc128373437f1788667139f82))
- **mobile:** add UI/UX corrections plan and apply mobile fixes ([ca4f753](https://github.com/involvex/happy-vibecode/commit/ca4f75355f8e1c497ac41b89dec4412fb58fd43f))

### Bug Fixes

- **bridge:** accumulate streamed responses and filter assistant messages ([cb83b22](https://github.com/involvex/happy-vibecode/commit/cb83b22c35074feeb481ac7c9e228c74e12a9aa8))
- **cli:** remove ./ prefix from bin paths in package.json ([2832837](https://github.com/involvex/happy-vibecode/commit/28328376fb2ec47dfe63895355e87ab7b5bbcbe9))
- **cli:** resolve SSE event stream connection in opencode adapter ([4b9d4b7](https://github.com/involvex/happy-vibecode/commit/4b9d4b703cb4632bfe01dfe82eea21f473d995a7))
- improve cross-platform shell command spawning ([b1b7de5](https://github.com/involvex/happy-vibecode/commit/b1b7de51c1533c8d67815f398f517bc5603da04c))

## [0.0.3](https://github.com/involvex/happy-vibecode/compare/v0.0.2...v0.0.3) (2026-03-29)

### Features

- add config and doctor commands with comprehensive CLI tooling ([b974c32](https://github.com/involvex/happy-vibecode/commit/b974c3259dc6b7a68c4199ca2e417306a943b5e2))
- add dark mode support to gallery and history screens ([18c3ec5](https://github.com/involvex/happy-vibecode/commit/18c3ec57a1d89cc26374cd4f3982f1e3fb6c0893))
- add favicon.ico and update worker configuration types ([20bdeb7](https://github.com/involvex/happy-vibecode/commit/20bdeb753b2f78e615be432a97a31f23a2536b75))
- add kilo and cline to provider and session schemas ([a79b485](https://github.com/involvex/happy-vibecode/commit/a79b485b2744588459b16f604ab3c234ffb2004f))
- **mobile:** add profile tab with user info and preferences ([2e01a6b](https://github.com/involvex/happy-vibecode/commit/2e01a6b84eaed4061ebc644b077e539b50c895c0))
- **mobile:** create shared component library (Button, Card, Badge, Input, EmptyState, LoadingSkeleton, Toast, HeaderBar) ([eec0490](https://github.com/involvex/happy-vibecode/commit/eec049053f6c5aafb4baa562e28c07656c80d521))
- **nav, auth, tickets, security:** add responsive nav, user roles, ticket system, and Turnstile protection ([70f931c](https://github.com/involvex/happy-vibecode/commit/70f931c9c481e1a9987576f54cc394dd9d1a81c8))
- **readme:** generate comprehensive README.md files for all packages and apps ([31260bb](https://github.com/involvex/happy-vibecode/commit/31260bbfec437243633032672469202865da9c2a))
- **ui:** add admin dashboard link for admin users in settings ([0695611](https://github.com/involvex/happy-vibecode/commit/0695611d1d6cef07ed27543c847d417356c2354b))
- **web:** add legal pages, footer component, and update branding ([2b3798e](https://github.com/involvex/happy-vibecode/commit/2b3798e528f480693247533250860e5ac6522225))

### Bug Fixes

- add expo-network shim to prevent crashes in Expo Go and existing dev clients ([51bd545](https://github.com/involvex/happy-vibecode/commit/51bd545fdefa0a89b0fb1b643a7a42492a7bff6c))
- add shell option to connect command for cross-platform compatibility ([b860d0d](https://github.com/involvex/happy-vibecode/commit/b860d0dd6437aa1ea820de416079acf180ce6f13))
- add subscription management and Stripe integration ([5282290](https://github.com/involvex/happy-vibecode/commit/5282290d079d0b7b45385a5d6d225be0b0d140b8))
- add token validation for BridgeAgent WebSocket connections ([76d9599](https://github.com/involvex/happy-vibecode/commit/76d9599ca11a083349469d1bea8eb587a009775b))
- improve session loading with error handling and reorder Tailwind classes ([55ce0cb](https://github.com/involvex/happy-vibecode/commit/55ce0cbf6da1a4e8ab73942fd573a8ff47014124))
- **mobile:** redirect expo-network imports to native-module-free shim ([ecf0f65](https://github.com/involvex/happy-vibecode/commit/ecf0f65948f0303b59fbbb7820a3834df48f9cbc))

## [0.0.2](https://github.com/involvex/happy-vibecode/compare/v0.0.1...v0.0.2) (2026-03-26)

### Features

- implement settings and profile pages with password management ([9864a55](https://github.com/involvex/happy-vibecode/commit/9864a55dc38e9e9cc18f342fefaec35e7988e192))

### Bug Fixes

- update eslint-config-expo import to use .js extension ([96ee4e1](https://github.com/involvex/happy-vibecode/commit/96ee4e1c70c3181125f98e799d38be56c2e162ed))

## [0.0.1](https://github.com/involvex/happy-vibecode/compare/be450484989ba1fc5ddc7ac95c5ab696280a90f0...v0.0.1) (2026-03-26)

### Features

- add GitHub Actions workflow for Android APK build and release ([1113e34](https://github.com/involvex/happy-vibecode/commit/1113e3478a9efcdf1a825095ce5c5c8262084800))
- **web:** add Next.js + AI chat agent example with Cloudflare Workers ([be45048](https://github.com/involvex/happy-vibecode/commit/be450484989ba1fc5ddc7ac95c5ab696280a90f0))
