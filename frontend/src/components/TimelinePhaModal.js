import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import './TimelinePhaModal.css';

const API_URL = getApiUrl();

const TIMELINE_PHASES = [
  'Pre-Incident',
  'Initiating Event',
  'Alarm / Intervention',
  'Release / Escalation',
  'Emergency Response',
  'Safe State'
];

const TIMELINE_SOURCES = [
  'DCS / Historian',
  'Field Observation',
  'SIS / ESD Log',
  'Witness Account',
  'CCTV / Manual'
];

const toLocalDatetimeInput = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDeltaT = (eventTime, baseTime) => {
  const t1 = new Date(eventTime).getTime();
  const t0 = new Date(baseTime).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t0)) return '';
  const diffMin = Math.round((t1 - t0) / 60000);
  if (diffMin === 0) return 'T0';
  return diffMin > 0 ? `+${diffMin} min` : `${diffMin} min`;
};

const getPhaseClass = (phase = '') => {
  if (phase.startsWith('Pre-Incident')) return 'tp-phase-Pre-Incident';
  if (phase.startsWith('Initiating')) return 'tp-phase-Initiating';
  if (phase.startsWith('Alarm')) return 'tp-phase-Alarm';
  if (phase.startsWith('Release')) return 'tp-phase-Release';
  if (phase.startsWith('Emergency')) return 'tp-phase-Emergency';
  if (phase.startsWith('Safe')) return 'tp-phase-Safe';
  return '';
};

const resolveFileHref = (url = '') => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
};

