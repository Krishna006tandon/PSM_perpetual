import React, { useState, useEffect, useCallback } from 'react';
import Api754HelpModal from './Api754HelpModal';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import './BarrierEvidenceModal.css';

const API_URL = getApiUrl();

const BARRIER_STATUS_OPTIONS = [
  'Worked as Intended',
  'Failed / Degraded',
  'Bypassed / Defeated',
  'Missing / Not Installed',
  'Not Applicable'
];

const TRC_OPTIONS = [
  { value: 'N/A', label: 'N/A (No chemical release)' },
  { value: 'TRC 1', label: 'TRC 1 — TIH Zone A (Outdoor 5kg / Indoor 0.5kg)' },
  { value: 'TRC 2', label: 'TRC 2 — TIH Zone B (Outdoor 25kg / Indoor 2.5kg)' },
  { value: 'TRC 3', label: 'TRC 3 — TIH Zone C (Outdoor 100kg / Indoor 10kg)' },
  { value: 'TRC 4', label: 'TRC 4 — TIH Zone D (Outdoor 200kg / Indoor 20kg)' },
  { value: 'TRC 5', label: 'TRC 5 — Flammable Gas / PG I (Outdoor 500kg / Indoor 50kg)' },
  { value: 'TRC 6', label: 'TRC 6 — PG II Flammable / Crude >=15 API (1000kg / 100kg)' },
  { value: 'TRC 7', label: 'TRC 7 — PG III Combustible (2000kg / 200kg)' },
  { value: 'TRC 8', label: 'TRC 8 — Moderate Combustible / Strong Acid-Base (T2 1000kg)' },
  { value: 'Non-Hazardous/Other', label: 'Non-Hazardous / Other' }
];

const resolveFileHref = (fileUrl = '') => {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
    return fileUrl;
  }
  if (fileUrl.startsWith('/')) {
    return `${API_URL}${fileUrl}`;
  }
  return fileUrl;
};

const getBarrierCardClass = (status = '') => {
  if (status === 'Worked as Intended') return 'st-worked';
  if (status === 'Failed / Degraded') return 'st-failed';
  if (status === 'Bypassed / Defeated') return 'st-bypassed';
  if (status === 'Missing / Not Installed') return 'st-missing';
  return 'st-na';
};

