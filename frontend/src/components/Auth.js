import React, { useState, useEffect } from 'react';

const API_URL = (process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in').replace(/\/$/, '');

const Auth = ({ 
  onAuthSuccess, 
  onCancel, 
  isCheckoutRegistration = false, 
  selectedPackage = null,
  isTrialRegistration = false,
  trialSettings = null,
  onOpenPlans = null
}) => {
  // Mode: 'LOGIN', 'CHECKOUT', 'TRIAL'
  const [authMode, setAuthMode] = useState(
    isTrialRegistration ? 'TRIAL' : (isCheckoutRegistration ? 'CHECKOUT' : 'LOGIN')
  );
  
  // Registration fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [contact, setContact] = useState('');
  const [numberOfUsers, setNumberOfUsers] = useState('1');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [authStep, setAuthStep] = useState('LOGIN'); // 'LOGIN', 'FORGOT_EMAIL'
  const [successMsg, setSuccessMsg] = useState('');

  const trialDays = trialSettings?.defaultTrialDays || 14;

  useEffect(() => {
    if (isTrialRegistration) {
      setAuthMode('TRIAL');
    } else if (isCheckoutRegistration) {
      setAuthMode('CHECKOUT');
    }
  }, [isCheckoutRegistration, isTrialRegistration]);

  const handleForgotSendLink = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password-link`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSuccessMsg(data.message);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const initiateRazorpayPayment = async (orderData) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!window.Razorpay) {
          await new Promise((res, rej) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = res;
            script.onerror = () => rej(new Error('Failed to load Razorpay SDK. Please check your internet connection.'));
            document.body.appendChild(script);
          });
        }

        const configRes = await fetch(`${API_URL}/api/payments/config`);
        const configData = await configRes.json();
        
        const options = {
          key: configData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'PS-MagnaShield',
          description: `Subscription: ${selectedPackage?.name || 'PSM'}`,
          order_id: orderData.id,
          handler: async function (response) {
            resolve(response);
          },
          theme: { color: '#0066cc' }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          reject(response.error.description);
        });
        rzp.open();
      } catch (err) {
        reject(err.message);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'TRIAL') {
        // FLOW: FREE TRIAL REGISTRATION (No Payment Required)
        const registerRes = await fetch(`${API_URL}/api/auth/register-trial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            name,
            companyName,
            companyAddress,
            contact,
            numberOfUsers: Number(numberOfUsers) || 1,
            password: password || undefined,
            packageId: selectedPackage?._id || undefined
          })
        });

        const data = await registerRes.json();
        if (!registerRes.ok) throw new Error(data.error || 'Free trial registration failed');

        alert(`🎉 Your ${data.user?.trialDays || trialDays}-day free trial has been activated! Welcome to Perpetual PSM.`);
        localStorage.setItem('token', data.token);
        if (data.user?.features) {
          localStorage.setItem('userFeatures', JSON.stringify(data.user.features));
        }
        onAuthSuccess(data.token);

      } else if (authMode === 'CHECKOUT' && selectedPackage) {
        // FLOW: REGISTRATION WITH PURCHASE
        const orderRes = await fetch(`${API_URL}/api/payments/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: selectedPackage.price, currency: 'INR' })
        });
        const orderData = await orderRes.json();

        const paymentResponse = await initiateRazorpayPayment(orderData);
        
        const registerRes = await fetch(`${API_URL}/api/auth/register-with-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            name,
            companyName,
            companyAddress,
            contact,
            numberOfUsers: Number(numberOfUsers) || 1,
            packageId: selectedPackage._id,
            billingType: selectedPackage.chosenBilling || selectedPackage.billingCycle || 'Annual',
            selectedFeatures: Array.isArray(selectedPackage.features) ? selectedPackage.features : ['PHA', 'MOC', 'LOPA', 'BOWTIE'],
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature
          })
        });
        
        const data = await registerRes.json();
        if (!registerRes.ok) throw new Error(data.error || 'Registration failed');
        
        alert("Payment successful! Your password has been emailed to you.");
        localStorage.setItem('token', data.token);
        if (data.user?.features) {
          localStorage.setItem('userFeatures', JSON.stringify(data.user.features));
        }
        onAuthSuccess(data.token);

      } else {
        // FLOW: STANDARD LOGIN
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
  
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Authentication failed');
  
        localStorage.setItem('token', data.token);
        onAuthSuccess(data.token);
      }
    } catch (err) {
      setError(err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' };
  const btnStyle = { padding: '16px', backgroundColor: 'var(--primary-main)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s ease', opacity: loading ? 0.7 : 1, width: '100%' };

  // ================= FREE TRIAL REGISTRATION MODAL =================
  if (authMode === 'TRIAL') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', zIndex: 10000, padding: '40px 20px', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: 'var(--bg-paper)', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '540px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid var(--divider)' }}>
          <button onClick={onCancel} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>&times;</button>
          
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', padding: '4px 12px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '700', display: 'inline-block', marginBottom: '10px' }}>
              🎁 No Credit Card Required
            </span>
            <h1 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.9rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              {selectedPackage ? `Try ${selectedPackage.name} Free` : `Start Your ${trialDays}-Day Free Trial`}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>
              {selectedPackage 
                ? `Evaluate ${selectedPackage.name} with full capabilities for ${trialDays} days. No payment required.` 
                : 'Experience all 14 PSM elements, HAZOP worksheets, LOPA, MOC, and BOW Tie without paying anything upfront.'}
            </p>
          </div>

          {error && <div style={{ backgroundColor: 'rgba(185, 28, 28, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Name *</label>
                <input type="text" data-spellcheck="false" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Petrochem" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Admin Full Name *</label>
                <input type="text" data-spellcheck="false" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Work Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Phone / Contact</label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="+91 9876543210" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Est. Team Size</label>
                <input type="number" min="1" value={numberOfUsers} onChange={e => setNumberOfUsers(e.target.value)} placeholder="4" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Set Password (or leave blank to auto-email)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Create password (optional)" 
                  style={{ ...inputStyle, width: '100%', paddingRight: '40px' }} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }} tabIndex="-1">
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Trial Unlocked Modules Highlight */}
            <div style={{ background: '#f0fdf4', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#166534', fontWeight: 'bold', fontSize: '0.9rem' }}>✨ Unlocked Trial Features:</span>
                <span style={{ color: '#15803d', fontWeight: '800', fontSize: '0.9rem' }}>{trialDays} Days Free</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['HAZOP / PHA', 'LOPA', 'MOC Workspaces', 'BOW Tie', 'Recommendations Hub'].map(m => (
                  <span key={m} style={{ background: '#ffffff', color: '#166534', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' }}>
                    ✓ {m}
                  </span>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ ...btnStyle, backgroundColor: '#00a896' }}
              onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#028090'; }}
              onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#00a896'; }}
            >
              {loading ? 'Activating Free Trial...' : `🚀 Start My ${trialDays}-Day Free Trial Now`}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '0.88rem' }}>
            <span 
              onClick={() => { setAuthMode('LOGIN'); setError(''); }} 
              style={{ color: 'var(--primary-main)', cursor: 'pointer', fontWeight: '600' }}
            >
              Already have an account? Sign In
            </span>
            {selectedPackage && (
              <span 
                onClick={() => { setAuthMode('CHECKOUT'); setError(''); }} 
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}
              >
                Go to Paid Checkout &rarr;
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= CHECKOUT REGISTRATION MODAL =================
  if (authMode === 'CHECKOUT' && selectedPackage) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', zIndex: 10000, padding: '60px 20px', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: 'var(--bg-paper)', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '540px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid var(--divider)' }}>
          <button onClick={onCancel} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>&times;</button>
          
          <h1 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '800', textAlign: 'center', letterSpacing: '-0.02em' }}>Checkout & Setup</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '0 0 24px 0', fontSize: '0.9rem' }}>
            Subscribe to <strong>{selectedPackage.name}</strong> or <span onClick={() => { setAuthMode('TRIAL'); setError(''); }} style={{ color: '#00a896', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>start a {trialDays}-day free trial first</span>.
          </p>

          {error && <div style={{ backgroundColor: 'rgba(185, 28, 28, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Enter company name" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Admin Username</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Admin username" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter company email" style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Address</label>
              <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} required placeholder="Enter company address" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Contact</label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} required placeholder="Contact info" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Number of Users</label>
                <input type="number" value={numberOfUsers} onChange={e => setNumberOfUsers(e.target.value)} required placeholder="# of users" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(59,130,246,0.05)', padding: '16px', borderRadius: '10px', border: '1px solid var(--primary-main)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '800' }}>{selectedPackage.name}</span>
                <span style={{ color: 'var(--primary-main)', fontSize: '1.1rem', fontWeight: '800' }}>
                  ₹{(selectedPackage.price).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Payment Plan:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedPackage.chosenBilling || selectedPackage.billingCycle || 'Annual'}</strong>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: 'var(--primary-main)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-md)', transition: 'background-color 0.2s ease', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Processing...' : `Pay ₹${(selectedPackage.price).toLocaleString('en-IN')} & Checkout`}
            </button>
            
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.4' }}>
              Your password will be securely generated and sent to<br/><strong>{email || 'your email'}</strong> after checkout.
            </p>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <span onClick={() => { setAuthMode('TRIAL'); setError(''); }} style={{ color: '#00a896', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold' }}>
                Prefer to try before buying? Start {trialDays}-Day Free Trial &rarr;
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ================= STANDARD SIGN IN / FORGOT PASSWORD =================
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'var(--bg-paper)', borderRadius: '16px', width: '100%', maxWidth: '440px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid var(--divider)', overflow: 'hidden' }}>
        <button onClick={onCancel} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', zIndex: 10 }}>&times;</button>
        
        {/* Animated Container */}
        <div style={{ display: 'flex', width: '200%', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: `translateX(-${['LOGIN', 'FORGOT_EMAIL'].indexOf(authStep) * 50}%)` }}>
          
          {/* STEP 1: LOGIN */}
          <div style={{ width: '50%', padding: '48px', boxSizing: 'border-box' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '24px', textAlign: 'center', fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Sign In</h2>
            {error && authStep === 'LOGIN' && <div style={{ backgroundColor: 'rgba(185, 28, 28, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}
            {successMsg && authStep === 'LOGIN' && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{successMsg}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ ...inputStyle, width: '100%', paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }} tabIndex="-1">
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: '8px' }}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span onClick={() => { setAuthStep('FORGOT_EMAIL'); setError(''); setSuccessMsg(''); }} style={{ color: 'var(--primary-main)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600' }}>
                Forgot Password?
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--divider)', marginTop: '24px', paddingTop: '16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                New organization evaluating PSM?
              </p>
              <button
                type="button"
                onClick={() => { setAuthMode('TRIAL'); setError(''); }}
                style={{
                  background: 'rgba(0, 168, 150, 0.1)',
                  color: '#00a896',
                  border: '1px solid #00a896',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🎁 Start {trialDays}-Day Free Trial
              </button>
            </div>
          </div>

          {/* STEP 2: FORGOT_EMAIL */}
          <div style={{ width: '50%', padding: '48px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <button onClick={() => { setAuthStep('LOGIN'); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 10px 0 0' }}>&larr;</button>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', flex: 1, textAlign: 'center', paddingRight: '20px' }}>Reset Password</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', textAlign: 'center' }}>Enter your email address to receive a password reset link.</p>
            {error && authStep === 'FORGOT_EMAIL' && <div style={{ backgroundColor: 'rgba(185, 28, 28, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}
            {successMsg && authStep === 'FORGOT_EMAIL' && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{successMsg}</div>}
            
            <form onSubmit={handleForgotSendLink} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: '8px' }}>
                {loading ? 'Sending...' : 'Send Link'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
