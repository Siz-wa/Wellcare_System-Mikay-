// resources/js/pages/generals/doctors/sections/doctor-profile.tsx

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { DoctorAvatar } from '@/components/doctor-avatar';
import { useCanBook } from '@/hooks/use-can-book';
import { doctorRoleLabel } from '@/lib/specialties';
import type { DoctorSummary } from '@/lib/specialties';
import { book, doctors } from '@/routes';
import { doctorProfileCopy } from './doctors-data';

interface DoctorProfileSectionProps {
    doctor: DoctorSummary;
}

const CalendarIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

function Fact({
    label,
    value,
}: {
    label: string;
    value: string;
}): ReactElement {
    return (
        <div className="flex flex-col gap-1">
            <span
                className="text-xs font-bold tracking-[var(--tracking-widest)] uppercase"
                style={{ color: 'var(--wc-text-muted)' }}
            >
                {label}
            </span>
            <span
                className="text-sm font-semibold"
                style={{ color: 'var(--wc-text-primary)' }}
            >
                {value}
            </span>
        </div>
    );
}

/**
 * One doctor, as a patient reads them.
 *
 * The whole page is name, specialty, credentials, languages, clinic hours and a
 * short factual practice statement. Nothing else is published, and the closing
 * note says so out loud — see the copy comment in doctors-data.ts for the rule
 * behind that.
 */
export default function DoctorProfileSection({
    doctor,
}: DoctorProfileSectionProps): ReactElement {
    const copy = doctorProfileCopy;
    const canBook = useCanBook();
    const credentials = doctor.credentials;
    const schedules = doctor.schedules ?? [];

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
            <div className="wc-container">
                <Link
                    href={doctors()}
                    className="wc-link mb-6 inline-flex items-center gap-2 text-sm"
                >
                    ← {copy.backLabel}
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    {/* ── Identity ── */}
                    <div className="wc-card">
                        <div className="wc-card-body">
                            <div className="flex flex-wrap items-center gap-5">
                                <DoctorAvatar
                                    photoUrl={doctor.photo_url}
                                    initials={doctor.initials}
                                    color={doctor.color}
                                    name={doctor.name}
                                    size={112}
                                    className="shadow-[var(--shadow-md)]"
                                />

                                <div className="min-w-0">
                                    <p
                                        className="mb-1 text-xs font-bold tracking-[var(--tracking-widest)] uppercase"
                                        style={{ color: doctor.color }}
                                    >
                                        {doctorRoleLabel(doctor)}
                                    </p>
                                    <h1
                                        className="mb-2 text-[clamp(1.5rem,3vw,2.25rem)]"
                                        style={{
                                            color: 'var(--wc-text-primary)',
                                        }}
                                    >
                                        {doctor.name}
                                    </h1>

                                    {/* /book is gated role:user — for a doctor
                                        or any other staff account this was a
                                        button that led to a 403. */}
                                    {canBook && (
                                        <Link
                                            href={book({
                                                query: { doctor: doctor.id },
                                            })}
                                            className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                                        >
                                            {copy.bookLabel}
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {(doctor.bio ||
                                doctor.languages ||
                                doctor.practising_since) && (
                                <div className="mt-8">
                                    <h2 className="mb-3 text-base">
                                        {copy.aboutTitle}
                                    </h2>

                                    {doctor.bio && (
                                        <p
                                            className="mb-5 text-sm leading-[var(--leading-relaxed)]"
                                            style={{
                                                color: 'var(--wc-text-secondary)',
                                                maxWidth: '65ch',
                                            }}
                                        >
                                            {doctor.bio}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-8">
                                        {doctor.languages && (
                                            <Fact
                                                label={copy.languagesLabel}
                                                value={doctor.languages}
                                            />
                                        )}
                                        {doctor.practising_since && (
                                            <Fact
                                                label={copy.sinceLabel}
                                                value={String(
                                                    doctor.practising_since,
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Credentials + hours ── */}
                    <div className="flex flex-col gap-6">
                        {credentials?.prc_license_no && (
                            <div className="wc-card">
                                <div className="wc-card-body">
                                    <h2 className="mb-4 text-base">
                                        {copy.credentialsTitle}
                                    </h2>

                                    <div className="flex flex-col gap-4">
                                        <Fact
                                            label={copy.prcLabel}
                                            value={credentials.prc_license_no}
                                        />
                                        {credentials.board && (
                                            <Fact
                                                label={copy.boardLabel}
                                                value={credentials.board}
                                            />
                                        )}
                                        {credentials.verified_on && (
                                            <Fact
                                                label={copy.verifiedLabel}
                                                value={credentials.verified_on}
                                            />
                                        )}
                                    </div>

                                    <p
                                        className="mt-4 text-xs leading-[var(--leading-relaxed)]"
                                        style={{
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        {copy.verifyNote}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="wc-card">
                            <div className="wc-card-body">
                                <h2 className="mb-4 text-base">
                                    {copy.scheduleTitle}
                                </h2>

                                {schedules.length === 0 ? (
                                    <p
                                        className="text-sm"
                                        style={{
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        {copy.scheduleEmpty}
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {schedules.map((sched, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2 rounded-[var(--radius-lg)] px-3 py-2"
                                                style={{
                                                    background:
                                                        'var(--wc-gray-50)',
                                                    border: '1px solid var(--wc-gray-100)',
                                                }}
                                            >
                                                <span
                                                    className="mt-0.5 flex-shrink-0"
                                                    style={{
                                                        color: 'var(--wc-blue-600)',
                                                    }}
                                                >
                                                    <CalendarIcon />
                                                </span>
                                                <div>
                                                    <p
                                                        className="text-xs font-semibold"
                                                        style={{
                                                            color: 'var(--wc-text-secondary)',
                                                        }}
                                                    >
                                                        {sched.days}
                                                    </p>
                                                    <p
                                                        className="mt-0.5 text-xs"
                                                        style={{
                                                            color: 'var(--wc-text-muted)',
                                                        }}
                                                    >
                                                        {sched.hours}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <p
                    className="mt-8 text-xs leading-[var(--leading-relaxed)]"
                    style={{ color: 'var(--wc-text-muted)', maxWidth: '75ch' }}
                >
                    {copy.ethicsNote}
                </p>
            </div>
        </section>
    );
}
