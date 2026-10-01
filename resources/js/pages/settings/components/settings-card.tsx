// resources/js/pages/settings/components/settings-card.tsx

import type { ReactElement, ReactNode } from 'react';

interface SettingsCardProps {
    title: string;
    description?: string;
    /** Renders the card in the destructive treatment used for irreversible actions. */
    danger?: boolean;
    /** Slot in the header, right-aligned — a badge or a secondary action. */
    aside?: ReactNode;
    children: ReactNode;
}

/**
 * One titled panel on a settings page.
 *
 * Every section on every settings page is this shape, so it exists once. The
 * `danger` variant is visually distinct on purpose: "log out everywhere" and
 * "delete account" should not look like "save my phone number".
 */
export function SettingsCard({
    title,
    description,
    danger = false,
    aside,
    children,
}: SettingsCardProps): ReactElement {
    return (
        <section
            className={
                danger
                    ? 'wc-settings-card wc-settings-card--danger'
                    : 'wc-settings-card'
            }
        >
            <header className="wc-settings-card-header">
                <div>
                    <h2 className="wc-settings-card-title">{title}</h2>
                    {description && (
                        <p className="wc-settings-card-desc">{description}</p>
                    )}
                </div>
                {aside}
            </header>

            <div className="wc-settings-card-body">{children}</div>
        </section>
    );
}
