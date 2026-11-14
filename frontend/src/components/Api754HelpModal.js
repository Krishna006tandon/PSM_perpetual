import React, { useState, useEffect } from 'react';
import './Api754HelpModal.css';

const TRC_REFERENCE = [
  {
    trc: 'TRC 1',
    name: 'Toxic Inhalation Hazard (TIH) Zone A',
    examples: 'Chlorine, Phosgene, Hydrocyanic Acid, Methyl Isocyanate',
    t1Outdoor: '5 kg (11 lbs)',
    t1Indoor: '2.5 kg (5.5 lbs)',
    t2Outdoor: '0.5 kg (1.1 lbs)',
    t2Indoor: '0.25 kg (0.55 lbs)',
    hazard: 'Extreme toxicity upon inhalation; lethal at very low concentrations.'
  },
  {
    trc: 'TRC 2',
    name: 'TIH Zone B',
    examples: 'Anhydrous Ammonia, Chlorine Dioxide, Sulfur Dioxide, Methyl Mercaptan',
    t1Outdoor: '25 kg (55 lbs)',
    t1Indoor: '12.5 kg (27.5 lbs)',
    t2Outdoor: '2.5 kg (5.5 lbs)',
    t2Indoor: '1.25 kg (2.75 lbs)',
    hazard: 'High toxicity upon inhalation; severe respiratory irritation.'
  },
  {
    trc: 'TRC 3',
    name: 'TIH Zone C',
    examples: 'Hydrogen Fluoride (HF), Hydrogen Sulfide (H2S), Carbon Monoxide, Phosphine',
    t1Outdoor: '100 kg (220 lbs)',
    t1Indoor: '50 kg (110 lbs)',
    t2Outdoor: '10 kg (22 lbs)',
    t2Indoor: '5 kg (11 lbs)',
    hazard: 'Toxic inhalation hazard; rapidly incapacitating or poisonous.'
  },
  {
    trc: 'TRC 4',
    name: 'TIH Zone D & Flammable Gases',
    examples: 'Hydrogen, Methane, Ethylene, Propane, Butane, Vinyl Chloride',
    t1Outdoor: '500 kg (1,100 lbs)',
    t1Indoor: '250 kg (550 lbs)',
    t2Outdoor: '50 kg (110 lbs)',
    t2Indoor: '25 kg (55 lbs)',
    hazard: 'Flammable vapor cloud explosion (VCE), flash fire, or moderate TIH.'
  },
  {
    trc: 'TRC 5',
    name: 'Flammable Liquids (Flash Point < 23°C & Boiling Point ≤ 35°C)',
    examples: 'Gasoline, Pentane, Isopentane, Carbon Disulfide, Ethyl Ether',
    t1Outdoor: '1,000 kg (2,200 lbs)',
    t1Indoor: '500 kg (1,100 lbs)',
    t2Outdoor: '100 kg (220 lbs)',
    t2Indoor: '50 kg (110 lbs)',
    hazard: 'Highly volatile flammable liquids forming rapid flammable mixtures.'
  },
  {
    trc: 'TRC 6',
    name: 'Flammable Liquids (Flash Point < 23°C & Boiling Point > 35°C)',
    examples: 'Benzene, Toluene, Hexane, Naphtha, Crude Oil (light)',
    t1Outdoor: '2,000 kg (4,400 lbs)',
    t1Indoor: '1,000 kg (2,200 lbs)',
    t2Outdoor: '200 kg (440 lbs)',
    t2Indoor: '100 kg (220 lbs)',
    hazard: 'Flammable pool fire and atmospheric vapor dispersion.'
  },
  {
    trc: 'TRC 7',
    name: 'Combustible Liquids (FP 23°C–60°C) & Corrosives / Acids',
    examples: 'Diesel, Kerosene, Jet Fuel, Sulfuric Acid, Hydrochloric Acid, Caustic Soda (NaOH)',
    t1Outdoor: '5,000 kg (11,000 lbs)',
    t1Indoor: '2,500 kg (5,500 lbs)',
    t2Outdoor: '500 kg (1,100 lbs)',
    t2Indoor: '250 kg (550 lbs)',
    hazard: 'Combustible liquids when heated, or severe chemical burns from acids/bases.'
  },
  {
    trc: 'TRC 8',
    name: 'Other Hazardous Chemicals / Packing Group III',
    examples: 'Heavy Fuel Oil, Lubricating Oil, Bitumen / Asphalt, Mild Solvents',
    t1Outdoor: '10,000 kg (22,000 lbs)',
    t1Indoor: '5,000 kg (11,000 lbs)',
    t2Outdoor: '1,000 kg (2,200 lbs)',
    t2Indoor: '500 kg (1,100 lbs)',
    hazard: 'Heavy combustible hydrocarbons or low-hazard materials.'
  }
];

