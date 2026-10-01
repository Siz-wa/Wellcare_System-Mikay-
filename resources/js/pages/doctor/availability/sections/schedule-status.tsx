// resources/js/pages/doctor/availability/sections/schedule-status.tsx
// ─────────────────────────────────────────────────────────────────────────────
// What the doctor needs to know before they read anything else on this page:
// whether their hours are actually live, and whether they are cleared to
// practise at all.
//
// This section exists because Phase 9 made the page capable of lying by
// omission. A doctor can save a week of hours, see all seven rows listed back,
// and still have nothing bookable — because the schedule is awaiting approval,
// or because their PRC licence lapsed overnight and the sweep withdrew their
// clearance. Neither had any visible cause on this screen.

import type { ReactElement } from 'react';
import { Alert } from '@/design-system';
import type { CredentialState, ScheduleApproval } from '../availability-data';
import { statusCopy } from '../availability-data';

interface ScheduleStatusProps {
    approval: ScheduleApproval;
    credential: CredentialState | null;
}

export function ScheduleStatus({
    approval,
    credential,
}: ScheduleStatusProps): ReactElement | null {
    const notices: ReactElement[] = [];

    // ── Credentialing comes first: it outranks the schedule entirely ─────────
    if (credential?.hasLapsed) {
        notices.push(
            <Alert key="lapsed" variant="error" title={statusCopy.lapsedTitle}>
                {statusCopy.lapsedBody(credential.prcExpiresOn)}
            </Alert>,
        );
    } else if (credential && !credential.isPublished) {
        notices.push(
            <Alert
                key="unpublished"
                variant="warning"
                title={statusCopy.unpublishedTitle(credential.label)}
            >
                {statusCopy.unpublishedBody}
                {credential.remarks ? ` — ${credential.remarks}` : ''}
            </Alert>,
        );
    } else if (
        credential?.daysUntilExpiry !== null &&
        credential !== null &&
        credential.daysUntilExpiry <= 60
    ) {
        notices.push(
            <Alert
                key="expiring"
                variant="warning"
                title={statusCopy.expiringTitle}
            >
                {statusCopy.expiringBody(
                    credential.daysUntilExpiry,
                    credential.prcExpiresOn,
                )}
            </Alert>,
        );
    }

    // ── Then the roster ──────────────────────────────────────────────────────
    if (approval.draftDays > 0) {
        notices.push(
            <Alert
                key="draft"
                variant="warning"
                title={statusCopy.sentBackTitle}
            >
                {approval.reviewRemarks
                    ? `${statusCopy.sentBackBody} “${approval.reviewRemarks}”`
                    : statusCopy.sentBackBody}
            </Alert>,
        );
    } else if (approval.pendingDays > 0) {
        notices.push(
            <Alert key="pending" variant="info" title={statusCopy.pendingTitle}>
                {statusCopy.pendingBody(approval.pendingDays)}
            </Alert>,
        );
    }

    if (notices.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                display: 'grid',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-6)',
            }}
        >
            {notices}
        </div>
    );
}
