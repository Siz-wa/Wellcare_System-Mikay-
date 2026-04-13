// resources/js/pages/auth/login/sections/LoginFormPanel.tsx
import { Form } from "@inertiajs/react";
import { Link } from "@inertiajs/react";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import TextLink from "@/components/text-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { WellcareLogo } from "@/design-system/components/navbar";
import { register, home } from "@/routes";
import { store } from "@/routes/login";
import { request } from "@/routes/password";
import { loginFormData } from "./login-data";
import { errorBorder } from "@/pages/auth/register/components/register-ui"; // ← same helper as register

// ─── Props ────────────────────────────────────────────────────────────────────
interface LoginFormPanelProps {
  status?: string;
  canResetPassword: boolean;
  canRegister: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginFormPanel({
  status,
  canResetPassword,
  canRegister,
}: LoginFormPanelProps) {
  const d = loginFormData;

  return (
    <div
      className="flex flex-col justify-center px-6 py-12 md:px-16 lg:px-20"
      style={{ background: "var(--wc-white)" }}
    >
      {/* Mobile logo — only visible on small screens */}
      <div className="lg:hidden mb-10">
        <WellcareLogo />
      </div>

      <div className="w-full max-w-[400px] mx-auto">

        {/* Heading */}
        <div className="mb-8">
          <h1
            className="text-[clamp(1.5rem,3vw,2rem)] mb-2"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--wc-dark)" }}
          >
            {d.heading}
          </h1>
          <p className="text-sm" style={{ color: "var(--wc-gray-500)" }}>
            {d.subheading}
          </p>
        </div>

        {/* Status message */}
        {status && (
          <div className="wc-alert wc-alert-success mb-6">
            <svg
              className="wc-alert-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{status}</span>
          </div>
        )}

        {/* Form */}
        <Form
          {...store.form()}
          resetOnSuccess={["password"]}
          className="flex flex-col gap-5"
        >
          {({ processing, errors }) => (
            <>
              {/* Email */}
              <div className="wc-field">
                <label className="wc-label-text" htmlFor="email">
                  {d.emailLabel}
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoFocus
                  tabIndex={1}
                  autoComplete="email"
                  placeholder={d.emailPlaceholder}
                  className="wc-input"
                  style={errorBorder(errors.email)} // ← red border when error
                />
                <InputError message={errors.email} />
              </div>

              {/* Password */}
              <div className="wc-field">
                <div className="flex items-center justify-between mb-2">
                  <label className="wc-label-text" htmlFor="password">
                    {d.passwordLabel}
                  </label>
                  {canResetPassword && (
                    <TextLink
                      href={request()}
                      className="text-xs font-semibold"
                      tabIndex={5}
                      style={{ color: "var(--wc-blue-600)" }}
                    >
                      {d.forgotPasswordLabel}
                    </TextLink>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  tabIndex={2}
                  autoComplete="current-password"
                  placeholder={d.passwordPlaceholder}
                  className="wc-input"
                  style={errorBorder(errors.password)} // ← red border when error
                />
                <InputError message={errors.password} />
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-3">
                <Checkbox id="remember" name="remember" tabIndex={3} />
                <Label
                  htmlFor="remember"
                  className="text-sm cursor-pointer"
                  style={{ color: "var(--wc-gray-600)" }}
                >
                  {d.rememberLabel}
                </Label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                tabIndex={4}
                disabled={processing}
                className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill w-full justify-center mt-2"
                aria-busy={processing}
              >
                {processing && <Spinner />}
                {processing ? d.submittingLabel : d.submitLabel}
              </button>

              {/* Register link */}
              {canRegister && (
                <p
                  className="text-center text-sm mt-2"
                  style={{ color: "var(--wc-gray-500)" }}
                >
                  {d.registerPrompt}{" "}
                  <TextLink
                    href={register()}
                    tabIndex={6}
                    className="font-semibold"
                    style={{ color: "var(--wc-blue-600)" }}
                  >
                    {d.registerLabel}
                  </TextLink>
                </p>
              )}

              {/* Back to site */}
              <div className="text-center pt-2">
                <Link
                  href={home.url()}
                  className="text-xs"
                  style={{ color: "var(--wc-gray-400)" }}
                >
                  {d.backLabel}
                </Link>
              </div>
            </>
          )}
        </Form>

      </div>
    </div>
  );
}