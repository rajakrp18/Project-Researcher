"use client";

export default function ConfidenceBadge({ score }: { score: number }) {
  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';

  const config = {
    high: { label: 'High', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)', track: 'rgba(22, 163, 74, 0.15)' },
    medium: { label: 'Medium', color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.08)', track: 'rgba(202, 138, 4, 0.15)' },
    low: { label: 'Low', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)', track: 'rgba(220, 38, 38, 0.15)' },
  }[level];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          flex: 1,
          height: '6px',
          borderRadius: '3px',
          background: config.track,
          overflow: 'hidden',
          minWidth: '60px',
        }}
      >
        <div
          style={{
            width: `${Math.min(score, 100)}%`,
            height: '100%',
            borderRadius: '3px',
            background: config.color,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: config.color,
          minWidth: '32px',
          textAlign: 'right',
        }}
      >
        {score}%
      </span>
    </div>
  );
}
