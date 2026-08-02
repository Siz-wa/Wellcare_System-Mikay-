// resources/js/pages/generals/faqs/sections/FaqsAccordionSection.tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useInView } from '@/hooks/useInView';
import { faqCategories } from './faq-data';
import type { FaqCategory, FaqIconKey } from './faq-data';

// ─── SVG icon map ─────────────────────────────────────────────────────────────
const ICONS: Record<FaqIconKey, ReactElement> = {
    calendar: (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    flask: (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H3m6 0h6m6-9v9m0 0h-6m6 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        </svg>
    ),
    package: (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
    creditCard: (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="1" y="4" width="22" height="16" rx="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
    ),
    stethoscope: (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15v1a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6v-4" />
            <circle cx="20" cy="10" r="2" />
        </svg>
    ),
    info: (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

// ─── Single FAQ item ──────────────────────────────────────────────────────────
interface FaqItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
    index: number;
    inView: boolean;
}

function FaqItem({
    question,
    answer,
    isOpen,
    onToggle,
    index,
    inView,
}: FaqItemProps) {
    return (
        <div
            className="wc-card transition-all duration-500"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: `${index * 60}ms`,
                transitionTimingFunction: 'var(--ease-out)',
            }}
        >
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 p-6 text-left md:p-8"
                aria-expanded={isOpen}
            >
                <span
                    className="font-display text-base leading-snug font-bold"
                    style={{ color: 'var(--wc-dark)' }}
                >
                    {question}
                </span>
                <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-[var(--duration-base)]"
                    style={{
                        background: isOpen
                            ? 'var(--wc-blue-600)'
                            : 'var(--wc-gray-100)',
                        color: isOpen ? '#ffffff' : 'var(--wc-gray-500)',
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="px-6 pt-0 pb-6 md:px-8 md:pb-8">
                    <hr className="wc-divider mb-5" />
                    <p
                        className="m-0 text-sm leading-relaxed"
                        style={{ color: 'var(--wc-gray-500)' }}
                    >
                        {answer}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Category tab button ──────────────────────────────────────────────────────
interface CategoryTabProps {
    category: FaqCategory;
    isActive: boolean;
    onClick: () => void;
}

function CategoryTab({ category, isActive, onClick }: CategoryTabProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2 rounded-[var(--radius-full)] px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-[var(--duration-base)]"
            style={{
                background: isActive ? 'var(--wc-blue-600)' : 'var(--wc-white)',
                color: isActive ? '#ffffff' : 'var(--wc-gray-600)',
                border: `1.5px solid ${isActive ? 'var(--wc-blue-600)' : 'var(--wc-gray-200)'}`,
                boxShadow: isActive
                    ? 'var(--shadow-brand)'
                    : 'var(--shadow-sm)',
            }}
        >
            {/* SVG icon — color inherits from button's color style */}
            <span className="flex-shrink-0" aria-hidden="true">
                {ICONS[category.iconKey]}
            </span>
            <span>{category.label}</span>
        </button>
    );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function FaqsAccordionSection() {
    const { ref, inView } = useInView();
    const [activeCategoryId, setActiveCategoryId] = useState(
        faqCategories[0].id,
    );
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const activeCategory = faqCategories.find(
        (c) => c.id === activeCategoryId,
    )!;

    const handleCategoryChange = (id: string) => {
        setActiveCategoryId(id);
        setOpenIndex(0);
    };

    const handleToggle = (i: number) => {
        setOpenIndex(openIndex === i ? null : i);
    };

    return (
        <section className="wc-section">
            <div className="wc-container">
                {/* Category tabs */}
                <div
                    ref={ref}
                    className="mb-10 transition-all duration-700"
                    style={{
                        opacity: inView ? 1 : 0,
                        transform: inView
                            ? 'translateY(0)'
                            : 'translateY(16px)',
                        transitionTimingFunction: 'var(--ease-out)',
                    }}
                >
                    <div className="flex flex-wrap gap-2">
                        {faqCategories.map((cat) => (
                            <CategoryTab
                                key={cat.id}
                                category={cat}
                                isActive={cat.id === activeCategoryId}
                                onClick={() => handleCategoryChange(cat.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Active category header */}
                <div
                    className="mb-8 flex items-center gap-4 transition-all duration-500"
                    style={{
                        opacity: inView ? 1 : 0,
                        transitionTimingFunction: 'var(--ease-out)',
                    }}
                >
                    {/* Icon tile using design system */}
                    <div className="wc-icon-tile wc-icon-tile-md wc-icon-tile-primary flex-shrink-0">
                        {ICONS[activeCategory.iconKey]}
                    </div>
                    <div>
                        <h2 className="text-[clamp(1.5rem,3vw,2rem)]">
                            {activeCategory.label}
                        </h2>
                        <p
                            className="m-0 text-sm"
                            style={{ color: 'var(--wc-gray-400)' }}
                        >
                            {activeCategory.items.length} question
                            {activeCategory.items.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Accordion items */}
                <div className="flex max-w-[800px] flex-col gap-4">
                    {activeCategory.items.map((item, i) => (
                        <FaqItem
                            key={i}
                            question={item.q}
                            answer={item.a}
                            isOpen={openIndex === i}
                            onToggle={() => handleToggle(i)}
                            index={i}
                            inView={inView}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
