# Mobile App UI/UX — Exact Code Corrections

## File: `app/_layout.tsx` (TH1)

**Lines 20-26 — Theme default**

Current:

```tsx
AsyncStorage.getItem(THEME_KEY).then(saved => {
	if (saved === 'light') {
		setColorScheme('light')
	} else {
		setColorScheme('dark')
	}
})
```

Corrected:

```tsx
AsyncStorage.getItem(THEME_KEY).then(saved => {
	if (saved === 'light' || saved === 'dark') {
		setColorScheme(saved)
	}
	// No saved preference — respect system default
})
```

---

## File: `app/(tabs)/_layout.tsx` (S1)

**Lines 23-24 — Tab bar height**

Current:

```tsx
height: 60,
paddingBottom: 8,
```

Corrected:

```tsx
height: 64,
paddingBottom: 12,
```

---

## File: `app/(tabs)/index.tsx` (A2, S2, S4, AC2)

**Line 485 — Preset chips max height**

Current:

```tsx
className = 'border-t border-border dark:border-border-dark max-h-12'
```

Corrected:

```tsx
className = 'border-t border-border dark:border-border-dark max-h-14'
```

**Lines 508-517 — Chat input max height**

Current:

```tsx
<TextInput
	className="flex-1 px-4 py-3 text-sm border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
	placeholder="Type a message…"
	placeholderTextColor="#94a3b8"
	value={input}
	onChangeText={setInput}
	multiline
	maxLength={4000}
	blurOnSubmit={false}
/>
```

Corrected:

```tsx
<TextInput
	className="flex-1 px-4 py-3 text-sm border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
	placeholder="Type a message…"
	placeholderTextColor="#94a3b8"
	value={input}
	onChangeText={setInput}
	multiline
	maxLength={4000}
	blurOnSubmit={false}
	style={{maxHeight: 120}}
	accessibilityLabel="Message input"
/>
```

**Lines 518-526 — Send button (A2 + AC2)**

Current:

```tsx
<TouchableOpacity
	className={`w-10 h-10 rounded-full items-center justify-center ${
		input.trim() ? 'bg-primary' : 'bg-border dark:bg-border-dark'
	}`}
	onPress={() => sendMessage()}
	disabled={!input.trim()}
>
	<Text className="text-base text-white">↑</Text>
</TouchableOpacity>
```

Corrected:

```tsx
<TouchableOpacity
	className={`w-10 h-10 rounded-full items-center justify-center ${
		input.trim() ? 'bg-primary' : 'bg-border dark:border-border-dark'
	}`}
	onPress={() => sendMessage()}
	disabled={!input.trim()}
	accessibilityLabel="Send message"
>
	<Ionicons name="arrow-up" size={18} color="white" />
</TouchableOpacity>
```

Note: Add `import {Ionicons} from '@expo/vector-icons'` at top if not already imported.

**Lines 404-408 — Unpair button (AC1 + AC2)**

Current:

```tsx
<TouchableOpacity onPress={clearBridgeCode}>
	<Text className="text-xs text-muted dark:text-muted-dark">Unpair</Text>
</TouchableOpacity>
```

Corrected:

```tsx
<TouchableOpacity
	onPress={clearBridgeCode}
	className="px-3 py-2"
	accessibilityLabel="Disconnect from CLI bridge"
>
	<Text className="text-xs text-muted dark:text-muted-dark">Unpair</Text>
</TouchableOpacity>
```

---

## File: `app/(tabs)/profile.tsx` (T1, T2, C1, C4, S3, AC2)

**Line 186 — Page header**

Current:

```tsx
<Text className="text-lg font-semibold text-text dark:text-text-dark">
	Profile
</Text>
```

Corrected:

```tsx
<Text className="text-xl font-bold text-text dark:text-text-dark">Profile</Text>
```

**Lines 205-207 — Nickname section header**

Current:

```tsx
<Text className="font-semibold text-text dark:text-text-dark">Nickname</Text>
```

Corrected:

```tsx
<Text className="text-base font-semibold text-text dark:text-text-dark">
	Nickname
</Text>
```

**Lines 230-232 — Theme section header**

Current:

```tsx
<Text className="font-semibold text-text dark:text-text-dark">Theme</Text>
```

Corrected:

```tsx
<Text className="text-base font-semibold text-text dark:text-text-dark">
	Theme
</Text>
```

