// resources/js/pages/admin/services/sections/service-table.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The catalogue as an administrator sees it: every service, retired ones
// included, in the order patients meet them.

import { router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Button } from '@/design-system';
import { servicesCopy } from '@/pages/admin/services/services-data';
import type { AdminServiceRow } from '@/pages/admin/services/services-data';

interface ServiceTableProps {
    services: AdminServiceRow[];
    onEdit: (service: AdminServiceRow) => void;
}

const cellStyle = {
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--wc-gray-100)',
    verticalAlign: 'top' as const,
};

const headStyle = {
    padding: 'var(--space-3) var(--space-4)',
    textAlign: 'left' as const,
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: 'var(--wc-text-muted)',
    borderBottom: '1px solid var(--wc-gray-200)',
    whiteSpace: 'nowrap' as const,
};

export function ServiceTable({
    services,
    onEdit,
}: ServiceTableProps): ReactElement {
    const toggle = (service: AdminServiceRow) => {
        router.post(
            `/admin/services/${service.id}/toggle`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <div
            style={{
                background: 'var(--wc-surface)',
                border: '1px solid var(--wc-gray-200)',
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >
            {/* The whole table scrolls sideways on a narrow screen rather than
                squeezing the description column to nothing. */}
            <div style={{ overflowX: 'auto' }}>
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: 760,
                    }}
                >
                    <thead>
                        <tr>
                            <th style={headStyle}>Service</th>
                            <th style={headStyle}>Who may take it</th>
                            <th style={headStyle}>Rules</th>
                            <th style={headStyle}>Booked</th>
                            <th style={{ ...headStyle, textAlign: 'right' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {services.map((service) => (
                            <tr
                                key={service.id}
                                style={{
                                    // A retired service stays legible but reads
                                    // as switched off at a glance.
                                    opacity: service.isActive ? 1 : 0.55,
                                }}
                            >
                                <td style={cellStyle}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                color: 'var(--wc-text-primary)',
                                            }}
                                        >
                                            {service.name}
                                        </span>
                                        {!service.isActive && (
                                            <Badge variant="neutral">
                                                Retired
                                            </Badge>
                                        )}
                                    </div>

                                    <p
                                        style={{
                                            margin: '4px 0 0',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-text-muted)',
                                            maxWidth: 420,
                                        }}
                                    >
                                        {service.description}
                                    </p>

                                    <code
                                        style={{
                                            display: 'inline-block',
                                            marginTop: 6,
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-text-secondary)',
                                        }}
                                    >
                                        {service.slug}
                                    </code>
                                </td>

                                <td
                                    style={{
                                        ...cellStyle,
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-text-secondary)',
                                    }}
                                >
                                    {service.specialtyLabels.length > 0
                                        ? service.specialtyLabels.join(', ')
                                        : servicesCopy.anyDoctorLabel}
                                </td>

                                <td style={cellStyle}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 4,
                                        }}
                                    >
                                        {service.requiresInPerson && (
                                            <Badge variant="warning">
                                                In person
                                            </Badge>
                                        )}
                                        {service.restrictedToSex ===
                                            'female' && (
                                            <Badge variant="sky">
                                                Female only
                                            </Badge>
                                        )}
                                        {service.restrictedToSex === 'male' && (
                                            <Badge variant="sky">
                                                Male only
                                            </Badge>
                                        )}
                                        {service.minAge != null && (
                                            <Badge variant="sky">
                                                {service.minAge}+
                                            </Badge>
                                        )}
                                        {service.maxAge !== null && (
                                            <Badge variant="sky">
                                                Under {service.maxAge + 1}
                                            </Badge>
                                        )}
                                        {!service.requiresInPerson &&
                                            service.restrictedToSex === null &&
                                            service.maxAge === null &&
                                            service.minAge == null && (
                                                <span
                                                    style={{
                                                        fontSize:
                                                            'var(--text-xs)',
                                                        color: 'var(--wc-text-muted)',
                                                    }}
                                                >
                                                    None
                                                </span>
                                            )}
                                    </div>
                                </td>

                                <td
                                    style={{
                                        ...cellStyle,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        color: 'var(--wc-text-secondary)',
                                    }}
                                >
                                    {service.bookings}
                                </td>

                                <td
                                    style={{ ...cellStyle, textAlign: 'right' }}
                                >
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            gap: 'var(--space-2)',
                                        }}
                                    >
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onEdit(service)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={
                                                service.isActive
                                                    ? 'ghost'
                                                    : 'secondary'
                                            }
                                            onClick={() => toggle(service)}
                                        >
                                            {service.isActive
                                                ? 'Retire'
                                                : 'Offer again'}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {services.length === 0 && (
                <p
                    style={{
                        margin: 0,
                        padding: 'var(--space-8)',
                        textAlign: 'center',
                        color: 'var(--wc-text-muted)',
                        fontSize: 'var(--text-sm)',
                    }}
                >
                    No services yet. Add the first one patients can book.
                </p>
            )}
        </div>
    );
}
