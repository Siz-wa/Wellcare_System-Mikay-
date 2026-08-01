// resources/js/pages/auth/login/sections/LoginBrandPanel.tsx
import { WellcareLogo } from '@/design-system/components/navbar';
import { loginBrandData, trustItems } from './login-data';

export default function LoginBrandPanel() {
    const { pill, heading, desc, copyright } = loginBrandData;

    return (
        <div
            className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
            style={{
                background:
                    'linear-gradient(135deg, var(--wc-blue-900) 0%, var(--wc-blue-700) 55%, var(--wc-blue-600) 100%)',
            }}
        >
            {/* Radial glow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(0,168,232,0.2) 0%, transparent 55%),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.04) 0%, transparent 50%)
          `,
                }}
            />

            {/* Decorative circles */}
            <div
                className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-10"
                style={{ border: '2px solid var(--wc-white)' }}
            />
            <div
                className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full opacity-10"
                style={{ border: '2px solid var(--wc-white)' }}
            />

            {/* Logo */}
            <div className="relative z-10">
                <WellcareLogo dark />
            </div>

            {/* Centre content */}
            <div className="relative z-10">
                <span
                    className="mb-6 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-[var(--tracking-widest)] uppercase"
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                    }}
                >
                    {pill}
                </span>

                {/* Heading — inline style overrides base.css h2 global */}
                <h2
                    className="mb-5 text-[clamp(2rem,3.5vw,2.75rem)] leading-tight tracking-[-0.03em]"
                    style={{
                        color: '#ffffff',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                    }}
                >
                    {heading.line1}
                    <br />
                    <span
                        style={{
                            background:
                                'linear-gradient(135deg, var(--wc-sky-400), #ffffff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        {heading.line2}
                    </span>
                </h2>

                {/* Desc — inline style overrides base.css p global */}
                <p
                    className="mb-10 max-w-[340px] text-base leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.70)' }}
                >
                    {desc}
                </p>

                {/* Trust badges */}
                <div className="flex flex-col gap-4">
                    {trustItems.map((item) => (
                        <div
                            key={item.text}
                            className="flex items-center gap-3"
                        >
                            <span
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
                                style={{
                                    background: 'rgba(255,255,255,0.12)',
                                    color: 'var(--wc-sky-400)',
                                }}
                            >
                                {item.icon}
                            </span>
                            <span
                                className="text-sm font-medium"
                                style={{ color: 'rgba(255,255,255,0.80)' }}
                            >
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Copyright */}
            <p
                className="relative z-10 text-xs"
                style={{ color: 'rgba(255,255,255,0.35)' }}
            >
                {copyright}
            </p>
        </div>
    );
}
