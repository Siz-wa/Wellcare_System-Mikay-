// resources/js/types/index.ts

import type { NotificationItem } from '@/design-system/components/notification-bell';
import type { User } from './auth';

// Barrel: these live in sibling modules but are imported from "@/types"
// throughout the app. Note `User` is re-exported from ./auth below rather than
// `export * from './auth'`, which would have collided with the duplicate
// definition this file used to carry.
export type { BreadcrumbItem, NavItem } from './navigation';
export type { AppLayoutProps, AppVariant, AuthLayoutProps } from './ui';
export type {
    Auth,
    User,
    TwoFactorSetupData,
    TwoFactorSecretKey,
} from './auth';

export interface PageProps {
    auth: {
        user: User | null;
    };
    // Shared on every page via HandleInertiaRequests middleware
    notifications: NotificationItem[];
    unreadCount: number;
    flash?: {
        success?: string;
        error?: string;
    };
    // Required by Inertia's usePage<T> constraint
    [key: string]: unknown;
}

export interface Appointment {
    id: number;
    date: string;
    status:
        | 'requested'
        | 'confirmed'
        | 'checked_in'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'no_show';
}
