# iac-builder — UI design language

This document is the **single source of truth** for how the Vite + React app should look and behave. Implementation lives in [`src/ui/src/styles.css`](../src/ui/src/styles.css) as **CSS custom properties** (design tokens). New UI should use those variables rather than ad‑hoc hex values.

## Product principles

1. **Clarity over density** — The wizard is for people learning IaC. One thought per block; use [`help`](../src/ui/src/styles.css) copy for context without crowding the main label.
2. **Progressive disclosure** — Reveal **Cloud → Region → Network → Compute** as prerequisites are met; never hide error feedback.
3. **Readability of generated code** — The code drawer is high-contrast dark text on a deep slate background; the primary canvas stays light.
4. **Keyboard and assistive tech** — Native controls first; every interactive control has a **visible** label or `aria-label`. Focus must be visible (see tokens: `--ib-ring-*`).

## Design tokens (CSS)

All tokens are defined on `:root` in `styles.css` with the prefix `--ib-` (short for *iac-builder*).

| Token / group | Role |
|-----------------|------|
| **Surface** | `--ib-bg-canvas` (page), `--ib-bg-elevated` (cards, inputs), `--ib-bg-code` (drawer) |
| **Text** | `--ib-fg`, `--ib-fg-muted`, `--ib-fg-on-code` |
| **Accent** | `--ib-accent`, `--ib-accent-subtle` (primary actions) |
| **Borders** | `--ib-border` |
| **Semantic** | `--ib-danger` / `--ib-danger-surface` (errors), hint panel (`--ib-hint-*`) |
| **Shape** | `--ib-radius-sm`, `--ib-radius-md`, `--ib-radius-pill` |
| **Type** | `--ib-font-sans`, `--ib-font-mono` |
| **Motion** | `--ib-ease-panel`, `--ib-duration-panel` (drawer slide) |
| **Focus** | `--ib-ring`, `--ib-ring-offset` (use with `:focus-visible`) |

**Rule:** If you need a new color, add a token in `styles.css` and document a one-line note here in the table (or in a short “Changelog” subsection when you add it).

## Typography

- **Body:** `system-ui` stack (`--ib-font-sans`); default text color `--ib-fg`.
- **Field labels:** Semibold, block, small gap below to the control (`label` in CSS).
- **Help text:** Slightly smaller (`.help`), `--ib-fg-muted` — use for *how* to fill a field, not for error messages.
- **Monospace:** `--ib-font-mono` for generated code, `code` in tables, and any IDs / ARNs in the diff table.

## Spacing and layout

- **Layout grid:** 4px base. Prefer `0.25rem` / `0.5rem` / `0.75rem` / `1rem` / `1.5rem` for gaps and padding. The main column caps at `720px` (readable line length for prose + forms).
- **Code drawer:** Fixed `380px` width on large screens; full width on narrow viewports. The panel is a fixed overlay (`.slider`) so the main column keeps its normal width; it may cover the right edge of the page when open.

## Components (patterns)

| Pattern | Class(es) | Notes |
|---------|------------|--------|
| Primary action | `button.primary` | Single primary action per view when possible. |
| Toolbar (secondary) | `wizard-toolbar` + `toolbar-btn` | Undo/redo, compact horizontal actions. |
| Form step | `step` | Stack label → control; optional `help` under label. |
| Target regions (AWS) | `regions[]` + optional additional field | `regions[0]` is the **primary** (used for read-only discovery); more ids repeat in generated IaC. Same `subnet_id` / AMI are copied per region in output—users must fix per region before apply. JSON keeps legacy `region` in sync with `regions[0]`. |
| Preset diff | `preset-diff` + `preset-diff__table` | Compare baseline vs current; keep table scannable. |
| Security hints | `hints` + `m43-callout-hint` + `hints-item--warning` / `hints-item--info`; remediation: `m43-details--remediation` + `m43-inset` on `<pre>` | Callout and inset styling use **m43** shared tokens/classes (see [`static-assets` design.md](https://github.com/MichaelJ43/static-assets/blob/main/docs/design.md) — *Callout and inset monospace*) so light/dark matches the rest of the shell. Requires `m43-tokens.css` / `m43-primitives.css` from the same `v1/` bundle as in [`src/ui/index.html`](../src/ui/index.html). |
| Inline error | `message--error` | For API or validation errors, not for help text. |
| Code panel | `slider`, `slider-tab` | The tab is vertical on the right edge; `aria-expanded` on the control. |
| Config import/export | `wizard-toolbar` (Export / Import) | File pick is visually hidden; **Export** and **Import** use `toolbar-btn--secondary` (outline) so the main column stays about the form; **Undo/Redo** stay default toolbar style. Failures use `message--error`. |
| Wizard progress | `wizard-stepper` | Five labeled steps (Target → Ready); current step uses accent ring. Announced via `aria-labelledby` on the “Step N of 5” line. |
| Starter catalog | `step.starter-catalog` + `preset-compare__row` | Bundled templates use the same control row as preset compare; a second `help` line explains the active starter. |
| AI assist (opt-in) | `ai-assist` + `toolbar-btn` + `ai-assist__pre` | Gated by `VITE_IAC_AI_ASSIST`; no LLM in default build; see [`docs/ai-assist.md`](ai-assist.md). |

## Color philosophy

The UI uses a **slate** neutral palette with a single **blue** accent for the primary CTA, and an **amber-tinted** security-hints surface via m43 (`m43-callout-hint` / related tokens). Errors use **red** in text and a light **rose** surface. The code drawer is **true dark** to separate “your inputs” from “machine output” (dark) and does not follow the page’s day/night mode by design.

## Motion

- **Drawer:** `transform` only; duration `--ib-duration-panel`, easing `--ib-ease-panel`. Avoid animating box shadows or height (performance and reduced motion: users who prefer `prefers-reduced-motion` may still get instant toggles; consider honoring `reduce` in future if motion expands).

## Adding new features

1. Reuse an existing pattern from the table above.
2. If you need a new visual variable, add `--ib-*` in `:root` and use `var()`.
3. Add or extend **unit tests** (Vitest) for state/logic, and **Playwright** for critical flows when the feature is user-visible.
4. Update this file in the same PR if you introduce a new component pattern or token group.

## References

- Roadmap: [`docs/future-ideas.md`](future-ideas.md)
- Contributor test expectations: root [`AGENTS.md`](../AGENTS.md)
