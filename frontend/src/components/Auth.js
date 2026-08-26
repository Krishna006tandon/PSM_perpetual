import React, { useState, useEffect } from 'react';

const Auth = ({ onAuthSuccess, onCancel, isCheckoutRegistration = false, selectedPackage = null }) => {
  const [isLogin, setIsLogin] = useState(!isCheckoutRegistration);
  
  // Checkout fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [contact, setContact] = useState('');
  const [numberOfUsers, setNumberOfUsers] = useState('');
  const [password, setPassword] = useState(''); // Only used for standard login/register

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [authStep, setAuthStep] = useState('LOGIN'); // 'LOGIN', 'FORGOT_EMAIL'
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isCheckoutRegistration) {
      setIsLogin(false);
    }
  }, [isCheckoutRegistration]);

  const handleForgotSendLink = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/auth/forgot-password-link', {
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
        const configRes = await fetch('https://api.perpetualsolutions.co.in/api/payments/config');
        const configData = await configRes.json();
        
        const options = {
          key: configData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Perpetual PSM',
          description: `Subscription: ${selectedPackage.name}`,
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
      if (isCheckoutRegistration && !isLogin && selectedPackage) {
        // FLOW: REGISTRATION WITH PURCHASE (No password field, sent via email)
        
        const orderRes = await fetch('https://api.perpetualsolutions.co.in/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: selectedPackage.price, currency: 'INR' })
        });
        const orderData = await orderRes.json();

        const paymentResponse = await initiateRazorpayPayment(orderData);
        
        const registerRes = await fetch('https://api.perpetualsolutions.co.in/api/auth/register-with-payment', {
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
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature
          })
        });
        
        const data = await registerRes.json();
        if (!registerRes.ok) throw new Error(data.error || 'Registration failed');
        
        alert("Payment successful! Your password has been emailed to you.");
        localStorage.setItem('token', data.token);
        onAuthSuccess(data.token);

      } else {
        // FLOW: STANDARD LOGIN
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const response = await fetch(`https://api.perpetualsolutions.co.in${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: isLogin ? undefined : 'Admin' })
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

  // Modern Light Theme UI matching the rest of the application
  if (isCheckoutRegistration) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', zIndex: 10000, padding: '60px 20px', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: 'var(--bg-paper)', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '540px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid var(--divider)' }}>
          <button onClick={onCancel} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--divider)'; }}>&times;</button>
          
          <h1 style={{ color: 'var(--text-primary)', margin: '0 0 32px 0', fontSize: '2rem', fontWeight: '800', textAlign: 'center', letterSpacing: '-0.02em' }}>Checkout & Setup</h1>
          
          {error && <div style={{ backgroundColor: 'rgba(185, 28, 28, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Enter company name" style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Admin Username</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Admin username" style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter company email" style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Address</label>
              <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} required placeholder="Enter company address" style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Company Contact</label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} required placeholder="Contact info" style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Number of Users</label>
                <input type="number" value={numberOfUsers} onChange={e => setNumberOfUsers(e.target.value)} required placeholder="# of users" style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Select Package</label>
              <select disabled style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--primary-main)', backgroundColor: 'rgba(59,130,246,0.05)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', appearance: 'none', fontWeight: '700' }}>
                <option>{selectedPackage.name} - ₹{(selectedPackage.price).toLocaleString('en-IN')}</option>
              </select>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', padding: '16px', backgroundColor: 'var(--primary-main)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-md)', transition: 'background-color 0.2s ease', opacity: loading ? 0.7 : 1 }}
                onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = 'var(--primary-dark)'; }}
                onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = 'var(--primary-main)'; }}
              >
                {loading ? 'Processing...' : `Pay ₹${(selectedPackage.price).toLocaleString('en-IN')} & Checkout`}
              </button>
            </div>
            
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.5' }}>
              Your password will be securely generated and sent to<br/><strong>{email || 'your email'}</strong> after checkout.
            </p>

          </form>
        </div>
      </div>
    );
  }

  // Shared input style
  const inputStyle = { padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--divider)', backgroundColor: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' };
  const btnStyle = { padding: '16px', backgroundColor: 'var(--primary-main)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s ease', opacity: loading ? 0.7 : 1, width: '100%' };

  // Standard Login / Forgot Password Wrapper (Light mode or generic)
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'var(--bg-paper)', borderRadius: '16px', width: '100%', maxWidth: '440px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid var(--divider)', overflow: 'hidden' }}>
        <button onClick={onCancel} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-default)', border: '1px solid var(--divider)', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', zIndex: 10 }} onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--divider)'; }}>&times;</button>
        
        {/* Animated Container */}
        <div style={{ display: 'flex', width: '200%', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: `translateX(-${['LOGIN', 'FORGOT_EMAIL'].indexOf(authStep) * 50}%)` }}>
          
          {/* STEP 1: LOGIN */}
          <div style={{ width: '50%', padding: '48px', boxSizing: 'border-box' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '32px', textAlign: 'center', fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Sign In</h2>
            {error && authStep === 'LOGIN' && <div style={{ backgroundColor: 'rgba(185, 28, 28, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(185, 28, 28, 0.2)' }}>{error}</div>}
            {successMsg && authStep === 'LOGIN' && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{successMsg}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: '8px' }} onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = 'var(--primary-dark)'; }} onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = 'var(--primary-main)'; }}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <span onClick={() => { setAuthStep('FORGOT_EMAIL'); setError(''); setSuccessMsg(''); }} style={{ color: 'var(--primary-main)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--primary-dark)'} onMouseOut={(e) => e.target.style.color = 'var(--primary-main)'}>Forgot Password?</span>
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
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" style={inputStyle} onFocus={(e) => e.target.style.borderColor = 'var(--primary-main)'} onBlur={(e) => e.target.style.borderColor = 'var(--divider)'} />
              </div>
              <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: '8px' }} onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = 'var(--primary-dark)'; }} onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = 'var(--primary-main)'; }}>
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
