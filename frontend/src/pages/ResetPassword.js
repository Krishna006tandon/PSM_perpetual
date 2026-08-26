import React, { useState, useEffect } from 'react';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [authStep, setAuthStep] = useState('FORGOT_SEND_OTP'); // 'FORGOT_SEND_OTP', 'FORGOT_OTP', 'FORGOT_RESET'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Extract email from URL parameters
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      setError("No email specified. Please use the link sent to your inbox.");
    }
  }, []);

  const handleForgotSendOtp = async (e) => {
    if(e) e.preventDefault();
    if(!email) return;
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/auth/forgot-password-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSuccessMsg(data.message);
      setAuthStep('FORGOT_OTP');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      setSuccessMsg(data.message);
      setAuthStep('FORGOT_RESET');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/auth/reset-password-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setSuccessMsg(data.message);
      setAuthStep('DONE');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // --- FULL PAGE SPLIT-SCREEN UI STYLES ---
  const pageContainerStyle = {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
    fontFamily: "'Inter', sans-serif"
  };

  const leftPaneStyle = {
    flex: '1',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden'
  };

  const rightPaneStyle = {
    flex: '1.2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    backgroundColor: '#ffffff',
    position: 'relative'
  };

  // Decorative background blobs for the left pane
  const blob1 = {
    position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw',
    background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0) 70%)', borderRadius: '50%', zIndex: 0
  };
  const blob2 = {
    position: 'absolute', bottom: '-20%', right: '-10%', width: '40vw', height: '40vw',
    background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)', borderRadius: '50%', zIndex: 0
  };

  const formContainerStyle = {
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    overflow: 'hidden'
  };

  const inputContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px'
  };

  const inputStyle = {
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    width: '100%',
    boxSizing: 'border-box'
  };

  const btnStyle = {
    padding: '16px',
    background: 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: loading ? 0.7 : 1,
    width: '100%',
    boxShadow: '0 4px 14px rgba(0, 102, 204, 0.3)'
  };

  const stepIndex = authStep === 'FORGOT_SEND_OTP' ? 0 : authStep === 'FORGOT_OTP' ? 1 : authStep === 'FORGOT_RESET' ? 2 : 3;

  const headerIcon = (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '32px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0,102,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0066cc' }}>
        {authStep === 'DONE' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ) : authStep === 'FORGOT_OTP' ? (
           <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
        )}
      </div>
    </div>
  );

  return (
    <div style={pageContainerStyle}>
      {/* Left Branding Pane */}
      <div style={leftPaneStyle} className="hide-on-mobile">
        <div style={blob1}></div>
        <div style={blob2}></div>
        <div style={{ zIndex: 1, maxWidth: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#0066cc', fontWeight: 'bold', fontSize: '1.2rem' }}>PS</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, letterSpacing: '1px' }}>Perpetual Solutions</h1>
          </div>
          
          <h2 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1.2', marginBottom: '24px' }}>
            Secure Your<br/>Account
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '40px' }}>
            Regain access to your PSM workspace. We use secure one-time passwords to ensure only you can reset your credentials.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: '500' }}>Enterprise-grade security protocols active.</span>
          </div>
        </div>
      </div>

      {/* Right Form Pane */}
      <div style={rightPaneStyle}>
        <div style={formContainerStyle}>
          
          {/* Animated Container */}
          <div style={{ display: 'flex', width: '400%', transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)', transform: `translateX(-${stepIndex * 25}%)` }}>
            
            {/* STEP 1: FORGOT_SEND_OTP */}
            <div style={{ width: '25%', padding: '20px', boxSizing: 'border-box' }}>
              {headerIcon}
              <h2 style={{ color: '#0f172a', margin: '0 0 12px 0', fontSize: '2rem', fontWeight: '800' }}>Reset Password</h2>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '32px', lineHeight: '1.5' }}>Click below to send a secure OTP to<br/><strong style={{ color: '#334155' }}>{email || 'your email'}</strong>.</p>
              {error && authStep === 'FORGOT_SEND_OTP' && <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: '500', borderLeft: '4px solid #ef4444' }}>{error}</div>}
              
              <form onSubmit={handleForgotSendOtp}>
                <button type="submit" disabled={loading || !email} style={btnStyle} onMouseOver={(e) => { if(!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 102, 204, 0.4)'; } }} onMouseOut={(e) => { if(!loading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 102, 204, 0.3)'; } }}>
                  {loading ? 'Sending OTP...' : 'Send Secure OTP'}
                </button>
              </form>
              <div style={{ marginTop: '32px' }}>
                <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.95rem', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='#0066cc'} onMouseOut={e=>e.currentTarget.style.color='#64748b'}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  Back to Login
                </a>
              </div>
            </div>

            {/* STEP 2: FORGOT_OTP */}
            <div style={{ width: '25%', padding: '20px', boxSizing: 'border-box' }}>
              {headerIcon}
              <h2 style={{ color: '#0f172a', margin: '0 0 12px 0', fontSize: '2rem', fontWeight: '800' }}>Verify OTP</h2>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '32px', lineHeight: '1.5' }}>Enter the 6-digit code sent to<br/><strong style={{ color: '#334155' }}>{email}</strong></p>
              {error && authStep === 'FORGOT_OTP' && <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: '500', borderLeft: '4px solid #ef4444' }}>{error}</div>}
              {successMsg && authStep === 'FORGOT_OTP' && <div style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: '500', borderLeft: '4px solid #10b981' }}>{successMsg}</div>}
              
              <form onSubmit={handleForgotVerifyOtp}>
                <div style={inputContainerStyle}>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required placeholder="0 0 0 0 0 0" maxLength={6} style={{...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '1.8rem', fontWeight: '800', fontFamily: 'monospace', padding: '20px'}} onFocus={(e) => {e.target.style.borderColor = '#0066cc'; e.target.style.boxShadow = '0 0 0 4px rgba(0,102,204,0.1)';}} onBlur={(e) => {e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none';}} />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} style={{ ...btnStyle, marginTop: '16px' }} onMouseOver={(e) => { if(!loading && otp.length === 6) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 102, 204, 0.4)'; } }} onMouseOut={(e) => { if(!loading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 102, 204, 0.3)'; } }}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>
              <div style={{ marginTop: '32px' }}>
                <span onClick={() => { setAuthStep('FORGOT_SEND_OTP'); setError(''); setSuccessMsg(''); }} style={{ color: '#0066cc', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  Didn't receive it? Resend OTP
                </span>
              </div>
            </div>

            {/* STEP 3: FORGOT_RESET */}
            <div style={{ width: '25%', padding: '20px', boxSizing: 'border-box' }}>
              {headerIcon}
              <h2 style={{ color: '#0f172a', margin: '0 0 12px 0', fontSize: '2rem', fontWeight: '800' }}>New Password</h2>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '32px', lineHeight: '1.5' }}>Create a strong, new password for<br/><strong style={{ color: '#334155' }}>{email}</strong></p>
              {error && authStep === 'FORGOT_RESET' && <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: '500', borderLeft: '4px solid #ef4444' }}>{error}</div>}
              
              <form onSubmit={handleForgotResetPassword}>
                <div style={inputContainerStyle}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginLeft: '4px' }}>Secure Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password" style={inputStyle} onFocus={(e) => {e.target.style.borderColor = '#0066cc'; e.target.style.boxShadow = '0 0 0 4px rgba(0,102,204,0.1)';}} onBlur={(e) => {e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none';}} />
                </div>
                <button type="submit" disabled={loading || !newPassword} style={{ ...btnStyle, marginTop: '16px' }} onMouseOver={(e) => { if(!loading && newPassword) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 102, 204, 0.4)'; } }} onMouseOut={(e) => { if(!loading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 102, 204, 0.3)'; } }}>
                  {loading ? 'Updating...' : 'Set Password'}
                </button>
              </form>
            </div>
            
            {/* STEP 4: DONE */}
            <div style={{ width: '25%', padding: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              {headerIcon}
              <h2 style={{ color: '#0f172a', margin: '0 0 12px 0', fontSize: '2rem', fontWeight: '800' }}>Success!</h2>
              <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '40px', lineHeight: '1.6' }}>{successMsg || 'Your password has been successfully updated.'}<br/>You can now safely log in.</p>
              <a href="/" style={{ padding: '16px 32px', background: '#0f172a', color: 'white', textDecoration: 'none', borderRadius: '12px', fontWeight: '700', width: '100%', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)', boxSizing: 'border-box' }} onMouseOver={e=>{e.currentTarget.style.background='#1e293b'; e.currentTarget.style.transform='translateY(-2px)';}} onMouseOut={e=>{e.currentTarget.style.background='#0f172a'; e.currentTarget.style.transform='none';}}>
                Continue to Login &rarr;
              </a>
            </div>

          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
