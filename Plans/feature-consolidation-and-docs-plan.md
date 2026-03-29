# Plan: Feature Consolidation & Documentation Site

## Context

Two feature suggestion files exist (`feature-suggestion.md` and `feature-suggestion-revised.md`) with overlapping content and outdated statuses. The revised file is more accurate but both need consolidation. Additionally, the project needs a documentation site deployable via GitHub Pages.

Cross-referencing the codebase revealed these corrections to the revised file:

- **#10 Rate Limiting** is FULLY implemented (not "partial") — `packages/api/src/middleware/rate-limit.ts` has per-tier limits, per-endpoint overrides, daily quotas, and is globally mounted
- **#6 GitHub Integration** is more implemented than documented — `GitHubService` (326 lines), `RepoIndexer` (237 lines), `repos.ts` route (284 lines) with full CRUD + indexing
- **#4 Mobile Biometric** is fully implemented — `useBiometric.ts` hook + `BiometricGate.tsx` component + settings toggle

---

## Part 1: Feature Suggestion Consolidation

### Actions

1. **Delete** `feature-suggestion-revised.md` (content merged into consolidated file)
2. **Rewrite** `feature-suggestion.md` as the single consolidated file

### Consolidation Rules

- **Remove completely** features #5 (Analytics Dashboard), #7 (Custom Agent Templates), #10 (Rate Limiting) — all fully implemented, no "Completed" appendix
- **Keep** all remaining features with updated implementation status
- **Merge** the 5 new features (#13-17) from revised file
- **Organize** by priority: High → Medium → Low
- Each feature gets: description, implementation status, acceptance criteria, implementation notes
- Renumber features sequentially 1-14 in the consolidated file

### Final Feature List (organized by priority)

**HIGH PRIORITY:**

1. GitHub Repository Integration (#6) — Partial (repos CRUD done, PR review/code search pending)
2. LLM Provider Configuration (#1) — Partial (schema + settings UI exist, per-session switching pending)
3. Multi-Repo Workspace Composition (#13) — Not started (depends on #6)

**MEDIUM PRIORITY:** 4. Webhook Integration System (#3) — Partial (Stripe webhook exists, no generic framework) 5. Enhanced Mobile App Features (#4) — Partial (biometric + push + offline cache done, full agent control pending) 6. Better Error Handling & Recovery (#12) — Partial (auto-reconnect + retry done, crash recovery pending) 7. Diff-Aware Code Suggestions (#14) — Not started (depends on #6) 8. CI/CD Pipeline Integration (#15) — Not started (depends on #6, #3) 9. Local-First Offline Mode (#16) — Partial (queue table + cache exist, flush logic missing)

**LOW PRIORITY:** 10. Real-Time Collaboration (#2) — Not started 11. Session Recording & Playback (#11) — Partial (message persistence exists, no playback UI) 12. Plugin/Extension System (#8) — Not started 13. Multi-Language Support (#9) — Not started 14. Agent Skill Marketplace (#17) — Not started

---

## Part 2: Documentation Site (`docs/`)

### Architecture Decision

Build a **static HTML/CSS/JS documentation site** (no build toolchain needed) that:

- Deploys to GitHub Pages via GitHub Actions
- Uses vanilla HTML5 + CSS3 + minimal JS (fast loading, zero dependencies)
- Includes Prism.js via CDN for syntax highlighting (single script tag, cached by browser)
- Implements dark/light theme toggle via CSS custom properties + localStorage
- Sidebar navigation with collapsible sections
- Client-side search via JS index
- Fully responsive (mobile-first CSS Grid/Flexbox)
- WCAG 2.1 AA compliant (semantic HTML, ARIA labels, keyboard nav, contrast ratios)

### File Structure

```
docs/
├── index.html                    # Project overview / landing page
├── installation.html             # Installation & setup guide
├── configuration.html            # Configuration reference
├── api-reference.html            # API routes documentation
├── components.html               # Component documentation
├── contributing.html             # Contribution guidelines
├── assets/
│   ├── css/
│   │   └── docs.css              # All styles (responsive, dark/light theme)
│   └── js/
│       ├── docs.js               # Navigation, search, theme toggle
│       └── search-index.js       # Pre-built search index
└── _sidebar.html                 # Shared sidebar (loaded via JS)
```

### Pages & Content Sources

| Page              | Content Source                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Overview**      | Root `README.md`, `CLAUDE.md`, `Agents.md`                                         |
| **Installation**  | Root `README.md` quickstart section, `package.json` scripts                        |
| **Configuration** | `wrangler.jsonc`, `apps/web/worker/index.ts`, `packages/cli/src/config.ts`         |
| **API Reference** | All 18 route files in `packages/api/src/routes/`                                   |
| **Components**    | `apps/web/app/components/`, `apps/mobile/components/`, `packages/shared/src/`      |
| **Contributing**  | `README.md` contributing section, `CLAUDE.md` patterns, `Agents.md` best practices |

### Design Specifications

**CSS Custom Properties (theme):**

```css
:root {
	--bg-primary: #ffffff;
	--bg-secondary: #f8f9fa;
	--bg-sidebar: #f0f2f5;
	--text-primary: #1a1a2e;
	--text-secondary: #4a4a68;
	--accent: #6366f1;
	--accent-hover: #4f46e5;
	--border: #e2e8f0;
	--code-bg: #f1f5f9;
	--shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
[data-theme='dark'] {
	--bg-primary: #0f172a;
	--bg-secondary: #1e293b;
	--bg-sidebar: #1a2332;
	--text-primary: #e2e8f0;
	--text-secondary: #94a3b8;
	--accent: #818cf8;
	--accent-hover: #6366f1;
	--border: #334155;
	--code-bg: #1e293b;
	--shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

**Breakpoints:**

- Mobile: < 768px (sidebar collapses to hamburger menu)
- Tablet: 768px-1024px (sidebar visible, narrower)
- Desktop: > 1024px (full sidebar + content)

**Layout:** CSS Grid with sidebar (250px) + content (1fr) on desktop. Single column on mobile.

**Accessibility:**

- `<nav>` with `aria-label="Documentation navigation"`
- `<main>` with `role="main"`
- Skip-to-content link
- Focus visible outlines on all interactive elements
- Color contrast ratio ≥ 4.5:1 for all text
- Keyboard-navigable sidebar (Tab, Enter, Escape)
- Theme toggle with `aria-label` and `aria-pressed`

### GitHub Actions Workflow

```yaml
# .github/workflows/docs-deploy.yml
name: Deploy Documentation
on:
  push:
    branches: [main]
    paths: ['docs/**']
  workflow_dispatch: # Allow manual trigger

permissions:
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## Execution Order

1. Read all source files needed for documentation content
2. Create `docs/assets/css/docs.css` — full stylesheet with responsive design, dark/light theme
3. Create `docs/assets/js/search-index.js` — pre-built search index from content
4. Create `docs/assets/js/docs.js` — navigation, search, theme toggle logic
5. Create `docs/_sidebar.html` — shared sidebar navigation
6. Create all 6 HTML pages (index, installation, configuration, api-reference, components, contributing)
7. Create `.github/workflows/docs-deploy.yml`
8. Rewrite `feature-suggestion.md` as consolidated file
9. Delete `feature-suggestion-revised.md`
10. Verify all files are valid HTML/CSS/JS

---

## Verification

1. Open `docs/index.html` in browser — verify layout, sidebar, theme toggle, search
2. Test responsive design at 375px, 768px, 1280px widths
3. Test keyboard navigation through sidebar
4. Verify all internal links work
5. Verify search functionality finds content across all pages
6. Verify syntax-highlighted code blocks render correctly
7. Run `bun run lint:fix` and `bun run typecheck` to verify no issues
8. Verify `feature-suggestion.md` has no references to completed features
