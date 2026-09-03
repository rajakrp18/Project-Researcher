"use client";

import { useState } from 'react';
import { Evidence } from '@/lib/engine/types';
import { ChevronDown, ChevronUp, ExternalLink, Cpu, Regex } from 'lucide-react';

export default function EvidenceChain({ evidence }: { evidence: Evidence[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (evidence.length === 0) return null;

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'inherit',
          padding: '4px 0',
        }}
      >
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {evidence.length} source{evidence.length !== 1 ? 's' : ''}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {evidence.map((e, idx) => (
            <div
              key={idx}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {e.extractionMethod === 'llm' ? (
                    <Cpu size={12} style={{ color: '#7c3aed' }} />
                  ) : (
                    <Regex size={12} style={{ color: '#2563eb' }} />
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {e.extractionMethod === 'llm' ? 'AI Extracted' : 'Pattern Match'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    via {e.provider}
                  </span>
                </div>
                <a
                  href={e.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <ExternalLink size={12} />
                </a>
              </div>

              {e.ownerName && (
                <div style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '4px' }}>
                  📱 {e.ownerName}
                </div>
              )}

              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {e.snippet
                  .replace(/Continue without login.*/gi, '')
                  .replace(/All Comments.*/gi, '')
                  .replace(/Back to Top.*/gi, '')
                  .replace(/Characters Remaining.*/gi, '')
                  .replace(/Log in or Login.*/gi, '')
                  .replace(/\s+/g, ' ')
                  .trim()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
