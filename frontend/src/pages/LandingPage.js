import React, { useState, useEffect } from 'react';
import './LandingPage.css';

// Fallback high-quality subscription packages in case the public API is unavailable
const DEFAULT_FALLBACK_PACKAGES = [
  {
    _id: "pkg-starter-hazop",
    name: "HAZOP Standalone",
    price: 300000,
    annualPrice: 75000,
    oneTimePrice: 300000,
    billingCycle: "Both",
    hasAnnual: true,
    hasOneTime: true,
    maxProjects: -1,
    maxUsers: 1,
    features: ["PHA"],
    isActive: true,
    description: "Designed for independent process safety consultants and single plant units conducting focused HAZOP & What-If studies."
  },
  {
    _id: "pkg-hazop-lopa",
    name: "HAZOP + LOPA Pro",
    price: 900000,
    annualPrice: 225000,
    oneTimePrice: 900000,
    billingCycle: "Both",
    hasAnnual: true,
    hasOneTime: true,
    maxProjects: -1,
    maxUsers: 4,
    features: ["PHA", "LOPA"],
    isActive: true,
    description: "Ideal for plant safety teams requiring integrated Layer of Protection Analysis, initiating event modeling, and SIL allocation."
  },
  {
    _id: "pkg-full-enterprise",
    name: "Full Enterprise PSM Suite",
    price: 1500000,
    annualPrice: 375000,
    oneTimePrice: 1500000,
    billingCycle: "Both",
    hasAnnual: true,
    hasOneTime: true,
    maxProjects: -1,
    maxUsers: 10,
    features: ["PHA", "MOC", "LOPA", "BOWTIE", "INCIDENT"],
    isActive: true,
    description: "The complete process safety management operating system for chemical, petrochemical, oil & gas complexes."
  }
];

