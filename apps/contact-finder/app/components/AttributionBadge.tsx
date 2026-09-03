"use client";

import { AttributionType } from '@/lib/engine/types';

const ATTRIBUTION_CONFIG: Record<AttributionType, { label: string; color: string; bg: string; icon: string }> = {
  DIRECT_PERSON: { label: 'Direct', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', icon: '✓' },
  PROXY_PERSON: { label: 'Proxy', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', icon: '↗' },
  RWA: { label: 'RWA', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', icon: '🏠' },
  BROKER: { label: 'Broker', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)', icon: '🤝' },
  ORGANIZATION: { label: 'Org', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', icon: '🏢' },
  GENERIC: { label: 'Generic', color: '#a1a1aa', bg: 'rgba(161, 161, 170, 0.12)', icon: '◯' },
  AMBIGUOUS: { label: 'Ambiguous', color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.12)', icon: '⚠' },
  UNKNOWN: { label: 'Unknown', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', icon: '?' },
};

export default function AttributionBadge({ type }: { type: AttributionType }) {
  const config = ATTRIBUTION_CONFIG[type] || ATTRIBUTION_CONFIG.UNKNOWN;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.color}20`,
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ fontSize: '11px' }}>{config.icon}</span>
      {config.label}
    </span>
  );
}
