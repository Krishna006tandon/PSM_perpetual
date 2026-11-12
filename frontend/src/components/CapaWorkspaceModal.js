import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import './CapaWorkspaceModal.css';

const API_URL = getApiUrl();

const COMMON_DEPTS = [
  'Operations',
  'Mechanical Maintenance',
  'Electrical & Instrumentation',
  'Process Engineering',
  'Safety & EHS',
  'Inspection & Reliability',
  'Technical Services',
  'Projects'
];

const getStatusClass = (status = '') => {
  if (status === 'Verified & Closed') return 'st-verified-and-closed';
  if (status === 'Submitted For Verification') return 'st-submitted-for-verification';
  if (status === 'Rejected / Rework') return 'st-rejected-rework';
  if (status === 'In Progress') return 'st-in-progress';
  return 'st-open';
};

const getPriorityClass = (prio = 'Medium') => {
  const key = String(prio || 'Medium').toLowerCase();
  if (key === 'critical') return 'prio-critical';
  if (key === 'high') return 'prio-high';
  if (key === 'low') return 'prio-low';
  return 'prio-medium';
};

const resolvePhotoUrl = (url = '') => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }
  return url;
};

const isImagePreviewable = (url = '') => {
  if (!url) return false;
  return (
    url.startsWith('/uploads/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:image/')
  );
};