export default function Api754HelpModal({
  isOpen,
  onClose,
  incident = null,
  initialTab = 'pending',
  onOpenEdit = null,
  onOpenResolver = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'pending');

  useEffect(() => {
    if (isOpen) {
      // If opened for a specific incident that is pending, default to 'pending' tab
      const isPending =
        incident?.api754Classification?.category === 'Pending Classification' ||
        incident?.api754Classification?.tier === 'Pending Classification';
      setActiveTab(isPending ? 'pending' : (initialTab || 'tiers'));
    }
  }, [isOpen, incident, initialTab]);

  if (!isOpen) return null;

  const classification = incident?.api754Classification || {};
  const currentCategory = classification.category || classification.tier || 'Near Miss';
  const isPending = currentCategory === 'Pending Classification' || currentCategory.includes('Pending');
  const reasons = classification.reasons || [];
  const pendingDetails = classification.pendingDetails || [];

  const isCftFormed = Boolean(
    incident?.cft?.leader?.name ||
    (Array.isArray(incident?.cft?.members) && incident.cft.members.some((m) => m.name && m.name.trim() !== '')) ||
    (incident?.triage && incident.triage.status !== 'Pending') ||
    (incident?.status && incident.status !== 'Submitted')
  );

  return (
    <div className="api754-modal-overlay" onClick={onClose}>
      <div className="api754-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="api754-modal-header">
          <div>
            <h2 className="api754-header-title">
              <span>📘</span> ANSI / API RP 754 Classification Guide & Assistance
            </h2>
            <p className="api754-header-subtitle">
              Standardized Process Safety Performance Indicators for Refining & Petrochemical Industries (4th & 3rd Editions)
            </p>
          </div>
          <button type="button" className="api754-close-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        {/* Tab Strip */}
        <div className="api754-tabs-strip">
          <button
            type="button"
            className={`api754-tab-btn ${activeTab === 'pending' ? 'active-pending' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span>⏳</span> Why Is Classification Pending?
            {isPending && (
              <span style={{ background: '#b45309', color: '#ffffff', padding: '1px 7px', borderRadius: '999px', fontSize: '0.72rem' }}>
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            className={`api754-tab-btn ${activeTab === 'tiers' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiers')}
          >
            <span>📊</span> Tier 1–4 & Near Miss Criteria
          </button>

          <button
            type="button"
            className={`api754-tab-btn ${activeTab === 'trc' ? 'active' : ''}`}
            onClick={() => setActiveTab('trc')}
          >
            <span>🧪</span> Chemical TRC Threshold Quantities (Table 1 & 2)
          </button>
        </div>

        {/* Body Content */}
        <div className="api754-modal-body">
          {/* TAB 1: PENDING CLASSIFICATION EXPLANATION & INCIDENT DIAGNOSTICS */}
          {activeTab === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* If an incident is loaded and is pending classification, show incident diagnostics */}
              {incident && isPending && (
                <div className="api754-diagnostic-card">
                  <div className="api754-diagnostic-header">
                    <h3 className="api754-diagnostic-title">
                      <span>⚠️</span> Pending Classification Diagnostic for Incident: {incident.incidentNumber || 'N/A'}
                    </h3>
                    <span style={{ fontSize: '0.76rem', background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '6px', fontWeight: '800', border: '1px solid #fde68a' }}>
                      Lifecycle: {incident.status || 'Reported'}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '0.84rem', color: '#78350f' }}>
                    <strong>Title:</strong> {incident.title}
                  </p>

                  <div style={{ marginBottom: '14px' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Exact Reasons Why This Event Is Pending Classification:
                    </strong>

                    {reasons.length > 0 ? (
                      reasons.map((r, idx) => (
                        <div key={idx} className="api754-reason-pill">
                          <div style={{ fontWeight: '700' }}>
                            {idx + 1}. {r}
                          </div>
                          {pendingDetails[idx]?.guidance && (
                            <div className="api754-reason-guidance">
                              <span>💡 Action Required:</span> {pendingDetails[idx].guidance}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="api754-reason-pill">
                        Initial incident report intake: Mandatory release quantity, injury outcome, or fire damage cost assessment is still under investigation.
                      </div>
                    )}
                  </div>

                  {/* Resolution Guidance Box */}
                  <div style={{ background: '#ffffff', borderRadius: '10px', padding: '14px 16px', border: '1px solid #fde68a' }}>
                    <strong style={{ fontSize: '0.84rem', color: '#92400e', display: 'block', marginBottom: '6px' }}>
                      🛠️ How to Resolve This Pending Classification:
                    </strong>
                    <div style={{ fontSize: '0.82rem', color: '#451a03', lineHeight: 1.5 }}>
                      {!isCftFormed ? (
                        <>
                          <p style={{ margin: '0 0 8px 0' }}>
                            Because the Cross-Functional Team (CFT) has not yet been formed, you can directly update the initial factual parameters in the First Incident Report (FIR):
                          </p>
                          <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
                            <li>If chemical release occurred: Provide estimated 1-hour release quantity (kg) in Section C.</li>
                            <li>If injuries were reported: Update final medical classification in Section D.</li>
                            <li>If fire/explosion occurred: Record direct equipment repair cost in Section E.</li>
                          </ul>
                          {onOpenEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenEdit(incident);
                              }}
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>✏️</span> Open & Edit FIR Now
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <p style={{ margin: '0 0 8px 0' }}>
                            The Cross-Functional Team (CFT) is already appointed. Investigation protocol requires finalized classification to be resolved in <strong>Stage 5: Barriers & Docs (Supporting Evidence & Pending Resolver)</strong>.
                          </p>
                          <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
                            <li>Attach verified engineering mass-balance calculations or laboratory analysis.</li>
                            <li>Attach medical doctor clearance reports.</li>
                            <li>Run the automated API RP 754 re-evaluation engine to finalize the Tier.</li>
                          </ul>
                          {onOpenResolver && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenResolver(incident);
                              }}
                              style={{
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>🛡️</span> Open Stage 5 Classification Resolver
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Explanation of Pending Classification */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  What is "Pending Classification" under API RP 754?
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.55 }}>
                  Under ANSI/API Recommended Practice 754, process safety performance indicators rely on <strong>strict, verified consequence thresholds</strong> (release mass within 1 hour, OSHA recordable injury severity, or direct repair costs).
                  When an incident is newly reported or factual evidence is incomplete, the system marks it as <strong>Pending Classification – Additional Information Required</strong> rather than guessing or prematurely downgrading the event to a Near Miss or Non-PSE.
                </p>
              </div>

              {/* The 4 Core Triggers for Pending Classification */}
              <h4 style={{ margin: '8px 0 0 0', fontSize: '0.92rem', fontWeight: '800', color: '#1e3a8a' }}>
                The 4 Core Triggers for Pending Classification:
              </h4>

              <div className="api754-trigger-grid">
                <div className="api754-trigger-card">
                  <div className="api754-trigger-title">
                    <span>🧪</span> 1. Unknown Release Quantity (LOPC)
                  </div>
                  <div className="api754-trigger-desc">
                    A loss of primary containment (LOPC) has occurred and the chemical is identified (e.g. TRC 5 Flammable Liquid), but the 1-hour mass quantity is marked "Unknown" or "0 kg".
                  </div>
                  <div className="api754-trigger-resolve">
                    ✓ Resolution: Conduct mass-balance, tank level change, or pipe volume calculation to determine release kg.
                  </div>
                </div>

                <div className="api754-trigger-card">
                  <div className="api754-trigger-title">
                    <span>🏥</span> 2. Medical Diagnosis Pending
                  </div>
                  <div className="api754-trigger-desc">
                    Worker or contractor injury occurred, but occupational physician has not yet certified whether it is a First Aid Case (FAC), Medical Treatment Case (Tier 2), or Days Away from Work / LTI (Tier 1).
                  </div>
                  <div className="api754-trigger-resolve">
                    ✓ Resolution: Obtain treating doctor's medical fitness assessment certificate.
                  </div>
                </div>

                <div className="api754-trigger-card">
                  <div className="api754-trigger-title">
                    <span>💰</span> 3. Direct Cost Assessment In-Progress
                  </div>
                  <div className="api754-trigger-desc">
                    A fire or explosion occurred, but maintenance and insurance engineering teams are still calculating equipment replacement, cleanup, and direct repair costs.
                  </div>
                  <div className="api754-trigger-resolve">
                    ✓ Resolution: Finalize direct cost estimate to determine if it meets $2,500 (Tier 2 fire), $100k (Tier 2 / Tier 1 fire), or $2.5M (Tier 1).
                  </div>
                </div>

                <div className="api754-trigger-card">
                  <div className="api754-trigger-title">
                    <span>❓</span> 4. Release Status Unconfirmed
                  </div>
                  <div className="api754-trigger-desc">
                    The initial report indicates "Not sure" whether material actually breached containment boundaries to the atmosphere or was contained in secondary capture/flare headers.
                  </div>
                  <div className="api754-trigger-resolve">
                    ✓ Resolution: Perform site inspection and verify whether physical loss of primary containment occurred.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIER 1–4 & NEAR MISS HIERARCHY */}
          {activeTab === 'tiers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>API RP 754 Process Safety Indicator Hierarchy:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                  Process safety events are categorized into 4 tiers, creating a leading-to-lagging indicator pyramid. Tier 1 and Tier 2 represent lagging loss events, while Tier 3 and Tier 4 represent leading barriers and discipline challenges.
                </p>
              </div>

              <div className="api754-tier-grid">
                {/* Tier 1 PSE */}
                <div className="api754-tier-card" style={{ borderColor: '#fca5a5' }}>
                  <div className="api754-tier-card-header" style={{ background: '#fee2e2' }}>
                    <span className="api754-tier-card-title" style={{ color: '#991b1b' }}>
                      🚨 Tier 1 PSE (Major Event)
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#991b1b', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      Lagging KPI
                    </span>
                  </div>
                  <div className="api754-tier-card-body">
                    <strong>Any one of the following consequences:</strong>
                    <ul>
                      <li>Fatality of employee, contractor, or 3rd party.</li>
                      <li>Days Away from Work (LTI) injury.</li>
                      <li>Hospital admission of 3rd party.</li>
                      <li>Officially declared community evacuation or shelter-in-place.</li>
                      <li>Fire or explosion resulting in direct cost ≥ $100,000.</li>
                      <li>Total direct cost of incident ≥ $2,500,000.</li>
                      <li>Chemical LOPC exceeding <strong>Table 1 Tier 1 Threshold Quantity</strong> within 1 hour.</li>
                    </ul>
                  </div>
                </div>

                {/* Tier 2 PSE */}
                <div className="api754-tier-card" style={{ borderColor: '#fdba74' }}>
                  <div className="api754-tier-card-header" style={{ background: '#ffedd5' }}>
                    <span className="api754-tier-card-title" style={{ color: '#9a3412' }}>
                      ⚠️ Tier 2 PSE (Lesser Consequence)
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#ea580c', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      Lagging KPI
                    </span>
                  </div>
                  <div className="api754-tier-card-body">
                    <strong>Any one of the following consequences (below Tier 1):</strong>
                    <ul>
                      <li>Recordable injury (Restricted Work Case or Medical Treatment Case).</li>
                      <li>Fire or explosion resulting in direct cost ≥ $2,500.</li>
                      <li>Total direct cost of incident ≥ $100,000.</li>
                      <li>Chemical LOPC exceeding <strong>Table 2 Tier 2 Threshold Quantity</strong> within 1 hour.</li>
                    </ul>
                  </div>
                </div>

                {/* Tier 3 Indicator */}
                <div className="api754-tier-card" style={{ borderColor: '#fcd34d' }}>
                  <div className="api754-tier-card-header" style={{ background: '#fef3c7' }}>
                    <span className="api754-tier-card-title" style={{ color: '#92400e' }}>
                      ⚡ Tier 3 Indicator (Challenge to Safety System)
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#d97706', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      Leading KPI
                    </span>
                  </div>
                  <div className="api754-tier-card-body">
                    <strong>Near-misses and demands on safety safeguards:</strong>
                    <ul>
                      <li>Safe Operating Limit (SOL) exceeded.</li>
                      <li>Primary Relief Device (PSV/PRD) discharge to atmosphere.</li>
                      <li>Safety Instrumented System (SIS) trip activation under demand.</li>
                      <li>Safety-critical inspection barrier found degraded during test.</li>
                    </ul>
                  </div>
                </div>

                {/* Tier 4 Indicator */}
                <div className="api754-tier-card" style={{ borderColor: '#c4b5fd' }}>
                  <div className="api754-tier-card-header" style={{ background: '#ede9fe' }}>
                    <span className="api754-tier-card-title" style={{ color: '#5b21b6' }}>
                      📊 Tier 4 Indicator (Operating Discipline)
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#7c3aed', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      Leading KPI
                    </span>
                  </div>
                  <div className="api754-tier-card-body">
                    <strong>Operating discipline and management system metrics:</strong>
                    <ul>
                      <li>Safety-critical equipment maintenance / inspection backlog.</li>
                      <li>Operating procedure deviation or permit-to-work non-compliance.</li>
                      <li>MOC (Management of Change) hazard review deficiencies.</li>
                      <li>Process safety training completion rates.</li>
                    </ul>
                  </div>
                </div>

                {/* Near Miss */}
                <div className="api754-tier-card" style={{ borderColor: '#7dd3fc' }}>
                  <div className="api754-tier-card-header" style={{ background: '#e0f2fe' }}>
                    <span className="api754-tier-card-title" style={{ color: '#0369a1' }}>
                      🛡️ Near Miss (Credible Potential Event)
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      Safety Safeguard
                    </span>
                  </div>
                  <div className="api754-tier-card-body">
                    <strong>Prevented loss of containment:</strong>
                    <ul>
                      <li>An event or condition that had credible potential for LOPC or harm.</li>
                      <li>An engineered or administrative safeguard successfully intervened to stop escalation.</li>
                      <li>No actual chemical release occurred.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHEMICAL TRC THRESHOLD QUANTITIES REFERENCE TABLE */}
          {activeTab === 'trc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                  API RP 754 Table 1 & Table 2 Threshold Quantities (TQ):
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  Threshold quantities apply to the <strong>net mass released within any 1-hour period</strong>.
                  Indoor releases have a <strong>50% lower threshold</strong> than outdoor releases due to vapor confinement risks.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="api754-table">
                  <thead>
                    <tr>
                      <th>TRC Category</th>
                      <th>Hazard Description & Typical Chemicals</th>
                      <th>Tier 1 (Outdoor)</th>
                      <th>Tier 1 (Indoor)</th>
                      <th>Tier 2 (Outdoor)</th>
                      <th>Tier 2 (Indoor)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TRC_REFERENCE.map((row) => (
                      <tr key={row.trc}>
                        <td>
                          <strong style={{ color: '#1e3a8a', fontSize: '0.88rem' }}>{row.trc}</strong>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{row.name}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>{row.examples}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{row.hazard}</div>
                        </td>
                        <td><strong style={{ color: '#991b1b' }}>{row.t1Outdoor}</strong></td>
                        <td><span style={{ color: '#991b1b' }}>{row.t1Indoor}</span></td>
                        <td><strong style={{ color: '#ea580c' }}>{row.t2Outdoor}</strong></td>
                        <td><span style={{ color: '#ea580c' }}>{row.t2Indoor}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="api754-modal-footer">
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Reference: ANSI/API RP 754 (4th Ed. 2021 & 3rd Ed. 2016) | Process Safety Performance Indicators
          </div>
          <button type="button" className="be-btn-primary" onClick={onClose} style={{ padding: '8px 20px' }}>
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
