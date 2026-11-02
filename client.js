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
 */
window.__ModuleLoader__.load({
  id: 'dsh-custom-font',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'plugin.custom-font';
    const STORAGE_KEY = 'dsh-custom-font:stacks';

    /* Weight mapping for the two installed families.
     *
     * No font files are shipped and nothing is fetched: the UI assumes Estedad
     * and Vazirmatn are already installed (Font Book / ~/Library/Fonts). The
     * @font-face blocks below exist only to map real weights, so `600` picks
     * Estedad SemiBold instead of a synthesized faux-bold, which renders badly
     * on Persian. Every src is local(); a missing family simply falls through
     * to the next family in the stack.
     *
     * Names must match the installed faces exactly. Verified against the
     * installed files with fc-query:
     *   Estedad Regular    / Estedad-Regular    (Family: Estedad)
     *   Estedad SemiBold   / Estedad-SemiBold   (Family: Estedad)
     *
     * Inlined into this plugin's own <style> rather than linked as a separate
     * stylesheet: the Host serves only `client*.js` and its `.map` under
     * /plugins/<package>/, so a sibling `fonts.css` has no route and would 404.
     * The plugin runs as a classic script, where `import.meta.url` does not
     * exist either. */
    const FONTS_CSS = String.raw`
@font-face{font-family:'Estedad';font-style:normal;font-weight:400;src:local('Estedad Regular'),local('Estedad-Regular')}
@font-face{font-family:'Estedad';font-style:normal;font-weight:600;src:local('Estedad SemiBold'),local('Estedad-SemiBold')}
@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:400;src:local('Vazirmatn Regular'),local('Vazirmatn-Regular')}
@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:600;src:local('Vazirmatn SemiBold'),local('Vazirmatn-SemiBold')}
`;

    const ROLES = ['text', 'code', 'terminal'];
    const VARIABLES = {
      text: '--dsh-font-family-text',
      code: '--dsh-font-family-code',
      terminal: '--dsh-font-family-terminal',
    };

    /** First-run values; the Settings fields override them per role when filled. */
    const DEFAULTS = {
      text: 'Estedad, Vazirmatn, -apple-system, "Segoe UI", sans-serif',
      code: '',
      terminal: '',
    };

    const CSS = `
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

    function loadStacks() {
      const stacks = { ...DEFAULTS };
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return stacks;
        const saved = JSON.parse(raw);
        for (const role of ROLES) {
          if (typeof saved?.[role] === 'string') stacks[role] = saved[role];
        }
      } catch {
        /* corrupted or unavailable storage falls back to defaults */
      }
      return stacks;
    }

    let stacks = loadStacks();
    let styleElement = null;

    function fontCss() {
      const declarations = [];
      for (const role of ROLES) {
        const value = String(stacks[role] ?? '').trim();
        if (value !== '') declarations.push(`${VARIABLES[role]}:${value};`);
      }
      return FONTS_CSS + CSS + (declarations.length === 0 ? '' : `body{${declarations.join('')}}`);
    }

    function paint() {
      if (styleElement !== null) styleElement.textContent = fontCss();
    }

    function persist(next) {
      stacks = next;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
      } catch {
        /* ignore quota/private-mode failures: the in-memory value still applies */
      }
      paint();
    }

    function FontFields({ view, t }) {
      const [state, setState] = React.useState(stacks);

      if (view === 'summary') {
        return h('span', null, t('summary'));
      }

      const commit = (role, value) => {
        const next = { ...state, [role]: value };
        setState(next);
        persist(next);
      };

      return h(
        'div',
        { className: 'dcf-root' },
        h('h3', { className: 'dcf-heading', key: 'title' }, t('title')),
        h('p', { className: 'dcf-hint', key: 'hint' }, t('hint')),
        ...ROLES.map((role) =>
          h(
            'label',
            { className: 'dcf-field', key: role },
            h('span', { className: 'dcf-title' }, t(`font.${role}.title`)),
            h('span', { className: 'dcf-desc' }, t(`font.${role}.description`)),
            h('input', {
              className: 'dcf-input',
              type: 'text',
              spellCheck: false,
              autoComplete: 'off',
              maxLength: 400,
              placeholder: t('placeholder'),
              'aria-label': t(`font.${role}.title`),
              value: state[role],
              onChange: (event) => commit(role, event.currentTarget.value),
              onKeyDown: (event) => {
                if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                if (event.key === 'Enter') event.currentTarget.blur();
              },
            }),
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          styleElement = document.createElement('style');
          styleElement.dataset.dshCustomFont = '';
          document.head.appendChild(styleElement);
          paint();

          const disposers = [
            ctx.locale.register(NS, DICT),
            ctx.slots.inject('plugins.bundle.config', () =>
              ctx.slots.register(
                { name: 'plugins.bundle.config', key: 'dsh-custom-font', locale: NS },
                FontFields,
              ),
            ),
          ];

          return () => {
            for (const dispose of disposers) dispose();
            styleElement?.remove();
            styleElement = null;
          };
        }, 'custom-font: fields, storage, and font stacks');
      },
    };
  },
});
