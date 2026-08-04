// ==========================================================================
//  WELLCARE DESIGN SYSTEM — Showcase Page
//  resources/js/pages/DesignSystem.tsx
// ==========================================================================

import React, { useState } from 'react';
import {
    Button,
    Badge,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    Field,
    Input,
    Textarea,
    Select,
    Check,
    Avatar,
    AvatarGroup,
    Alert,
    StatCard,
} from '../design-system';

// ── Section wrapper ────────────────────────────────────────────────────────

const Section: React.FC<{
    title: string;
    desc?: string;
    children: React.ReactNode;
}> = ({ title, desc, children }) => (
    <section style={{ marginBottom: 'var(--space-16)' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2
                style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--wc-dark)',
                    marginBottom: 'var(--space-2)',
                    letterSpacing: 'var(--tracking-tighter)',
                }}
            >
                {title}
            </h2>
            {desc && (
                <p
                    style={{
                        color: 'var(--wc-gray-500)',
                        fontSize: 'var(--text-sm)',
                    }}
                >
                    {desc}
                </p>
            )}
        </div>
        {children}
    </section>
);

const Row: React.FC<{ children: React.ReactNode; wrap?: boolean }> = ({
    children,
    wrap = true,
}) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexWrap: wrap ? 'wrap' : 'nowrap',
        }}
    >
        {children}
    </div>
);

const Swatch: React.FC<{ color: string; name: string; hex: string }> = ({
    color,
    name,
    hex,
}) => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            width: 80,
        }}
    >
        <div
            style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-2xl)',
                background: color,
                border: '1px solid var(--wc-gray-100)',
            }}
        />
        <p
            style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--wc-gray-700)',
            }}
        >
            {name}
        </p>
        <p
            style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--wc-gray-400)',
                fontFamily: 'monospace',
            }}
        >
            {hex}
        </p>
    </div>
);

// ── Showcase ───────────────────────────────────────────────────────────────

