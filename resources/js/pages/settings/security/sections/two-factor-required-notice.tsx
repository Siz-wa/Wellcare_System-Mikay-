// resources/js/pages/settings/security/sections/two-factor-required-notice.tsx

import { ShieldAlert } from 'lucide-react';
import type { ReactElement } from 'react';
import { securityCopy } from '@/pages/settings/settings-data';

interface TwoFactorRequiredNoticeProps {
    /** The page the person was actually trying to open, e.g. "Appointments". */
    returnLabel: string | null;
}

/**
 * Explains why this page opened on its own.
 *
 * EnsureTwoFactorEnrolled redirects un-enrolled staff here from wherever they
 * clicked. Without this notice that is silent: every link in the sidebar
 * appears to lead to Settings, with no hint that anything is being asked of
 * them. The middleware does flash a message, but the chain is two redirects
 * long — settings → password confirmation — and a flash only survives one, so
 * the reason has to be derived from the account's state instead.
 */
export function TwoFactorRequiredNotice({
    returnLabel,
}: TwoFactorRequiredNoticeProps): ReactElement {
    const copy = securityCopy.twoFactorRequired;

    return (
        <div className="wc-alert wc-alert-warning" role="status">
            <ShieldAlert className="wc-alert-icon" aria-hidden="true" />
            <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{copy.title}</p>
                <p style={{ margin: '4px 0 0' }}>{copy.body}</p>
                {returnLabel && (
                    <p style={{ margin: '8px 0 0' }}>
                        {copy.returnPrefix} <strong>{returnLabel}</strong>.{' '}
                        {copy.returnSuffix}
                    </p>
                )}
            </div>
        </div>
    );
}
