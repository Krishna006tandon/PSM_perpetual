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
      borderTop: '3px solid #8e24aa',
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
      fontWeight: '700', backgroundColor: '#8e24aa', color: 'white', flexShrink: 0,
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
    departmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' },
    departmentCard: (status) => {
      const borderColor = status === 'Approved' ? '#137333' : status === 'Rejected' ? '#c5221f' : status === 'Query Sent' ? '#f9ab00' : isDark ? '#2a2a4a' : '#e0e2f0';
      return {
        padding: '20px', borderRadius: '10px',
        backgroundColor: isDark ? '#12122a' : '#f8f9fe',
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column', gap: '12px',
        transition: 'border-color 0.2s',
      };
    },
    statusBadge: (status) => {
      const map = {
        Approved: { bg: isDark ? 'rgba(19,115,51,0.2)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333' },
        Rejected: { bg: isDark ? 'rgba(197,34,31,0.2)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f' },
        'Query Sent': { bg: isDark ? 'rgba(249,171,0,0.2)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00' },
        Pending: { bg: isDark ? '#2a2a3a' : '#eee', color: isDark ? '#aaa' : '#555' },
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
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '14px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertSuccess: { backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertError: { backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f', border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
  };
};

const departmentsRequired = [
  { id: 'mechanical', title: 'Mechanical Department', requiredRole: 'Mechanical Reviewer' },
  { id: 'safety', title: 'Safety / HSE Department', requiredRole: 'Safety Reviewer' }
];

