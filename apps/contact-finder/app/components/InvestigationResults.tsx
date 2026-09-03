"use client";

import { useState } from 'react';
import { InvestigationResult } from '@/lib/engine/types';
import { Phone, Clock, Search, FileText, Copy, Check, Zap } from 'lucide-react';
import AttributionBadge from './AttributionBadge';
import ConfidenceBadge from './ConfidenceBadge';
import EvidenceChain from './EvidenceChain';

export default function InvestigationResults({ result }: { result: InvestigationResult }) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const copyPhone = async (phone: string) => {
    await navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="results-container">
      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat">
          <Phone size={14} />
          <span className="stat-value">{result.phones.length}</span>
          <span className="stat-label">phones found</span>
        </div>
        <div className="stat">
          <Search size={14} />
          <span className="stat-value">{result.queriesUsed}/{result.queryBudget}</span>
          <span className="stat-label">queries</span>
        </div>
        <div className="stat">
          <FileText size={14} />
          <span className="stat-value">{result.documentsFetched}</span>
          <span className="stat-label">pages</span>
        </div>
        <div className="stat">
          <Clock size={14} />
          <span className="stat-value">{formatDuration(result.durationMs)}</span>
          <span className="stat-label">duration</span>
        </div>
        <div className="stat">
          <Zap size={14} />
          <span className="stat-value">{result.providersUsed.length}</span>
          <span className="stat-label">providers</span>
        </div>
      </div>

      {/* Address Parse */}
      <div className="parsed-address-bar">
        <span className="parsed-label">Parsed Address:</span>
        {result.parsedAddress.houseNumber && <span className="parsed-tag">🏠 {result.parsedAddress.houseNumber}</span>}
        {result.parsedAddress.area && <span className="parsed-tag">📍 {result.parsedAddress.area}</span>}
        {result.parsedAddress.city && <span className="parsed-tag">🌆 {result.parsedAddress.city}</span>}
        {result.parsedAddress.careOf && <span className="parsed-tag">👤 C/O {result.parsedAddress.careOf}</span>}
      </div>

      {/* Phone Cards */}
      {result.phones.length === 0 ? (
        <div className="no-results">
          <p>No phone numbers found with sufficient confidence.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Stop reason: {result.stopReason.replace(/_/g, ' ')}
          </p>
        </div>
      ) : (
        <div className="phone-cards">
          {result.phones.map((candidate, idx) => (
            <div
              key={candidate.phone}
              className="phone-card"
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              <div className="phone-card-header">
                <div className="phone-number-row">
                  <span className="phone-number">{candidate.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyPhone(candidate.phone)}
                  >
                    {copiedPhone === candidate.phone ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="phone-badges">
                  <AttributionBadge type={candidate.attribution} />
                  <ConfidenceBadge score={candidate.confidence} />
                </div>
              </div>

              {candidate.owner && (
                <div className="phone-owner">
                  <span className="owner-label">Owner:</span> {candidate.owner}
                  {candidate.relationship && candidate.relationship !== 'self' && (
                    <span className="relationship-tag">({candidate.relationship})</span>
                  )}
                </div>
              )}

              {candidate.business && (
                <div className="phone-business">
                  🏢 {candidate.business}
                </div>
              )}

              <EvidenceChain evidence={candidate.evidence} />
            </div>
          ))}
        </div>
      )}

      {/* Providers Used */}
      <div className="providers-bar">
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Providers: </span>
        {result.providersUsed.map(p => (
          <span key={p} className="provider-chip">{p}</span>
        ))}
      </div>
    </div>
  );
}
