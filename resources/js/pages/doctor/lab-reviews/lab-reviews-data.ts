// resources/js/pages/doctor/lab-reviews/lab-reviews-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Static content and types for the Lab Reviews page.
// The rows themselves come from Doctor\LabReviewController as Inertia props —
// only page copy lives here.

import type { LabResultDetail } from './components/type';

// ── Lab submission ────────────────────────────────────────────────────────────

// Workflow state and clinical severity collapsed into one field for display.
// LabTestResult::getDisplayStatusAttribute() on the server decides which wins.
export type LabResultStatus = 'pending' | 'reviewed' | 'critical' | 'normal';

export interface LabSubmission {
    id: string;
    name: string;
    test: string;
    timeAgo: string;
    status: LabResultStatus;
    initials: string;
    iconColor: string; // background for the lab-flask avatar
}

/**
 * What the controller actually sends: every row carries both the list fields
 * and the full detail, so the modal reads from the same array the list renders
 * instead of a second lookup table.
 */
export type LabReviewRow = LabSubmission &
    LabResultDetail & {
        isReviewed: boolean;
    };

// ── Page meta ─────────────────────────────────────────────────────────────────

export const labReviewsMeta = {
    // Page header
    pageTitle: 'Lab Reviews',
    pageSubtitle: 'Review and validate patient laboratory test results',
    backHref: '/doctor/appointments',

    // Search & filter bar
    searchPlaceholder: 'Search by patient or test type…',
    filterLabel: 'Filters',

    // Card
    cardTitle: 'Recent Lab Submissions',
    viewAllLabel: 'VIEW ALL',
    viewAllHref: '/doctor/lab-reviews',
    reviewLabel: 'Review',
    emptyMessage:
        'No lab results waiting for review. Results appear here once the nurse records them.',

    // Active nav id — must match NavItem.id in dashboard-data.ts
    activeNavId: 'labreviews',
};
