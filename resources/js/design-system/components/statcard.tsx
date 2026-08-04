import React from 'react';

interface StatCardProps {
    value: string | number;
    label: string;
    delta?: {
        value: string;
        direction: 'up' | 'down';
    };
    icon?: React.ReactNode;
    iconVariant?:
        | 'primary'
        | 'sky'
        | 'success'
        | 'warning'
        | 'error'
        | 'purple'
        | 'cyan'
        | 'emerald';
    className?: string;
}

const iconVariantMap: Record<string, string> = {
    primary: 'wc-icon-tile-primary',
    sky: 'wc-icon-tile-sky',
    success: 'wc-icon-tile-success',
    warning: 'wc-icon-tile-warning',
    error: 'wc-icon-tile-error',
    purple: 'wc-icon-tile-purple',
    cyan: 'wc-icon-tile-cyan',
    emerald: 'wc-icon-tile-emerald',
};

const ArrowUp = () => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
    >
        <path d="m18 15-6-6-6 6" />
    </svg>
);

const ArrowDown = () => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
);

export const StatCard: React.FC<StatCardProps> = ({
    value,
    label,
    delta,
    icon,
    iconVariant = 'primary',
    className = '',
}) => (
    <div className={`wc-card wc-card-body ${className}`}>
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-4)',
            }}
        >
            <div className="wc-stat">
                <p className="wc-stat-value">{value}</p>
                <p className="wc-stat-label">{label}</p>
                {delta && (
                    <span
                        className={`wc-stat-delta wc-stat-delta-${delta.direction}`}
                    >
                        {delta.direction === 'up' ? <ArrowUp /> : <ArrowDown />}
                        {delta.value}
                    </span>
                )}
            </div>
            {icon && (
                <div
                    className={`wc-icon-tile wc-icon-tile-lg ${iconVariantMap[iconVariant]}`}
                >
                    {icon}
                </div>
            )}
        </div>
    </div>
);
