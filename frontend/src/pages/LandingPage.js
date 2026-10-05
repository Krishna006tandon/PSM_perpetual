import React, { useState, useEffect } from 'react';
import './LandingPage.css';

const LandingPage = ({ onLogin, onCheckoutSuccess }) => {
  const [packages, setPackages] = useState([]);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    fetchPackages();
    loadRazorpayScript();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/public/packages');
      if (res.ok) {
        setPackages(await res.json());
      }
    } catch (e) {
      console.error('Error fetching subscription packages:', e);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      setLoadingRazorpay(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        setLoadingRazorpay(false);
        resolve(true);
      };
      script.onerror = () => {
        setLoadingRazorpay(false);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (pkg) => {
    onCheckoutSuccess(pkg);
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "What is Perpetual PSM?",
      a: "Perpetual PSM is a next-generation cloud-native Process Safety Management software designed for chemical, petrochemical, oil & gas, pharmaceuticals, and manufacturing facilities. It integrates HAZOP, LOPA, Management of Change (MOC), BowTie analysis, and Action Tracking into a unified, audit-ready platform."
    },
    {
      q: "How does Perpetual PSM assist with OSHA 1910.119 compliance?",
      a: "Perpetual PSM enforces compliance with OSHA 29 CFR 1910.119 by standardizing Process Hazard Analysis (PHA), maintaining thorough digital documentation, tracking action item resolution with audit trails, and managing change through structured multi-stage MOC workflows."
    },
    {
      q: "Can engineering teams perform both HAZOP and LOPA studies in the platform?",
      a: "Yes, Perpetual PSM seamlessly links HAZOP findings directly into Layer of Protection Analysis (LOPA) worksheets, allowing teams to evaluate initiating event frequencies, define Independent Protection Layers (IPL), and calculate required Safety Integrity Levels (SIL)."
    },
    {
      q: "Can we export worksheets and study reports to Excel and PDF?",
      a: "Yes. Perpetual PSM provides one-click export for all PHA, HAZOP, LOPA, MOC, and Action Tracking reports in professional corporate PDF and Excel formats suitable for stakeholders, auditors, and regulatory inspectors."
    },
    {
      q: "How does the Management of Change (MOC) module work?",
      a: "The MOC module features a structured 7-stage review process: Initiation, Area Head Approval, Technical Review Group, Project Manager Assessment, Site Head Authorization, Pre-Startup Safety Review (PSSR), and final Closure, ensuring complete governance before commissioning changes."
    },
    {
      q: "How do teams collaborate in Perpetual PSM?",
      a: "Perpetual PSM includes Role-Based Access Control (RBAC) designed specifically for safety study teams. Admins, Study Leaders, and Scribes can conduct live sessions, record deviations, and assign action items, while Reviewers and Team Members can inspect findings in real time."
    }
  ];

  return (
    <div className="psm-landing-wrapper">
      {/* Sticky Navigation Header */}
      <header className="psm-nav">
        <a href="/" className="psm-nav-brand" title="Perpetual PSM Home">
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 4 L56 14 V32 C56 46.5 45.5 56.5 32 60 C18.5 56.5 8 46.5 8 32 V14 Z" fill="#0f172a" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="32" cy="28" r="8" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="32" cy="28" r="3.5" fill="#38bdf8" />
            <path d="M32 36 V48 M24 24 L16 18 M40 24 L48 18" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="48" r="2.5" fill="#06b6d4" />
            <circle cx="16" cy="18" r="2.5" fill="#38bdf8" />
            <circle cx="48" cy="18" r="2.5" fill="#38bdf8" />
          </svg>
          <span className="psm-nav-title">Perpetual <span style={{ color: '#0ea5e9' }}>PSM</span></span>
        </a>

        <nav aria-label="Main Navigation">
          <ul className="psm-nav-links">
            <li><a href="#modules">Modules</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#compliance">Compliance</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </nav>

        <div className="psm-nav-actions">
          <button onClick={onLogin} className="psm-btn-outline" aria-label="Sign In to Platform">
            Sign In
          </button>
          <a href="#pricing" className="psm-btn-primary" style={{ textDecoration: 'none' }}>
            Get Started
          </a>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="psm-hero" aria-label="Hero Introduction">
          <div className="psm-hero-badge">
            <span>🛡️ Enterprise Process Safety Platform</span>
          </div>

          <h1 className="psm-hero-h1">
            Elevate Process Safety.<br />
            <span className="psm-hero-gradient-text">Empower Your Engineering Team.</span>
          </h1>

          <p className="psm-hero-desc">
            The next-generation cloud suite for <strong>HAZOP</strong>, <strong>LOPA</strong>, <strong>MOC</strong>, and <strong>BowTie</strong> risk analysis. Conduct rigorous risk assessments 5x faster, track corrective actions effortlessly, and ensure 100% regulatory compliance.
          </p>

          <div className="psm-hero-actions">
            <a href="#pricing" className="psm-btn-primary" style={{ textDecoration: 'none', padding: '14px 32px', fontSize: '1.05rem' }}>
              Explore Subscription Plans
            </a>
            <button onClick={onLogin} className="psm-btn-outline" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
              Sign In to Workspace
            </button>
          </div>

          <div className="psm-trust-bar">
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>OSHA 29 CFR 1910.119 Aligned</span>
            </div>
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>CCPS Risk Based Safety</span>
            </div>
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>IEC 61508 / 61511 SIL Verification</span>
            </div>
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>Instant PDF & Excel Export</span>
            </div>
          </div>
        </section>

        {/* Core Modules Section */}
        <section id="modules" className="psm-section" aria-label="Core PSM Modules">
          <div className="psm-section-header">
            <div className="psm-section-tag">Integrated Safety Suite</div>
            <h2 className="psm-section-title">Comprehensive Process Safety Modules</h2>
            <p className="psm-section-subtitle">
              Replace disjointed spreadsheets and standalone files with an interconnected cloud platform covering every stage of the process safety lifecycle.
            </p>
          </div>

          <div className="psm-modules-grid">
            {/* Module 1: PHA & HAZOP */}
            <article className="psm-module-card">
              <span className="psm-module-badge">PHA / HAZOP</span>
              <h3 className="psm-module-title">Process Hazard Analysis & HAZOP</h3>
              <p className="psm-module-desc">
                Streamline HAZOP and What-If studies with structured node definition, deviation guidewords, causes, consequences, safeguards, and risk ranking matrices.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Configurable risk matrices (5x5, 4x4)</li>
                <li><span className="psm-module-bullet-check">✓</span> Autocomplete deviation libraries</li>
                <li><span className="psm-module-bullet-check">✓</span> Dynamic column visibility & custom tagging</li>
              </ul>
            </article>

            {/* Module 2: LOPA */}
            <article className="psm-module-card">
              <span className="psm-module-badge">LOPA & SIL</span>
              <h3 className="psm-module-title">Layer of Protection Analysis</h3>
              <p className="psm-module-desc">
                Evaluate high-consequence scenarios quantitatively. Define initiating event frequencies, assign Independent Protection Layers (IPL), and determine target SIL.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Initiating event frequency calculations</li>
                <li><span className="psm-module-bullet-check">✓</span> PFD credits for qualifying IPLs</li>
                <li><span className="psm-module-bullet-check">✓</span> Safety Integrity Level (SIL 1 to 4) assessment</li>
              </ul>
            </article>

            {/* Module 3: MOC */}
            <article className="psm-module-card">
              <span className="psm-module-badge">MOC LIFECYCLE</span>
              <h3 className="psm-module-title">Management of Change Workflow</h3>
              <p className="psm-module-desc">
                Automate facility change requests through an audit-compliant 7-stage approval workflow from initiation, review groups, and budget estimation to PSSR closure.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Multi-tier role authorizations</li>
                <li><span className="psm-module-bullet-check">✓</span> Pre-Startup Safety Review (PSSR) checklists</li>
                <li><span className="psm-module-bullet-check">✓</span> Change classification (Permanent, Temporary, Emergency)</li>
              </ul>
            </article>

            {/* Module 4: BowTie */}
            <article className="psm-module-card">
              <span className="psm-module-badge">BOWTIE ANALYSIS</span>
              <h3 className="psm-module-title">Interactive BowTie Risk Diagrams</h3>
              <p className="psm-module-desc">
                Visualize hazardous scenarios from root causes to potential consequences with interactive barrier diagrams linking threats, prevention barriers, and mitigation controls.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Prevention & mitigation barrier mapping</li>
                <li><span className="psm-module-bullet-check">✓</span> Direct linkage to HAZOP safeguards</li>
                <li><span className="psm-module-bullet-check">✓</span> Degradation factor & critical control tracking</li>
              </ul>
            </article>

            {/* Module 5: Action Tracking */}
            <article className="psm-module-card">
              <span className="psm-module-badge">ACTION ITEMS</span>
              <h3 className="psm-module-title">Safety Recommendations Hub</h3>
              <p className="psm-module-desc">
                Never lose track of a safety recommendation. Centralize all action items from PHA studies and MOC tickets with real-time status tracking, owners, and due dates.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Cross-study action item aggregation</li>
                <li><span className="psm-module-bullet-check">✓</span> Priority indicators and overdue alerts</li>
                <li><span className="psm-module-bullet-check">✓</span> Verification and sign-off tracking</li>
              </ul>
            </article>

            {/* Module 6: Study Governance */}
            <article className="psm-module-card">
              <span className="psm-module-badge">GOVERNANCE & MOM</span>
              <h3 className="psm-module-title">Minutes of Meeting & Revisions</h3>
              <p className="psm-module-desc">
                Maintain a complete audit trail of study sessions, attendee signatures, meeting minutes, document uploads, and version revisions for complete regulatory readiness.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Digital attendance sheets & team roles</li>
                <li><span className="psm-module-bullet-check">✓</span> Study revision freezing & baseline compare</li>
                <li><span className="psm-module-bullet-check">✓</span> Centralized engineering document vault</li>
              </ul>
            </article>
          </div>
        </section>

        {/* Compliance Standards Section */}
        <section id="compliance" className="psm-compliance-wrapper">
          <div className="psm-section" aria-label="Regulatory Compliance Standards">
            <div className="psm-section-header">
              <div className="psm-section-tag">Global Standards</div>
              <h2 className="psm-section-title">Built for Stringent Regulatory Mandates</h2>
              <p className="psm-section-subtitle">
                Ensure compliance across your facilities with frameworks aligned with international chemical and process engineering standards.
              </p>
            </div>

            <div className="psm-compliance-grid">
              <div className="psm-compliance-card">
                <h3>OSHA 1910.119</h3>
                <p>Meets all 14 elements of OSHA’s Process Safety Management standard, including PHA revalidation and MOC documentation.</p>
              </div>

              <div className="psm-compliance-card">
                <h3>CCPS RBPS</h3>
                <p>Aligned with the Center for Chemical Process Safety Risk Based Process Safety guidelines for hazard identification and risk control.</p>
              </div>

              <div className="psm-compliance-card">
                <h3>IEC 61508 / 61511</h3>
                <p>Supports functional safety lifecycle compliance, Safety Instrumented Functions (SIF), and SIL target allocation.</p>
              </div>

              <div className="psm-compliance-card">
                <h3>EPA RMP & ISO 45001</h3>
                <p>Facilitates Environmental Protection Agency Risk Management Program reporting and ISO 45001 safety governance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Spreadsheet vs Perpetual PSM Comparison Section */}
        <section id="features" className="psm-section" aria-label="Feature Comparison">
          <div className="psm-section-header">
            <div className="psm-section-tag">Why Switch?</div>
            <h2 className="psm-section-title">Why Engineering Teams Choose Perpetual PSM Over Excel</h2>
            <p className="psm-section-subtitle">
              Spreadsheets introduce broken formulas, fragmented copies, and significant compliance vulnerabilities. Perpetual PSM brings enterprise confidence.
            </p>
          </div>

          <div className="psm-comparison-table-wrap">
            <table className="psm-comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Capability</th>
                  <th style={{ width: '30%' }}>Spreadsheets / Excel</th>
                  <th style={{ width: '30%', color: 'var(--primary-main)' }}>Perpetual PSM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Multi-User Real-time Collaboration</strong></td>
                  <td><span className="psm-feat-cross">✕ Manual merging</span></td>
                  <td><span className="psm-feat-check">✓ Cloud-native with RBAC roles</span></td>
                </tr>
                <tr>
                  <td><strong>Dynamic Risk Matrix Calculation</strong></td>
                  <td><span className="psm-feat-cross">✕ Prone to broken formulas</span></td>
                  <td><span className="psm-feat-check">✓ Automated residual risk ranking</span></td>
                </tr>
                <tr>
                  <td><strong>Integrated LOPA & SIL Verification</strong></td>
                  <td><span className="psm-feat-cross">✕ Disconnected sheets</span></td>
                  <td><span className="psm-feat-check">✓ Direct linkage to HAZOP scenarios</span></td>
                </tr>
                <tr>
                  <td><strong>7-Stage Management of Change (MOC)</strong></td>
                  <td><span className="psm-feat-cross">✕ Untracked emails & paper</span></td>
                  <td><span className="psm-feat-check">✓ Automated multi-stage approval workflow</span></td>
                </tr>
                <tr>
                  <td><strong>Centralized Action Items & Due Dates</strong></td>
                  <td><span className="psm-feat-cross">✕ Stale and forgotten items</span></td>
                  <td><span className="psm-feat-check">✓ Live tracking hub with owners & alerts</span></td>
                </tr>
                <tr>
                  <td><strong>Audit-Ready PDF & Excel Reports</strong></td>
                  <td><span className="psm-feat-cross">✕ Time-consuming formatting</span></td>
                  <td><span className="psm-feat-check">✓ 1-click corporate exports</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="psm-section" aria-label="Subscription Plans">
          <div className="psm-section-header">
            <div className="psm-section-tag">Flexible Pricing</div>
            <h2 className="psm-section-title">Select Your Subscription Plan</h2>
            <p className="psm-section-subtitle">
              Scale safely from single-plant operations to multi-site industrial enterprises. All plans include automated backups and secure cloud storage.
            </p>
          </div>

          <div className="psm-pricing-grid">
            {packages.map(pkg => (
              <div key={pkg._id} className="psm-pricing-card">
                <div style={{ padding: '40px 30px', borderBottom: '1px solid var(--divider)', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: '700' }}>{pkg.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary-main)' }}>₹{(pkg.price).toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>/{pkg.billingCycle === 'One-time' ? 'one-time' : pkg.billingCycle === 'Yearly' ? 'yr' : 'mo'}</span>
                  </div>
                </div>

                <div style={{ padding: '30px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>✓</div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}><strong>{pkg.maxProjects === -1 ? 'Unlimited' : pkg.maxProjects}</strong> Active Projects</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>✓</div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}><strong>{pkg.maxUsers === -1 ? 'Unlimited' : pkg.maxUsers}</strong> Team Members</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Included Modules</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {pkg.features && pkg.features.map(f => (
                        <span key={f} style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary-main)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePurchase(pkg)}
                    disabled={loadingRazorpay}
                    className="psm-btn-primary"
                    style={{ width: '100%', padding: '16px', fontSize: '1rem', cursor: loadingRazorpay ? 'not-allowed' : 'pointer', opacity: loadingRazorpay ? 0.7 : 1 }}
                  >
                    {loadingRazorpay ? 'Please wait...' : 'Select Plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Frequently Asked Questions Section */}
        <section id="faq" className="psm-section" aria-label="Frequently Asked Questions">
          <div className="psm-section-header">
            <div className="psm-section-tag">Got Questions?</div>
            <h2 className="psm-section-title">Frequently Asked Questions</h2>
            <p className="psm-section-subtitle">
              Learn how Perpetual PSM improves study efficiency, reporting accuracy, and compliance verification.
            </p>
          </div>

          <div className="psm-faq-container">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="psm-faq-item">
                  <button 
                    className="psm-faq-question" 
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="psm-faq-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="psm-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Banner Section */}
        <section className="psm-cta-section" aria-label="Get Started Call to Action">
          <h2 className="psm-cta-title">Modernize Your Process Safety Workflows Today</h2>
          <p className="psm-cta-desc">
            Equip your engineering and safety personnel with the modern tools they need to identify hazards, mitigate risks, and maintain continuous compliance.
          </p>
          <a href="#pricing" className="psm-btn-cta" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Get Started with Perpetual PSM
          </a>
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="psm-footer">
        <div className="psm-footer-inner">
          <div className="psm-footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 4 L56 14 V32 C56 46.5 45.5 56.5 32 60 C18.5 56.5 8 46.5 8 32 V14 Z" fill="#0f172a" stroke="#2563eb" strokeWidth="2.5" />
                  <circle cx="32" cy="28" r="8" fill="none" stroke="#38bdf8" strokeWidth="3" />
                  <circle cx="32" cy="28" r="3.5" fill="#38bdf8" />
                </svg>
                <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  Perpetual <span style={{ color: '#0ea5e9' }}>PSM</span>
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '320px' }}>
                Enterprise Process Safety Management, HAZOP, LOPA, MOC, and BowTie software built for chemical, manufacturing, and oil & gas facilities.
              </p>
            </div>

            <div className="psm-footer-col">
              <h4>Modules</h4>
              <ul>
                <li><a href="#modules">PHA & HAZOP</a></li>
                <li><a href="#modules">LOPA Worksheet</a></li>
                <li><a href="#modules">Management of Change (MOC)</a></li>
                <li><a href="#modules">BowTie Analysis</a></li>
                <li><a href="#modules">Recommendations Hub</a></li>
              </ul>
            </div>

            <div className="psm-footer-col">
              <h4>Compliance</h4>
              <ul>
                <li><a href="#compliance">OSHA 29 CFR 1910.119</a></li>
                <li><a href="#compliance">CCPS Risk Based Safety</a></li>
                <li><a href="#compliance">IEC 61508 / 61511</a></li>
                <li><a href="#compliance">EPA RMP Guidance</a></li>
              </ul>
            </div>

            <div className="psm-footer-col">
              <h4>Navigation</h4>
              <ul>
                <li><a href="#pricing">Subscription Pricing</a></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
                <li><a href="#features">Feature Comparison</a></li>
                <li><button onClick={onLogin} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, font: 'inherit', fontSize: '0.9rem' }}>Sign In</button></li>
              </ul>
            </div>
          </div>

          <div className="psm-footer-bottom">
            <span>© {new Date().getFullYear()} Perpetual Solutions. All rights reserved.</span>
            <span>Process Safety Management (PSM) Cloud Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
