// resources/js/pages/user/dashboard/components/progress-rail.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The five-node labelled timeline the old card carried was the widest thing in
// it and repeated on every row, which is part of why the list read as one
// undifferentiated block. Same information, compressed to a rail plus the name
// of the step you are actually on.

import type { ReactElement } from 'react';
import { stepsFor, statusTone } from '../dashboard-data';

export function ProgressRail({ status }: { status: string }): ReactElement {
    const steps = stepsFor(status);
    const index = steps.findIndex((step) => step.key === status);
    const tone = statusTone(status);
    const current = index >= 0 ? steps[index] : null;

    return (
        <div
            className="wc-steps"
            role="img"
            aria-label={
                current
                    ? `Step ${index + 1} of ${steps.length}: ${current.label}`
                    : tone.label
            }
        >
            <span className="wc-steps-track" aria-hidden="true">
                {steps.map((step, i) => (
                    <span
                        key={step.key}
                        className="wc-steps-dot"
                        style={
                            i <= index ? { background: tone.accent } : undefined
                        }
                    />
                ))}
            </span>
            <span className="wc-steps-label">
                {current
                    ? `${current.label} · ${index + 1}/${steps.length}`
                    : tone.label}
            </span>
        </div>
    );
}
