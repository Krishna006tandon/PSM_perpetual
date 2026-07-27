import React, { useState } from 'react';

const getStyles = (theme) => {
  const isDark = theme === 'dark';
  return {
    container: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' },

    // Cards with subtle gradient border
    card: {
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      borderRadius: '12px',
      padding: '28px',
      boxShadow: isDark
        ? '0 4px 24px rgba(0,0,0,0.4)'
        : '0 2px 16px rgba(0,0,0,0.08)',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      position: 'relative',
      overflow: 'hidden',
    },

    cardAccentBlue: {
      borderTop: '3px solid #1a73e8',
    },
    cardAccentGreen: {
      borderTop: '3px solid #137333',
    },
    cardAccentLocked: {
      borderTop: '3px solid #555',
    },

    sectionTitle: {
      marginTop: 0,
      paddingBottom: '14px',
      marginBottom: '20px',
      fontSize: '17px',
      fontWeight: '700',
      letterSpacing: '0.3px',
      borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },

    stagePill: (color) => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '26px',
      borderRadius: '50%',
      fontSize: '12px',
      fontWeight: '700',
      backgroundColor: color,
      color: 'white',
      flexShrink: 0,
    }),

    questionRow: {
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #f0f0f8',
    },
    questionText: { fontSize: '14px', fontWeight: '500', marginBottom: '14px', color: isDark ? '#c8c8e8' : '#333' },

    radioGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    radioOption: (selected, color) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: selected ? '700' : '400',
      padding: '6px 14px',
      borderRadius: '20px',
      border: selected ? `2px solid ${color}` : isDark ? '2px solid #2a2a4a' : '2px solid #e0e0f0',
      backgroundColor: selected ? (isDark ? `${color}22` : `${color}11`) : 'transparent',
      color: selected ? color : isDark ? '#aaa' : '#666',
      transition: 'all 0.15s ease',
    }),

    buttonGroup: { display: 'flex', gap: '10px', marginTop: '20px' },
    btn: (bg, textColor) => ({
      backgroundColor: bg,
      color: textColor || 'white',
      border: 'none',
      padding: '11px 22px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      flex: 1,
      fontSize: '14px',
      transition: 'opacity 0.15s ease, transform 0.1s ease',
      letterSpacing: '0.2px',
    }),

    buttonPrimary: {
      backgroundColor: '#1a73e8',
      color: 'white',
      border: 'none',
      padding: '10px 22px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'opacity 0.15s, transform 0.1s',
    },

    buttonDisabled: {
      backgroundColor: isDark ? '#2a2a3a' : '#e8e8f0',
      color: isDark ? '#555' : '#aaa',
      cursor: 'not-allowed',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      width: '100%',
      fontSize: '13px',
    },

    // Alert variants
    alertBase: {
      padding: '14px 18px',
      borderRadius: '10px',
      marginBottom: '18px',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      lineHeight: '1.5',
    },
    alertSuccess: {
      backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea',
      color: isDark ? '#81c995' : '#137333',
      border: isDark ? '1px solid #137333' : '1px solid #ceead6',
    },
    alertWarning: {
      backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0',
      color: isDark ? '#fde293' : '#7a4f00',
      border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3',
    },
    alertError: {
      backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6',
      color: isDark ? '#f28b82' : '#c5221f',
      border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da',
    },
    alertApproved: {
      backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe',
      color: isDark ? '#8ab4f8' : '#1a56c4',
      border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8',
    },

    textarea: {
      padding: '12px 14px',
      borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#12122a' : '#f8f9fe',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px',
      outline: 'none',
      minHeight: '85px',
      width: '100%',
      boxSizing: 'border-box',
      resize: 'vertical',
      lineHeight: '1.5',
      transition: 'border-color 0.2s',
    },

    lockedOverlay: {
      opacity: 0.45,
      pointerEvents: 'none',
      filter: 'grayscale(60%)',
    },

    lockedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '11px',
      fontWeight: '700',
      padding: '3px 10px',
      borderRadius: '20px',
      backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0',
      color: isDark ? '#fde293' : '#7a4f00',
      border: isDark ? '1px solid rgba(249,171,0,0.3)' : '1px solid #feefc3',
    },

    btnNavPrev: {
      backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8',
      color: isDark ? '#aaa' : '#555',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee',
      padding: '10px 20px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    btnNavNext: {
      backgroundColor: '#1a73e8',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },

    divider: {
      height: '1px',
      backgroundColor: isDark ? '#2a2a4a' : '#e8eaf6',
      margin: '20px 0',
    },

    infoBlock: {
      padding: '14px 16px',
      borderRadius: '8px',
      backgroundColor: isDark ? '#12122a' : '#f5f6fe',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0',
      fontSize: '13px',
      color: isDark ? '#aab' : '#555',
      lineHeight: '1.6',
      borderLeft: '3px solid #1a73e8',
      marginBottom: '16px',
    },
  };
};

