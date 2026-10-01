// resources/js/pages/user/dashboard/sections/appointment-board.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The board. The old dashboard rendered every upcoming appointment as one flat
// stack of identical cards: no patient name anywhere, no date separators, and
// the same-day rows in lexical time order because `appointment_time` is a
// varchar. This replaces all three:
//
//   · sticky day separators, one section per calendar date, in real time order
//   · a person filter and a "by person" cut for accounts with several patients
//   · every card leads with who it is for
//
// Filtering is deliberately client-side: the whole upcoming set already ships
// in the Inertia payload, so a round trip per keystroke would be slower and
// would lose the patient's scroll position.

import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    CalendarRange,
    History,
    Search,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { AppointmentCard } from '../components/appointment-card';
import { EmptyState } from '../components/empty-state';
import { PatientChip } from '../components/patient-chip';
import type {
    AppointmentItem,
    GroupMode,
    PatientSummary,
} from '../dashboard-data';
import {
    BUCKET_TONE,
    avatarColor,
    dashboardCopy,
    groupByDay,
    groupByPerson,
    matchesSearch,
} from '../dashboard-data';

interface AppointmentBoardProps {
    appointments: AppointmentItem[];
    patients: PatientSummary[];
    historyCount: number;
    onOpenHistory: () => void;
    onCancel: (id: number) => void;
    onReschedule: (appt: AppointmentItem) => void;
}

