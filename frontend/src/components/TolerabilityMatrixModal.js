import React, { useState, useEffect } from 'react';
import './AddNodeModal.css';

export const DEFAULT_TOLERABILITY_LEVELS = [
  {
    level: 1,
    name: 'Minor',
    safety: 'First Aid Injury / Minor Discomfort',
    env: 'Negligible on-site release, no off-site impact',
    asset: '< $10,000 loss',
    rtf: '1e-2',
    targetSil: 'No SIL'
  },
  {
    level: 2,
    name: 'Moderate',
    safety: 'Medical Treatment / Reversible Impairment',
    env: 'Localized on-site contained spill',
    asset: '$10,000 - $100,000 loss',
    rtf: '1e-3',
    targetSil: '< SIL 1'
  },
  {
    level: 3,
    name: 'Serious',
    safety: 'Lost Time Injury / Irreversible Severe Injury',
    env: 'Off-site release without lasting environmental impact',
    asset: '$100,000 - $1,000,000 loss',
    rtf: '1e-4',
    targetSil: 'SIL 1'
  },
  {
    level: 4,
    name: 'Critical / Major',
    safety: 'Single Fatality / Permanent Total Disability',
    env: 'Major off-site damage requiring environmental remediation',
    asset: '$1,000,000 - $10,000,000 loss',
    rtf: '1e-5',
    targetSil: 'SIL 2'
  },
  {
    level: 5,
    name: 'Catastrophic',
    safety: 'Multiple Fatalities / Extensive Community Impact',
    env: 'Severe widespread persistent toxic or environmental contamination',
    asset: '> $10,000,000 loss',
    rtf: '1e-6',
    targetSil: 'SIL 3'
  }
];

export const getTolerabilityMatrix = (studyId, studyCriteria) => {
  try {
    const raw = localStorage.getItem(`lopa_tolerability_matrix_${studyId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read tolerability matrix:', err);
  }

  // Merge with studyCriteria if present
  if (studyCriteria && studyCriteria.severityLevels && studyCriteria.severityLevels.length > 0) {
    return studyCriteria.severityLevels.map(s => {
      const def = DEFAULT_TOLERABILITY_LEVELS.find(d => d.level === s.level) || {};
      const safetyText = (s.consequences && (s.consequences['Safety'] || s.consequences['Health'])) || def.safety || '';
      const envText = (s.consequences && s.consequences['Environment']) || def.env || '';
      const assetText = (s.consequences && (s.consequences['Asset'] || s.consequences['Financial'])) || def.asset || '';

      return {
        level: s.level,
        name: s.name || def.name || `Severity ${s.level}`,
        safety: safetyText,
        env: envText,
        asset: assetText,
        rtf: def.rtf || `1e-${s.level + 1}`,
        targetSil: def.targetSil || (s.level >= 4 ? 'SIL 2' : s.level === 3 ? 'SIL 1' : 'No SIL')
      };
    });
  }

  return DEFAULT_TOLERABILITY_LEVELS;
};

const getSeverityBadgeColor = (level) => {
  switch (level) {
    case 1: return '#10b981'; // Green
    case 2: return '#0284c7'; // Blue
    case 3: return '#f59e0b'; // Amber / Orange
    case 4: return '#ea580c'; // Deep Orange
    case 5: return '#dc2626'; // Red
    default: return '#7c3aed';
  }
};

const TolerabilityMatrixModal = ({
  studyId,
  studyCriteria,
  onClose,
  onSaveMatrix,
  onBatchApplyRtf,
  scenariosCount = 0
}) => {
  const [matrix, setMatrix] = useState(() => getTolerabilityMatrix(studyId, studyCriteria));

  useEffect(() => {
    setMatrix(getTolerabilityMatrix(studyId, studyCriteria));
  }, [studyId, studyCriteria]);

  const handleRtfChange = (level, val) => {
    setMatrix(prev => prev.map(item => item.level === level ? { ...item, rtf: val } : item));
  };

  const handleReset = () => {
    if (window.confirm('Reset all Severity RTF values to international CCPS / IEC 61511 defaults?')) {
      setMatrix(DEFAULT_TOLERABILITY_LEVELS);
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem(`lopa_tolerability_matrix_${studyId}`, JSON.stringify(matrix));
      if (onSaveMatrix) onSaveMatrix(matrix);
      onClose();
    } catch (err) {
      console.error('Failed to save matrix:', err);
    }
  };

  const handleApplyToAll = () => {
    try {
      localStorage.setItem(`lopa_tolerability_matrix_${studyId}`, JSON.stringify(matrix));
      if (onSaveMatrix) onSaveMatrix(matrix);
      if (onBatchApplyRtf) {
        onBatchApplyRtf(matrix);
      }
      onClose();
    } catch (err) {
      console.error('Failed to apply matrix to all:', err);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '16px 24px', backgroundColor: '#0f172a', color: '#fff', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Risk Tolerability & Severity Criteria Matrix
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              IEC 61511 / CCPS Standards — Consequence Severity Level vs. Target Risk Tolerance Frequency (RTF / TMEF)
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-default, #f8fafc)' }}>
          <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: 'rgba(2, 132, 199, 0.08)', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary, #1e293b)' }}>
              <strong>How this matrix works:</strong> Each Consequence Severity level has a corporate <strong>Target Tolerable Frequency (RTF)</strong>. 
              When working in the LOPA Worksheet, setting a severity level links to this matrix to determine the risk gap and required SIL.
            </div>
            <button
              type="button"
              onClick={handleApplyToAll}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
              }}
              title="Automatically fill RTF (Tolerance) for any scenario where it is currently blank"
            >
              <span>⚡</span> Auto-Fill RTF on Scenarios
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-paper, #ffffff)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-hover, #f1f5f9)', borderBottom: '2px solid #cbd5e1', fontSize: '12px', color: '#334155', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>Level</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', width: '140px' }}>Severity Class</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Safety / People Impact</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Environmental Impact</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Asset / Financial Loss</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '130px', backgroundColor: 'rgba(2, 132, 199, 0.08)' }}>
                  Target RTF<br/>
                  <span style={{ fontSize: '10px', textTransform: 'none', color: '#0369a1', fontWeight: 'normal' }}>(Tolerable Freq / yr)</span>
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Target SIF</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.level} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#ffffff',
                      backgroundColor: getSeverityBadgeColor(row.level)
                    }}>
                      S{row.level}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1e293b' }}>
                    {row.name}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px' }}>
                    {row.safety || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px' }}>
                    {row.env || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px' }}>
                    {row.asset || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', backgroundColor: 'rgba(2, 132, 199, 0.03)' }}>
                    <input
                      type="text"
                      value={row.rtf}
                      onChange={(e) => handleRtfChange(row.level, e.target.value)}
                      placeholder="e.g. 1e-4"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #94a3b8',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '13px',
                        color: '#0369a1',
                        fontFamily: 'monospace'
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1'
                    }}>
                      {row.targetSil}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            * <strong>RTF (Risk Tolerance Frequency):</strong> The maximum acceptable annual frequency for consequences of this severity according to IEC 61511 and CCPS Guidelines. 
            Inputs support standard scientific format (e.g. <code>1e-4</code>, <code>1e-5</code>) or decimal values (e.g. <code>0.0001</code>).
          </div>
        </div>

        <div className="modal-actions" style={{ padding: '14px 24px', borderTop: '1px solid var(--divider, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ↺ Reset to CCPS Defaults
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Save Criteria Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TolerabilityMatrixModal;
