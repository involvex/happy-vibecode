# Mobile App UI/UX Audit & Fix Plan

## Summary

A comprehensive audit of all mobile app screens and components identified **28 specific issues** across typography, color consistency, spacing, alignment, component reuse, and accessibility. The fixes below include exact Tailwind class changes and hardcoded value replacements.

---

## 1. Typography Issues (7 issues)

### T1: Page header font size inconsistency

- **Files**: `gallery.tsx:69`, `history.tsx:95`, `profile.tsx:186`, `settings.tsx:220`, `templates/index.tsx:79`
- **Current**: `text-lg font-semibold` — varies across screens
- **Fix**: Standardize all page headers to `text-xl font-bold` for clear hierarchy
- **Why**: `text-lg` (18px) is too close to card section headers (`text-base` 16px). `text-xl` (20px) with `font-bold` creates proper visual separation.

### T2: Card section headers lack explicit size

- **Files**: `profile.tsx:205,230,270,330` (Nickname, Theme, Notifications, Subscription sections)
- **Current**: `font-semibold text-text dark:text-text-dark` (no size class = defaults to `text-base` 16px)
- **Fix**: `text-base font-semibold text-text dark:text-text-dark`
- **Why**: Explicit sizing is better than relying on defaults; makes intent clear.

### T3: Session detail header missing font size

- **File**: `session/[id].tsx:187`
- **Current**: `className="text-text dark:text-text-dark font-semibold"`
- **Fix**: `className="text-base font-semibold text-text dark:text-text-dark"`
- **Why**: Missing explicit size — should be `text-base` (16px) for a session title in a header.

### T4: Settings section headers too small

- **Files**: `settings.tsx:267,293,351,377,456,478,606,635`
- **Current**: `text-sm uppercase tracking-wide` for "Appearance", "Security", "Templates", etc.
- **Fix**: `text-xs font-bold uppercase tracking-widest text-muted dark:text-muted-dark`
- **Why**: Section labels should be visually distinct from content. `text-xs` + `font-bold` + `tracking-widest` follows iOS/Android convention for section headers (small, uppercase, spaced out, muted color).

### T5: Body text size inconsistency

- **Files**: Multiple across all screens
- **Current**: Mix of `text-sm` and no size class for body-level content
- **Fix**: Standardize body text to `text-sm` consistently. Reserve `text-base` for emphasized content only.
- **Why**: Most mobile apps use 14-15px for body text. `text-sm` (14px) is appropriate.

### T6: Gallery empty state text lacks size

- **File**: `gallery.tsx:59,88`
- **Current**: `text-muted dark:text-muted-dark text-center px-6` (no size)
- **Fix**: `text-sm text-muted dark:text-muted-dark text-center px-6`
- **Why**: Empty state body text should be `text-sm`, not default `text-base`.

### T7: History empty state text lacks size

- **File**: `history.tsx:85,120`
- **Current**: `text-muted dark:text-muted-dark text-center` (no size)
- **Fix**: `text-sm text-muted dark:text-muted-dark text-center`

---

## 2. Color & Theme Consistency (8 issues)

### C1: Switch track color uses blue instead of primary purple

- **Files**: `profile.tsx:284`, `settings.tsx:285,314`
- **Current**: `trackColor={{false: '#e2e8f0', true: '#3b82f6'}}`
- **Fix**: `trackColor={{false: isDark ? '#2a2a4a' : '#e2e8f0', true: '#7c3aed'}}`
- **Why**: Primary brand color is purple `#7c3aed`, not blue. Also adds dark mode support for the false state.

### C2: Blue icon for Pro subscription badge

- **File**: `profile.tsx:367`
- **Current**: `<Ionicons name="flash-outline" size={16} color="#3b82f6" />`
- **Fix**: `<Ionicons name="flash-outline" size={16} color="#7c3aed" />`
- **Why**: Should use primary purple, not blue.

### C3: Blue checkmark icon for active workspace

- **File**: `settings.tsx:722,765`
- **Current**: `color="#3b82f6"` for checkmark-circle icon
- **Fix**: `color="#7c3aed"`
- **Why**: Brand consistency — active/selected state should use primary purple.

### C4: Blue Switch track in dark mode shows wrong false color

- **Files**: `profile.tsx:284`, `settings.tsx:285,314`
- **Current**: `trackColor={{false: '#e2e8f0'}}` — white-ish in dark mode looks wrong
- **Fix**: Use `isDark ? '#2a2a4a' : '#e2e8f0'` for false track color
- **Why**: Light gray `#e2e8f0` on dark background is jarring. Dark mode track should use `#2a2a4a`.

### C5: Session `[id].tsx` system messages use inconsistent background

- **File**: `session/[id].tsx:223`
- **Current**: `self-center bg-border dark:bg-border-dark` for system messages
- **Fix**: `self-center bg-warning/20 border border-warning/30` (match `index.tsx:440`)
- **Why**: Same message type should look the same across screens. The chat tab uses warning-tinted background for system messages.

