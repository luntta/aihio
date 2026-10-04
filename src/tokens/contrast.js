// Build-time colour-contrast math. Not bundled into dist — src/tokens/* runs
// only under `npm run tokens`, so this stays out of the shipped runtime.
//
// Token colour values are written as oklch(L C H), the same string that ships
// in the CSS, so what the contract checks is what renders.

/** Parse an oklch(L C H) token value (or a bare "L C H") into numeric components. */
export function parseOklch(value) {
  const inner = String(value).trim().replace(/^oklch\((.*)\)$/i, '$1');
  const [l, c, h] = inner.split(/[\s/]+/).map(Number);

  if (![l, c, h].every((part) => Number.isFinite(part))) {
    throw new Error(`Not an oklch(L C H) colour value: ${JSON.stringify(value)}`);
  }

  return { l, c, h };
}

/** Oklch -> sRGB, clamped to gamut. */
export function oklchToSrgb({ l, c, h }) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const lCone = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCone = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCone = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  const linear = [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.7076147010 * sCone,
  ];

  return linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  });
}

/** WCAG 2.x relative luminance of an sRGB triple. */
export function relativeLuminance(srgb) {
  const [r, g, b] = srgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two oklch() token values. */
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(oklchToSrgb(parseOklch(foreground)));
  const b = relativeLuminance(oklchToSrgb(parseOklch(background)));
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

// Pairs the palette must satisfy in both themes. `min` is the WCAG threshold
// for that pair's role: 4.5 for body-size text (1.4.3), 3 for the boundary of
// an interactive control (1.4.11).
//
// Pairs name semantic colour tokens (tokens/semantic.json), which are themed.
//
// Decorative framing — `border-subtle`, used for card and alert edges — is deliberately
// absent. 1.4.11 covers boundaries that carry meaning; a card edge that also
// reads from its background fill does not, and holding it to 3:1 would make
// every surface in the system shout.
export const CONTRAST_REQUIREMENTS = [
  {
    id: 'destructive-button',
    foreground: 'destructive-fg',
    background: 'destructive-bg',
    min: 4.5,
    note: 'Destructive button label on its fill.',
  },
  {
    id: 'destructive-text',
    foreground: 'destructive-text',
    background: 'page-bg',
    min: 4.5,
    note: 'Destructive alert copy drawn on the page canvas.',
  },
  {
    id: 'success-button',
    foreground: 'success-fg',
    background: 'success-bg',
    min: 4.5,
    note: 'Success badge label on its fill.',
  },
  {
    id: 'success-text',
    foreground: 'success-text',
    background: 'page-bg',
    min: 4.5,
    note: 'Success alert copy drawn on the page canvas.',
  },
  {
    id: 'warning-button',
    foreground: 'warning-fg',
    background: 'warning-bg',
    min: 4.5,
    note: 'Warning badge label on its fill. The fill is light in both themes, so this pairs with a dark foreground.',
  },
  {
    id: 'warning-text',
    foreground: 'warning-text',
    background: 'page-bg',
    min: 4.5,
    note: 'Warning alert copy drawn on the page canvas.',
  },
  {
    id: 'primary-button',
    foreground: 'primary-action-fg',
    background: 'primary-action-bg',
    min: 4.5,
    note: 'Default button label on its fill.',
  },
  {
    id: 'secondary-button',
    foreground: 'secondary-action-fg',
    background: 'secondary-action-bg',
    min: 4.5,
    note: 'Secondary button label on its fill.',
  },
  {
    id: 'control-highlight',
    foreground: 'control-highlight-fg',
    background: 'control-highlight-bg',
    min: 4.5,
    note: 'Ghost and outline button labels on their hover fill.',
  },
  {
    id: 'overlay-highlight',
    foreground: 'overlay-fg',
    background: 'overlay-highlight-bg',
    min: 4.5,
    note: 'The active combobox option or hovered dropdown item label on its highlight, inside an overlay.',
  },
  {
    id: 'muted-text-on-page',
    foreground: 'muted-fg',
    background: 'page-bg',
    min: 4.5,
    note: 'Supporting copy on the page canvas.',
  },
  {
    id: 'muted-text-on-muted',
    foreground: 'muted-fg',
    background: 'muted-bg',
    min: 4.5,
    note: 'Supporting copy on muted fills (toggle hover, muted surfaces).',
  },
  {
    id: 'placeholder-text',
    foreground: 'placeholder-fg',
    background: 'placeholder-bg',
    min: 4.5,
    note: "Avatar initials on their fill.",
  },
  {
    id: 'body-text',
    foreground: 'page-fg',
    background: 'page-bg',
    min: 4.5,
    note: 'Body copy on the page canvas.',
  },
  {
    id: 'surface-text',
    foreground: 'surface-fg',
    background: 'surface-bg',
    min: 4.5,
    note: 'Body copy on raised surfaces.',
  },
  {
    id: 'field-border',
    foreground: 'field-border',
    background: 'page-bg',
    min: 3,
    note: 'Field boundary — the only affordance marking an empty text input.',
  },
  {
    id: 'focus-ring',
    foreground: 'focus-ring',
    background: 'page-bg',
    min: 3,
    note: 'Focus indicator against the page canvas.',
  },
];

/**
 * Check a resolved theme (a flat map of semantic colour name -> oklch()) against
 * CONTRAST_REQUIREMENTS. Returns one result per requirement.
 */
export function checkTheme(theme, resolvedColors) {
  return CONTRAST_REQUIREMENTS.map((requirement) => {
    const foreground = resolvedColors[requirement.foreground];
    const background = resolvedColors[requirement.background];

    if (foreground === undefined || background === undefined) {
      return {
        ...requirement,
        theme,
        ratio: null,
        pass: false,
        message: `missing token (${requirement.foreground} / ${requirement.background})`,
      };
    }

    const ratio = contrastRatio(foreground, background);

    return {
      ...requirement,
      theme,
      ratio,
      pass: ratio >= requirement.min,
      message: `${ratio.toFixed(2)}:1 (needs ${requirement.min}:1)`,
    };
  });
}
