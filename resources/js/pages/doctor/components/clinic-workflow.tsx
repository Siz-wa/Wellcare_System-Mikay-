// resources/js/pages/user/dashboard/components/clinic-workflow.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Clinic Workflow card — steps stagger in from the left when scrolled into view.
// Step number bubble has a subtle "pulse" on hover.

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useInView } from '@/hooks/useInView';
import { workflowSteps, dashboardMeta } from '../dashboard-data';
import type { WorkflowStep } from '../dashboard-data';
import { WorkflowIcon } from '../icons';
import { IconArrowRight } from '../icons';

// ── Single step row ───────────────────────────────────────────────────────────

interface WorkflowRowProps {
    step: WorkflowStep;
    delay: number;
    inView: boolean;
}

function WorkflowRow({ step, delay, inView }: WorkflowRowProps): ReactElement {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--wc-gray-100)',
                // Staggered slide-in
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(-16px)',
                transition: `opacity 400ms var(--ease-out) ${delay}ms,
                     transform 400ms var(--ease-out) ${delay}ms`,
                cursor: 'default',
            }}
        >
            {/* Step number bubble */}
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-full)',
                    background: hovered
                        ? 'var(--wc-blue-600)'
                        : 'var(--wc-gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: hovered ? '#ffffff' : 'var(--wc-gray-600)',
                    flexShrink: 0,
                    marginTop: 2,
                    transition:
                        'background 200ms var(--ease-out), color 200ms var(--ease-out)',
                }}
            >
                {step.step}
            </div>

            {/* Icon tile */}
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-lg)',
                    background: hovered
                        ? 'var(--wc-blue-100)'
                        : 'var(--wc-blue-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--wc-blue-600)',
                    flexShrink: 0,
                    transition:
                        'background 200ms var(--ease-out), transform 200ms var(--ease-spring)',
                    transform: hovered ? 'scale(1.1)' : 'scale(1)',
                }}
            >
                <WorkflowIcon iconKey={step.iconKey} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: hovered
                            ? 'var(--wc-blue-600)'
                            : 'var(--wc-dark)',
                        lineHeight: 1.3,
                        transition: 'color 200ms var(--ease-out)',
                    }}
                >
                    {step.title}
                </p>
                <p
                    style={{
                        margin: 'var(--space-1) 0 0',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--wc-gray-500)',
                        lineHeight: 1.4,
                    }}
                >
                    {step.description}
                </p>
            </div>
        </div>
    );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function ClinicWorkflow(): ReactElement {
    const meta = dashboardMeta;
    const { ref, inView } = useInView(0.1);

    return (
        <div
            ref={ref}
            className="wc-card"
            style={{
                padding: 'var(--space-6)',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition:
                    'opacity 500ms var(--ease-out) 100ms, transform 500ms var(--ease-out) 100ms',
                willChange: 'transform, opacity',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-2)',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        color: 'var(--wc-dark)',
                    }}
                >
                    {meta.clinicWorkflowTitle}
                </h2>
                <a
                    href="/reports"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--wc-sky-500)',
                        textDecoration: 'none',
                        transition: 'color 150ms var(--ease-out)',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color =
                            'var(--wc-blue-600)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color =
                            'var(--wc-sky-500)';
                    }}
                >
                    {meta.viewAll} <IconArrowRight />
                </a>
            </div>

            <div>
                {workflowSteps.map((step, i) => (
                    <WorkflowRow
                        key={step.id}
                        step={step}
                        delay={i * 70}
                        inView={inView}
                    />
                ))}
            </div>
        </div>
    );
}