**Lines 270-272 — Notifications section header**

Current:

```tsx
<Text className="font-semibold text-text dark:text-text-dark">
	Notifications
</Text>
```

Corrected:

```tsx
<Text className="text-base font-semibold text-text dark:text-text-dark">
	Notifications
</Text>
```

**Lines 281-286 — Notifications Switch (C1 + C4)**

Current:

```tsx
<Switch
	value={notifications}
	onValueChange={setNotifications}
	trackColor={{false: '#e2e8f0', true: '#3b82f6'}}
	thumbColor="#ffffff"
/>
```

Corrected:

```tsx
<Switch
	value={notifications}
	onValueChange={setNotifications}
	trackColor={{false: isDark ? '#2a2a4a' : '#e2e8f0', true: '#7c3aed'}}
	thumbColor="#ffffff"
/>
```

**Lines 294-296 — Language section header**

Current:

```tsx
<Text className="font-semibold text-text dark:text-text-dark">Language</Text>
```

Corrected:

```tsx
<Text className="text-base font-semibold text-text dark:text-text-dark">
	Language
</Text>
```

**Lines 330-332 — Subscription section header**

Current:

```tsx
<Text className="font-semibold text-text dark:text-text-dark">
	Subscription
</Text>
```

Corrected:

```tsx
<Text className="text-base font-semibold text-text dark:text-text-dark">
	Subscription
</Text>
```

**Line 367 — Pro badge icon color (C2)**

Current:

```tsx
<Ionicons name="flash-outline" size={16} color="#3b82f6" />
```

Corrected:

```tsx
<Ionicons name="flash-outline" size={16} color="#7c3aed" />
```

**Lines 395-404 — Save button top margin (S3)**

Current:

```tsx
<TouchableOpacity
	className={`rounded-xl py-3 items-center ${saving ? 'opacity-60' : ''}`}
	style={{backgroundColor: '#7c3aed'}}
	onPress={handleSave}
	disabled={saving}
>
	<Text className="font-semibold text-white">
		{saving ? 'Saving...' : 'Save Changes'}
	</Text>
</TouchableOpacity>
```

Corrected:

```tsx
<TouchableOpacity
	className={`rounded-xl py-3 items-center mt-2 ${saving ? 'opacity-60' : ''}`}
	style={{backgroundColor: '#7c3aed'}}
	onPress={handleSave}
	disabled={saving}
	accessibilityLabel={saving ? 'Saving changes' : 'Save profile changes'}
>
	<Text className="text-sm font-semibold text-white">
		{saving ? 'Saving...' : 'Save Changes'}
	</Text>
</TouchableOpacity>
```

---

## File: `app/(tabs)/settings.tsx` (T4, C1, C3, C4)

**Line 220 — Page header**

Current:

```tsx
<Text className="text-text dark:text-text-dark text-lg font-semibold">
	Settings
</Text>
```

Corrected:

```tsx
<Text className="text-xl font-bold text-text dark:text-text-dark">
	Settings
</Text>
```

**Line 267 — Appearance section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Appearance
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Appearance
</Text>
```

**Line 293 — Security section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Security
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Security
</Text>
```

**Line 351 — Templates section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Templates
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Templates
</Text>
```

**Line 377 — Prompt Presets section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Prompt Presets
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Prompt Presets
</Text>
```

**Line 456 — Quick Sign In section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Quick Sign In
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Quick Sign In
</Text>
```

**Line 478 — Credentials section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Credentials
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Credentials
</Text>
```

**Line 606 — Server section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Server
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Server
</Text>
```

**Line 635 — Workspaces section header**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
	Workspaces
</Text>
```

Corrected:

```tsx
<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
	Workspaces
</Text>
```

**Lines 282-287 — Dark mode Switch (C1 + C4)**

Current:

```tsx
<Switch
	value={isDark}
	onValueChange={handleThemeToggle}
	trackColor={{false: '#e2e8f0', true: '#3b82f6'}}
	thumbColor="#ffffff"
/>
```

Corrected:

```tsx
<Switch
	value={isDark}
	onValueChange={handleThemeToggle}
	trackColor={{false: isDark ? '#2a2a4a' : '#e2e8f0', true: '#7c3aed'}}
	thumbColor="#ffffff"
/>
```

**Lines 311-316 — Biometric Switch (C1 + C4)**

