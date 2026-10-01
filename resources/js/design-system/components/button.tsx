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
            title,
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

        const isDisabled = Boolean(disabled || loading);

        const button = (
            <button
                ref={ref}
                className={classes}
                disabled={isDisabled}
                aria-busy={loading}
                title={title}
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

        // A `title` on a disabled button is unreachable: browsers fire no mouse
        // events on a disabled control, so the tooltip never opens and the
        // reason for the refusal stays in the DOM where only a developer finds
        // it. The 2026-09-11 governance walkthrough caught this on the peer
        // admin row (T-03) — the wording was exactly right and no user could
        // ever read it.
        //
        // Wrapping in an enabled element that carries the same title restores
        // hover without re-enabling anything. Applied here rather than at each
        // call site so every disabled-with-a-reason button in the app is fixed
        // at once.
        //
        // `disabled` only, never `loading`: a loading button is momentary and
        // its spinner already explains itself, while wrapping one would put an
        // inline-flex span around a `w-full` submit and collapse it to its
        // content width mid-request.
        if (disabled && !loading && title) {
            return (
                <span className="wc-btn-hint" title={title}>
                    {button}
                </span>
            );
        }

        return button;
    },
);

Button.displayName = 'Button';
