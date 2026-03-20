// resources/js/pages/auth/login/index.tsx
import { Head } from "@inertiajs/react";
import LoginBrandPanel from "@/pages/auth/login/sections/login-brand-panel";
import LoginFormPanel  from "@/pages/auth/login/sections/login-inform-panel";

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  status?: string;
  canResetPassword: boolean;
  canRegister: boolean;
};

// ─── Composer ─────────────────────────────────────────────────────────────────
export default function Login({ status, canResetPassword, canRegister }: Props) {
  return (
    <>
      <Head title="Log in" />
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <LoginBrandPanel />
        <LoginFormPanel
          status={status}
          canResetPassword={canResetPassword}
          canRegister={canRegister}
        />
      </div>
    </>
  );
}