const defaultTargetDate = () => {
  const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export default function CapaWorkspaceModal({
  isOpen,
  onClose,
  incident,
  currentUser,
  initialWhyNodeId = null,
  onCapaUpdated
}) {
  const [capas, setCapas] = useState([]);
  const [whyNodes, setWhyNodes] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    submittedForVerification: 0,
    verifiedAndClosed: 0,
    rejected: 0,
    overdueCount: 0,
    correctiveCount: 0,
    preventiveCount: 0,
    completionRate: 0,
    readyForClosure: false
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [bannerSuccess, setBannerSuccess] = useState(null);
  const [filterMode, setFilterMode] = useState('all');

  // Drawer modes: 'idle' | 'create' | 'edit' | 'submit' | 'verify' | 'escalate'
  const [drawerMode, setDrawerMode] = useState('idle');
  const [activeCapa, setActiveCapa] = useState(null);

  // Create/Edit Form
  const [form, setForm] = useState({
    whyNodeId: '',
    actionType: 'Corrective',
    priority: 'High',
    description: '',
    department: 'Operations',
    assigneeName: '',
    assigneeDesignation: '',
    assigneeEmail: '',
    targetDate: defaultTargetDate(),
    requiresMoc: false,
    autoCreateMoc: false,
    mocNumber: ''
  });

  // Maker Submit Verification Form
  const [submitForm, setSubmitForm] = useState({
    assigneeNotes: '',
    beforePhotoUrl: '',
    afterPhotoUrl: ''
  });
  const [uploadingField, setUploadingField] = useState(null);

  // Checker Verify Form
  const [verifyForm, setVerifyForm] = useState({
    reviewedBy: '',
    reviewComments: ''
  });

  // Escalation Form
  const [escalationReason, setEscalationReason] = useState('');

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, []);

  const flashSuccess = (msg) => {
    setBannerSuccess(msg);
    setTimeout(() => setBannerSuccess(null), 3000);
  };

  const loadCapas = useCallback(async () => {
    if (!incident?._id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/capas`, {
        headers: authHeaders()
      });
      setCapas(Array.isArray(data.capas) ? data.capas : []);
      setWhyNodes(Array.isArray(data.whyNodes) ? data.whyNodes : []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [incident?._id, authHeaders]);

  useEffect(() => {
    if (isOpen && incident?._id) {
      setBannerSuccess(null);
      setError(null);
      loadCapas();
      if (initialWhyNodeId) {
        setForm((prev) => ({
          ...prev,
          whyNodeId: initialWhyNodeId,
          description: '',
          targetDate: defaultTargetDate()
        }));
        setDrawerMode('create');
      } else {
        setDrawerMode('idle');
        setActiveCapa(null);
      }
    }
  }, [isOpen, incident?._id, initialWhyNodeId, loadCapas]);

  const sortedWhyOptions = useMemo(() => {
    const rootCauses = whyNodes.filter(
      (n) => n.isRootCause || (n.rootCauseType && n.rootCauseType !== 'None')
    );
    const others = whyNodes.filter(
      (n) => !(n.isRootCause || (n.rootCauseType && n.rootCauseType !== 'None')) && n.whyLevel > 0
    );
    return { rootCauses, others };
  }, [whyNodes]);

  const filteredCapas = useMemo(() => {
    if (filterMode === 'all') return capas;
    if (filterMode === 'active') {
      return capas.filter((c) => c.status === 'Open' || c.status === 'In Progress');
    }
    if (filterMode === 'pending_verify') {
      return capas.filter((c) => c.status === 'Submitted For Verification');
    }
    if (filterMode === 'closed') {
      return capas.filter((c) => c.status === 'Verified & Closed');
    }
    if (filterMode === 'overdue') {
      return capas.filter((c) => c.isOverdue);
    }
    if (filterMode === 'rework') {
      return capas.filter((c) => c.status === 'Rejected / Rework');
    }
    return capas;
  }, [capas, filterMode]);

  if (!isOpen || !incident) return null;

  const openCreateDrawer = (preWhyId = '') => {
    setActiveCapa(null);
    setForm({
      whyNodeId: preWhyId || sortedWhyOptions.rootCauses[0]?._id || '',
      actionType: 'Corrective',
      priority: 'High',
      description: '',
      department: 'Operations',
      assigneeName: '',
      assigneeDesignation: '',
      assigneeEmail: '',
      targetDate: defaultTargetDate(),
      requiresMoc: false,
      autoCreateMoc: false,
      mocNumber: ''
    });
    setDrawerMode('create');
  };

  const openEditDrawer = (capa) => {
    setActiveCapa(capa);
    setForm({
      whyNodeId: capa.whyNodeId?._id || capa.whyNodeId || '',
      actionType: capa.actionType || 'Corrective',
      priority: capa.priority || 'Medium',
      description: capa.description || '',
      department: capa.department || 'Operations',
      assigneeName: capa.assignee?.name || '',
      assigneeDesignation: capa.assignee?.designation || '',
      assigneeEmail: capa.assignee?.email || '',
      targetDate: capa.targetDate ? new Date(capa.targetDate).toISOString().slice(0, 10) : defaultTargetDate(),
      requiresMoc: Boolean(capa.mocReference?.requiresMoc),
      autoCreateMoc: false,
      mocNumber: capa.mocReference?.mocNumber || ''
    });
    setDrawerMode('edit');
  };

  const openSubmitDrawer = (capa) => {
    setActiveCapa(capa);
    setSubmitForm({
      assigneeNotes: capa.verification?.assigneeNotes || '',
      beforePhotoUrl: capa.verification?.beforePhotoUrl || '',
      afterPhotoUrl: capa.verification?.afterPhotoUrl || ''
    });
    setDrawerMode('submit');
  };

  const openVerifyDrawer = (capa) => {
    setActiveCapa(capa);
    setVerifyForm({
      reviewedBy: currentUser?.name || incident.cft?.leader?.name || 'HSE / CFT Lead',
      reviewComments: ''
    });
    setDrawerMode('verify');
  };

  const openEscalateDrawer = (capa) => {
    setActiveCapa(capa);
    setEscalationReason(capa.escalation?.escalationReason || '');
    setDrawerMode('escalate');
  };

  const handleSaveCapaForm = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.assigneeName.trim()) {
      setError('CAPA description and Assignee name are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        whyNodeId: form.whyNodeId || null,
        actionType: form.actionType,
        priority: form.priority,
        description: form.description.trim(),
        department: form.department,
        assignee: {
          name: form.assigneeName.trim(),
          designation: form.assigneeDesignation.trim(),
          email: form.assigneeEmail.trim()
        },
        targetDate: form.targetDate,
        requiresMoc: form.requiresMoc,
        autoCreateMoc: drawerMode === 'create' ? form.autoCreateMoc : false,
        mocNumber: form.mocNumber.trim()
      };

      if (drawerMode === 'create') {
        await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/capas`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        flashSuccess('CAPA created & assigned.');
      } else if (drawerMode === 'edit' && activeCapa) {
        await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/capas/${activeCapa._id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        flashSuccess('CAPA updated.');
      }

      setDrawerMode('idle');
      setActiveCapa(null);
      await loadCapas();
      if (onCapaUpdated) onCapaUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (capa, nextStatus) => {
    setSaving(true);
    setError(null);
    try {
      await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/capas/${capa._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      flashSuccess(`${capa.actionNumber} moved to ${nextStatus}.`);
      await loadCapas();
      if (onCapaUpdated) onCapaUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file, fieldKey) => {
    if (!file) return;
    setUploadingField(fieldKey);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`${API_URL}/api/incidents/${incident._id}/capas/upload-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Photo upload failed.');
      }
      setSubmitForm((prev) => ({ ...prev, [fieldKey]: data.fileUrl }));
      flashSuccess('Photo uploaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingField(null);
    }
  };

  const handleMakerSubmit = async (e) => {
    e.preventDefault();
    if (!activeCapa || !submitForm.assigneeNotes.trim()) {
      setError('Implementation notes are required to submit for verification.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/capas/${activeCapa._id}/submit`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            ...submitForm,
            submittedBy: currentUser?.name || activeCapa.assignee?.name
          })
        }
      );
      flashSuccess(`${activeCapa.actionNumber} submitted for HSE/CFT verification.`);
      setDrawerMode('idle');
      setActiveCapa(null);
      await loadCapas();
      if (onCapaUpdated) onCapaUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckerDecision = async (decision) => {
    if (!activeCapa) return;
    if (decision === 'reject' && !verifyForm.reviewComments.trim()) {
      setError('Please enter rework instructions/comments before rejecting.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/capas/${activeCapa._id}/verify`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            decision,
            reviewedBy: verifyForm.reviewedBy.trim() || 'HSE Reviewer',
            reviewComments: verifyForm.reviewComments.trim()
          })
        }
      );
      flashSuccess(
        decision === 'approve'
          ? `${activeCapa.actionNumber} verified & closed!`
          : `${activeCapa.actionNumber} returned for rework.`
      );
      setDrawerMode('idle');
      setActiveCapa(null);
      await loadCapas();
      if (onCapaUpdated) onCapaUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!activeCapa) return;
    setSaving(true);
    setError(null);
    try {
      await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/capas/${activeCapa._id}/escalate`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            escalationReason: escalationReason.trim() || 'Overdue action escalated to leadership.'
          })
        }
      );
      flashSuccess(`${activeCapa.actionNumber} escalated.`);
      setDrawerMode('idle');
      setActiveCapa(null);
      await loadCapas();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInitiateMoc = async (capa) => {
    if (!window.confirm(`Create a linked MOC Ticket for ${capa.actionNumber}?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/capas/${capa._id}/initiate-moc`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ actor: currentUser?.name || incident.cft?.leader?.name || 'HSE Lead' })
        }
      );
      flashSuccess(`Linked MOC Ticket ${res.moc?.mocId} initiated!`);
      await loadCapas();
      if (onCapaUpdated) onCapaUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCapa = async (capa) => {
    if (!window.confirm(`Delete ${capa.actionNumber}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/capas/${capa._id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (activeCapa?._id === capa._id) {
        setDrawerMode('idle');
        setActiveCapa(null);
      }
      flashSuccess(`${capa.actionNumber} deleted.`);
      await loadCapas();
      if (onCapaUpdated) onCapaUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="capa-modal-backdrop">
      <div className="capa-modal-shell">
        {/* Header */}
        <div className="capa-header">
          <div>
            <div className="rca-header-badges">
              <span className="capa-stage-pill">Stage 3B – CAPA & Digital Verification</span>
              <span className="rca-inc-badge">{incident.incidentNumber}</span>
              <span className="rca-metric-chip">Status: {incident.status}</span>
              {summary.readyForClosure && (
                <span className="rca-metric-chip validated">✅ All CAPAs Verified & Closed</span>
              )}
            </div>
            <h2 className="rca-title">{incident.title}</h2>
            <div className="rca-subtitle">
              <span>📍 Zone: <strong>{incident.plantZone}</strong></span>
              <span>👥 CFT Lead: <strong>{incident.cft?.leader?.name || 'Not assigned'}</strong></span>
            </div>
          </div>

          <button type="button" className="rca-close-btn" onClick={onClose} title="Close CAPA Workspace">
            ✕
          </button>
        </div>

        {/* Completion Progress & KPI Strip */}
        <div className="capa-progress-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800' }}>
              Closure Progress: {summary.verifiedAndClosed}/{summary.total} ({summary.completionRate}%)
            </div>
            <div className="capa-progress-track">
              <div className="capa-progress-fill" style={{ width: `${summary.completionRate}%` }} />
            </div>
          </div>

          <div className="rca-metrics-strip">
            <span className="rca-metric-chip">Open/Active: {summary.open + summary.inProgress}</span>
            <span className="rca-metric-chip" style={{ background: '#ede9fe', color: '#5b21b6', borderColor: '#c4b5fd' }}>
              Pending Verify: {summary.submittedForVerification}
            </span>
            <span className="rca-metric-chip validated">Verified: {summary.verifiedAndClosed}</span>
            {summary.overdueCount > 0 && (
              <span className="rca-metric-chip root">⚠️ Overdue: {summary.overdueCount}</span>
            )}
            <span className="rca-metric-chip">
              Corrective: {summary.correctiveCount} | Preventive: {summary.preventiveCount}
            </span>
          </div>
        </div>

        {/* Banners */}
        {error && (
          <div className="rca-banner error">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}
        {bannerSuccess && (
          <div className="rca-banner success">
            <span>✅ {bannerSuccess}</span>
          </div>
        )}

        {/* Main Split Workspace */}
        <div className="capa-body-grid">
          {/* Left: CAPA Registry List */}
          <div className="capa-list-pane">
            <div className="capa-controls-row">
              <div className="rca-filter-pills">
                {[
                  { id: 'all', label: `All (${summary.total})` },
                  { id: 'active', label: `Active (${summary.open + summary.inProgress})` },
                  { id: 'pending_verify', label: `Verify Queue (${summary.submittedForVerification})` },
                  { id: 'closed', label: `Closed (${summary.verifiedAndClosed})` },
                  { id: 'overdue', label: `⚠️ Overdue (${summary.overdueCount})` },
                  { id: 'rework', label: `Rework (${summary.rejected})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`rca-filter-pill ${filterMode === f.id ? 'active' : ''}`}
                    onClick={() => setFilterMode(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="rca-btn-save"
                onClick={() => openCreateDrawer('')}
              >
                + Assign New CAPA
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading CAPA Actions & Root Cause Links...
              </div>
            ) : filteredCapas.length === 0 ? (
              <div style={{
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '36px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📋</div>
                <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                  No CAPA items in this view
                </div>
                <div style={{ fontSize: '0.84rem', marginBottom: '12px' }}>
                  Assign Corrective & Preventive actions linked directly to your Why-Why Root Causes.
                </div>
                <button type="button" className="rca-btn-save" onClick={() => openCreateDrawer('')}>
                  + Create First CAPA
                </button>
              </div>
            ) : (
              filteredCapas.map((capa) => {
                const isSelected = activeCapa?._id === capa._id;
                const isClosed = capa.status === 'Verified & Closed';
                const hasBefore = Boolean(capa.verification?.beforePhotoUrl);
                const hasAfter = Boolean(capa.verification?.afterPhotoUrl);

                return (
                  <div
                    key={capa._id}
                    className={[
                      'capa-card',
                      isSelected ? 'active' : '',
                      capa.isOverdue ? 'overdue' : '',
                      isClosed ? 'closed' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="capa-card-top">
                      <div className="capa-badge-group">
                        <span className="capa-num-pill">{capa.actionNumber}</span>
                        <span
                          className={`capa-type-pill ${
                            capa.actionType === 'Preventive'
                              ? 'capa-type-preventive'
                              : 'capa-type-corrective'
                          }`}
                        >
                          {capa.actionType}
                        </span>
                        <span className={`capa-priority-pill ${getPriorityClass(capa.priority)}`}>
                          {capa.priority}
                        </span>
                        {capa.mocReference?.requiresMoc && (
                          <span className="rca-taxonomy-chip">
                            🔗 {capa.mocReference.mocNumber || 'MOC Required'}
                          </span>
                        )}
                        {capa.escalation?.isEscalated && (
                          <span className="rca-rc-badge">🚨 Escalated</span>
                        )}
                      </div>

                      <span className={`capa-status-pill ${getStatusClass(capa.status)}`}>
                        {capa.status}
                      </span>
                    </div>

                    <div className="capa-desc">{capa.description}</div>

                    {/* Linked Why-Why Root Cause */}
                    {capa.whyNodeId && typeof capa.whyNodeId === 'object' && (
                      <div className="capa-rc-link-box">
                        <strong>
                          🎯 Linked {capa.whyNodeId.rootCauseType !== 'None' ? capa.whyNodeId.rootCauseType : `Why ${capa.whyNodeId.whyLevel}`}:
                        </strong>{' '}
                        {capa.whyNodeId.statement}
                        {capa.whyNodeId.api754Category && (
                          <span style={{ color: '#1d4ed8', marginLeft: '6px' }}>
                            [{capa.whyNodeId.api754Category}]
                          </span>
                        )}
                      </div>
                    )}

                    <div className="capa-meta-row">
                      <span>
                        👤 <strong>{capa.assignee?.name}</strong> ({capa.department})
                      </span>
                      <span>
                        📅 Target:{' '}
                        <strong>{new Date(capa.targetDate).toLocaleDateString()}</strong>{' '}
                        {!isClosed && capa.isOverdue && (
                          <strong style={{ color: '#dc2626' }}>
                            (⚠️ {Math.abs(capa.daysRemaining || 0)}d overdue)
                          </strong>
                        )}
                        {!isClosed && !capa.isOverdue && capa.daysRemaining !== null && (
                          <span style={{ color: '#15803d' }}>({capa.daysRemaining}d left)</span>
                        )}
                      </span>
                    </div>

                    {/* Verification Notes & Photos Preview */}
                    {(capa.verification?.assigneeNotes || hasBefore || hasAfter || capa.verification?.reviewComments) && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        marginBottom: '8px'
                      }}>
                        {capa.verification?.assigneeNotes && (
                          <div>
                            <strong>Implementation Notes ({capa.verification.submittedBy || 'Owner'}):</strong>{' '}
                            {capa.verification.assigneeNotes}
                          </div>
                        )}
                        {(hasBefore || hasAfter) && (
                          <div className="capa-evidence-preview-row">
                            <div>
                              <div style={{ fontWeight: '700', marginBottom: '4px' }}>Before Photo / Ref</div>
                              {hasBefore ? (
                                isImagePreviewable(capa.verification.beforePhotoUrl) ? (
                                  <img
                                    src={resolvePhotoUrl(capa.verification.beforePhotoUrl)}
                                    alt="Before CAPA"
                                    className="capa-photo-thumb"
                                  />
                                ) : (
                                  <span>{capa.verification.beforePhotoUrl}</span>
                                )
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Not attached</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', marginBottom: '4px' }}>After Photo / Ref</div>
                              {hasAfter ? (
                                isImagePreviewable(capa.verification.afterPhotoUrl) ? (
                                  <img
                                    src={resolvePhotoUrl(capa.verification.afterPhotoUrl)}
                                    alt="After CAPA"
                                    className="capa-photo-thumb"
                                  />
                                ) : (
                                  <span>{capa.verification.afterPhotoUrl}</span>
                                )
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Not attached</span>
                              )}
                            </div>
                          </div>
                        )}
                        {capa.verification?.reviewComments && (
                          <div style={{
                            marginTop: '4px',
                            color: capa.verification.isAccepted ? '#166534' : '#991b1b',
                            fontWeight: '600'
                          }}>
                            <strong>Verifier ({capa.verification.reviewedBy}):</strong>{' '}
                            {capa.verification.reviewComments}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="capa-card-actions">
                      {(capa.status === 'Open' || capa.status === 'Rejected / Rework') && (
                        <button
                          type="button"
                          className="rca-mini-btn"
                          onClick={() => handleStatusChange(capa, 'In Progress')}
                          disabled={saving}
                        >
                          ▶ Start Work
                        </button>
                      )}

                      {(capa.status === 'Open' || capa.status === 'In Progress' || capa.status === 'Rejected / Rework') && (
                        <button
                          type="button"
                          className="rca-mini-btn add-why"
                          onClick={() => openSubmitDrawer(capa)}
                        >
                          📤 Submit for Verification
                        </button>
                      )}

                      {capa.status === 'Submitted For Verification' && (
                        <button
                          type="button"
                          className="rca-mini-btn branch"
                          onClick={() => openVerifyDrawer(capa)}
                        >
                          🔍 Review & Verify (Checker)
                        </button>
                      )}

                      {capa.mocReference?.requiresMoc && !capa.mocReference?.mocNumber && (
                        <button
                          type="button"
                          className="rca-mini-btn"
                          onClick={() => handleInitiateMoc(capa)}
                          disabled={saving}
                        >
                          🔗 Initiate MOC Ticket
                        </button>
                      )}

                      {!isClosed && capa.isOverdue && !capa.escalation?.isEscalated && (
                        <button
                          type="button"
                          className="rca-mini-btn"
                          style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                          onClick={() => openEscalateDrawer(capa)}
                        >
                          🚨 Escalate
                        </button>
                      )}

                      {!isClosed && (
                        <button
                          type="button"
                          className="rca-mini-btn"
                          onClick={() => openEditDrawer(capa)}
                        >
                          ✏️ Edit
                        </button>
                      )}

                      <button
                        type="button"
                        className="rca-mini-btn"
                        style={{ color: '#b91c1c' }}
                        onClick={() => handleDeleteCapa(capa)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Context Action Drawer */}
          <div className="capa-drawer-pane">
            {drawerMode === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="capa-drawer-header">
                  <h3>Stage 3B Workflow Guide</h3>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: '1.55' }}>
                  <p style={{ marginTop: 0 }}>
                    Every Root Cause from Stage 3A should have verifiable <strong>Corrective</strong> &{' '}
                    <strong>Preventive</strong> actions:
                  </p>
                  <ol style={{ paddingLeft: '18px', margin: '8px 0' }}>
                    <li><strong>Assign:</strong> Link CAPA to a Root Cause, owner, department & due date.</li>
                    <li><strong>Maker Submit:</strong> Action owner uploads <strong>Before / After photos</strong> & implementation notes.</li>
                    <li><strong>Checker Verify:</strong> HSE / CFT Lead reviews evidence and either <strong>Verifies & Closes</strong> or returns for <strong>Rework</strong>.</li>
                  </ol>
                </div>

                {sortedWhyOptions.rootCauses.length > 0 && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '12px'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#991b1b', marginBottom: '6px' }}>
                      🎯 Quick-Assign CAPA from Root Causes
                    </div>
                    {sortedWhyOptions.rootCauses.map((rc) => (
                      <div
                        key={rc._id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 0',
                          borderBottom: '1px solid #fee2e2',
                          fontSize: '0.8rem'
                        }}
                      >
                        <span>
                          <strong>{rc.rootCauseType}:</strong> {rc.statement}
                        </span>
                        <button
                          type="button"
                          className="rca-mini-btn add-why"
                          onClick={() => openCreateDrawer(rc._id)}
                        >
                          + CAPA
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="rca-btn-save"
                  onClick={() => openCreateDrawer('')}
                >
                  + Assign New CAPA Action
                </button>
              </div>
            )}

            {(drawerMode === 'create' || drawerMode === 'edit') && (
              <form onSubmit={handleSaveCapaForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="capa-drawer-header">
                  <h3>{drawerMode === 'create' ? 'Assign New CAPA Action' : `Edit ${activeCapa?.actionNumber}`}</h3>
                  <button type="button" className="rca-btn-secondary" onClick={() => setDrawerMode('idle')}>
                    Cancel
                  </button>
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">Linked Root Cause / Why Step</label>
                  <select
                    className="rca-select"
                    value={form.whyNodeId}
                    onChange={(e) => setForm({ ...form, whyNodeId: e.target.value })}
                  >
                    <option value="">-- General Incident CAPA (No specific Why node) --</option>
                    {sortedWhyOptions.rootCauses.length > 0 && (
                      <optgroup label="🎯 Identified Root Causes & Contributing Factors">
                        {sortedWhyOptions.rootCauses.map((rc) => (
                          <option key={rc._id} value={rc._id}>
                            [{rc.rootCauseType}] Why {rc.whyLevel}: {rc.statement.slice(0, 75)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {sortedWhyOptions.others.length > 0 && (
                      <optgroup label="Other Why Steps">
                        {sortedWhyOptions.others.map((n) => (
                          <option key={n._id} value={n._id}>
                            Why {n.whyLevel}: {n.statement.slice(0, 75)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="rca-two-col">
                  <div className="rca-field-group">
                    <label className="rca-field-label">Action Type *</label>
                    <select
                      className="rca-select"
                      value={form.actionType}
                      onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                    >
                      <option value="Corrective">Corrective (Fix Direct Cause)</option>
                      <option value="Preventive">Preventive (Systemic / Recurrence)</option>
                    </select>
                  </div>

                  <div className="rca-field-group">
                    <label className="rca-field-label">Priority *</label>
                    <select
                      className="rca-select"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">Action Description *</label>
                  <textarea
                    rows={3}
                    className="rca-textarea"
                    placeholder="Specific, measurable action (e.g., Replace gasket spec on FV-104 and update PM inspection frequency to 6 months)..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div className="rca-two-col">
                  <div className="rca-field-group">
                    <label className="rca-field-label">Department *</label>
                    <select
                      className="rca-select"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      {COMMON_DEPTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rca-field-group">
                    <label className="rca-field-label">Target Date *</label>
                    <input
                      type="date"
                      className="rca-input"
                      value={form.targetDate}
                      onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="rca-two-col">
                  <div className="rca-field-group">
                    <label className="rca-field-label">Action Owner Name *</label>
                    <input
                      type="text"
                      className="rca-input"
                      placeholder="Responsible person"
                      value={form.assigneeName}
                      onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="rca-field-group">
                    <label className="rca-field-label">Designation / Role</label>
                    <input
                      type="text"
                      className="rca-input"
                      placeholder="e.g., Maintenance Lead"
                      value={form.assigneeDesignation}
                      onChange={(e) => setForm({ ...form, assigneeDesignation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">Owner Email (Optional)</label>
                  <input
                    type="email"
                    className="rca-input"
                    placeholder="owner@plant.com"
                    value={form.assigneeEmail}
                    onChange={(e) => setForm({ ...form, assigneeEmail: e.target.value })}
                  />
                </div>

                {/* MOC Integration Toggle */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.requiresMoc}
                      onChange={(e) => setForm({ ...form, requiresMoc: e.target.checked })}
                    />
                    Requires Management of Change (MOC)
                  </label>

                  {form.requiresMoc && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {drawerMode === 'create' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer', color: '#1e40af' }}>
                          <input
                            type="checkbox"
                            checked={form.autoCreateMoc}
                            onChange={(e) => setForm({ ...form, autoCreateMoc: e.target.checked })}
                          />
                          Auto-create linked MOC Ticket immediately
                        </label>
                      )}
                      {!form.autoCreateMoc && (
                        <input
                          type="text"
                          className="rca-input"
                          placeholder="Existing MOC Number (optional, or initiate later)"
                          value={form.mocNumber}
                          onChange={(e) => setForm({ ...form, mocNumber: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" className="rca-btn-save" disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : drawerMode === 'create'
                    ? '✅ Assign CAPA Action'
                    : '💾 Save CAPA Changes'}
                </button>
              </form>
            )}

            {drawerMode === 'submit' && activeCapa && (
              <form onSubmit={handleMakerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="capa-drawer-header">
                  <h3>📤 Maker Submission: {activeCapa.actionNumber}</h3>
                  <button type="button" className="rca-btn-secondary" onClick={() => setDrawerMode('idle')}>
                    Cancel
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong>Action:</strong> {activeCapa.description}
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">Implementation / Completion Notes *</label>
                  <textarea
                    rows={3}
                    className="rca-textarea"
                    placeholder="Describe work executed, work order / PTW reference, calibration/test result..."
                    value={submitForm.assigneeNotes}
                    onChange={(e) => setSubmitForm({ ...submitForm, assigneeNotes: e.target.value })}
                    required
                  />
                </div>

                {/* Before Photo */}
                <div className="capa-upload-box">
                  <label className="rca-field-label">Before Condition Photo / Document Ref</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'beforePhotoUrl')}
                    disabled={uploadingField === 'beforePhotoUrl'}
                  />
                  <input
                    type="text"
                    className="rca-input"
                    placeholder="Or paste photo URL / reference ID"
                    value={submitForm.beforePhotoUrl}
                    onChange={(e) => setSubmitForm({ ...submitForm, beforePhotoUrl: e.target.value })}
                  />
                  {uploadingField === 'beforePhotoUrl' && <span style={{ fontSize: '0.75rem' }}>Uploading...</span>}
                  {isImagePreviewable(submitForm.beforePhotoUrl) && (
                    <img
                      src={resolvePhotoUrl(submitForm.beforePhotoUrl)}
                      alt="Before preview"
                      className="capa-photo-thumb"
                    />
                  )}
                </div>

                {/* After Photo */}
                <div className="capa-upload-box">
                  <label className="rca-field-label">After Rectification Photo / Document Ref</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e.target.files?.[0], 'afterPhotoUrl')}
                    disabled={uploadingField === 'afterPhotoUrl'}
                  />
                  <input
                    type="text"
                    className="rca-input"
                    placeholder="Or paste photo URL / reference ID"
                    value={submitForm.afterPhotoUrl}
                    onChange={(e) => setSubmitForm({ ...submitForm, afterPhotoUrl: e.target.value })}
                  />
                  {uploadingField === 'afterPhotoUrl' && <span style={{ fontSize: '0.75rem' }}>Uploading...</span>}
                  {isImagePreviewable(submitForm.afterPhotoUrl) && (
                    <img
                      src={resolvePhotoUrl(submitForm.afterPhotoUrl)}
                      alt="After preview"
                      className="capa-photo-thumb"
                    />
                  )}
                </div>

                <button type="submit" className="rca-btn-save" disabled={saving || Boolean(uploadingField)}>
                  {saving ? 'Submitting...' : '📤 Submit for HSE Verification'}
                </button>
              </form>
            )}

            {drawerMode === 'verify' && activeCapa && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="capa-drawer-header">
                  <h3>🔍 Checker Review: {activeCapa.actionNumber}</h3>
                  <button type="button" className="rca-btn-secondary" onClick={() => setDrawerMode('idle')}>
                    Cancel
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div><strong>Action:</strong> {activeCapa.description}</div>
                  <div style={{ marginTop: '6px' }}>
                    <strong>Submitted By:</strong> {activeCapa.verification?.submittedBy || activeCapa.assignee?.name}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <strong>Owner Notes:</strong> {activeCapa.verification?.assigneeNotes}
                  </div>
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">Verifier Name *</label>
                  <input
                    type="text"
                    className="rca-input"
                    value={verifyForm.reviewedBy}
                    onChange={(e) => setVerifyForm({ ...verifyForm, reviewedBy: e.target.value })}
                  />
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">
                    Verification Comments / Rework Instructions (Required for Reject)
                  </label>
                  <textarea
                    rows={3}
                    className="rca-textarea"
                    placeholder="Confirm effectiveness check on site, or specify rework required..."
                    value={verifyForm.reviewComments}
                    onChange={(e) => setVerifyForm({ ...verifyForm, reviewComments: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className="rca-btn-danger"
                    disabled={saving}
                    onClick={() => handleCheckerDecision('reject')}
                  >
                    ↩️ Reject / Rework
                  </button>
                  <button
                    type="button"
                    className="rca-btn-save"
                    style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)' }}
                    disabled={saving}
                    onClick={() => handleCheckerDecision('approve')}
                  >
                    ✅ Verify & Close
                  </button>
                </div>
              </div>
            )}

            {drawerMode === 'escalate' && activeCapa && (
              <form onSubmit={handleEscalateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="capa-drawer-header">
                  <h3>🚨 Escalate Overdue CAPA: {activeCapa.actionNumber}</h3>
                  <button type="button" className="rca-btn-secondary" onClick={() => setDrawerMode('idle')}>
                    Cancel
                  </button>
                </div>

                <div className="rca-field-group">
                  <label className="rca-field-label">Escalation Reason / Bottleneck *</label>
                  <textarea
                    rows={3}
                    className="rca-textarea"
                    placeholder="Reason for delay (spare parts pending, shutdown window required, manpower constraint)..."
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="rca-btn-danger" disabled={saving}>
                  {saving ? 'Escalating...' : '🚨 Record Escalation'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
