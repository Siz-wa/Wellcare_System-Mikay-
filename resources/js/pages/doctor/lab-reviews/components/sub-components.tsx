// resources/js/pages/user/lab-reviews/components/sub-components.tsx

import type { ReactElement } from 'react';
import { IconCheck, IconPlus } from '@/pages/doctor/icons';
import type { Parameter } from './type';

export const SectionHeader = ({ title }: { title: string }) => (
    <h3
        style={{
            margin: '0 0 16px 0',
            fontSize: 'var(--text-xs)',
            fontWeight: 800,
            color: 'var(--wc-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
        }}
    >
        {title}
    </h3>
);

export const InfoTile = ({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: ReactElement;
}) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
            style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'var(--wc-gray-50)',
                border: '1px solid var(--wc-gray-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--wc-text-muted)',
            }}
        >
            {icon}
        </div>
        <div style={{ lineHeight: 1.2 }}>
            <p
                style={{
                    margin: 0,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--wc-text-muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </p>
            <p
                style={{
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--wc-text-primary)',
                }}
            >
                {value}
            </p>
        </div>
    </div>
);

export const ParameterRow = ({ param }: { param: Parameter }) => {
    const isAbnormal = param.status === 'abnormal';

    return (
        <tr style={{ background: 'var(--wc-gray-50)' }}>
            <td
                style={{
                    padding: '14px 16px',
                    fontWeight: 600,
                    borderRadius: '12px 0 0 12px',
                    border: '1px solid var(--wc-gray-100)',
                    borderRight: 'none',
                }}
            >
                {param.name}
            </td>
            <td
                style={{
                    padding: '14px 0',
                    fontWeight: 700,
                    borderTop: '1px solid var(--wc-gray-100)',
                    borderBottom: '1px solid var(--wc-gray-100)',
                }}
            >
                {param.result}{' '}
                <span
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {param.unit}
                </span>
            </td>
            <td
                style={{
                    padding: '14px 0',
                    color: 'var(--wc-text-muted)',
                    borderTop: '1px solid var(--wc-gray-100)',
                    borderBottom: '1px solid var(--wc-gray-100)',
                }}
            >
                {param.refRange}
            </td>
            <td
                style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderRadius: '0 12px 12px 0',
                    border: '1px solid var(--wc-gray-100)',
                    borderLeft: 'none',
                    color: isAbnormal ? 'var(--wc-error)' : 'var(--wc-success)',
                }}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                    }}
                >
                    {isAbnormal ? <IconPlus /> : <IconCheck />}
                    {/* In words as well as colour: colour alone is not read
                        by a screen reader or by a colour-blind reviewer. */}
                    {isAbnormal ? 'Out of range' : 'Normal'}
                </span>
            </td>
        </tr>
    );
};
