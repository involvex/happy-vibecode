# Plan: Fix Command-Line Injection & Add Docs Navigation Link

## Context

Two issues to address:

1. **CodeQL security alert** (`js/command-line-injection`): The `runAgent` function in `packages/cli/src/commands/connect.ts` concatenates user-controlled values (prompt, model, agent command) into shell command strings and passes them to `spawn` via a shell (`/bin/sh -c`, `cmd /c`, `powershell -Command`), enabling potential command injection.
2. **Navigation**: Add a link to the documentation site at `https://involvex.github.io/happy-vibecode/` to the web app.

---

## Part 1: Fix Command-Line Injection Vulnerability

### Root Cause

In `packages/cli/src/commands/connect.ts`, the `runAgent` function (lines 188-356) has 4 code paths that all route through a shell with concatenated command strings:

| Lines       | Path                   | Shell                                          | Issue                       |
| ----------- | ---------------------- | ---------------------------------------------- | --------------------------- |
| 229-240     | PowerShell explicit    | `spawn(shell, ['-Command', commandStr])`       | User prompt in shell string |
| 241-249     | cmd.exe explicit       | `spawn(shell, ['/d', '/s', '/c', commandStr])` | User prompt in shell string |
| 250-259     | POSIX shell explicit   | `spawn(shell, ['-c', commandStr])`             | User prompt in shell string |
| **264-281** | **Default (no shell)** | `spawn('cmd', ...)` or `spawn('/bin/sh', ...)` | **Flags 269 and 278**       |

The flagged lines (269, 278) are in the **default path** when no explicit shell is specified. Despite having no shell requirement, the code still routes through a shell — this is unnecessary and creates the injection surface.

### Fix Strategy

For the **default path** (no shell specified): Eliminate the shell entirely. Use direct `spawn(agent.command, fullArgs, {cwd, stdio})` — the canonical safe pattern for child process spawning. The argument array ensures spaces in prompts are handled correctly without shell interpretation.

For **explicit shell paths**: Keep them (user intentionally requested a shell) but add input sanitization to reject arguments containing shell metacharacters that could break out of quoting.

### Changes

#### 1. Default path — eliminate shell (lines 261-283)

**Before:**

```typescript
} else {
    if (process.platform === 'win32') {
        const commandStr = [agent.command, ...fullArgs]
            .map(a => `"${a.replace(/"/g, '""')}"`)
            .join(' ')
        proc = spawn('cmd', ['/d', '/s', '/c', commandStr], {
            cwd: workspace,
            stdio: ['pipe', 'pipe', 'pipe'],
        })
    } else {
        const commandStr = [agent.command, ...fullArgs]
            .map(a => `'${a.replace(/'/g, "'\\''")}'`)
            .join(' ')
        proc = spawn('/bin/sh', ['-c', commandStr], {
            cwd: workspace,
            stdio: ['pipe', 'pipe', 'pipe'],
        })
    }
}
```

**After:**

```typescript
} else {
    // No shell specified — spawn agent directly with argument array.
    // This avoids shell interpretation entirely, preventing command injection
    // and correctly handling prompts with spaces or special characters.
    proc = spawn(agent.command, fullArgs, {
        cwd: workspace,
        stdio: ['pipe', 'pipe', 'pipe'],
    })
}
```

#### 2. Add shell metacharacter validation (new helper function)

Add a validation function used by the explicit shell paths:

```typescript
/** Reject arguments containing shell metacharacters that could break out of quoting */
function validateShellArgs(args: string[]): void {
	// These characters have special meaning in shells and could enable injection
	// when an argument is embedded in a quoted string.
	const SHELL_UNSAFE = /[`\$\\]/ // backtick, dollar-backtick, backslash
	for (const arg of args) {
		if (SHELL_UNSAFE.test(arg)) {
			throw new Error(
				`Argument contains shell metacharacters that cannot be safely escaped. ` +
					`Remove backticks, $(), or backslashes, or run without --shell flag.`,
			)
		}
	}
}
```

Call this at the start of each explicit shell branch (after line 228, before constructing `commandStr`):

```typescript
if (isPs) {
	validateShellArgs([agent.command, ...fullArgs])
	// ... existing PowerShell code
} else if (isCmd) {
	validateShellArgs([agent.command, ...fullArgs])
	// ... existing cmd.exe code
} else {
	validateShellArgs([agent.command, ...fullArgs])
	// ... existing POSIX code
}
```

#### 3. Fix `checkCommandExists` (line 160-170)

**Before:**

```typescript
async function checkCommandExists(command: string): Promise<boolean> {
    const {execSync} = await import('child_process')
    const isWindows = process.platform === 'win32'
    const cmd = isWindows ? `where ${command}` : `which ${command}`
    try {
        execSync(cmd, {stdio: 'ignore'})
```

**After:**

```typescript
async function checkCommandExists(command: string): Promise<boolean> {
    const {execFileSync} = await import('child_process')
    const isWindows = process.platform === 'win32'
    const cmd = isWindows ? 'where' : 'which'
    try {
        execFileSync(cmd, [command], {stdio: 'ignore'})
```

This secondary injection vector is less critical (command names from config) but `execFileSync` is the correct pattern.

### Files Modified

- `packages/cli/src/commands/connect.ts` — lines 160-170, 229-283

### Verification

1. Run `bun run typecheck` to verify TypeScript compiles
2. Run `bun run lint` to verify no lint issues
3. Verify the default spawn path works: `node packages/cli/dist/index.js connect gemini --prompt "hello world"`
4. Verify shell path still works: `node packages/cli/dist/index.js connect gemini --shell bash --prompt "hello world"`
5. Verify shell metacharacter rejection: `node packages/cli/dist/index.js connect gemini --shell bash --prompt 'test $(whoami)'`

---

## Part 2: Add Docs Link to Navigation

### Approach

Add a "Docs" link to the `Footer` component (`apps/web/app/components/Footer.tsx`), which already contains external links (Terms, Privacy, Funding). This is the correct placement since:

- The docs site is external (GitHub Pages), not an in-app route
- Footer links are for informational/legal/external resources
- The Nav component is for in-app navigation only

### Changes

#### Footer component (`apps/web/app/components/Footer.tsx`)

Add a `BookOpenIcon` import and a "Docs" link:

```tsx
import {
    BookOpenIcon,
    PaypalLogoIcon,
} from '@phosphor-icons/react'

// In the footer links section, add after the Funding link:
<span className="mx-1">|</span>
<a
    href="https://involvex.github.io/happy-vibecode/"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline"
>
    <BookOpenIcon size={16} weight="duotone" /> Docs
</a>
```

### Files Modified

- `apps/web/app/components/Footer.tsx` — add import + link

### Verification

1. Run `bun run typecheck` to verify TypeScript compiles
2. Verify the link appears in the footer at `http://localhost:5173`
3. Verify the link opens in a new tab pointing to `https://involvex.github.io/happy-vibecode/`

---

## Execution Order

1. Fix `checkCommandExists` in `connect.ts` (quick, isolated)
2. Add `validateShellArgs` helper to `connect.ts`
3. Refactor default spawn path in `connect.ts` to use direct `spawn`
4. Add `validateShellArgs` calls to explicit shell paths
5. Add Docs link to `Footer.tsx`
6. Run `bun run typecheck && bun run lint`
