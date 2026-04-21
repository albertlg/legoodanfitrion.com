# LeGoodAnfitrión UI Contract (Minimal System)

## 1) Shadows
- Hard shadows are not allowed in base UI.
- Default elevation must use subtle borders plus `shadow-sm`.
- `shadow-md` is reserved for hover/focus states only.
- Avoid `shadow-lg`, `shadow-xl`, and `shadow-2xl` in regular dashboard surfaces.

## 2) Color Discipline (No Rainbow UI)
- Cards and structural containers must use neutral surfaces (`white/gray` in light, `gray-800/900` in dark).
- Color is semantic only:
  - Primary actions: primary brand color.
  - Status: success/warning/error/informative states only.
- Secondary metadata must not use random colorful badges.

## 3) Interaction Contract
- Every clickable element must expose:
  - `cursor-pointer`
  - `transition-all duration-200`
- Disabled controls must clearly use `cursor-not-allowed` and reduced opacity.

## 4) Information Hierarchy
- Do not duplicate labels when icon + value already explain the field.
  - Example: use `calendar icon + date` instead of `Date: ...`.
- Keep compact metadata rows and remove visual noise.
- Secondary chips must follow one subtle style system.

## 5) Dark Mode
- Respect explicit app theme first (`data-theme`).
- When no theme is set, use native `prefers-color-scheme` as fallback.
- Maintain contrast, avoid glow-heavy effects, and keep the same minimal hierarchy.
