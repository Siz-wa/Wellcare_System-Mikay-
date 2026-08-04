import React from 'react';

type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'white'
    | 'dark';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    pill?: boolean;
    loading?: boolean;
    iconOnly?: boolean;
    asChild?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
    primary: 'wc-btn-primary',
    secondary: 'wc-btn-secondary',
    outline: 'wc-btn-outline',
    ghost: 'wc-btn-ghost',
    danger: 'wc-btn-danger',
    white: 'wc-btn-white',
    dark: 'wc-btn-dark',
};

const sizeMap: Record<ButtonSize, string> = {
    xs: 'wc-btn-xs',
    sm: 'wc-btn-sm',
    md: 'wc-btn-md',
    lg: 'wc-btn-lg',
    xl: 'wc-btn-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            pill = false,
            loading = false,
            iconOnly = false,
            leftIcon,
            rightIcon,
            children,
            className = '',
            disabled,
            ...props
        },
        ref,
    ) => {
        const classes = [
            'wc-btn',
            variantMap[variant],
            iconOnly ? 'wc-btn-icon' : sizeMap[size],
            pill ? 'wc-btn-pill' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                ref={ref}
                className={classes}
                disabled={disabled || loading}
                aria-busy={loading}
                {...props}
            >
                {loading ? (
                    <span
                        className="wc-spinner wc-spinner-sm"
                        aria-hidden="true"
                    />
                ) : leftIcon ? (
                    <span className="wc-btn-icon-left" aria-hidden="true">
                        {leftIcon}
                    </span>
                ) : null}

                {children}

                {!loading && rightIcon && (
                    <span className="wc-btn-icon-right" aria-hidden="true">
                        {rightIcon}
                    </span>
                )}
            </button>
        );
    },
);

Button.displayName = 'Button';
