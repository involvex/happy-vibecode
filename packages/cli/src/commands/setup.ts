import {
	detectPrereqs,
	getInstallHint,
	getPrereqSummary,
} from '../utils/prereqs.js'
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {envFileToString} from '../utils/env-validator.js'
import {execSync, spawnSync} from 'node:child_process'
import * as clack from '@clack/prompts'
import {join, resolve} from 'node:path'
import {Command} from 'commander'
import {homedir} from 'node:os'

const REPO_ROOT = resolve(import.meta.dirname, '../../../../')
const WRANGLER_CONFIG = join(REPO_ROOT, 'apps', 'web', 'wrangler.jsonc')
const ENV_FILE = join(REPO_ROOT, 'apps', 'web', '.env')

function tryExec(cmd: string): string | undefined {
	try {
		return execSync(cmd, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: 10_000,
		}).trim()
	} catch {
		return undefined
	}
}

function patchWranglerConfig(d1Id: string, kvId: string): boolean {
	try {
		if (!existsSync(WRANGLER_CONFIG)) return false
		let content = readFileSync(WRANGLER_CONFIG, 'utf8')
		// Replace D1 database_id placeholder or existing value
		content = content.replace(/(database_id\s*:\s*)"[^"]*"/, `$1"${d1Id}"`)
		// Replace KV id placeholder or existing value
		content = content.replace(/(id\s*:\s*)"[^"]*"/, `$1"${kvId}"`)
		writeFileSync(WRANGLER_CONFIG, content, 'utf8')
		return true
	} catch {
		return false
	}
}

function isFirstRun(): boolean {
	const configPath = join(homedir(), '.happy', 'config.json')
	return !existsSync(configPath)
}

