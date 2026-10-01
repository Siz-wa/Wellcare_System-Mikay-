// resources/js/pages/settings/accessibility/index.tsx

import type { ReactElement } from 'react';
import {
    ContrastTabs,
    TextSizeTabs,
} from '@/components/typography-preference-tabs';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { SettingsShell } from '@/pages/settings/layout/settings-shell';

/**
 * This was "Appearance" and offered a Light/Dark/System theme toggle. The theme
 * was never actually built — the `dark` class was applied but no dark tokens
 * were ever defined, so the only thing it changed was the page background — and
 * a settings link that changes nothing is worse than no link at all.
 *
 * What remains are the two controls that do change something: text size and
 * contrast. Both are real reader accommodations, which is why the section is
 * named for what it does.
 */
export default function AccessibilitySettingsPage(): ReactElement {
    return (
        <SettingsShell active="accessibility" title="Accessibility settings">
            <SettingsCard
                title="Text size"
                description="Enlarge every label, record and result across WellCare. This is applied on top of the text size already set in your browser or operating system, so the two add together."
            >
                <TextSizeTabs />

                <p className="wc-settings-note">
                    Nothing is hidden or cut off at any size — pages reflow to
                    fit. You can also zoom with <kbd>Ctrl</kbd>&nbsp;+&nbsp;
                    <kbd>+</kbd> at any time.
                </p>
            </SettingsCard>

            <SettingsCard
                title="Contrast"
                description="High contrast darkens body text to near-black, thickens link underlines and borders, and removes the frosted-glass panels that sit behind text."
            >
                <ContrastTabs />

                <p className="wc-settings-note">
                    If your operating system already requests increased
                    contrast, WellCare follows it automatically — choose
                    “Standard” here to override that.
                </p>
            </SettingsCard>
        </SettingsShell>
    );
}
