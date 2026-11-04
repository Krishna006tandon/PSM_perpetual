import React, { useState } from 'react';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';

const API_URL = getApiUrl();

const COMMON_DEPTS = [
  'Safety & EHS',
  'Operations',
  'Mechanical Maintenance',
  'Electrical & Instrumentation',
  'Process Engineering',
  'Technical Services',
  'Quality Assurance / Lab'
];

export default function ManagerTriageModal({ isOpen, onClose, incident, onTriageSaved, currentUser }) {
  const [activeTab, setActiveTab] = useState('declaration'); // 'declaration', 'cft'
  const [decision, setDecision] = useState('Formal Investigation Mandated');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Section K Reviewer Declaration
  const [reviewerName, setReviewerName] = useState(currentUser?.name || 'Plant Manager / HSE Head');
  const [reviewerRole, setReviewerRole] = useState(currentUser?.role || 'Process Safety / HSE Reviewer');
  const [reviewerEmail, setReviewerEmail] = useState(currentUser?.email || '');
  const [isDeclarationConfirmed, setIsDeclarationConfirmed] = useState(true);

  // Cross-Functional Team (CFT) state
  const [leader, setLeader] = useState({
    name: incident?.cft?.leader?.name || '',
    designation: incident?.cft?.leader?.designation || 'EHS Lead Investigator',
    email: incident?.cft?.leader?.email || '',
    department: incident?.cft?.leader?.department || 'Safety & EHS'
  });

  const [members, setMembers] = useState(
    incident?.cft?.members && incident.cft.members.length > 0
      ? incident.cft.members
      : [
          { name: '', designation: 'Operations Specialist', department: 'Operations', email: '', role: 'Investigator' },
          { name: '', designation: 'Maintenance Lead', department: 'Mechanical Maintenance', email: '', role: 'Technical Specialist' }
        ]
  );

  if (!isOpen || !incident) return null;

  const handleAddMember = () => {
    setMembers([
      ...members,
      { name: '', designation: 'Team Member', department: 'Operations', email: '', role: 'Investigator' }
    ]);
  };

  const handleRemoveMember = (idx) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx, field, value) => {
    const updated = [...members];
    updated[idx][field] = value;
    setMembers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isDeclarationConfirmed) {
      setError('Please review and confirm the Section K Reviewer Declaration statement.');
      setActiveTab('declaration');
      return;
    }

    if (decision === 'Formal Investigation Mandated' && !leader.name.trim()) {
      setError('Please designate a Cross-Functional Team Leader / Chairman.');
      setActiveTab('cft');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        decision,
        comments,
        reviewerName,
        reviewerEmail,
        reviewerDeclaration: {
          reviewedBy: reviewerName,
          reviewerEmail,
          reviewerRole,
          reviewedDate: new Date(),
          isConfirmed: isDeclarationConfirmed,
          statement: 'I have reviewed the information provided in this First Incident Report and assessed the event against the applicable API RP 754 criteria. The above classification represents the initial assessment based on the information currently available. The classification shall be reconfirmed following detailed incident investigation and validation of the actual consequences, release quantity, applicable threshold and supporting evidence.'
        },
        cft: decision === 'Formal Investigation Mandated' ? {
          leader,
          members: members.filter(m => m.name.trim() !== '')
        } : null
      };

      const updatedIncident = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/triage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      setLoading(false);
      onTriageSaved(updatedIncident);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const isOverdue = incident.isSlaOverdue;
  const daysLeft = incident.slaDaysRemaining !== undefined ? incident.slaDaysRemaining : 7;
  const classification = incident.api754Classification || {};
  const currentCategory = classification.category || classification.tier || 'Near Miss';

  // Badge styles
  const getBadgeStyle = (cat) => {
    if (cat === 'Tier 1 PSE' || cat === 'Tier 1') return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
    if (cat === 'Tier 2 PSE' || cat === 'Tier 2') return { bg: '#ffedd5', text: '#9a3412', border: '#f97316' };
    if (cat === 'Tier 3 Indicator' || cat === 'Tier 3') return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    if (cat === 'Tier 4 Indicator' || cat === 'Tier 4') return { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6' };
    if (cat === 'Pending Classification' || cat?.includes('Pending')) return { bg: '#fef9c3', text: '#854d0e', border: '#ca8a04' };
    return { bg: '#e0f2fe', text: '#075985', border: '#0284c7' };
  };

  const badgeStyle = getBadgeStyle(currentCategory);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-paper, #ffffff)',
        color: 'var(--text-primary, #0f172a)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--divider, #cbd5e1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--divider, #cbd5e1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(30,58,138,0.08), rgba(37,99,235,0.03))'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>⚖️</span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                Stage 3 – Manager Review & Section K Declaration
              </h2>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
              API RP 754 Reviewer Verification & Cross-Functional Team Formation (Module 3: 7-Day SLA)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.6rem',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}
          >
            ×
          </button>
        </div>

        {/* 7-Day SLA Countdown Banner */}
        <div style={{
          padding: '10px 24px',
          background: isOverdue ? '#fee2e2' : '#f0fdf4',
          borderBottom: isOverdue ? '2px solid #ef4444' : '2px solid #22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            <div>
              <strong style={{ fontSize: '0.86rem', color: isOverdue ? '#991b1b' : '#166534' }}>
                {isOverdue ? '7-Day SLA BREACHED' : `7-Day SLA Active: ${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining`}
              </strong>
              <div style={{ fontSize: '0.76rem', color: isOverdue ? '#b91c1c' : '#15803d' }}>
                Submitted: {new Date(incident.submittedAt || incident.createdAt).toLocaleDateString()} | Deadline: {new Date(incident.managerReviewDeadline).toLocaleDateString()}
              </div>
            </div>
          </div>
          <span style={{
            background: badgeStyle.border,
            color: '#ffffff',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            {currentCategory}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--divider, #cbd5e1)',
          background: 'var(--bg-default, #f8fafc)',
          padding: '0 16px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('declaration')}
            style={{
              padding: '11px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'declaration' ? '2px solid var(--primary-main, #1e3a8a)' : '2px solid transparent',
              color: activeTab === 'declaration' ? 'var(--primary-main, #1e3a8a)' : 'var(--text-secondary, #64748b)',
              fontWeight: activeTab === 'declaration' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            1. Section K Initial Declaration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cft')}
            style={{
              padding: '11px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'cft' ? '2px solid var(--primary-main, #1e3a8a)' : '2px solid transparent',
              color: activeTab === 'cft' ? 'var(--primary-main, #1e3a8a)' : 'var(--text-secondary, #64748b)',
              fontWeight: activeTab === 'cft' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            2. Triage Decision & CFT Committee
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '10px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.86rem',
              fontWeight: '600'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: SECTION K DECLARATION */}
          {activeTab === 'declaration' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Event Facts Snapshot */}
              <div style={{
                background: 'var(--bg-default)',
                borderRadius: '10px',
                padding: '14px 16px',
                border: '1px solid var(--divider)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--primary-main)' }}>
                    {incident.incidentNumber}: {incident.title}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Zone: <strong>{incident.plantZone}</strong> ({incident.shift})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '0.8rem', marginTop: '10px' }}>
                  <div style={{ background: 'var(--bg-paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>LOPC Release</div>
                    <strong>{incident.isLOPC ? 'Yes' : 'No'}</strong> ({incident.materialDetails?.chemicalTRC || 'N/A'})
                  </div>
                  <div style={{ background: 'var(--bg-paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>1-Hr Quantity</div>
                    <strong>{incident.materialDetails?.quantityInOneHourKg || incident.releaseQuantityKg || 0} kg</strong>
                  </div>
                  <div style={{ background: 'var(--bg-paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Direct Damage</div>
                    <strong>${Number(incident.fireExplosionDetails?.directCostUSD || incident.directCostUSD || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--divider)' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Injuries Logged</div>
                    <strong>{incident.injuredPersons?.length || 0} persons</strong>
                  </div>
                </div>

                {classification.reasons && classification.reasons.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#334155' }}>
                    <strong>Classification Rationale:</strong> {classification.reasons.join(' • ')}
                  </div>
                )}
              </div>

              {/* Section K Reviewer Credentials */}
              <div style={{
                background: 'var(--bg-default)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid var(--divider)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                    Reviewed By (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                    Reviewer Role / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '4px' }}>
                    Reviewer Email
                  </label>
                  <input
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Formal Reviewer Declaration Statement */}
              <div style={{
                background: '#f8fafc',
                border: '2px solid #cbd5e1',
                borderRadius: '10px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📜</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Section K – Initial Incident Declaration Statement
                  </strong>
                </div>

                <blockquote style={{
                  margin: '0 0 12px 0',
                  padding: '10px 14px',
                  background: 'var(--bg-paper)',
                  borderLeft: '4px solid var(--primary-main)',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  fontStyle: 'italic'
                }}>
                  "I have reviewed the information provided in this First Incident Report and assessed the event against the applicable API RP 754 criteria. The above classification represents the initial assessment based on the information currently available. The classification shall be reconfirmed following detailed incident investigation and validation of the actual consequences, release quantity, applicable threshold and supporting evidence."
                </blockquote>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  color: isDeclarationConfirmed ? 'var(--primary-main)' : '#991b1b'
                }}>
                  <input
                    type="checkbox"
                    checked={isDeclarationConfirmed}
                    onChange={(e) => setIsDeclarationConfirmed(e.target.checked)}
                  />
                  <span>I confirm and endorse the above initial API RP 754 declaration for {incident.incidentNumber}.</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('cft')}
                  style={{
                    background: 'var(--primary-main)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Proceed to Triage Decision & CFT Committee →
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TRIAGE DECISION & CFT */}
          {activeTab === 'cft' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Triage Decision Options */}
              <div>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '800', marginBottom: '8px' }}>
                  Manager Triage Decision *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div
                    onClick={() => setDecision('Formal Investigation Mandated')}
                    style={{
                      border: decision === 'Formal Investigation Mandated' ? '2px solid var(--primary-main)' : '1px solid var(--divider)',
                      background: decision === 'Formal Investigation Mandated' ? 'rgba(30,58,138,0.04)' : 'var(--bg-default)',
                      padding: '14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <input
                        type="radio"
                        name="triageDecision"
                        checked={decision === 'Formal Investigation Mandated'}
                        onChange={() => setDecision('Formal Investigation Mandated')}
                      />
                      <strong style={{ fontSize: '0.88rem' }}>Mandate Formal Investigation</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Form a multidisciplinary Cross-Functional Team (CFT) and launch Why-Why Root Cause Analysis.
                    </p>
                  </div>

                  <div
                    onClick={() => setDecision('Administratively Closed')}
                    style={{
                      border: decision === 'Administratively Closed' ? '2px solid #64748b' : '1px solid var(--divider)',
                      background: decision === 'Administratively Closed' ? '#f1f5f9' : 'var(--bg-default)',
                      padding: '14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <input
                        type="radio"
                        name="triageDecision"
                        checked={decision === 'Administratively Closed'}
                        onChange={() => setDecision('Administratively Closed')}
                      />
                      <strong style={{ fontSize: '0.88rem' }}>Administratively Close Incident</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      No further formal investigation required (e.g. minor non-process event, duplicate report).
                    </p>
                  </div>
                </div>
              </div>

              {/* Rationale / Remarks */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px' }}>
                  Manager Remarks & Instructions:
                </label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide investigation guidelines, focal areas for CFT, or rationale for administrative closure..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--divider)', fontSize: '0.82rem', fontFamily: 'inherit' }}
                />
              </div>

              {/* Cross-Functional Team (CFT) Formation */}
              {decision === 'Formal Investigation Mandated' && (
                <div style={{
                  background: 'var(--bg-default)',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid var(--divider)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800' }}>
                        Cross-Functional Team (CFT) Formation
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Mandatory multidisciplinary representation as per OSHA 1910.119(m) & API RP 754
                      </p>
                    </div>
                  </div>

                  {/* Leader */}
                  <div style={{
                    background: 'var(--bg-paper)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--divider)',
                    marginBottom: '14px'
                  }}>
                    <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '6px', color: 'var(--primary-main)' }}>
                      CFT Leader / Chairman *
                    </strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Leader Name *"
                        required={decision === 'Formal Investigation Mandated'}
                        value={leader.name}
                        onChange={(e) => setLeader({ ...leader, name: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Designation"
                        value={leader.designation}
                        onChange={(e) => setLeader({ ...leader, designation: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                      />
                      <select
                        value={leader.department}
                        onChange={(e) => setLeader({ ...leader, department: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                      >
                        {COMMON_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input
                        type="email"
                        placeholder="Leader Email"
                        value={leader.email}
                        onChange={(e) => setLeader({ ...leader, email: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                        Committee Members ({members.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-main)',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Member
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {members.map((m, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 2fr 2fr 1fr 40px',
                          gap: '8px',
                          alignItems: 'center'
                        }}>
                          <input
                            type="text"
                            placeholder="Member Name"
                            value={m.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Designation"
                            value={m.designation}
                            onChange={(e) => handleMemberChange(idx, 'designation', e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                          />
                          <select
                            value={m.department}
                            onChange={(e) => handleMemberChange(idx, 'department', e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                          >
                            {COMMON_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <input
                            type="text"
                            placeholder="Role"
                            value={m.role}
                            onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.8rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '800' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--divider, #cbd5e1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-default, #f8fafc)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-paper)',
              border: '1px solid var(--divider)',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 24px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '0.86rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            {loading ? 'Submitting Triage...' : 'Sign Section K & Complete Triage →'}
          </button>
        </div>
      </div>
    </div>
  );
}
