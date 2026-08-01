// resources/js/pages/user/dashboard/dashboard.tsx
import type { ReactElement } from 'react';
import {
    StatCards,
    AppointmentList,
    PatientActivity,
    PendingLabReviews,
} from './components';
import { dashboardMeta } from './dashboard-data';
import { DashboardLayout } from './layout/dashboard-layout';

export default function DashboardPage(): ReactElement {
    const meta = dashboardMeta;

    return (
        <DashboardLayout activeId="dashboard">
            <div
                style={{
                    padding: '32px',
                    maxWidth: '1500px',
                    margin: '0 auto',
                }}
            >
                {/* ── Page Header ────────────────────────────────────────────────── */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginBottom: '32px',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                margin: 0,
                                fontSize: '32px',
                                fontWeight: 700,
                                color: '#1f1f1f',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {meta.greeting}{' '}
                            <span style={{ color: '#1a73e8' }}>
                                {meta.greetingName}
                            </span>
                        </h1>
                        <p
                            style={{
                                margin: '4px 0 0 0',
                                color: '#70757a',
                                fontSize: '15px',
                            }}
                        >
                            {meta.subtitle}
                        </p>
                    </div>

                    <button
                        style={{
                            background: '#0056b3',
                            color: '#ffffff',
                            padding: '10px 24px',
                            borderRadius: '100px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                    >
                        + {meta.newAppointmentLabel}
                    </button>
                </div>

                {/* ── Stat Section ────────────────────────────────────────────────── */}
                <StatCards />

                {/* ── Main Grid ──────────────────────────────────────────────────── */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1.6fr 1fr', // Fixes the "too wide" issue
                        gap: '24px',
                        alignItems: 'start',
                    }}
                >
                    {/* Left Column */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                        }}
                    >
                        <PatientActivity />
                        <AppointmentList />
                    </div>

                    {/* Right Column */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                        }}
                    >
                        <PendingLabReviews />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
