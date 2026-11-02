# dsh-custom-font

Editable **default font stacks** for the DeepSeek Harness Web UI: text
(interface and conversation), code blocks, and the sidebar terminal.

## Install

Either path works — no local clone needed:

**Web UI:** open **Plugins** in the sidebar, choose install, and enter:

```text
github:theMasix/dsh-custom-font
```

**CLI:**

```bash
dsh plugin add github:theMasix/dsh-custom-font
```

Then reload the page. Remove it the same way (Plugins page, or
`dsh plugin remove dsh-custom-font`).

## Where to edit

**Plugins → Installed → dsh-custom-font** opens the bundle page; the font fields
render in the configuration section there (`plugins.bundle.config`, keyed by the
package name).

Three fields, comma-separated family names:

| Field | CSS variable | Consumed by |
| --- | --- | --- |
| Text font | `--dsh-font-family-text` | `--dsw-font-family` (interface + conversation) |
| Code font | `--dsh-font-family-code` | `--ds-font-family-code` (code blocks, inline code, tool output) |
| Terminal font | `--dsh-font-family-terminal` | sidebar terminal |

Changes apply on every keystroke (`Enter` just leaves the field) and persist in
`localStorage` under `dsh-custom-font:stacks`. An empty field leaves that role on
the Harness built-in stack. The bundled default is the Estedad stack for text.

## Precedence

The shipped Appearance settings (`Settings → General → Font size → chevron`)
write an **inline** `--dsh-font-family-<role>` on `<body>` and remove it when the
field is emptied. Inline styles beat this plugin's stylesheet, so:

- Appearance field empty → this plugin's value applies;
- Appearance field filled → the Settings value wins;
- Appearance field cleared → this plugin's value returns.

## Implementation

A Client-only bundle: `client.js` injects one `<style>` (base row styling plus
the `body{--dsh-font-family-*}` declarations) and registers the fields into the
Plugins page. Everything is disposed with the plugin through `ctx.effect`.

## Fonts

The default text stack references two installed families. **Nothing is
downloaded and no font files ship with this plugin** — it assumes both are
already installed (Font Book on macOS, the system font folder on Windows/Linux):

| Family | Role |
| --- | --- |
| Estedad | first choice of the **text** stack |
| Vazirmatn | fallback within that same text stack, if Estedad is absent |

The `code` and `terminal` stacks default to **empty**, so those roles stay on the
Harness built-in monospace until you type a stack into their fields.

If a family is missing, the text stack falls through to the next name
(`-apple-system`, `Segoe UI`, …) — the UI stays readable, it just is not using
the intended face. There is no automatic acquisition or download.

### What the `@font-face` blocks are for

They carry no URLs; every `src` is `local()`. Their only job is the **weight
mapping** — declaring which installed file answers to `400` and `600`. Without
them the browser picks one face and synthesizes the rest, and faux-bold renders
badly on Persian.

Only **Regular and SemiBold** are mapped, for both families. Other installed
weights (Medium, Bold, …) still work, but resolve through the browser's own
fallback rather than an explicit mapping.

The generated names come from `INSTALLED_FONTS` in `client.js`, each face tried
as both `<Family> <Face>` and `<Family>-<Face>`, which covers how macOS titles
faces versus how the files are named. Verified with `fc-query`:

```text
Estedad Regular  / Estedad-Regular   (Family: Estedad)
Estedad SemiBold / Estedad-SemiBold  (Family: Estedad)
Vazirmatn Regular  / Vazirmatn-Regular
Vazirmatn SemiBold / Vazirmatn-SemiBold
```

### Why everything lives in `client.js`

The Host serves only `client*.js` and its `.map` under `/plugins/<package>/`, so
a sibling `fonts.css` has no route and would 404. The plugin also runs as a
**classic script**, where `import`, `import.meta.url`, and top-level bindings
(which would pollute the page's global scope) are all unavailable. Keeping the
rules inline in the single factory is therefore not a style preference — it is
the only transport that works for `link:`, tarball, and `github:` installs alike.

## Uninstall

Remove the bundle from the profile (`remove_bundle`, or the Plugins page). The
injected `<style>` and slot entry disappear with it; the stored values under the
`dsh-custom-font:stacks` localStorage key remain but are no longer read.
