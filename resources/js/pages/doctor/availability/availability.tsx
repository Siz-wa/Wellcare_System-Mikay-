// resources/js/pages/doctor/availability/availability.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Doctor availability — thin composer. All copy lives in availability-data.ts.
//
// Served by Doctor\AvailabilityController@index. Writes go through
// AvailabilityService, which busts the doctor's slot cache across the whole
// booking window — a weekly block changes many dates, not one.

import type { ReactElement } from 'react';
import { DashboardLayout } from '@/pages/doctor/layout/dashboard-layout';
import type { PageProps } from '@/types';
import { availabilityMeta } from './availability-data';
import type { TimeOffEntry, WeeklyBlock } from './availability-data';
import { TimeOff } from './sections/time-off';
import { WeeklyHours } from './sections/weekly-hours';

interface PageData extends PageProps {
    weekly: WeeklyBlock[];
    timeOff: TimeOffEntry[];
    dailyCap: number;
}

export default function AvailabilityPage({
    weekly,
    timeOff,
    dailyCap,
}: PageData): ReactElement {
    const meta = availabilityMeta;

    return (
        <DashboardLayout activeId={meta.activeNavId}>
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

            {/* Remount the editor whenever the server sends a new schedule, so
                its local drafts never drift from what was actually saved. */}
            <WeeklyHours
                key={`${weekly.map((b) => b.isoDay).join('-')}:${dailyCap}`}
                weekly={weekly}
                dailyCap={dailyCap}
            />

            <TimeOff entries={timeOff} />
        </DashboardLayout>
    );
}
