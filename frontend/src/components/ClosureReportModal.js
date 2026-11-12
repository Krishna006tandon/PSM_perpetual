import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import { printElementIsolated } from '../utils/printHelper';
import './ClosureReportModal.css';

const API_URL = getApiUrl();

export default function ClosureReportModal({ isOpen, onClose, incident, currentUser, onUpdated }) {
  const printSheetRef = useRef(null);
  const [activeTab, setActiveTab] = useState('gatekeeper');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [reportData, setReportData] = useState(null);
  const [signOffDrafts, setSignOffDrafts] = useState({});

  const [lessonsForm, setLessonsForm] = useState({
    executiveSummary: '',
    keyLessonsText: '',
    preventiveTakeaways: '',
    applicablePlantUnitsText: '',
    requiresToolboxTalk: true,
    disseminatedToShifts: false
  });

  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const getTokenHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadWorkspace = useCallback(async () => {
    if (!incident?._id) return;
    setLoading(true);
    try {
      const data = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/closure-report`, {
        headers: getTokenHeaders()
      });
      setReportData(data);

      const ll = data.lessonsLearned || {};
      setLessonsForm({
        executiveSummary: ll.executiveSummary || data.incident?.descriptionMatrix?.whatHappened || '',
        keyLessonsText: Array.isArray(ll.keyLessons) ? ll.keyLessons.join('\n') : '',
        preventiveTakeaways: ll.preventiveTakeaways || '',
        applicablePlantUnitsText: Array.isArray(ll.applicablePlantUnits)
          ? ll.applicablePlantUnits.join(', ')
          : (data.incident?.plantZone || ''),
        requiresToolboxTalk: ll.requiresToolboxTalk !== undefined ? Boolean(ll.requiresToolboxTalk) : true,
        disseminatedToShifts: Boolean(ll.disseminatedToShifts)
      });

      const drafts = {};
      (data.closureGovernance?.signOffs || []).forEach((s) => {
        drafts[s.role] = {
          signerName: s.signerName || currentUser?.name || '',
          signerDesignation: s.signerDesignation || currentUser?.role || '',
          comments: s.comments || ''
        };
      });
      setSignOffDrafts(drafts);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to load Stage 4 workspace.' });
    } finally {
      setLoading(false);
    }
  }, [incident?._id, currentUser?.name, currentUser?.role]);

  useEffect(() => {
    if (isOpen && incident?._id) {
      setToast(null);
      setActiveTab('gatekeeper');
      setShowOverridePanel(false);
      setOverrideJustification('');
      setReopenReason('');
      loadWorkspace();
    }
  }, [isOpen, incident?._id, loadWorkspace]);

  if (!isOpen || !incident) return null;

  const fullInc = reportData?.incident || incident;
  const readiness = reportData?.readiness || {
    checks: [],
    passedCount: 0,
    totalChecks: 7,
    allChecksPassed: false,
    approvedSignOffs: 0,
    totalSignOffs: 3,
    allSignOffsApproved: false,
    canCloseNormally: false
  };
  const signOffs = reportData?.closureGovernance?.signOffs || [];
  const whyNodes = reportData?.whyNodes || [];
  const capas = reportData?.capas || [];
  const isClosed = fullInc.status === 'Closed' || fullInc.status === 'Administratively Closed';

  // --- ACTIONS ---
  const handleSubmitSignOff = async (role, decision) => {
    const draft = signOffDrafts[role] || {};
    if (!String(draft.signerName || '').trim()) {
      setToast({ type: 'error', message: `Please enter the Signer Name for ${role}.` });
      return;
    }
    setBusy(true);
    try {
      await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/signoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          role,
          signerName: draft.signerName,
          signerDesignation: draft.signerDesignation,
          decision,
          comments: draft.comments
        })
      });
      setToast({ type: 'success', message: `${role} sign-off recorded as [${decision}].` });
      await loadWorkspace();
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to submit digital sign-off.' });
    } finally {
      setBusy(false);
    }
  };

  const handleFinalizeClosure = async (mode) => {
    setBusy(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/finalize-closure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          mode,
          overrideJustification,
          actorName: currentUser?.name
        })
      });
      setToast({ type: 'success', message: `Incident status updated to [${res.status}].` });
      setShowOverridePanel(false);
      await loadWorkspace();
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Closure blocked by governance gatekeeper.' });
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          reason: reopenReason,
          actorName: currentUser?.name
        })
      });
      setToast({ type: 'success', message: 'Incident reopened to Investigation Active.' });
      setReopenReason('');
      await loadWorkspace();
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to reopen incident.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLessons = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/lessons-learned`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          executiveSummary: lessonsForm.executiveSummary,
          keyLessons: lessonsForm.keyLessonsText,
          preventiveTakeaways: lessonsForm.preventiveTakeaways,
          applicablePlantUnits: lessonsForm.applicablePlantUnitsText,
          requiresToolboxTalk: lessonsForm.requiresToolboxTalk,
          disseminatedToShifts: lessonsForm.disseminatedToShifts
        })
      });
      setToast({ type: 'success', message: 'Lessons Learned & Safety Flash saved.' });
      await loadWorkspace();
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save Lessons Learned.' });
    } finally {
      setBusy(false);
    }
  };

  const rootCauseNodes = whyNodes.filter((n) => n.isRootCause);
  const lessonBullets = lessonsForm.keyLessonsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="cr-modal-overlay">
      <div className="cr-modal-container">
        {/* Header */}
        <div className="cr-header cr-no-print">
          <div>
            <span className="cr-eyebrow">Stage 4 — Closure Gatekeeper, Digital Sign-Off & Executive PDF Report</span>
            <h2 className="cr-title">
              {fullInc.incidentNumber} — {fullInc.title}
            </h2>
            <div className="cr-sub">
              Zone: {fullInc.plantZone} | Classification: {fullInc.api754Classification?.category || fullInc.api754Classification?.tier} | Readiness:{' '}
              {readiness.passedCount}/{readiness.totalChecks} checks passed
            </div>
          </div>
          <div className="cr-header-actions">
            <span className={`cr-status-pill ${isClosed ? 'is-closed' : ''}`}>
              {isClosed ? `🔒 ${fullInc.status}` : `🟡 ${fullInc.status}`}
            </span>
            <button type="button" className="cr-btn-close" onClick={onClose}>
              ✖ Close
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="cr-toolbar cr-no-print">
          <div className="cr-tabs">
            <button
              type="button"
              className={`cr-tab-btn ${activeTab === 'gatekeeper' ? 'active' : ''}`}
              onClick={() => setActiveTab('gatekeeper')}
            >
              🔒 1. Closure Gatekeeper & Sign-Off
              <span className="cr-tab-badge">
                {readiness.passedCount}/{readiness.totalChecks}
              </span>
            </button>
            <button
              type="button"
              className={`cr-tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
              onClick={() => setActiveTab('lessons')}
            >
              💡 2. Lessons Learned & Safety Flash
              <span className="cr-tab-badge">{lessonBullets.length} Points</span>
            </button>
            <button
              type="button"
              className={`cr-tab-btn ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              📑 3. Executive Final Report (PDF)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(activeTab === 'lessons' || activeTab === 'report') && (
              <button
                type="button"
                className="cr-btn-primary"
                onClick={() =>
                  printElementIsolated(
                    printSheetRef.current,
                    `${fullInc.incidentNumber} - ${activeTab === 'lessons' ? 'PSM Safety Flash' : 'Final Investigation Report'}`
                  )
                }
              >
                🖨️ Print / Export PDF
              </button>
            )}
          </div>
        </div>

        {toast && (
          <div className={`cr-toast ${toast.type} cr-no-print`}>
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{ background: 'transparent', border: 'none', fontWeight: 800, cursor: 'pointer', color: 'inherit' }}
            >
              ✖
            </button>
          </div>
        )}

        <div className="cr-body">
          {loading ? <div className="cr-card">Compiling Stage 4 Closure Governance & Investigation Dossier...</div> : null}

          {/* TAB 1: CLOSURE GATEKEEPER & DIGITAL SIGN-OFF */}
          {!loading && activeTab === 'gatekeeper' && (
            <div className="cr-grid-2">
              {/* Left: 7-Point Compliance Gatekeeper */}
              <div className="cr-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Pre-Close Compliance Gatekeeper ({readiness.passedCount}/{readiness.totalChecks})</h3>
                  <span className={`cr-check-pill ${readiness.allChecksPassed ? 'pass' : 'fail'}`}>
                    {readiness.allChecksPassed ? 'ALL CHECKS PASSED' : 'GATES PENDING'}
                  </span>
                </div>

                {readiness.checks.map((chk) => (
                  <div key={chk.key} className={`cr-check-item ${chk.passed ? 'pass' : 'fail'}`}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{chk.label}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>{chk.detail}</div>
                    </div>
                    <span className={`cr-check-pill ${chk.passed ? 'pass' : 'fail'}`}>
                      {chk.passed ? '✔ PASS' : '✖ BLOCKED'}
                    </span>
                  </div>
                ))}

                {/* Final Closure Lock Controls */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {!isClosed ? (
                    <>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="cr-btn-primary"
                          disabled={busy || !readiness.canCloseNormally}
                          onClick={() => handleFinalizeClosure('normal')}
                          title={
                            readiness.canCloseNormally
                              ? 'Lock & formally close incident'
                              : 'All 7 checks & 3 sign-offs must be completed first'
                          }
                        >
                          ✅ Formally Lock & Close Incident
                        </button>
                        <button
                          type="button"
                          className="cr-btn-warning"
                          onClick={() => setShowOverridePanel((v) => !v)}
                        >
                          ⚠️ Administrative Override Close
                        </button>
                      </div>

                      {!readiness.canCloseNormally && (
                        <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
                          Normal closure requires {readiness.totalChecks}/{readiness.totalChecks} compliance gates passed and all 3 digital sign-offs approved ({readiness.approvedSignOffs}/{readiness.totalSignOffs} approved).
                        </div>
                      )}

                      {showOverridePanel && (
                        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="cr-label">Mandatory HSE Override Justification (Logged to Audit Trail, min 15 chars)</span>
                          <textarea
                            className="cr-textarea"
                            placeholder="Explain why incident is being Administratively Closed without passing every automated gate..."
                            value={overrideJustification}
                            onChange={(e) => setOverrideJustification(e.target.value)}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="cr-btn-secondary" onClick={() => setShowOverridePanel(false)}>
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="cr-btn-warning"
                              disabled={busy}
                              onClick={() => handleFinalizeClosure('override')}
                            >
                              Confirm Administrative Closure
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#166534' }}>
                        🔒 Investigation Locked ({fullInc.status}) by {reportData?.closureGovernance?.closedBy || 'HSE'}{' '}
                        {reportData?.closureGovernance?.closedAt
                          ? `on ${new Date(reportData.closureGovernance.closedAt).toLocaleString()}`
                          : ''}
                      </div>
                      {reportData?.closureGovernance?.overrideUsed && (
                        <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                          <strong>Override Justification:</strong> {reportData.closureGovernance.overrideJustification}
                        </div>
                      )}
                      <form onSubmit={handleReopen} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="cr-input"
                          style={{ flex: 1, minWidth: '220px' }}
                          placeholder="Reason to reopen closed incident (min 10 chars)..."
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                        />
                        <button type="submit" className="cr-btn-warning" disabled={busy}>
                          🔓 Reopen Investigation
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Multi-Role Digital Sign-Off */}
              <div className="cr-card">
                <h3>Multi-Role Digital Sign-Off ({readiness.approvedSignOffs}/{readiness.totalSignOffs} Approved)</h3>
                {signOffs.map((so) => {
                  const draft = signOffDrafts[so.role] || { signerName: '', signerDesignation: '', comments: '' };
                  const cardCls =
                    so.status === 'Approved' ? 'approved' : so.status === 'Returned for Rework' ? 'rework' : '';
                  return (
                    <div key={so.role} className={`cr-signoff-card ${cardCls}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{so.role}</strong>
                        <span className={`cr-check-pill ${so.status === 'Approved' ? 'pass' : 'fail'}`}>
                          {so.status}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span className="cr-label">Signer Full Name *</span>
                          <input
                            type="text"
                            className="cr-input"
                            value={draft.signerName}
                            onChange={(e) =>
                              setSignOffDrafts((p) => ({
                                ...p,
                                [so.role]: { ...draft, signerName: e.target.value }
                              }))
                            }
                          />
                        </div>
                        <div>
                          <span className="cr-label">Designation / Title</span>
                          <input
                            type="text"
                            className="cr-input"
                            value={draft.signerDesignation}
                            onChange={(e) =>
                              setSignOffDrafts((p) => ({
                                ...p,
                                [so.role]: { ...draft, signerDesignation: e.target.value }
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <span className="cr-label">Approval Remarks / Review Notes</span>
                        <input
                          type="text"
                          className="cr-input"
                          placeholder="Verification comments or rework instructions..."
                          value={draft.comments}
                          onChange={(e) =>
                            setSignOffDrafts((p) => ({
                              ...p,
                              [so.role]: { ...draft, comments: e.target.value }
                            }))
                          }
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {so.signedAt ? `Signed: ${new Date(so.signedAt).toLocaleString()}` : 'Not signed yet'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="cr-btn-primary"
                            disabled={busy}
                            onClick={() => handleSubmitSignOff(so.role, 'Approved')}
                          >
                            ✔ Approve
                          </button>
                          <button
                            type="button"
                            className="cr-btn-warning"
                            disabled={busy}
                            onClick={() => handleSubmitSignOff(so.role, 'Returned for Rework')}
                          >
                            ↩ Return for Rework
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LESSONS LEARNED & PSM SAFETY FLASH */}
          {!loading && activeTab === 'lessons' && (
            <div className="cr-grid-2">
              <form className="cr-card cr-no-print" onSubmit={handleSaveLessons}>
                <h3>Author Lessons Learned & Safety Flash</h3>
                <div>
                  <span className="cr-label">Executive Incident Summary</span>
                  <textarea
                    className="cr-textarea"
                    value={lessonsForm.executiveSummary}
                    onChange={(e) => setLessonsForm((p) => ({ ...p, executiveSummary: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="cr-label">Key Lessons Learned (One bullet point per line)</span>
                  <textarea
                    className="cr-textarea"
                    style={{ minHeight: '110px' }}
                    placeholder="Verify zero-energy isolation at local bleeders before flange break..."
                    value={lessonsForm.keyLessonsText}
                    onChange={(e) => setLessonsForm((p) => ({ ...p, keyLessonsText: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="cr-label">Critical Preventive Takeaways for Operations & Maintenance</span>
                  <textarea
                    className="cr-textarea"
                    value={lessonsForm.preventiveTakeaways}
                    onChange={(e) => setLessonsForm((p) => ({ ...p, preventiveTakeaways: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="cr-label">Applicable Plant Units / Sister Equipment (Comma-separated)</span>
                  <input
                    type="text"
                    className="cr-input"
                    value={lessonsForm.applicablePlantUnitsText}
                    onChange={(e) => setLessonsForm((p) => ({ ...p, applicablePlantUnitsText: e.target.value }))}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={lessonsForm.requiresToolboxTalk}
                    onChange={(e) => setLessonsForm((p) => ({ ...p, requiresToolboxTalk: e.target.checked }))}
                  />
                  Mandatory Shift Toolbox Talk (TBT) Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={lessonsForm.disseminatedToShifts}
                    onChange={(e) => setLessonsForm((p) => ({ ...p, disseminatedToShifts: e.target.checked }))}
                  />
                  Safety Flash Disseminated Across All Operational Shifts
                </label>
                <button type="submit" className="cr-btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : '💾 Save Lessons Learned & Update Bulletin'}
                </button>
              </form>

              {/* Live One-Page Safety Flash Print Preview */}
              <div className="cr-report-sheet cr-printable-area" ref={printSheetRef}>
                <div className="cr-flash-banner">
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', opacity: 0.9 }}>
                      PROCESS SAFETY MANAGEMENT — SAFETY FLASH BULLETIN
                    </div>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '1.2rem' }}>{fullInc.title}</h2>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 800 }}>{fullInc.incidentNumber}</div>
                    <div>{fullInc.api754Classification?.category || fullInc.api754Classification?.tier}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                  <div><strong>Unit / Zone:</strong> {fullInc.plantZone}</div>
                  <div><strong>Equipment:</strong> {fullInc.equipmentTag || 'N/A'}</div>
                  <div><strong>Event Date:</strong> {fullInc.dateTime ? new Date(fullInc.dateTime).toLocaleDateString() : 'N/A'}</div>
                </div>

                <div>
                  <h4 className="cr-report-sec-title">1. What Happened</h4>
                  <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.55 }}>
                    {lessonsForm.executiveSummary || fullInc.descriptionMatrix?.whatHappened || 'No summary added yet.'}
                  </p>
                </div>

                <div>
                  <h4 className="cr-report-sec-title">2. Verified Root Causes</h4>
                  {rootCauseNodes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>No root cause nodes finalized yet.</p>
                  ) : (
                    <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {rootCauseNodes.map((rc) => (
                        <li key={rc._id}>
                          <strong>[{rc.rootCauseType}]</strong> {rc.statement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="cr-report-sec-title">3. Key Lessons Learned</h4>
                  {lessonBullets.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>Add bullet lessons in the editor to populate this Safety Flash.</p>
                  ) : (
                    <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {lessonBullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="cr-report-sec-title">4. Mandatory Takeaways & Applicable Units</h4>
                  <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {lessonsForm.preventiveTakeaways || 'Ensure all corrective safeguards are verified prior to restart.'}
                  </p>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                    <strong>Applicable Units:</strong> {lessonsForm.applicablePlantUnitsText || fullInc.plantZone} |{' '}
                    <strong>Toolbox Talk Required:</strong> {lessonsForm.requiresToolboxTalk ? 'Yes' : 'No'} |{' '}
                    <strong>Shift Dissemination:</strong> {lessonsForm.disseminatedToShifts ? 'Completed' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXECUTIVE FINAL INVESTIGATION REPORT (PRINT / PDF) */}
          {!loading && activeTab === 'report' && (
            <div className="cr-report-sheet cr-printable-area" ref={printSheetRef}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.08em' }}>
                    API RP 754 PROCESS SAFETY INCIDENT INVESTIGATION — FINAL EXECUTIVE REPORT
                  </div>
                  <h2 style={{ margin: '4px 0 2px 0', fontSize: '1.35rem', fontWeight: 900 }}>
                    {fullInc.incidentNumber}: {fullInc.title}
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                    {fullInc.companyName} {fullInc.facilityName ? `• ${fullInc.facilityName}` : ''} • Zone: {fullInc.plantZone}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.96rem' }}>
                    {fullInc.api754Classification?.category || fullInc.api754Classification?.tier}
                  </div>
                  <div>Status: <strong>{fullInc.status}</strong></div>
                  <div>Event Date: {fullInc.dateTime ? new Date(fullInc.dateTime).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              {/* 1. Incident & Classification Overview */}
              <div>
                <h4 className="cr-report-sec-title">1. Incident Snapshot & API RP 754 Rationale</h4>
                <table className="cr-report-table">
                  <tbody>
                    <tr>
                      <th>Equipment Tag</th>
                      <td>{fullInc.equipmentTag || 'N/A'}</td>
                      <th>Operating Status</th>
                      <td>{fullInc.unitOperatingStatus || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Reporter</th>
                      <td>{fullInc.reporter?.name} ({fullInc.reporter?.department})</td>
                      <th>CFT Leader</th>
                      <td>{fullInc.cft?.leader?.name || 'Not Assigned'}</td>
                    </tr>
                    <tr>
                      <th>LOPC / Material</th>
                      <td>
                        {fullInc.isActualRelease === 'Yes'
                          ? `${fullInc.materialDetails?.chemicalName || fullInc.materialDetails?.materialName || 'Material'} (${fullInc.materialDetails?.chemicalTRC}, ${fullInc.materialDetails?.quantityInOneHourKg || 0} kg/hr)`
                          : `Actual Release: ${fullInc.isActualRelease || 'No'}`}
                      </td>
                      <th>Tier 1 Severity Score</th>
                      <td>{fullInc.api754Classification?.tier1SeverityPoints || 0} pts</td>
                    </tr>
                    <tr>
                      <th>Description (What Happened)</th>
                      <td colSpan={3}>{fullInc.descriptionMatrix?.whatHappened}</td>
                    </tr>
                    <tr>
                      <th>Classification Basis</th>
                      <td colSpan={3}>{(fullInc.api754Classification?.reasons || []).join(' | ') || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. SOE Timeline & Witnesses */}
              <div>
                <h4 className="cr-report-sec-title">
                  2. Sequence of Events ({(fullInc.sequenceTimeline || []).length}) & Witness Log ({(fullInc.witnessStatements || []).length})
                </h4>
                {(fullInc.sequenceTimeline || []).length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>No SOE timeline milestones recorded.</p>
                ) : (
                  <table className="cr-report-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Phase</th>
                        <th>Source</th>
                        <th>Milestone / Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullInc.sequenceTimeline.map((ev) => (
                        <tr key={ev._id}>
                          <td>{new Date(ev.timestamp).toLocaleString()}</td>
                          <td>{ev.phase}</td>
                          <td>{ev.source}</td>
                          <td>
                            <strong>{ev.title}</strong>
                            {ev.description ? ` — ${ev.description}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 3. Root Causes & LOPA Barriers */}
              <div>
                <h4 className="cr-report-sec-title">3. Why-Why Root Causes ({rootCauseNodes.length}) & Barrier Effectiveness</h4>
                {rootCauseNodes.length > 0 && (
                  <ul style={{ margin: '0 0 10px 18px', padding: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {rootCauseNodes.map((rc) => (
                      <li key={rc._id}>
                        <strong>L{rc.whyLevel} [{rc.rootCauseType}]:</strong> {rc.statement}
                        {rc.api754Category ? ` (API 754: ${rc.api754Category})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {(fullInc.barrierAnalysis || []).length > 0 && (
                  <table className="cr-report-table">
                    <thead>
                      <tr>
                        <th>LOPA / Safeguard Layer</th>
                        <th>Type</th>
                        <th>Tag</th>
                        <th>Effectiveness</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullInc.barrierAnalysis.map((b, idx) => (
                        <tr key={b._id || idx}>
                          <td>{b.layerName}</td>
                          <td>{b.barrierType}</td>
                          <td>{b.safeguardTag}</td>
                          <td><strong>{b.status}</strong></td>
                          <td>{b.failureReason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 4. CAPA & PHA Cross-Link */}
              <div>
                <h4 className="cr-report-sec-title">4. CAPA Action Register ({capas.length}) & PHA / BowTie Revalidation</h4>
                <div style={{ fontSize: '0.8rem', marginBottom: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <strong>Linked PHA Study:</strong> {fullInc.phaBowTieLink?.linkedStudyName || 'None'} |{' '}
                  <strong>BowTie Top Event:</strong> {fullInc.phaBowTieLink?.linkedBowTieEvent || 'None'} |{' '}
                  <strong>Revalidation Status:</strong> {fullInc.phaBowTieLink?.revalidationStatus || 'Not Required'}
                </div>
                {capas.length > 0 && (
                  <table className="cr-report-table">
                    <thead>
                      <tr>
                        <th>CAPA ID</th>
                        <th>Type</th>
                        <th>Action Description</th>
                        <th>Owner / Dept</th>
                        <th>Due Date</th>
                        <th>MOC Ref</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capas.map((c) => (
                        <tr key={c._id}>
                          <td>{c.actionNumber}</td>
                          <td>{c.actionType}</td>
                          <td>{c.description}</td>
                          <td>{c.assignee?.name} ({c.department})</td>
                          <td>{c.targetDate ? new Date(c.targetDate).toLocaleDateString() : '—'}</td>
                          <td>{c.mocReference?.mocNumber || 'N/A'}</td>
                          <td><strong>{c.status}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 5. Lessons Learned & Digital Governance Sign-Off Table */}
              <div>
                <h4 className="cr-report-sec-title">5. Lessons Learned & Formal Closure Sign-Offs</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem' }}>
                  <strong>Executive Summary:</strong> {lessonsForm.executiveSummary || fullInc.descriptionMatrix?.whatHappened}
                </p>
                {lessonBullets.length > 0 && (
                  <ul style={{ margin: '0 0 10px 18px', padding: 0, fontSize: '0.82rem' }}>
                    {lessonBullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <table className="cr-report-table">
                  <thead>
                    <tr>
                      <th>Governance Role</th>
                      <th>Signer Name</th>
                      <th>Designation</th>
                      <th>Decision</th>
                      <th>Signed Timestamp</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signOffs.map((so) => (
                      <tr key={so.role}>
                        <td><strong>{so.role}</strong></td>
                        <td>{so.signerName || '—'}</td>
                        <td>{so.signerDesignation || '—'}</td>
                        <td><strong>{so.status}</strong></td>
                        <td>{so.signedAt ? new Date(so.signedAt).toLocaleString() : 'Pending'}</td>
                        <td>{so.comments || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
