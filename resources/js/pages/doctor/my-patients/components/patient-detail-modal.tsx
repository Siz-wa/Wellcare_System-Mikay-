// resources/js/pages/user/my-patients/components/PatientDetailModal.tsx

import type { ReactElement, ReactNode } from 'react';
import {
    IconSearch,
    IconBell,
    IconClock,
    IconCheck,
} from '@/pages/doctor/icons';
import type { Patient } from '../my-patient-data';

interface ModalProps {
    patient: Patient;
    onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MiniIconBox({ children }: { children: ReactNode }): ReactElement {
    return (
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
                color: 'var(--wc-blue-600)',
                flexShrink: 0,
            }}
        >
            {children}
        </div>
    );
}

function VitalsCard({
    icon,
    label,
    value,
    unit,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    unit: string;
}): ReactElement {
    return (
        <div
            style={{
                background: 'var(--wc-gray-50)',
                border: '1px solid var(--wc-gray-100)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
            }}
        >
            <div style={{ color: 'var(--wc-blue-600)', marginBottom: '8px' }}>
                {icon}
            </div>
            <p
                style={{
                    margin: 0,
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--wc-gray-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}
            >
                {label}
            </p>
            <p
                style={{
                    margin: '4px 0 0 0',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--wc-dark)',
                }}
            >
                {value}{' '}
                <span
                    style={{
                        fontSize: '10px',
                        color: 'var(--wc-gray-400)',
                        fontWeight: 500,
                    }}
                >
                    {unit}
                </span>
            </p>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PatientDetailModal({
    patient,
    onClose,
}: ModalProps): ReactElement {
    // Safe extraction of weight number
    const weightValue = patient.weight ? patient.weight.split(' ')[0] : '--';

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    width: '100%',
                    maxWidth: '920px',
                    borderRadius: '28px',
                    padding: '40px',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                    border: '1px solid var(--wc-gray-100)',
                    display: 'grid',
                    gridTemplateColumns: '300px 1fr',
                    gap: '40px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - FIXED Syntax */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--wc-gray-300)',
                    }}
                >
                    <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* LEFT COLUMN: Profile & Stats */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                        }}
                    >
                        <div
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: patient.avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                fontWeight: 700,
                                color: 'white',
                            }}
                        >
                            {patient.initials}
                        </div>
                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: '20px',
                                    fontWeight: 800,
                                    color: 'var(--wc-dark)',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {patient.name}
                            </h2>
                            <p
                                style={{
                                    margin: '2px 0 0',
                                    color: 'var(--wc-gray-400)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                }}
                            >
                                ID: {patient.patientId}
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            padding: '24px',
                            border: '1px solid var(--wc-gray-100)',
                            borderRadius: '20px',
                        }}
                    >
                        <h3
                            style={{
                                margin: '0 0 20px 0',
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--wc-gray-400)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}
                        >
                            Personal Info
                        </h3>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}
                            >
                                <MiniIconBox>
                                    <IconBell />
                                </MiniIconBox>
                                <div>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '10px',
                                            color: 'var(--wc-gray-400)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        BIRTH DATE
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--wc-dark)',
                                        }}
                                    >
                                        {patient.birthDate}
                                    </p>
                                </div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}
                            >
                                <MiniIconBox>
                                    <IconSearch />
                                </MiniIconBox>
                                <div>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '10px',
                                            color: 'var(--wc-gray-400)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        EMAIL
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--wc-dark)',
                                        }}
                                    >
                                        {patient.email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            padding: '24px',
                            border: '1px solid var(--wc-gray-100)',
                            borderRadius: '20px',
                        }}
                    >
                        <h3
                            style={{
                                margin: '0 0 20px 0',
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--wc-gray-400)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}
                        >
                            Latest Vitals
                        </h3>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                            }}
                        >
                            <VitalsCard
                                icon={<IconBell />}
                                label="Pulse"
                                value="72"
                                unit="bpm"
                            />
                            <VitalsCard
                                icon={<IconSearch />}
                                label="BP"
                                value="120/80"
                                unit="mmHg"
                            />
                            <VitalsCard
                                icon={<IconClock />}
                                label="Sugar"
                                value="95"
                                unit="mg/dL"
                            />
                            <VitalsCard
                                icon={<IconCheck />}
                                label="Weight"
                                value={weightValue}
                                unit="kg"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Insurance & History */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                    }}
                >
                    <div
                        style={{
                            padding: '24px',
                            border: '1px solid var(--wc-gray-100)',
                            borderRadius: '20px',
                        }}
                    >
                        <h3
                            style={{
                                margin: '0 0 20px 0',
                                fontSize: '11px',
                                fontWeight: 800,
                                color: 'var(--wc-gray-400)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}
                        >
                            Insurance & Coverage
                        </h3>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--wc-gray-50)',
                                padding: '16px 20px',
                                borderRadius: '16px',
                                border: '1px solid var(--wc-gray-100)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    alignItems: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: '#EFF6FF',
                                        color: 'var(--wc-blue-600)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <IconCheck />
                                </div>
                                <div>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: 'var(--wc-dark)',
                                        }}
                                    >
                                        PhilHealth Premium
                                    </p>
                                    <p
                                        style={{
                                            margin: '2px 0 0 0',
                                            fontSize: '12px',
                                            color: 'var(--wc-gray-400)',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Member ID: 1902-3344-5566
                                    </p>
                                </div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#dcfce7',
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    border: '1px solid #bbf7d0',
                                }}
                            >
                                <div
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#15803d',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#15803d',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            padding: '24px',
                            border: '1px solid var(--wc-gray-100)',
                            borderRadius: '20px',
                            flex: 1,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: 'var(--wc-gray-400)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}
                            >
                                Medical History
                            </h3>
                            <button
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '12px',
                                    color: 'var(--wc-blue-600)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                View All History
                            </button>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}
                        >
                            <div
                                style={{
                                    padding: '16px',
                                    background: 'var(--wc-gray-50)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--wc-gray-100)',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: 'var(--wc-dark)',
                                    }}
                                >
                                    Hypertension Diagnosis
                                </p>
                                <p
                                    style={{
                                        margin: '4px 0 0 0',
                                        fontSize: '12px',
                                        color: 'var(--wc-gray-400)',
                                        fontWeight: 500,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Lisinopril 10mg daily since Jan 2026.
                                    Patient reports stable blood pressure
                                    readings.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                height: '48px',
                                padding: '0 28px',
                                borderRadius: '14px',
                                background: 'var(--wc-gray-50)',
                                color: 'var(--wc-dark)',
                                fontWeight: 700,
                                border: '1px solid var(--wc-gray-100)',
                                cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                        <button
                            style={{
                                height: '48px',
                                padding: '0 28px',
                                borderRadius: '14px',
                                background: 'var(--wc-blue-600)',
                                color: 'white',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Edit Records
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
