export const colors = {
    brand: {
        primary: '#0056b3',
        secondary: '#00a8e8',
        accent: '#f8f9fa',
        dark: '#1a1a1a',
    },

    blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#0056b3',
        700: '#004494',
        800: '#003370',
        900: '#001f45',
    },

    sky: {
        400: '#38bdf8',
        500: '#00a8e8',
        600: '#0284c7',
    },

    gray: {
        50: '#f8f9fa',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
    },

    semantic: {
        success: '#16a34a',
        successLight: '#dcfce7',
        successDark: '#15803d',
        warning: '#ca8a04',
        warningLight: '#fef9c3',
        warningDark: '#a16207',
        error: '#dc2626',
        errorLight: '#fee2e2',
        errorDark: '#b91c1c',
        info: '#2563eb',
        infoLight: '#dbeafe',
        infoDark: '#1d4ed8',
    },
} as const;

/**
 * Mirrors the CSS custom properties defined in resources/css/app.css (@theme)
 * and resources/css/tokens.css. Prefer `var(--text-*)` in styles; this object
 * exists for the few places that need the value in JS.
 *
 * The scale is floored at 14px — nothing in the product renders smaller — and
 * is expressed in rem so it scales with both the browser's font-size setting
 * and the in-app Text size control.
 */
export const typography = {
    fontSans:
        '"Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif',
    fontDisplay:
        '"Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif',
    fontMono: '"Atkinson Hyperlegible Mono", ui-monospace, Consolas, monospace',

    /** @deprecated use `fontSans` */
    fontBody:
        '"Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif',

    size: {
        xs: '0.875rem', // 14px — floor
        sm: '0.9375rem', // 15px
        base: '1.0625rem', // 17px
        lg: '1.1875rem', // 19px
        xl: '1.375rem', // 22px
        '2xl': '1.625rem', // 26px
        '3xl': '2rem', // 32px
        '4xl': '2.5rem', // 40px
        '5xl': '3.0625rem', // 49px
        '6xl': '3.8125rem', // 61px
        '7xl': '4.75rem', // 76px
    },

    weight: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },

    leading: {
        none: 1,
        tight: 1.2,
        snug: 1.35,
        normal: 1.5,
        relaxed: 1.65,
        loose: 1.8,
    },

    tracking: {
        tightest: '-0.022em',
        tighter: '-0.016em',
        tight: '-0.008em',
        normal: '0',
        wide: '0.02em',
        wider: '0.06em',
        widest: '0.1em',
    },

    /** Reading measure caps for long-form clinical prose. */
    measure: {
        narrow: '45ch',
        base: '68ch',
        wide: '80ch',
    },
} as const;

/**
 * Semantic text colors. Every value is >= 7:1 on white (WCAG AAA for normal
 * text). Do not colour text from `colors.gray` — gray-400 is 2.56:1 and
 * gray-500 is 4.36:1 on the app background, both of which fail.
 */
export const textColors = {
    primary: '#0f172a', // 17.85:1
    secondary: '#334155', // 10.35:1
    muted: '#475569', //  7.58:1
    inverse: '#ffffff',
    mutedInverse: '#cbd5e1', // 12.02:1 on gray-900
    link: '#0056b3', //  7.04:1
    linkHover: '#003370', // 12.30:1
    success: '#166534', //  7.13:1
    warning: '#713f12', //  8.67:1
    error: '#991b1b', //  8.31:1
    info: '#1e40af', //  8.72:1
} as const;

export const spacing = {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
} as const;

export const radius = {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    '4xl': '2rem',
    '5xl': '2.5rem',
    full: '9999px',
} as const;

export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.09)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.18)',
    brand: '0 16px 40px -8px rgb(0 86 179 / 0.28)',
    sky: '0 16px 40px -8px rgb(0 168 232 / 0.22)',
} as const;

export const zIndex = {
    base: 1,
    raised: 10,
    overlay: 100,
    modal: 1000,
    toast: 2000,
    nav: 5000,
} as const;

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1440px',
} as const;

export const layout = {
    containerXl: '1280px',
    sidebarWidth: '260px',
    headerHeight: '72px',
} as const;
