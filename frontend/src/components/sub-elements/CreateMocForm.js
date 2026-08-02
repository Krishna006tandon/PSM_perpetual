import React, { useState } from 'react';
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
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    fullWidth: { gridColumn: '1 / -1' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    inputLabel: { fontSize: '11px', color: isDark ? '#7070a0' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
    input: {
      padding: '11px 14px', borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#12122a' : '#f8f9fe',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px', outline: 'none', lineHeight: '1.5',
    },
    textarea: {
      padding: '11px 14px', borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#12122a' : '#f8f9fe',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px', outline: 'none', minHeight: '90px',
      width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5',
    },
    select: {
      padding: '11px 14px', borderRadius: '8px',
      border: isDark ? '1px solid #2a2a4a' : '1px solid #d0d4e8',
      backgroundColor: isDark ? '#12122a' : '#f8f9fe',
      color: isDark ? '#e8e8ff' : '#1a1a3e',
      fontSize: '14px', outline: 'none', cursor: 'pointer',
    },
    buttonPrimary: {
      backgroundColor: '#1a73e8', color: 'white', border: 'none',
      padding: '11px 24px', borderRadius: '8px', fontWeight: '600',
      cursor: 'pointer', fontSize: '14px',
    },
    alertBase: {
      padding: '14px 18px', borderRadius: '10px', marginBottom: '16px',
      fontWeight: '500', fontSize: '14px', display: 'flex',
      alignItems: 'flex-start', gap: '10px', lineHeight: '1.5',
    },
    alertWarning: {
      backgroundColor: isDark ? 'rgba(249,171,0,0.15)' : '#fef7e0',
      color: isDark ? '#fde293' : '#7a4f00',
      border: isDark ? '1px solid rgba(249,171,0,0.4)' : '1px solid #feefc3',
    },
    alertApproved: {
      backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe',
      color: isDark ? '#8ab4f8' : '#1a56c4',
      border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8',
    },
    divider: {
      height: '1px',
      backgroundColor: isDark ? '#2a2a4a' : '#e8eaf6',
      margin: '24px 0',
    },
    metaRow: {
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '13px', color: isDark ? '#7070a0' : '#999',
      marginBottom: '4px',
    },
    btnNavNext: {
      backgroundColor: '#1a73e8', color: 'white', border: 'none',
      padding: '10px 20px', borderRadius: '8px', fontWeight: '600',
      cursor: 'pointer', fontSize: '14px',
    },
  };
};

