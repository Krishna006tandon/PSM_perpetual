import React, { useState, useEffect } from 'react';
import { mocService } from '../../api/mocService';

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
    departmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' },
    departmentCard: (status, isExpanded) => {
      const borderColor = status === 'Approved' ? '#137333' : status === 'Rejected' ? '#c5221f' : status === 'Query Sent' ? '#f9ab00' : isDark ? '#2a2a4a' : '#e0e2f0';
      return {
        borderRadius: '10px',
        backgroundColor: isDark ? '#12122a' : '#f8f9fe',
        border: `1px solid ${borderColor}`,
        borderTop: `4px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.2s',
        overflow: 'hidden',
      };
    },
    departmentHeader: {
      padding: '16px 20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      cursor: 'pointer', backgroundColor: isDark ? '#1a1a35' : '#ffffff',
      borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0',
    },
    departmentBody: {
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
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
    statusDot: (status) => {
      const color = status === 'Approved' ? '#137333' : status === 'Pending' ? (isDark ? '#555' : '#ccc') : '#f9ab00';
      return { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' };
    },
    questionRow: { display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '16px', borderBottom: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0' },
    questionText: { fontSize: '14px', fontWeight: '600', color: isDark ? '#e8e8ff' : '#1a1a3e' },
    radioGroup: { display: 'flex', gap: '16px', alignItems: 'center' },
    radioLabel: { fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
    textarea: { padding: '10px', borderRadius: '6px', border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8', backgroundColor: isDark ? '#1a1a2e' : '#ffffff', color: isDark ? '#e8e8ff' : '#1a1a3e', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' },
    buttonGroup: { display: 'flex', gap: '8px', marginTop: '10px' },
    btnApprove: { backgroundColor: '#137333', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '13px' },
    btnQuery: { backgroundColor: '#f9ab00', color: '#333', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '13px' },
    btnReject: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '13px' },
    buttonDisabled: { backgroundColor: isDark ? '#2a2a3a' : '#e8e8f0', color: isDark ? '#555' : '#aaa', cursor: 'not-allowed', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', flex: 1, fontSize: '13px', textAlign: 'center' },
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '14px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertSuccess: { backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertError: { backgroundColor: isDark ? 'rgba(197,34,31,0.18)' : '#fce8e6', color: isDark ? '#f28b82' : '#c5221f', border: isDark ? '1px solid #c5221f' : '1px solid #f8d7da' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    toggleBtn: { background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontWeight: '600', fontSize: '14px', padding: '4px 8px' },
    counter: { fontSize: '14px', fontWeight: '600', color: isDark ? '#a0a0c0' : '#666', marginTop: '-10px', marginBottom: '20px' }
  };
};

const departments = [
  { id: 'generalHazid', title: 'General Hazid', role: 'General Hazid Reviewer' },
  { id: 'operationsEngineer', title: 'Operations Engineer', role: 'Operations Reviewer' },
  { id: 'safeOperatingLimit', title: 'Safe Operating Limit', role: 'SOL Reviewer' },
  { id: 'processTechnology', title: 'Process Technology', role: 'Process Tech Reviewer' },
  { id: 'controlInstrumentation', title: 'Control & Instrumentation', role: 'C&I Reviewer' },
  { id: 'electrical', title: 'Electrical', role: 'Electrical Reviewer' },
  { id: 'inspection', title: 'Inspection', role: 'Inspection Reviewer' },
  { id: 'warehouseStore', title: 'Warehouse / Store', role: 'Warehouse Reviewer' },
  { id: 'hse', title: 'HSE', role: 'HSE Reviewer' },
];

const initialQuestionsState = {};
departments.forEach(d => {
  initialQuestionsState[d.id] = [
    { id: 'q1', text: `Has the impact on ${d.title} been assessed?` },
    { id: 'q2', text: `Are all ${d.title} drawings updated?` },
    { id: 'q3', text: `Is the ${d.title} related documentation complete?` },
    { id: 'q4', text: `Has the ${d.title} team been trained on the changes?` },
  ];
});

const ReviewGroupStage = ({ theme, ticketData, setTicketData, currentUser, onPromote, onAddQuery, isWorkflowActive, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const isDark = theme === 'dark';
  const data = ticketData || { title: "N/A", requestor: "N/A", department: "N/A" };

  const initialStatuses = {};
  const initialChecklists = {};
  const initialExpanded = {};
  
  departments.forEach(d => {
    initialStatuses[d.id] = ticketData?.checklistResponses?.stage5?.[d.id]?.status || 'Pending';
    initialChecklists[d.id] = ticketData?.checklistResponses?.stage5?.[d.id]?.answers || {};
    initialExpanded[d.id] = true;
  });

  const [departmentStatuses, setDepartmentStatuses] = useState(initialStatuses);
  const [checklists, setChecklists] = useState(initialChecklists);
  const [expandedCards, setExpandedCards] = useState(initialExpanded);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (ticketData?.checklistResponses?.stage5) {
      const updatedStatuses = {};
      const updatedChecklists = {};
      departments.forEach(d => {
        updatedStatuses[d.id] = ticketData.checklistResponses.stage5[d.id]?.status || 'Pending';
        updatedChecklists[d.id] = ticketData.checklistResponses.stage5[d.id]?.answers || {};
      });
      setDepartmentStatuses(updatedStatuses);
      setChecklists(updatedChecklists);
    }
  }, [ticketData]);
  const [deptQuestions, setDeptQuestions] = useState(initialQuestionsState);
  const [manageMode, setManageMode] = useState({});
  const [newQTexts, setNewQTexts] = useState({});
  const [queryPrompt, setQueryPrompt] = useState({});
  const [queryDesc, setQueryDesc] = useState({});
  const [queryTo, setQueryTo] = useState({});

  const handleAction = async (deptId, actionType, deptRole, description, to) => {
    setIsProcessing(true);
    let finalActionType = actionType;
    // If submitting approval, check if any question was answered 'No'
    if (actionType === 'Approved') {
      const questions = deptQuestions[deptId] || [];
      const deptChecks = checklists[deptId] || {};
      const hasNo = questions.some(q => deptChecks[q.id]?.answer === 'No');
      if (hasNo) {
        finalActionType = 'Rejected';
      }
    }

    try {
      if ((finalActionType === 'Approved' || finalActionType === 'Rejected') && (ticketData.mocId || ticketData._id)) {
        const currentStage5 = ticketData?.checklistResponses?.stage5 || {};
        const stage5Data = {
          ...currentStage5,
          [deptId]: {
            status: finalActionType,
            answers: checklists[deptId] || {}
          }
        };

        await mocService.submitChecklist(ticketData.mocId || ticketData._id, {
          stage: 'stage5',
          data: stage5Data
        });
      }
    } catch (err) {
      console.error("Failed to submit checklist", err);
    }
    
    // If action is Pending (unlock), do not update expanded state to false
    const newStatuses = { ...departmentStatuses, [deptId]: finalActionType };
    setDepartmentStatuses(newStatuses);
    if (finalActionType !== 'Pending' && finalActionType !== 'Query Sent') {
      setExpandedCards(prev => ({ ...prev, [deptId]: false }));
    }
    
    if (setTicketData) {
      setTicketData(prev => ({ 
        ...prev, 
        checklistResponses: {
          ...(prev?.checklistResponses || {}),
          stage5: {
            ...(prev?.checklistResponses?.stage5 || {}),
            [deptId]: {
              status: finalActionType,
              answers: checklists[deptId] || {}
            }
          }
        }
      }));
    }
    
    if (finalActionType === 'Query Sent' && onAddQuery) {
      onAddQuery({ 
        from: deptRole, 
        to: to || 'Process Engineer / Initiator', 
        description: description || `Query raised from ${deptRole} regarding checklist items.` 
      });
    }
    
    const updatedAllApproved = Object.values(newStatuses).every(s => s === 'Approved');
    if (updatedAllApproved && isWorkflowActive) {
      try {
        await mocService.advanceStage(ticketData.mocId || ticketData._id, {
          actor: { name: currentUser?.name || 'Review Group', designation: 'Review Group Head' },
          comments: 'All 9 departments have formally approved.'
        });
      } catch (err) {
        console.error("Failed to advance stage after all approvals", err);
      }
      if (onPromote) onPromote();
    }
    
    setIsProcessing(false);
  };

  const handleChecklistChange = (deptId, qId, field, value) => {
    setChecklists(prev => {
      const deptChecklist = prev[deptId] || {};
      const questionData = deptChecklist[qId] || { answer: '', remark: '' };
      return {
        ...prev,
        [deptId]: {
          ...deptChecklist,
          [qId]: { ...questionData, [field]: value }
        }
      };
    });
  };

  const toggleExpand = (deptId) => {
    setExpandedCards(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const toggleAll = () => {
    const allExpanded = Object.values(expandedCards).every(Boolean);
    const newState = {};
    departments.forEach(d => newState[d.id] = !allExpanded);
    setExpandedCards(newState);
  };

  const toggleManageMode = (deptId) => {
    setManageMode(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const handleAddQuestion = async (deptId) => {
    const text = newQTexts[deptId];
    if (!text || text.trim() === '') return;
    try {
      let newQ = { id: `q${Date.now()}`, text: text.trim() };
      const result = await mocService.addQuestion(deptId, { text: text.trim() });
      if (result && result.question) {
        newQ = { id: result.question._id || result.question.id || newQ.id, text: result.question.text || newQ.text };
      }
      setDeptQuestions(prev => ({
        ...prev,
        [deptId]: [...(prev[deptId] || []), newQ]
      }));
      setNewQTexts(prev => ({ ...prev, [deptId]: '' }));
    } catch (err) {
      console.error("Failed to add question", err);
    }
  };

  const handleDeleteQuestion = async (deptId, qId) => {
    try {
      await mocService.removeQuestion(deptId, qId);
      setDeptQuestions(prev => ({
        ...prev,
        [deptId]: (prev[deptId] || []).filter(q => q.id !== qId)
      }));
    } catch (err) {
      console.error("Failed to remove question", err);
    }
  };

  const isFullyApproved = Object.values(departmentStatuses).every(s => s === 'Approved');
  const hasRejection = Object.values(departmentStatuses).some(s => s === 'Rejected');
  const _hasQuery = Object.values(departmentStatuses).some(s => s === 'Query Sent'); // eslint-disable-line no-unused-vars
  const approvedCount = Object.values(departmentStatuses).filter(s => s === 'Approved').length;

  const canUserActOnAny = departments.some(dept => currentUser?.designation === dept.role);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.stagePill}>5</span>
            Review Group — Parallel Evaluation
          </h3>
          <button style={styles.toggleBtn} onClick={toggleAll}>
            {Object.values(expandedCards).every(Boolean) ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <div style={styles.counter}>{approvedCount} of 9 departments reviewed</div>

        {(!isWorkflowActive || !canUserActOnAny) && !isCompleted && !isFullyApproved && !hasRejection && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span>
              <strong>Universal View — Read Only.</strong>{' '}
              {!isWorkflowActive ? 'The workflow is currently at a different stage.' : 'This stage is awaiting action from authorized reviewers.'}
            </span>
          </div>
        )}

        {isFullyApproved && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertSuccess }}>
              <span>✅</span>
              <span><strong>All Parallel Reviews Complete!</strong> All 9 departments have approved. The workflow advances to Site Head Approval.</span>
            </div>
          </>
        )}
        {hasRejection && !isFullyApproved && (
          <>
            <div style={{ ...styles.alertBase, ...styles.alertError }}>
              <span>⛔</span>
              <span><strong>MOC Halted:</strong> One or more departments have rejected this ticket.</span>
            </div>
          </>
        )}

        <div style={styles.metaGrid}>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>MOC Title</span><span style={styles.metaValue}>{data.title}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Initiator</span><span style={styles.metaValue}>{data.requestor?.name || (typeof data.requestor === 'string' ? data.requestor : 'Unknown')}</span></div>
          <div style={styles.metaBlock}><span style={styles.metaLabel}>Primary Dept</span><span style={styles.metaValue}>{data.department}</span></div>
        </div>
      </div>

      <div style={styles.departmentGrid}>
        {departments.map((dept) => {
          const currentStatus = departmentStatuses[dept.id];
          const isExpanded = expandedCards[dept.id];
          const questions = deptQuestions[dept.id] || [];
          const canUserActOnThisDept = currentUser?.designation === dept.role;
          const isManageMode = manageMode[dept.id];
          
          return (
            <div key={dept.id} style={styles.departmentCard(currentStatus, isExpanded)}>
              <div style={styles.departmentHeader} onClick={() => toggleExpand(dept.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={styles.statusDot(currentStatus)}></span>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: isDark ? '#e8e8ff' : '#1a1a3e' }}>{dept.title}</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isWorkflowActive && canUserActOnThisDept && currentStatus !== 'Approved' && (
                    <button 
                      style={styles.toggleBtn} 
                      onClick={(e) => { e.stopPropagation(); toggleManageMode(dept.id); }}
                    >
                      ⚙️ Manage Checklist
                    </button>
                  )}
                  <span style={styles.statusBadge(currentStatus)}>{currentStatus}</span>
                  <span style={{ fontSize: '12px', color: isDark ? '#aaa' : '#666' }}>{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={styles.departmentBody}>
                  
                  {currentStatus === 'Approved' && (
                    <div style={{ ...styles.alertBase, ...styles.alertSuccess, marginBottom: '10px' }}>
                      <span>✅</span><span><strong>Approved!</strong> Review complete.</span>
                    </div>
                  )}
                  {currentStatus === 'Rejected' && (
                    <div style={{ ...styles.alertBase, ...styles.alertError, marginBottom: '10px' }}>
                      <span>✗</span><span><strong>Rejected!</strong> Review failed.</span>
                    </div>
                  )}

                  {(currentStatus === 'Approved' || currentStatus === 'Rejected') && canUserActOnThisDept ? (
                    <button style={{...styles.btnNavPrev, width: '100%', marginBottom: '10px'}} onClick={() => handleAction(dept.id, 'Pending', dept.role)}>
                      🔄 Unlock to Review Again
                    </button>
                  ) : null}

                  {(currentStatus !== 'Approved' && currentStatus !== 'Rejected') && (
                    <>
                      {isManageMode && (
                        <div style={{ padding: '12px', backgroundColor: isDark ? '#2a2a4a' : '#f0f2f8', borderRadius: '8px', marginBottom: '16px' }}>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: isDark ? '#e8e8ff' : '#1a1a3e' }}>Manage Questions</h5>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <input 
                              type="text" 
                              value={newQTexts[dept.id] || ''}
                              onChange={(e) => setNewQTexts(prev => ({ ...prev, [dept.id]: e.target.value }))}
                              placeholder="Enter new question..."
                              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: isDark ? '1px solid #3a3a5a' : '1px solid #ccc', backgroundColor: isDark ? '#1a1a2e' : '#fff', color: isDark ? '#fff' : '#000', outline: 'none' }}
                            />
                            <button 
                              onClick={() => handleAddQuestion(dept.id)}
                              style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >
                              Add
                            </button>
                          </div>
                          {questions.length === 0 && <div style={{ fontSize: '12px', color: isDark ? '#aaa' : '#666' }}>No questions.</div>}
                        </div>
                      )}

                      {questions.map((q) => {
                        const ans = checklists[dept.id]?.[q.id]?.answer || '';
                        const remark = checklists[dept.id]?.[q.id]?.remark || '';
                        return (
                          <div key={q.id} style={styles.questionRow}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={styles.questionText}>{q.text}</div>
                              {isManageMode && (
                                <button onClick={() => handleDeleteQuestion(dept.id, q.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '0 4px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Question">
                                  🗑️
                                </button>
                              )}
                            </div>
                            <div style={styles.radioGroup}>
                              {['Yes', 'No', 'N/A'].map(opt => (
                                <label key={opt} style={styles.radioLabel}>
                                  <input 
                                    type="radio" 
                                    name={`${dept.id}-${q.id}`} 
                                    value={opt} 
                                    checked={ans === opt}
                                    onChange={() => handleChecklistChange(dept.id, q.id, 'answer', opt)}
                                    disabled={!isWorkflowActive || !canUserActOnThisDept || currentStatus === 'Approved' || currentStatus === 'Rejected'}
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                            <textarea
                              style={styles.textarea}
                              placeholder="Remarks (Optional)..."
                              value={remark}
                              onChange={(e) => handleChecklistChange(dept.id, q.id, 'remark', e.target.value)}
                              disabled={!isWorkflowActive || !canUserActOnThisDept || currentStatus === 'Approved' || currentStatus === 'Rejected'}
                            />
                          </div>
                        );
                      })}

                      {isWorkflowActive && canUserActOnThisDept && (currentStatus === 'Pending' || currentStatus === 'Query Sent') && (
                        <>
                          {queryPrompt[dept.id] && (
                            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: isDark ? '#2a2a4a' : '#f8f9fa', border: isDark ? '1px solid #3a3a5a' : '1px solid #dee2e6', marginBottom: '16px' }}>
                              <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: isDark ? '#e8e8ff' : '#1a1a3e' }}>Send a Query</h5>
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: isDark ? '#aaa' : '#666' }}>Send to:</label>
                                <select 
                                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: isDark ? '1px solid #3a3a5a' : '1px solid #ccc', backgroundColor: isDark ? '#1a1a2e' : '#fff', color: isDark ? '#fff' : '#000' }}
                                  value={queryTo[dept.id] || 'Process Engineer'}
                                  onChange={(e) => setQueryTo(prev => ({ ...prev, [dept.id]: e.target.value }))}
                                >
                                  <option value="Process Engineer">Process Engineer</option>
                                  <option value="Area Head">Area Head</option>
                                  <option value="Site Head">Site Head</option>
                                </select>
                              </div>
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: isDark ? '#aaa' : '#666' }}>Description:</label>
                                <textarea 
                                  style={{ ...styles.textarea, minHeight: '80px' }}
                                  placeholder="Enter your query details here..."
                                  value={queryDesc[dept.id] || ''}
                                  onChange={(e) => setQueryDesc(prev => ({ ...prev, [dept.id]: e.target.value }))}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                  style={styles.btnQuery} 
                                  onClick={() => {
                                    handleAction(dept.id, 'Query Sent', dept.role, queryDesc[dept.id], queryTo[dept.id] || 'Process Engineer');
                                    setQueryPrompt(prev => ({ ...prev, [dept.id]: false }));
                                    setQueryDesc(prev => ({ ...prev, [dept.id]: '' }));
                                  }}
                                >
                                  Send Query
                                </button>
                                <button 
                                  style={styles.btnNavPrev} 
                                  onClick={() => setQueryPrompt(prev => ({ ...prev, [dept.id]: false }))}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          <div style={styles.buttonGroup}>
                            {(() => {
                              const answers = questions.map(q => checklists[dept.id]?.[q.id]?.answer || '');
                              const hasNo = answers.includes('No');
                              const allAnswered = answers.length > 0 && answers.every(a => a !== '');
                              const hasOnlyYesOrNA = answers.length > 0 && answers.every(a => a === 'Yes' || a === 'N/A');
                              
                              return (
                                <>
                                  <button style={(!allAnswered || hasNo) ? styles.buttonDisabled : styles.btnApprove} onClick={() => handleAction(dept.id, 'Approved', dept.role)} disabled={isProcessing || !allAnswered || hasNo}>✓ Submit Approval</button>
                                  <button style={styles.btnQuery} onClick={() => setQueryPrompt(prev => ({ ...prev, [dept.id]: true }))} disabled={isProcessing}>? Query</button>
                                  <button style={(!allAnswered || hasOnlyYesOrNA) ? styles.buttonDisabled : styles.btnReject} onClick={() => handleAction(dept.id, 'Rejected', dept.role)} disabled={isProcessing || !allAnswered || hasOnlyYesOrNA}>✗ Reject</button>
                                </>
                              );
                            })()}
                          </div>
                        </>
                      )}

                      {(!isWorkflowActive || !canUserActOnThisDept) && (currentStatus === 'Pending' || currentStatus === 'Query Sent') && (
                        <div style={styles.buttonDisabled}>🔒 Only {dept.role} can submit this review.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.values(departmentStatuses).length === departments.length && Object.values(departmentStatuses).every(s => s === 'Approved') && isWorkflowActive && (
        <div style={{ marginTop: '24px', padding: '24px', backgroundColor: theme === 'dark' ? '#12122a' : '#e8f0fe', borderRadius: '12px', border: theme === 'dark' ? '1px solid #137333' : '1px solid #c5d8f8', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#81c995' : '#1a56c4', fontSize: '18px' }}>🎉 All Departments Approved</h4>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: theme === 'dark' ? '#aaa' : '#555' }}>The Review Group stage is fully complete. The workflow is ready to advance.</p>
          <button 
            style={{ backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
            onClick={async () => {
              setIsProcessing(true);
              try {
                await mocService.advanceStage(ticketData.mocId || ticketData._id, {
                  actor: { name: currentUser?.name || 'Review Group', designation: 'Review Group Head' },
                  comments: 'All 9 departments have formally approved.'
                });
              } catch (err) {
                console.error("Failed to advance stage after all approvals", err);
              }
              if (onPromote) onPromote();
              setIsProcessing(false);
            }}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Proceed to Cost Estimation →'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button style={styles.btnNavPrev} onClick={() => onPrevious && onPrevious()}>← Previous Stage</button>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default ReviewGroupStage;