export function AppointmentBoard({
    appointments,
    patients,
    historyCount,
    onOpenHistory,
    onCancel,
    onReschedule,
}: AppointmentBoardProps): ReactElement {
    const [mode, setMode] = useState<GroupMode>('date');
    const [search, setSearch] = useState('');
    const [personKey, setPersonKey] = useState<string | null>(null);

    // More than one person on the account is what makes grouping worth the
    // controls; a single patient gets the date view with no chrome around it.
    const isFamily = patients.length > 1;

    const visible = appointments.filter(
        (appt) =>
            (personKey === null || appt.patientKey === personKey) &&
            matchesSearch(appt, search),
    );

    const isFiltered = search.trim() !== '' || personKey !== null;

    function clearFilters(): void {
        setSearch('');
        setPersonKey(null);
    }

    return (
        <section className="wc-board">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-xl)',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: 'var(--wc-text-primary)',
                    }}
                >
                    {dashboardCopy.board.title}
                </h2>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {historyCount > 0 && (
                        <button
                            type="button"
                            onClick={onOpenHistory}
                            className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill"
                            style={{ gap: 6 }}
                        >
                            <History size={14} aria-hidden="true" />
                            {dashboardCopy.board.historyCta} ({historyCount})
                        </button>
                    )}
                    <Link
                        href="/book"
                        className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                    >
                        {dashboardCopy.board.bookCta}
                    </Link>
                </div>
            </div>

            {appointments.length === 0 ? (
                <EmptyState
                    icon={<CalendarDays size={26} aria-hidden="true" />}
                    title={dashboardCopy.empty.title}
                    body={dashboardCopy.empty.body}
                    action={
                        <Link
                            href="/book"
                            className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                        >
                            {dashboardCopy.empty.cta}
                        </Link>
                    }
                />
            ) : (
                <>
                    <div className="wc-board-toolbar">
                        {isFamily && (
                            <div
                                className="wc-seg"
                                role="group"
                                aria-label="Group appointments"
                            >
                                <button
                                    type="button"
                                    className="wc-seg-btn"
                                    aria-pressed={mode === 'date'}
                                    onClick={() => setMode('date')}
                                >
                                    <CalendarRange
                                        size={14}
                                        aria-hidden="true"
                                    />
                                    {dashboardCopy.board.groupByDate}
                                </button>
                                <button
                                    type="button"
                                    className="wc-seg-btn"
                                    aria-pressed={mode === 'person'}
                                    onClick={() => setMode('person')}
                                >
                                    <Users size={14} aria-hidden="true" />
                                    {dashboardCopy.board.groupByPerson}
                                </button>
                            </div>
                        )}

                        <div className="wc-board-search">
                            <span
                                className="wc-board-search-icon"
                                aria-hidden="true"
                            >
                                <Search size={15} />
                            </span>
                            <input
                                type="search"
                                className="wc-input"
                                aria-label="Search appointments"
                                placeholder={
                                    dashboardCopy.board.searchPlaceholder
                                }
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {isFamily && (
                        <div
                            className="wc-chiprow"
                            role="group"
                            aria-label="Filter by person"
                        >
                            <button
                                type="button"
                                className="wc-chip wc-chip--plain"
                                aria-pressed={personKey === null}
                                onClick={() => setPersonKey(null)}
                            >
                                {dashboardCopy.board.allPeople}
                                <span className="wc-chip-count">
                                    {appointments.length}
                                </span>
                            </button>

                            {patients.map((person) => {
                                const color = avatarColor(person.key);
                                const active = personKey === person.key;

                                return (
                                    <button
                                        key={person.key}
                                        type="button"
                                        className="wc-chip"
                                        aria-pressed={active}
                                        onClick={() =>
                                            setPersonKey(
                                                active ? null : person.key,
                                            )
                                        }
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="wc-chip-avatar"
                                            style={{
                                                background: color.bg,
                                                color: color.fg,
                                            }}
                                        >
                                            {person.initials}
                                        </span>
                                        {person.name}
                                        <span className="wc-chip-count">
                                            {person.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {visible.length === 0 ? (
                        <EmptyState
                            icon={<Search size={26} aria-hidden="true" />}
                            title={dashboardCopy.emptyFiltered.title}
                            body={dashboardCopy.emptyFiltered.body}
                            action={
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill"
                                >
                                    {dashboardCopy.emptyFiltered.cta}
                                </button>
                            }
                        />
                    ) : mode === 'date' ? (
                        <DayGroups
                            items={visible}
                            onCancel={onCancel}
                            onReschedule={onReschedule}
                        />
                    ) : (
                        <PersonGroups
                            items={visible}
                            onCancel={onCancel}
                            onReschedule={onReschedule}
                        />
                    )}

                    {isFiltered && visible.length > 0 && (
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            Showing {visible.length} of {appointments.length}{' '}
                            upcoming appointments.{' '}
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="wc-link"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    font: 'inherit',
                                    color: 'var(--wc-blue-600)',
                                    fontWeight: 700,
                                }}
                            >
                                Clear
                            </button>
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

// ── Grouped views ─────────────────────────────────────────────────────────────

function DayGroups({
    items,
    onCancel,
    onReschedule,
}: {
    items: AppointmentItem[];
    onCancel: (id: number) => void;
    onReschedule: (appt: AppointmentItem) => void;
}): ReactElement {
    return (
        <div>
            {groupByDay(items).map((day) => {
                const tone = BUCKET_TONE[day.bucket];

                return (
                    <div className="wc-group" key={day.rawDate}>
                        <div
                            className="wc-group-head"
                            style={{
                                borderColor: tone.border,
                                background: tone.background,
                            }}
                        >
                            <span
                                className="wc-group-head-marker"
                                style={{ background: tone.color }}
                                aria-hidden="true"
                            />
                            <div style={{ minWidth: 0 }}>
                                <h3
                                    className="wc-group-head-title"
                                    style={{ color: tone.color }}
                                >
                                    {day.dayLabel}
                                </h3>
                                <p className="wc-group-head-sub">
                                    {tone.note ?? day.fullDate}
                                </p>
                            </div>
                            <span className="wc-group-head-count">
                                {day.items.length}{' '}
                                {day.items.length === 1 ? 'visit' : 'visits'}
                            </span>
                        </div>

                        <div className="wc-appt-grid">
                            {day.items.map((appt) => (
                                <AppointmentCard
                                    key={appt.id}
                                    appt={appt}
                                    lead="time"
                                    showPatient
                                    onCancel={onCancel}
                                    onReschedule={onReschedule}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function PersonGroups({
    items,
    onCancel,
    onReschedule,
}: {
    items: AppointmentItem[];
    onCancel: (id: number) => void;
    onReschedule: (appt: AppointmentItem) => void;
}): ReactElement {
    return (
        <div>
            {groupByPerson(items).map((person) => (
                <div className="wc-group" key={person.key}>
                    <div className="wc-group-head">
                        <PatientChip
                            name={person.name}
                            initials={person.initials}
                            colorKey={person.key}
                            relation={person.relation}
                        />
                        <span className="wc-group-head-count">
                            {person.items.length}{' '}
                            {person.items.length === 1 ? 'visit' : 'visits'}
                        </span>
                    </div>

                    <div className="wc-appt-grid">
                        {person.items.map((appt) => (
                            <AppointmentCard
                                key={appt.id}
                                appt={appt}
                                lead="date"
                                showPatient={false}
                                onCancel={onCancel}
                                onReschedule={onReschedule}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