const CreateMocForm = ({ theme, ticketData, setTicketData, currentUser, onPromote, onNext }) => {
  const styles = getStyles(theme);
  const isDark = theme === 'dark';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(!!ticketData);

  const hasPermission = currentUser.designation === 'Process Engineer';
  const isExisting = !!ticketData;

  const [formData, setFormData] = useState({
    mocId: ticketData?.mocId || ticketData?.id || 'MOC-' + Math.floor(Math.random() * 90000 + 10000),
    requestor: ticketData?.requestor || {
      name: currentUser.name,
      designation: currentUser.designation,
      orgNumber: currentUser.orgNumber || 'ORG-1234',
      contact: currentUser.contact || 'contact@example.com'
    },
    title: ticketData?.title || '', 
    description: ticketData?.description || '', 
    plant: ticketData?.plant || 'Plant A', 
    department: ticketData?.department || 'Mechanical',
    changeType: ticketData?.changeType || 'Permanent', 
    urgency: ticketData?.urgency || 'General', 
    riskLevel: ticketData?.riskLevel || 'Medium',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (submitError) setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await mocService.createMOC(formData);
      // Immediately advance from stage 0 → 1 in the backend so that
      // when Area Head fetches this MOC, it will be at currentStageIndex: 1
      // and their approval buttons will be active.
      const advancedMoc = await mocService.advanceStage(response.mocId || response._id, {
        action: 'Submitted',
        actor: { name: currentUser.name, designation: currentUser.designation },
        comments: 'MOC submitted by initiator'
      });
      setIsSubmitting(false);
      setSubmitted(true);
      setTicketData(advancedMoc);
      if (onPromote) onPromote(advancedMoc);
    } catch (err) {
      console.error("Failed to create MOC", err);
      setSubmitError(err.response?.data?.error || "Failed to create MOC. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.stagePill}>1</span>
          New MOC Request
        </h3>

        {/* MOC ID badge */}
        <div style={styles.metaRow}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
            fontSize: '12px', fontWeight: '700',
            backgroundColor: isDark ? 'rgba(26,115,232,0.15)' : '#e8f0fe',
            color: isDark ? '#8ab4f8' : '#1a56c4',
            border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8',
          }}>
            {formData.mocId}
          </span>
          <span style={{ fontSize: '12px', color: isDark ? '#7070a0' : '#aaa' }}>
            Initiated by: <strong style={{ color: isDark ? '#e8e8ff' : '#1a1a3e' }}>{currentUser.name}</strong> · {currentUser.designation}
          </span>
        </div>

        <div style={styles.divider} />

        {/* Banners */}
        {submitError && (
          <div style={{ padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', border: '1px solid #f5c6cb', marginBottom: '16px', fontSize: '14px' }}>
            <strong>Error:</strong> {submitError}
          </div>
        )}

        {!hasPermission && (
          <div style={{ ...styles.alertBase, ...styles.alertWarning }}>
            <span>🔒</span>
            <span><strong>Read-Only.</strong> Your role ({currentUser.designation}) is not authorized to initiate new MOCs.</span>
          </div>
        )}

        {submitted && !isExisting && (
          <>
            <div style={{ ...styles.alertBase, backgroundColor: isDark ? 'rgba(19,115,51,0.18)' : '#e6f4ea', color: isDark ? '#81c995' : '#137333', border: isDark ? '1px solid #137333' : '1px solid #ceead6' }}>
              <span>✅</span>
              <span><strong>MOC Submitted!</strong> Your request has been routed to the Area Head for review.</span>
            </div>
            <div style={{ ...styles.alertBase, ...styles.alertApproved }}>
              <span>🎉</span>
              <span>Thank you for your patience — the workflow is now progressing. You may review other stages using the tracker above.</span>
            </div>
          </>
        )}

        {isExisting && (
          <div style={{ ...styles.alertBase, backgroundColor: isDark ? 'rgba(26,115,232,0.18)' : '#e8f0fe', color: isDark ? '#8ab4f8' : '#1a73e8', border: isDark ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8' }}>
            <span>ℹ️</span>
            <span><strong>MOC is Active.</strong> This MOC was successfully submitted. Use the navigation buttons below to view its progress.</span>
          </div>
        )}

        {/* Form fields */}
        <div style={{ ...styles.formGrid, opacity: (hasPermission && !isExisting) ? 1 : 0.6, pointerEvents: (hasPermission && !isExisting) ? 'auto' : 'none' }}>
          <div style={{ ...styles.inputGroup, ...styles.fullWidth }}>
            <label style={styles.inputLabel}>MOC Title</label>
            <input
              required name="title" value={formData.title}
              onChange={handleChange} style={styles.input}
              placeholder="e.g., Distillation Column Bypass Line Installation"
            />
          </div>

          <div style={{ ...styles.inputGroup, ...styles.fullWidth }}>
            <label style={styles.inputLabel}>Description of Change</label>
            <textarea
              required name="description" value={formData.description}
              onChange={handleChange} style={styles.textarea}
              placeholder="Detail the current situation, the proposed modification, and the reason for change..."
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Plant / Area</label>
            <select name="plant" value={formData.plant} onChange={handleChange} style={styles.select}>
              <option value="Plant A">Plant A</option>
              <option value="Phenyl Cumene Unit">Phenyl Cumene Unit</option>
              <option value="IPA Unit">IPA Unit</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Primary Department</label>
            <select name="department" value={formData.department} onChange={handleChange} style={styles.select}>
              <option value="Mechanical">Mechanical</option>
              <option value="Electrical">Electrical</option>
              <option value="Instrumentation">Instrumentation</option>
              <option value="Civil">Civil</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Change Type</label>
            <select name="changeType" value={formData.changeType} onChange={handleChange} style={styles.select}>
              <option value="Permanent">Permanent</option>
              <option value="Temporary">Temporary</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Risk Level</label>
            <select name="riskLevel" value={formData.riskLevel} onChange={handleChange} style={styles.select}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {hasPermission && !isExisting && !submitted && (
          <>
            <div style={styles.divider} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" style={styles.buttonPrimary} disabled={isSubmitting}>
                {isSubmitting ? '⏳ Routing to Area Head...' : '✓ Submit MOC Request'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Stage 1 only has Next (no Previous) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={styles.btnNavNext} onClick={() => onNext && onNext()}>Next Stage →</button>
      </div>
    </div>
  );
};

export default CreateMocForm;