export default function BarrierEvidenceModal({ isOpen, onClose, incident, onUpdated }) {
  const [activeTab, setActiveTab] = useState('barriers');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingBarriers, setSavingBarriers] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [barriers, setBarriers] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [summary, setSummary] = useState({
    barriers: { total: 0, applicableBarriers: 0, workedCount: 0, failedCount: 0, bypassedCount: 0, missingCount: 0 },
    evidence: { total: 0, applicableEvidence: 0, uploadedCount: 0, pendingCount: 0, naCount: 0, completionRate: 0 }
  });
  const [classContext, setClassContext] = useState(null);
  const [evidenceFilter, setEvidenceFilter] = useState('All');

  // New custom barrier form
  const [newBarrier, setNewBarrier] = useState({
    layerName: '',
    barrierType: 'Prevention',
    safeguardTag: '',
    status: 'Failed / Degraded',
    failureReason: ''
  });

  // New custom evidence form
  const [newEvidence, setNewEvidence] = useState({
    title: '',
    category: 'Additional Evidence',
    notes: '',
    file: null
  });

  // Note edits per checklist row
  const [noteDrafts, setNoteDrafts] = useState({});

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!incident?._id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const data = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/barriers-evidence`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setBarriers(data.barrierAnalysis || []);
      setEvidenceList(data.supportingEvidence || []);
      setSummary(
        data.summary || {
          barriers: { total: 0, applicableBarriers: 0, workedCount: 0, failedCount: 0, bypassedCount: 0, missingCount: 0 },
          evidence: { total: 0, applicableEvidence: 0, uploadedCount: 0, pendingCount: 0, naCount: 0, completionRate: 0 }
        }
      );
      setClassContext(data.classificationContext || null);

      const drafts = {};
      (data.supportingEvidence || []).forEach((item) => {
        if (item._id) drafts[item._id] = item.notes || '';
      });
      setNoteDrafts(drafts);
    } catch (err) {
      showToast('error', err.message || 'Failed to load Stage 3C workspace.');
    } finally {
      setLoading(false);
    }
  }, [incident?._id, showToast]);

  useEffect(() => {
    if (isOpen && incident?._id) {
      setToast(null);
      setActiveTab('barriers');
      loadWorkspace();
    }
  }, [isOpen, incident?._id, loadWorkspace]);

  if (!isOpen || !incident) return null;

  const isPendingClassification =
    classContext?.classification?.category === 'Pending Classification' ||
    classContext?.classification?.tier === 'Pending Classification' ||
    incident?.api754Classification?.category === 'Pending Classification' ||
    incident?.api754Classification?.tier === 'Pending Classification';

  const currentTierLabel =
    classContext?.classification?.category ||
    classContext?.classification?.tier ||
    incident?.api754Classification?.category ||
    incident?.api754Classification?.tier ||
    'Unclassified';

  const getTokenHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // --- TAB 1: BARRIER SCORECARD HANDLERS ---
  const handleBarrierFieldChange = (index, field, value) => {
    setBarriers((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const handleAddCustomBarrier = () => {
    if (!newBarrier.layerName.trim()) {
      showToast('error', 'Please enter a Barrier / LOPA Layer name.');
      return;
    }
    setBarriers((prev) => [
      ...prev,
      {
        layerName: newBarrier.layerName.trim(),
        barrierType: newBarrier.barrierType,
        safeguardTag: newBarrier.safeguardTag.trim() || 'Custom Safeguard',
        status: newBarrier.status,
        failureReason: newBarrier.failureReason.trim()
      }
    ]);
    setNewBarrier({
      layerName: '',
      barrierType: 'Prevention',
      safeguardTag: '',
      status: 'Failed / Degraded',
      failureReason: ''
    });
    showToast('success', 'Custom barrier added to draft. Click "Save Barrier Scorecard" to persist.');
  };

  const handleRemoveBarrierRow = (index) => {
    setBarriers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveBarriers = async () => {
    setSavingBarriers(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/barriers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({ barriers })
      });
      setBarriers(res.barrierAnalysis || []);
      if (res.summary) setSummary(res.summary);
      showToast('success', 'Barrier Effectiveness Scorecard saved to incident record.');
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('error', err.message || 'Failed to save barrier analysis.');
    } finally {
      setSavingBarriers(false);
    }
  };

  // --- TAB 2: EVIDENCE VAULT HANDLERS ---
  const uploadFileToServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch(`${API_URL}/api/incidents/${incident._id}/evidence/upload`, {
      method: 'POST',
      headers: getTokenHeaders(),
      body: formData
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || `Upload failed with status ${resp.status}`);
    }
    return data;
  };

  const handleAttachFileToRow = async (item, file) => {
    if (!file) return;
    setUploadingId(item._id);
    try {
      const uploaded = await uploadFileToServer(file);
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          itemId: item._id,
          isApplicable: true,
          status: 'Uploaded / Attached',
          fileUrl: uploaded.fileUrl,
          originalName: uploaded.originalName,
          notes: noteDrafts[item._id] ?? item.notes ?? ''
        })
      });
      setEvidenceList(res.supportingEvidence || []);
      if (res.summary) setSummary(res.summary);
      showToast('success', `Uploaded & linked "${uploaded.originalName}" to ${item.title}.`);
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('error', err.message || 'File upload failed.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleSaveEvidenceNotesOrToggleNA = async (item, overrides = {}) => {
    setUploadingId(item._id);
    try {
      const payload = {
        itemId: item._id,
        notes: noteDrafts[item._id] ?? item.notes ?? '',
        ...overrides
      };
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify(payload)
      });
      setEvidenceList(res.supportingEvidence || []);
      if (res.summary) setSummary(res.summary);
      showToast('success', `Updated evidence item "${item.title}".`);
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('error', err.message || 'Failed to update evidence item.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleClearOrDeleteEvidence = async (item) => {
    setUploadingId(item._id);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/evidence/${item._id}`, {
        method: 'DELETE',
        headers: getTokenHeaders()
      });
      setEvidenceList(res.supportingEvidence || []);
      if (res.summary) setSummary(res.summary);
      showToast(
        'success',
        item.checklistKey === 'custom'
          ? `Deleted custom document "${item.title}".`
          : `Cleared attachment for "${item.title}".`
      );
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('error', err.message || 'Failed to clear/delete evidence item.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleAddCustomEvidence = async (e) => {
    e.preventDefault();
    if (!newEvidence.title.trim()) {
      showToast('error', 'Please enter a title for the custom evidence document.');
      return;
    }
    setUploadingId('custom-new');
    try {
      let fileUrl = '';
      let originalName = '';
      if (newEvidence.file) {
        const uploaded = await uploadFileToServer(newEvidence.file);
        fileUrl = uploaded.fileUrl;
        originalName = uploaded.originalName;
      }
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          title: newEvidence.title.trim(),
          category: newEvidence.category.trim() || 'Additional Evidence',
          notes: newEvidence.notes.trim(),
          fileUrl,
          originalName
        })
      });
      setEvidenceList(res.supportingEvidence || []);
      if (res.summary) setSummary(res.summary);
      setNewEvidence({ title: '', category: 'Additional Evidence', notes: '', file: null });
      showToast('success', `Added custom evidence document "${newEvidence.title.trim()}".`);
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('error', err.message || 'Failed to add custom evidence.');
    } finally {
      setUploadingId(null);
    }
  };

  // --- TAB 3: PENDING CLASSIFICATION RESOLVER ---
  const handleRecalculateClassification = async (e) => {
    e.preventDefault();
    if (!classContext) return;
    setRecalcLoading(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/recalculate-classification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          isActualRelease: classContext.isActualRelease,
          chemicalTRC: classContext.chemicalTRC,
          quantityInOneHourKg: Number(classContext.quantityInOneHourKg) || 0,
          quantityUnknown: Boolean(classContext.quantityUnknown),
          releaseLocation: classContext.releaseLocation,
          hasInjuriesPending: Boolean(classContext.hasInjuriesPending),
          directCostUSD: Number(classContext.directCostUSD) || 0,
          directCostPending: Boolean(classContext.directCostPending)
        })
      });
      setClassContext(res.classificationContext);
      showToast(
        'success',
        `API RP 754 Engine re-evaluated incident → ${res.classification?.category || res.classification?.tier}.`
      );
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('error', err.message || 'Failed to re-evaluate classification.');
    } finally {
      setRecalcLoading(false);
    }
  };

  const filteredEvidence = evidenceList.filter((item) => {
    if (evidenceFilter === 'All') return true;
    return item.status === evidenceFilter;
  });

  return (
    <div className="be-modal-overlay">
      <div className="be-modal-container">
        {/* Top Header */}
        <div className="be-modal-header">
          <div className="be-header-left">
            <span className="be-header-eyebrow">Stage 3C — Assurance, Evidence & Classification Resolver</span>
            <h2 className="be-header-title">
              <span>{incident.incidentNumber}</span>
              <span>— {incident.title}</span>
            </h2>
            <div className="be-header-sub">
              Unit: {incident.unitArea} | Equipment: {incident.equipmentTag || 'N/A'} | Status: {incident.status}
            </div>
          </div>
          <div className="be-header-right">
            <span className={`be-tier-pill ${isPendingClassification ? 'is-pending' : ''}`}>
              {isPendingClassification ? '⚠️ ' : '🏷️ '}
              {currentTierLabel}
            </span>
            <button type="button" className="be-btn-close" onClick={onClose}>
              ✖ Close
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Live KPI Strip */}
        <div className="be-toolbar">
          <div className="be-tabs">
            <button
              type="button"
              className={`be-tab-btn ${activeTab === 'barriers' ? 'active' : ''}`}
              onClick={() => setActiveTab('barriers')}
            >
              🛡️ 1. Barrier Scorecard (LOPA)
              <span className="be-tab-badge">
                {summary.barriers.failedCount + summary.barriers.bypassedCount} Failed
              </span>
            </button>
            <button
              type="button"
              className={`be-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
              onClick={() => setActiveTab('evidence')}
            >
              📁 2. Supporting Evidence Vault
              <span className="be-tab-badge">
                {summary.evidence.uploadedCount}/{summary.evidence.applicableEvidence}
              </span>
            </button>
            <button
              type="button"
              className={`be-tab-btn ${activeTab === 'classification' ? 'active' : ''}`}
              onClick={() => setActiveTab('classification')}
            >
              ⚖️ 3. Classification Validator
              <span className="be-tab-badge">
                {isPendingClassification ? 'Action Needed' : 'Verified'}
              </span>
            </button>
          </div>

          <div className="be-kpis">
            <div className="be-kpi-chip">
              <span>Worked:</span>
              <span className="be-kpi-val" style={{ color: '#16a34a' }}>{summary.barriers.workedCount}</span>
            </div>
            <div className="be-kpi-chip">
              <span>Failed / Bypassed:</span>
              <span className="be-kpi-val" style={{ color: '#dc2626' }}>
                {summary.barriers.failedCount + summary.barriers.bypassedCount}
              </span>
            </div>
            <div className="be-kpi-chip">
              <span>Evidence Completion:</span>
              <span className="be-kpi-val" style={{ color: '#0284c7' }}>
                {summary.evidence.completionRate}%
              </span>
            </div>
          </div>
        </div>

        {isPendingClassification && activeTab !== 'classification' && (
          <div className="be-pending-banner">
            <span>
              ⚠️ <strong>Pending Classification Alert:</strong> Initial FIR marked quantity, injury, or damage cost as pending. Once lab/mass-balance/medical/cost evidence is attached, finalize the API RP 754 Tier.
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="be-btn-secondary"
                onClick={() => setShowHelpModal(true)}
                style={{ background: '#ffffff', color: '#92400e', borderColor: '#d97706', fontWeight: 800 }}
              >
                📘 Why Pending? (Help)
              </button>
              <button
                type="button"
                className="be-btn-primary"
                onClick={() => setActiveTab('classification')}
              >
                ⚖️ Resolve Classification Now →
              </button>
            </div>
          </div>
        )}

        {toast && (
          <div className={`be-toast ${toast.type}`}>
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

        <div className="be-body">
          {loading ? (
            <div className="be-section-card">Loading Stage 3C Barrier & Evidence Workspace...</div>
          ) : null}

          {/* TAB 1: BARRIER EFFECTIVENESS SCORECARD */}
          {!loading && activeTab === 'barriers' && (
            <>
              <div className="be-section-card">
                <div className="be-section-header">
                  <div>
                    <h3>Swiss-Cheese / LOPA Barrier Sequence Overview</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                      Visual summary of Prevention (left) and Mitigation (right) safeguard performance during the event.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="be-btn-primary"
                    disabled={savingBarriers}
                    onClick={handleSaveBarriers}
                  >
                    {savingBarriers ? 'Saving...' : '💾 Save Barrier Scorecard'}
                  </button>
                </div>

                <div className="be-swiss-strip">
                  {barriers.map((b, idx) => (
                    <div key={b._id || idx} className={`be-swiss-card ${getBarrierCardClass(b.status)}`}>
                      <span className="be-swiss-type">{b.barrierType}</span>
                      <span className="be-swiss-title">{b.layerName}</span>
                      <span className="be-swiss-status">{b.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="be-section-card">
                <div className="be-section-header">
                  <h3>Evaluate Safeguard Layers</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                    Update each layer status and document exact technical failure or bypass modes.
                  </span>
                </div>

                <div className="be-barrier-list">
                  {barriers.map((b, idx) => (
                    <div key={b._id || idx} className="be-barrier-row">
                      <div>
                        <span className="be-field-label">Layer Name</span>
                        <input
                          type="text"
                          className="be-input"
                          value={b.layerName || ''}
                          onChange={(e) => handleBarrierFieldChange(idx, 'layerName', e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="be-field-label">Type</span>
                        <select
                          className="be-select"
                          value={b.barrierType || 'Prevention'}
                          onChange={(e) => handleBarrierFieldChange(idx, 'barrierType', e.target.value)}
                        >
                          <option value="Prevention">Prevention</option>
                          <option value="Mitigation">Mitigation</option>
                        </select>
                      </div>
                      <div>
                        <span className="be-field-label">Safeguard / Tag</span>
                        <input
                          type="text"
                          className="be-input"
                          value={b.safeguardTag || ''}
                          placeholder="e.g., PSV-104 / LOTO"
                          onChange={(e) => handleBarrierFieldChange(idx, 'safeguardTag', e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="be-field-label">Effectiveness Status</span>
                        <select
                          className="be-select"
                          value={b.status || 'Not Applicable'}
                          onChange={(e) => handleBarrierFieldChange(idx, 'status', e.target.value)}
                        >
                          {BARRIER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="be-field-label">Failure / Performance Note</span>
                        <input
                          type="text"
                          className="be-input"
                          value={b.failureReason || ''}
                          placeholder="Why did it fail, bypass, or succeed?"
                          onChange={(e) => handleBarrierFieldChange(idx, 'failureReason', e.target.value)}
                        />
                      </div>
                      <div style={{ alignSelf: 'end' }}>
                        <button
                          type="button"
                          className="be-btn-danger-sm"
                          title="Remove Barrier Row"
                          disabled={barriers.length <= 1}
                          onClick={() => handleRemoveBarrierRow(idx)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add custom barrier */}
                <div className="be-add-box">
                  <div>
                    <span className="be-field-label">Add Custom Barrier / LOPA Layer</span>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="e.g., 8. Gas Detection & Auto Deluge Interlock"
                      value={newBarrier.layerName}
                      onChange={(e) => setNewBarrier((p) => ({ ...p, layerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="be-field-label">Type</span>
                    <select
                      className="be-select"
                      value={newBarrier.barrierType}
                      onChange={(e) => setNewBarrier((p) => ({ ...p, barrierType: e.target.value }))}
                    >
                      <option value="Prevention">Prevention</option>
                      <option value="Mitigation">Mitigation</option>
                    </select>
                  </div>
                  <div>
                    <span className="be-field-label">Safeguard Tag</span>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="Tag / Procedure ID"
                      value={newBarrier.safeguardTag}
                      onChange={(e) => setNewBarrier((p) => ({ ...p, safeguardTag: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="be-field-label">Status</span>
                    <select
                      className="be-select"
                      value={newBarrier.status}
                      onChange={(e) => setNewBarrier((p) => ({ ...p, status: e.target.value }))}
                    >
                      {BARRIER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="be-btn-secondary" onClick={handleAddCustomBarrier}>
                    + Add Barrier
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SUPPORTING EVIDENCE VAULT */}
          {!loading && activeTab === 'evidence' && (
            <>
              <div className="be-section-card">
                <div className="be-progress-wrap">
                  <div className="be-progress-top">
                    <span>
                      Mandatory PSM Supporting Evidence Completion ({summary.evidence.uploadedCount} of {summary.evidence.applicableEvidence} applicable uploaded)
                    </span>
                    <span style={{ color: '#0284c7' }}>{summary.evidence.completionRate}%</span>
                  </div>
                  <div className="be-progress-track">
                    <div className="be-progress-fill" style={{ width: `${summary.evidence.completionRate}%` }} />
                  </div>
                </div>

                <div className="be-filter-row">
                  {['All', 'Pending', 'Uploaded / Attached', 'Not Applicable'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`be-filter-pill ${evidenceFilter === f ? 'active' : ''}`}
                      onClick={() => setEvidenceFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="be-evidence-grid">
                {filteredEvidence.map((item) => {
                  const statusClass =
                    item.status === 'Uploaded / Attached'
                      ? 'uploaded'
                      : item.status === 'Not Applicable'
                      ? 'na'
                      : 'pending';
                  return (
                    <div key={item._id} className={`be-evidence-card st-${statusClass}`}>
                      <div className="be-ev-top">
                        <div>
                          <span className="be-ev-cat">{item.category}</span>
                          <div className="be-ev-title">{item.title}</div>
                        </div>
                        <span className={`be-ev-status ${statusClass}`}>{item.status}</span>
                      </div>

                      {item.fileUrl && (
                        <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📎 {item.originalName || 'Attached File'}
                          </span>
                          <a
                            href={resolveFileHref(item.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="be-btn-secondary"
                          >
                            👁️ View / Download
                          </a>
                        </div>
                      )}

                      <div>
                        <input
                          type="text"
                          className="be-input"
                          placeholder="Evidence reference / DMS ID / remarks..."
                          value={noteDrafts[item._id] ?? item.notes ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [item._id]: e.target.value }))
                          }
                        />
                      </div>

                      <div className="be-ev-controls">
                        <label className="be-file-label">
                          {uploadingId === item._id ? 'Uploading...' : '⬆️ Upload File'}
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            disabled={uploadingId === item._id}
                            onChange={(e) => {
                              const file = e.target.files && e.target.files[0];
                              if (file) handleAttachFileToRow(item, file);
                              e.target.value = '';
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          className="be-btn-secondary"
                          disabled={uploadingId === item._id}
                          onClick={() => handleSaveEvidenceNotesOrToggleNA(item)}
                        >
                          💾 Save Note
                        </button>

                        {item.status !== 'Not Applicable' ? (
                          <button
                            type="button"
                            className="be-btn-secondary"
                            disabled={uploadingId === item._id}
                            onClick={() =>
                              handleSaveEvidenceNotesOrToggleNA(item, {
                                isApplicable: false,
                                status: 'Not Applicable'
                              })
                            }
                          >
                            Mark N/A
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="be-btn-secondary"
                            disabled={uploadingId === item._id}
                            onClick={() =>
                              handleSaveEvidenceNotesOrToggleNA(item, {
                                isApplicable: true,
                                status: item.fileUrl ? 'Uploaded / Attached' : 'Pending'
                              })
                            }
                          >
                            Mark Applicable
                          </button>
                        )}

                        {(item.fileUrl || item.checklistKey === 'custom') && (
                          <button
                            type="button"
                            className="be-btn-danger-sm"
                            disabled={uploadingId === item._id}
                            onClick={() => handleClearOrDeleteEvidence(item)}
                          >
                            {item.checklistKey === 'custom' ? '🗑️ Delete' : 'Clear File'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add custom evidence item */}
              <form className="be-section-card" onSubmit={handleAddCustomEvidence}>
                <div className="be-section-header">
                  <h3>+ Add Custom Supporting Evidence Document</h3>
                </div>
                <div className="be-add-box" style={{ gridTemplateColumns: '2fr 1.2fr 2fr 1.4fr auto' }}>
                  <div>
                    <span className="be-field-label">Document Title *</span>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="e.g., Metallurgical Lab Failure Report"
                      value={newEvidence.title}
                      onChange={(e) => setNewEvidence((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="be-field-label">Category</span>
                    <input
                      type="text"
                      className="be-input"
                      value={newEvidence.category}
                      onChange={(e) => setNewEvidence((p) => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="be-field-label">Reference / Notes</span>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="Summary or external URL"
                      value={newEvidence.notes}
                      onChange={(e) => setNewEvidence((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="be-field-label">Attach File (Optional)</span>
                    <input
                      type="file"
                      className="be-input"
                      onChange={(e) =>
                        setNewEvidence((p) => ({
                          ...p,
                          file: e.target.files && e.target.files[0] ? e.target.files[0] : null
                        }))
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="be-btn-primary"
                    disabled={uploadingId === 'custom-new'}
                  >
                    {uploadingId === 'custom-new' ? 'Adding...' : '+ Add Evidence'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* TAB 3: CLASSIFICATION VALIDATOR */}
          {!loading && activeTab === 'classification' && classContext && (
            <div className="be-class-grid">
              <div className="be-section-card">
                <div className="be-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Current API RP 754 Classification</h3>
                  <button
                    type="button"
                    className="be-btn-secondary"
                    onClick={() => setShowHelpModal(true)}
                    style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 700 }}
                  >
                    📘 View API RP 754 Criteria Guide
                  </button>
                </div>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: isPendingClassification ? '#f59e0b' : '#0284c7',
                    background: isPendingClassification ? '#fffbeb' : '#f0f9ff'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>
                    Assigned Tier / Category
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '4px', color: '#0f172a' }}>
                    {classContext.classification?.category || classContext.classification?.tier || 'Unclassified'}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: '4px', color: '#334155' }}>
                    {classContext.classification?.title}
                  </div>
                  {classContext.classification?.tier1SeverityPoints > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.82rem', fontWeight: 800, color: '#991b1b' }}>
                      Tier 1 Severity Points: {classContext.classification.tier1SeverityPoints}
                    </div>
                  )}
                </div>

                <div>
                  <span className="be-field-label">Engine Decision Rationale</span>
                  <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '0.82rem', lineHeight: 1.55 }}>
                    {(classContext.classification?.reasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <form className="be-section-card" onSubmit={handleRecalculateClassification}>
                <div className="be-section-header">
                  <div>
                    <h3>Update Verified Investigation Data & Re-evaluate</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                      Replace uncertain FIR estimates with verified engineering calculations, medical records, and cost assessments.
                    </div>
                  </div>
                </div>

                <div className="be-form-grid">
                  <div>
                    <span className="be-field-label">Was there an Actual Release / LOPC?</span>
                    <select
                      className="be-select"
                      value={classContext.isActualRelease || 'No'}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, isActualRelease: e.target.value }))
                      }
                    >
                      <option value="Yes">Yes (Actual LOPC)</option>
                      <option value="No">No (Near Miss / Safe-system challenge)</option>
                      <option value="Not sure">Not sure</option>
                    </select>
                  </div>

                  <div>
                    <span className="be-field-label">Chemical Threshold Release Category (TRC)</span>
                    <select
                      className="be-select"
                      value={classContext.chemicalTRC || 'N/A'}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, chemicalTRC: e.target.value }))
                      }
                    >
                      {TRC_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="be-field-label">Release Location</span>
                    <select
                      className="be-select"
                      value={classContext.releaseLocation || 'Outdoor'}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, releaseLocation: e.target.value }))
                      }
                    >
                      <option value="Outdoor">Outdoor</option>
                      <option value="Indoor">Indoor (Lower Tier 1/2 thresholds)</option>
                    </select>
                  </div>

                  <div>
                    <span className="be-field-label">Verified 1-Hour Release Quantity (kg)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="be-input"
                      disabled={Boolean(classContext.quantityUnknown)}
                      value={classContext.quantityInOneHourKg ?? 0}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, quantityInOneHourKg: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <span className="be-field-label">Direct Fire/Explosion Property Cost (USD)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="be-input"
                      disabled={Boolean(classContext.directCostPending)}
                      value={classContext.directCostUSD ?? 0}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, directCostUSD: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'end' }}>
                    <label className="be-check-row">
                      <input
                        type="checkbox"
                        checked={Boolean(classContext.quantityUnknown)}
                        onChange={(e) =>
                          setClassContext((p) => ({ ...p, quantityUnknown: e.target.checked }))
                        }
                      />
                      1-Hour Quantity Still Unknown
                    </label>
                  </div>

                  <label className="be-check-row">
                    <input
                      type="checkbox"
                      checked={Boolean(classContext.hasInjuriesPending)}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, hasInjuriesPending: e.target.checked }))
                      }
                    />
                    Medical / Injury Outcome Still Pending
                  </label>

                  <label className="be-check-row">
                    <input
                      type="checkbox"
                      checked={Boolean(classContext.directCostPending)}
                      onChange={(e) =>
                        setClassContext((p) => ({ ...p, directCostPending: e.target.checked }))
                      }
                    />
                    Fire / Explosion Cost Estimate Pending
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" className="be-btn-primary" disabled={recalcLoading}>
                    {recalcLoading ? 'Re-evaluating...' : '🔄 Re-evaluate API RP 754 Tier'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <Api754HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        incident={incident}
        initialTab={isPendingClassification ? 'pending' : 'tiers'}
      />
    </div>
  );
}