Current:

```tsx
<Switch
	value={biometricEnabled}
	onValueChange={setBiometricEnabled}
	trackColor={{false: '#e2e8f0', true: '#3b82f6'}}
	thumbColor="#ffffff"
/>
```

Corrected:

```tsx
<Switch
	value={biometricEnabled}
	onValueChange={setBiometricEnabled}
	trackColor={{false: isDark ? '#2a2a4a' : '#e2e8f0', true: '#7c3aed'}}
	thumbColor="#ffffff"
/>
```

**Lines 719-723 — Active workspace checkmark icon (C3)**

Current:

```tsx
<Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
```

Corrected:

```tsx
<Ionicons name="checkmark-circle" size={14} color="#7c3aed" />
```

**Lines 763-769 — Workspace toggle checkmark color (C3)**

Current:

```tsx
color={
  ws.id === activeWorkspaceId || ws.isActive
    ? '#3b82f6'
    : mutedColor
}
```

Corrected:

```tsx
color={
  ws.id === activeWorkspaceId || ws.isActive
    ? '#7c3aed'
    : mutedColor
}
```

---

## File: `app/(tabs)/gallery.tsx` (T1, T6)

**Lines 68-72 — Page header**

Current:

```tsx
<View className="px-4 py-3 border-b border-border dark:border-border-dark">
	<Text className="text-text dark:text-text-dark text-lg font-semibold">
		Agent Gallery
	</Text>
	<Text className="text-muted dark:text-muted-dark text-xs mt-0.5">
		Your active sessions
	</Text>
</View>
```

Corrected:

```tsx
<View className="px-4 py-3 border-b border-border dark:border-border-dark">
	<Text className="text-xl font-bold text-text dark:text-text-dark">
		Agent Gallery
	</Text>
	<Text className="text-sm text-muted dark:text-muted-dark mt-0.5">
		Your active sessions
	</Text>
</View>
```

**Line 59 — Empty state sign-in text (T6)**

Current:

```tsx
<Text className="text-muted dark:text-muted-dark text-center px-6">
	Sign in via Settings to view your agent sessions
</Text>
```

Corrected:

```tsx
<Text className="text-sm text-muted dark:text-muted-dark text-center px-6">
	Sign in via Settings to view your agent sessions
</Text>
```

**Line 88 — Empty state text (T6)**

Current:

```tsx
<Text className="text-muted dark:text-muted-dark text-center">
	No sessions yet.{'\n'}Connect a local agent via the CLI to get started.
</Text>
```

Corrected:

```tsx
<Text className="text-sm text-muted dark:text-muted-dark text-center">
	No sessions yet.{'\n'}Connect a local agent via the CLI to get started.
</Text>
```

---

## File: `app/(tabs)/history.tsx` (T1, T7, A1)

**Lines 94-98 — Page header (add subtitle)**

Current:

```tsx
<View className="px-4 py-3 border-b border-border dark:border-border-dark">
	<Text className="text-text dark:text-text-dark text-lg font-semibold">
		History
	</Text>
</View>
```

Corrected:

```tsx
<View className="px-4 py-3 border-b border-border dark:border-border-dark">
	<Text className="text-xl font-bold text-text dark:text-text-dark">
		History
	</Text>
	<Text className="text-sm text-muted dark:text-muted-dark mt-0.5">
		Past sessions
	</Text>
</View>
```

**Line 85 — Empty state text (T7)**

Current:

```tsx
<Text className="text-muted dark:text-muted-dark text-center px-6">
	Sign in via Settings to view your history
</Text>
```

Corrected:

```tsx
<Text className="text-sm text-muted dark:text-muted-dark text-center px-6">
	Sign in via Settings to view your history
</Text>
```

**Line 120 — Empty state text (T7)**

Current:

```tsx
<Text className="text-muted dark:text-muted-dark text-center">
	{query ? 'No sessions match your search' : 'No past sessions yet'}
</Text>
```

Corrected:

```tsx
<Text className="text-sm text-muted dark:text-muted-dark text-center">
	{query ? 'No sessions match your search' : 'No past sessions yet'}
</Text>
```

---

## File: `app/session/[id].tsx` (T3, C5, C6, C7, S2)

**Lines 186-191 — Header title (T3)**

Current:

```tsx
<Text className="text-text dark:text-text-dark font-semibold" numberOfLines={1}>
	Session {roomId.slice(0, 8)}…
</Text>
```

