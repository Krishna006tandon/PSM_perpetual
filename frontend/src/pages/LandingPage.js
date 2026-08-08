import React, { useState, useEffect } from 'react';
import './PHAStartMenu.css';

const LandingPage = ({ onLogin, onCheckoutSuccess }) => {
  const [packages, setPackages] = useState([]);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);

  useEffect(() => {
    fetchPackages();
    loadRazorpayScript();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/public/packages');
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
    // Simply pass the package to the checkout auth modal
    onCheckoutSuccess(pkg);
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'white' }}>
      {/* Hero Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', borderBottom: '1px solid var(--divider, #eee)', background: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary, #00a896)' }}>Perpetual PSM</h1>
        <button onClick={onLogin} style={{ padding: '10px 24px', background: 'transparent', border: '2px solid var(--primary, #00a896)', color: 'var(--primary, #00a896)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Sign In</button>
      </div>

      <div className="hero-section" style={{ textAlign: 'center', padding: '120px 20px', width: '100%', background: 'radial-gradient(circle at top right, rgba(0,168,150,0.08) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(94,114,228,0.08) 0%, transparent 50%)', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '24px', color: '#1a1a2e', fontWeight: '800', lineHeight: '1.2' }}>
          <span className="text-gradient">Elevate Process Safety.</span> <br/> Empower Your Engineering Team.
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '40px' }}>
          The ultimate suite for HAZOP, LOPA, MOC, and PSSR. Conduct risk assessments faster, track action items effortlessly, and ensure absolute compliance across all your facilities.
        </p>
      </div>
    </div>

    {/* Pricing Section */}
      <div className="dashboard-content">
        <div className="dashboard-header" style={{ justifyContent: 'center', marginBottom: '40px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '40px', color: '#1a1a2e' }}>Select Your Subscription</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          {packages.map(pkg => (
            <div key={pkg._id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e1e4e8', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }}>
              
              <div style={{ padding: '30px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem', color: '#1a1a2e', fontWeight: '800' }}>{pkg.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '2.8rem', fontWeight: '900', color: '#00a896' }}>₹{(pkg.price).toLocaleString('en-IN')}</span>
                  <span style={{ color: '#666', fontWeight: '600' }}>/{pkg.billingCycle === 'One-time' ? 'one-time' : pkg.billingCycle === 'Yearly' ? 'yr' : 'mo'}</span>
                </div>
              </div>

              <div style={{ padding: '30px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,168,150,0.1)', color: '#00a896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                    <span style={{ color: '#4a4a68', fontWeight: '500' }}><strong>{pkg.maxProjects === -1 ? 'Unlimited' : pkg.maxProjects}</strong> Active Projects</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,168,150,0.1)', color: '#00a896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div>
                    <span style={{ color: '#4a4a68', fontWeight: '500' }}><strong>{pkg.maxUsers === -1 ? 'Unlimited' : pkg.maxUsers}</strong> Team Members</span>
                  </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Included Modules</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {pkg.features.map(f => (
                      <span key={f} style={{ background: 'rgba(0,168,150,0.1)', color: '#00a896', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handlePurchase(pkg)}
                  disabled={loadingRazorpay}
                  style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: loadingRazorpay ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,168,150,0.3)', opacity: loadingRazorpay ? 0.7 : 1 }}
                >
                  {loadingRazorpay ? 'Processing...' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer / Trust Section */}
      <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9fc', marginTop: '60px' }}>
        <h2 style={{ color: '#1a1a2e', marginBottom: '20px' }}>Trusted by Process Safety Leaders</h2>
        <p style={{ color: '#666' }}>Built for rigorous compliance standards and seamless engineering collaboration.</p>
      </div>
    </div>
  );
};

export default LandingPage;