### C6: Session `[id].tsx` message text missing size/leading

- **File**: `session/[id].tsx:228-231`
- **Current**: No `text-sm leading-5` on message text
- **Fix**: Add `text-sm leading-5` to match chat tab (`index.tsx:451-453`)
- **Why**: Message bubbles should have consistent text sizing and line height.

### C7: Session `[id].tsx` message max-width differs from chat tab

- **File**: `session/[id].tsx:219`
- **Current**: `max-w-[80%]`
- **Fix**: `max-w-[85%]` (match `index.tsx:436`)
- **Why**: Consistent bubble width across chat interfaces.

### C8: Typing indicator hardcoded colors not matching theme tokens

- **File**: `index.tsx:73,93-95`
- **Current**: Hardcoded `#94a3b8`, `#64748b`, `#16213e`, `#2a2a4a`, `#e2e8f0`, `#ffffff`
- **Fix**: These ARE the correct token values from `tailwind.config.js` — acceptable since Animated styles can't use className. No change needed, but document this.

---

## 3. Spacing Issues (4 issues)

### S1: Tab bar height too small

- **File**: `(tabs)/_layout.tsx:24`
- **Current**: `height: 60, paddingBottom: 8`
- **Fix**: `height: 64, paddingBottom: 12`
- **Why**: iOS HIG recommends 49pt minimum tab bar height; with safe area + padding, 60pt leaves only ~44pt for touch targets. 64pt with 12pt bottom padding provides better touch area.

### S2: Chat input bar has no max height constraint

- **Files**: `index.tsx:508`, `session/[id].tsx:264`
- **Current**: `multiline` TextInput with no height limit
- **Fix**: Add `style={{maxHeight: 120}}` to the TextInput
- **Why**: Multiline input can grow indefinitely, pushing the send button off-screen.

### S3: Profile save button lacks top margin

- **File**: `profile.tsx:395-404`
- **Current**: Save button follows directly after subscription card
- **Fix**: Wrap in `<View className="mt-2">` or add `mt-2` to the existing `className`
- **Why**: Visual separation between the last card section and the primary action button.

### S4: Preset chips area `max-h-12` may clip content

- **File**: `index.tsx:485`
- **Current**: `max-h-12` (48px) with `paddingVertical: 8` inside
- **Fix**: `max-h-14` (56px)
- **Why**: 48px max height with 16px vertical padding leaves only 32px for content. On some devices the text may clip.

---

## 4. Alignment Issues (3 issues)

### A1: Inconsistent header structure — Gallery/History lack subtitle on empty state

- **Files**: `gallery.tsx`, `history.tsx`
- **Current**: Gallery has subtitle "Your active sessions" in header; History does not
- **Fix**: Add subtitle to History header:
  ```tsx
  <Text className="text-muted dark:text-muted-dark text-xs mt-0.5">
  	Past sessions
  </Text>
  ```

### A2: Send button icon inconsistency

- **File**: `index.tsx:525` vs `session/[id].tsx:279`
- **Current**: Chat tab uses `<Text className="text-base text-white">↑</Text>` (unicode arrow), session uses `<Ionicons name="arrow-up" size={18} color="white" />`
- **Fix**: Replace unicode arrow in `index.tsx:525` with:
  ```tsx
  <Ionicons name="arrow-up" size={18} color="white" />
  ```
- **Why**: Unicode arrow renders differently across platforms. Ionicons is consistent and already used elsewhere.

### A3: Card component not used consistently

- **Files**: `profile.tsx`, `settings.tsx`, `gallery.tsx`
- **Current**: Cards are built inline with `View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-4"` instead of using the `Card` component
- **Fix**: This is a larger refactor — document for future improvement. The `Card` component exists at `components/Card.tsx` but is not imported in any screen file.

---

## 5. Accessibility Issues (3 issues)

### AC1: Touch targets too small

- **Files**: `index.tsx:404` (Unpair button), `profile.tsx` (language chips)
- **Current**: "Unpair" is `text-xs` with no padding. Language chips are `px-4 py-2`.
- **Fix**: Unpair button: add `px-3 py-2` minimum padding. Language chips: increase to `px-4 py-2.5`.
- **Why**: Apple HIG and Material Design require 44x44dp minimum touch targets.

### AC2: Missing accessibility labels

- **Files**: `index.tsx:404` (Unpair), `index.tsx:518-526` (Send button), `profile.tsx:239-257` (Theme selectors), `profile.tsx:303-322` (Language selectors)
- **Fix**: Add `accessibilityLabel` props to all interactive elements:
  - Unpair: `accessibilityLabel="Disconnect from CLI bridge"`
  - Send: `accessibilityLabel="Send message"`
  - Theme selectors: `accessibilityLabel={t === 'light' ? 'Light theme' : t === 'dark' ? 'Dark theme' : 'System theme'}`
  - Language selectors: `accessibilityLabel={lang.label}`