Corrected:

```tsx
<Text
	className="text-base font-semibold text-text dark:text-text-dark"
	numberOfLines={1}
>
	Session {roomId.slice(0, 8)}…
</Text>
```

**Lines 219-235 — Message bubbles (C5, C6, C7)**

Current:

```tsx
<View
  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
    item.role === 'user'
      ? 'self-end bg-primary'
      : item.role === 'system'
        ? 'self-center bg-border dark:bg-border-dark'
        : 'self-start bg-card dark:bg-card-dark border border-border dark:border-border-dark'
  }`}
>
  <Text
    className={
      item.role === 'user'
        ? 'text-white'
        : 'text-text dark:text-text-dark'
    }
  >
    {item.content}
  </Text>
```

Corrected:

```tsx
<View
  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
    item.role === 'user'
      ? 'self-end bg-primary'
      : item.role === 'system'
        ? 'self-center bg-warning/20 border border-warning/30'
        : 'self-start bg-card dark:bg-card-dark border border-border dark:border-border-dark'
  }`}
>
  <Text
    className={
      item.role === 'user'
        ? 'text-white text-sm leading-5'
        : item.role === 'system'
          ? 'text-xs text-warning text-center'
          : 'text-text dark:text-text-dark text-sm leading-5'
    }
  >
    {item.content}
  </Text>
```

**Lines 264-273 — Input bar max height (S2)**

Current:

```tsx
<TextInput
	className="flex-1 px-4 py-3 text-sm border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
	placeholder="Type a message…"
	placeholderTextColor="#94a3b8"
	value={input}
	onChangeText={setInput}
	multiline
	maxLength={4000}
/>
```

Corrected:

```tsx
<TextInput
	className="flex-1 px-4 py-3 text-sm border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
	placeholder="Type a message…"
	placeholderTextColor="#94a3b8"
	value={input}
	onChangeText={setInput}
	multiline
	maxLength={4000}
	style={{maxHeight: 120}}
	accessibilityLabel="Message input"
/>
```

**Lines 274-280 — Send button accessibility (AC2)**

Current:

```tsx
<TouchableOpacity
  className={`w-10 h-10 rounded-full items-center justify-center ${input.trim() ? 'bg-primary' : 'bg-border dark:bg-border-dark'}`}
  onPress={send}
  disabled={!input.trim()}
>
```

Corrected:

```tsx
<TouchableOpacity
  className={`w-10 h-10 rounded-full items-center justify-center ${input.trim() ? 'bg-primary' : 'bg-border dark:bg-border-dark'}`}
  onPress={send}
  disabled={!input.trim()}
  accessibilityLabel="Send message"
>
```

---

## File: `lib/scale.ts` (TH3)

**Current:**

```ts
import {Dimensions, PixelRatio} from 'react-native'

const BASE_WIDTH = 390 // iPhone 14 logical width
const {width} = Dimensions.get('window')
const widthScale = width / BASE_WIDTH

export function dp(size: number): number {
	return Math.round(size * widthScale)
}

export function sp(size: number): number {
	return Math.round(size * widthScale * PixelRatio.getFontScale())
}
```

**Corrected:**

```ts
import {Dimensions, PixelRatio} from 'react-native'

const BASE_WIDTH = 390 // iPhone 14 logical width

function getScale() {
	return Dimensions.get('window').width / BASE_WIDTH
}

export function dp(size: number): number {
	return Math.round(size * getScale())
}

export function sp(size: number): number {
	return Math.round(size * getScale() * PixelRatio.getFontScale())
}
```

Note: This change makes `dp()` and `sp()` read the current window dimensions on every call, ensuring correct scaling after rotation or foldable device state changes. The performance impact is negligible since `Dimensions.get()` is a fast synchronous call.

---

## Summary of All Changes

| Category             | Count        | Impact          |
| -------------------- | ------------ | --------------- |
| Typography hierarchy | 7 fixes      | Visual clarity  |
| Color consistency    | 8 fixes      | Brand coherence |
| Spacing              | 4 fixes      | Visual rhythm   |
| Alignment            | 3 fixes      | Consistency     |
| Accessibility        | 3 fixes      | WCAG compliance |
| Theme system         | 3 fixes      | User experience |
| **Total**            | **28 fixes** |                 |