const LandingPage = ({ onLogin, onCheckoutSuccess }) => {
  const [packages, setPackages] = useState(DEFAULT_FALLBACK_PACKAGES);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState({});
  const [billingGlobal, setBillingGlobal] = useState('Annual');

  // Interactive Live Product Simulator state
  const [activeSimTab, setActiveSimTab] = useState('hazop');
  const [activeHazopIndex, setActiveHazopIndex] = useState(0);
  const [activeMocStage, setActiveMocStage] = useState(6); // Default on PSSR stage
  const [actionSearch, setActionSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // 5x5 Risk Matrix Explorer state
  const [selectedMatrixCell, setSelectedMatrixCell] = useState({ s: 5, l: 3 });

  // Industry Solution Tabs
  const [activeIndustry, setActiveIndustry] = useState('petro');

  // Interactive Book Demo Modal
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    industry: 'Chemicals / Petrochemicals',
    interest: 'Full Suite'
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  useEffect(() => {
    fetchPackages();
    loadRazorpayScript();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/public/packages');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPackages(data);
        }
      }
    } catch (e) {
      console.warn('Using fallback subscription packages:', e.message);
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

  const getPackageBilling = (pkg) => {
    if (selectedBilling[pkg._id]) return selectedBilling[pkg._id];
    return billingGlobal;
  };

  const getPackagePrice = (pkg, billing) => {
    if (billing === 'One-time') {
      return pkg.oneTimePrice || (pkg.billingCycle === 'One-time' ? pkg.price : pkg.price * 4);
    }
    return pkg.annualPrice || (pkg.billingCycle !== 'One-time' ? pkg.price : Math.round(pkg.price / 4));
  };

  const handlePurchase = async (pkg) => {
    const billing = getPackageBilling(pkg);
    const price = getPackagePrice(pkg, billing);
    onCheckoutSuccess({
      ...pkg,
      price,
      chosenBilling: billing,
      features: Array.isArray(pkg.features) && pkg.features.length > 0 ? pkg.features : ['PHA', 'MOC', 'LOPA', 'BOWTIE']
    });
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setShowDemoModal(false);
    }, 2800);
  };

  // ==========================================================================
  // REAL SIMULATOR ENGINEERING DATA
  // ==========================================================================
  const hazopScenarios = [
    {
      id: "DEV-01",
      node: "Node 1: Hydrotreater Reactor R-101 Feed Inlet & Preheater Line",
      guideword: "MORE",
      deviation: "High Pressure (Exceeding 85 barg Design Limit)",
      designCondition: "Design Press: 85 barg | Operating: 62 barg | Temp: 380°C | Fluid: Heavy Gas Oil + H2",
      causes: "1. Pressure Control Valve PCV-102 fails closed due to instrument air loss.\n2. Downstream quench line block valve inadvertently closed during catalyst bed cycling.",
      consequences: "Catastrophic overpressure in Reactor R-101 shell, flange gasket failure, pressurized release of flammable hydrogen and hot gas oil at 380°C, spontaneous auto-ignition, UVCE vapor cloud explosion, potential personnel fatalities.",
      safeguards: "• PSHH-104 independent high-pressure switch interlocked with ESDV-101 (trip time < 2.0s).\n• Dual full-capacity certified safety relief valves PSV-102A/B discharging to emergency flare.",
      initialSeverity: 5,
      initialLikelihood: 3,
      initialScore: 15,
      initialCategory: "EXTREME",
      recommendations: "Install automated emergency depressuring bypass valve (BDV-101) wired to SIL-2 logic solver with dual redundant solenoid valves to depressure reactor to 15 barg in < 15 minutes.",
      targetSil: "SIL 2",
      residualSeverity: 2,
      residualLikelihood: 1,
      residualScore: 2,
      residualCategory: "LOW",
      assignee: "Dr. M. Ramanathan (Lead Process Safety)",
      status: "Verified & Approved",
      dueDate: "15-Nov-2026"
    },
    {
      id: "DEV-02",
      node: "Node 1: Reactor Bed 2 Quench Oil Injection Line",
      guideword: "LESS",
      deviation: "Low Flow (Quench Flow Loss / Coolant Starvation)",
      designCondition: "Min Quench: 42 m³/hr | Bed Exotherm Threshold: ΔT > 25°C",
      causes: "1. Primary quench circulation pump P-102A mechanical seal failure.\n2. Standby pump P-102B fail-to-start on low-pressure interlock.",
      consequences: "Uncontrolled thermal runaway reaction in catalyst bed 2, exothermic temperature excursion exceeding 450°C, catalyst coking & sintering, reactor tube thermal rupture.",
      safeguards: "• Low flow alarm FAL-108 on quench header with operator alert.\n• Multi-point internal thermocouples TE-112 through TE-118 with automated high-temperature nitrogen purge.",
      initialSeverity: 4,
      initialLikelihood: 3,
      initialScore: 12,
      initialCategory: "HIGH",
      recommendations: "Implement 2-out-of-3 (2oo3) voting logic across bed thermocouples to automatically trip feed and initiate cold gas recycle within 30 seconds.",
      targetSil: "SIL 2",
      residualSeverity: 2,
      residualLikelihood: 1,
      residualScore: 2,
      residualCategory: "LOW",
      assignee: "K. Patel (Instrumentation & Controls Lead)",
      status: "In Progress (80%)",
      dueDate: "28-Oct-2026"
    },
    {
      id: "DEV-03",
      node: "Node 1: High Pressure Purge Nitrogen Tie-In Connection",
      guideword: "REVERSE",
      deviation: "Reverse Flow (Hydrocarbon Backflow into Nitrogen Header)",
      designCondition: "Process Press: 85 barg | Utility Nitrogen Header: 8 barg",
      causes: "1. Single check valve NRV-109 stuck in open position due to particulate fouling.\n2. Manual block valve left cracked open following pre-startup line inerting.",
      consequences: "High-pressure toxic H2S and flammable gas backflows into plant-wide utility nitrogen header, contaminating inert utilities, risk of asphyxiation and toxic exposure at distant sampling stations.",
      safeguards: "• Dual spring-loaded non-return check valves in series (NRV-109A/B).\n• Spectacle blind locked in closed position during normal operation with car-seal log.",
      initialSeverity: 4,
      initialLikelihood: 2,
      initialScore: 8,
      initialCategory: "MEDIUM",
      recommendations: "Replace standard check valves with certified API 594 piston non-return valves and install atmospheric vent spool with double block-and-bleed arrangement.",
      targetSil: "SIL 1",
      residualSeverity: 1,
      residualLikelihood: 1,
      residualScore: 1,
      residualCategory: "LOW",
      assignee: "A. Deshmukh (Piping Integrity Engineer)",
      status: "Completed",
      dueDate: "05-Nov-2026"
    }
  ];

  const lopaIpls = [
    {
      ipl: "IPL 1: Basic Process Control System (BPCS)",
      desc: "Quench Flow Controller FC-102 with redundant electro-pneumatic positioner and automatic valve modulation",
      pfd: "1.0 × 10⁻¹",
      numericPfd: 0.1,
      status: "Qualified Independent IPL"
    },
    {
      ipl: "IPL 2: Independent High Temp Alarm & Operator Action",
      desc: "TAH-105 independent sensor alarm with dedicated control room annunciator and documented 15-minute response SOP",
      pfd: "1.0 × 10⁻¹",
      numericPfd: 0.1,
      status: "Qualified Independent IPL"
    },
    {
      ipl: "IPL 3: Safety Instrumented System (SIF-102)",
      desc: "SIL-2 certified Logic Solver with 1oo2 pressure transmitters and fast-acting emergency depressuring valve BDV-101",
      pfd: "1.0 × 10⁻²",
      numericPfd: 0.01,
      status: "SIL 2 Verified (IEC 61511)"
    },
    {
      ipl: "IPL 4: Mechanical Relief Device (PSV-102A/B)",
      desc: "Dual full-bore balanced bellows safety relief valves sized according to API 520 / 521 for external fire & blocked outlet",
      pfd: "1.0 × 10⁻²",
      numericPfd: 0.01,
      status: "Code Certified ASME VIII"
    }
  ];

  const mocStages = [
    {
      num: 1,
      title: "Initiation",
      subtitle: "Change Scope & Risk Category",
      status: "completed",
      author: "K. Verma (Senior Reliability Engineer)",
      date: "14-Oct-2026",
      details: "Request #MOC-2026-089: Upgrade mechanical seal on Reactor Feed Pump P-101 from single cartridge to dual pressurized barrier gas seal (Plan 53A) to eliminate VOC fugitive emissions.",
      category: "Permanent Modification • Class A (High Risk)"
    },
    {
      num: 2,
      title: "Area Head",
      subtitle: "Operational Screening",
      status: "completed",
      author: "V. R. Iyer (Operations Unit Head)",
      date: "16-Oct-2026",
      details: "Technical endorsement granted. Verified seal flush plan compatibility with crude feedstock viscosity and existing utility nitrogen distribution capacity.",
      category: "Endorsed with condition: Seal reservoir level must be tied to DCS alarm."
    },
    {
      num: 3,
      title: "Review Group",
      subtitle: "Multi-Disciplinary Assessment",
      status: "completed",
      author: "Process, Mechanical, Electrical, HSE",
      date: "19-Oct-2026",
      details: "4 Disciplines signed off:\n• Process Safety: HAZOP delta revalidation completed (0 new unmitigated risks)\n• Mechanical: API 682 seal cavity dimensions verified\n• Instrumentation: Pressure transmitter PT-109 wired to DCS interlock\n• HSE: Net annual emission reduction of 4.2 metric tons VOC confirmed.",
      category: "100% Sign-Off Achieved"
    },
    {
      num: 4,
      title: "Budget & PM",
      subtitle: "Cost & Turnaround Planning",
      status: "completed",
      author: "S. K. Nambiar (Project Manager)",
      date: "20-Oct-2026",
      details: "Approved Capex: ₹4,80,000. Scheduled for planned unit maintenance turnaround window (Duration: 36 hours outage). Procurement PO #PO-9921 issued.",
      category: "Budget Approved • Spares in Warehouse"
    },
    {
      num: 5,
      title: "Site Head",
      subtitle: "Executive Authorization",
      status: "completed",
      author: "Dr. B. Sengupta (Plant General Manager)",
      date: "21-Oct-2026",
      details: "Final statutory and corporate executive authorization granted. Complies with OSHA 29 CFR 1910.119(l) management of change protocols.",
      category: "Executive Authorization Granted"
    },
    {
      num: 6,
      title: "PSSR Review",
      subtitle: "Pre-Startup Safety Review",
      status: "current",
      author: "Joint Inspection Commission",
      date: "Active Today",
      details: "18-Point Field Verification Checklist:\n✓ P&ID drawing HTU-012 revised to Rev 4\n✓ Operating Procedure SOP-OPS-44 updated & signed\n✓ Maintenance technicians trained on Plan 53A barrier fluid refilling\n⚡ Seal pressure hydrostatic leak test at 14 barg (In Progress)",
      category: "Active Stage • 88% Checklist Completed"
    },
    {
      num: 7,
      title: "Closure",
      subtitle: "Final Archival & Handover",
      status: "pending",
      author: "Operations Lead & PSM Coordinator",
      date: "Pending PSSR Sign-Off",
      details: "Final formal closeout of change ticket, archiving of inspection certificates, updating CMMS equipment asset register, and baseline freeze.",
      category: "Pending Final Commissioning"
    }
  ];

  const actionItemsData = [
    {
      id: "ACT-PHA-044",
      module: "HAZOP",
      priority: "CRITICAL",
      title: "Recalibrate High Pressure Switch PSHH-104 and conduct proof test according to IEC 61511 clause 16",
      assignee: "T. Kulkarni (Lead Instrumentation)",
      due: "28-Oct-2026",
      progress: 80,
      status: "IN PROGRESS"
    },
    {
      id: "ACT-LOPA-012",
      module: "LOPA",
      priority: "HIGH",
      title: "Upgrade emergency bypass damper logic to fail-safe de-energize to trip configuration on SIF-102",
      assignee: "V. Sen (Automation & Safety Systems)",
      due: "15-Nov-2026",
      progress: 35,
      status: "OPEN"
    },
    {
      id: "ACT-MOC-089",
      module: "MOC",
      priority: "HIGH",
      title: "Complete physical inspection of mechanical seal barrier fluid reservoir level transmitter on P-101",
      assignee: "R. Gupta (Mechanical Integrity)",
      due: "05-Nov-2026",
      progress: 60,
      status: "IN PROGRESS"
    },
    {
      id: "ACT-AUDIT-023",
      module: "AUDIT",
      priority: "MEDIUM",
      title: "Upload signed training attendance logs for modified nitrogen purge operating procedure SOP-REL-09",
      assignee: "A. Nair (Operations Training)",
      due: "22-Oct-2026",
      progress: 100,
      status: "CLOSED"
    },
    {
      id: "ACT-BOWTIE-007",
      module: "BOWTIE",
      priority: "CRITICAL",
      title: "Perform ultrasonic wall thickness testing on crude preheater return bend (E-101) to verify corrosion allowance",
      assignee: "S. Banerjee (NDT Specialist)",
      due: "10-Nov-2026",
      progress: 20,
      status: "OPEN"
    }
  ];

  // Filter action items
  const filteredActions = actionItemsData.filter(act => {
    const matchFilter = actionFilter === 'ALL' || act.status === actionFilter || act.priority === actionFilter;
    const matchSearch = act.title.toLowerCase().includes(actionSearch.toLowerCase()) ||
                        act.id.toLowerCase().includes(actionSearch.toLowerCase()) ||
                        act.assignee.toLowerCase().includes(actionSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  // 5x5 Matrix cell data calculation
  const getMatrixCellData = (s, l) => {
    const score = s * l;
    let category = "LOW";
    let css = "psm-m-low";
    let action = "Acceptable risk. Maintain regular routine maintenance and standard operating procedures.";
    let scenario = "Minor pump flange weeping or nuisance alarm with negligible chemical release.";

    if (score >= 15) {
      category = "EXTREME";
      css = "psm-m-ext";
      action = "Unacceptable risk. Work cannot proceed without executive VP authorization and multi-tier independent SIL-2/SIL-3 safety instrumented systems.";
      scenario = "Catastrophic vessel rupture, flammable gas vapor cloud explosion (VCE), or potential multiple fatalities.";
    } else if (score >= 10) {
      category = "HIGH";
      css = "psm-m-high";
      action = "High risk. Mandatory engineering safeguards required within 30 days. Formal LOPA study required to verify independent protection layers.";
      scenario = "Major localized fire, high-pressure toxic release contained inside plant battery limit, severe equipment damage.";
    } else if (score >= 5) {
      category = "MEDIUM";
      css = "psm-m-med";
      action = "Moderate risk. Managed via standard plant operating safeguards, dual instrumentation, and shift supervisor sign-off.";
      scenario = "Process upset requiring manual intervention, minor localized spill with secondary containment functioning.";
    }

    return { score, category, css, action, scenario };
  };

  const activeMatrixData = getMatrixCellData(selectedMatrixCell.s, selectedMatrixCell.l);

  // Industry solutions data
  const industries = {
    petro: {
      name: "Chemicals & Petrochemicals",
      tag: "Continuous & High Hazard Processing",
      desc: "Designed for continuous high-pressure catalytic reactors, ethylene crackers, reforming units, and volatile bulk storage facilities.",
      points: [
        "Pre-loaded CCPS guidewords for high pressure, exothermic runaways, and toxic vapor dispersion.",
        "Full LOPA integration to calculate safety instrumented function (SIF) SIL targets for furnace trips and ESD valves.",
        "Dynamic MOC workflow tracking catalyst changeovers, valve metallurgy upgrades, and relief valve recertifications.",
        "Audited against OSHA 29 CFR 1910.119 and CCPS 20-element Risk Based Process Safety guidelines."
      ],
      stats: "65% faster study cycle time for complex CDU, VDU, and FCCU unit reviews."
    },
    chem: {
      name: "Specialty & Fine Chemicals",
      tag: "Batch Reactors & Hazardous Reagents",
      desc: "Engineered for multi-product batch manufacturing, exothermic polymerization reactions, and volatile solvent transfer networks.",
      points: [
        "Flexible node definitions adapting to batch cycle recipe changes and multi-purpose vessel cleaning protocols.",
        "Automated deviation analysis for cooling water failure, agitator stoppage, and incompatible material cross-contamination.",
        "Action tracking hub linking engineering recommendations directly to plant maintenance turnaround schedules.",
        "Complete minutes of meeting and digital attendance tracking for collaborative cross-functional scribing."
      ],
      stats: "100% audit trail readiness for hazardous batch chemical operations and EPA RMP compliance."
    },
    pharma: {
      name: "Pharmaceuticals & Life Sciences",
      tag: "Cleanrooms, API Synthesis & GAMP-5",
      desc: "Tailored for active pharmaceutical ingredient (API) synthesis, pressurized hydrogenations, solvent recovery, and sterile containment.",
      points: [
        "Pre-Startup Safety Review (PSSR) checklists built specifically for cleanroom validation and pharmaceutical commissioning.",
        "Cross-study action item consolidation ensuring all FDA cGMP and process safety recommendations are addressed.",
        "Role-based access control with immutable audit timestamps compliant with electronic records standards.",
        "One-click corporate PDF export with executive summaries ready for international regulatory inspectors."
      ],
      stats: "Over 50,000 pharmaceutical and active chemical hazard scenarios safely mapped."
    },
    energy: {
      name: "Hydrogen, Power & Clean Energy",
      tag: "High Pressure H2, Ammonia & Renewables",
      desc: "Built for next-generation energy facilities including high-pressure green hydrogen electrolyzers, ammonia bunkering, and carbon capture units.",
      points: [
        "Comprehensive BowTie risk models for hydrogen embrittlement, cryogenic storage boiling liquid expanding vapor explosions (BLEVE).",
        "IEC 61508 / 61511 functional safety lifecycle management and PFDavg mathematical validation.",
        "Standardized deviation taxonomies for electrolyzer oxygen-hydrogen mixing, membrane degradation, and fast flare venting.",
        "Centralized document repository linking equipment datasheets, P&IDs, and SIL allocation certificates."
      ],
      stats: "Zero compliance gaps across international clean energy and high-pressure gas facilities."
    }
  };

  const currentIndData = industries[activeIndustry];

  const faqs = [
    {
      q: "What is PS-MagnaShield?",
      a: "PS-MagnaShield is a next-generation cloud-native Process Safety Management software designed for chemical, petrochemical, oil & gas, pharmaceuticals, and manufacturing facilities. It integrates HAZOP, LOPA, Management of Change (MOC), BowTie analysis, and Action Tracking into a unified, audit-ready platform."
    },
    {
      q: "How does PS-MagnaShield assist with OSHA 1910.119 compliance?",
      a: "PS-MagnaShield enforces compliance with OSHA 29 CFR 1910.119 by standardizing Process Hazard Analysis (PHA), maintaining thorough digital documentation, tracking action item resolution with audit trails, and managing change through structured multi-stage MOC workflows."
    },
    {
      q: "Can engineering teams perform both HAZOP and LOPA studies in the platform?",
      a: "Yes, PS-MagnaShield seamlessly links HAZOP findings directly into Layer of Protection Analysis (LOPA) worksheets, allowing teams to evaluate initiating event frequencies, define Independent Protection Layers (IPL), and calculate required Safety Integrity Levels (SIL)."
    },
    {
      q: "How does the Management of Change (MOC) module work?",
      a: "The MOC module features a structured 7-stage review process: Initiation, Area Head Approval, Technical Review Group, Project Manager Assessment, Site Head Authorization, Pre-Startup Safety Review (PSSR), and final Closure, ensuring complete governance before commissioning changes."
    },
    {
      q: "Can we export worksheets and study reports to Excel and PDF?",
      a: "Yes. PS-MagnaShield provides one-click export for all PHA, HAZOP, LOPA, MOC, and Action Tracking reports in professional corporate PDF and Excel formats suitable for stakeholders, auditors, and regulatory inspectors."
    },
    {
      q: "Can we migrate our existing Excel and PHA-Pro studies into PS-MagnaShield?",
      a: "Absolutely. PS-MagnaShield includes automated Excel and CSV ingestion templates that map your existing nodes, deviations, causes, consequences, safeguards, and recommendations directly into the platform without manual retyping."
    },
    {
      q: "How is our proprietary engineering and process safety data secured?",
      a: "PS-MagnaShield employs bank-grade AES-256 encryption at rest and in transit (TLS 1.3), hosted on SOC 2 Type II and ISO 27001 certified infrastructure with automated hourly geo-redundant backups, strict role-based access control (RBAC), and full audit logging."
    },
    {
      q: "How do teams collaborate during live scribing sessions?",
      a: "PS-MagnaShield features real-time collaborative scribing. The Study Leader and Scribe can facilitate and document deviations while remote engineering team members, inspectors, and operations heads view live updates on their own screens with zero lag."
    }
  ];

  const currentHazop = hazopScenarios[activeHazopIndex];

  return (
    <div className="psm-landing-wrapper">
      {/* ====================================================================
          1. Sticky Navigation Header
          ==================================================================== */}
      <header className="psm-nav">
        <a href="/" className="psm-nav-brand" title="PS-MagnaShield Enterprise">
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 4 L56 14 V32 C56 46.5 45.5 56.5 32 60 C18.5 56.5 8 46.5 8 32 V14 Z" fill="#0f172a" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="32" cy="28" r="8" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <circle cx="32" cy="28" r="3.5" fill="#38bdf8" />
            <path d="M32 36 V48 M24 24 L16 18 M40 24 L48 18" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="48" r="2.5" fill="#06b6d4" />
            <circle cx="16" cy="18" r="2.5" fill="#38bdf8" />
            <circle cx="48" cy="18" r="2.5" fill="#38bdf8" />
          </svg>
          <span className="psm-nav-title">PS-Magna<span style={{ color: '#0ea5e9' }}>Shield</span></span>
        </a>

        <nav aria-label="Main Navigation">
          <ul className="psm-nav-links">
            <li>
              <a href="#simulator">
                <span>Live Preview</span>
                <span className="psm-nav-pill-badge">Interactive</span>
              </a>
            </li>
            <li><a href="#modules">Modules</a></li>
            <li><a href="#matrix">Risk Matrix</a></li>
            <li><a href="#industries">Industries</a></li>
            <li><a href="#compliance">Compliance</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </nav>

        <div className="psm-nav-actions">
          <button onClick={() => setShowDemoModal(true)} className="psm-btn-ghost">
            Book a Demo
          </button>
          <button onClick={onLogin} className="psm-btn-outline" aria-label="Sign In to Platform">
            Sign In
          </button>
          <a href="#pricing" className="psm-btn-primary" style={{ textDecoration: 'none' }}>
            Get Started
          </a>
        </div>
      </header>

      <main>
        {/* ====================================================================
            2. Hero Section
            ==================================================================== */}
        <section className="psm-hero" aria-label="Hero Introduction">
          <div className="psm-hero-badge">
            <span>🛡️ Enterprise Process Safety Platform • OSHA 1910.119 & IEC 61511 Ready</span>
          </div>

          <h1 className="psm-hero-h1">
            Elevate Process Safety.<br />
            <span className="psm-hero-gradient-text">Empower Your Engineering Team.</span>
          </h1>

          <p className="psm-hero-desc">
            The next-generation cloud suite for <strong>HAZOP</strong>, <strong>LOPA</strong>, <strong>MOC</strong>, and <strong>BowTie</strong> risk analysis. Conduct rigorous risk assessments 5x faster, track corrective actions effortlessly, and ensure 100% regulatory compliance.
          </p>

          <div className="psm-hero-actions">
            <a href="#simulator" className="psm-btn-primary" style={{ textDecoration: 'none', padding: '14px 32px', fontSize: '1.05rem' }}>
              ⚡ Explore Live Interactive Demo
            </a>
            <a href="#pricing" className="psm-btn-outline" style={{ textDecoration: 'none', padding: '14px 30px', fontSize: '1.05rem' }}>
              Explore Subscription Plans
            </a>
            <button onClick={() => setShowDemoModal(true)} className="psm-btn-ghost" style={{ padding: '14px 26px', fontSize: '1.02rem' }}>
              📅 Schedule 1-on-1 Walkthrough
            </button>
          </div>

          <div className="psm-trust-bar">
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>OSHA 29 CFR 1910.119 Aligned</span>
            </div>
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>CCPS Risk Based Safety (RBPS)</span>
            </div>
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>IEC 61508 / 61511 SIL Verification</span>
            </div>
            <div className="psm-trust-item">
              <span className="psm-trust-icon">✓</span>
              <span>Instant Audit-Ready PDF & Excel Export</span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. Operational Impact & Process Safety Metrics Strip
            ==================================================================== */}
        <section className="psm-metrics-strip" aria-label="Key Impact Metrics">
          <div className="psm-metrics-grid">
            <div className="psm-metric-card">
              <div className="psm-metric-number">65%</div>
              <div className="psm-metric-label">Faster Study Delivery</div>
              <div className="psm-metric-desc">Accelerate HAZOP & LOPA worksheet completion with intelligent auto-complete & deviation libraries.</div>
            </div>
            <div className="psm-metric-card">
              <div className="psm-metric-number">100%</div>
              <div className="psm-metric-label">Audit Readiness</div>
              <div className="psm-metric-desc">Immutable, timestamped audit trails fully compliant with OSHA 29 CFR 1910.119 and EPA RMP mandates.</div>
            </div>
            <div className="psm-metric-card">
              <div className="psm-metric-number">50,000+</div>
              <div className="psm-metric-label">Scenarios Modeled</div>
              <div className="psm-metric-desc">Trusted by process safety leaders across petrochemical, chemical, and pharmaceutical complexes.</div>
            </div>
            <div className="psm-metric-card">
              <div className="psm-metric-number">Zero</div>
              <div className="psm-metric-label">Unresolved Extreme Risks</div>
              <div className="psm-metric-desc">Automated residual risk scoring with direct escalation to assigned action item owners and plant managers.</div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. THE CORE SHOWCASE: Interactive Live Product Simulator
            ==================================================================== */}
        <section id="simulator" className="psm-simulator-wrapper" aria-label="Live Interactive Product Demo">
          <div className="psm-section-header" style={{ marginBottom: '32px' }}>
            <div className="psm-section-tag">Interactive Product Experience</div>
            <h2 className="psm-section-title">See PS-MagnaShield in Action</h2>
            <p className="psm-section-subtitle">
              Click through real study modules below to explore how engineering teams document deviations, calculate target SIL ratings, manage facility changes, and resolve action items.
            </p>
          </div>

          <div className="psm-simulator-card">
            {/* Simulator Window Topbar */}
            <div className="psm-simulator-topbar">
              <div className="psm-sim-dots">
                <span className="psm-sim-dot red"></span>
                <span className="psm-sim-dot yellow"></span>
                <span className="psm-sim-dot green"></span>
              </div>
              <div className="psm-sim-title-wrap">
                <span style={{ fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                  PS-MagnaShield Enterprise Workstation &mdash; Study #HTU-2026-004
                </span>
                <span className="psm-sim-badge">
                  <span style={{ fontSize: '8px' }}>●</span> LIVE INTERACTIVE PREVIEW
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowDemoModal(true)}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Book Full Tour
                </button>
              </div>
            </div>

            {/* Simulator Module Navigation Tabs */}
            <div className="psm-sim-nav-tabs">
              <button 
                className={`psm-sim-tab-btn ${activeSimTab === 'hazop' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('hazop')}
              >
                <span>📋</span> PHA / HAZOP Worksheet
              </button>
              <button 
                className={`psm-sim-tab-btn ${activeSimTab === 'lopa' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('lopa')}
              >
                <span>🛡️</span> LOPA & SIL Calculator
              </button>
              <button 
                className={`psm-sim-tab-btn ${activeSimTab === 'moc' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('moc')}
              >
                <span>🔄</span> 7-Stage MOC Pipeline
              </button>
              <button 
                className={`psm-sim-tab-btn ${activeSimTab === 'bowtie' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('bowtie')}
              >
                <span>🎀</span> BowTie Risk Visualizer
              </button>
              <button 
                className={`psm-sim-tab-btn ${activeSimTab === 'actions' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('actions')}
              >
                <span>✅</span> Action Tracking Hub
              </button>
              <button 
                className={`psm-sim-tab-btn ${activeSimTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveSimTab('dashboard')}
              >
                <span>📊</span> Executive Dashboard
              </button>
            </div>

            {/* Simulator Body */}
            <div className="psm-simulator-viewport">
              {/* TAB 1: HAZOP WORKSHEET */}
              {activeSimTab === 'hazop' && (
                <div>
                  <div className="psm-sim-meta-strip">
                    <div className="psm-sim-meta-title">
                      <span>📌 Active Node:</span>
                      <span style={{ color: 'var(--primary-main)' }}>Node 1: Hydrotreater Reactor R-101 Feed Inlet & Preheater Line (P&ID-HTU-012)</span>
                    </div>
                    <div className="psm-sim-meta-pills">
                      <span className="psm-pill psm-pill-blue">Design Press: 85 barg</span>
                      <span className="psm-pill psm-pill-orange">Operating Temp: 380°C</span>
                      <span className="psm-pill psm-pill-green">Fluid: Heavy Gas Oil + H₂</span>
                    </div>
                  </div>

                  {/* Deviation Selector Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {hazopScenarios.map((sc, i) => (
                      <button
                        key={sc.id}
                        onClick={() => setActiveHazopIndex(i)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: activeHazopIndex === i ? '2px solid var(--primary-main)' : '1px solid var(--divider)',
                          background: activeHazopIndex === i ? 'var(--bg-paper)' : 'transparent',
                          color: activeHazopIndex === i ? 'var(--primary-main)' : 'var(--text-secondary)',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: activeHazopIndex === i ? 'var(--shadow-sm)' : 'none'
                        }}
                      >
                        {sc.id}: {sc.guideword} - {sc.deviation.split('(')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Worksheet Grid */}
                  <div className="psm-hazop-table-wrap">
                    <table className="psm-hazop-table">
                      <thead>
                        <tr>
                          <th style={{ width: '13%' }}>Guideword / Deviation</th>
                          <th style={{ width: '20%' }}>Potential Causes</th>
                          <th style={{ width: '22%' }}>Consequences</th>
                          <th style={{ width: '18%' }}>Existing Safeguards</th>
                          <th style={{ width: '8%', textAlign: 'center' }}>Initial Risk</th>
                          <th style={{ width: '22%' }}>Safety Recommendations</th>
                          <th style={{ width: '8%', textAlign: 'center' }}>Residual Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div style={{ fontWeight: '800', color: 'var(--primary-main)', fontSize: '0.95rem', marginBottom: '4px' }}>
                              {currentHazop.guideword}
                            </div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                              {currentHazop.deviation}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              ID: {currentHazop.id}
                            </div>
                          </td>
                          <td>
                            <div style={{ whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>
                              {currentHazop.causes}
                            </div>
                          </td>
                          <td>
                            <div style={{ color: '#b91c1c', fontWeight: '500', marginBottom: '6px' }}>
                              {currentHazop.consequences}
                            </div>
                          </td>
                          <td>
                            <div style={{ whiteSpace: 'pre-line', color: '#15803d', fontWeight: '500' }}>
                              {currentHazop.safeguards}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className={`psm-risk-badge ${currentHazop.initialCategory === 'EXTREME' ? 'psm-risk-extreme' : currentHazop.initialCategory === 'HIGH' ? 'psm-risk-high' : 'psm-risk-medium'}`}>
                              <span>S{currentHazop.initialSeverity} × L{currentHazop.initialLikelihood}</span>
                              <span style={{ fontSize: '1rem', fontWeight: '900' }}>{currentHazop.initialScore}</span>
                              <span style={{ fontSize: '0.65rem' }}>{currentHazop.initialCategory}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                              {currentHazop.recommendations}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              <span>👤 Assignee: <strong>{currentHazop.assignee}</strong></span>
                              <span>🎯 Target SIL: <strong style={{ color: 'var(--primary-main)' }}>{currentHazop.targetSil}</strong></span>
                              <span>📅 Due: <strong>{currentHazop.dueDate}</strong></span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="psm-risk-badge psm-risk-low">
                              <span>S{currentHazop.residualSeverity} × L{currentHazop.residualLikelihood}</span>
                              <span style={{ fontSize: '1rem', fontWeight: '900' }}>{currentHazop.residualScore}</span>
                              <span style={{ fontSize: '0.65rem' }}>LOW</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>💡 Tip: Click different deviation buttons above to see how causes, safeguards, and risk matrices dynamically refresh.</span>
                    <span style={{ fontWeight: '600', color: 'var(--success)' }}>✓ Audit Ready: ISO 19119 & CCPS Compliant</span>
                  </div>
                </div>
              )}

              {/* TAB 2: LOPA & SIL CALCULATOR */}
              {activeSimTab === 'lopa' && (
                <div className="psm-lopa-container">
                  <div className="psm-sim-meta-strip">
                    <div className="psm-sim-meta-title">
                      <span>🛡️ High-Consequence Scenario:</span>
                      <span style={{ color: 'var(--primary-main)' }}>Exothermic Runaway in Reactor R-101 due to Loss of Quench Oil</span>
                    </div>
                    <div className="psm-sim-meta-pills">
                      <span className="psm-pill psm-pill-orange">Consequence: Catastrophic Vessel Rupture</span>
                      <span className="psm-pill psm-pill-blue">Target Frequency: 1.0 × 10⁻⁵ /yr</span>
                    </div>
                  </div>

                  {/* LOPA Header Metrics */}
                  <div className="psm-lopa-header-grid">
                    <div className="psm-lopa-box">
                      <div className="psm-lopa-box-label">Initiating Event (IE)</div>
                      <div className="psm-lopa-box-val" style={{ fontSize: '0.98rem' }}>Quench Pump P-102A Trip + Standby P-102B fail to auto-start</div>
                      <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Initiating Frequency (F_IE): <strong style={{ color: 'var(--primary-main)' }}>0.1 /year (1.0 × 10⁻¹)</strong>
                      </div>
                    </div>

                    <div className="psm-lopa-box">
                      <div className="psm-lopa-box-label">Corporate Tolerable Risk Target</div>
                      <div className="psm-lopa-box-val" style={{ color: '#10b981' }}>1.0 × 10⁻⁵ events / yr</div>
                      <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Criteria: CCPS & IEC 61511 Category 5 Severity
                      </div>
                    </div>

                    <div className="psm-lopa-box">
                      <div className="psm-lopa-box-label">Mitigated Consequence Frequency</div>
                      <div className="psm-lopa-box-val" style={{ color: 'var(--primary-main)' }}>1.0 × 10⁻⁵ events / yr</div>
                      <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#10b981', fontWeight: '700' }}>
                        ✓ Meets Risk Tolerability Criteria
                      </div>
                    </div>
                  </div>

                  {/* Independent Protection Layers (IPLs) Table */}
                  <table className="psm-lopa-ipl-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Independent Protection Layer (IPL)</th>
                        <th style={{ width: '42%' }}>Technical Safeguard Description</th>
                        <th style={{ width: '15%' }}>Probability of Failure on Demand (PFD)</th>
                        <th style={{ width: '15%' }}>Verification Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lopaIpls.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.ipl}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{item.desc}</td>
                          <td style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--primary-main)' }}>{item.pfd}</td>
                          <td><span className="psm-pill psm-pill-green">{item.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* SIL Target Summary Banner */}
                  <div className="psm-lopa-summary-banner">
                    <div>
                      <div style={{ fontSize: '0.82rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                        Safety Instrumented Function (SIF-102) Requirement
                      </div>
                      <div className="psm-lopa-sil-target">
                        <span>🎯 Required Safety Integrity Level:</span>
                        <span style={{ background: '#38bdf8', color: '#0f172a', padding: '3px 12px', borderRadius: '8px', fontSize: '1.4rem' }}>SIL 2</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>
                        Risk Reduction Factor (RRF): 100 • Target PFDavg: 0.010 • Verified against IEC 61508 / 61511 Standards
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowDemoModal(true)}
                      style={{ background: '#ffffff', color: '#0f172a', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      Export LOPA Report &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: 7-STAGE MOC PIPELINE */}
              {activeSimTab === 'moc' && (
                <div className="psm-moc-pipeline">
                  <div className="psm-sim-meta-strip">
                    <div className="psm-sim-meta-title">
                      <span>🔄 Facility Change Ticket:</span>
                      <span style={{ color: 'var(--primary-main)' }}>MOC-2026-089: Mechanical Seal Upgrade on Feed Pump P-101 to Plan 53A Gas Barrier</span>
                    </div>
                    <div className="psm-sim-meta-pills">
                      <span className="psm-pill psm-pill-blue">Facility: Hydrotreater Unit 04</span>
                      <span className="psm-pill psm-pill-orange">Change Type: Permanent</span>
                      <span className="psm-pill psm-pill-green">Current Stage: 6 (PSSR Review)</span>
                    </div>
                  </div>

                  {/* 7 Interactive Stage Buttons */}
                  <div className="psm-moc-stepper">
                    {mocStages.map(st => (
                      <div 
                        key={st.num}
                        className={`psm-moc-step ${st.status} ${activeMocStage === st.num ? 'active' : ''}`}
                        onClick={() => setActiveMocStage(st.num)}
                      >
                        <div className="psm-moc-circle">
                          {st.status === 'completed' ? '✓' : st.num}
                        </div>
                        <div className="psm-moc-title">Stage {st.num}: {st.title}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {st.status === 'completed' ? 'Completed' : st.status === 'current' ? 'In Progress' : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Active Stage Details Card */}
                  {(() => {
                    const st = mocStages.find(s => s.num === activeMocStage) || mocStages[0];
                    return (
                      <div className="psm-moc-stage-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <span className="psm-pill psm-pill-blue" style={{ marginRight: '8px' }}>Stage {st.num} of 7</span>
                            <h3 style={{ display: 'inline', fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                              {st.title} &mdash; {st.subtitle}
                            </h3>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span>Author/Signer: <strong>{st.author}</strong></span>
                            <span>Date: <strong>{st.date}</strong></span>
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '10px', padding: '18px', whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '16px' }}>
                          {st.details}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                            Status Classification: <strong style={{ color: 'var(--primary-main)' }}>{st.category}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => setActiveMocStage(Math.max(1, activeMocStage - 1))}
                              disabled={activeMocStage === 1}
                              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--divider)', background: 'var(--bg-paper)', cursor: activeMocStage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                            >
                              &larr; Previous Stage
                            </button>
                            <button 
                              onClick={() => setActiveMocStage(Math.min(7, activeMocStage + 1))}
                              disabled={activeMocStage === 7}
                              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'var(--primary-main)', color: '#fff', cursor: activeMocStage === 7 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: '700' }}
                            >
                              Next Stage &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 4: BOWTIE RISK VISUALIZER */}
              {activeSimTab === 'bowtie' && (
                <div>
                  <div className="psm-sim-meta-strip">
                    <div className="psm-sim-meta-title">
                      <span>🎀 Major Accident Hazard BowTie:</span>
                      <span style={{ color: 'var(--primary-main)' }}>High Pressure Hydrocarbon Hydrotreater Loop (85 barg, 380°C)</span>
                    </div>
                    <div className="psm-sim-meta-pills">
                      <span className="psm-pill psm-pill-orange">Prevention Barriers: 5 Active</span>
                      <span className="psm-pill psm-pill-green">Mitigation Barriers: 4 Active</span>
                    </div>
                  </div>

                  <div className="psm-bowtie-board">
                    {/* Left: Threats & Prevention Barriers */}
                    <div className="psm-bowtie-column">
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        &larr; Threat Scenarios & Prevention Barriers
                      </div>

                      <div className="psm-bowtie-card">
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#b91c1c' }}>Threat 1: Overpressure via Feed Valve Failure</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          PCV-102 fails closed causing immediate pressure build-up from upstream feed charge pump.
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ High-Pressure ESD Trip Loop (SIL-2)</span>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ Dual PSV Relief Valves (PSV-102A/B)</span>
                        </div>
                      </div>

                      <div className="psm-bowtie-card">
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#b91c1c' }}>Threat 2: Internal Sulfidation & Corrosion</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          High temperature H2/H2S naphthenic acid attack thinning pipe walls at bends.
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ Stainless Steel Cladding 347H</span>
                          <span className="psm-barrier-chip psm-barrier-degraded">⚡ Semi-Annual Ultrasonic UT Wall Scans</span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Top Event */}
                    <div className="psm-bowtie-top-event">
                      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: '700', marginBottom: '8px' }}>
                        TOP EVENT (LOSS OF CONTAINMENT)
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', lineHeight: '1.3' }}>
                        LOSS OF PRIMARY CONTAINMENT (LOPC)
                      </div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '8px' }}>
                        Pressurized Release of Flammable Gas Oil & Hydrogen at 380°C
                      </div>
                    </div>

                    {/* Right: Consequences & Mitigation Barriers */}
                    <div className="psm-bowtie-column">
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Consequences & Mitigation Barriers &rarr;
                      </div>

                      <div className="psm-bowtie-card">
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>Consequence 1: Major Jet Fire & Structural Collapse</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Immediate auto-ignition causing severe thermal radiation impingement on steel columns.
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ Automated Deluge Water Spray</span>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ Passive Fireproofing on Steel</span>
                        </div>
                      </div>

                      <div className="psm-bowtie-card">
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>Consequence 2: Toxic H2S Gas Dispersion</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Sour gas cloud migration across boundary fence line towards neighboring residential units.
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ Optical Open-Path Toxic Detectors</span>
                          <span className="psm-barrier-chip psm-barrier-healthy">✓ Automated Plant Evacuation Siren</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ACTION TRACKING HUB */}
              {activeSimTab === 'actions' && (
                <div>
                  <div className="psm-sim-meta-strip">
                    <div className="psm-sim-meta-title">
                      <span>✅ Centralized Action Items & Recommendations Hub</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="text"
                        placeholder="Search actions, assignees, IDs..."
                        value={actionSearch}
                        onChange={(e) => setActionSearch(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.85rem', width: '220px' }}
                      />
                      <select 
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--divider)', fontSize: '0.85rem' }}
                      >
                        <option value="ALL">All Items</option>
                        <option value="CRITICAL">Critical Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="CLOSED">Closed & Verified</option>
                      </select>
                    </div>
                  </div>

                  <div className="psm-actions-table-wrap">
                    <table className="psm-actions-table">
                      <thead>
                        <tr>
                          <th style={{ width: '12%' }}>Action ID</th>
                          <th style={{ width: '10%' }}>Module</th>
                          <th style={{ width: '12%' }}>Priority</th>
                          <th style={{ width: '36%' }}>Corrective Recommendation</th>
                          <th style={{ width: '15%' }}>Responsible Owner</th>
                          <th style={{ width: '15%' }}>Status & Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActions.map(act => (
                          <tr key={act.id}>
                            <td style={{ fontWeight: '800', color: 'var(--primary-main)', fontSize: '0.85rem' }}>{act.id}</td>
                            <td><span className="psm-pill psm-pill-blue">{act.module}</span></td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                background: act.priority === 'CRITICAL' ? '#fee2e2' : act.priority === 'HIGH' ? '#ffedd5' : '#fef9c3',
                                color: act.priority === 'CRITICAL' ? '#b91c1c' : act.priority === 'HIGH' ? '#c2410c' : '#854d0e'
                              }}>
                                {act.priority}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{act.title}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>👤 {act.assignee}</td>
                            <td>
                              <span className={`psm-status-pill ${act.status === 'IN PROGRESS' ? 'psm-status-in-progress' : act.status === 'CLOSED' ? 'psm-status-closed' : 'psm-status-open'}`}>
                                {act.status === 'CLOSED' ? '✓ Closed' : act.status === 'IN PROGRESS' ? `⚡ ${act.progress}% Done` : '⏳ Open'}
                              </span>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Target: {act.due}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: EXECUTIVE DASHBOARD */}
              {activeSimTab === 'dashboard' && (
                <div>
                  <div className="psm-sim-meta-strip">
                    <div className="psm-sim-meta-title">
                      <span>📊 Executive PSM Health & Regulatory Compliance Overview</span>
                    </div>
                    <div className="psm-sim-meta-pills">
                      <span className="psm-pill psm-pill-green">Facility Status: 100% Audit Ready</span>
                      <span className="psm-pill psm-pill-blue">Active Studies: 14 Facilities</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="psm-lopa-box" style={{ textAlign: 'center' }}>
                      <div className="psm-lopa-box-label">Total PHA Nodes Analyzed</div>
                      <div className="psm-metric-number" style={{ fontSize: '2.2rem' }}>186</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Across 14 continuous processing units</div>
                    </div>
                    <div className="psm-lopa-box" style={{ textAlign: 'center' }}>
                      <div className="psm-lopa-box-label">Extreme & High Risks Identified</div>
                      <div className="psm-metric-number" style={{ fontSize: '2.2rem', color: '#b91c1c' }}>32</div>
                      <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>100% Assigned to SIL-2/3 Safeguards</div>
                    </div>
                    <div className="psm-lopa-box" style={{ textAlign: 'center' }}>
                      <div className="psm-lopa-box-label">Action Resolution Rate</div>
                      <div className="psm-metric-number" style={{ fontSize: '2.2rem', color: '#10b981' }}>94.2%</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>284 of 302 safety items resolved</div>
                    </div>
                    <div className="psm-lopa-box" style={{ textAlign: 'center' }}>
                      <div className="psm-lopa-box-label">Average MOC Cycle Time</div>
                      <div className="psm-metric-number" style={{ fontSize: '2.2rem', color: 'var(--primary-main)' }}>8.4 d</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Down from 34 days with paper MOC</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', borderRadius: '12px', padding: '24px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '14px', color: 'var(--text-primary)' }}>
                      Regulatory Compliance Checklist (OSHA 1910.119 & CCPS Alignment)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Element 2: Process Safety Information (PSI) Synchronized
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Element 5: Process Hazard Analysis (PHA) 5-Year Revalidated
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Element 7: Pre-Startup Safety Review (PSSR) Enforced
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Element 8: Mechanical Integrity (MI) Inspection Schedules
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Element 10: Management of Change (MOC) 7-Stage Audit Trail
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Element 13: Compliance Audits & Historical Baseline Compare
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================================
            5. Interactive 5x5 Risk Matrix Explorer Section
            ==================================================================== */}
        <section id="matrix" className="psm-section psm-matrix-section" aria-label="Interactive 5x5 Risk Matrix Explorer">
          <div className="psm-section-header">
            <div className="psm-section-tag">Interactive Risk Engine</div>
            <h2 className="psm-section-title">Explore the 5x5 Risk Assessment Matrix</h2>
            <p className="psm-section-subtitle">
              Click any cell in the 5x5 matrix below to see how PS-MagnaShield calculates risk rankings, classifies scenario severity, and dictates required corporate safeguards.
            </p>
          </div>

          <div className="psm-matrix-layout">
            <div className="psm-matrix-grid-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                <span>&uarr; SEVERITY (1 to 5)</span>
                <span>LIKELIHOOD (1 to 5) &rarr;</span>
              </div>

              <table className="psm-matrix-table">
                <tbody>
                  {[5, 4, 3, 2, 1].map(s => (
                    <tr key={s}>
                      <td style={{ width: '120px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-secondary)', paddingRight: '10px', textAlign: 'right' }}>
                        {s === 5 ? '5 - Catastrophic' : s === 4 ? '4 - Major' : s === 3 ? '3 - Moderate' : s === 2 ? '2 - Minor' : '1 - Insignificant'}
                      </td>
                      {[1, 2, 3, 4, 5].map(l => {
                        const cell = getMatrixCellData(s, l);
                        const isSelected = selectedMatrixCell.s === s && selectedMatrixCell.l === l;
                        return (
                          <td 
                            key={l}
                            className={`psm-matrix-cell ${cell.css} ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedMatrixCell({ s, l })}
                            title={`Severity ${s} × Likelihood ${l} = ${cell.score} (${cell.category})`}
                          >
                            {cell.score}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td></td>
                    {[1, 2, 3, 4, 5].map(l => (
                      <td key={l} style={{ textAlign: 'center', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', paddingTop: '8px' }}>
                        L{l}<br />
                        <span style={{ fontSize: '0.68rem', fontWeight: 'normal' }}>
                          {l === 1 ? 'Rare' : l === 2 ? 'Unlikely' : l === 3 ? 'Possible' : l === 4 ? 'Likely' : 'Frequent'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#fca5a5' }}></span> Extreme (15-25)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#fdba74' }}></span> High (10-14)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#fde047' }}></span> Medium (5-9)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#86efac' }}></span> Low (1-4)
                </span>
              </div>
            </div>

            {/* Matrix Detail Card */}
            <div className="psm-matrix-detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span className="psm-pill psm-pill-blue">Selected Matrix Cell</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                    Severity {selectedMatrixCell.s} &times; Likelihood {selectedMatrixCell.l} = Score {activeMatrixData.score}
                  </div>
                </div>
                <div className={`psm-risk-badge ${activeMatrixData.css.replace('psm-m-', 'psm-risk-')}`} style={{ padding: '8px 16px', fontSize: '0.95rem' }}>
                  <span>{activeMatrixData.category}</span>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Typical Industrial Scenario
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5', background: 'var(--bg-paper)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--divider)' }}>
                  {activeMatrixData.scenario}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Mandatory PSM Action Protocol
                </div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.6', background: 'var(--bg-paper)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--divider)' }}>
                  {activeMatrixData.action}
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Configurable for 4x4, 5x5, or 6x6 corporate matrices
                </span>
                <a href="#simulator" style={{ color: 'var(--primary-main)', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Test in HAZOP Simulator &rarr;
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            6. Core Process Safety Modules Section
            ==================================================================== */}
        <section id="modules" className="psm-section" aria-label="Core PSM Modules">
          <div className="psm-section-header">
            <div className="psm-section-tag">Integrated Safety Suite</div>
            <h2 className="psm-section-title">Comprehensive Process Safety Modules</h2>
            <p className="psm-section-subtitle">
              Replace fragmented spreadsheets with an interconnected cloud platform covering every stage of the process safety lifecycle.
            </p>
          </div>

          <div className="psm-modules-grid">
            {/* Module 1: PHA & HAZOP */}
            <article className="psm-module-card">
              <span className="psm-module-badge">PHA / HAZOP</span>
              <h3 className="psm-module-title">Process Hazard Analysis & HAZOP</h3>
              <p className="psm-module-desc">
                Conduct systematic HAZOP, What-If, and FMEA studies with structured P&ID node segmentation, standardized CCPS guidewords, causes, consequences, safeguards, and automated risk scoring.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Configurable risk matrices (5x5, 4x4, 6x6) with auto-ranking</li>
                <li><span className="psm-module-bullet-check">✓</span> Built-in deviation libraries (Flow, Pressure, Temp, Level, Phase)</li>
                <li><span className="psm-module-bullet-check">✓</span> Dynamic column visibility & custom taxonomy tagging</li>
              </ul>
            </article>

            {/* Module 2: LOPA */}
            <article className="psm-module-card">
              <span className="psm-module-badge">LOPA & SIL</span>
              <h3 className="psm-module-title">Layer of Protection Analysis</h3>
              <p className="psm-module-desc">
                Evaluate high-consequence scenarios with mathematical rigor. Define initiating event frequencies, credit qualified Independent Protection Layers (IPLs), and determine required target SIL ratings.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Direct 1-click import of extreme scenarios from HAZOP</li>
                <li><span className="psm-module-bullet-check">✓</span> PFD credits for qualifying IPLs (BPCS, Alarms, Relief Valves, SIF)</li>
                <li><span className="psm-module-bullet-check">✓</span> Safety Integrity Level (SIL 1 to SIL 4) allocation per IEC 61511</li>
              </ul>
            </article>

            {/* Module 3: MOC */}
            <article className="psm-module-card">
              <span className="psm-module-badge">MOC LIFECYCLE</span>
              <h3 className="psm-module-title">Management of Change Workflow</h3>
              <p className="psm-module-desc">
                Enforce OSHA-compliant change governance through an automated 7-stage approval pipeline: Initiation, Area Head screening, Review Groups, Project Manager budgeting, Site Head sign-off, PSSR, and Closure.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Multi-tier role authorizations & automated notification routing</li>
                <li><span className="psm-module-bullet-check">✓</span> Pre-Startup Safety Review (PSSR) interactive inspection checklists</li>
                <li><span className="psm-module-bullet-check">✓</span> Change classification (Permanent, Temporary, Emergency)</li>
              </ul>
            </article>

            {/* Module 4: BowTie */}
            <article className="psm-module-card">
              <span className="psm-module-badge">BOWTIE ANALYSIS</span>
              <h3 className="psm-module-title">Interactive BowTie Risk Diagrams</h3>
              <p className="psm-module-desc">
                Visualize hazardous scenarios from root causes to potential consequences with barrier diagrams linking threats, prevention barriers, central loss of containment events, and mitigation controls.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Prevention & mitigation barrier health tracking</li>
                <li><span className="psm-module-bullet-check">✓</span> Direct linkage to HAZOP safeguards & LOPA credits</li>
                <li><span className="psm-module-bullet-check">✓</span> Degradation factor & critical safety device management</li>
              </ul>
            </article>

            {/* Module 5: Action Tracking */}
            <article className="psm-module-card">
              <span className="psm-module-badge">ACTION ITEMS</span>
              <h3 className="psm-module-title">Safety Recommendations Hub</h3>
              <p className="psm-module-desc">
                Centralize every safety recommendation from HAZOP, LOPA, MOC, and compliance audits in a unified tracker with assignees, due dates, automated email escalation, and verification sign-offs.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Cross-study action item aggregation & search filters</li>
                <li><span className="psm-module-bullet-check">✓</span> Priority indicators (Critical, High, Medium) with overdue alerts</li>
                <li><span className="psm-module-bullet-check">✓</span> Two-step completion verification & evidence upload</li>
              </ul>
            </article>

            {/* Module 6: Study Governance */}
            <article className="psm-module-card">
              <span className="psm-module-badge">GOVERNANCE & MOM</span>
              <h3 className="psm-module-title">Minutes of Meeting & Revisions</h3>
              <p className="psm-module-desc">
                Maintain an audit-proof log of study sessions, attendance records with digital signatures, study revision freezing, redline baseline comparisons, and centralized engineering document storage.
              </p>
              <ul className="psm-module-bullets">
                <li><span className="psm-module-bullet-check">✓</span> Digital attendance sheets & team member qualification logs</li>
                <li><span className="psm-module-bullet-check">✓</span> Study revision freezing & baseline snapshot comparison</li>
                <li><span className="psm-module-bullet-check">✓</span> Engineering document vault for P&IDs, PFDs, and MSDS sheets</li>
              </ul>
            </article>
          </div>
        </section>

        {/* ====================================================================
            7. Industry-Specific Solutions Section
            ==================================================================== */}
        <section id="industries" className="psm-section" style={{ background: 'var(--bg-paper)', borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }} aria-label="Industry Specific Solutions">
          <div className="psm-section-header">
            <div className="psm-section-tag">Tailored for High-Hazard Industries</div>
            <h2 className="psm-section-title">Engineered for Your Industrial Domain</h2>
            <p className="psm-section-subtitle">
              Select your industry below to explore how PS-MagnaShield addresses your specific regulatory standards, operating conditions, and study workflows.
            </p>
          </div>

          <div className="psm-industry-nav">
            <button 
              className={`psm-industry-btn ${activeIndustry === 'petro' ? 'active' : ''}`}
              onClick={() => setActiveIndustry('petro')}
            >
              🛢️ Petrochemicals & Refining
            </button>
            <button 
              className={`psm-industry-btn ${activeIndustry === 'chem' ? 'active' : ''}`}
              onClick={() => setActiveIndustry('chem')}
            >
              🧪 Specialty & Bulk Chemicals
            </button>
            <button 
              className={`psm-industry-btn ${activeIndustry === 'pharma' ? 'active' : ''}`}
              onClick={() => setActiveIndustry('pharma')}
            >
              💊 Pharmaceuticals & Biotech
            </button>
            <button 
              className={`psm-industry-btn ${activeIndustry === 'energy' ? 'active' : ''}`}
              onClick={() => setActiveIndustry('energy')}
            >
              ⚡ Hydrogen & Clean Energy
            </button>
          </div>

          <div className="psm-industry-content">
            <div>
              <span className="psm-pill psm-pill-blue" style={{ marginBottom: '12px', display: 'inline-block' }}>
                {currentIndData.tag}
              </span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '14px', color: 'var(--text-primary)' }}>
                {currentIndData.name}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: '1.6', marginBottom: '22px' }}>
                {currentIndData.desc}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentIndData.points.map((pt, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏭</div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '10px', color: 'var(--text-primary)' }}>
                Industry Proven Results
              </h4>
              <p style={{ fontSize: '1rem', color: 'var(--primary-main)', fontWeight: '700', marginBottom: '20px' }}>
                {currentIndData.stats}
              </p>
              <button 
                onClick={() => setShowDemoModal(true)}
                className="psm-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Request Domain Walkthrough &rarr;
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================================
            8. Regulatory Compliance Standards
            ==================================================================== */}
        <section id="compliance" className="psm-compliance-wrapper">
          <div className="psm-section" aria-label="Regulatory Compliance Standards">
            <div className="psm-section-header">
              <div className="psm-section-tag">Global Standards</div>
              <h2 className="psm-section-title">Built for Stringent Regulatory Mandates</h2>
              <p className="psm-section-subtitle">
                Ensure compliance across your facilities with frameworks aligned with international chemical, oil, and process engineering standards.
              </p>
            </div>

            <div className="psm-compliance-grid">
              <div className="psm-compliance-card">
                <h3>OSHA 29 CFR 1910.119</h3>
                <p>Meets all 14 elements of OSHA’s Process Safety Management standard, including 5-year PHA revalidation, operating procedure reviews, and structured MOC documentation.</p>
                <ul className="psm-compliance-points">
                  <li>• Section (e): Process Hazard Analysis</li>
                  <li>• Section (l): Management of Change</li>
                  <li>• Section (i): Pre-Startup Safety Review</li>
                </ul>
              </div>

              <div className="psm-compliance-card">
                <h3>CCPS Risk Based Safety</h3>
                <p>Aligned with the Center for Chemical Process Safety (CCPS) 20-element Risk Based Process Safety guidelines for hazard identification and risk control.</p>
                <ul className="psm-compliance-points">
                  <li>• Pillar 2: Understand Hazards and Risk</li>
                  <li>• Pillar 3: Manage Risk & MOC</li>
                  <li>• Pillar 4: Learn from Process Experience</li>
                </ul>
              </div>

              <div className="psm-compliance-card">
                <h3>IEC 61508 / 61511</h3>
                <p>Supports functional safety lifecycle compliance, Safety Instrumented Functions (SIF), Safety Integrity Level (SIL 1-4) target allocation, and PFD calculations.</p>
                <ul className="psm-compliance-points">
                  <li>• Clause 8: Safety Requirements Allocation</li>
                  <li>• Clause 9: SIS Risk Reduction Determination</li>
                  <li>• Clause 16: SIS Proof Testing Tracking</li>
                </ul>
              </div>

              <div className="psm-compliance-card">
                <h3>EPA RMP & ISO 45001</h3>
                <p>Facilitates Environmental Protection Agency (EPA) Risk Management Program (40 CFR Part 68) reporting and ISO 45001 occupational safety governance.</p>
                <ul className="psm-compliance-points">
                  <li>• Offsite Consequence Hazard Mapping</li>
                  <li>• Continuous Risk Register Auditing</li>
                  <li>• Corporate Governance Exports</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            9. Spreadsheet vs PS-MagnaShield Comparison Section
            ==================================================================== */}
        <section id="features" className="psm-section" aria-label="Feature Comparison">
          <div className="psm-section-header">
            <div className="psm-section-tag">Why Switch?</div>
            <h2 className="psm-section-title">Why Engineering Teams Choose PS-MagnaShield Over Excel</h2>
            <p className="psm-section-subtitle">
              Spreadsheets introduce broken formulas, fragmented file copies, and severe compliance vulnerabilities. PS-MagnaShield brings enterprise confidence.
            </p>
          </div>

          <div className="psm-comparison-table-wrap">
            <table className="psm-comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Platform Capability</th>
                  <th style={{ width: '31%' }}>Spreadsheets / Excel / Standalone Files</th>
                  <th style={{ width: '31%', color: 'var(--primary-main)' }}>PS-MagnaShield Cloud Platform</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Multi-User Real-time Collaboration</strong></td>
                  <td><span className="psm-feat-cross">✕ Manual copy merging & overwritten cells</span></td>
                  <td><span className="psm-feat-check">✓ Cloud-native with live scribing & RBAC roles</span></td>
                </tr>
                <tr>
                  <td><strong>Dynamic Risk Matrix Calculation</strong></td>
                  <td><span className="psm-feat-cross">✕ Broken formulas & inconsistent scoring</span></td>
                  <td><span className="psm-feat-check">✓ Automated residual risk scoring & tolerability check</span></td>
                </tr>
                <tr>
                  <td><strong>Integrated LOPA & SIL Verification</strong></td>
                  <td><span className="psm-feat-cross">✕ Disconnected sheets with no traceability</span></td>
                  <td><span className="psm-feat-check">✓ 1-click scenario sync from HAZOP to LOPA</span></td>
                </tr>
                <tr>
                  <td><strong>7-Stage Management of Change (MOC)</strong></td>
                  <td><span className="psm-feat-cross">✕ Untracked emails, paper forms & missed reviews</span></td>
                  <td><span className="psm-feat-check">✓ Automated multi-stage approval workflow with PSSR</span></td>
                </tr>
                <tr>
                  <td><strong>Centralized Action Items & Due Dates</strong></td>
                  <td><span className="psm-feat-cross">✕ Stale and forgotten recommendations</span></td>
                  <td><span className="psm-feat-check">✓ Live tracking hub with owners & overdue alerts</span></td>
                </tr>
                <tr>
                  <td><strong>Audit-Ready PDF & Excel Reports</strong></td>
                  <td><span className="psm-feat-cross">✕ Hours spent reformatting print ranges</span></td>
                  <td><span className="psm-feat-check">✓ 1-click corporate exports with executive summaries</span></td>
                </tr>
                <tr>
                  <td><strong>Baseline Revisions & Redline Compare</strong></td>
                  <td><span className="psm-feat-cross">✕ Impossible to track who modified what row</span></td>
                  <td><span className="psm-feat-check">✓ Version freezing, revision history & user audit logs</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ====================================================================
            10. Transparent Subscription Pricing
            ==================================================================== */}
        <section id="pricing" className="psm-section" aria-label="Subscription Plans">
          <div className="psm-section-header">
            <div className="psm-section-tag">Transparent Pricing</div>
            <h2 className="psm-section-title">Select Your Subscription Plan</h2>
            <p className="psm-section-subtitle">
              Scale safely from single-unit plants to multi-site global enterprises. All plans include automated cloud backups and enterprise security.
            </p>

            {/* Universal Billing Toggle */}
            <div style={{ display: 'inline-flex', background: 'var(--bg-paper)', border: '1px solid var(--divider)', borderRadius: '30px', padding: '4px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setBillingGlobal('Annual')}
                style={{
                  padding: '8px 22px',
                  borderRadius: '24px',
                  border: 'none',
                  background: billingGlobal === 'Annual' ? 'var(--primary-main)' : 'transparent',
                  color: billingGlobal === 'Annual' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Annual Billing (Save 20%)
              </button>
              <button
                type="button"
                onClick={() => setBillingGlobal('One-time')}
                style={{
                  padding: '8px 22px',
                  borderRadius: '24px',
                  border: 'none',
                  background: billingGlobal === 'One-time' ? '#00a896' : 'transparent',
                  color: billingGlobal === 'One-time' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                One-Time / Lifetime License
              </button>
            </div>
          </div>

          <div className="psm-pricing-grid">
            {packages.map((pkg, idx) => {
              const hasAnnual = pkg.hasAnnual !== undefined ? pkg.hasAnnual : (pkg.billingCycle !== 'One-time');
              const hasOneTime = pkg.hasOneTime !== undefined ? pkg.hasOneTime : (pkg.billingCycle === 'One-time');
              const currentBilling = getPackageBilling(pkg);
              const currentPrice = getPackagePrice(pkg, currentBilling);
              const allFeatures = ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT'];
              const isPopular = pkg.name.toLowerCase().includes('enterprise') || pkg.name.toLowerCase().includes('lopa') || idx === 1;

              const getFeatureLabel = (f) => {
                if (f === 'PHA') return 'HAZOP / PHA';
                if (f === 'BOWTIE') return 'BowTie Analysis';
                if (f === 'INCIDENT') return 'Incident Investigation';
                if (f === 'LOPA') return 'LOPA & SIL';
                if (f === 'MOC') return '7-Stage MOC';
                return f;
              };

              return (
                <div key={pkg._id} className={`psm-pricing-card ${isPopular ? 'featured' : ''}`}>
                  {isPopular && (
                    <div className="psm-pricing-ribbon">Most Popular</div>
                  )}

                  <div style={{ padding: '36px 30px', borderBottom: '1px solid var(--divider)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.45rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                      {pkg.name}
                    </h3>
                    <p style={{ margin: '0 0 18px 0', fontSize: '0.86rem', color: 'var(--text-secondary)', minHeight: '38px', lineHeight: '1.4' }}>
                      {pkg.description || 'Full-featured process safety management module for engineering organizations.'}
                    </p>

                    {/* Per-card toggle if both options exist */}
                    {hasAnnual && hasOneTime && (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedBilling({ ...selectedBilling, [pkg._id]: 'Annual' })}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '16px',
                            border: currentBilling === 'Annual' ? '1.5px solid var(--primary-main)' : '1px solid var(--divider)',
                            background: currentBilling === 'Annual' ? 'rgba(37,99,235,0.1)' : 'transparent',
                            color: currentBilling === 'Annual' ? 'var(--primary-main)' : 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Annual
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBilling({ ...selectedBilling, [pkg._id]: 'One-time' })}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '16px',
                            border: currentBilling === 'One-time' ? '1.5px solid #00a896' : '1px solid var(--divider)',
                            background: currentBilling === 'One-time' ? 'rgba(0,168,150,0.1)' : 'transparent',
                            color: currentBilling === 'One-time' ? '#00a896' : 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          One-time
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '2.6rem', fontWeight: '800', color: currentBilling === 'One-time' ? '#00a896' : 'var(--primary-main)' }}>
                        ₹{currentPrice.toLocaleString('en-IN')}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.92rem' }}>
                        /{currentBilling === 'One-time' ? 'lifetime' : 'yr'}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          <strong>{pkg.maxProjects === -1 ? 'Unlimited' : pkg.maxProjects}</strong> Active Safety Studies
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          <strong>{pkg.maxUsers === -1 ? 'Unlimited' : pkg.maxUsers}</strong> Team Members (RBAC)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          Audit-Ready <strong>PDF & Excel Exports</strong>
                        </span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '26px', flex: 1 }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
                        Included Capabilities
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {allFeatures.map(feat => {
                          const isUnlocked = Array.isArray(pkg.features) && pkg.features.includes(feat);
                          return (
                            <span 
                              key={feat} 
                              style={{ 
                                backgroundColor: isUnlocked ? 'rgba(37,99,235,0.08)' : 'rgba(0,0,0,0.03)', 
                                color: isUnlocked ? 'var(--primary-main)' : '#94a3b8', 
                                border: isUnlocked ? '1px solid rgba(37,99,235,0.25)' : '1px dashed var(--divider)',
                                padding: '5px 10px', 
                                borderRadius: '16px', 
                                fontSize: '0.78rem', 
                                fontWeight: '700',
                                textDecoration: isUnlocked ? 'none' : 'line-through'
                              }}
                            >
                              {isUnlocked ? '✓ ' : '✕ '} {getFeatureLabel(feat)}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={() => handlePurchase(pkg)}
                      disabled={loadingRazorpay}
                      className="psm-btn-primary"
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        fontSize: '0.96rem', 
                        justifyContent: 'center',
                        cursor: loadingRazorpay ? 'not-allowed' : 'pointer', 
                        opacity: loadingRazorpay ? 0.7 : 1 
                      }}
                    >
                      {loadingRazorpay ? 'Please wait...' : `Get Started with ${pkg.name.split(' ')[0]}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Need an on-premises deployment, private cloud, or custom multi-site enterprise licensing?{' '}
              <button 
                onClick={() => setShowDemoModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary-main)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Contact our Solutions Engineering Team &rarr;
              </button>
            </p>
          </div>
        </section>

        {/* ====================================================================
            11. Frequently Asked Questions
            ==================================================================== */}
        <section id="faq" className="psm-section" aria-label="Frequently Asked Questions">
          <div className="psm-section-header">
            <div className="psm-section-tag">Got Questions?</div>
            <h2 className="psm-section-title">Frequently Asked Questions</h2>
            <p className="psm-section-subtitle">
              Learn how PS-MagnaShield improves study efficiency, ensures audit accuracy, and accelerates compliance verification.
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

        {/* ====================================================================
            12. Bottom CTA Banner
            ==================================================================== */}
        <section className="psm-cta-section" aria-label="Get Started Call to Action">
          <h2 className="psm-cta-title">Modernize Your Process Safety Workflows Today</h2>
          <p className="psm-cta-desc">
            Equip your engineering and safety personnel with modern cloud tools to identify hazards, mitigate risks, and maintain continuous 100% compliance.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#pricing" className="psm-btn-cta" style={{ textDecoration: 'none' }}>
              Get Started with PS-MagnaShield
            </a>
            <button 
              onClick={() => setShowDemoModal(true)} 
              className="psm-btn-cta" 
              style={{ background: 'transparent', color: '#ffffff', border: '2px solid #ffffff' }}
            >
              📅 Schedule Live Demo
            </button>
          </div>
        </section>
      </main>

      {/* ====================================================================
          13. Interactive Demo Booking Modal
          ==================================================================== */}
      {showDemoModal && (
        <div className="psm-modal-backdrop" onClick={() => setShowDemoModal(false)}>
          <div className="psm-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="psm-modal-close" onClick={() => setShowDemoModal(false)} aria-label="Close modal">
              &times;
            </button>

            {demoSubmitted ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🎉</div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Demo Request Confirmed!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  Thank you, <strong>{demoForm.name || 'Engineer'}</strong>! Our Senior Process Safety Consultant will contact you at <strong>{demoForm.email}</strong> within 2 business hours with calendar invites and access credentials.
                </p>
              </div>
            ) : (
              <div>
                <span className="psm-pill psm-pill-blue" style={{ marginBottom: '10px', display: 'inline-block' }}>
                  Live 1-on-1 Demonstration
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Schedule a PS-MagnaShield Walkthrough
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '22px' }}>
                  Experience a customized demonstration tailored to your plant units, P&IDs, and regulatory requirements.
                </p>

                <form onSubmit={handleDemoSubmit}>
                  <div className="psm-form-group">
                    <label className="psm-form-label">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="psm-form-input"
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    />
                  </div>

                  <div className="psm-form-group">
                    <label className="psm-form-label">Work Email *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="name@company.com"
                      className="psm-form-input"
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="psm-form-group">
                      <label className="psm-form-label">Company / Facility *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Petrochem Industries"
                        className="psm-form-input"
                        value={demoForm.company}
                        onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      />
                    </div>
                    <div className="psm-form-group">
                      <label className="psm-form-label">Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="+91 98765 43210"
                        className="psm-form-input"
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="psm-form-group">
                    <label className="psm-form-label">Industry Domain</label>
                    <select 
                      className="psm-form-select"
                      value={demoForm.industry}
                      onChange={(e) => setDemoForm({ ...demoForm, industry: e.target.value })}
                    >
                      <option value="Chemicals / Petrochemicals">Chemicals & Petrochemicals</option>
                      <option value="Oil & Gas Upstream / Downstream">Oil & Gas (Upstream / Downstream)</option>
                      <option value="Pharmaceuticals & Fine Chemicals">Pharmaceuticals & Fine Chemicals</option>
                      <option value="Hydrogen & Clean Energy">Hydrogen & Clean Energy</option>
                      <option value="Consulting & Safety Engineering">Process Safety Consultancy</option>
                    </select>
                  </div>

                  <div className="psm-form-group">
                    <label className="psm-form-label">Primary Modules of Interest</label>
                    <select 
                      className="psm-form-select"
                      value={demoForm.interest}
                      onChange={(e) => setDemoForm({ ...demoForm, interest: e.target.value })}
                    >
                      <option value="Full Suite">Full Enterprise PSM Suite (HAZOP + LOPA + MOC + BowTie)</option>
                      <option value="HAZOP + LOPA">HAZOP & LOPA SIL Verification</option>
                      <option value="7-Stage MOC">7-Stage Management of Change (MOC)</option>
                      <option value="BowTie">BowTie Risk Visualization</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="psm-btn-primary" 
                    style={{ width: '100%', padding: '13px', justifyContent: 'center', marginTop: '10px' }}
                  >
                    Confirm Live Demo Booking &rarr;
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          14. Semantic Enterprise Footer
          ==================================================================== */}
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
                  PS-Magna<span style={{ color: '#0ea5e9' }}>Shield</span>
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '340px' }}>
                Enterprise Process Safety Management, HAZOP, LOPA, MOC, and BowTie software built for chemical, manufacturing, and oil & gas facilities worldwide.
              </p>
              <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                <span className="psm-pill psm-pill-green">ISO 27001 Certified Cloud</span>
                <span className="psm-pill psm-pill-blue">SOC 2 Type II</span>
              </div>
            </div>

            <div className="psm-footer-col">
              <h4>Safety Modules</h4>
              <ul>
                <li><a href="#simulator">PHA & HAZOP Worksheet</a></li>
                <li><a href="#simulator">LOPA & SIL Allocation</a></li>
                <li><a href="#simulator">7-Stage MOC Pipeline</a></li>
                <li><a href="#simulator">BowTie Risk Diagrams</a></li>
                <li><a href="#simulator">Recommendations Hub</a></li>
              </ul>
            </div>

            <div className="psm-footer-col">
              <h4>Compliance Frameworks</h4>
              <ul>
                <li><a href="#compliance">OSHA 29 CFR 1910.119</a></li>
                <li><a href="#compliance">CCPS Risk Based Safety</a></li>
                <li><a href="#compliance">IEC 61508 / 61511</a></li>
                <li><a href="#compliance">EPA RMP 40 CFR Part 68</a></li>
                <li><a href="#compliance">NFPA & ISO 45001</a></li>
              </ul>
            </div>

            <div className="psm-footer-col">
              <h4>Platform & Support</h4>
              <ul>
                <li><a href="#matrix">5x5 Risk Matrix Explorer</a></li>
                <li><a href="#industries">Industry Solutions</a></li>
                <li><a href="#pricing">Subscription Pricing</a></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
                <li>
                  <button 
                    onClick={onLogin} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, font: 'inherit', fontSize: '0.9rem' }}
                  >
                    Workspace Sign In
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="psm-footer-bottom">
            <span>&copy; {new Date().getFullYear()} PS-MagnaShield. All rights reserved.</span>
            <span>Enterprise Process Safety Management (PSM) Operating System</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
