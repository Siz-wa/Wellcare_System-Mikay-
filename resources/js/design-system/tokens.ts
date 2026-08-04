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

export const typography = {
    fontDisplay: '"Bricolage Grotesque", sans-serif',
    fontBody: '"DM Sans", sans-serif',

    size: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
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
        tight: 1.1,
        snug: 1.3,
        normal: 1.5,
        relaxed: 1.7,
    },
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
