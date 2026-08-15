import React, { useState, useEffect } from 'react';
import './PHAStartMenu.css'; // Reuse existing styles

const PlatformOwnerDashboard = ({ onLogout }) => {
  const [analytics, setAnalytics] = useState({ totalUsers: 0, totalAdmins: 0, totalProjects: 0, recentProjects: [] });
  const [packages, setPackages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', price: 0, maxProjects: -1, maxUsers: -1, features: [], billingCycle: 'Monthly'
  });

  const availableFeatures = ['PHA', 'MOC'];

  useEffect(() => {
    fetchAnalytics();
    fetchPackages();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/admin/packages', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setPackages(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => {
      const features = prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature];
      return { ...prev, features };
    });
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://api.perpetualsolutions.co.in/api/admin/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchPackages();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeletePackage = async (id) => {
    try {
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/admin/packages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchPackages();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', borderBottom: '1px solid var(--divider, #eee)', background: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary, #00a896)' }}>Perpetual Owner Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #00a896, #028090)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>SA</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', color: '#1a1a2e' }}>SuperAdmin</span>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Platform Owner</span>
            </div>
          </div>
          <button onClick={onLogout} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '40px 60px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="dashboard-header">
          <h2>Platform Analytics</h2>
        </div>
        
        <div className="studies-grid" style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <div className="study-card" style={{ flex: 1, padding: '32px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(0,0,0,0) 100%)', borderRadius: '16px', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
            <h3 style={{ color: '#2ecc71', fontSize: '1.2rem', marginBottom: '10px' }}>Total Revenue</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1a1a2e' }}>₹{(analytics.totalRevenue || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="study-card" style={{ flex: 1, padding: '32px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,168,150,0.05) 0%, rgba(0,0,0,0) 100%)', borderRadius: '16px', border: '1px solid rgba(0,168,150,0.1)' }}>
            <h3>Total Projects</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00a896' }}>{analytics.totalProjects}</p>
          </div>
          <div className="study-card" style={{ flex: 1, padding: '32px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,168,150,0.05) 0%, rgba(0,0,0,0) 100%)', borderRadius: '16px', border: '1px solid rgba(0,168,150,0.1)' }}>
            <h3>Total Users</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#5e72e4' }}>{analytics.totalUsers}</p>
          </div>
          <div className="study-card" style={{ flex: 1, padding: '32px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,168,150,0.05) 0%, rgba(0,0,0,0) 100%)', borderRadius: '16px', border: '1px solid rgba(0,168,150,0.1)' }}>
            <h3>Total Admins</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>{analytics.totalAdmins}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', marginTop: '50px' }}>
          <h2 style={{ fontSize: '2rem', color: '#1a1a2e', margin: 0, fontWeight: '800' }}>Subscription Packages</h2>
          <button onClick={() => setIsModalOpen(true)} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,168,150,0.3)', transition: 'all 0.2s' }}>+ NEW PACKAGE</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
          {packages.map(pkg => (
            <div key={pkg._id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e1e4e8', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ padding: '30px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e', fontWeight: '800' }}>{pkg.name}</h3>
                  <button onClick={() => handleDeletePackage(pkg._id)} style={{ background: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Delete</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#00a896' }}>₹{(pkg.price).toLocaleString('en-IN')}</span>
                  <span style={{ color: '#666', fontWeight: '600' }}>/ {pkg.billingCycle === 'One-time' ? 'one-time' : pkg.billingCycle === 'Yearly' ? 'yr' : 'mo'}</span>
                </div>
              </div>

              <div style={{ padding: '30px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00a896' }}></div>
                    <span style={{ color: '#4a4a68', fontWeight: '500' }}><strong>{pkg.maxProjects === -1 ? 'Unlimited' : pkg.maxProjects}</strong> Active Projects</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00a896' }}></div>
                    <span style={{ color: '#4a4a68', fontWeight: '500' }}><strong>{pkg.maxUsers === -1 ? 'Unlimited' : pkg.maxUsers}</strong> Team Members</span>
                  </div>
                </div>

                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Included Modules</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {pkg.features.map(f => (
                      <span key={f} style={{ background: 'rgba(0,168,150,0.1)', color: '#00a896', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2>Create Subscription Package</h2>
            <form onSubmit={handleSavePackage}>
              <div className="form-group">
                <label>Package Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Billing Cycle</label>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}>
                    <input style={{ width: 'auto', margin: '0 5px 0 0', cursor: 'pointer' }} type="radio" name="billingCycle" value="Monthly" checked={formData.billingCycle === 'Monthly'} onChange={e => setFormData({...formData, billingCycle: e.target.value})} />
                    Monthly
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}>
                    <input style={{ width: 'auto', margin: '0 5px 0 0', cursor: 'pointer' }} type="radio" name="billingCycle" value="Yearly" checked={formData.billingCycle === 'Yearly'} onChange={e => setFormData({...formData, billingCycle: e.target.value})} />
                    Yearly
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}>
                    <input style={{ width: 'auto', margin: '0 5px 0 0', cursor: 'pointer' }} type="radio" name="billingCycle" value="One-time" checked={formData.billingCycle === 'One-time'} onChange={e => setFormData({...formData, billingCycle: e.target.value})} />
                    One-Time Payment
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Max Projects (-1 for unlim)</label>
                  <input type="number" value={formData.maxProjects} onChange={e => setFormData({...formData, maxProjects: Number(e.target.value)})} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Max Users (-1 for unlim)</label>
                  <input type="number" value={formData.maxUsers} onChange={e => setFormData({...formData, maxUsers: Number(e.target.value)})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Included Features</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {availableFeatures.map(f => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal' }}>
                      <input style={{ width: 'auto', margin: '0 8px 0 0', cursor: 'pointer' }}
                        type="checkbox" 
                        checked={formData.features.includes(f)}
                        onChange={() => handleFeatureToggle(f)}
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" type="button" style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#666' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" type="submit" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,168,150,0.2)' }}>Create Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformOwnerDashboard;
