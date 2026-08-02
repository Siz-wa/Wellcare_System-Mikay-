import type { ReactElement } from 'react';
import { IconUser, IconBell, IconShield, IconCreditCard } from '../icons';

export interface SettingsTab {
    id: string;
    label: string;
    // Binago natin ito para tanggapin ang Component function
    icon: () => ReactElement;
}

export const SETTINGS_TABS: SettingsTab[] = [
    { id: 'profile', label: 'Profile Information', icon: IconUser },
    { id: 'notifications', label: 'Notifications', icon: IconBell },
    { id: 'security', label: 'Password & Security', icon: IconShield },
    { id: 'billing', label: 'Billing & Subscription', icon: IconCreditCard },
];

// The signed-in doctor, from DoctorSettingsController. This used to be a
// hardcoded USER_MOCK, so every doctor saw the same fictional profile.
export interface DoctorAccount {
    id: number;
    name: string;
    specialty: string;
    specialization: string;
    initials: string;
    color: string;
    is_active: boolean;
    email: string;
    phone: string | null;
}
