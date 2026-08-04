// resources/js/pages/user/dashboard/components/patient-activity.tsx
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useInView } from '@/hooks/useInView';
import { patientActivityData, dashboardMeta } from '../dashboard-data';
import { IconArrowRight } from '../icons';

function ActivityChart({ animate }: { animate: boolean }): ReactElement {
    const data = patientActivityData;
    const W = 640;
    const H = 220;
    const padX = 8;
    const padTop = 16;
    const padBot = 32;
    const min = 0;
    const max = 40;

    const toX = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
    const toY = (v: number) =>
        padTop + ((max - v) / (max - min)) * (H - padTop - padBot);

    const points = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

    let pathD = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpX = (prev.x + curr.x) / 2;
        pathD += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x},${H - padBot} L ${points[0].x},${H - padBot} Z`;
    const gridValues = [0, 10, 20, 30, 40];

    const pathRef = useRef<SVGPathElement>(null);
    const [len, setLen] = useState(9999);

    useEffect(() => {
        if (pathRef.current) {
            setLen(pathRef.current.getTotalLength());
        }
    }, []);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            style={{ display: 'block', overflow: 'visible' }}
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                        offset="0%"
                        stopColor="var(--wc-blue-600)"
                        stopOpacity="0.18"
                    />
                    <stop
                        offset="100%"
                        stopColor="var(--wc-blue-600)"
                        stopOpacity="0"
                    />
                </linearGradient>
            </defs>

            {gridValues.map((v) => {
                const y = toY(v);

                return (
                    <g key={v}>
                        <line
                            x1={padX}
                            y1={y}
                            x2={W - padX}
                            y2={y}
                            stroke="#f1f3f4"
                            strokeWidth="1"
                        />
                        <text
                            x={0}
                            y={y + 4}
                            fontSize="11"
                            fill="#9aa0a6"
                            textAnchor="start"
                            fontFamily="Inter, sans-serif"
                        >
                            {v}
                        </text>
                    </g>
                );
            })}

            <path
                d={areaD}
                fill="url(#activityGrad)"
                style={{
                    opacity: animate ? 1 : 0,
                    transition: 'opacity 800ms ease 600ms',
                }}
            />

            <path
                ref={pathRef}
                d={pathD}
                fill="none"
                stroke="#1a73e8"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                    strokeDasharray: len,
                    strokeDashoffset: animate ? 0 : len,
                    transition: `stroke-dashoffset 1000ms ease 200ms`,
                }}
            />

            {points.map((pt, i) => (
                <circle
                    key={data[i].day}
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill="#ffffff"
                    stroke="#1a73e8"
                    strokeWidth="3"
                    style={{
                        opacity: animate ? 1 : 0,
                        transform: animate ? 'scale(1)' : 'scale(0)',
                        transformOrigin: `${pt.x}px ${pt.y}px`,
                        transition: `opacity 300ms ease ${400 + i * 80}ms, transform 300ms ease ${400 + i * 80}ms`,
                    }}
                />
            ))}

            {data.map((d, i) => (
                <text
                    key={d.day}
                    x={toX(i)}
                    y={H - 6}
                    fontSize="11"
                    fill="#9aa0a6"
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                    style={{
                        opacity: animate ? 1 : 0,
                        transition: `opacity 300ms ease ${600 + i * 50}ms`,
                    }}
                >
                    {d.day}
                </text>
            ))}
        </svg>
    );
}

export function PatientActivity(): ReactElement {
    const meta = dashboardMeta;
    const { ref, inView } = useInView(0.1);

    return (
        <div
            ref={ref}
            style={{
                background: '#ffffff',
                border: '1px solid #e3e3e3',
                borderRadius: '32px',
                padding: '32px',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 500ms ease, transform 500ms ease',
                willChange: 'transform, opacity',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#1f1f1f',
                    }}
                >
                    {meta.patientActivityTitle}
                </h2>
                <a
                    href="/reports"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#1a73e8',
                        textDecoration: 'none',
                    }}
                >
                    {meta.viewAll} <IconArrowRight />
                </a>
            </div>

            <div style={{ height: 220, width: '100%' }}>
                <ActivityChart animate={inView} />
            </div>
        </div>
    );
}
