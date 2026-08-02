import React, { useState, useEffect } from 'react';
import { mocService } from '../../api/mocService';

const getStyles = (theme) => {
  const isDark = theme === 'dark';
  return {
    container: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' },

    card: {
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      borderRadius: '12px',
      padding: '28px',
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.08)',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      position: 'relative',
      overflow: 'hidden',
    },

    cardAccentBlue: { borderTop: '3px solid #1a73e8' },
    cardAccentGreen: { borderTop: '3px solid #137333' },
    cardAccentLocked: { borderTop: '3px solid #555' },

    sectionTitle: {
      marginTop: 0, paddingBottom: '14px', marginBottom: '20px', fontSize: '17px',
      fontWeight: '700', letterSpacing: '0.3px',
      borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
      display: 'flex', alignItems: 'center', gap: '10px',
    },

    stagePill: (color) => ({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '26px', height: '26px', borderRadius: '50%', fontSize: '12px',
      fontWeight: '700', backgroundColor: color, color: 'white', flexShrink: 0,
    }),

    questionRow: { display: 'flex', flexDirection: 'column', padding: '16px 0', borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #f0f0f8' },
    questionText: { fontSize: '14px', fontWeight: '500', marginBottom: '14px', color: isDark ? '#c8c8e8' : '#333', display: 'flex', justifyContent: 'space-between' },

    radioGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    radioOption: (selected, color) => ({
      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
      fontSize: '13px', fontWeight: selected ? '700' : '400', padding: '6px 14px', borderRadius: '20px',
      border: selected ? `2px solid ${color}` : isDark ? '2px solid #2a2a4a' : '2px solid #e0e0f0',
      backgroundColor: selected ? (isDark ? `${color}22` : `${color}11`) : 'transparent',
      color: selected ? color : isDark ? '#aaa' : '#666', transition: 'all 0.15s ease',
    }),

    buttonGroup: { display: 'flex', gap: '10px', marginTop: '20px' },
    btn: (bg, textColor) => ({
      backgroundColor: bg, color: textColor || 'white', border: 'none', padding: '11px 22px',
      borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px', transition: 'opacity 0.15s'
    }),
    buttonPrimary: {
      backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'
    },
    buttonDisabled: { backgroundColor: isDark ? '#2a2a3a' : '#e8e8f0', color: isDark ? '#555' : '#aaa', cursor: 'not-allowed', width: '100%', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', border: 'none' },
    
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '18px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertSuccess: { backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertError: { backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f', border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    
    textarea: { padding: '12px 14px', borderRadius: '8px', border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8', backgroundColor: isDark ? '#12122a' : '#f8f9fe', color: isDark ? '#e8e8ff' : '#1a1a3e', fontSize: '14px', outline: 'none', minHeight: '85px', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5' },
    
    lockedOverlay: { opacity: 0.45, pointerEvents: 'none', filter: 'grayscale(60%)' },
    lockedBadge: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.3)' : '1px solid #feefc3' },
    
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    infoBlock: { padding: '14px 16px', borderRadius: '8px', backgroundColor: isDark ? '#12122a' : '#f5f6fe', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0', fontSize: '13px', color: isDark ? '#aab' : '#555', lineHeight: '1.6', borderLeft: '3px solid #1a73e8', marginBottom: '16px' },

    addQRow: { display: 'flex', gap: '10px', marginTop: '16px', alignItems: 'center' },
    inputQ: { flex: 1, padding: '10px', borderRadius: '8px', border: isDark ? '1px solid #2a2a4a' : '1px solid #ccc', backgroundColor: isDark ? '#12122a' : '#fff', color: isDark ? '#fff' : '#000' },
    btnManage: { backgroundColor: 'transparent', border: isDark ? '1px solid #555' : '1px solid #ccc', color: isDark ? '#aaa' : '#555', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' },
    btnDelete: { backgroundColor: 'transparent', border: 'none', color: '#c5221f', cursor: 'pointer', fontSize: '16px' }
  };
};

const ChecklistModule = ({ theme, ticketData, setTicketData, currentUser, onPromote, onStage3Promote, onAddQuery, currentStageIndex, viewingStageIndex, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const isDark = theme === 'dark';

  const hasCtsPermission = currentUser.designation === 'CTS Reviewer';
  const hasCtsHeadPermission = currentUser.designation === 'CTS Head';

  const isStage3Active = currentStageIndex === 2;
  const isStage4Active = currentStageIndex === 3;
  const canActStage3 = hasCtsPermission && isStage3Active;
  const canActStage4 = hasCtsHeadPermission && isStage4Active;

  // --- STAGE 3 STATE ---
  const [items, setItems] = useState([]);
  const [isSubmittingStage3, setIsSubmittingStage3] = useState(false);
  const [isStage3Approved, setIsStage3Approved] = useState(currentStageIndex >= 3);
  const [isFrozenResponse, setIsFrozenResponse] = useState(false);

  const [isManageMode, setIsManageMode] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');

  // --- STAGE 4 STATE ---
  const [stage4Status, setStage4Status] = useState(null);
  const [stage4Comments, setStage4Comments] = useState('');
  const [isProcessingStage4, setIsProcessingStage4] = useState(false);

  // Synchronize state when props update
  useEffect(() => {
    setIsStage3Approved(currentStageIndex >= 3);
    const h = ticketData?.stageHistory?.find(hist => hist.stageIndex === 3);
    if (h) {
      setStage4Status(h.action);
      setStage4Comments(h.comments);
    }
  }, [currentStageIndex, ticketData]);

  // Fetch Questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        let templateData = null;
        try {
          templateData = await mocService.getTemplateByDept('ctsReview');
        } catch (e) {
          // Setup default template if missing
          templateData = await mocService.upsertTemplate('ctsReview', {
            departmentName: 'CTS Review',
            questions: [
              { questionText: "Is the updated P&ID attached and verified?" },
              { questionText: "Do the consequence text fields explicitly define operational harm?" },
              { questionText: "Has the temporary MOC duration been correctly verified?" }
            ]
          });
        }
        
        const templateQuestions = templateData.questions || [];
        const savedResponses = ticketData?.checklistResponses?.stage3 || [];
        
        // Merge DB questions with saved answers
        const merged = templateQuestions.map(q => {
          const saved = savedResponses.find(r => r.question === q.questionText);
          return {
            id: q._id || q.id || q.questionText,
            question: q.questionText,
            status: saved ? saved.status : 'Pending',
          };
        });
        setItems(merged);
      } catch (err) {
        console.error("Failed to fetch CTS Review checklist", err);
      }
    };
    fetchQuestions();
  }, [ticketData]);

  // --- STAGE 3 ACTIONS ---
  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;
    try {
      const res = await mocService.addQuestion('ctsReview', { text: newQuestionText.trim() });
      const newQ = {
        id: res.question?._id || newQuestionText.trim(),
        question: newQuestionText.trim(),
        status: 'Pending'
      };
      setItems(prev => [...prev, newQ]);
      setNewQuestionText('');
    } catch (err) {
      console.error("Failed to add question", err);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    try {
      await mocService.removeQuestion('ctsReview', qId);
      setItems(prev => prev.filter(q => q.id !== qId));
    } catch (err) {
      console.error("Failed to remove question", err);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    if (!canActStage3) return;
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    setIsStage3Approved(false);
    setStage4Status(null);
  };

  const handleSubmitStage3 = async () => {
    if (!canActStage3) return;
    if (items.length > 0 && items.some(item => item.status === "Pending")) {
      return alert("Please answer all checklist items.");
    }

    setIsSubmittingStage3(true);
    try {
      const hasNoAnswer = items.some(item => item.status === 'No');
      
      if (ticketData && (ticketData.mocId || ticketData._id)) {
        await mocService.submitChecklist(ticketData.mocId || ticketData._id, {
          stage: 'stage3',
          data: items
        });

        if (!hasNoAnswer) {
          await mocService.advanceStage(ticketData.mocId || ticketData._id, {
            action: 'Approved',
            actor: { name: currentUser.name, designation: currentUser.designation },
            comments: 'CTS Verification completed successfully.'
          });
        }
      }

      setIsFrozenResponse(hasNoAnswer);
      setIsStage3Approved(!hasNoAnswer);
      setIsSubmittingStage3(false);

      if (!hasNoAnswer && onStage3Promote) {
        onStage3Promote();
      }
    } catch (err) {
      console.error("Failed to submit Stage 3 checklist", err);
      setIsSubmittingStage3(false);
      alert("Database error: Could not submit checklist.");
    }
  };

  // --- STAGE 4 ACTIONS ---
  const handleStage4Action = async (actionType) => {
    if (!canActStage4) return;
    if ((actionType === 'Query Sent' || actionType === 'Rejected') && stage4Comments.trim() === '') {
      return alert("Please provide comments in the text box before querying or rejecting.");
    }

    setIsProcessingStage4(true);
    try {
      if (ticketData && (ticketData.mocId || ticketData._id)) {
        const payload = {
          action: actionType === 'Approved' ? 'Approved' : actionType === 'Rejected' ? 'Rejected' : 'Query Sent',
          actor: { name: currentUser.name, designation: currentUser.designation },
          comments: stage4Comments || 'CTS Head Verification'
        };

        if (actionType === 'Approved') {
          await mocService.advanceStage(ticketData.mocId || ticketData._id, payload);
        } else if (actionType === 'Rejected') {
          await mocService.rejectMOC(ticketData.mocId || ticketData._id, payload);
        }
      }

      setStage4Status(actionType);
      if (actionType === 'Query Sent' && onAddQuery) {
        onAddQuery({ from: 'CTS Head', to: 'CTS Reviewer / Initiator', description: stage4Comments });
      }
      
      setIsProcessingStage4(false);
      if (actionType === 'Approved' && onPromote) {
        onPromote(); 
      }
    } catch (err) {
      console.error("Failed to submit Stage 4 action", err);
      setIsProcessingStage4(false);
      alert("Database error: Could not process action.");
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...styles.sectionTitle }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={styles.stagePill('#1a73e8')}>3</span>
            Corporate Technical Services (CTS) Review
          </span>
          {canActStage3 && (
            <button style={styles.btnManage} onClick={() => setIsManageMode(!isManageMode)}>
              {isManageMode ? 'Done' : 'Manage Questions'}
            </button>
          )}
        </div>

        {isFrozenResponse && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>⚠️</span>
            <span><strong>Checklist Frozen:</strong> A 'No' response was detected. This MOC is on hold.</span>
          </div>
        )}
        {isStage3Approved && (
          <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
            <span>✅</span>
            <span>Checklist verified successfully. Cleared for CTS Head review in Stage 4.</span>
          </div>
        )}

        <div style={{
          opacity: !canActStage3 && !isStage3Approved ? 0.65 : 1,
          pointerEvents: canActStage3 ? 'auto' : 'none'
        }}>
          {items.map((item, index) => (
            <div key={item.id} style={styles.questionRow}>
              <div style={styles.questionText}>
                <span>{index + 1}. {item.question}</span>
                {isManageMode && canActStage3 && (
                  <button style={styles.btnDelete} onClick={() => handleDeleteQuestion(item.id)} title="Delete Question">
                    ×
                  </button>
                )}
              </div>
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

          {isManageMode && canActStage3 && (
            <div style={styles.addQRow}>
              <input 
                type="text" 
                style={styles.inputQ} 
                placeholder="Type a new question..."
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
              />
              <button style={{ ...styles.buttonPrimary, padding: '10px 16px' }} onClick={handleAddQuestion}>
                + Add
              </button>
            </div>
          )}

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

        {stage4Status === 'Approved' && (
          <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
            <span>🎉</span>
            <span><strong>Approved by CTS Head!</strong> The MOC ticket has been authorized and is ready for the Review Group stage.</span>
          </div>
        )}

        {stage4Status === 'Rejected' && (
          <div style={{ ...styles.alertBase, ...styles.alertError }}>
            <span>⛔</span>
            <span><strong>MOC Halted:</strong> CTS Head Verification was Rejected. Please review the query log for details.</span>
          </div>
        )}

        {stage4Status === 'Query Sent' && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>❓</span>
            <span><strong>Query Raised:</strong> CTS Head has raised a query. The workflow is paused pending clarification.</span>
          </div>
        )}

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
                  onChange={(e) => setStage4Comments(e.target.value)}
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

        {stage4Status && stage4Comments && (
          <div style={{ ...styles.infoBlock, marginTop: '16px', marginBottom: 0 }}>
            <strong>CTS Head Remarks (Archived):</strong>
            <p style={{ marginTop: '6px', marginBottom: 0, color: isDark ? '#aab' : '#555' }}>
              {stage4Comments || 'No specific remarks provided.'}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default ChecklistModule;