// resources/js/pages/user/dashboard/sections/dashboard-overview.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Greeting, the four counts worth acting on, and the single next appointment.
// The "up next" strip exists because the most common question a patient opens
// this page with is "who is going where, and when" — answering it above the
// fold means the board underneath is for planning, not for hunting.

import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Hourglass,
    Sun,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { StatTile } from '../components/stat-tile';
import type { AppointmentItem, Stats } from '../dashboard-data';
import {
    avatarColor,
    dashboardCopy,
    greetingFor,
    statTiles,
    statusTone,
} from '../dashboard-data';

const TILE_ICONS: Record<keyof Stats, ReactNode> = {
    upcoming: <CalendarDays size={19} aria-hidden="true" />,
    today: <Sun size={19} aria-hidden="true" />,
    confirmed: <CheckCircle2 size={19} aria-hidden="true" />,
    awaiting: <Hourglass size={19} aria-hidden="true" />,
};

interface DashboardOverviewProps {
    firstName: string;
    peopleCount: number;
    stats: Stats;
    nextUp: AppointmentItem | null;
}

export function DashboardOverview({
    firstName,
    peopleCount,
    stats,
    nextUp,
}: DashboardOverviewProps): ReactElement {
    const greeting = greetingFor(new Date().getHours());

    return (
        <section className="mb-8">
            {/* 32px of display type on a 390px screen costs two lines before
                the patient has read anything. Full size from `md` up. */}
            <h1 className="m-0 mb-1 font-display text-2xl font-extrabold tracking-tighter text-ink md:text-3xl">
                {greeting},{' '}
                <span className="text-wc-blue-600">{firstName}</span>
            </h1>
            <p className="m-0 mb-5 text-base text-ink-muted">
                {peopleCount > 1
                    ? dashboardCopy.subtitleMany(peopleCount)
                    : dashboardCopy.subtitleOne}
            </p>

            {/* Two up on a phone, four across from `md`. This was
                `auto-fit/minmax(180px, 1fr)`, which cannot fit two 180px
                columns into a 358px content box and so stacked all four into a
                single column — the patient scrolled past a full screen of
                counts to reach their appointments. */}
            <div
                className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${
                    nextUp ? 'mb-5' : ''
                }`}
            >
                {statTiles.map((tile) => (
                    <StatTile
                        key={tile.key}
                        value={stats[tile.key]}
                        label={tile.label}
                        color={tile.color}
                        icon={TILE_ICONS[tile.key]}
                    />
                ))}
            </div>

            {nextUp && <NextUpStrip appt={nextUp} />}
        </section>
    );
}

function NextUpStrip({ appt }: { appt: AppointmentItem }): ReactElement {
    const color = avatarColor(appt.patientKey);
    const tone = statusTone(appt.status);

    return (
        <div
            className="border-wc-blue-200 flex flex-wrap items-center gap-4 rounded-2xl border p-4 sm:px-5"
            style={{
                background:
                    'linear-gradient(135deg, var(--wc-blue-50) 0%, #ffffff 65%)',
            }}
        >
            <span
                aria-hidden="true"
                className="wc-who-avatar wc-who-avatar--lg"
                style={{ background: color.solid, color: '#fff' }}
            >
                {appt.patientInitials}
            </span>

            <div className="min-w-0 flex-[1_1_220px]">
                <p className="m-0 text-xs font-extrabold tracking-[0.09em] text-wc-blue-600 uppercase">
                    {dashboardCopy.nextUp.eyebrow}
                </p>
                <p className="m-0 mt-0.5 font-display text-base font-extrabold text-ink">
                    {appt.patientName}
                    {appt.patientRelation && (
                        <span className="ml-2 font-sans text-xs font-semibold text-ink-muted">
                            {appt.patientRelation}
                        </span>
                    )}
                </p>
                <p className="m-0 mt-0.5 text-sm text-ink-secondary">
                    {appt.service} · {appt.dayLabel} at {appt.time}
                </p>
            </div>

            {/* Full width below `sm` so the status pill and the CTA get a row
                of their own instead of being squeezed beside the name. */}
            <div className="flex w-full items-center gap-3 sm:w-auto">
                <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-xs font-extrabold tracking-[0.05em] uppercase"
                    style={{ background: tone.bg, color: tone.color }}
                >
                    <Clock3 size={13} aria-hidden="true" />
                    {tone.label}
                </span>
                <Link
                    href="/book"
                    className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill"
                >
                    {dashboardCopy.board.bookCta}
                </Link>
            </div>
        </div>
    );
}
