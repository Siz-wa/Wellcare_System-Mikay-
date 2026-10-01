// resources/js/pages/auth/login/index.tsx
import { Head } from '@inertiajs/react';
import LoginBrandPanel from '@/pages/auth/login/sections/login-brand-panel';
import LoginFormPanel from '@/pages/auth/login/sections/login-inform-panel';

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
    status?: string;
    /** Why the app ended a session: an idle timeout, or a deactivation. */
    notice?: string | null;
    canResetPassword: boolean;
    canRegister: boolean;
};

// ─── Composer ─────────────────────────────────────────────────────────────────
export default function Login({
    status,
    notice,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <>
            <Head title="Log in" />
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                <LoginBrandPanel />
                <LoginFormPanel
                    status={status}
                    notice={notice}
                    canResetPassword={canResetPassword}
                    canRegister={canRegister}
                />
            </div>
        </>
    );
}
