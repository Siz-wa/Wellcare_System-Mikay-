// resources/js/pages/settings/components/settings-nav.tsx

import { Link, usePage } from '@inertiajs/react';
import {
    Accessibility,
    Bell,
    Lock,
    Shield,
    Stethoscope,
    User,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import type {
    SettingsNavItem,
    SettingsSectionId,
} from '@/pages/settings/settings-data';
import { settingsNav } from '@/pages/settings/settings-data';
import type { PageProps } from '@/types';

/**
 * Closed map — every `iconKey` in settings-data.ts needs an entry here or the
 * lookup fails to type. Same contract the role sidebars use.
 */
const ICON_MAP: Record<SettingsNavItem['iconKey'], ReactNode> = {
    user: <User size={16} strokeWidth={1.8} />,
    shield: <Shield size={16} strokeWidth={1.8} />,
    bell: <Bell size={16} strokeWidth={1.8} />,
    accessibility: <Accessibility size={16} strokeWidth={1.8} />,
    lock: <Lock size={16} strokeWidth={1.8} />,
    stethoscope: <Stethoscope size={16} strokeWidth={1.8} />,
};

interface SettingsNavProps {
    active: SettingsSectionId;
}

export function SettingsNav({ active }: SettingsNavProps): ReactElement {
    const roles = usePage<PageProps>().props.auth?.user?.roles ?? [];

    // A role-scoped item is shown only to that role. The route behind it is
    // gated by middleware regardless; see the `roles` note in settings-data.ts.
    const items = settingsNav.filter(
        (item) =>
            !item.roles || item.roles.some((role) => roles.includes(role)),
    );

    return (
        <nav className="wc-settings-nav" aria-label="Account settings">
            {items.map((item) => {
                const isActive = item.id === active;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={
                            isActive
                                ? 'wc-settings-nav-item wc-settings-nav-item--active'
                                : 'wc-settings-nav-item'
                        }
                    >
                        <span
                            className="wc-settings-nav-icon"
                            aria-hidden="true"
                        >
                            {ICON_MAP[item.iconKey]}
                        </span>
                        <span className="wc-settings-nav-text">
                            <span className="wc-settings-nav-label">
                                {item.label}
                            </span>
                            <span className="wc-settings-nav-desc">
                                {item.description}
                            </span>
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
