// resources/js/pages/auth/register/steps/StepAccount.tsx
import type { ChangeEvent } from 'react';
import PasswordInput from '@/components/password-input';
import {
    Field,
    errorBorder,
} from '@/pages/auth/register/components/register-ui';
import type {
    RegisterFields,
    StepErrors,
} from '@/pages/auth/register/hooks/use-register-form';

interface StepAccountProps {
    fields: RegisterFields;
    errors: StepErrors;
    set: (
        key: keyof RegisterFields,
    ) => (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function StepAccount({ fields, errors, set }: StepAccountProps) {
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" error={errors.first_name} required>
                    <input
                        type="text"
                        name="first_name"
                        value={fields.first_name}
                        onChange={set('first_name')}
                        required
                        autoFocus
                        tabIndex={1}
                        autoComplete="given-name"
                        placeholder="Maria"
                        className="wc-input"
                        style={errorBorder(errors.first_name)}
                    />
                </Field>

                <Field label="Last Name" error={errors.last_name} required>
                    <input
                        type="text"
                        name="last_name"
                        value={fields.last_name}
                        onChange={set('last_name')}
                        required
                        tabIndex={2}
                        autoComplete="family-name"
                        placeholder="Santos"
                        className="wc-input"
                        style={errorBorder(errors.last_name)}
                    />
                </Field>
            </div>

            <Field label="Email Address" error={errors.email} required>
                <input
                    type="email"
                    name="email"
                    value={fields.email}
                    onChange={set('email')}
                    required
                    tabIndex={3}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="wc-input"
                    style={errorBorder(errors.email)}
                />
            </Field>

            <Field label="Password" error={errors.password} required>
                <PasswordInput
                    name="password"
                    value={fields.password}
                    onChange={set('password')}
                    required
                    tabIndex={4}
                    autoComplete="new-password"
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    className="wc-input"
                    style={errorBorder(errors.password)}
                />
            </Field>

            <Field
                label="Confirm Password"
                error={errors.password_confirmation}
                required
            >
                <PasswordInput
                    name="password_confirmation"
                    value={fields.password_confirmation}
                    onChange={set('password_confirmation')}
                    required
                    tabIndex={5}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className="wc-input"
                    style={errorBorder(errors.password_confirmation)}
                />
            </Field>
        </>
    );
}
