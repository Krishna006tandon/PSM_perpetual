import React, { useState } from 'react';

const getStyles = (theme) => {
  const isDark = theme === 'dark';
  return {
    container: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' },
    card: {
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      borderRadius: '12px', padding: '28px',
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.08)',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
      borderTop: '3px solid #137333',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
    },
    sectionTitle: {
      marginTop: 0, paddingBottom: '14px', marginBottom: '20px', fontSize: '17px',
      fontWeight: '700', letterSpacing: '0.3px',
      borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
      display: 'flex', alignItems: 'center', gap: '10px',
    },
    stagePill: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '26px', height: '26px', borderRadius: '50%', fontSize: '12px',
      fontWeight: '700', backgroundColor: '#137333', color: 'white', flexShrink: 0,
    },
    metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', marginBottom: '22px' },
    metaBlock: { display: 'flex', flexDirection: 'column', gap: '4px' },
    metaLabel: { fontSize: '11px', color: isDark ? '#7070a0' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
    metaValue: { fontSize: '14px', fontWeight: '600', color: isDark ? '#e8e8ff' : '#1a1a3e' },
    riskBadge: (level) => {
      const colors = { High: '#c5221f', Medium: '#b06000', Low: '#137333' };
      const c = colors[level] || colors.Medium;
      return { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: isDark ? `${c}22` : `${c}11`, color: isDark ? `${c}dd` : c, border: `1px solid ${c}44` };
    },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
    inputLabel: { fontSize: '12px', color: isDark ? '#7070a0' : '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
    textarea: { padding: '12px 14px', borderRadius: '8px', border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8', backgroundColor: isDark ? '#12122a' : '#f8f9fe', color: isDark ? '#e8e8ff' : '#1a1a3e', fontSize: '14px', outline: 'none', minHeight: '95px', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5' },
    buttonGroup: { display: 'flex', gap: '10px', marginTop: '18px' },
    btnApprove: { backgroundColor: '#137333', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    btnQuery: { backgroundColor: '#f9ab00', color: '#333', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    btnReject: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '14px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertSuccess: { backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertError: { backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f', border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    questionRow: { display: 'flex', flexDirection: 'column', padding: '16px 0', borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #f0f0f8' },
    questionText: { fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: isDark ? '#c8c8e8' : '#333' },
    radioGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    radioOption: (selected, color) => ({
      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
      fontSize: '13px', fontWeight: selected ? '700' : '400',
      padding: '5px 14px', borderRadius: '20px',
      border: selected ? `2px solid ${color}` : isDark ? '2px solid #2a2a4a' : '2px solid #e0e0f0',
      backgroundColor: selected ? (isDark ? `${color}22` : `${color}11`) : 'transparent',
      color: selected ? color : isDark ? '#aaa' : '#666',
      transition: 'all 0.15s ease',
    }),
    archiveBox: { padding: '14px 16px', borderRadius: '8px', backgroundColor: isDark ? '#12122a' : '#f5f6fe', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0', fontSize: '14px', color: isDark ? '#aab' : '#555', lineHeight: '1.6', marginTop: '16px', borderLeft: '3px solid #137333' },
    actionInfoBox: { padding: '14px 16px', borderRadius: '8px', backgroundColor: isDark ? '#12122a' : '#f5f6fe', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0', fontSize: '14px', color: isDark ? '#aab' : '#444', lineHeight: '1.6', marginBottom: '18px', borderLeft: '3px solid #1a73e8' },
    buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    buttonDisabled: { backgroundColor: isDark ? '#2a2a3a' : '#e8e8f0', color: isDark ? '#555' : '#aaa', cursor: 'not-allowed', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', width: '100%', fontSize: '13px' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  };
};

const DocumentationStage = ({ theme, ticketData, currentUser, onPromote, isWorkflowActive, isCompleted: isCompletedProp, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const isDark = theme === 'dark';
  const hasPermission = currentUser.designation === 'Project Manager';
  const canAct = hasPermission && isWorkflowActive;
  const data = ticketData || { title: "No Title", requestor: "N/A", plant: "N/A", changeType: "N/A", riskLevel: "N/A", description: "No description." };

  const [docs, setDocs] = useState([
    { id: 'pid', label: 'P&ID / Engineering Drawings Updated', status: 'Pending' },
    { id: 'sop', label: 'Standard Operating Procedures (SOPs) Updated', status: 'Pending' },
    { id: 'training', label: 'Operator Training Completed & Logged', status: 'Pending' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);
  const isCompleted = isCompletedProp || localIsCompleted;
  const displayDocs = isCompletedProp ? docs.map(d => ({ ...d, status: 'Yes' })) : docs;
  const radioColor = { Yes: '#137333', No: '#c5221f', NA: '#1a73e8' };

  const handleDocChange = (id, newStatus) => {
    if (!canAct) return;
    setDocs(docs.map(doc => doc.id === id ? { ...doc, status: newStatus } : doc));
  };

  const handleSubmit = () => {
    if (!canAct) return;
    const allChecked = docs.every(doc => doc.status !== 'Pending' && doc.status !== 'No');
    if (!allChecked) return alert("All required documentation must be marked as 'Yes' or 'NA' to proceed.");
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setLocalIsCompleted(true);
      setActionTaken(true);
      if (onPromote) onPromote();
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>7</span>
          Documentation & Handoff
        </h3>

        {/* Universal View */}
        {!isWorkflowActive && !isCompleted && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> The workflow is currently at a different stage.</span>
          </div>
        )}
        {isWorkflowActive && !hasPermission && !isCompleted && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> This stage is awaiting action from the authorized role.</span>
          </div>
        )}

        {/* Action banner — only on successful completion */}
        {actionTaken && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
              <span>✅</span>
              <span><strong>Documentation Complete!</strong> All documents have been verified. The MOC is ready for Final Closure.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>🎉</span>
              <span>Thank you for your diligence. The workflow is progressing to Stage 8 — review other stages using the tracker above.</span>
            </div>
          </>
        )}

        {isCompleted && !actionTaken && (
          <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
            <span>✅</span>
            <span>Documentation fully verified. MOC is ready for Final Closure.</span>
          </div>
        )}

        <div style={styles.metaGrid}>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>MOC Title</span><span style={styles.metaValue}>{data.title}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Requestor</span><span style={styles.metaValue}>{data.requestor}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Plant / Unit</span><span style={styles.metaValue}>{data.plant}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Risk Level</span><span style={styles.riskBadge(data.riskLevel)}>{data.riskLevel} Risk</span></div>
        </div>

        <div style={styles.actionInfoBox}>
          <strong>Action Required:</strong> The physical execution of this MOC has been authorized. Ensure all systemic documentation reflects the physical changes before passing to the Area Owner for final closure.
        </div>

        <div style={{ opacity: canAct ? 1 : 0.65, pointerEvents: canAct ? 'auto' : 'none' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '700', color: isDark ? '#aab' : '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Documentation Checklist {isCompleted && '— Archived'}
          </h4>
          {displayDocs.map((doc, index) => (
            <div key={doc.id} style={{ ...styles.questionRow, borderBottom: index === docs.length - 1 ? 'none' : styles.questionRow.borderBottom }}>
              <div style={styles.questionText}>{doc.label}</div>
              <div style={styles.radioGroup}>
                {['Yes', 'No', 'NA'].map(option => (
                  <label key={option} style={styles.radioOption(doc.status === option, radioColor[option])}>
                    <input type="radio" value={option} checked={doc.status === option} onChange={() => handleDocChange(doc.id, option)} style={{ display: 'none' }} />
                    {option === 'Yes' ? '✓' : option === 'No' ? '✗' : '—'} {option}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {canAct && !isCompleted && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.buttonPrimary, ...(isSubmitting ? styles.buttonDisabled : {}) }} onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '⏳ Saving...' : '✓ Complete Documentation Phase'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default DocumentationStage;