export default function DesignSystemShowcase() {
    const [alertVisible, setAlertVisible] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div style={{ minHeight: '100vh', background: 'var(--wc-gray-50)' }}>
            {/* ── Hero Banner ──────────────────────────────────────── */}
            <header
                style={{
                    background:
                        'linear-gradient(135deg, var(--wc-blue-900) 0%, var(--wc-blue-700) 60%, var(--wc-sky-500) 100%)',
                    padding: 'var(--space-20) var(--space-6)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative circles */}
                {[
                    { size: 400, top: -120, right: -80, opacity: 0.08 },
                    { size: 250, top: 40, right: 120, opacity: 0.06 },
                    { size: 160, bottom: -60, left: -40, opacity: 0.07 },
                ].map((c, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            width: c.size,
                            height: c.size,
                            borderRadius: '50%',
                            border: `1.5px solid white`,
                            opacity: c.opacity,
                            top: c.top,
                            right: (c as any).right,
                            left: (c as any).left,
                            bottom: (c as any).bottom,
                            pointerEvents: 'none',
                        }}
                    />
                ))}

                <div
                    style={{
                        maxWidth: 'var(--container-xl)',
                        margin: '0 auto',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            marginBottom: 'var(--space-6)',
                        }}
                    >
                        {/* Logo */}
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-xl)',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                        <div>
                            <span
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: 'var(--text-xl)',
                                    fontWeight: 800,
                                    color: 'white',
                                    letterSpacing: '-0.03em',
                                }}
                            >
                                WELLCARE
                                <span
                                    style={{
                                        color: 'var(--wc-sky-400)',
                                        fontWeight: 500,
                                        marginLeft: 6,
                                    }}
                                >
                                    CLINICS
                                </span>
                            </span>
                        </div>
                    </div>

                    <span
                        className="wc-pill wc-pill-primary"
                        style={{
                            marginBottom: 'var(--space-5)',
                            display: 'inline-flex',
                        }}
                    >
                        Design System v1.0
                    </span>

                    <h1
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                            fontWeight: 800,
                            color: 'white',
                            letterSpacing: '-0.04em',
                            lineHeight: 1.05,
                            marginBottom: 'var(--space-5)',
                        }}
                    >
                        Wellcare
                        <br />
                        <span style={{ color: 'var(--wc-sky-400)' }}>
                            Design System
                        </span>
                    </h1>

                    <p
                        style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 'var(--text-lg)',
                            maxWidth: 520,
                            lineHeight: 'var(--leading-relaxed)',
                        }}
                    >
                        Tokens, components, and patterns for building
                        consistent, accessible healthcare interfaces in Laravel
                        + React + TypeScript.
                    </p>

                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--space-3)',
                            marginTop: 'var(--space-8)',
                            flexWrap: 'wrap',
                        }}
                    >
                        <Button variant="white" size="lg" pill>
                            View Components
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            pill
                            style={
                                {
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                } as React.CSSProperties
                            }
                        >
                            GitHub →
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── Tabs ─────────────────────────────────────────────── */}
            <div
                style={{
                    background: 'var(--wc-white)',
                    borderBottom: '1.5px solid var(--wc-gray-100)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 'var(--z-nav)' as any,
                }}
            >
                <div
                    style={{
                        maxWidth: 'var(--container-xl)',
                        margin: '0 auto',
                        padding: '0 var(--space-6)',
                    }}
                >
                    <div className="wc-tabs">
                        {['overview', 'components', 'tokens', 'patterns'].map(
                            (tab) => (
                                <button
                                    key={tab}
                                    className={`wc-tab ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {tab}
                                </button>
                            ),
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main Content ─────────────────────────────────────── */}
            <main
                style={{
                    maxWidth: 'var(--container-xl)',
                    margin: '0 auto',
                    padding: 'var(--space-16) var(--space-6)',
                }}
            >
                {/* ── COLORS ─────────────────────────── */}
                <Section
                    title="Color Palette"
                    desc="Semantic and brand colors that drive the entire design system."
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-8)',
                        }}
                    >
                        {[
                            {
                                group: 'Brand',
                                swatches: [
                                    {
                                        color: 'var(--wc-blue-600)',
                                        name: 'Primary',
                                        hex: '#0056b3',
                                    },
                                    {
                                        color: 'var(--wc-sky-500)',
                                        name: 'Secondary',
                                        hex: '#00a8e8',
                                    },
                                    {
                                        color: 'var(--wc-gray-50)',
                                        name: 'Accent',
                                        hex: '#f8f9fa',
                                    },
                                    {
                                        color: 'var(--wc-dark)',
                                        name: 'Dark',
                                        hex: '#1a1a1a',
                                    },
                                ],
                            },
                            {
                                group: 'Blue Scale',
                                swatches: [
                                    {
                                        color: 'var(--wc-blue-50)',
                                        name: '50',
                                        hex: '#eff6ff',
                                    },
                                    {
                                        color: 'var(--wc-blue-100)',
                                        name: '100',
                                        hex: '#dbeafe',
                                    },
                                    {
                                        color: 'var(--wc-blue-200)',
                                        name: '200',
                                        hex: '#bfdbfe',
                                    },
                                    {
                                        color: 'var(--wc-blue-400)',
                                        name: '400',
                                        hex: '#60a5fa',
                                    },
                                    {
                                        color: 'var(--wc-blue-600)',
                                        name: '600',
                                        hex: '#0056b3',
                                    },
                                    {
                                        color: 'var(--wc-blue-700)',
                                        name: '700',
                                        hex: '#004494',
                                    },
                                    {
                                        color: 'var(--wc-blue-800)',
                                        name: '800',
                                        hex: '#003370',
                                    },
                                    {
                                        color: 'var(--wc-blue-900)',
                                        name: '900',
                                        hex: '#001f45',
                                    },
                                ],
                            },
                            {
                                group: 'Semantic',
                                swatches: [
                                    {
                                        color: 'var(--wc-success)',
                                        name: 'Success',
                                        hex: '#16a34a',
                                    },
                                    {
                                        color: 'var(--wc-warning)',
                                        name: 'Warning',
                                        hex: '#ca8a04',
                                    },
                                    {
                                        color: 'var(--wc-error)',
                                        name: 'Error',
                                        hex: '#dc2626',
                                    },
                                    {
                                        color: 'var(--wc-info)',
                                        name: 'Info',
                                        hex: '#2563eb',
                                    },
                                ],
                            },
                        ].map(({ group, swatches }) => (
                            <div key={group}>
                                <p
                                    className="wc-label"
                                    style={{
                                        color: 'var(--wc-gray-400)',
                                        marginBottom: 'var(--space-4)',
                                    }}
                                >
                                    {group}
                                </p>
                                <Row>
                                    {swatches.map((s) => (
                                        <Swatch key={s.name} {...s} />
                                    ))}
                                </Row>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── TYPOGRAPHY ──────────────────────── */}
                <Section
                    title="Typography"
                    desc="Bricolage Grotesque for display, DM Sans for body text."
                >
                    <Card>
                        <CardBody>
                            {[
                                {
                                    label: 'Display / H1',
                                    size: 'var(--text-5xl)',
                                    weight: 800,
                                    text: 'Diagnose. Heal. Care.',
                                    family: 'var(--font-display)',
                                },
                                {
                                    label: 'H2',
                                    size: 'var(--text-4xl)',
                                    weight: 800,
                                    text: 'World-class diagnostics',
                                    family: 'var(--font-display)',
                                },
                                {
                                    label: 'H3',
                                    size: 'var(--text-3xl)',
                                    weight: 700,
                                    text: 'Specialist Consultation',
                                    family: 'var(--font-display)',
                                },
                                {
                                    label: 'H4',
                                    size: 'var(--text-2xl)',
                                    weight: 700,
                                    text: 'Laboratory Services',
                                    family: 'var(--font-display)',
                                },
                                {
                                    label: 'Body Large',
                                    size: 'var(--text-lg)',
                                    weight: 400,
                                    text: 'We provide accessible, high-quality healthcare for our community.',
                                    family: 'var(--font-body)',
                                },
                                {
                                    label: 'Body',
                                    size: 'var(--text-base)',
                                    weight: 400,
                                    text: 'Book your consultation or laboratory test online.',
                                    family: 'var(--font-body)',
                                },
                                {
                                    label: 'Small',
                                    size: 'var(--text-sm)',
                                    weight: 400,
                                    text: 'Laboratory results delivered within 24 hours.',
                                    family: 'var(--font-body)',
                                },
                                {
                                    label: 'Caption / Label',
                                    size: 'var(--text-xs)',
                                    weight: 700,
                                    text: 'TRUSTED HEALTHCARE PARTNER',
                                    family: 'var(--font-body)',
                                    tracking: 'var(--tracking-widest)',
                                    upper: true,
                                },
                            ].map(
                                ({
                                    label,
                                    size,
                                    weight,
                                    text,
                                    family,
                                    tracking,
                                    upper,
                                }) => (
                                    <div
                                        key={label}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '140px 1fr',
                                            gap: 'var(--space-6)',
                                            paddingBlock: 'var(--space-5)',
                                            borderBottom:
                                                '1px solid var(--wc-gray-100)',
                                            alignItems: 'baseline',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 700,
                                                color: 'var(--wc-gray-400)',
                                                letterSpacing:
                                                    'var(--tracking-widest)',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: size,
                                                fontWeight: weight,
                                                fontFamily: family,
                                                letterSpacing:
                                                    tracking ||
                                                    'var(--tracking-tighter)',
                                                textTransform: upper
                                                    ? 'uppercase'
                                                    : undefined,
                                                color: 'var(--wc-dark)',
                                                lineHeight: 1.15,
                                            }}
                                        >
                                            {text}
                                        </span>
                                    </div>
                                ),
                            )}
                        </CardBody>
                    </Card>
                </Section>

                {/* ── BUTTONS ─────────────────────────── */}
                <Section
                    title="Buttons"
                    desc="All variants, sizes, states, and configurations."
                >
                    <Card>
                        <CardBody>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-8)',
                                }}
                            >
                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Variants
                                    </p>
                                    <Row>
                                        {(
                                            [
                                                'primary',
                                                'secondary',
                                                'outline',
                                                'ghost',
                                                'danger',
                                                'white',
                                                'dark',
                                            ] as const
                                        ).map((v) => (
                                            <Button
                                                key={v}
                                                variant={v}
                                                size="md"
                                            >
                                                {v.charAt(0).toUpperCase() +
                                                    v.slice(1)}
                                            </Button>
                                        ))}
                                    </Row>
                                </div>

                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Sizes
                                    </p>
                                    <Row>
                                        {(
                                            [
                                                'xs',
                                                'sm',
                                                'md',
                                                'lg',
                                                'xl',
                                            ] as const
                                        ).map((s) => (
                                            <Button
                                                key={s}
                                                variant="primary"
                                                size={s}
                                            >
                                                Size {s.toUpperCase()}
                                            </Button>
                                        ))}
                                    </Row>
                                </div>

                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Pill & Loading
                                    </p>
                                    <Row>
                                        <Button
                                            variant="primary"
                                            size="md"
                                            pill
                                        >
                                            Pill Button
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            pill
                                        >
                                            Book Now
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="md"
                                            loading
                                        >
                                            Loading
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="md"
                                            disabled
                                        >
                                            Disabled
                                        </Button>
                                    </Row>
                                </div>

                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        With Icons
                                    </p>
                                    <Row>
                                        <Button
                                            variant="primary"
                                            size="md"
                                            rightIcon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                >
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            }
                                        >
                                            Find a Doctor
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="md"
                                            leftIcon={
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                >
                                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 13.18a19.79 19.79 0 01-3.07-8.67A2 2 0 011.95 2.09h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.02z" />
                                                </svg>
                                            }
                                        >
                                            Call Hotline
                                        </Button>
                                    </Row>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Section>

                {/* ── BADGES ──────────────────────────── */}
                <Section
                    title="Badges & Pills"
                    desc="Status labels, tags, and indicators."
                >
                    <Card>
                        <CardBody>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-6)',
                                }}
                            >
                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Badges
                                    </p>
                                    <Row>
                                        {(
                                            [
                                                'primary',
                                                'sky',
                                                'success',
                                                'warning',
                                                'error',
                                                'neutral',
                                                'dark',
                                            ] as const
                                        ).map((v) => (
                                            <Badge key={v} variant={v}>
                                                {v}
                                            </Badge>
                                        ))}
                                    </Row>
                                </div>
                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        With Dot
                                    </p>
                                    <Row>
                                        <Badge variant="success" dot>
                                            Active
                                        </Badge>
                                        <Badge variant="warning" dot>
                                            Pending
                                        </Badge>
                                        <Badge variant="error" dot>
                                            Cancelled
                                        </Badge>
                                        <Badge variant="neutral" dot>
                                            Inactive
                                        </Badge>
                                    </Row>
                                </div>
                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Pills
                                    </p>
                                    <Row>
                                        {(
                                            [
                                                'wc-pill-primary',
                                                'wc-pill-success',
                                                'wc-pill-warning',
                                                'wc-pill-error',
                                            ] as const
                                        ).map((cls, i) => (
                                            <span
                                                key={i}
                                                className={`wc-pill ${cls}`}
                                            >
                                                {[
                                                    'Trusted Partner',
                                                    'ISO Certified',
                                                    'In Progress',
                                                    'Urgent',
                                                ].at(i)}
                                            </span>
                                        ))}
                                    </Row>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Section>

                {/* ── CARDS ───────────────────────────── */}
                <Section
                    title="Cards"
                    desc="Surface containers in various configurations."
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 'var(--space-6)',
                        }}
                    >
                        <Card hover>
                            <CardHeader>
                                <p
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--wc-gray-500)',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Default + Hover
                                </p>
                            </CardHeader>
                            <CardBody>
                                <h4
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 800,
                                        marginBottom: 8,
                                    }}
                                >
                                    Lab Test Results
                                </h4>
                                <p
                                    style={{
                                        color: 'var(--wc-gray-500)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    Your CBC report is ready. All values within
                                    normal range.
                                </p>
                            </CardBody>
                            <CardFooter>
                                <Button variant="ghost" size="sm">
                                    View Report →
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card elevated>
                            <CardBody>
                                <span
                                    className="wc-badge wc-badge-success"
                                    style={{
                                        marginBottom: 'var(--space-4)',
                                        display: 'inline-flex',
                                    }}
                                >
                                    Elevated
                                </span>
                                <h4
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 800,
                                        marginBottom: 8,
                                    }}
                                >
                                    Appointment Confirmed
                                </h4>
                                <p
                                    style={{
                                        color: 'var(--wc-gray-500)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    Dr. Santos — March 18, 2026 at 10:00 AM
                                </p>
                            </CardBody>
                        </Card>

                        <Card flat accentLeft>
                            <CardBody>
                                <span
                                    className="wc-badge wc-badge-primary"
                                    style={{
                                        marginBottom: 'var(--space-4)',
                                        display: 'inline-flex',
                                    }}
                                >
                                    Flat + Accent
                                </span>
                                <h4
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 800,
                                        marginBottom: 8,
                                    }}
                                >
                                    Executive Checkup
                                </h4>
                                <p
                                    style={{
                                        color: 'var(--wc-gray-500)',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    Comprehensive wellness package for corporate
                                    clients.
                                </p>
                            </CardBody>
                        </Card>
                    </div>
                </Section>

                {/* ── STAT CARDS ──────────────────────── */}
                <Section
                    title="Stat Cards"
                    desc="At-a-glance metrics for dashboards."
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 'var(--space-5)',
                        }}
                    >
                        {[
                            {
                                value: '150k+',
                                label: 'Patients Served',
                                iconVariant: 'primary' as const,
                                delta: {
                                    value: '+12% this month',
                                    direction: 'up' as const,
                                },
                            },
                            {
                                value: '50+',
                                label: 'Expert Doctors',
                                iconVariant: 'sky' as const,
                                delta: {
                                    value: '+3 this quarter',
                                    direction: 'up' as const,
                                },
                            },
                            {
                                value: '15+',
                                label: 'Years in Service',
                                iconVariant: 'emerald' as const,
                                delta: undefined,
                            },
                            {
                                value: '500+',
                                label: 'Tests Daily',
                                iconVariant: 'purple' as const,
                                delta: {
                                    value: '-2% yesterday',
                                    direction: 'down' as const,
                                },
                            },
                        ].map((s) => (
                            <StatCard
                                key={s.label}
                                value={s.value}
                                label={s.label}
                                iconVariant={s.iconVariant}
                                delta={s.delta}
                                icon={
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                }
                            />
                        ))}
                    </div>
                </Section>

                {/* ── FORM ELEMENTS ───────────────────── */}
                <Section
                    title="Form Elements"
                    desc="Inputs, selects, checkboxes, and validation states."
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(360px, 1fr))',
                            gap: 'var(--space-6)',
                        }}
                    >
                        <Card>
                            <CardHeader>
                                <p
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: 'var(--wc-gray-400)',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Standard Inputs
                                </p>
                            </CardHeader>
                            <CardBody>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-5)',
                                    }}
                                >
                                    <Field
                                        label="Full Name"
                                        required
                                        hint="As it appears on your ID"
                                    >
                                        <Input placeholder="Juan dela Cruz" />
                                    </Field>

                                    <Field
                                        label="Phone Number"
                                        error="Invalid phone number format."
                                    >
                                        <Input
                                            type="tel"
                                            placeholder="+63 9XX XXX XXXX"
                                            error
                                            value={inputValue}
                                            onChange={(e) =>
                                                setInputValue(e.target.value)
                                            }
                                        />
                                    </Field>

                                    <Field label="Service">
                                        <Select
                                            options={[
                                                {
                                                    value: 'consultation',
                                                    label: 'General Consultation',
                                                },
                                                {
                                                    value: 'lab',
                                                    label: 'Laboratory Test',
                                                },
                                                {
                                                    value: 'imaging',
                                                    label: 'X-Ray / Imaging',
                                                },
                                                {
                                                    value: 'executive',
                                                    label: 'Executive Checkup',
                                                },
                                            ]}
                                            placeholder="Select a service"
                                        />
                                    </Field>

                                    <Field label="Notes">
                                        <Textarea
                                            placeholder="Any specific concerns or symptoms..."
                                            rows={3}
                                        />
                                    </Field>
                                </div>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <p
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: 'var(--wc-gray-400)',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Preferences & Choices
                                </p>
                            </CardHeader>
                            <CardBody>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-4)',
                                    }}
                                >
                                    <p className="wc-label-text">
                                        Appointment Type
                                    </p>
                                    <Check
                                        type="radio"
                                        name="type"
                                        label="In-Clinic Visit"
                                        defaultChecked
                                    />
                                    <Check
                                        type="radio"
                                        name="type"
                                        label="Teleconsultation"
                                    />

                                    <div
                                        style={{
                                            height: 1,
                                            background: 'var(--wc-gray-100)',
                                            margin: '4px 0',
                                        }}
                                    />

                                    <p className="wc-label-text">Add-ons</p>
                                    <Check label="Include ECG" defaultChecked />
                                    <Check label="Chest X-Ray" />
                                    <Check label="HMO Pre-authorization" />

                                    <div
                                        style={{ marginTop: 'var(--space-4)' }}
                                    >
                                        <Button
                                            variant="primary"
                                            size="md"
                                            pill
                                            style={{ width: '100%' }}
                                        >
                                            Confirm Booking
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Section>

                {/* ── ALERTS ──────────────────────────── */}
                <Section
                    title="Alerts"
                    desc="Feedback messages for all states."
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-4)',
                        }}
                    >
                        <Alert variant="info" title="Appointment Reminder">
                            Your appointment with Dr. Santos is tomorrow, March
                            19 at 10:00 AM.
                        </Alert>
                        <Alert variant="success" title="Results Ready">
                            Your CBC and urinalysis results are now available
                            for download.
                        </Alert>
                        <Alert variant="warning" title="Action Required">
                            Please upload your HMO card before your appointment
                            to avoid delays.
                        </Alert>
                        {alertVisible && (
                            <Alert
                                variant="error"
                                title="Payment Failed"
                                onDismiss={() => setAlertVisible(false)}
                            >
                                We could not process your payment. Please verify
                                your card details and try again.
                            </Alert>
                        )}
                    </div>
                </Section>

                {/* ── AVATARS ─────────────────────────── */}
                <Section
                    title="Avatars"
                    desc="User representations with status indicators."
                >
                    <Card>
                        <CardBody>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-8)',
                                }}
                            >
                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Sizes
                                    </p>
                                    <Row>
                                        {(
                                            [
                                                'xs',
                                                'sm',
                                                'md',
                                                'lg',
                                                'xl',
                                            ] as const
                                        ).map((s) => (
                                            <Avatar
                                                key={s}
                                                size={s}
                                                src={`https://picsum.photos/seed/doc${s}/100/100`}
                                                alt="Doctor"
                                            />
                                        ))}
                                    </Row>
                                </div>

                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Initials + Status
                                    </p>
                                    <Row>
                                        <Avatar
                                            size="lg"
                                            initials="JS"
                                            alt="Dr. Juan Santos"
                                            status="online"
                                        />
                                        <Avatar
                                            size="lg"
                                            initials="MR"
                                            alt="Dr. Maria Reyes"
                                            status="busy"
                                        />
                                        <Avatar
                                            size="lg"
                                            initials="PL"
                                            alt="Dr. Pedro Lim"
                                            status="away"
                                        />
                                        <Avatar
                                            size="lg"
                                            initials="AC"
                                            alt="Dr. Ana Cruz"
                                            status="offline"
                                        />
                                    </Row>
                                </div>

                                <div>
                                    <p
                                        className="wc-label"
                                        style={{
                                            color: 'var(--wc-gray-400)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        Group
                                    </p>
                                    <AvatarGroup
                                        size="md"
                                        avatars={[1, 2, 3, 4, 5, 6, 7].map(
                                            (i) => ({
                                                src: `https://picsum.photos/seed/doc${i}/100/100`,
                                                alt: `Doctor ${i}`,
                                            }),
                                        )}
                                        max={5}
                                    />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Section>

                {/* ── PROGRESS ────────────────────────── */}
                <Section title="Progress" desc="Visual progress indicators.">
                    <Card>
                        <CardBody>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-6)',
                                }}
                            >
                                {[25, 50, 72, 100].map((val) => (
                                    <div
                                        key={val}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 'var(--space-2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    fontWeight: 700,
                                                    color: 'var(--wc-gray-500)',
                                                }}
                                            >
                                                {val === 100
                                                    ? 'Complete'
                                                    : `Step ${val / 25} of 4`}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 'var(--text-xs)',
                                                    fontWeight: 700,
                                                    color: 'var(--wc-blue-600)',
                                                }}
                                            >
                                                {val}%
                                            </span>
                                        </div>
                                        <div className="wc-progress">
                                            <div
                                                className="wc-progress-bar"
                                                style={{ width: `${val}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </Section>

                {/* ── SKELETON ────────────────────────── */}
                <Section
                    title="Loading States"
                    desc="Skeleton loaders for async content."
                >
                    <Card>
                        <CardBody>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 'var(--space-4)',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <div
                                    className="wc-skeleton"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                    }}
                                />
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-3)',
                                    }}
                                >
                                    <div
                                        className="wc-skeleton"
                                        style={{ height: 16, width: '55%' }}
                                    />
                                    <div
                                        className="wc-skeleton"
                                        style={{ height: 12, width: '80%' }}
                                    />
                                    <div
                                        className="wc-skeleton"
                                        style={{ height: 12, width: '65%' }}
                                    />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Section>

                {/* ── FOOTER NOTE ─────────────────────── */}
                <footer
                    style={{
                        marginTop: 'var(--space-16)',
                        paddingTop: 'var(--space-8)',
                        borderTop: '1.5px solid var(--wc-gray-200)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 'var(--space-4)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                        }}
                    >
                        <div
                            style={{
                                background: 'var(--wc-blue-600)',
                                padding: 'var(--space-2)',
                                borderRadius: 'var(--radius-lg)',
                            }}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2.2"
                            >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                        <span
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                letterSpacing: '-0.03em',
                                color: 'var(--wc-dark)',
                            }}
                        >
                            WELLCARE{' '}
                            <span
                                style={{
                                    color: 'var(--wc-sky-500)',
                                    fontWeight: 500,
                                }}
                            >
                                Design System
                            </span>
                        </span>
                    </div>
                    <p
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-gray-400)',
                            fontWeight: 500,
                        }}
                    >
                        © 2026 Wellcare Clinics & Laboratories, Inc.
                    </p>
                </footer>
            </main>
        </div>
    );
}
