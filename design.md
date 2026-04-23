# LGA Design System (`design.md`)

This document is the **single visual contract** for Le Good Anfitrión (LGA).
All new UI work must follow these rules by default.

---

## 1) Design Philosophy

### 1.1 Doodle-first UX
- Keep interfaces frictionless, fast, and focused on decisions.
- Prioritize completion over decoration.
- Prefer progressive disclosure for advanced controls.

### 1.2 Premium SaaS clarity
- Neutral surfaces first, color used semantically.
- Consistent spacing, borders, and interaction feedback.
- Zero visual noise and zero punitive language patterns.

### 1.3 Accessibility as baseline
- Dark and light mode are first-class.
- Text contrast must remain readable in all states.
- Keyboard, focus, and feedback states are mandatory.

---

## 2) Core Primitives (Tailwind)

### 2.1 Surfaces
- App background: subtle gradients only.
- Default cards:
  - `bg-white dark:bg-gray-800`
  - `border border-gray-200 dark:border-gray-700`
  - `rounded-xl`
  - `shadow-sm`
- Transparent/glass panels must include:
  - `backdrop-blur-md`
  - `border border-black/10 dark:border-white/10`

### 2.2 Text semantic roles
- Primary: `text-gray-900 dark:text-white`
- Secondary: `text-gray-600 dark:text-gray-300`
- Muted/meta: `text-gray-500 dark:text-gray-400`

### 2.3 Border language
- Structural: `border-gray-200 dark:border-gray-700`
- Soft inner: `border-black/5 dark:border-white/10`
- Semantic only when needed (success/info/error).

---

## 3) Typography & Contrast (Strict)

### 3.1 Forbidden patterns
- **Never** use `font-black` on small labels (`text-xs`, `text-[10px]`, `text-[11px]`).
- Avoid low-contrast text over translucent dark layers like `bg-black/20` unless validated.

### 3.2 Label standard
- Labels/meta headings must use:
  - `font-semibold` or `font-bold`
  - `uppercase` (when appropriate)
  - `tracking-wide` or `tracking-wider`

### 3.3 Contrast minimum
- Target minimum contrast ratio: **4.5:1** for normal text, including Dark Mode.
- If contrast is borderline, raise text luminance first (not saturation).

---

## 4) Interactive Elements

### 4.1 Mandatory interaction contract
All clickable elements must include:
- `cursor-pointer`
- `transition-all duration-200`

Disabled controls must include:
- `disabled:opacity-60`
- `disabled:cursor-not-allowed`

### 4.2 Button patterns

#### Primary
- `bg-indigo-600 hover:bg-indigo-700 text-white`
- `rounded-xl px-4 py-2.5`
- `font-semibold`

#### Secondary
- `border border-black/10 dark:border-white/10`
- `bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700`
- `text-gray-700 dark:text-gray-200`
- `rounded-xl`

#### Danger (non-punitive)
- Avoid saturated punitive red blocks.
- Prefer soft danger styling with clear guidance.

### 4.3 Micro-interactions (Premium requirement)
On hover for important cards and primary buttons:
- add subtle lift: `hover:-translate-y-0.5` (or `hover:translate-y-[-2px]`)
- combine with subtle elevation: `hover:shadow-md`
- keep transitions soft and fast (`duration-200`)

---

## 5) Empty States: “The Helpful Guide”

Every empty state must include:
1. **Narrative visual slot**
   - Reserved area for minimal illustration/iconography.
2. **Empowering copy**
   - Action-oriented and supportive, never blaming.
3. **Single primary CTA**
   - One clear next step.

### Empty state anti-patterns
- No multiple competing CTAs.
- No dead-end text (“No data”) without an action path.

---

## 6) Error States (Non-punitive)

### 6.1 Visual style
Use soft containers, not aggressive red blocks:
- `bg-red-50 dark:bg-red-900/20`
- `border border-red-200 dark:border-red-800/60`
- `text-red-700 dark:text-red-200`

### 6.2 UX rule
- Always include a one-click resolution when possible:
  - retry, fix input, reconnect, or copy support detail.
- Error copy must explain what happened and what to do next.

---

## 7) Loading Strategy

### 7.1 Preferred loading pattern
- **Skeleton screens are mandatory by default** for loading content sections.
- Use `animate-pulse` with realistic content shapes (title, lines, media blocks).

### 7.2 Spinner policy
- Spinners are secondary and only valid for compact inline actions (e.g. button submit state).
- Never replace full content areas with spinner-only placeholders.

---

## 8) Component Patterns

### 8.1 Module card pattern
- Header (title + context)
- Body (main interaction/data)
- Footer (single primary action + optional secondary)
- Keep hierarchy clean and avoid duplicate labels if icon/value already provides context.

### 8.2 Modal pattern
Backdrop:
- `fixed inset-0 z-[120]`
- `bg-black/55 backdrop-blur-md`

Dialog:
- `rounded-2xl`
- `border border-black/10 dark:border-white/10`
- `bg-white/95 dark:bg-gray-900/95`
- `shadow-sm`

Accessibility baseline:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby`
- Escape closes modal

---

## 9) Responsive Contract

- Mobile-first always.
- No horizontal scroll in core flows.
- Row layouts with long text must use:
  - container: `min-w-0 flex-1`
  - text: `truncate`
- On small screens, controls can wrap into a second line while preserving action visibility.

---

## 10) AI Coding Directives (Absolute)

When generating UI code for LGA, the assistant must:
1. Use Tailwind utilities first; avoid ad-hoc CSS unless unavoidable.
2. Follow this document as source of truth.
3. Enforce typography and contrast rules (including 4.5:1 in Dark Mode).
4. Use skeletons for loading blocks (`animate-pulse`).
5. Apply premium micro-hover behavior on key interactive elements.
6. Build empty/error states with actionable guidance.
7. Keep progressive disclosure and low cognitive load as default behavior.

