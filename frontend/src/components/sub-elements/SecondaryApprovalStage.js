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
      borderTop: '3px solid #6c3483',
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
      fontWeight: '700', backgroundColor: '#6c3483', color: 'white', flexShrink: 0,
    },
    grid: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' },
    approverCard: (status) => {
      const borderColor = status === 'Approved' ? '#137333' : status === 'Rejected' ? '#c5221f' : status === 'Query' ? '#f9ab00' : isDark ? '#2a2a4a' : '#e0e2f0';
      return {
        padding: '20px', borderRadius: '10px',
        backgroundColor: isDark ? '#12122a' : '#f8f9fe',
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column', gap: '12px',
      };
    },
    statusBadge: (status) => {
      const map = {
        Approved: { bg: isDark ? 'rgba(19,115,51,0.2)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333' },
        Rejected: { bg: isDark ? 'rgba(197,34,31,0.2)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f' },
        Query: { bg: isDark ? 'rgba(249,171,0,0.2)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00' },
        Pending: { bg: isDark ? '#2a2a3a' : '#eee', color: isDark ? '#aaa' : '#555' },
        Locked: { bg: isDark ? '#1a1a2e' : '#f0f0f0', color: isDark ? '#666' : '#999' }
      };
      const { bg, color } = map[status] || map.Pending;
      return { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: bg, color };
    },
    textarea: { padding: '12px 14px', borderRadius: '8px', border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8', backgroundColor: isDark ? '#1a1a2e' : '#ffffff', color: isDark ? '#e8e8ff' : '#1a1a3e', fontSize: '14px', outline: 'none', minHeight: '80px', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5' },
    buttonGroup: { display: 'flex', gap: '8px', marginTop: '10px' },
    btnApprove: { backgroundColor: '#137333', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '13px' },
    btnQuery: { backgroundColor: '#f9ab00', color: '#333', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '13px' },
    btnReject: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '13px' },
    buttonDisabled: { backgroundColor: isDark ? '#2a2a3a' : '#e8e8f0', color: isDark ? '#555' : '#aaa', cursor: 'not-allowed', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', width: '100%', fontSize: '13px', textAlign: 'center' },
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertSuccess: { backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertError: { backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f', border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  };
};

const approvalChain = [
  { id: 'area', role: 'Area Head', desc: 'Re-validates financial cost packages' },
  { id: 'cts', role: 'CTS Head', desc: 'Secondary technical review' },
  { id: 'eng', role: 'Engineering Head', desc: 'Engineering sign-off' },
  { id: 'hse', role: 'HSE Head', desc: 'Safety sign-off' }
];

const SecondaryApprovalStage = ({ theme, ticketData, setTicketData, currentUser, onPromote, onAddQuery, isWorkflowActive, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const [statuses, setStatuses] = useState(ticketData?.secondaryStatuses || { area: 'Pending', cts: 'Locked', eng: 'Locked', hse: 'Locked' });
  const [comments, setComments] = useState({ area: '', cts: '', eng: '', hse: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const getActiveRoleIndex = () => {
    return approvalChain.findIndex(app => statuses[app.id] === 'Pending');
  };
  const activeIndex = getActiveRoleIndex();
  const activeRole = activeIndex !== -1 ? approvalChain[activeIndex].role : null;
  const isFullyApproved = approvalChain.every(app => statuses[app.id] === 'Approved');

  const hasPermission = currentUser?.designation === activeRole;

  const handleAction = (appId, actionType, roleIndex) => {
    if ((actionType === 'Query' || actionType === 'Rejected') && comments[appId].trim() === '') {
      return alert("Please provide comments before querying or rejecting.");
    }
    setIsProcessing(true);
    setTimeout(() => {
      const newStatuses = { ...statuses, [appId]: actionType };
      
      if (actionType === 'Approved' && roleIndex + 1 < approvalChain.length) {
        newStatuses[approvalChain[roleIndex + 1].id] = 'Pending';
      }

      setStatuses(newStatuses);
      if (setTicketData) {
        setTicketData(prev => ({ ...prev, secondaryStatuses: newStatuses }));
      }
      
      if (actionType === 'Query' && onAddQuery) {
        onAddQuery({ from: approvalChain[roleIndex].role, to: 'Initiator', description: comments[appId] });
      }

      const updatedAllApproved = approvalChain.every(app => newStatuses[app.id] === 'Approved');
      if (updatedAllApproved && onPromote) onPromote();
      
      setIsProcessing(false);
    }, 500);
  };

  const hasRejection = Object.values(statuses).some(s => s === 'Rejected');

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>7</span>
          Secondary Head Approval & Engineering Head Sign-off
        </h3>

        {(!isWorkflowActive) && !isCompleted && !isFullyApproved && !hasRejection && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> The workflow is currently at a different stage.</span>
          </div>
        )}

        {isWorkflowActive && !hasPermission && activeIndex !== -1 && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> Awaiting action from {activeRole}.</span>
          </div>
        )}

        {isFullyApproved && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
              <span>✅</span><span><strong>All Approvals Complete!</strong> Secondary approvals are complete.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>🎉</span><span>Thank you. You may review other stages.</span>
            </div>
          </>
        )}
        
        {hasRejection && (
          <div style={{ ...styles.alertBase, ...styles.alertError }}>
            <span>⛔</span><span><strong>MOC Rejected.</strong> The workflow has been permanently halted.</span>
          </div>
        )}

        <div style={styles.grid}>
          {approvalChain.map((app, index) => {
            const currentStatus = statuses[app.id];
            const isPending = currentStatus === 'Pending';
            const canAct = isPending && currentUser?.designation === app.role && isWorkflowActive;

            return (
              <div key={app.id} style={styles.approverCard(currentStatus)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px' }}>{app.role}</h4>
                    <span style={{ fontSize: '12px', color: '#888' }}>{app.desc}</span>
                  </div>
                  <span style={styles.statusBadge(currentStatus)}>{currentStatus}</span>
                </div>

                {isPending && canAct && (
                  <>
                    <textarea
                      style={styles.textarea}
                      placeholder="Comments..."
                      value={comments[app.id]}
                      onChange={(e) => setComments({ ...comments, [app.id]: e.target.value })}
                    />
                    <div style={styles.buttonGroup}>
                      <button style={styles.btnApprove} onClick={() => handleAction(app.id, 'Approved', index)} disabled={isProcessing}>✓ Approve</button>
                      <button style={styles.btnQuery} onClick={() => handleAction(app.id, 'Query', index)} disabled={isProcessing}>? Raise Query</button>
                      <button style={styles.btnReject} onClick={() => handleAction(app.id, 'Rejected', index)} disabled={isProcessing}>✗ Reject</button>
                    </div>
                  </>
                )}
                
                {isPending && !canAct && (
                  <div style={styles.buttonDisabled}>🔒 Awaiting {app.role}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default SecondaryApprovalStage;
