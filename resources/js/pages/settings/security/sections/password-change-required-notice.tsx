// resources/js/pages/settings/security/sections/password-change-required-notice.tsx

import { KeyRound } from 'lucide-react';
import type { ReactElement } from 'react';
import { securityCopy } from '@/pages/settings/settings-data';

interface PasswordChangeRequiredNoticeProps {
    /** The page the person was actually trying to open, e.g. "Dashboard". */
    returnLabel: string | null;
}

/**
 * GV-9. Explains why this page opened on its own for a provisioned account.
 *
 * EnsurePasswordIsChanged redirects anyone flagged `must_change_password` here
 * from wherever they clicked, and flashes the reason. That flash never reached
 * the screen: `security.edit` sits behind password confirmation, so the chain
 * is two redirects long and a flash only survives one. The manual walkthrough
 * of 2026-09-11 (T-08) caught the result — a new administrator bounced back to
 * Settings on every navigation with nothing anywhere saying why.
 *
 * So this is derived from the account's own state, exactly as
 * TwoFactorRequiredNotice is, rather than trusted to a flash.
 */
export function PasswordChangeRequiredNotice({
    returnLabel,
}: PasswordChangeRequiredNoticeProps): ReactElement {
    const copy = securityCopy.passwordChangeRequired;

    return (
        <div className="wc-alert wc-alert-warning" role="status">
            <KeyRound className="wc-alert-icon" aria-hidden="true" />
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
