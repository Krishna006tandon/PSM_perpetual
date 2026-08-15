import React, { useState, useEffect } from 'react';

const LandingPage = ({ onLogin, onCheckoutSuccess }) => {
  const [packages, setPackages] = useState([]);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);

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
    } catch (e) { console.error(e); }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (pkg) => {
    onCheckoutSuccess(pkg);
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', backgroundColor: 'var(--bg-paper)', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary-main)' }}>Perpetual PSM</h1>
        <button onClick={onLogin} style={{ padding: '10px 28px', backgroundColor: 'transparent', border: '2px solid var(--primary-main)', color: 'var(--primary-main)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '1rem' }}
                onMouseOver={(e) => { e.target.style.backgroundColor = 'var(--primary-main)'; e.target.style.color = '#fff'; }}
                onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'var(--primary-main)'; }}>
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px', minHeight: '60vh', background: 'radial-gradient(circle at top right, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(59,130,246,0.08) 0%, transparent 50%)', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '4.5rem', marginBottom: '24px', fontWeight: '800', lineHeight: '1.1', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Elevate Process Safety.<br/>
            <span style={{ background: 'linear-gradient(135deg, var(--primary-main) 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Empower Your Engineering Team.
            </span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: '1.6' }}>
            The ultimate suite for HAZOP, LOPA, MOC, and PSSR. Conduct risk assessments faster, track action items effortlessly, and ensure absolute compliance across all your facilities.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '80px 20px', backgroundColor: 'var(--bg-default)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '60px', color: 'var(--text-primary)', fontWeight: '700' }}>Select Your Subscription</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', width: '100%', maxWidth: '1200px' }}>
          {packages.map(pkg => (
            <div key={pkg._id} style={{ backgroundColor: 'var(--bg-paper)', borderRadius: '16px', border: '1px solid var(--divider)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s ease', cursor: 'pointer' }}
                 onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                 onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}>
              
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
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>✓</div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}><strong>{pkg.maxProjects === -1 ? 'Unlimited' : pkg.maxProjects}</strong> Active Projects</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>✓</div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}><strong>{pkg.maxUsers === -1 ? 'Unlimited' : pkg.maxUsers}</strong> Team Members</span>
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Included Modules</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {pkg.features.map(f => (
                      <span key={f} style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-main)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handlePurchase(pkg)}
                  disabled={loadingRazorpay}
                  style={{ width: '100%', padding: '16px', backgroundColor: 'var(--primary-main)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '1rem', cursor: loadingRazorpay ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', opacity: loadingRazorpay ? 0.7 : 1 }}
                  onMouseOver={(e) => { if(!loadingRazorpay) e.currentTarget.style.backgroundColor = 'var(--primary-dark)'; }}
                  onMouseOut={(e) => { if(!loadingRazorpay) e.currentTarget.style.backgroundColor = 'var(--primary-main)'; }}>
                  {loadingRazorpay ? 'Please wait...' : 'Select Plan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Trust Section */}
      <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-paper)', borderTop: '1px solid var(--divider)', marginTop: '40px' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Trusted by Process Safety Leaders</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Built for rigorous compliance standards and seamless engineering collaboration.</p>
      </div>
    </div>
  );
};

export default LandingPage;
