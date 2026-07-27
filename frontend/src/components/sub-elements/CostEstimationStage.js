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
      borderTop: '3px solid #e67700',
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
      fontWeight: '700', backgroundColor: '#e67700', color: 'white', flexShrink: 0,
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' },
    deptCard: {
      padding: '20px', borderRadius: '10px',
      backgroundColor: isDark ? '#12122a' : '#f8f9fe',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0',
      display: 'flex', flexDirection: 'column', gap: '12px',
    },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' },
    inputLabel: { fontSize: '12px', color: isDark ? '#7070a0' : '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
    input: {
      padding: '10px', borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box'
    },
    textarea: {
      padding: '12px 14px', borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px', outline: 'none', minHeight: '80px', width: '100%',
      boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5'
    },
    deptTotal: { fontSize: '15px', fontWeight: '700', marginTop: '10px', textAlign: 'right' },
    grandTotal: { fontSize: '18px', fontWeight: '700', textAlign: 'right', marginTop: '20px', padding: '16px', backgroundColor: isDark ? '#12122a' : '#f5f6fe', borderRadius: '8px', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0' },
    buttonGroup: { display: 'flex', gap: '10px', marginTop: '18px' },
    btnApprove: { backgroundColor: '#137333', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    btnQuery: { backgroundColor: '#f9ab00', color: '#333', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    btnReject: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertSuccess: { backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertError: { backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f', border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  };
};

const departments = ['Mechanical Department', 'Electrical Department', 'Instrumentation Department', 'Civil Department'];

const CostEstimationStage = ({ theme, ticketData, setTicketData, currentUser, onPromote, onAddQuery, isWorkflowActive, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const hasPermission = currentUser?.designation === 'Cost Estimator';
  const canAct = hasPermission && isWorkflowActive;

  const [costs, setCosts] = useState(departments.reduce((acc, dept) => ({ ...acc, [dept]: { material: '', thirdParty: '', remarks: '' } }), {}));
  const [actionTaken, setActionTaken] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCostChange = (dept, field, value) => {
    setCosts(prev => ({ ...prev, [dept]: { ...prev[dept], [field]: value } }));
  };

  const calculateTotal = (dept) => {
    const mat = parseFloat(costs[dept].material) || 0;
    const tp = parseFloat(costs[dept].thirdParty) || 0;
    return mat + tp;
  };

  const grandTotal = departments.reduce((sum, dept) => sum + calculateTotal(dept), 0);

  const handleAction = (actionType) => {
    if (!canAct) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActionTaken(actionType);
      
      if (setTicketData) {
        setTicketData(prev => ({ ...prev, costEstimates: costs, totalCost: grandTotal }));
      }

      if (actionType === 'Query' && onAddQuery) {
        onAddQuery({ from: currentUser.designation, to: 'Process Engineer / Initiator', description: 'Query regarding cost estimation.' });
      }
      if (actionType === 'Approve' && onPromote) onPromote();
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>6</span>
          Cost Estimation Routing
        </h3>

        {(!isWorkflowActive || !hasPermission) && !actionTaken && !isCompleted && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> {(!isWorkflowActive) ? 'The workflow is currently at a different stage.' : 'This stage is awaiting action from the authorized role.'}</span>
          </div>
        )}

        {actionTaken === 'Approve' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
              <span>✅</span><span><strong>Approved!</strong> Cost estimates submitted successfully.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>🎉</span><span>Thank you for your submission.</span>
            </div>
          </>
        )}
        {actionTaken === 'Query' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>❓</span><span><strong>Query Raised.</strong> Your query has been logged.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>📬</span><span>Review other stages while awaiting a response.</span>
            </div>
          </>
        )}
        {actionTaken === 'Reject' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertError }}>
              <span>⛔</span><span><strong>MOC Rejected.</strong> The workflow has been permanently halted.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>📋</span><span>Your rejection has been recorded.</span>
            </div>
          </>
        )}

        <div style={styles.grid}>
          {departments.map(dept => (
            <div key={dept} style={styles.deptCard}>
              <h4 style={{ margin: 0, fontSize: '15px' }}>{dept}</h4>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Material Cost</label>
                <input type="number" style={styles.input} value={costs[dept].material} onChange={(e) => handleCostChange(dept, 'material', e.target.value)} disabled={!canAct || actionTaken} placeholder="0" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Third-Party Services Cost</label>
                <input type="number" style={styles.input} value={costs[dept].thirdParty} onChange={(e) => handleCostChange(dept, 'thirdParty', e.target.value)} disabled={!canAct || actionTaken} placeholder="0" />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Remarks</label>
                <textarea style={styles.textarea} value={costs[dept].remarks} onChange={(e) => handleCostChange(dept, 'remarks', e.target.value)} disabled={!canAct || actionTaken} placeholder="Notes..." />
              </div>
              <div style={styles.deptTotal}>
                Total: ${calculateTotal(dept).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.grandTotal}>
          Grand Total: ${grandTotal.toLocaleString()}
        </div>

        {canAct && !actionTaken && (
          <div style={styles.buttonGroup}>
            <button style={styles.btnApprove} onClick={() => handleAction('Approve')} disabled={isProcessing}>{isProcessing ? '⏳...' : '✓ Approve'}</button>
            <button style={styles.btnQuery} onClick={() => handleAction('Query')} disabled={isProcessing}>? Raise Query</button>
            <button style={styles.btnReject} onClick={() => handleAction('Reject')} disabled={isProcessing}>✗ Reject</button>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default CostEstimationStage;