const ChecklistModule = ({ theme, ticketData, setTicketData, currentUser, onPromote, onStage3Promote, onAddQuery, currentStageIndex, viewingStageIndex, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const isDark = theme === 'dark';

  // RBAC Checks for both Stage 3 & Stage 4
  const hasCtsPermission = currentUser.designation === 'CTS Reviewer';
  const hasCtsHeadPermission = currentUser.designation === 'CTS Head';

  // Stage 3 active = workflow tracker is at index 2 (CTS Reviewer's turn)
  // Stage 4 active = workflow tracker is at index 3 (CTS Head's turn)
  // These are independent of which tab the user is currently VIEWING.
  const isStage3Active = currentStageIndex === 2;
  const isStage4Active = currentStageIndex === 3;

  const [items, setItems] = useState(ticketData?.checklistItems || [
    { id: 1, question: "Is the updated P&ID attached and verified?", status: "Pending" },
    { id: 2, question: "Do the consequence text fields explicitly define operational harm?", status: "Pending" },
    { id: 3, question: "Has the temporary MOC duration been correctly verified?", status: "Pending" }
  ]);

  const [isSubmittingStage3, setIsSubmittingStage3] = useState(false);
  const [isStage3Approved, setIsStage3Approved] = useState(ticketData?.isStage3Approved || false);
  const [isFrozenResponse, setIsFrozenResponse] = useState(ticketData?.isFrozenResponse || false);
  const [stage3ActionTaken, setStage3ActionTaken] = useState(false);

  const [stage4Status, setStage4Status] = useState(ticketData?.stage4Status || null);
  const [stage4Comments, setStage4Comments] = useState(ticketData?.stage4Comments || '');
  const [isProcessingStage4, setIsProcessingStage4] = useState(false);

  // CTS Reviewer can act when the workflow is genuinely at stage 3 (index 2)
  const canActStage3 = hasCtsPermission && isStage3Active;
  // CTS Head can act when the workflow is genuinely at stage 4 (index 3)
  // — regardless of which tab (2 or 3) the user navigated to
  const canActStage4 = hasCtsHeadPermission && isStage4Active;

  // --- STAGE 3 LOGIC ---
  const handleStatusChange = (id, newStatus) => {
    if (!canActStage3) return;
    const newItems = items.map(item => item.id === id ? { ...item, status: newStatus } : item);
    setItems(newItems);
    setIsStage3Approved(false);
    setStage4Status(null);
    if (setTicketData) {
      setTicketData(prev => ({ ...prev, checklistItems: newItems, isStage3Approved: false, stage4Status: null }));
    }
  };

  const handleSubmitStage3 = () => {
    if (!canActStage3) return;
    const isComplete = items.every(item => item.status !== "Pending");
    if (!isComplete) return alert("Please answer all checklist items.");

    setIsSubmittingStage3(true);
    setTimeout(() => {
      const hasNoAnswer = items.some(item => item.status === 'No');
      setIsFrozenResponse(hasNoAnswer);
      setIsStage3Approved(!hasNoAnswer);
      setStage3ActionTaken(true);
      if (setTicketData) {
        setTicketData(prev => ({ ...prev, isStage3Approved: !hasNoAnswer, isFrozenResponse: hasNoAnswer, checklistItems: items }));
      }
      setIsSubmittingStage3(false);
      // Advance workflow from Stage 3 → Stage 4 so CTS Head can act
      if (!hasNoAnswer && onStage3Promote) {
        onStage3Promote();
      }
    }, 500);
  };

  // --- STAGE 4 LOGIC ---
  const handleStage4Action = (actionType) => {
    if (!canActStage4) return;
    if ((actionType === 'Query Sent' || actionType === 'Rejected') && stage4Comments.trim() === '') {
      return alert("Please provide comments in the text box before querying or rejecting.");
    }

    setIsProcessingStage4(true);
    setTimeout(() => {
      setStage4Status(actionType);
      if (setTicketData) {
        setTicketData(prev => ({ ...prev, stage4Status: actionType, stage4Comments: stage4Comments }));
      }
      if (actionType === 'Query Sent' && onAddQuery) {
        onAddQuery({ from: 'CTS Head', to: 'CTS Reviewer / Initiator', description: stage4Comments });
      }
      if (actionType === 'Approved' && onPromote) {
        onPromote();
      }
      setIsProcessingStage4(false);
    }, 500);
  };

  const radioColor = { Yes: '#137333', No: '#c5221f', NA: '#1a73e8' };

  return (
    <div style={styles.container}>

      {/* ── UNIVERSAL VIEW BANNER ── */}
      {((!isStage3Active && !isStage4Active) || (!hasCtsPermission && !hasCtsHeadPermission)) && !isCompleted && !isStage3Approved && !stage4Status && (
        <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <span>
            <strong>Universal View — Read Only.</strong>{' '}
            {(!isStage3Active && !isStage4Active)
              ? 'The workflow is currently at a different stage.'
              : 'This stage is awaiting action from the authorized role.'}
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STAGE 3 CARD
      ══════════════════════════════════════════ */}
      <div style={{ ...styles.card, ...styles.cardAccentBlue }}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill('#1a73e8')}>3</span>
          Corporate Technical Services (CTS) Review
        </h3>

        {/* Status banners */}
        {isFrozenResponse && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>⚠️</span>
            <span><strong>Checklist Frozen:</strong> A 'No' response was detected. This MOC is on hold pending resolution.</span>
          </div>
        )}

        {isStage3Approved && (
          <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
            <span>✅</span>
            <span>Checklist verified successfully. Cleared for CTS Head review in Stage 4.</span>
          </div>
        )}

        {/* Stage 3 approved confirmation (only after CTS Reviewer submits) */}
        {stage3ActionTaken && isStage3Approved && (
          <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
            <span>🎉</span>
            <span>
              <strong>Stage 3 submitted!</strong> The checklist has been processed. Thank you for your patience — please review other stages using the tracker above.
            </span>
          </div>
        )}

        {stage3ActionTaken && !isStage3Approved && (
          <div style={{ ...styles.alertBase, ...styles.alertError }}>
            <span>⛔</span>
            <span>
              <strong>Checklist frozen.</strong> One or more items were answered 'No'. The MOC is on hold. Please review and resubmit once resolved.
            </span>
          </div>
        )}

        {/* Checklist Items */}
        <div style={{
          opacity: !canActStage3 && !isStage3Approved ? 0.65 : 1,
          pointerEvents: canActStage3 ? 'auto' : 'none'
        }}>
          {items.map((item, index) => (
            <div key={item.id} style={{
              ...styles.questionRow,
              borderBottom: index === items.length - 1 ? 'none' : styles.questionRow.borderBottom
            }}>
              <div style={styles.questionText}>{index + 1}. {item.question}</div>
              <div style={styles.radioGroup}>
                {['Yes', 'No', 'NA'].map(option => (
                  <label key={option} style={styles.radioOption(item.status === option, radioColor[option])}>
                    <input
                      type="radio"
                      value={option}
                      checked={item.status === option}
                      onChange={() => handleStatusChange(item.id, option)}
                      style={{ display: 'none' }}
                    />
                    {option === 'Yes' ? '✓' : option === 'No' ? '✗' : '—'} {option}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {canActStage3 && !isStage3Approved && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.buttonPrimary, ...(isSubmittingStage3 ? styles.buttonDisabled : {}) }}
                onClick={handleSubmitStage3}
                disabled={isSubmittingStage3}
              >
                {isSubmittingStage3 ? '⏳ Processing...' : '✓ Submit Verification'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          STAGE 4 CARD — CTS Head Verification
          Bug fix: was locked unless isStage4Active.
          Now unlocks as soon as isStage3Approved === true,
          and canActStage4 gates the buttons correctly.
      ══════════════════════════════════════════ */}
      <div style={{
        ...styles.card,
        ...(isStage3Approved ? styles.cardAccentGreen : styles.cardAccentLocked),
        ...(!isStage3Approved ? styles.lockedOverlay : {}),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...styles.sectionTitle }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={styles.stagePill(isStage3Approved ? '#137333' : '#555')}>4</span>
            CTS Head Verification
          </span>
          {!isStage3Approved && (
            <span style={styles.lockedBadge}>🔒 Awaiting Stage 3</span>
          )}
          {isStage3Approved && !canActStage4 && !stage4Status && (
            <span style={styles.lockedBadge}>🔒 Awaiting CTS Head</span>
          )}
        </div>

        {/* Stage 4 result banners */}
        {stage4Status === 'Approved' && (
          <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
            <span>🎉</span>
            <span>
              <strong>Approved by CTS Head!</strong> The MOC ticket has been authorized and is ready for the Review Group stage. Thank you for your patience — review other stages using the tracker above.
            </span>
          </div>
        )}

        {stage4Status === 'Rejected' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertError }}>
              <span>⛔</span>
              <span><strong>MOC Halted:</strong> CTS Head Verification was Rejected. Please review the query log for details.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>📋</span>
              <span>Your rejection has been recorded. Please review the other stages using the tracker above and coordinate with the team for next steps.</span>
            </div>
          </>
        )}

        {stage4Status === 'Query Sent' && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
              <span>❓</span>
              <span><strong>Query Raised:</strong> CTS Head has raised a query. The workflow is paused pending clarification.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>📬</span>
              <span>Your query has been logged and sent to the CTS Reviewer. Thank you for your patience — you may review other stages using the tracker above.</span>
            </div>
          </>
        )}

        {/* Action form — shown only if stage 3 approved, no action taken yet, and CTS Head can act */}
        {isStage3Approved && !stage4Status && (
          <>
            {canActStage4 ? (
              <>
                <div style={styles.infoBlock}>
                  <strong>CTS Head:</strong> Review the checklist responses from the CTS Reviewer and authorize this ticket to advance to the Review Group stage.
                </div>
                <textarea
                  style={styles.textarea}
                  placeholder="Comments are required for Query / Reject..."
                  value={stage4Comments}
                  onChange={(e) => {
                    setStage4Comments(e.target.value);
                    if (setTicketData) setTicketData(prev => ({ ...prev, stage4Comments: e.target.value }));
                  }}
                />
                <div style={styles.buttonGroup}>
                  <button style={styles.btn('#137333')} onClick={() => handleStage4Action('Approved')} disabled={isProcessingStage4}>
                    {isProcessingStage4 ? '⏳ Processing...' : '✓ Approve'}
                  </button>
                  <button style={styles.btn('#f9ab00', '#333')} onClick={() => handleStage4Action('Query Sent')} disabled={isProcessingStage4}>
                    ? Raise Query
                  </button>
                  <button style={styles.btn('#dc3545')} onClick={() => handleStage4Action('Rejected')} disabled={isProcessingStage4}>
                    ✗ Reject
                  </button>
                </div>
              </>
            ) : (
              <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
                <span>🔒</span>
                <span>Awaiting action from the CTS Head. You have read-only access to this section.</span>
              </div>
            )}
          </>
        )}

        {/* Archived remarks — shown after action is taken */}
        {stage4Status && stage4Comments && (
          <div style={{ ...styles.infoBlock, marginTop: '16px', marginBottom: 0 }}>
            <strong>CTS Head Remarks (Archived):</strong>
            <p style={{ marginTop: '6px', marginBottom: 0, color: isDark ? '#aab' : '#555' }}>
              {ticketData?.stage4Comments || stage4Comments || 'No specific remarks provided.'}
            </p>
          </div>
        )}
      </div>

      {/* STAGE NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>

    </div>
  );
};

export default ChecklistModule;