// resources/js/pages/nurse/lab-queue/lab-queue.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Staff Nurse lab queue — thin composer. All copy lives in lab-queue-data.ts.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { NurseDashboardLayout } from '@/pages/nurse/layout/nurse-dashboard-layout';
import type { PageProps } from '@/types';
import { RecordResultsModal } from './components/record-results-modal';
import { labQueueMeta } from './lab-queue-data';
import type {
    LabQueueItem,
    LabQueueStats,
    LabSeverity,
    ParameterDraft,
} from './lab-queue-data';
import { QueueList } from './sections/queue-list';
import { QueueStats } from './sections/queue-stats';

interface PageData extends PageProps {
    pending: LabQueueItem[];
    recent: LabQueueItem[];
    stats: LabQueueStats;
}

export default function LabQueuePage({
    pending,
    recent,
    stats,
}: PageData): ReactElement {
    const meta = labQueueMeta;

    const [selected, setSelected] = useState<LabQueueItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleClose(): void {
        setSelected(null);
        setErrors({});
    }

    function handleSubmit(payload: {
        parameters: ParameterDraft[];
        severity: LabSeverity;
        notes: string;
    }): void {
        if (!selected) {
            return;
        }

        setProcessing(true);

        router.post(`/nurse/lab-queue/${selected.id}/record`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setSelected(null);
                setErrors({});
            },
            onError: (formErrors) => setErrors(formErrors),
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <NurseDashboardLayout activeId={meta.activeNavId}>
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1
                    style={{
                        margin: '0 0 var(--space-1)',
                        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        color: 'var(--wc-dark)',
                        fontFamily: "var(--font-display,'Bricolage Grotesque')",
                    }}
                >
                    {meta.pageTitle}
                </h1>
                <p
                    style={{
                        margin: 0,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--wc-gray-500)',
                    }}
                >
                    {meta.pageSubtitle}
                </p>
            </div>

            <QueueStats stats={stats} />

            <QueueList
                title={meta.pendingCardTitle}
                items={pending}
                emptyMessage={meta.emptyPending}
                onRecord={setSelected}
            />

            <QueueList
                title={meta.recentCardTitle}
                items={recent}
                emptyMessage={meta.emptyRecent}
            />

            {selected !== null && (
                <RecordResultsModal
                    item={selected}
                    processing={processing}
                    errors={errors}
                    onClose={handleClose}
                    onSubmit={handleSubmit}
                />
            )}
        </NurseDashboardLayout>
    );
}
