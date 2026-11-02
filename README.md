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

The bundled stacks reference two families, and **no font binaries ship with this
plugin**. Each `@font-face` resolves in this order:

1. `local()` — if the family is already installed (Font Book, `~/Library/Fonts`),
   the browser uses it and makes **no network request**.
2. A pinned jsDelivr URL — the fallback when it is not installed.

| Family | Used for | Source |
| --- | --- | --- |
| Estedad | text stack | [`@fontsource/estedad@5.3.0`](https://cdn.jsdelivr.net/npm/@fontsource/estedad@5.3.0/) |
| Vazirmatn | code + terminal | [`vazirmatn@33.0.3`](https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/Vazirmatn-font-face.css) |

Both are **SIL Open Font License 1.1**. The plugin redistributes no font files:
the binaries stay on the CDN under their own license and are only referenced.
If you prefer a fully offline setup, install both families locally and the
network is never touched.

Estedad is subset-split by Fontsource, so a Persian UI downloads only the
`arabic` subset (~27 KB per weight); `latin` arrives only if Latin glyphs render.

**Pinned versions are deliberate.** These are immutable CDN URLs — bumping one
is a behavioral change and should be a conscious commit.

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