### AC3: Placeholder colors may fail WCAG contrast

- **Current**: `placeholderColor` is `#94a3b8` (muted dark) in light mode — contrast ratio ~2.8:1 against white background
- **Fix**: Change light mode placeholder to `#64748b` (muted light):
  ```tsx
  const placeholderColor = isDark ? '#64748b' : '#64748b' // or '#7c8494' for slightly lighter
  ```
- **Why**: WCAG AA requires 4.5:1 for normal text. `#64748b` on `#ffffff` = ~4.6:1.

---

## 6. Theme & System Issues (3 issues)

### TH1: Theme defaults to dark, ignoring system preference

- **File**: `app/_layout.tsx:20-26`
- **Current**: If no saved preference, defaults to `'dark'`
- **Fix**:
  ```tsx
  AsyncStorage.getItem(THEME_KEY).then(saved => {
  	if (saved === 'light') {
  		setColorScheme('light')
  	} else if (saved === 'dark') {
  		setColorScheme('dark')
  	}
  	// If no saved preference, let the system decide (don't force dark)
  })
  ```
- **Why**: Forcing dark mode on first launch ignores user's system preference. Only apply saved preference when explicitly set.

### TH2: Badge component inactive variant `muted/20` opacity syntax

- **File**: `components/Badge.tsx:16`
- **Current**: `bg-muted/20 dark:bg-muted/10`
- **Fix**: This uses Tailwind opacity modifier — verify NativeWind v4 supports this. If not, replace with explicit colors.
- **Status**: Verify during implementation.

### TH3: `dp()` scaling uses initial window dimensions only

- **File**: `lib/scale.ts:4`
- **Current**: `const {width} = Dimensions.get('window')` — captured once at module load
- **Fix**: Use `useWindowDimensions()` hook in components that need responsive sizing, or add a dimension change listener:
  ```ts
  import {Dimensions} from 'react-native'
  // Add listener for dimension changes
  Dimensions.addEventListener('change', ({window}) => {
  	widthScale = window.width / BASE_WIDTH
  })
  ```
- **Why**: On rotation or foldable devices, the initial width is stale.

---

## Implementation Order

### Phase 1: Critical Visual Consistency (highest impact)

1. **C1-C4**: Fix blue→purple color inconsistencies (Switch, icons)
2. **T1**: Standardize page headers to `text-xl font-bold`
3. **C5-C7**: Align session screen message styling with chat tab
4. **TH1**: Fix theme default (don't force dark)

### Phase 2: Typography & Spacing

5. **T4**: Settings section headers (`text-xs font-bold uppercase tracking-widest`)
6. **T2-T3, T5-T7**: Explicit text sizes everywhere
7. **S1**: Tab bar height increase
8. **S2**: Chat input max height
9. **S3**: Save button top margin

### Phase 3: Accessibility & Polish

10. **AC1-AC3**: Touch targets, accessibility labels, placeholder contrast
11. **A1-A2**: Header subtitles, send button icon consistency
12. **S4**: Preset chips height

### Phase 4: Technical Debt (optional)

13. **A3**: Migrate inline card styling to `Card` component
14. **TH3**: Fix `dp()` for dynamic dimensions
15. **TH2**: Verify Badge opacity syntax

---

## Files Modified

| File                      | Issues                   |
| ------------------------- | ------------------------ |
| `app/_layout.tsx`         | TH1                      |
| `app/(tabs)/_layout.tsx`  | S1                       |
| `app/(tabs)/index.tsx`    | A2, S2, S4, AC1, AC2     |
| `app/(tabs)/profile.tsx`  | T2, C1, C4, S3, AC1, AC2 |
| `app/(tabs)/settings.tsx` | C1, C3, C4, T4           |
| `app/(tabs)/gallery.tsx`  | T1, T6                   |
| `app/(tabs)/history.tsx`  | T1, T7, A1               |
| `app/session/[id].tsx`    | T3, C5, C6, C7, S2       |
| `lib/scale.ts`            | TH3                      |

## No Changes Needed

| File                             | Reason                                      |
| -------------------------------- | ------------------------------------------- |
| `components/Card.tsx`            | Clean, well-structured                      |
| `components/Badge.tsx`           | Needs TH2 verification only                 |
| `components/Button.tsx`          | Properly uses `dp()` and consistent styling |
| `components/Input.tsx`           | Clean                                       |
| `components/EmptyState.tsx`      | Clean                                       |
| `components/HeaderBar.tsx`       | Clean                                       |
| `components/Toast.tsx`           | Clean                                       |
| `components/OfflineBanner.tsx`   | Clean                                       |
| `components/AgentControls.tsx`   | Clean                                       |
| `components/LoadingSkeleton.tsx` | Clean                                       |
| `tailwind.config.js`             | Color tokens are correct                    |
