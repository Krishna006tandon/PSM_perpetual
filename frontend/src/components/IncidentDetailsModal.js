import React from 'react';

export default function IncidentDetailsModal({ isOpen, onClose, incident, onOpenTriage }) {
  if (!isOpen || !incident) return null;

  const classification = incident.api754Classification || {};
  const currentCategory = classification.category || classification.tier || 'Near Miss';

  const getTierColor = (cat) => {
    switch (cat) {
      case 'Tier 1 PSE':
      case 'Tier 1':
        return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      case 'Tier 2 PSE':
      case 'Tier 2':
        return { bg: '#ffedd5', text: '#9a3412', border: '#f97316' };
      case 'Tier 3 Indicator':
      case 'Tier 3':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      case 'Tier 4 Indicator':
      case 'Tier 4':
        return { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6' };
      case 'Pending Classification':
        return { bg: '#fef9c3', text: '#854d0e', border: '#ca8a04' };
      case 'Other Incident':
        return { bg: '#f1f5f9', text: '#334155', border: '#94a3b8' };
      default:
        return { bg: '#e0f2fe', text: '#075985', border: '#0284c7' };
    }
  };

  const tierColors = getTierColor(currentCategory);
  const material = incident.materialDetails || {};
  const fire = incident.fireExplosionDetails || {};
  const emergency = incident.emergencyMeasures || {};
  const barriers = incident.barrierPerformance || {};
  const nearMiss = incident.nearMissAssessment || {};
  const reviewer = incident.reviewerDeclaration || {};

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
        maxWidth: '920px',
        maxHeight: '94vh',
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
          background: 'var(--bg-default, #f8fafc)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: tierColors.border,
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: '800'
              }}>
                {currentCategory}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                {incident.incidentNumber}: {incident.title}
              </h2>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Logged on {new Date(incident.dateTime).toLocaleString()} | Unit/Zone: <strong>{incident.plantZone}</strong> ({incident.shift})
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.6rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Status, SLA & Asset Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            background: 'var(--bg-default)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--divider)'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Lifecycle Status
              </span>
              <div style={{ fontWeight: '800', fontSize: '0.95rem', marginTop: '2px', color: 'var(--primary-main)' }}>
                {incident.status}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                7-Day SLA Governance
              </span>
              <div style={{ fontWeight: '700', fontSize: '0.88rem', marginTop: '2px', color: incident.isSlaOverdue ? '#ef4444' : '#16a34a' }}>
                {incident.triage?.status !== 'Pending' ? (
                  `Triage Completed (${incident.triage?.status})`
                ) : (
                  incident.isSlaOverdue ? '⚠️ Overdue (Breached)' : `${incident.slaDaysRemaining} Days Left`
                )}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Equipment Tag & Unit Status
              </span>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', marginTop: '2px' }}>
                {incident.equipmentTag || 'N/A'} ({incident.unitOperatingStatus || 'Normal'})
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                Facility & Reporter
              </span>
              <div style={{ fontWeight: '600', fontSize: '0.82rem', marginTop: '2px' }}>
                {incident.facilityName || incident.facilityType} / {incident.reporter?.name}
              </div>
            </div>
          </div>

          {/* Section B - Nature of Event Badges */}
          {incident.natureOfEvents && incident.natureOfEvents.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '800' }}>
                Section B – Nature of Event Checkmarks
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {incident.natureOfEvents.map((ev, i) => (
                  <span key={i} style={{
                    background: 'rgba(30, 58, 138, 0.08)',
                    color: 'var(--primary-main)',
                    border: '1px solid rgba(30, 58, 138, 0.2)',
                    padding: '3px 9px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: '600'
                  }}>
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description Matrix */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '800' }}>
              Incident Description Matrix
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-light)' }}>1. What Happened</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: '1.4' }}>
                  {incident.descriptionMatrix?.whatHappened || 'None'}
                </p>
              </div>
              <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-light)' }}>2. What Was Observed</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: '1.4' }}>
                  {incident.descriptionMatrix?.whatWasObserved || 'None'}
                </p>
              </div>
              <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-light)' }}>3. What Could Have Happened</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', lineHeight: '1.4' }}>
                  {incident.descriptionMatrix?.whatCouldHaveHappened || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Immediate Action */}
          {incident.immediateActionsTaken && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px' }}>
              <strong style={{ fontSize: '0.82rem', color: '#166534' }}>Immediate Actions Taken:</strong>
              <div style={{ fontSize: '0.82rem', color: '#14532d', marginTop: '2px' }}>
                {incident.immediateActionsTaken}
              </div>
            </div>
          )}

          {/* API 754 Classification Breakdown */}
          <div style={{
            background: tierColors.bg,
            border: `1px solid ${tierColors.border}`,
            padding: '16px',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: tierColors.text }}>
                ANSI/API RP 754 Classification & Rationale
              </h4>
              {classification.tier1SeverityPoints > 0 && (
                <span style={{ background: '#ffffff', color: '#991b1b', border: '1px solid #ef4444', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                  Annex D Severity: {classification.tier1SeverityPoints} pts
                </span>
              )}
            </div>

            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: tierColors.text }}>
              {classification.reasons?.map((reason, i) => (
                <li key={i} style={{ marginBottom: '3px' }}>{reason}</li>
              ))}
            </ul>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px', fontSize: '0.78rem' }}>
              <div><strong>Material:</strong> {material.chemicalName || incident.materialName || 'N/A'} ({material.chemicalTRC || incident.chemicalTRC || 'N/A'})</div>
              <div><strong>1-Hr Release:</strong> {material.quantityInOneHourKg || incident.releaseQuantityKg || 0} kg ({material.releaseLocation || 'Outdoor'})</div>
              <div><strong>Direct Cost:</strong> ${Number(fire.directCostUSD || incident.directCostUSD || 0).toLocaleString()}</div>
              <div><strong>Evac / Shelter:</strong> {emergency.communityEvacuation || emergency.onSiteEvacuation ? (emergency.officiallyDeclared ? 'Declared (Official)' : 'Yes') : 'None'}</div>
            </div>
          </div>

          {/* Section G - Barrier Performance (If recorded) */}
          {(barriers.prdOperated || barriers.sisActivated || barriers.solExceeded || barriers.equipmentTag) && (
            <div style={{ background: 'var(--bg-default)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--divider)' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: '800' }}>
                Section G – Barrier & Safety System Performance
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                <div><strong>Equipment Tag:</strong> {barriers.equipmentTag || 'N/A'}</div>
                <div><strong>Setpoint vs Actual:</strong> {barriers.setPoint || 'N/A'} / {barriers.actualValue || 'N/A'}</div>
                <div><strong>Performed as Intended:</strong> {barriers.performedAsIntended ? '✅ Yes' : '❌ No (Failed)'}</div>
              </div>
            </div>
          )}

          {/* Section H - Near-Miss Assessment (If recorded) */}
          {nearMiss.credibleWorstCaseConsequence && (
            <div style={{ background: 'var(--bg-default)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--divider)' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: '800' }}>
                Section H – Near-Miss Potential & Safeguards
              </h4>
              <div style={{ fontSize: '0.8rem' }}>
                <div><strong>Preventing Safeguard:</strong> {nearMiss.safeguardThatPrevented || 'Safety System'}</div>
                <div style={{ marginTop: '4px' }}><strong>Credible Worst-Case:</strong> {nearMiss.credibleWorstCaseConsequence}</div>
              </div>
            </div>
          )}

          {/* Section K - Reviewer Declaration Box */}
          <div style={{
            background: reviewer.isConfirmed ? '#f0fdf4' : '#fffbeb',
            border: reviewer.isConfirmed ? '1px solid #86efac' : '1px solid #fde68a',
            borderRadius: '10px',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{reviewer.isConfirmed ? '✅' : '⏳'}</span>
                <strong style={{ fontSize: '0.86rem', color: reviewer.isConfirmed ? '#166534' : '#92400e' }}>
                  Section K – Initial Reviewer Declaration {reviewer.isConfirmed ? '(Signed & Verified)' : '(Pending Verification)'}
                </strong>
              </div>

              {!reviewer.isConfirmed && onOpenTriage && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenTriage(incident); }}
                  style={{
                    background: 'var(--primary-main)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Conduct Review & Sign Declaration
                </button>
              )}
            </div>

            {reviewer.isConfirmed ? (
              <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                <div>Reviewed by <strong>{reviewer.reviewedBy}</strong> ({reviewer.reviewerRole}) on {new Date(reviewer.reviewedDate).toLocaleDateString()}</div>
                <p style={{ margin: '6px 0 0 0', fontStyle: 'italic', fontSize: '0.78rem', opacity: 0.9 }}>
                  "{reviewer.statement}"
                </p>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                This incident requires formal sign-off by the Process Safety / HSE reviewer under API RP 754 Section K.
              </div>
            )}
          </div>

          {/* Cross-Functional Team (CFT) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800' }}>
                Investigation Committee & CFT
              </h4>
            </div>
            {incident.cft?.leader?.name ? (
              <div style={{ background: 'var(--bg-default)', padding: '12px', borderRadius: '8px', border: '1px solid var(--divider)' }}>
                <div style={{ marginBottom: '8px', fontSize: '0.84rem' }}>
                  <strong>Lead Investigator:</strong> {incident.cft.leader.name} ({incident.cft.leader.designation} - {incident.cft.leader.department})
                </div>
                {incident.cft.members && incident.cft.members.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '0.8rem' }}>Team Members:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {incident.cft.members.map((m, idx) => (
                        <span key={idx} style={{
                          background: 'var(--bg-paper)',
                          border: '1px solid var(--divider)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem'
                        }}>
                          {m.name} ({m.department} - {m.role})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No CFT committee assigned yet. Awaiting manager triage review.
              </div>
            )}
          </div>

          {/* Immutable Audit Trail */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '800' }}>
              Immutable Audit Trail (Module 10)
            </h4>
            <div style={{
              background: 'var(--bg-default)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--divider)',
              fontSize: '0.78rem',
              maxHeight: '140px',
              overflowY: 'auto'
            }}>
              {incident.auditTrail?.map((trail, i) => (
                <div key={i} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                    <span>{trail.action} by {trail.actor}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{new Date(trail.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{trail.details}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--divider, #cbd5e1)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-default)'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--primary-main, #1e3a8a)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 22px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
