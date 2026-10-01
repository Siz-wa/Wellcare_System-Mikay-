// resources/js/pages/user/contact/sections/ContactFormSection.tsx
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Select } from '@/design-system';
import { useInView } from '@/hooks/useInView';
import { normalizePhMobile } from '@/lib/input-masks';
import { store as storeContactMessage } from '@/routes/contact';
import { contactFormData, hoursData } from './contact-data';

// ─── Form state type ──────────────────────────────────────────────────────────
interface FormState {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    /** Honeypot. Hidden from people; bots fill it and the server refuses. */
    website: string;
}

const INITIAL: FormState = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    website: '',
};

function FieldError({ message }: { message?: string }) {
    return message ? (
        <p className="mt-1 text-sm" style={{ color: 'var(--wc-error)' }}>
            {message}
        </p>
    ) : null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContactFormSection() {
    const { ref, inView } = useInView();
    const { pill, heading, desc, subjects, submitLabel } = contactFormData;
    const {
        data: form,
        setData,
        post,
        processing: loading,
        errors,
        reset,
    } = useForm<FormState>(INITIAL);
    const [submitted, setSubmitted] = useState(false);

    const handleChange =
        (field: keyof FormState) =>
        (
            e: React.ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >,
        ) => {
            setData(field, e.target.value);
        };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(storeContactMessage.url(), {
            preserveScroll: true,
            onSuccess: () => {
                setSubmitted(true);
                reset();
            },
        });
    };

    return (
        <section className="wc-section bg-[var(--wc-gray-50)]">
            <div className="wc-container">
                <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1.4fr_1fr]">
                    {/* ── Left: form ── */}
                    <div
                        ref={ref}
                        className="transition-all duration-700"
                        style={{
                            opacity: inView ? 1 : 0,
                            transform: inView
                                ? 'translateX(0)'
                                : 'translateX(-20px)',
                            transitionTimingFunction: 'var(--ease-out)',
                        }}
                    >
                        <span className="wc-pill wc-pill-primary mb-5 inline-flex">
                            {pill}
                        </span>
                        <h2 className="mb-3 text-[clamp(1.875rem,3.5vw,2.25rem)]">
                            {heading.plain}
                            <span className="wc-gradient-text">
                                {heading.gradient}
                            </span>
                        </h2>
                        <p
                            className="mb-8 text-base leading-relaxed"
                            style={{ color: 'var(--wc-text-muted)' }}
                        >
                            {desc}
                        </p>

                        {/* Success state */}
                        {submitted ? (
                            <div className="wc-alert wc-alert-success">
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
                                <span>{contactFormData.successMessage}</span>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-5"
                                noValidate
                            >
                                {/* Name + Phone */}
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div className="wc-field">
                                        <label className="wc-label-text">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            className="wc-input"
                                            placeholder="Maria Santos"
                                            value={form.name}
                                            onChange={handleChange('name')}
                                            required
                                        />
                                        <FieldError message={errors.name} />
                                    </div>
                                    <div className="wc-field">
                                        <label
                                            className="wc-label-text"
                                            htmlFor="contact-phone"
                                        >
                                            Phone Number
                                        </label>
                                        <input
                                            id="contact-phone"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel"
                                            className="wc-input"
                                            placeholder="09171234567"
                                            value={form.phone}
                                            onChange={(e) =>
                                                setData(
                                                    'phone',
                                                    normalizePhMobile(
                                                        e.target.value,
                                                    ),
                                                )
                                            }
                                        />
                                        <FieldError message={errors.phone} />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="wc-field">
                                    <label className="wc-label-text">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        className="wc-input"
                                        placeholder="you@example.com"
                                        value={form.email}
                                        onChange={handleChange('email')}
                                        required
                                    />
                                    <FieldError message={errors.email} />
                                </div>

                                {/* Subject */}
                                <div className="wc-field">
                                    <label className="wc-label-text">
                                        Subject
                                    </label>
                                    <Select
                                        aria-label="Subject"
                                        value={form.subject}
                                        onChange={(value) =>
                                            setData('subject', value)
                                        }
                                        required
                                        placeholder="Select a subject…"
                                        options={subjects.map((s) => ({
                                            value: s,
                                            label: s,
                                        }))}
                                    />
                                    <FieldError message={errors.subject} />
                                </div>

                                {/* Message */}
                                <div className="wc-field">
                                    <label className="wc-label-text">
                                        Message
                                    </label>
                                    <textarea
                                        className="wc-input wc-textarea"
                                        placeholder="Tell us how we can help…"
                                        value={form.message}
                                        onChange={handleChange('message')}
                                        required
                                        rows={5}
                                    />
                                    <FieldError message={errors.message} />
                                </div>

                                <input
                                    type="text"
                                    name="website"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    aria-hidden="true"
                                    value={form.website}
                                    onChange={handleChange('website')}
                                    style={{
                                        position: 'absolute',
                                        left: '-10000px',
                                        width: 1,
                                        height: 1,
                                        opacity: 0,
                                    }}
                                />

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill self-start"
                                    aria-busy={loading}
                                    disabled={loading}
                                >
                                    {loading ? 'Sending…' : submitLabel}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* ── Right: clinic hours ── */}
                    <div
                        className="transition-all delay-200 duration-700 lg:sticky lg:top-[calc(var(--header-height)+2rem)]"
                        style={{
                            opacity: inView ? 1 : 0,
                            transform: inView
                                ? 'translateX(0)'
                                : 'translateX(24px)',
                            transitionTimingFunction: 'var(--ease-out)',
                        }}
                    >
                        <div className="wc-card">
                            <div className="wc-card-header">
                                <div className="flex items-center gap-3">
                                    <div className="wc-icon-tile wc-icon-tile-sm wc-icon-tile-primary">
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="wc-pill wc-pill-primary text-xs">
                                            {hoursData.pill}
                                        </span>
                                        <h3 className="mt-1 text-base">
                                            {hoursData.heading.plain}
                                            <span className="wc-gradient-text">
                                                {hoursData.heading.gradient}
                                            </span>
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            <div className="wc-card-body">
                                <ul className="flex flex-col divide-y divide-[var(--wc-gray-100)]">
                                    {hoursData.schedule.map((s) => {
                                        const isToday =
                                            new Date().toLocaleDateString(
                                                'en-US',
                                                { weekday: 'long' },
                                            ) === s.day;

                                        return (
                                            <li
                                                key={s.day}
                                                className="flex items-center justify-between py-3"
                                            >
                                                <span
                                                    className={`text-sm font-medium ${isToday ? 'font-bold' : ''}`}
                                                    style={{
                                                        color: isToday
                                                            ? 'var(--wc-blue-600)'
                                                            : 'var(--wc-gray-700)',
                                                    }}
                                                >
                                                    {s.day}
                                                    {isToday && (
                                                        <span
                                                            className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold tracking-[var(--tracking-widest)] uppercase"
                                                            style={{
                                                                background:
                                                                    'var(--wc-blue-50)',
                                                                color: 'var(--wc-blue-600)',
                                                            }}
                                                        >
                                                            Today
                                                        </span>
                                                    )}
                                                </span>
                                                <span
                                                    className="text-sm"
                                                    style={{
                                                        color: 'var(--wc-text-muted)',
                                                    }}
                                                >
                                                    {s.hours}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div
                                    className="mt-5 rounded-[var(--radius-xl)] px-4 py-3 text-xs leading-relaxed"
                                    style={{
                                        background: 'var(--wc-warning-light)',
                                        color: 'var(--wc-text-warning)',
                                        border: '1px solid #fde047',
                                    }}
                                >
                                    ⚠️ {hoursData.note}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
