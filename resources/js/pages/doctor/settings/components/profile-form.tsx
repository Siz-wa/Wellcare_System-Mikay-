import { doctorRoleLabel } from '@/lib/specialties';
import { AvatarTile } from '../../layout/components/avatar-tile';
import type { DoctorAccount } from '../settings-data';

export function ProfileForm({ doctor }: { doctor: DoctorAccount }) {
    const role = doctorRoleLabel(doctor);

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-6)',
                    marginBottom: 'var(--space-10)',
                }}
            >
                <div style={{ position: 'relative' }}>
                    <AvatarTile
                        initials={doctor.initials}
                        color={doctor.color}
                        size={84}
                        shape="circle"
                    />
                    <button
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#fff',
                            border: '1px solid var(--wc-gray-200)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        📷
                    </button>
                </div>
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {doctor.name}
                    </h3>
                    <p
                        style={{
                            margin: '4px 0 0',
                            color: 'var(--wc-gray-500)',
                            fontSize: '13px',
                        }}
                    >
                        {role}
                    </p>
                </div>
            </div>

            <h4 className="wc-settings-section-title">Personal Details</h4>

            <div className="wc-settings-row">
                <div>
                    <p
                        className="wc-label"
                        style={{
                            color: 'var(--wc-gray-400)',
                            fontSize: '10px',
                            marginBottom: '4px',
                        }}
                    >
                        Full Name
                    </p>
                    <p
                        style={{
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {doctor.name}
                    </p>
                </div>
                <button className="wc-btn wc-btn-xs wc-btn-outline">
                    Edit
                </button>
            </div>

            <div className="wc-settings-row">
                <div>
                    <p
                        className="wc-label"
                        style={{
                            color: 'var(--wc-gray-400)',
                            fontSize: '10px',
                            marginBottom: '4px',
                        }}
                    >
                        Email Address
                    </p>
                    <p
                        style={{
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {doctor.email}
                    </p>
                </div>
                <button className="wc-btn wc-btn-xs wc-btn-outline">
                    Edit
                </button>
            </div>

            <div className="wc-settings-row" style={{ borderBottom: 'none' }}>
                <div>
                    <p
                        className="wc-label"
                        style={{
                            color: 'var(--wc-gray-400)',
                            fontSize: '10px',
                            marginBottom: '4px',
                        }}
                    >
                        Phone Number
                    </p>
                    <p
                        style={{
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {doctor.phone ?? '—'}
                    </p>
                </div>
                <button className="wc-btn wc-btn-xs wc-btn-outline">
                    Edit
                </button>
            </div>

            <div
                style={{
                    marginTop: 'var(--space-10)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                }}
            >
                <button
                    className="wc-btn wc-btn-md wc-btn-outline"
                    style={{ border: '1px solid var(--wc-gray-200)' }}
                >
                    Cancel
                </button>
                <button
                    className="wc-btn wc-btn-md wc-btn-primary"
                    style={{ borderRadius: 'var(--radius-xl)' }}
                >
                    Save Changes
                </button>
            </div>
        </>
    );
}
