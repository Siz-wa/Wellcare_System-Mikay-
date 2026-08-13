import React from 'react';

type BadgeVariant =
    | 'primary'
    | 'sky'
    | 'success'
    | 'warning'
    | 'error'
    | 'neutral'
    | 'dark';

interface BadgeProps {
    variant?: BadgeVariant;
    dot?: boolean;
    children: React.ReactNode;
    className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
    primary: 'wc-badge-primary',
    sky: 'wc-badge-sky',
    success: 'wc-badge-success',
    warning: 'wc-badge-warning',
    error: 'wc-badge-error',
    neutral: 'wc-badge-neutral',
    dark: 'wc-badge-dark',
};

export const Badge: React.FC<BadgeProps> = ({
    variant = 'primary',
    dot = false,
    children,
    className = '',
}) => {
    return (
        <span className={`wc-badge ${variantMap[variant]} ${className}`}>
            {dot && (
                <span
                    aria-hidden="true"
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '9999px',
                        background: 'currentColor',
                        display: 'inline-block',
                        flexShrink: 0,
                    }}
                />
            )}
            {children}
        </span>
    );
};
