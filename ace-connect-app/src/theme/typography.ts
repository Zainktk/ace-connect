export const typography = {
    // Font Families (using system fonts for now, can add Google Fonts later)
    fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
        semibold: 'System',
    },

    // Font Sizes
    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        md: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        xxl: 24,
        '3xl': 30,
        xxxl: 30,
        '4xl': 36,
        '5xl': 48,
    },

    // Font Weights
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },

    // Line Heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    xxl: 48,
    '3xl': 64,
};

export const borderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
};
