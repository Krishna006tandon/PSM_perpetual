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

  useEffect(() => {
    if (isCheckoutRegistration) {
      setIsLogin(false);
    }
  }, [isCheckoutRegistration]);

  const initiateRazorpayPayment = async (orderData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const configRes = await fetch('http://localhost:5000/api/payments/config');
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
        
        const orderRes = await fetch('http://localhost:5000/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: selectedPackage.price, currency: 'INR' })
        });
        const orderData = await orderRes.json();

        const paymentResponse = await initiateRazorpayPayment(orderData);
        
        const registerRes = await fetch('http://localhost:5000/api/auth/register-with-payment', {
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
        const response = await fetch(`http://localhost:5000${endpoint}`, {
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
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', zIndex: 10000, padding: '40px 0' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '500px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <button onClick={onCancel} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>&times;</button>
          
          <h1 style={{ color: '#1a1a2e', margin: '0 0 30px 0', fontSize: '2.5rem', fontWeight: '800', textAlign: 'center' }}>Checkout</h1>
          
          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Company Name</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Enter company name" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Admin Username</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter admin username" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Company Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter company email" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Company Address</label>
              <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} required placeholder="Enter company address" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Company Contact</label>
              <input type="text" value={contact} onChange={e => setContact(e.target.value)} required placeholder="Enter company contact" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Number of Users</label>
              <input type="number" value={numberOfUsers} onChange={e => setNumberOfUsers(e.target.value)} required placeholder="Enter number of users" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ color: '#444', fontSize: '0.9rem', fontWeight: 'bold' }}>Select Package</label>
              <select disabled style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ccc', background: '#f9f9f9', color: '#555', fontSize: '1rem', outline: 'none', appearance: 'none', fontWeight: 'bold' }}>
                <option>{selectedPackage.name} - ₹{(selectedPackage.price).toLocaleString('en-IN')}</option>
              </select>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,168,150,0.3)', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Processing...' : `Pay ₹${(selectedPackage.price).toLocaleString('en-IN')} & Checkout`}
              </button>
            </div>
            
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '5px' }}>
              Your password will be securely generated and sent to <strong>{email || 'your email'}</strong> after checkout.
            </p>

          </form>
        </div>
      </div>
    );
  }

  // Standard Login (Light mode or generic)
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', position: 'relative' }}>
        <button onClick={onCancel} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>&times;</button>
        <h2 style={{ color: '#1a1a2e', marginBottom: '20px', textAlign: 'center' }}>Sign In</h2>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }} />
          <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '14px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
