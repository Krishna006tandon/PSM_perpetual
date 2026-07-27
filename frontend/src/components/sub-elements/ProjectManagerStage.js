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
      borderTop: '3px solid #1a5276',
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
      fontWeight: '700', backgroundColor: '#1a5276', color: 'white', flexShrink: 0,
    },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
    inputLabel: { fontSize: '12px', color: isDark ? '#7070a0' : '#888', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
    input: {
      padding: '10px', borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box'
    },
    select: {
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
    buttonGroup: { display: 'flex', gap: '10px', marginTop: '18px' },
    btnApprove: { backgroundColor: '#137333', color: 'white', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', flex: 1, fontSize: '14px' },
    alertBase: { padding: '14px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' },
    alertWarning: { backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0', color: isDark ? '#fde293' : '#7a4f00', border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3' },
    alertApproved: { backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a56c4', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' },
    btnNavPrev: { backgroundColor: isDark ? '#1e1e3a' : '#f0f0f8', color: isDark ? '#aaa' : '#555', border: isDark ? '1px solid #2a2a4a' : '1px solid #d8d8ee', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    btnNavNext: { backgroundColor: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    infoBanner: { backgroundColor: isDark ? 'rgba(26,82,118,0.2)' : '#e6f2ff', color: isDark ? '#a9cce3' : '#1a5276', padding: '14px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px', border: `1px solid ${isDark ? '#1a5276' : '#b3d9ff'}` },
    checklist: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' },
    checklistItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' },
    detailsCard: { padding: '20px', borderRadius: '10px', backgroundColor: isDark ? '#12122a' : '#f8f9fe', border: isDark ? '1px solid #2a2a4a' : '1px solid #e0e2f0', marginBottom: '20px' }
  };
};

const tasks = [
  'Procurement initiated',
  'Materials received',
  'Contractor mobilized',
  'Plant modification started',
  'Modification completed',
  'Quality inspection done'
];

const ProjectManagerStage = ({ theme, ticketData, setTicketData, currentUser, onPromote, onAddQuery, isWorkflowActive, isCompleted, onPrevious, onNext }) => {
  const styles = getStyles(theme);
  const hasPermission = currentUser?.designation === 'Engineering Head';
  const canAct = hasPermission && isWorkflowActive;

  const [pmDetails, setPmDetails] = useState({ name: '', department: '', timeline: '', comments: '' });
  const [assigned, setAssigned] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAssign = () => {
    if (!canAct) return;
    setIsProcessing(true);
    setTimeout(() => {
      setAssigned(true);
      if (setTicketData) {
        setTicketData(prev => ({ ...prev, pmAssignment: pmDetails }));
      }
      setIsProcessing(false);
    }, 500);
  };

  const handleComplete = () => {
    setIsProcessing(true);
    setTimeout(() => {
      if (onPromote) onPromote();
      setIsProcessing(false);
    }, 500);
  };

  const toggleTask = (task) => {
    setCheckedTasks(prev => ({ ...prev, [task]: !prev[task] }));
  };

  const allTasksChecked = tasks.every(t => checkedTasks[t]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>9</span>
          Project Manager Assignment & Execution
        </h3>

        <div style={styles.infoBanner}>
          <span>ℹ️</span>
          <span><strong>Rejection is not permitted at this stage.</strong> The MOC has been formally approved by the Site Head.</span>
        </div>

        {(!isWorkflowActive || !hasPermission) && !assigned && !isCompleted && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Universal View — Read Only.</strong> {(!isWorkflowActive) ? 'The workflow is currently at a different stage.' : 'This stage is awaiting action from the Engineering Head.'}</span>
          </div>
        )}

        {!assigned ? (
          <>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>PM Name</label>
              <input style={styles.input} value={pmDetails.name} onChange={(e) => setPmDetails({...pmDetails, name: e.target.value})} disabled={!canAct} placeholder="Enter PM Name" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>PM Department</label>
              <select style={styles.select} value={pmDetails.department} onChange={(e) => setPmDetails({...pmDetails, department: e.target.value})} disabled={!canAct}>
                <option value="">Select Department...</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Electrical">Electrical</option>
                <option value="Civil">Civil</option>
                <option value="Instrumentation">Instrumentation</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Execution Timeline</label>
              <input type="date" style={styles.input} value={pmDetails.timeline} onChange={(e) => setPmDetails({...pmDetails, timeline: e.target.value})} disabled={!canAct} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Assignment Comments</label>
              <textarea style={styles.textarea} value={pmDetails.comments} onChange={(e) => setPmDetails({...pmDetails, comments: e.target.value})} disabled={!canAct} placeholder="Notes..." />
            </div>
            
            {canAct && (
              <div style={styles.buttonGroup}>
                <button style={styles.btnApprove} onClick={handleAssign} disabled={isProcessing || !pmDetails.name}>{isProcessing ? '⏳...' : 'Assign PM'}</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={styles.detailsCard}>
              <h4 style={{ margin: '0 0 10px 0' }}>Assigned Project Manager</h4>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Name:</strong> {pmDetails.name}</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Department:</strong> {pmDetails.department}</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Timeline:</strong> {pmDetails.timeline}</p>
            </div>

            <div style={styles.checklist}>
              <strong style={{ fontSize: '14px' }}>Execution Task Checklist</strong>
              {tasks.map(task => (
                <label key={task} style={styles.checklistItem}>
                  <input type="checkbox" checked={!!checkedTasks[task]} onChange={() => toggleTask(task)} disabled={!isWorkflowActive} />
                  {task}
                </label>
              ))}
            </div>

            {isWorkflowActive && (
              <div style={styles.buttonGroup}>
                <button style={styles.btnApprove} onClick={handleComplete} disabled={isProcessing || !allTasksChecked}>{isProcessing ? '⏳...' : 'Mark Execution Complete'}</button>
              </div>
            )}
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

export default ProjectManagerStage;
