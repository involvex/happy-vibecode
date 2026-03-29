/* Pre-built search index for client-side search */
window.DOCS_SEARCH_INDEX = [
	{
		title: 'Project Overview',
		url: 'index.html',
		content:
			'Happy Vibecode is a platform for running AI coding agents with remote control via web and mobile. Built on Cloudflare Workers with vinext Agents SDK and modern React. Monorepo containing web app mobile app API database and CLI components.',
	},
	{
		title: 'Architecture',
		url: 'index.html#architecture',
		content:
			'Monorepo layout apps web Next.js on vinext Cloudflare Workers apps mobile Expo React Native packages API Hono routes packages DB Drizzle ORM D1 schemas packages shared types and Zod schemas packages CLI developer CLI tools.',
	},
	{
		title: 'Technologies',
		url: 'index.html#technologies',
		content:
			'Runtime Bun 1.3.x Frontend React 19 Next.js 16 vinext Tailwind CSS v4 Backend Cloudflare Workers Hono vinext AI Agents SDK Workers AI Database D1 SQLite Drizzle ORM Storage Cloudflare KV Durable Objects Deployment Wrangler.',
	},
	{
		title: 'Installation',
		url: 'installation.html',
		content:
			'Install dependencies with bun install. Prerequisites Node.js >= 18 Bun 1.3.x package manager. Clone repository git clone. Quick start guide setup development environment.',
	},
	{
		title: 'Development Commands',
		url: 'installation.html#development-commands',
		content:
			'bun install bun run dev bun run dev:web bun run build bun run build:web bun run typecheck bun run test bun run lint bun run lint:fix bun run format deploy web app.',
	},
	{
		title: 'Configuration',
		url: 'configuration.html',
		content:
			'Wrangler configuration wrangler.jsonc D1 database KV namespace Durable Objects bindings BridgeAgent Cloudflare Workers environment variables secrets AUTH_GITHUB_ID AUTH_GITHUB_SECRET BETTER_AUTH_SECRET STRIPE_API_KEY.',
	},
	{
		title: 'D1 Database',
		url: 'configuration.html#d1-database',
		content:
			'D1 SQLite database binding DB database_name happy-vibecode-db migrations_dir packages/db/drizzle Drizzle ORM schemas Drizzle configuration drizzle.config.ts.',
	},
	{
		title: 'Durable Objects',
		url: 'configuration.html#durable-objects',
		content:
			'BridgeAgent Durable Object class WebSocket routing agents BridgeAgent roomId state management SQLite storage RPC methods callable.',
	},
	{
		title: 'Environment Variables',
		url: 'configuration.html#environment-variables',
		content:
			'AUTH_GITHUB_ID AUTH_GITHUB_SECRET BETTER_AUTH_SECRET STRIPE_API_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRO_PRICE_ID TURNSTILE_SITE_KEY TURNSTILE_SECRET_KEY secrets configuration.',
	},
	{
		title: 'API Reference',
		url: 'api-reference.html',
		content:
			'API routes Hono framework mounted at /api endpoints authentication billing sessions devices user workspaces agents bridge tickets notifications templates sync repos admin users roles analytics audit agents.',
	},
	{
		title: 'Auth API',
		url: 'api-reference.html#auth',
		content:
			'Authentication endpoints POST /api/auth login register session management OAuth GitHub Better Auth integration token validation Bearer token authorization header.',
	},
	{
		title: 'Sessions API',
		url: 'api-reference.html#sessions',
		content:
			'Agent session management GET /api/sessions list sessions POST /api/sessions create session GET /api/sessions/:id get session details GET /api/sessions/:id/messages message history PATCH /api/sessions/:id/status update status PATCH /api/sessions/:id/control agent control.',
	},
	{
		title: 'Agents API',
		url: 'api-reference.html#agents',
		content:
			'Agent CRUD operations GET /api/agents list active agents POST /api/agents create agent admin only PUT /api/agents/:id update agent DELETE /api/agents/:id delete agent command args promptFlag modelFlag.',
	},
	{
		title: 'Billing API',
		url: 'api-reference.html#billing',
		content:
			'Stripe billing integration POST /api/billing/checkout-session create checkout POST /api/billing/webhook Stripe webhook handler subscription management Pro tier free tier planTier subscriptionStatus.',
	},
	{
		title: 'Repos API',
		url: 'api-reference.html#repos',
		content:
			'GitHub repository integration GET /api/repos list linked repos POST /api/repos link repository DELETE /api/repos/:id unlink GET /api/repos/available user GitHub repos POST /api/repos/:id/sync sync repo POST /api/repos/:id/index index repo GET /api/repos/:id/tree repo tree GET /api/repos/:id/files file content GET /api/repos/:id/search code search.',
	},
	{
		title: 'Workspaces API',
		url: 'api-reference.html#workspaces',
		content:
			'Workspace management CRUD operations GET /api/workspaces list workspaces POST /api/workspaces create workspace defaultProvider defaultModel PUT /api/workspaces/:id update DELETE /api/workspaces/:id delete POST /api/workspaces/:id/activate set active workspace.',
	},
	{
		title: 'Templates API',
		url: 'api-reference.html#templates',
		content:
			'Agent template CRUD versioned templates GET /api/templates list templates POST /api/templates create template GET /api/templates/:id template details PUT /api/templates/:id update DELETE /api/templates/:id delete POST /api/templates/:id/versions add version POST /api/templates/:id/instantiate create session from template PATCH /api/templates/:id/share toggle public private POST /api/templates/:id/duplicate.',
	},
	{
		title: 'Components',
		url: 'components.html',
		content:
			'Web components Nav Footer Toast ConfirmModal LoadingSkeletons StatCard WorkspaceSelector AdminSidebar AdminBreadcrumb DataTable DateRangePicker ExportButton RoleForm UserForm. Mobile components AgentControls Badge BiometricGate Button Card EmptyState HeaderBar Input LoadingSkeleton OfflineBanner TemplateForm Toast.',
	},
	{
		title: 'Database Schema',
		url: 'components.html#database-schema',
		content:
			'Drizzle ORM schema tables users workspaces agentSessions messageLogs deviceTokens tickets ticketResponses roles auditLogs agents authUser authSession authAccount authVerification agentTemplates agentTemplateVersions notificationPreferences offlineSyncQueue linkedRepos repoFiles repoEmbeddings.',
	},
	{
		title: 'Contributing',
		url: 'contributing.html',
		content:
			'Contribution guidelines coding standards TypeScript strict mode Prettier formatting oxlint path aliases feature branches conventional commits testing requirements pull request process code review.',
	},
	{
		title: 'Code Standards',
		url: 'contributing.html#code-standards',
		content:
			'TypeScript strict mode no any types Prettier @involvex/prettier-config oxlint path aliases @happy-vibecode workspace packages run format before committing.',
	},
	{
		title: 'Database Migrations',
		url: 'contributing.html#database-migrations',
		content:
			'Drizzle ORM migrations modify schema.ts bun run generate migration review migration file bun run migrate apply locally update wrangler.jsonc for new bindings.',
	},
	{
		title: 'CLI Commands',
		url: 'installation.html#cli',
		content:
			'CLI developer commands login whoami status config doctor init workspace connect. Build CLI bun run build:cli node dist/index.js command.',
	},
	{
		title: 'Deployment',
		url: 'installation.html#deployment',
		content:
			'Deploy to Cloudflare Workers bun run deploy:web wrangler deploy wrangler types generation Vite build. GitHub Pages documentation deployment.',
	},
	{
		title: 'Rate Limiting',
		url: 'api-reference.html#rate-limiting',
		content:
			'Rate limiting middleware per-tier limits Free 30 requests per minute Pro 120 requests per minute daily quotas Free 500 per day Pro 5000 per day KV-backed sliding window X-RateLimit headers 429 status code.',
	},
]
