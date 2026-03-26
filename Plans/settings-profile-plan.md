# Implementation Plan: Settings & Profile Pages

## Overview

Add settings and profile management to the web application with email assignment, password management for GitHub users, password change, and user preferences.

---

## 1. Dependencies

### Update `apps/web/package.json`

Add form handling library:

```json
"dependencies": {
  "react-hook-form": "^7.54.0",
  "@hookform/resolvers": "^3.9.0"
}
```

---

## 2. Database Schema Changes

### Modify `packages/db/src/schema.ts`

Add preferences column to users table:

```typescript
export const users = sqliteTable('users', {
	// ... existing fields
	nickname: text('nickname'),
	preferences: text('preferences'), // JSON string: {theme, notifications, language}
})
```

Run migration:

```bash
bun run -F @happy-vibecode/db generate
bun run -F @happy-vibecode/db migrate
```

---

## 3. API Routes (packages/api/src/routes/)

### New: `user.ts` - User profile management

```typescript
// GET /api/user/profile - Get user profile (email, nickname, preferences)
router.get('/profile', requireAuth, async c => {
	// Return user data including nickname, preferences
})

// PUT /api/user/profile - Update nickname and preferences
router.put('/profile', requireAuth, async c => {
	// Accept {nickname?, preferences?: {theme?, notifications?, language?}}
})
```

### New: `password.ts` - Password management

```typescript
// POST /api/password/set - Set password (GitHub users only)
router.post('/set', requireAuth, async c => {
	// Accept {password}, hash with PBKDF2, store in passwordHash
})

// POST /api/password/change - Change existing password
router.post('/change', requireAuth, async c => {
	// Accept {currentPassword, newPassword}, verify current, update hash
})

// POST /api/password/link-email - Link email to GitHub account
router.post('/link-email', requireAuth, async c => {
	// Accept {email}, send verification, link to githubId user
})
```

### Modify: `auth.ts` - Add password verification

```typescript
// Add login with password
router.post('/login', async c => {
	// Accept {email, password}, verify hash, return token
})
```

### Password hashing (Web Crypto API PBKDF2)

Create utility in `packages/shared/src/crypto.ts`:

- `hashPassword(password: string): Promise<string>` - PBKDF2-SHA256
- `verifyPassword(password: string, hash: string): Promise<boolean>`

---

## 4. Shared Types

### Extend `packages/shared/src/schema/user.ts`

```typescript
export const userPreferencesSchema = z.object({
	theme: z.enum(['light', 'dark', 'system']).default('system'),
	notifications: z.boolean().default(true),
	language: z.string().default('en'),
})

export const updateProfileSchema = z.object({
	nickname: z.string().min(1).max(50).optional(),
	preferences: userPreferencesSchema.optional(),
})

export const setPasswordSchema = z.object({
	password: z.string().min(8).max(100),
})

export const changePasswordSchema = z.object({
	currentPassword: z.string(),
	newPassword: z.string().min(8).max(100),
})

export const linkEmailSchema = z.object({
	email: z.string().email(),
})
```

---

## 5. Frontend Pages

### Modify `apps/web/app/settings/page.tsx`

Add sections:

**A. Email Assignment Section**

- Form with email input
- Only show for users with `githubId` and no `email`
- Send verification link
- Success/error feedback

**B. Password Management Section**

- Only show for users with `githubId` (GitHub sign-in users)
- "Set Password" button → modal with password input
- Password requirements: min 8 chars
- Success/error feedback

**C. Password Change Section**

- Only show for users with existing `passwordHash`
- Form with: current password, new password, confirm password
- Validate current password
- Show/hide password toggles
- Success/error feedback

### New: `apps/web/app/profile/page.tsx`

```typescript
// Sections:
// 1. Nickname - text input, max 50 chars
// 2. Preferences:
//    - Theme: radio/dropdown (light/dark/system)
//    - Notifications: toggle switch
//    - Language: dropdown (en, es, fr, etc.)
// 3. Save button with loading state
// 4. Success/error toast notifications
```

### Update `apps/web/app/hooks/useAuth.ts`

Add user data to auth state:

```typescript
interface AuthState {
	apiToken: string | null
	userId: string | null
	email: string | null
	nickname: string | null
	preferences: UserPreferences | null
	serverUrl: string
	isLoaded: boolean
}
```

Add `refreshUser()` method to fetch updated profile.

---

## 6. Navigation

### Update `apps/web/app/components/Nav.tsx`

Add Profile link alongside Settings:

```tsx
<Link href="/profile" className={...}>
  <UserIcon /> Profile
</Link>
```

---

## 7. Form Validation & UX

### Client-side validation (react-hook-form + zod)

- Email format validation
- Password strength: min 8 chars
- Confirm password match
- Required field validation

### User feedback

- Loading states on buttons (disabled + spinner)
- Inline validation errors (red text below inputs)
- Success toasts/messages (green)
- Error messages (red, with try-again)

### Accessibility

- Proper labels and aria-describedby for errors
- Keyboard navigation
- Focus management on modals

---

## Implementation Order

1. **Shared crypto utils** - password hashing
2. **Shared schemas** - extend user types
3. **Database migration** - add columns
4. **API routes** - user, password endpoints
5. **Frontend hook** - update useAuth
6. **Settings page** - add email/password sections
7. **Profile page** - new page with preferences
8. **Navigation** - add profile link

---

## Testing

Run after implementation:

```bash
bun run typecheck
bun run lint:fix
```
