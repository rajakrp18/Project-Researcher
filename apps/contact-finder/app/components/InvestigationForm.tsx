"use client";

import { useState } from 'react';
import { Search, User, MapPin, Building, FileText, Sparkles } from 'lucide-react';
import { parseAddress } from '@/lib/engine/address/AddressParser';

interface InvestigationFormProps {
  onSubmit: (data: {
    name: string;
    fatherName?: string;
    address: string;
    city?: string;
    company?: string;
    notes?: string;
    forceRerun?: boolean;
  }) => void;
  loading: boolean;
  onStop?: () => void;
}

export default function InvestigationForm({ onSubmit, loading, onStop }: InvestigationFormProps) {
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [forceRerun, setForceRerun] = useState(false);

  const parsed = address ? parseAddress(address) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    onSubmit({
      name: name.trim(),
      fatherName: fatherName.trim() || undefined,
      address: address.trim(),
      company: company.trim() || undefined,
      notes: notes.trim() || undefined,
      forceRerun
    });
  };

  return (
    <form onSubmit={handleSubmit} className="investigation-form">
      <div className="form-header">
        <Sparkles size={20} style={{ color: 'var(--accent)' }} />
        <h2>Start Investigation</h2>
      </div>

      <div className="form-grid">
        <div className="form-group full-width">
          <label htmlFor="inv-name">
            <User size={14} />
            Full Name <span className="required">*</span>
          </label>
          <input
            id="inv-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. PURSHOTTAM VARSHNEYA"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group full-width">
          <label htmlFor="inv-address">
            <MapPin size={14} />
            Address <span className="required">*</span>
          </label>
          <input
            id="inv-address"
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. E 862 SARASWATI VIHAR PITAMPURA DELHI"
            disabled={loading}
            required
          />
          {parsed && (parsed.houseNumber || parsed.city) && (
            <div className="address-preview">
              {parsed.houseNumber && <span className="preview-tag">🏠 {parsed.houseNumber}</span>}
              {parsed.area && <span className="preview-tag">📍 {parsed.area}</span>}
              {parsed.city && <span className="preview-tag">🌆 {parsed.city}</span>}
              {parsed.careOf && <span className="preview-tag">👤 C/O {parsed.careOf}</span>}
            </div>
          )}
        </div>

        <button
          type="button"
          className="toggle-advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '− Hide' : '+ Show'} additional fields
        </button>

        {showAdvanced && (
          <>
            <div className="form-group">
              <label htmlFor="inv-father">
                <User size={14} />
                Father&apos;s Name
              </label>
              <input
                id="inv-father"
                type="text"
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                placeholder="e.g. S VARSHNEYA"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="inv-company">
                <Building size={14} />
                Company
              </label>
              <input
                id="inv-company"
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Steelcast Ltd"
                disabled={loading}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="inv-notes">
                <FileText size={14} />
                Notes
              </label>
              <textarea
                id="inv-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context..."
                disabled={loading}
                rows={2}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', marginBottom: '16px' }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "var(--text-muted)", cursor: "pointer", fontWeight: 500, userSelect: "none", padding: "6px 12px", borderRadius: "6px", background: "var(--surface)", border: "1px solid var(--border)", whiteSpace: "nowrap", transition: "all 0.2s" }}>
          <input 
            type="checkbox" 
            checked={forceRerun}
            onChange={(e) => setForceRerun(e.target.checked)}
            disabled={loading}
            style={{ accentColor: "var(--accent)", width: "14px", height: "14px", cursor: "pointer" }}
          />
          Ignore Cache
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '0' }}>
        <button type="submit" className="investigate-btn" disabled={loading || !name.trim() || !address.trim()} style={{ flex: 1, marginTop: '0' }}>
          <Search size={18} />
          {loading ? 'Investigating...' : 'Investigate'}
        </button>
        {loading && onStop && (
          <button 
            type="button" 
            onClick={onStop}
            style={{ 
              padding: '10px 20px', 
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            Stop
          </button>
        )}
      </div>
    </form>
  );
}