export default function TimelinePhaModal({ isOpen, onClose, incident, onUpdated }) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [timeline, setTimeline] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [studies, setStudies] = useState([]);
  const [bowTies, setBowTies] = useState([]);
  const [summary, setSummary] = useState({
    timelineCount: 0,
    criticalMilestones: 0,
    witnessCount: 0,
    verifiedWitnesses: 0,
    hasPhaLink: false,
    phaRevalidationRequired: false,
    revalidationStatus: 'Not Required'
  });

  // Timeline Form State
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    timestamp: '',
    phase: 'Initiating Event',
    source: 'DCS / Historian',
    title: '',
    actorOrSystem: '',
    description: '',
    isCriticalMilestone: false
  });

  // Witness Form State
  const [editingWitnessId, setEditingWitnessId] = useState(null);
  const [witnessForm, setWitnessForm] = useState({
    witnessName: '',
    role: 'Panel / DCS Operator',
    department: 'Operations',
    shift: 'Shift A',
    locationAtEvent: '',
    interviewedBy: '',
    interviewDate: '',
    keyObservation: '',
    actionTakenByWitness: '',
    verificationStatus: 'Draft',
    attachmentUrl: '',
    attachmentName: ''
  });
  const [witnessFile, setWitnessFile] = useState(null);

  // PHA / BowTie Form State
  const [phaForm, setPhaForm] = useState({
    linkedStudyId: '',
    linkedBowTieId: '',
    scenarioIdentifiedInPha: false,
    invalidatedSafeguardTags: [],
    manualTagInput: '',
    phaRevalidationRequired: false,
    revalidationStatus: 'Not Required',
    revalidationNotes: ''
  });

  const getTokenHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const resetEventForm = useCallback((baseDate) => {
    setEditingEventId(null);
    setEventForm({
      timestamp: toLocalDatetimeInput(baseDate || new Date()),
      phase: 'Alarm / Intervention',
      source: 'DCS / Historian',
      title: '',
      actorOrSystem: '',
      description: '',
      isCriticalMilestone: false
    });
  }, []);

  const resetWitnessForm = useCallback(() => {
    setEditingWitnessId(null);
    setWitnessFile(null);
    setWitnessForm({
      witnessName: '',
      role: 'Panel / DCS Operator',
      department: 'Operations',
      shift: 'Shift A',
      locationAtEvent: '',
      interviewedBy: '',
      interviewDate: toLocalDatetimeInput(new Date()),
      keyObservation: '',
      actionTakenByWitness: '',
      verificationStatus: 'Draft',
      attachmentUrl: '',
      attachmentName: ''
    });
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!incident?._id) return;
    setLoading(true);
    try {
      const data = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/timeline-pha`, {
        headers: getTokenHeaders()
      });
      setTimeline(data.sequenceTimeline || []);
      setWitnesses(data.witnessStatements || []);
      setStudies(data.studies || []);
      setBowTies(data.bowTies || []);
      if (data.summary) setSummary(data.summary);

      const link = data.phaBowTieLink || {};
      setPhaForm({
        linkedStudyId: link.linkedStudyId ? String(link.linkedStudyId) : '',
        linkedBowTieId: link.linkedBowTieId ? String(link.linkedBowTieId) : '',
        scenarioIdentifiedInPha: Boolean(link.scenarioIdentifiedInPha),
        invalidatedSafeguardTags: Array.isArray(link.invalidatedSafeguardTags) ? link.invalidatedSafeguardTags : [],
        manualTagInput: '',
        phaRevalidationRequired: Boolean(link.phaRevalidationRequired),
        revalidationStatus: link.revalidationStatus || 'Not Required',
        revalidationNotes: link.revalidationNotes || ''
      });

      resetEventForm(data.incidentDateTime || incident.dateTime);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to load Stage 3D workspace.' });
    } finally {
      setLoading(false);
    }
  }, [incident?._id, incident?.dateTime, resetEventForm]);

  useEffect(() => {
    if (isOpen && incident?._id) {
      setToast(null);
      setActiveTab('timeline');
      resetWitnessForm();
      loadWorkspace();
    }
  }, [isOpen, incident?._id, loadWorkspace, resetWitnessForm]);

  if (!isOpen || !incident) return null;

  const baseAnchorTime = incident.dateTime || timeline[0]?.timestamp;

  // --- TIMELINE HANDLERS ---
  const handleSaveTimelineEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      setToast({ type: 'error', message: 'Please enter a timeline event title.' });
      return;
    }
    setSaving(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          eventId: editingEventId || undefined,
          ...eventForm
        })
      });
      setTimeline(res.sequenceTimeline || []);
      if (res.summary) setSummary(res.summary);
      setToast({
        type: 'success',
        message: editingEventId ? 'Timeline milestone updated.' : 'Timeline milestone added in chronological order.'
      });
      resetEventForm(incident.dateTime);
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save timeline event.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTimelineEvent = (ev) => {
    setEditingEventId(ev._id);
    setEventForm({
      timestamp: toLocalDatetimeInput(ev.timestamp),
      phase: ev.phase || 'Initiating Event',
      source: ev.source || 'Field Observation',
      title: ev.title || '',
      actorOrSystem: ev.actorOrSystem || '',
      description: ev.description || '',
      isCriticalMilestone: Boolean(ev.isCriticalMilestone)
    });
  };

  const handleDeleteTimelineEvent = async (eventId) => {
    setSaving(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/timeline/${eventId}`, {
        method: 'DELETE',
        headers: getTokenHeaders()
      });
      setTimeline(res.sequenceTimeline || []);
      if (res.summary) setSummary(res.summary);
      if (editingEventId === eventId) resetEventForm(incident.dateTime);
      setToast({ type: 'success', message: 'Timeline event removed.' });
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete timeline event.' });
    } finally {
      setSaving(false);
    }
  };

  // --- WITNESS HANDLERS ---
  const handleSaveWitness = async (e) => {
    e.preventDefault();
    if (!witnessForm.witnessName.trim() || !witnessForm.keyObservation.trim()) {
      setToast({ type: 'error', message: 'Witness Name and Key Observation are required.' });
      return;
    }
    setSaving(true);
    try {
      let attachmentUrl = witnessForm.attachmentUrl;
      let attachmentName = witnessForm.attachmentName;

      if (witnessFile) {
        const fd = new FormData();
        fd.append('file', witnessFile);
        const upRes = await fetch(`${API_URL}/api/incidents/${incident._id}/witnesses/upload`, {
          method: 'POST',
          headers: getTokenHeaders(),
          body: fd
        });
        const upData = await upRes.json().catch(() => ({}));
        if (!upRes.ok) {
          throw new Error(upData.error || `Witness file upload failed (${upRes.status})`);
        }
        attachmentUrl = upData.attachmentUrl;
        attachmentName = upData.attachmentName;
      }

      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/witnesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          witnessId: editingWitnessId || undefined,
          ...witnessForm,
          attachmentUrl,
          attachmentName
        })
      });
      setWitnesses(res.witnessStatements || []);
      if (res.summary) setSummary(res.summary);
      setToast({
        type: 'success',
        message: editingWitnessId ? 'Witness statement updated.' : 'Witness statement recorded.'
      });
      resetWitnessForm();
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save witness statement.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditWitness = (w) => {
    setEditingWitnessId(w._id);
    setWitnessFile(null);
    setWitnessForm({
      witnessName: w.witnessName || '',
      role: w.role || 'Operator',
      department: w.department || 'Operations',
      shift: w.shift || 'Shift A',
      locationAtEvent: w.locationAtEvent || '',
      interviewedBy: w.interviewedBy || '',
      interviewDate: toLocalDatetimeInput(w.interviewDate),
      keyObservation: w.keyObservation || '',
      actionTakenByWitness: w.actionTakenByWitness || '',
      verificationStatus: w.verificationStatus || 'Draft',
      attachmentUrl: w.attachmentUrl || '',
      attachmentName: w.attachmentName || ''
    });
  };

  const handleDeleteWitness = async (witnessId) => {
    setSaving(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/witnesses/${witnessId}`, {
        method: 'DELETE',
        headers: getTokenHeaders()
      });
      setWitnesses(res.witnessStatements || []);
      if (res.summary) setSummary(res.summary);
      if (editingWitnessId === witnessId) resetWitnessForm();
      setToast({ type: 'success', message: 'Witness statement deleted.' });
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete witness statement.' });
    } finally {
      setSaving(false);
    }
  };

  // --- PHA / BOWTIE HANDLERS ---
  const filteredBowTies = phaForm.linkedStudyId
    ? bowTies.filter((b) => String(b.studyId) === String(phaForm.linkedStudyId))
    : bowTies;

  const selectedBowTieObj = bowTies.find((b) => String(b._id) === String(phaForm.linkedBowTieId));

  const toggleSafeguardTag = (tag) => {
    setPhaForm((prev) => {
      const exists = prev.invalidatedSafeguardTags.includes(tag);
      return {
        ...prev,
        invalidatedSafeguardTags: exists
          ? prev.invalidatedSafeguardTags.filter((t) => t !== tag)
          : [...prev.invalidatedSafeguardTags, tag]
      };
    });
  };

  const handleAddManualTag = () => {
    const clean = phaForm.manualTagInput.trim();
    if (!clean) return;
    setPhaForm((prev) => ({
      ...prev,
      invalidatedSafeguardTags: prev.invalidatedSafeguardTags.includes(clean)
        ? prev.invalidatedSafeguardTags
        : [...prev.invalidatedSafeguardTags, clean],
      manualTagInput: ''
    }));
  };

  const handleSavePhaLink = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/pha-link`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getTokenHeaders()
        },
        body: JSON.stringify({
          linkedStudyId: phaForm.linkedStudyId || null,
          linkedBowTieId: phaForm.linkedBowTieId || null,
          scenarioIdentifiedInPha: phaForm.scenarioIdentifiedInPha,
          invalidatedSafeguardTags: phaForm.invalidatedSafeguardTags,
          phaRevalidationRequired: phaForm.phaRevalidationRequired,
          revalidationStatus: phaForm.revalidationStatus,
          revalidationNotes: phaForm.revalidationNotes
        })
      });
      if (res.summary) setSummary(res.summary);
      setToast({ type: 'success', message: 'PHA / HAZOP & BowTie Revalidation link saved.' });
      if (onUpdated) onUpdated();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save PHA / BowTie link.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tp-modal-overlay">
      <div className="tp-modal-container">
        {/* Header */}
        <div className="tp-header">
          <div className="tp-header-left">
            <span className="tp-eyebrow">Stage 3D — Sequence Timeline, Witness Interviews & PHA/BowTie Cross-Link</span>
            <h2 className="tp-title">
              {incident.incidentNumber} — {incident.title}
            </h2>
            <div className="tp-sub">
              Zone: {incident.plantZone} | Equipment: {incident.equipmentTag || 'N/A'} | T0:{' '}
              {incident.dateTime ? new Date(incident.dateTime).toLocaleString() : 'N/A'}
            </div>
          </div>
          <button type="button" className="tp-btn-close" onClick={onClose}>
            ✖ Close
          </button>
        </div>

        {/* Navigation & Summary KPIs */}
        <div className="tp-toolbar">
          <div className="tp-tabs">
            <button
              type="button"
              className={`tp-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              ⏱️ 1. SOE Timeline
              <span className="tp-tab-badge">{summary.timelineCount} Events</span>
            </button>
            <button
              type="button"
              className={`tp-tab-btn ${activeTab === 'witnesses' ? 'active' : ''}`}
              onClick={() => setActiveTab('witnesses')}
            >
              🗣️ 2. Witness Statements
              <span className="tp-tab-badge">
                {summary.verifiedWitnesses}/{summary.witnessCount} Verified
              </span>
            </button>
            <button
              type="button"
              className={`tp-tab-btn ${activeTab === 'pha' ? 'active' : ''}`}
              onClick={() => setActiveTab('pha')}
            >
              🕸️ 3. PHA / BowTie Revalidation Link
              <span className="tp-tab-badge">{summary.revalidationStatus}</span>
            </button>
          </div>

          <div className="tp-kpis">
            <div className="tp-kpi-chip">
              <span>Key Milestones:</span>
              <strong style={{ color: '#d97706' }}>{summary.criticalMilestones}</strong>
            </div>
            <div className="tp-kpi-chip">
              <span>Witnesses Logged:</span>
              <strong style={{ color: '#0284c7' }}>{summary.witnessCount}</strong>
            </div>
            <div className="tp-kpi-chip">
              <span>PHA Revalidation:</span>
              <strong style={{ color: summary.phaRevalidationRequired ? '#dc2626' : '#16a34a' }}>
                {summary.revalidationStatus}
              </strong>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`tp-toast ${toast.type}`}>
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

        <div className="tp-body">
          {loading ? <div className="tp-card">Loading Stage 3D Workspace...</div> : null}

          {/* TAB 1: SEQUENCE OF EVENTS TIMELINE */}
          {!loading && activeTab === 'timeline' && (
            <div className="tp-split-layout">
              <form className="tp-card" onSubmit={handleSaveTimelineEvent}>
                <h3>{editingEventId ? 'Edit SOE Milestone' : '+ Add Sequence-of-Events Milestone'}</h3>
                <div>
                  <span className="tp-label">Exact Event Timestamp *</span>
                  <input
                    type="datetime-local"
                    className="tp-input"
                    value={eventForm.timestamp}
                    onChange={(e) => setEventForm((p) => ({ ...p, timestamp: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="tp-label">Investigation Phase</span>
                  <select
                    className="tp-select"
                    value={eventForm.phase}
                    onChange={(e) => setEventForm((p) => ({ ...p, phase: e.target.value }))}
                  >
                    {TIMELINE_PHASES.map((ph) => (
                      <option key={ph} value={ph}>{ph}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="tp-label">Evidence Source</span>
                  <select
                    className="tp-select"
                    value={eventForm.source}
                    onChange={(e) => setEventForm((p) => ({ ...p, source: e.target.value }))}
                  >
                    {TIMELINE_SOURCES.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="tp-label">Milestone Headline *</span>
                  <input
                    type="text"
                    className="tp-input"
                    placeholder="e.g., High pressure alarm PAH-104 triggered in CCR"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="tp-label">System / Tag / Actor Involved</span>
                  <input
                    type="text"
                    className="tp-input"
                    placeholder="e.g., PAH-104 / Panel Operator"
                    value={eventForm.actorOrSystem}
                    onChange={(e) => setEventForm((p) => ({ ...p, actorOrSystem: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="tp-label">Technical Details / Reading</span>
                  <textarea
                    className="tp-textarea"
                    placeholder="Pressure reached 18.4 bar; operator initiated manual bypass..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <label className="tp-check-row">
                  <input
                    type="checkbox"
                    checked={eventForm.isCriticalMilestone}
                    onChange={(e) => setEventForm((p) => ({ ...p, isCriticalMilestone: e.target.checked }))}
                  />
                  Mark as Critical Investigation Milestone (★)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="tp-btn-primary" disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : editingEventId ? '💾 Update Milestone' : '+ Add to Timeline'}
                  </button>
                  {editingEventId && (
                    <button
                      type="button"
                      className="tp-btn-secondary"
                      onClick={() => resetEventForm(incident.dateTime)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="tp-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Chronological Sequence of Events ({timeline.length})</h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Auto-sorted by timestamp</span>
                </div>
                <div className="tp-timeline-track">
                  {timeline.map((ev) => (
                    <div
                      key={ev._id}
                      className={`tp-timeline-item ${getPhaseClass(ev.phase)} ${ev.isCriticalMilestone ? 'is-critical' : ''}`}
                    >
                      <span className="tp-timeline-dot" />
                      <div className="tp-item-top">
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                            {new Date(ev.timestamp).toLocaleString()}
                          </strong>
                          <span className="tp-badge">{formatDeltaT(ev.timestamp, baseAnchorTime)}</span>
                          <span className="tp-badge">{ev.phase}</span>
                          <span className="tp-badge">{ev.source}</span>
                          {ev.isCriticalMilestone && <span className="tp-badge critical">★ Key Milestone</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" className="tp-btn-secondary" onClick={() => handleEditTimelineEvent(ev)}>
                            ✏️ Edit
                          </button>
                          <button type="button" className="tp-btn-danger" onClick={() => handleDeleteTimelineEvent(ev._id)}>
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{ev.title}</div>
                      {ev.actorOrSystem && (
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#312e81' }}>
                          Actor / System: {ev.actorOrSystem}
                        </div>
                      )}
                      {ev.description && (
                        <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                          {ev.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WITNESS STATEMENTS */}
          {!loading && activeTab === 'witnesses' && (
            <div className="tp-split-layout">
              <form className="tp-card" onSubmit={handleSaveWitness}>
                <h3>{editingWitnessId ? 'Edit Witness Statement' : '+ Record Witness Interview'}</h3>
                <div>
                  <span className="tp-label">Witness Full Name *</span>
                  <input
                    type="text"
                    className="tp-input"
                    value={witnessForm.witnessName}
                    onChange={(e) => setWitnessForm((p) => ({ ...p, witnessName: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span className="tp-label">Role / Designation</span>
                    <input
                      type="text"
                      className="tp-input"
                      value={witnessForm.role}
                      onChange={(e) => setWitnessForm((p) => ({ ...p, role: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="tp-label">Shift</span>
                    <input
                      type="text"
                      className="tp-input"
                      value={witnessForm.shift}
                      onChange={(e) => setWitnessForm((p) => ({ ...p, shift: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span className="tp-label">Department</span>
                    <input
                      type="text"
                      className="tp-input"
                      value={witnessForm.department}
                      onChange={(e) => setWitnessForm((p) => ({ ...p, department: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="tp-label">Location at Event Time</span>
                    <input
                      type="text"
                      className="tp-input"
                      placeholder="e.g., CCR / Tank Farm"
                      value={witnessForm.locationAtEvent}
                      onChange={(e) => setWitnessForm((p) => ({ ...p, locationAtEvent: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <span className="tp-label">Key Observation (What they saw / heard / smelled) *</span>
                  <textarea
                    className="tp-textarea"
                    value={witnessForm.keyObservation}
                    onChange={(e) => setWitnessForm((p) => ({ ...p, keyObservation: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="tp-label">Immediate Action Taken by Witness</span>
                  <input
                    type="text"
                    className="tp-input"
                    value={witnessForm.actionTakenByWitness}
                    onChange={(e) => setWitnessForm((p) => ({ ...p, actionTakenByWitness: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span className="tp-label">Interviewed By</span>
                    <input
                      type="text"
                      className="tp-input"
                      value={witnessForm.interviewedBy}
                      onChange={(e) => setWitnessForm((p) => ({ ...p, interviewedBy: e.target.value }))}
                    />
                  </div>
                  <div>
                    <span className="tp-label">Verification Status</span>
                    <select
                      className="tp-select"
                      value={witnessForm.verificationStatus}
                      onChange={(e) => setWitnessForm((p) => ({ ...p, verificationStatus: e.target.value }))}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Verified / Signed">Verified / Signed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className="tp-label">Attach Signed Statement Scan (Optional PDF/Image)</span>
                  <input
                    type="file"
                    className="tp-input"
                    onChange={(e) =>
                      setWitnessFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)
                    }
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="tp-btn-primary" disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : editingWitnessId ? '💾 Update Statement' : '+ Save Witness Statement'}
                  </button>
                  {editingWitnessId && (
                    <button type="button" className="tp-btn-secondary" onClick={resetWitnessForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="tp-card">
                <h3>Recorded Witness Statements ({witnesses.length})</h3>
                {witnesses.length === 0 ? (
                  <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                    No witness statements logged yet. Record interviews with panel operators, field technicians, or contractors on duty.
                  </div>
                ) : (
                  <div className="tp-witness-grid">
                    {witnesses.map((w) => (
                      <div
                        key={w._id}
                        className={`tp-witness-card ${w.verificationStatus === 'Verified / Signed' ? 'verified' : ''}`}
                      >
                        <div className="tp-item-top">
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>{w.witnessName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                              {w.role} • {w.department} • {w.shift}
                            </div>
                          </div>
                          <span className={`tp-badge ${w.verificationStatus === 'Verified / Signed' ? 'verified' : 'draft'}`}>
                            {w.verificationStatus}
                          </span>
                        </div>
                        {w.locationAtEvent && (
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#312e81' }}>
                            Location: {w.locationAtEvent}
                          </div>
                        )}
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          "{w.keyObservation}"
                        </div>
                        {w.actionTakenByWitness && (
                          <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                            <strong>Action Taken:</strong> {w.actionTakenByWitness}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Interviewer: {w.interviewedBy || 'CFT'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {w.attachmentUrl && (
                              <a
                                href={resolveFileHref(w.attachmentUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="tp-btn-secondary"
                              >
                                📎 {w.attachmentName || 'Signed Doc'}
                              </a>
                            )}
                            <button type="button" className="tp-btn-secondary" onClick={() => handleEditWitness(w)}>
                              ✏️ Edit
                            </button>
                            <button type="button" className="tp-btn-danger" onClick={() => handleDeleteWitness(w._id)}>
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHA / BOWTIE REVALIDATION LINK */}
          {!loading && activeTab === 'pha' && (
            <form className="tp-card" onSubmit={handleSavePhaLink}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3>PHA / HAZOP & BowTie Risk Register Cross-Link</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Verify whether this event scenario existed in prior PHA/BowTie studies and flag safeguards that failed or require PHA revalidation.
                  </div>
                </div>
                <button type="submit" className="tp-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save PHA / BowTie Link'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span className="tp-label">Linked PHA Study (HAZOP / LOPA / What-If)</span>
                  <select
                    className="tp-select"
                    value={phaForm.linkedStudyId}
                    onChange={(e) =>
                      setPhaForm((p) => ({
                        ...p,
                        linkedStudyId: e.target.value,
                        linkedBowTieId: ''
                      }))
                    }
                  >
                    <option value="">— Select Existing Study —</option>
                    {studies.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.studyName} ({s.phaType} — {s.plantUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="tp-label">Linked BowTie Top Event</span>
                  <select
                    className="tp-select"
                    value={phaForm.linkedBowTieId}
                    onChange={(e) => setPhaForm((p) => ({ ...p, linkedBowTieId: e.target.value }))}
                  >
                    <option value="">— Select BowTie Scenario —</option>
                    {filteredBowTies.map((bt) => (
                      <option key={bt._id} value={bt._id}>
                        {bt.eventName} ({bt.barrierCount} barriers{bt.section ? ` — ${bt.section}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label className="tp-check-row">
                  <input
                    type="checkbox"
                    checked={phaForm.scenarioIdentifiedInPha}
                    onChange={(e) =>
                      setPhaForm((p) => ({ ...p, scenarioIdentifiedInPha: e.target.checked }))
                    }
                  />
                  This failure scenario WAS previously identified in the linked PHA / BowTie
                </label>

                <label className="tp-check-row" style={{ borderColor: phaForm.phaRevalidationRequired ? '#ef4444' : '#e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={phaForm.phaRevalidationRequired}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPhaForm((p) => ({
                        ...p,
                        phaRevalidationRequired: checked,
                        revalidationStatus:
                          checked && p.revalidationStatus === 'Not Required'
                            ? 'Pending Revalidation'
                            : !checked
                            ? 'Not Required'
                            : p.revalidationStatus
                      }));
                    }}
                  />
                  PHA / HAZOP Revalidation Required due to failed safeguards or unforeseen scenario
                </label>
              </div>

              {selectedBowTieObj && selectedBowTieObj.safeguardTags?.length > 0 && (
                <div>
                  <span className="tp-label">Click BowTie Safeguard Tags Invalidated / Challenged by this Event:</span>
                  <div className="tp-chip-list">
                    {selectedBowTieObj.safeguardTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`tp-tag-chip ${phaForm.invalidatedSafeguardTags.includes(tag) ? 'selected' : ''}`}
                        onClick={() => toggleSafeguardTag(tag)}
                      >
                        {phaForm.invalidatedSafeguardTags.includes(tag) ? '✖ ' : '+ '}
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="tp-label">Invalidated / Challenged Safeguard Tags</span>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="tp-input"
                    placeholder="Add safeguard / IPL tag (e.g., PSV-104, SIS-201)"
                    value={phaForm.manualTagInput}
                    onChange={(e) => setPhaForm((p) => ({ ...p, manualTagInput: e.target.value }))}
                  />
                  <button type="button" className="tp-btn-secondary" onClick={handleAddManualTag}>
                    + Add Tag
                  </button>
                </div>
                <div className="tp-chip-list">
                  {phaForm.invalidatedSafeguardTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="tp-tag-chip selected"
                      onClick={() => toggleSafeguardTag(tag)}
                      title="Click to remove"
                    >
                      {tag} ✖
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '14px' }}>
                <div>
                  <span className="tp-label">Revalidation Tracking Status</span>
                  <select
                    className="tp-select"
                    value={phaForm.revalidationStatus}
                    onChange={(e) => setPhaForm((p) => ({ ...p, revalidationStatus: e.target.value }))}
                  >
                    <option value="Not Required">Not Required</option>
                    <option value="Pending Revalidation">Pending Revalidation</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <span className="tp-label">PHA Revalidation Justification / Engineering Notes</span>
                  <textarea
                    className="tp-textarea"
                    placeholder="Document HAZOP node deviation update, SIL/PFD recalculation, or new BowTie threat branch needed..."
                    value={phaForm.revalidationNotes}
                    onChange={(e) => setPhaForm((p) => ({ ...p, revalidationNotes: e.target.value }))}
                  />
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