const ReviewGroupStage = ({ theme, ticketData, setTicketData, currentUser, onPromote, onAddQuery, isWorkflowActive, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const isDark = theme === 'dark';
  const data = ticketData || { title: "N/A", requestor: "N/A", department: "N/A", changeType: "N/A", description: "No description available." };

  const [departmentStatuses, setDepartmentStatuses] = useState(ticketData?.reviewStatuses || { mechanical: 'Pending', safety: 'Pending' });
  const [comments, setComments] = useState(ticketData?.reviewComments || { mechanical: '', safety: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionTakenByDept, setActionTakenByDept] = useState({});

  const handleAction = (deptId, actionType, deptRole) => {
    if ((actionType === 'Query Sent' || actionType === 'Rejected') && comments[deptId].trim() === '') {
      return alert("Please provide comments in the text box before querying or rejecting.");
    }
    setIsProcessing(true);
    setTimeout(() => {
      const newStatuses = { ...departmentStatuses, [deptId]: actionType };
      setDepartmentStatuses(newStatuses);
      setActionTakenByDept(prev => ({ ...prev, [deptId]: actionType }));
      if (setTicketData) {
        setTicketData(prev => ({ ...prev, reviewStatuses: newStatuses, reviewComments: comments }));
      }
      if (actionType === 'Query Sent' && onAddQuery) {
        onAddQuery({ from: deptRole, to: 'Process Engineer / Initiator', description: comments[deptId] });
      }
      const updatedAllApproved = Object.values(newStatuses).every(s => s === 'Approved');
      if (updatedAllApproved && isWorkflowActive && onPromote) onPromote();
      setIsProcessing(false);
    }, 500);
  };

  const isFullyApproved = Object.values(departmentStatuses).every(s => s === 'Approved');
  const hasRejection = Object.values(departmentStatuses).some(s => s === 'Rejected');
  const hasQuery = Object.values(departmentStatuses).some(s => s === 'Query Sent');

  return (
    <div style={styles.container}>

      {/* Info card */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>5</span>
          Review Group — Parallel Evaluation
        </h3>

        {/* Universal View */}
        {(!isWorkflowActive || !currentUser.designation.includes('Reviewer')) && !isCompleted && !isFullyApproved && !hasRejection && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span>
              <strong>Universal View — Read Only.</strong>{' '}
              {!isWorkflowActive ? 'The workflow is currently at a different stage.' : 'This stage is awaiting action from the authorized role.'}
            </span>
          </div>
        )}

        {/* Overall result banners */}
        {isFullyApproved && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
              <span>✅</span>
              <span><strong>All Parallel Reviews Complete!</strong> All departments have approved. The workflow advances to Site Head Approval.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>🎉</span>
              <span>Thank you for completing the review. You may now review other stages using the stage tracker above.</span>
            </div>
          </>
        )}
        {hasRejection && !isFullyApproved && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertError }}>
              <span>⛔</span>
              <span><strong>MOC Halted:</strong> One or more departments have rejected this ticket. It will be returned to the Initiator.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>📋</span>
              <span>Your rejection has been recorded. Please coordinate with the initiator for corrective action and resubmission.</span>
            </div>
          </>
        )}
        {hasQuery && !hasRejection && !isFullyApproved && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>❓</span>
            <span><strong>Workflow Paused:</strong> A department has raised a query. Waiting for clarification before the review can proceed.</span>
          </div>
        )}

        <div style={styles.metaGrid}>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>MOC Title</span><span style={styles.metaValue}>{data.title}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Initiator</span><span style={styles.metaValue}>{data.requestor}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Primary Dept</span><span style={styles.metaValue}>{data.department}</span></div>
        </div>
      </div>

      {/* Department cards */}
      <div style={styles.departmentGrid}>
        {departmentsRequired.map((dept) => {
          const hasPermission = currentUser.designation === dept.requiredRole;
          const canAct = hasPermission && isWorkflowActive;
          const currentStatus = departmentStatuses[dept.id];
          const deptAction = actionTakenByDept[dept.id];

          return (
            <div key={dept.id} style={styles.departmentCard(currentStatus)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: isDark ? '#e8e8ff' : '#1a1a3e' }}>{dept.title}</h4>
                <span style={styles.statusBadge(currentStatus)}>{currentStatus}</span>
              </div>

              {/* Department-specific action banners */}
              {deptAction === 'Approved' && (
                <>
                  <div style={{ ...styles.alertBase, ...styles.alertSuccess, marginBottom: '4px' }}>
                    <span>✅</span><span><strong>Approved!</strong> Your department's review is complete.</span>
                  </div>
                  <div style={{ ...styles.alertBase, ...styles.alertApproved, marginBottom: 0 }}>
                    <span>🎉</span><span>Thank you for your review. You may review other stages using the tracker.</span>
                  </div>
                </>
              )}
              {deptAction === 'Query Sent' && (
                <>
                  <div style={{ ...styles.alertBase, ...styles.alertWarning, marginBottom: '4px' }}>
                    <span>❓</span><span><strong>Query Raised.</strong> Your query has been logged and sent to the initiator.</span>
                  </div>
                  <div style={{ ...styles.alertBase, ...styles.alertApproved, marginBottom: 0 }}>
                    <span>📬</span><span>Review other stages while awaiting a response.</span>
                  </div>
                </>
              )}
              {deptAction === 'Rejected' && (
                <>
                  <div style={{ ...styles.alertBase, ...styles.alertError, marginBottom: '4px' }}>
                    <span>⛔</span><span><strong>Rejected.</strong> Your department has rejected this MOC.</span>
                  </div>
                  <div style={{ ...styles.alertBase, ...styles.alertWarning, marginBottom: 0 }}>
                    <span>📋</span><span>Please coordinate with the initiator for next steps.</span>
                  </div>
                </>
              )}

              {/* Action UI */}
              {!deptAction && currentStatus === 'Pending' && canAct && (
                <>
                  <textarea
                    style={styles.textarea}
                    placeholder="Comments are required for Query / Reject..."
                    value={comments[dept.id]}
                    onChange={(e) => {
                      const newComments = { ...comments, [dept.id]: e.target.value };
                      setComments(newComments);
                      if (setTicketData) setTicketData(prev => ({ ...prev, reviewComments: newComments }));
                    }}
                  />
                  <div style={styles.buttonGroup}>
                    <button style={styles.btnApprove} onClick={() => handleAction(dept.id, 'Approved', dept.requiredRole)} disabled={isProcessing}>✓ Approve</button>
                    <button style={styles.btnQuery} onClick={() => handleAction(dept.id, 'Query Sent', dept.requiredRole)} disabled={isProcessing}>? Raise Query</button>
                    <button style={styles.btnReject} onClick={() => handleAction(dept.id, 'Rejected', dept.requiredRole)} disabled={isProcessing}>✗ Reject</button>
                  </div>
                </>
              )}

              {!deptAction && !canAct && currentStatus === 'Pending' && (
                <div style={styles.buttonDisabled}>🔒 Awaiting {dept.requiredRole}</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default ReviewGroupStage;