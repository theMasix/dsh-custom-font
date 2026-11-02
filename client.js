/**
 * dsh-custom-font — user-editable default font stacks for the Harness Web UI.
 *
 * The fields live on the bundle's page in Plugins → Installed → dsh-custom-font
 * (the `plugins.bundle.config` slot, keyed by this package name). Values are
 * stored in localStorage and applied immediately as `--dsh-font-family-<role>`
 * on <body>.
 *
 * Precedence: the shipped Appearance font rows write an inline value on <body>
 * when filled, and this plugin's stylesheet loses to inline styles — so the
 * built-in Settings still win whenever a role has a value there.
 *
 * Keep everything in this one file and inside the factory. The Host serves only
 * `client*.js` and its `.map` under /plugins/<package>/, so a sibling file (such
 * as a `fonts.css`) has no route and would 404. The plugin also runs as a classic
 * script: `import` and `import.meta.url` do not exist, and a top-level declaration
 * would land in the page's global scope.
 */
window.__ModuleLoader__.load({
  id: 'dsh-custom-font',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /* ------------------------------ Identifiers ------------------------------ */

    const PACKAGE_NAME = 'dsh-custom-font';
    const LOCALE_NAMESPACE = 'plugin.custom-font';
    const STORAGE_KEY = 'dsh-custom-font:stacks';
    const CONFIG_SLOT = 'plugins.bundle.config';
    const MAX_STACK_LENGTH = 400;

    /* ----------------------------- Configuration ----------------------------- */

    /**
     * Font roles, in display order. `defaultStack` is the first-run value; the
     * Settings fields override it per role when filled.
     *
     * To add a role, add an entry here and `font.<id>.title` plus
     * `font.<id>.description` to every locale in DICT. The field, storage, and
     * `--dsh-font-family-<id>` declaration follow from that, but the variable only
     * has an effect if the Harness UI reads it.
     */
    const ROLES = [
      { id: 'text', defaultStack: 'Estedad, Vazirmatn, -apple-system, "Segoe UI", sans-serif' },
      { id: 'code', defaultStack: '' },
      { id: 'terminal', defaultStack: '' },
    ];

    /**
     * Weight mapping for the installed families: CSS weight → face name.
     *
     * No font files are shipped and nothing is fetched: the UI assumes these
     * families are already installed (Font Book / ~/Library/Fonts). The generated
     * @font-face rules exist only to map real weights, so `600` picks Estedad
     * SemiBold instead of a synthesized faux-bold, which renders badly on Persian.
     * Every src is local(); a missing family simply falls through to the next
     * family in the stack.
     *
     * Each face resolves as local('<family> <face>') or local('<family>-<face>'),
     * and those names must match the installed faces exactly. Verified against the
     * installed files with fc-query:
     *   Estedad Regular    / Estedad-Regular    (Family: Estedad)
     *   Estedad SemiBold   / Estedad-SemiBold   (Family: Estedad)
     */
    const INSTALLED_FONTS = [
      { family: 'Estedad', faces: { 400: 'Regular', 600: 'SemiBold' } },
      { family: 'Vazirmatn', faces: { 400: 'Regular', 600: 'SemiBold' } },
    ];

    const DICT = {
      en: {
        title: 'Fonts',
        hint: 'Applied unless the Appearance font fields are filled in. Leave a field empty to use the built-in stack.',
        placeholder: 'Built-in',
        'font.text.title': 'Text font',
        'font.text.description': 'Interface and conversation text.',
        'font.code.title': 'Code font',
        'font.code.description': 'Code blocks, inline code, and tool output.',
        'font.terminal.title': 'Terminal font',
        'font.terminal.description': 'Sidebar terminal.',
        summary: 'Custom fonts',
      },
      zh: {
        title: '字体',
        hint: '仅在“外观”字体字段为空时生效；留空则使用内置字体栈。',
        placeholder: '内置',
        'font.text.title': '正文字体',
        'font.text.description': '用于界面与会话正文。',
        'font.code.title': '代码字体',
        'font.code.description': '用于代码块、行内代码与工具输出。',
        'font.terminal.title': '终端字体',
        'font.terminal.description': '用于侧栏终端。',
        summary: '自定义字体',
      },
    };

    /* ------------------------------ Stylesheet ------------------------------- */

    const PANEL_CSS = `
.dcf-root{display:flex;flex-direction:column;gap:12px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
.dcf-heading{margin:0;font-size:14px;font-weight:500;line-height:20px}
.dcf-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dcf-field{display:flex;flex-direction:column;gap:2px}
.dcf-title{font-weight:500}
.dcf-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dcf-input{margin-top:6px;height:36px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none;box-sizing:border-box;width:100%}
.dcf-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-business-primary)}
.dcf-input::placeholder{color:var(--dsw-alias-label-caption)}
`;

    const FONT_FACE_CSS = INSTALLED_FONTS.flatMap(({ family, faces }) =>
      Object.entries(faces).map(
        ([weight, face]) =>
          `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:local('${family} ${face}'),local('${family}-${face}')}`,
      ),
    ).join('\n');

    /** The `body{…}` rule publishing every non-empty stack, or '' if all are empty. */
    function roleVariablesRule(stacks) {
      const declarations = ROLES.flatMap(({ id }) => {
        const stack = stacks[id].trim();
        return stack === '' ? [] : [`--dsh-font-family-${id}:${stack};`];
      });
      return declarations.length === 0 ? '' : `body{${declarations.join('')}}`;
    }

    /* -------------------------------- Storage -------------------------------- */

    function readSavedStacks() {
      const stacks = Object.fromEntries(ROLES.map(({ id, defaultStack }) => [id, defaultStack]));
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return stacks;
        const saved = JSON.parse(raw);
        for (const { id } of ROLES) {
          if (typeof saved?.[id] === 'string') stacks[id] = saved[id];
        }
      } catch {
        /* corrupted or unavailable storage falls back to defaults */
      }
      return stacks;
    }

    function writeSavedStacks(stacks) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
      } catch {
        /* ignore quota/private-mode failures: the in-memory value still applies */
      }
    }

    /* --------------------------------- State -------------------------------- */

    let stacks = readSavedStacks();
    let styleElement = null;

    function paint() {
      if (styleElement === null) return;
      styleElement.textContent = FONT_FACE_CSS + PANEL_CSS + roleVariablesRule(stacks);
    }

    /** Saves and applies one role's stack, returning the updated stacks. */
    function updateStack(role, value) {
      stacks = { ...stacks, [role]: value };
      writeSavedStacks(stacks);
      paint();
      return stacks;
    }

    /** Adds the plugin's <style> to the page; the returned function removes it. */
    function mountStylesheet() {
      styleElement = document.createElement('style');
      styleElement.dataset.dshCustomFont = '';
      document.head.appendChild(styleElement);
      paint();

      return () => {
        styleElement?.remove();
        styleElement = null;
      };
    }

    /* ---------------------------------- UI ---------------------------------- */

    /** Enter leaves the field, unless it is confirming an IME composition. */
    function blurOnEnter(event) {
      const { isComposing, keyCode } = event.nativeEvent;
      if (isComposing || keyCode === 229) return;
      if (event.key === 'Enter') event.currentTarget.blur();
    }

    function FontField({ role, value, onChange, t }) {
      const title = t(`font.${role}.title`);
      return h(
        'label',
        { className: 'dcf-field' },
        h('span', { className: 'dcf-title' }, title),
        h('span', { className: 'dcf-desc' }, t(`font.${role}.description`)),
        h('input', {
          className: 'dcf-input',
          type: 'text',
          spellCheck: false,
          autoComplete: 'off',
          maxLength: MAX_STACK_LENGTH,
          placeholder: t('placeholder'),
          'aria-label': title,
          value,
          onChange: (event) => onChange(role, event.currentTarget.value),
          onKeyDown: blurOnEnter,
        }),
      );
    }

    function FontForm({ t }) {
      const [values, setValues] = React.useState(stacks);
      const handleChange = (role, value) => setValues(updateStack(role, value));

      return h(
        'div',
        { className: 'dcf-root' },
        h('h3', { className: 'dcf-heading' }, t('title')),
        h('p', { className: 'dcf-hint' }, t('hint')),
        ROLES.map(({ id }) =>
          h(FontField, { key: id, role: id, value: values[id], onChange: handleChange, t }),
        ),
      );
    }

    /** Slot entry: the Plugins page renders it as a one-line summary or the full form. */
    function BundleConfig({ view, t }) {
      return view === 'summary' ? h('span', null, t('summary')) : h(FontForm, { t });
    }

    /* ------------------------------- Lifecycle ------------------------------- */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const removeStylesheet = mountStylesheet();
          const disposers = [
            ctx.locale.register(LOCALE_NAMESPACE, DICT),
            ctx.slots.inject(CONFIG_SLOT, () =>
              ctx.slots.register(
                { name: CONFIG_SLOT, key: PACKAGE_NAME, locale: LOCALE_NAMESPACE },
                BundleConfig,
              ),
            ),
          ];

          return () => {
            for (const dispose of disposers) dispose();
            removeStylesheet();
          };
        }, 'custom-font: fields, storage, and font stacks');
      },
    };
  },
});
