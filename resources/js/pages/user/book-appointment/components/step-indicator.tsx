// resources/js/pages/generals/book-appointment/components/step-indicator.tsx

import type { ReactElement } from 'react';
import { STEPS } from '@/pages/user/book-appointment/sections/bookingdata';
import type { StepId } from '@/pages/user/book-appointment/sections/bookingdata';

interface StepIndicatorProps {
    current: StepId;
    completed: Set<StepId>;
}

// ── Step icons ────────────────────────────────────────────────────────────────

const IconCalendar = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconShield = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconClipboard = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
);

const IconCheck = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const STEP_ICONS: Record<StepId, () => ReactElement> = {
    1: IconCalendar,
    2: IconShield,
    3: IconClipboard,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function StepIndicator({
    current,
    completed,
}: StepIndicatorProps): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-10)',
                overflowX: 'auto',
                paddingBottom: 'var(--space-2)',
                gap: 0,
            }}
        >
            {STEPS.map((step, index) => {
                const isDone = completed.has(step.id);
                const isActive = step.id === current;
                const Icon = STEP_ICONS[step.id];

                return (
                    <div
                        key={step.id}
                        style={{ display: 'flex', alignItems: 'center' }}
                    >
                        {/* Bubble + label */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isDone
                                        ? 'var(--wc-blue-600)'
                                        : isActive
                                          ? 'var(--wc-blue-600)'
                                          : 'var(--wc-gray-100)',
                                    color:
                                        isDone || isActive
                                            ? '#ffffff'
                                            : 'var(--wc-gray-400)',
                                    border: isActive
                                        ? '2px solid var(--wc-sky-500)'
                                        : '2px solid transparent',
                                    boxShadow: isActive
                                        ? 'var(--shadow-brand)'
                                        : 'none',
                                    transition:
                                        'all var(--duration-slow) var(--ease-out)',
                                }}
                            >
                                {isDone ? <IconCheck /> : <Icon />}
                            </div>

                            <span
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive
                                        ? 'var(--wc-blue-600)'
                                        : isDone
                                          ? 'var(--wc-blue-700)'
                                          : 'var(--wc-gray-400)',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center',
                                    maxWidth: 80,
                                }}
                            >
                                {step.label}
                            </span>
                        </div>

                        {/* Connector */}
                        {index < STEPS.length - 1 && (
                            <div
                                style={{
                                    width: 64,
                                    height: 2,
                                    marginBottom: 22,
                                    flexShrink: 0,
                                    background: isDone
                                        ? 'var(--wc-blue-600)'
                                        : 'var(--wc-gray-200)',
                                    transition:
                                        'background var(--duration-slow) var(--ease-out)',
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
