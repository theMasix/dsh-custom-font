# dsh-custom-font

Editable **default font stacks** for the DeepSeek Harness Web UI: text
(interface and conversation), code blocks, and the sidebar terminal.

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

The bundled stacks reference two installed families. **Nothing is downloaded and
no font files ship with this plugin** — it assumes both are already installed in
Font Book (`~/Library/Fonts`):

| Family | Used for |
| --- | --- |
| Estedad | text stack |
| Vazirmatn | code + terminal (via the stack fallback) |

If a family is missing, that role simply falls through to the next name in the
stack (`-apple-system`, `Segoe UI`, …) — the UI stays readable, it just is not
using the intended face. There is no automatic acquisition.

### Why there are still `@font-face` blocks

They carry no URLs; every `src` is `local()`. Their only job is the **weight
mapping** — declaring which installed file answers to `400` and `600`, including
Medium and SemiBold. Without them the browser would pick a single face and
synthesize the rest, and faux-bold renders badly on Persian.

Names must match the installed faces exactly. The four declared pairs were
verified with `fc-query` against the files in `~/Library/Fonts`:

```text
Estedad Regular  / Estedad-Regular   (Family: Estedad)
Estedad SemiBold / Estedad-SemiBold  (Family: Estedad)
Vazirmatn Regular  / Vazirmatn-Regular
Vazirmatn SemiBold / Vazirmatn-SemiBold
```

Only Regular and SemiBold are declared. Other installed weights still resolve
through the regular family name in the stack; they are not explicitly mapped.

### Why the faces are inlined in `client.js`

The Host serves only `client*.js` and its source maps under
`/plugins/<package>/`, so a sibling `fonts.css` has no route and would 404. The
plugin also runs as a classic script, where `import.meta.url` does not exist.
Inlining the `@font-face` blocks into the plugin's own `<style>` is therefore the
one transport that works for `link:`, tarball, and `github:` installs alike.

## Uninstall

Remove the bundle from the profile (`remove_bundle`, or the Plugins page). The
injected `<style>` and slot entry disappear with it; the stored values under the
`dsh-custom-font:stacks` localStorage key remain but are no longer read.
