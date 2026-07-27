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
      borderTop: '3px solid #1a73e8',
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
      fontWeight: '700', backgroundColor: '#1a73e8', color: 'white', flexShrink: 0,
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
    execSummary: { padding: '14px 16px', borderRadius: '8px', backgroundColor: isDark ? '#12122a' : '#f5f6fe', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0', fontSize: '14px', color: isDark ? '#aab' : '#444', lineHeight: '1.6', marginBottom: '20px', borderLeft: '3px solid #1a73e8' },
    descBox: { padding: '14px 16px', borderRadius: '8px', backgroundColor: isDark ? '#12122a' : '#f5f6fe', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0', fontSize: '14px', color: isDark ? '#aab' : '#444', lineHeight: '1.6', marginBottom: '20px' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  };
};

const SiteHeadApproval = ({ theme, ticketData, currentUser, onPromote, onAddQuery, isWorkflowActive, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const hasPermission = currentUser.designation === 'Site Head';
  const canAct = hasPermission && isWorkflowActive;

  const [comments, setComments] = useState('');
  const [actionTaken, setActionTaken] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const data = ticketData || { title: "No Title", plant: "N/A", department: "N/A", changeType: "N/A", riskLevel: "N/A", description: "No description provided." };

  const handleAction = (actionType) => {
    if (!canAct) return;
    if ((actionType === 'Reject' || actionType === 'Query') && comments.trim() === '') {
      return alert(`Please provide comments before selecting ${actionType}.`);
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActionTaken(actionType);
      if (actionType === 'Query' && onAddQuery) {
        onAddQuery({ from: currentUser.designation, to: 'All Reviewers / Initiator', description: comments });
        setComments('');
      }
      if (actionType === 'Approve' && onPromote) onPromote();
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>6</span>
          Site Head Executive Approval
        </h3>

        {/* Universal View */}
        {!isWorkflowActive && !actionTaken && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> The workflow is currently at a different stage.</span>
          </div>
        )}
        {isWorkflowActive && !hasPermission && !actionTaken && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> This stage is awaiting action from the authorized role.</span>
          </div>
        )}

        {/* Action-specific banners */}
        {actionTaken === 'Approve' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
              <span>✅</span>
              <span><strong>Executive Approval Granted!</strong> The MOC has been authorized and advanced to the Documentation stage.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>🎉</span>
              <span>Thank you for your review. The workflow is progressing — you may review other stages using the tracker above.</span>
            </div>
          </>
        )}
        {actionTaken === 'Query' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>❓</span>
              <span><strong>Query Raised.</strong> Your query has been logged and sent to all reviewers and the initiator.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>📬</span>
              <span>The query has been added to the Global Query Log. Review other stages while awaiting a response.</span>
            </div>
          </>
        )}
        {actionTaken === 'Reject' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertError }}>
              <span>⛔</span>
              <span><strong>MOC Vetoed.</strong> The workflow has been permanently halted by Site Head executive decision.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>📋</span>
              <span>Your rejection has been recorded. Please coordinate with the team for next steps.</span>
            </div>
          </>
        )}

        <div style={styles.metaGrid}>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>MOC Title</span><span style={styles.metaValue}>{data.title}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Requestor</span><span style={styles.metaValue}>{data.requestor}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Plant / Unit</span><span style={styles.metaValue}>{data.plant}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Risk Level</span><span style={styles.riskBadge(data.riskLevel)}>{data.riskLevel} Risk</span></div>
        </div>

        <div style={styles.descBox}>
          <strong style={{ display: 'block', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MOC Description & Justification</strong>
          {data.description}
        </div>

        {canAct && !actionTaken && (
          <>
            <div style={styles.execSummary}>
              <strong>Executive Summary:</strong> This MOC has successfully passed Area Head Approval, CTS Verification, CTS Head Verification, and Review Group evaluations. Please provide final authorization to proceed with physical execution.
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Executive Comments — Required for Query / Reject</label>
              <textarea style={styles.textarea} placeholder="Enter your executive observations or queries here..." value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            <div style={styles.buttonGroup}>
              <button style={styles.btnApprove} onClick={() => handleAction('Approve')} disabled={isProcessing}>{isProcessing ? '⏳ Processing...' : '✓ Approve'}</button>
              <button style={styles.btnQuery} onClick={() => handleAction('Query')} disabled={isProcessing}>? Raise Query</button>
              <button style={styles.btnReject} onClick={() => handleAction('Reject')} disabled={isProcessing}>✗ Reject</button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default SiteHeadApproval;