export async function runSetupWizard(): Promise<void> {
	clack.intro('🎉  Happy Vibecode — Setup Wizard')
	clack.log.message('This wizard will configure your development environment.')

	if (!isFirstRun()) {
		const rerun = await clack.confirm({
			message: 'An existing config was found. Re-run setup anyway?',
			initialValue: false,
		})
		if (clack.isCancel(rerun) || !rerun) {
			clack.outro(
				'Setup cancelled. Run `happy-vibecode doctor` to check your env.',
			)
			return
		}
	}

	// ── Step 1: Prerequisite check ──────────────────────────────────────────
	clack.log.step('Checking prerequisites…')
	const prereqs = await detectPrereqs()
	const {allRequiredOk, issues} = getPrereqSummary(prereqs)

	for (const p of prereqs) {
		const ok = p.installed && p.versionOk
		const icon = ok ? '✅' : p.required ? '❌' : '⚠️'
		const label = p.version ? `${p.displayName} v${p.version}` : p.displayName
		const hint = ok ? '' : `  →  ${getInstallHint(p)}`
		clack.log.message(`  ${icon}  ${label}${hint}`)
	}

	if (!allRequiredOk) {
		const proceed = await clack.confirm({
			message: `${issues.filter(i => i.required).length} required tool(s) missing. Continue anyway?`,
			initialValue: false,
		})
		if (clack.isCancel(proceed) || !proceed) {
			clack.cancel('Please install the missing tools and re-run setup.')
			process.exit(1)
		}
	}

	// ── Step 2: GitHub OAuth App ─────────────────────────────────────────────
	clack.log.step('GitHub OAuth App')
	clack.log.message(
		[
			'  Create an OAuth App at: https://github.com/settings/applications/new',
			'  Homepage URL:  (your Worker URL)',
			'  Callback URL:  <homepage>/api/auth/callback/github',
		].join('\n'),
	)

	const githubId = await clack.text({
		message: 'GitHub OAuth App Client ID:',
		placeholder: 'Ov23liOufGcx2MYgoM0v',
		validate: v => (!v ? 'Client ID is required' : undefined),
	})
	if (clack.isCancel(githubId)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	const githubSecret = await clack.password({
		message: 'GitHub OAuth App Client Secret:',
		validate: v => (!v ? 'Client Secret is required' : undefined),
	})
	if (clack.isCancel(githubSecret)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	// ── Step 3: Better Auth secret ───────────────────────────────────────────
	const betterAuthSecret = await clack.text({
		message: 'Better Auth secret (min 32 chars, or press Enter to generate):',
		defaultValue: '',
		placeholder: 'leave blank to auto-generate',
	})
	if (clack.isCancel(betterAuthSecret)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}
	const finalAuthSecret =
		betterAuthSecret && betterAuthSecret.length >= 32
			? betterAuthSecret
			: (() => {
					const gen = tryExec('openssl rand -hex 32')
					if (gen) {
						clack.log.success(`Generated: ${gen}`)
						return gen
					}
					// Fallback: JS random
					const arr = new Uint8Array(32)
					crypto.getRandomValues(arr)
					const generated = Array.from(arr)
						.map(b => b.toString(16).padStart(2, '0'))
						.join('')
					clack.log.success(`Generated: ${generated}`)
					return generated
				})()

	// ── Step 4: Worker URL ───────────────────────────────────────────────────
	const workerUrl = await clack.text({
		message: 'Your Worker URL (or http://localhost:8787 for local dev):',
		defaultValue: 'https://happy-vibecode.your-domain.workers.dev',
		placeholder: 'https://happy-vibecode.your-domain.workers.dev',
	})
	if (clack.isCancel(workerUrl)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	// ── Step 5: Cloudflare Account ID ────────────────────────────────────────
	clack.log.step('Cloudflare configuration')

	let cfAccountId = tryExec(
		'wrangler whoami 2>/dev/null | grep "Account ID" | head -1 | awk \'{print $NF}\'',
	)
	if (!cfAccountId || cfAccountId.length !== 32) {
		cfAccountId = undefined
	}

	const accountIdInput = await clack.text({
		message: 'Cloudflare Account ID (32 hex chars):',
		defaultValue: cfAccountId ?? '',
		placeholder: cfAccountId ?? 'find at https://dash.cloudflare.com/profile',
	})
	if (clack.isCancel(accountIdInput)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	const cfApiToken = await clack.password({
		message:
			'Cloudflare API Token (Workers/D1/KV edit access)\n  Create at https://dash.cloudflare.com/profile/api-tokens:',
		validate: v => (!v ? 'API Token is required' : undefined),
	})
	if (clack.isCancel(cfApiToken)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	// ── Step 6: D1 Database ──────────────────────────────────────────────────
	clack.log.step('D1 Database')
	const createD1 = await clack.confirm({
		message: 'Create a new D1 database with Wrangler?',
		initialValue: true,
	})
	if (clack.isCancel(createD1)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	let d1DatabaseId = ''
	if (createD1) {
		const s = clack.spinner()
		s.start('Creating D1 database "happy-vibecode-db"…')
		const out = tryExec('wrangler d1 create happy-vibecode-db 2>&1')
		s.stop()
		const parsed = out?.match(/database_id\s*=\s*"([^"]+)"/)?.[1]
		if (parsed) {
			d1DatabaseId = parsed
			clack.log.success(`Database created: ${d1DatabaseId}`)
		} else {
			clack.log.warn(
				'Could not auto-parse D1 ID. You can enter it manually below.',
			)
		}
	}

	if (!d1DatabaseId) {
		const d1Input = await clack.text({
			message: 'D1 Database ID (UUID):',
			placeholder: '2c49dfdf-ec4a-408c-b101-4793a1405cc3',
			validate: v =>
				!v || v.length < 10 ? 'Please enter a valid D1 database ID' : undefined,
		})
		if (clack.isCancel(d1Input)) {
			clack.cancel('Setup cancelled.')
			process.exit(0)
		}
		d1DatabaseId = d1Input
	}

	// ── Step 7: KV Namespace ─────────────────────────────────────────────────
	clack.log.step('KV Namespace')
	const createKv = await clack.confirm({
		message: 'Create a new KV namespace with Wrangler?',
		initialValue: true,
	})
	if (clack.isCancel(createKv)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	let kvId = ''
	if (createKv) {
		const s = clack.spinner()
		s.start('Creating KV namespace "happy-vibecode-kv"…')
		const out = tryExec('wrangler kv namespace create happy-vibecode-kv 2>&1')
		s.stop()
		const parsed = out?.match(/id\s*=\s*"([^"]+)"/)?.[1]
		if (parsed) {
			kvId = parsed
			clack.log.success(`KV namespace created: ${kvId}`)
		} else {
			clack.log.warn(
				'Could not auto-parse KV ID. You can enter it manually below.',
			)
		}
	}

	if (!kvId) {
		const kvInput = await clack.text({
			message: 'KV Namespace ID:',
			placeholder: 'ba4e9794ba604de08ce3ceaf4ac3719f',
			validate: v =>
				!v || v.length < 10
					? 'Please enter a valid KV namespace ID'
					: undefined,
		})
		if (clack.isCancel(kvInput)) {
			clack.cancel('Setup cancelled.')
			process.exit(0)
		}
		kvId = kvInput
	}

	// ── Step 8: Stripe (optional) ─────────────────────────────────────────────
	clack.log.step('Stripe (optional — skip for local dev)')
	const useStripe = await clack.confirm({
		message: 'Configure Stripe payment keys?',
		initialValue: false,
	})
	if (clack.isCancel(useStripe)) {
		clack.cancel('Setup cancelled.')
		process.exit(0)
	}

	let stripeSecretKey = ''
	let stripeWebhookSecret = ''
	let stripePriceId = ''

	if (useStripe) {
		const sk = await clack.password({
			message: 'Stripe Secret Key (sk_test_... or sk_live_...):',
		})
		if (!clack.isCancel(sk)) stripeSecretKey = sk
		const wh = await clack.password({
			message: 'Stripe Webhook Secret (whsec_...):',
		})
		if (!clack.isCancel(wh)) stripeWebhookSecret = wh
		const pr = await clack.text({
			message: 'Stripe Price ID (price_...):',
			placeholder: 'price_xxx',
		})
		if (!clack.isCancel(pr)) stripePriceId = pr
	}

	// ── Step 9: Write .env file ───────────────────────────────────────────────
	clack.log.step('Writing .env file…')

	if (existsSync(ENV_FILE)) {
		const overwrite = await clack.confirm({
			message: `${ENV_FILE} already exists. Overwrite?`,
			initialValue: false,
		})
		if (clack.isCancel(overwrite) || !overwrite) {
			clack.log.warn('Skipped writing .env file.')
		}
	}

	const envValues = new Map<string, string>([
		['AUTH_GITHUB_ID', githubId],
		['AUTH_GITHUB_SECRET', githubSecret],
		['BETTER_AUTH_SECRET', finalAuthSecret],
		['BETTER_AUTH_URL', workerUrl as string],
		['CLOUDFLARE_ACCOUNT_ID', accountIdInput as string],
		['CLOUDFLARE_API_TOKEN', cfApiToken],
		['STRIPE_SECRET_KEY', stripeSecretKey],
		['STRIPE_WEBHOOK_SECRET', stripeWebhookSecret],
		['STRIPE_PRICE_ID', stripePriceId],
		['TURNSTILE_SECRET_KEY', ''],
	])
	writeFileSync(ENV_FILE, envFileToString(envValues), 'utf8')
	clack.log.success(`.env written to ${ENV_FILE}`)

	// ── Step 10: Patch wrangler.jsonc ─────────────────────────────────────────
	if (d1DatabaseId && kvId) {
		const patched = patchWranglerConfig(d1DatabaseId, kvId)
		if (patched) {
			clack.log.success(`wrangler.jsonc patched with D1 + KV IDs`)
		} else {
			clack.log.warn(
				`Could not patch ${WRANGLER_CONFIG} — update d1.database_id and kv.id manually.`,
			)
		}
	}

	// ── Step 11: Run D1 migrations ────────────────────────────────────────────
	const runMigrations = await clack.confirm({
		message: 'Run D1 migrations now?',
		initialValue: true,
	})
	if (!clack.isCancel(runMigrations) && runMigrations) {
		const s = clack.spinner()
		s.start('Applying D1 migrations…')
		const out = tryExec(
			`wrangler d1 migrations apply happy-vibecode-db --local 2>&1`,
		)
		s.stop()
		if (out) {
			clack.log.info(out.slice(0, 300))
		}
		clack.log.success(
			'Migrations applied (local). Re-run without --local for production.',
		)
	}

	// ── Step 12: Optional deploy ──────────────────────────────────────────────
	const doDeploy = await clack.confirm({
		message: 'Deploy the Worker to Cloudflare now?',
		initialValue: false,
	})
	if (!clack.isCancel(doDeploy) && doDeploy) {
		clack.log.step('Deploying…')
		const result = spawnSync('bun', ['run', 'deploy:web'], {
			cwd: REPO_ROOT,
			stdio: 'inherit',
			shell: true,
		})
		if (result.status === 0) {
			clack.log.success('Deployed successfully! 🚀')
		} else {
			clack.log.error('Deploy failed. Check the output above.')
		}
	}

	clack.outro(
		'✅  Setup complete!\n\nNext steps:\n  • Run `happy-vibecode doctor` to verify everything\n  • Run `happy-vibecode connect <provider>` to start an agent session',
	)
}

export const setupCommand = new Command('setup')
	.description('Interactive wizard to set up your Happy Vibecode environment')
	.option('--skip-prereqs', 'Skip prerequisite checks')
	.action(async () => {
		await runSetupWizard()
	})
