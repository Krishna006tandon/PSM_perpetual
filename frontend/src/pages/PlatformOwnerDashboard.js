import React, { useState, useEffect } from 'react';
import './PHAStartMenu.css'; // Reuse existing styles

const API_URL = (process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in').replace(/\/$/, '');

const PlatformOwnerDashboard = ({ onLogout }) => {
  const [analytics, setAnalytics] = useState({ totalUsers: 0, totalAdmins: 0, totalProjects: 0, recentProjects: [] });
  const [packages, setPackages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    hasAnnual: true,
    annualPrice: 0,
    hasOneTime: false,
    oneTimePrice: 0,
    price: 0,
    maxProjects: -1,
    maxUsers: -1,
    features: ['PHA'],
    billingCycle: 'Yearly'
  });

  // Free Trial System States (Owner Controlled)
  const [trialSettings, setTrialSettings] = useState({
    freeTrialEnabled: true,
    defaultTrialDays: 14,
    trialFeatures: ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT']
  });
  const [isSavingTrial, setIsSavingTrial] = useState(false);
  const [trialMsg, setTrialMsg] = useState('');

  // Individual User Trial Modal States
  const [selectedUserForTrial, setSelectedUserForTrial] = useState(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [extendDaysInput, setExtendDaysInput] = useState(7);

  // Excel Pricing Calculator States
  const [showCalculator, setShowCalculator] = useState(true);
  const [calcModules, setCalcModules] = useState(['PHA', 'LOPA']);
  const [calcUsers, setCalcUsers] = useState(4);
  const [calcBaseRate, setCalcBaseRate] = useState(300000); // 3 Lakhs base per module
  const [calcAddUserRate, setCalcAddUserRate] = useState(100000); // 1 Lakh per additional user
  const [calcAmcPercent, setCalcAmcPercent] = useState(25); // 25% annual AMC
  const [calcAppliedNotice, setCalcAppliedNotice] = useState('');

  const [backupInfo, setBackupInfo] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [userMsg, setUserMsg] = useState('');

  // Demo Requests / Inbound Leads State
  const [demoRequests, setDemoRequests] = useState([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoFilter, setDemoFilter] = useState('ALL');
  const [demoMsg, setDemoMsg] = useState('');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDemoForSchedule, setSelectedDemoForSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledAt: '',
    meetingLink: '',
    scheduledMessage: ''
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Individual User Activity & Working Time Modal States
  const [selectedUserForActivity, setSelectedUserForActivity] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [userActivityData, setUserActivityData] = useState(null);
  const [activityTab, setActivityTab] = useState('studies');
  const [activitySearch, setActivitySearch] = useState('');

  const availableFeatures = ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT'];

  const getFeatureLabel = (f) => {
    switch (f) {
      case 'PHA': return 'HAZOP / PHA';
      case 'LOPA': return 'LOPA';
      case 'MOC': return 'MOC';
      case 'BOWTIE': return 'BOW Tie';
      case 'INCIDENT': return 'Incident Investigation';
      default: return f;
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchPackages();
    fetchBackupStatus();
    fetchUsers();
    fetchTrialSettings();
    fetchDemoRequests();
  }, []);

  const fetchDemoRequests = async () => {
    try {
      setDemoLoading(true);
      const res = await fetch(`${API_URL}/api/admin/demo-requests`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDemoRequests(data);
      }
    } catch (e) {
      console.error('Error fetching demo requests:', e);
    } finally {
      setDemoLoading(false);
    }
  };

  const openScheduleModal = (demo) => {
    setSelectedDemoForSchedule(demo);
    let dtVal = '';
    if (demo.scheduledAt) {
      try {
        const d = new Date(demo.scheduledAt);
        const pad = (n) => String(n).padStart(2, '0');
        dtVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {
        dtVal = '';
      }
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, '0');
      dtVal = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
    }
    setScheduleForm({
      scheduledAt: dtVal,
      meetingLink: demo.meetingLink || '',
      scheduledMessage: demo.scheduledMessage || `Hi ${demo.name || 'there'}, we look forward to meeting with your engineering team to demonstrate the PS-MagnaShield suite.`
    });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDemoForSchedule) return;
    setIsSavingSchedule(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/demo-requests/${selectedDemoForSchedule._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'Scheduled',
          scheduledAt: scheduleForm.scheduledAt,
          meetingLink: scheduleForm.meetingLink,
          scheduledMessage: scheduleForm.scheduledMessage,
          sendEmail: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDemoRequests(prev => prev.map(d => d._id === selectedDemoForSchedule._id ? data : d));
        setDemoMsg(`✅ Demo scheduled & invite email sent to ${selectedDemoForSchedule.email}!`);
        setScheduleModalOpen(false);
        setTimeout(() => setDemoMsg(''), 4000);
      } else {
        alert(data.error || 'Failed to schedule demo');
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert(err.message || 'Failed to schedule demo');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleUpdateDemoStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/demo-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus, sendEmail: true })
      });
      const data = await res.json();
      if (res.ok) {
        setDemoRequests(prev => prev.map(d => d._id === id ? data : d));
        setDemoMsg(`✅ Status set to "${newStatus}" & email sent to lead!`);
        setTimeout(() => setDemoMsg(''), 3500);
      }
    } catch (e) {
      console.error('Error updating demo status:', e);
    }
  };

  const handleStatusChange = (demo, newStatus) => {
    if (newStatus === 'Scheduled') {
      openScheduleModal(demo);
    } else {
      handleUpdateDemoStatus(demo._id, newStatus);
    }
  };

  const handleDeleteDemo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this demo request?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/demo-requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setDemoRequests(prev => prev.filter(d => d._id !== id));
        setDemoMsg('✅ Demo request deleted');
        setTimeout(() => setDemoMsg(''), 3000);
      }
    } catch (e) {
      console.error('Error deleting demo request:', e);
    }
  };
  const fetchTrialSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/trial`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrialSettings({
          freeTrialEnabled: data.freeTrialEnabled !== false,
          defaultTrialDays: data.defaultTrialDays || 14,
          trialFeatures: data.trialFeatures || ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT']
        });
      }
    } catch (e) {
      console.error('Error fetching trial settings:', e);
    }
  };

  const handleSaveTrialSettings = async (e) => {
    if (e) e.preventDefault();
    setIsSavingTrial(true);
    setTrialMsg('');
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/trial`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(trialSettings)
      });
      const data = await res.json();
      if (res.ok) {
        setTrialMsg('✅ Free trial settings updated successfully!');
        setTimeout(() => setTrialMsg(''), 4000);
      } else {
        setTrialMsg(`❌ Failed: ${data.error || 'Could not save'}`);
      }
    } catch (e) {
      setTrialMsg(`❌ Network error: ${e.message}`);
    } finally {
      setIsSavingTrial(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmText = `Are you sure you want to permanently delete user:\n\nEmail: ${user.email}\nCompany: ${user.companyName || user.name || 'N/A'}\n\nThis will remove their account and login access.`;
    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserMsg(`✅ Successfully deleted user ${user.email}`);
        setTimeout(() => setUserMsg(''), 4000);
        fetchUsers();
        fetchAnalytics();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (e) {
      console.error(e);
      alert(`Network error: ${e.message}`);
    }
  };

  const handleOpenTrialModal = (user) => {
    setSelectedUserForTrial(user);
    setExtendDaysInput(7);
    setTrialModalOpen(true);
  };

  const handleUpdateUserTrial = async (user, payload) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user._id}/trial`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setUserMsg(`Updated trial access for ${user.email}`);
        setTimeout(() => setUserMsg(''), 3000);
        fetchUsers();
        setTrialModalOpen(false);
        setSelectedUserForTrial(null);
      } else {
        alert(data.error || 'Failed to update user trial');
      }
    } catch (e) {
      console.error(e);
      alert(`Error updating trial: ${e.message}`);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString('en-GB');
  };

  const handleOpenUserActivity = async (user) => {
    setSelectedUserForActivity(user);
    setActivityModalOpen(true);
    setActivityLoading(true);
    setUserActivityData(null);
    setActivityTab('studies');
    setActivitySearch('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user._id}/activity-and-projects`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserActivityData(data);
      } else {
        alert('Failed to load user activity & project details');
      }
    } catch (e) {
      console.error(e);
      alert('Error fetching user activity details');
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/backup-status`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setBackupInfo(await res.json());
    } catch (e) { console.error('Error fetching backup status:', e); }
  };

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    setBackupMsg('');
    try {
      const res = await fetch(`${API_URL}/api/admin/trigger-backup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupMsg(`✅ Backup successfully created in PSM_Backup (${data.summary?.totalDocuments || 0} records synced)!`);
        fetchBackupStatus();
      } else {
        setBackupMsg(`❌ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setBackupMsg(`❌ Network error: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/packages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setPackages(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setUsers(await res.json());
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

  // Calculator Derived Values
  const calcBaseTotal = calcModules.length * calcBaseRate;
  const calcAddUsersCount = Math.max(0, calcUsers - 1);
  const calcAddUsersTotal = calcAddUsersCount * calcAddUserRate;
  const calcOneTimeTotal = calcBaseTotal + calcAddUsersTotal;
  const calcAnnualTotal = Math.round(calcOneTimeTotal * (calcAmcPercent / 100));

  const handleApplyCalculation = () => {
    const moduleNames = calcModules.map(m => m === 'PHA' ? 'HAZOP' : (m === 'BOWTIE' ? 'BOW Tie' : (m === 'INCIDENT' ? 'Incident' : m)));
    const autoName = `${moduleNames.join('+')} (${calcUsers} Users)`;
    
    setFormData(prev => ({
      ...prev,
      name: prev.name ? prev.name : autoName,
      hasOneTime: true,
      oneTimePrice: calcOneTimeTotal,
      hasAnnual: true,
      annualPrice: calcAnnualTotal,
      price: calcAnnualTotal || calcOneTimeTotal,
      maxUsers: calcUsers,
      features: [...calcModules]
    }));
    setCalcAppliedNotice(`✅ Applied Excel Calculation: ₹${calcOneTimeTotal.toLocaleString('en-IN')} One-Time & ₹${calcAnnualTotal.toLocaleString('en-IN')}/yr Annual (${calcAmcPercent}% AMC)!`);
    setTimeout(() => setCalcAppliedNotice(''), 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingPackageId(null);
    setShowCalculator(true);
    setCalcModules(['PHA', 'LOPA']);
    setCalcUsers(4);
    setFormData({
      name: 'HAZOP+LOPA (4 Users)',
      hasAnnual: true,
      annualPrice: 225000,
      hasOneTime: true,
      oneTimePrice: 900000,
      price: 900000,
      maxProjects: -1,
      maxUsers: 4,
      features: ['PHA', 'LOPA'],
      billingCycle: 'Both'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg) => {
    setEditingPackageId(pkg._id);
    setShowCalculator(false);
    const hasAnnual = pkg.hasAnnual !== undefined ? pkg.hasAnnual : (pkg.billingCycle !== 'One-time');
    const annualPrice = pkg.annualPrice || (pkg.billingCycle !== 'One-time' ? pkg.price : 0);
    const hasOneTime = pkg.hasOneTime !== undefined ? pkg.hasOneTime : (pkg.billingCycle === 'One-time');
    const oneTimePrice = pkg.oneTimePrice || (pkg.billingCycle === 'One-time' ? pkg.price : 0);

    setFormData({
      name: pkg.name || '',
      hasAnnual,
      annualPrice,
      hasOneTime,
      oneTimePrice,
      price: pkg.price || (hasAnnual ? annualPrice : oneTimePrice),
      maxProjects: pkg.maxProjects !== undefined ? pkg.maxProjects : -1,
      maxUsers: pkg.maxUsers !== undefined ? pkg.maxUsers : -1,
      features: Array.isArray(pkg.features) ? [...pkg.features] : ['PHA'],
      billingCycle: pkg.billingCycle || 'Both'
    });

    if (Array.isArray(pkg.features) && pkg.features.length > 0) {
      setCalcModules([...pkg.features]);
    }
    if (pkg.maxUsers && pkg.maxUsers > 0) {
      setCalcUsers(pkg.maxUsers);
    }

    setIsModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!formData.hasAnnual && !formData.hasOneTime) {
      alert('Please enable at least one payment method (Annual or One-Time).');
      return;
    }
    try {
      const url = editingPackageId
        ? `${API_URL}/api/admin/packages/${editingPackageId}`
        : `${API_URL}/api/admin/packages`;
      const method = editingPackageId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingPackageId(null);
        fetchPackages();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save package');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while saving package');
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/packages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchPackages();
    } catch (e) { console.error(e); }
  };

  const handleToggleUserFeature = async (targetUser, feature) => {
    const currentFeatures = Array.isArray(targetUser.features) && targetUser.features.length > 0
      ? targetUser.features
      : ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT'];

    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${targetUser._id}/features`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ features: newFeatures })
      });
      if (res.ok) {
        setUserMsg(`Updated modules for ${targetUser.email}`);
        setTimeout(() => setUserMsg(''), 3000);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
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
          <a 
            href="/dev" 
            style={{ 
              padding: '8px 16px', 
              background: '#0f172a', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '8px', 
              fontWeight: '700', 
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            title="Inspect customer support tickets on NexByte Developer Desk"
          >
            🛠️ Dev Desk (/dev)
          </a>
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

        {/* MongoDB Daily Auto-Backup Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px 30px', border: '1px solid #e1e4e8', marginBottom: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1a1a2e', fontWeight: '800' }}>
                  🗄️ MongoDB Daily Auto-Backup
                </h3>
                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Schedule: {backupInfo?.schedule === '0 19 * * *' ? 'Daily 7:00 PM IST' : `${backupInfo?.schedule || 'Daily 7:00 PM'} (IST)`}
                </span>
              </div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Active Backup DB: <strong style={{ color: '#00a896' }}>{backupInfo?.targetDatabase || 'PSM_Backup_[Date]_[Day]_[Time]'}</strong> (Yesterday's backup is auto-dropped and replaced)
              </p>
            </div>

            <button
              onClick={handleTriggerBackup}
              disabled={isBackingUp}
              style={{
                padding: '10px 20px',
                background: isBackingUp ? '#ccc' : 'linear-gradient(135deg, #00a896 0%, #028090 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: isBackingUp ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,168,150,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {isBackingUp ? '⏳ Syncing Backup...' : '⚡ Backup Now'}
            </button>
          </div>

          {backupMsg && (
            <div style={{ marginTop: '15px', padding: '10px 14px', borderRadius: '6px', background: backupMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee', color: backupMsg.startsWith('✅') ? '#2e7d32' : '#c62828', fontSize: '0.85rem', fontWeight: '600' }}>
              {backupMsg}
            </div>
          )}

          {backupInfo && backupInfo.exists && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Date & Day (IST)</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#1a1a2e', fontSize: '0.95rem' }}>{backupInfo.day ? `${backupInfo.day}, ${backupInfo.date}` : backupInfo.lastBackupDateIST || 'N/A'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Time (IST)</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#028090', fontSize: '0.95rem' }}>{backupInfo.time || 'N/A'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Collections Synced</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#00a896', fontSize: '0.95rem' }}>{backupInfo.totalCollections} Collections</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Documents</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#5e72e4', fontSize: '0.95rem' }}>{(backupInfo.totalDocuments || 0).toLocaleString()} Records</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Duration</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#ff9800', fontSize: '0.95rem' }}>{backupInfo.durationSeconds}s</p>
              </div>
            </div>
          )}
        </div>

        {/* Free Trial Platform Settings Section (Owner Controlled) */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '28px 30px', border: '1px solid #e1e4e8', marginBottom: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a2e', fontWeight: '800' }}>
                  🎁 Free Trial Configuration
                </h3>
                <span style={{ 
                  background: trialSettings.freeTrialEnabled ? '#e8f5e9' : '#ffebee', 
                  color: trialSettings.freeTrialEnabled ? '#2e7d32' : '#c62828', 
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  fontSize: '0.82rem', 
                  fontWeight: 'bold',
                  border: trialSettings.freeTrialEnabled ? '1px solid #a5d6a7' : '1px solid #ef9a9a'
                }}>
                  {trialSettings.freeTrialEnabled ? '🟢 Free Trial Active' : '🔴 Free Trial Disabled'}
                </span>
              </div>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Decide free trial duration, enable or disable public trial sign-ups, and choose which safety modules are unlocked during trial.
              </p>
            </div>

            <button
              onClick={handleSaveTrialSettings}
              disabled={isSavingTrial}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: isSavingTrial ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,168,150,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {isSavingTrial ? '⏳ Saving...' : '💾 Save Trial Settings'}
            </button>
          </div>

          {trialMsg && (
            <div style={{ marginBottom: '20px', padding: '10px 14px', borderRadius: '8px', background: trialMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee', color: trialMsg.startsWith('✅') ? '#2e7d32' : '#c62828', fontSize: '0.9rem', fontWeight: 'bold' }}>
              {trialMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {/* 1. Toggle Free Trial */}
            <div>
              <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '8px', fontSize: '0.95rem' }}>
                1. Enable / Disable Free Trial
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <input 
                  type="checkbox" 
                  checked={trialSettings.freeTrialEnabled} 
                  onChange={(e) => setTrialSettings(prev => ({ ...prev, freeTrialEnabled: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '600', color: trialSettings.freeTrialEnabled ? '#0f766e' : '#64748b' }}>
                  {trialSettings.freeTrialEnabled ? 'Allow Users to Sign Up for Free Trial' : 'Disable Free Trial Sign-ups'}
                </span>
              </label>
            </div>

            {/* 2. Trial Duration in Days */}
            <div>
              <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '8px', fontSize: '0.95rem' }}>
                2. Free Trial Duration (Days)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input 
                  type="number"
                  min="1"
                  max="365"
                  value={trialSettings.defaultTrialDays}
                  onChange={(e) => setTrialSettings(prev => ({ ...prev, defaultTrialDays: Math.max(1, Number(e.target.value)) }))}
                  style={{ width: '80px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', background: 'white' }}
                />
                <span style={{ fontWeight: '600', color: '#64748b' }}>Days</span>

                <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                  {[7, 14, 30, 60].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTrialSettings(prev => ({ ...prev, defaultTrialDays: days }))}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: trialSettings.defaultTrialDays === days ? '2px solid #00a896' : '1px solid #cbd5e1',
                        background: trialSettings.defaultTrialDays === days ? '#e6fffa' : 'white',
                        color: trialSettings.defaultTrialDays === days ? '#00a896' : '#475569',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Included Trial Modules */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '8px', fontSize: '0.95rem' }}>
                3. Modules Accessible During Free Trial
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableFeatures.map(f => {
                  const isSelected = trialSettings.trialFeatures.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setTrialSettings(prev => ({
                          ...prev,
                          trialFeatures: isSelected ? prev.trialFeatures.filter(x => x !== f) : [...prev.trialFeatures, f]
                        }));
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid #00a896' : '1px solid #cbd5e1',
                        background: isSelected ? '#00a896' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '} {getFeatureLabel(f)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Packages Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', marginTop: '50px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', color: '#1a1a2e', margin: 0, fontWeight: '800' }}>Subscription Packages</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.95rem' }}>Configure packages with One-Time and Annual pricing (2.5% AMC), or use the built-in Excel Pricing Calculator.</p>
          </div>
          <button onClick={handleOpenCreateModal} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,168,150,0.3)', transition: 'all 0.2s' }}>+ NEW PACKAGE</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '30px', marginBottom: '50px' }}>
          {packages.map(pkg => {
            const hasAnnual = pkg.hasAnnual !== undefined ? pkg.hasAnnual : (pkg.billingCycle !== 'One-time');
            const annualPrice = pkg.annualPrice || (pkg.billingCycle !== 'One-time' ? pkg.price : 0);
            const hasOneTime = pkg.hasOneTime !== undefined ? pkg.hasOneTime : (pkg.billingCycle === 'One-time');
            const oneTimePrice = pkg.oneTimePrice || (pkg.billingCycle === 'One-time' ? pkg.price : 0);

            return (
              <div key={pkg._id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e1e4e8', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ padding: '24px 30px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a2e', fontWeight: '800' }}>{pkg.name}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(pkg)} 
                        style={{ background: 'rgba(0, 168, 150, 0.1)', color: '#00a896', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeletePackage(pkg._id)} 
                        style={{ background: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  {/* Payment Pricing Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    {hasOneTime && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.7rem', fontWeight: '900', color: '#028090' }}>₹{oneTimePrice.toLocaleString('en-IN')}</span>
                        <span style={{ color: '#666', fontWeight: '600', fontSize: '0.9rem' }}>one-time (Perpetual)</span>
                      </div>
                    )}
                    {hasAnnual && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#00a896' }}>₹{annualPrice.toLocaleString('en-IN')}</span>
                        <span style={{ color: '#666', fontWeight: '600', fontSize: '0.85rem' }}>/ yr (Annual AMC)</span>
                      </div>
                    )}
                    {!hasAnnual && !hasOneTime && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#00a896' }}>₹{(pkg.price || 0).toLocaleString('en-IN')}</span>
                        <span style={{ color: '#666', fontWeight: '600', fontSize: '0.9rem' }}>/ {pkg.billingCycle}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '24px 30px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
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
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Included Modules</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {availableFeatures.map(feat => {
                        const isIncluded = Array.isArray(pkg.features) && pkg.features.includes(feat);
                        return (
                          <span 
                            key={feat} 
                            style={{ 
                              background: isIncluded ? 'rgba(0,168,150,0.12)' : '#f1f3f5', 
                              color: isIncluded ? '#00a896' : '#999', 
                              border: isIncluded ? '1px solid rgba(0,168,150,0.3)' : '1px solid #e1e4e8',
                              padding: '5px 12px', 
                              borderRadius: '20px', 
                              fontSize: '0.82rem', 
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isIncluded ? '✓' : '✕'} {getFeatureLabel(feat)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>

        {/* Inbound Demo Requests & Enterprise Leads Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', border: '1px solid #e1e4e8', marginBottom: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a2e', fontWeight: '800' }}>
                  📅 Inbound Demo Requests & Enterprise Leads
                </h3>
                {demoRequests.filter(d => d.status === 'Pending').length > 0 && (
                  <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: '800' }}>
                    {demoRequests.filter(d => d.status === 'Pending').length} Pending
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                Review live demo bookings submitted from the landing page, manage lead outreach, and update consultation status.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {demoMsg && (
                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {demoMsg}
                </span>
              )}
              <select 
                value={demoFilter} 
                onChange={e => setDemoFilter(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: '600' }}
              >
                <option value="ALL">All Statuses ({demoRequests.length})</option>
                <option value="Pending">Pending ({demoRequests.filter(d => d.status === 'Pending').length})</option>
                <option value="Contacted">Contacted ({demoRequests.filter(d => d.status === 'Contacted').length})</option>
                <option value="Scheduled">Scheduled ({demoRequests.filter(d => d.status === 'Scheduled').length})</option>
                <option value="Completed">Completed ({demoRequests.filter(d => d.status === 'Completed').length})</option>
              </select>
              <button 
                type="button"
                onClick={fetchDemoRequests}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {demoLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading demo requests...</div>
          ) : demoRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#334155' }}>No Demo Requests Yet</div>
              <div style={{ fontSize: '0.88rem', marginTop: '4px' }}>Demo bookings submitted via the landing page will appear here instantly.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e1e4e8', background: '#f8f9fa', color: '#475569' }}>
                    <th style={{ padding: '14px 16px' }}>Date</th>
                    <th style={{ padding: '14px 16px' }}>Lead Contact</th>
                    <th style={{ padding: '14px 16px' }}>Company & Industry</th>
                    <th style={{ padding: '14px 16px' }}>Modules of Interest</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demoRequests
                    .filter(d => demoFilter === 'ALL' || d.status === demoFilter)
                    .map(d => {
                      const statusColors = {
                        Pending: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                        Contacted: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                        Scheduled: { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
                        Completed: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                        Cancelled: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
                      };
                      const sCol = statusColors[d.status] || statusColors.Pending;
                      return (
                        <tr key={d._id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <div style={{ fontSize: '0.78rem' }}>{new Date(d.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{d.name}</div>
                            <a href={`mailto:${d.email}`} style={{ fontSize: '0.85rem', color: '#00a896', textDecoration: 'none' }}>
                              ✉️ {d.email}
                            </a>
                            {d.phone && (
                              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                                📞 <a href={`tel:${d.phone}`} style={{ color: '#475569', textDecoration: 'none' }}>{d.phone}</a>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{d.company}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{d.industry}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: '#f1f5f9', color: '#0f766e', padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700', border: '1px solid #cbd5e1', display: 'inline-block' }}>
                              {d.interest}
                            </span>
                            {d.notes && (
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic', maxWidth: '240px' }}>
                                &quot;{d.notes}&quot;
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <select
                              value={d.status}
                              onChange={e => handleStatusChange(d, e.target.value)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '16px',
                                border: `1px solid ${sCol.border}`,
                                background: sCol.bg,
                                color: sCol.color,
                                fontWeight: '800',
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Scheduled">Scheduled</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            {/* If Scheduled, render meeting details & edit button */}
                            {d.status === 'Scheduled' && (
                              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700' }}>
                                  📅 {d.scheduledAt ? new Date(d.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Date not set'}
                                </div>
                                {d.meetingLink ? (
                                  <a 
                                    href={d.meetingLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.78rem', color: '#00a896', fontWeight: '800', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                    title={d.meetingLink}
                                  >
                                    🔗 Join Meet Link &rarr;
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: '600' }}>
                                    ⚠️ No Meet Link Added
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openScheduleModal(d)}
                                  style={{ 
                                    marginTop: '2px', 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    border: '1px solid #cbd5e1', 
                                    background: '#fefce8', 
                                    color: '#854d0e', 
                                    fontSize: '0.74rem', 
                                    fontWeight: '700', 
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: 'fit-content'
                                  }}
                                >
                                  ✏️ Edit Meet Link / Time
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => openScheduleModal(d)}
                                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #00a896', background: 'rgba(0,168,150,0.08)', color: '#00a896', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}
                                title="Schedule or Edit Meeting Details"
                              >
                                🗓️ {d.status === 'Scheduled' ? 'Edit Meet' : 'Schedule'}
                              </button>
                              <a
                                href={`mailto:${d.email}?subject=PS-MagnaShield%20Demo%20Walkthrough%20for%20${encodeURIComponent(d.company)}`}
                                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f766e', textDecoration: 'none', fontSize: '0.82rem', fontWeight: '700' }}
                                title="Send Email"
                              >
                                Email
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteDemo(d._id)}
                                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ef4444', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}
                                title="Delete Record"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* User Account Feature Permissions Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', border: '1px solid #e1e4e8', marginBottom: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1a1a2e', fontWeight: '800' }}>
                👥 Company Accounts, Trials & Permissions
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                Manage registered user accounts, control or extend free trials, toggle unlocked modules, or delete accounts.
              </p>
            </div>
            {userMsg && (
              <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ✓ {userMsg}
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e1e4e8', color: '#4a4a68' }}>
                  <th style={{ padding: '14px 16px' }}>Company & User</th>
                  <th style={{ padding: '14px 16px' }}>Status & Trial</th>
                  <th style={{ padding: '14px 16px' }}>Plan</th>
                  <th style={{ padding: '14px 10px', textAlign: 'center' }}>HAZOP</th>
                  <th style={{ padding: '14px 10px', textAlign: 'center' }}>LOPA</th>
                  <th style={{ padding: '14px 10px', textAlign: 'center' }}>MOC</th>
                  <th style={{ padding: '14px 10px', textAlign: 'center' }}>BOW Tie</th>
                  <th style={{ padding: '14px 10px', textAlign: 'center' }}>Incident</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No registered client accounts found.</td>
                  </tr>
                ) : (
                  users.map(u => {
                    const uFeatures = Array.isArray(u.features) && u.features.length > 0 ? u.features : ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT'];
                    
                    // Compute trial status & remaining days
                    const now = new Date();
                    const end = u.trialEndDate ? new Date(u.trialEndDate) : null;
                    const isExpired = u.subscriptionStatus === 'expired' || (u.isTrial && end && end < now);
                    const daysLeft = end ? Math.max(0, Math.ceil((end - now) / 86400000)) : 0;

                    return (
                      <tr key={u._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div
                            onClick={() => handleOpenUserActivity(u)}
                            style={{ cursor: 'pointer', display: 'inline-block' }}
                            title="Click to view working time & project details"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: '#028090', fontSize: '0.98rem', textDecoration: 'underline' }}>
                                {u.companyName || u.name || 'Company'}
                              </strong>
                              <span style={{ fontSize: '0.8rem', color: '#028090' }}>↗</span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>{u.email}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                              {u.companyCode && (
                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                                  Code: {u.companyCode}
                                </span>
                              )}
                              {u.totalActiveSeconds > 0 && (
                                <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                                  ⏱️ {Math.floor(u.totalActiveSeconds / 3600) > 0 ? `${Math.floor(u.totalActiveSeconds / 3600)}h ` : ''}${Math.floor((u.totalActiveSeconds % 3600) / 60)}m active
                                </span>
                              )}
                              {u.lastActiveAt && (
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                  Active {formatRelativeTime(u.lastActiveAt)}
                                </span>
                              )}
                            </div>
                            {u.contact && <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block', marginTop: '2px' }}>📞 {u.contact}</span>}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {u.isTrial ? (
                            isExpired ? (
                              <div>
                                <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                                  ⚠️ Trial Expired
                                </span>
                                {end && <span style={{ display: 'block', fontSize: '0.75rem', color: '#991b1b', marginTop: '2px' }}>Ended: {end.toLocaleDateString('en-GB')}</span>}
                              </div>
                            ) : (
                              <div>
                                <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                                  ⏳ Trial: {daysLeft}d left
                                </span>
                                {end && <span style={{ display: 'block', fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>Until: {end.toLocaleDateString('en-GB')}</span>}
                              </div>
                            )
                          ) : (
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                              ⭐ Subscribed ({u.billingType || 'Active'})
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', color: '#00a896', fontWeight: '600' }}>
                          {u.packageId?.name || (u.isTrial ? `Trial (${u.trialDays || 14}d)` : 'Standard Plan')}
                        </td>

                        {availableFeatures.map(feat => {
                          const isUnlocked = uFeatures.includes(feat);
                          return (
                            <td key={feat} style={{ padding: '14px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleToggleUserFeature(u, feat)}
                                style={{
                                  background: isUnlocked ? '#e8f5e9' : '#ffebee',
                                  color: isUnlocked ? '#2e7d32' : '#c62828',
                                  border: isUnlocked ? '1px solid #a5d6a7' : '1px solid #ef9a9a',
                                  padding: '5px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                title={`Click to ${isUnlocked ? 'Lock' : 'Unlock'} ${getFeatureLabel(feat)}`}
                              >
                                {isUnlocked ? '🔓' : '🔒'}
                              </button>
                            </td>
                          );
                        })}

                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenUserActivity(u)}
                              style={{
                                background: 'linear-gradient(135deg, #028090 0%, #00a896 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(2,128,144,0.2)'
                              }}
                              title="Click to view full working time, active sessions, and project details"
                            >
                              📊 Projects & Time
                            </button>
                            <button
                              onClick={() => handleOpenTrialModal(u)}
                              style={{
                                background: 'rgba(0, 168, 150, 0.1)',
                                color: '#00a896',
                                border: '1px solid rgba(0, 168, 150, 0.3)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              title="Extend or manage trial for this user"
                            >
                              ⏱️ Trial
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#dc2626',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              title="Delete this user permanently"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual User Trial Management Modal (Owner decide karega kitne din ka dena hai) */}
      {trialModalOpen && selectedUserForTrial && (
        <div className="modal-overlay" style={{ zIndex: 11000 }}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '30px', borderRadius: '16px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#1a1a2e', fontWeight: '800' }}>
                  ⏱️ Manage User Free Trial
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  {selectedUserForTrial.email} ({selectedUserForTrial.companyName || selectedUserForTrial.name || 'Organization'})
                </p>
              </div>
              <button
                onClick={() => { setTrialModalOpen(false); setSelectedUserForTrial(null); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Account Type:</span>
                <strong style={{ color: selectedUserForTrial.isTrial ? '#0f766e' : '#1d4ed8' }}>
                  {selectedUserForTrial.isTrial ? 'Free Trial' : 'Permanent / Paid'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Current Status:</span>
                <strong style={{ color: selectedUserForTrial.subscriptionStatus === 'expired' ? '#dc2626' : '#16a34a' }}>
                  {selectedUserForTrial.subscriptionStatus?.toUpperCase() || 'ACTIVE'}
                </strong>
              </div>
              {selectedUserForTrial.trialEndDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Trial Expiry:</span>
                  <strong style={{ color: '#1e293b' }}>
                    {new Date(selectedUserForTrial.trialEndDate).toLocaleDateString('en-GB')}
                  </strong>
                </div>
              )}
            </div>

            {/* Quick Extension Options */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '8px', fontSize: '0.95rem' }}>
                ⚡ Quick Extend Free Trial:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[7, 14, 30, 60].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleUpdateUserTrial(selectedUserForTrial, { addDays: days })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: '1px solid #00a896',
                      background: 'rgba(0,168,150,0.08)',
                      color: '#00a896',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    +{days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Days Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '8px', fontSize: '0.95rem' }}>
                ✏️ Or Set Exact Custom Days:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extendDaysInput}
                  onChange={(e) => setExtendDaysInput(Math.max(1, Number(e.target.value)))}
                  style={{ width: '100px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 'bold' }}
                />
                <button
                  type="button"
                  onClick={() => handleUpdateUserTrial(selectedUserForTrial, { trialDays: extendDaysInput })}
                  style={{
                    flex: 1,
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  Apply {extendDaysInput}-Day Trial
                </button>
              </div>
            </div>

            {/* Other actions: Convert to Permanent Paid or Expire Now */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => handleUpdateUserTrial(selectedUserForTrial, { isTrial: false, subscriptionStatus: 'active' })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ⭐ Convert to Paid Account
              </button>

              <button
                type="button"
                onClick={() => handleUpdateUserTrial(selectedUserForTrial, { subscriptionStatus: 'expired' })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🔒 Expire Trial Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Working Time & Associated Projects Modal */}
      {activityModalOpen && selectedUserForActivity && (
        <div 
          className="modal-overlay" 
          style={{ 
            zIndex: 11500, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(4px)',
            padding: '20px',
            position: 'fixed',
            inset: 0
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '1200px', 
              width: '100%', 
              maxHeight: '92vh', 
              borderRadius: '16px', 
              background: '#ffffff', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#ffffff' }}>
                    🏢 {selectedUserForActivity.companyName || selectedUserForActivity.name || 'Company Profile'}
                  </h3>
                  {selectedUserForActivity.companyCode && (
                    <span style={{ background: 'rgba(0, 168, 150, 0.3)', border: '1px solid #00a896', color: '#5eead4', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      Code: {selectedUserForActivity.companyCode}
                    </span>
                  )}
                  <span style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    Role: {selectedUserForActivity.role || 'Admin'}
                  </span>
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.88rem', color: '#94a3b8', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>📧 {selectedUserForActivity.email}</span>
                  {selectedUserForActivity.contact && <span>📞 {selectedUserForActivity.contact}</span>}
                  <span>📦 Plan: {selectedUserForActivity.packageId?.name || (selectedUserForActivity.isTrial ? 'Free Trial' : 'Standard')}</span>
                </div>
              </div>
              <button
                onClick={() => { setActivityModalOpen(false); setSelectedUserForActivity(null); setUserActivityData(null); }}
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.4rem', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {activityLoading ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                  <strong style={{ fontSize: '1.1rem' }}>Loading user working time, session logs, and project details...</strong>
                </div>
              ) : userActivityData ? (
                <>
                  {/* KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Card 1: Working Time */}
                    <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#028090', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ⏱️ Platform Working Time
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px 0' }}>
                        {userActivityData.activity?.formattedActiveTime || '0 mins'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Meeting Sessions: <strong>{userActivityData.activity?.totalMeetingHours || '0 hrs'}</strong>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 'bold', marginTop: '4px' }}>
                        Combined Total: {userActivityData.activity?.totalCombinedHours || '0 hrs'}
                      </div>
                    </div>

                    {/* Card 2: Presence & Logins */}
                    <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#028090', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🕒 Activity & Presence
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: '8px 0 4px 0' }}>
                        {userActivityData.activity?.lastActiveAt ? formatRelativeTime(userActivityData.activity.lastActiveAt) : 'Never'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Last Active: {userActivityData.activity?.lastActiveAt ? new Date(userActivityData.activity.lastActiveAt).toLocaleString('en-GB') : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        Total Logins: <strong>{userActivityData.activity?.loginCount || 1}</strong>
                      </div>
                    </div>

                    {/* Card 3: Projects & Studies */}
                    <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#028090', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📁 Studies & Scenarios
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px 0' }}>
                        {userActivityData.summary?.totalStudies || 0} Studies
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Nodes: <strong>{userActivityData.summary?.totalNodes || 0}</strong> | Scenarios: <strong>{userActivityData.summary?.totalScenarios || 0}</strong>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                        Recommendations: <strong>{userActivityData.summary?.totalRecommendations || 0}</strong>
                      </div>
                    </div>

                    {/* Card 4: Compliance & Team */}
                    <div style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#028090', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🔄 Management & Team
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px 0' }}>
                        {userActivityData.summary?.totalMocs || 0} MOCs
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Team Members: <strong>{userActivityData.summary?.totalTeamMembers || 0}</strong>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                        Recorded Sessions: <strong>{userActivityData.summary?.totalSessions || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '18px', overflowX: 'auto' }}>
                    <button
                      onClick={() => setActivityTab('studies')}
                      style={{
                        padding: '10px 18px',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        border: 'none',
                        borderBottom: activityTab === 'studies' ? '3px solid #00a896' : '3px solid transparent',
                        background: 'transparent',
                        color: activityTab === 'studies' ? '#00a896' : '#64748b'
                      }}
                    >
                      📁 Studies & Projects ({userActivityData.studies?.length || 0})
                    </button>
                    <button
                      onClick={() => setActivityTab('mocs')}
                      style={{
                        padding: '10px 18px',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        border: 'none',
                        borderBottom: activityTab === 'mocs' ? '3px solid #00a896' : '3px solid transparent',
                        background: 'transparent',
                        color: activityTab === 'mocs' ? '#00a896' : '#64748b'
                      }}
                    >
                      🔄 MOC Tickets ({userActivityData.mocs?.length || 0})
                    </button>
                    <button
                      onClick={() => setActivityTab('team')}
                      style={{
                        padding: '10px 18px',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        border: 'none',
                        borderBottom: activityTab === 'team' ? '3px solid #00a896' : '3px solid transparent',
                        background: 'transparent',
                        color: activityTab === 'team' ? '#00a896' : '#64748b'
                      }}
                    >
                      👥 Team Members ({userActivityData.teamMembers?.length || 0})
                    </button>
                    <button
                      onClick={() => setActivityTab('sessions')}
                      style={{
                        padding: '10px 18px',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        border: 'none',
                        borderBottom: activityTab === 'sessions' ? '3px solid #00a896' : '3px solid transparent',
                        background: 'transparent',
                        color: activityTab === 'sessions' ? '#00a896' : '#64748b'
                      }}
                    >
                      ⏱️ Meeting Sessions ({userActivityData.sessions?.length || 0})
                    </button>
                  </div>

                  {/* Tab 1: Studies & Projects */}
                  {activityTab === 'studies' && (
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
                          Studies Under Company Code: {selectedUserForActivity.companyCode || 'N/A'}
                        </div>
                        <input
                          type="text"
                          placeholder="🔍 Filter studies by name, facility, or PHA type..."
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', minWidth: '300px' }}
                        />
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '12px 16px' }}>Study / Project Name</th>
                              <th style={{ padding: '12px 14px' }}>PHA Type</th>
                              <th style={{ padding: '12px 14px' }}>Facility / Unit</th>
                              <th style={{ padding: '12px 12px', textAlign: 'center' }}>Nodes</th>
                              <th style={{ padding: '12px 12px', textAlign: 'center' }}>Scenarios</th>
                              <th style={{ padding: '12px 12px', textAlign: 'center' }}>Recs</th>
                              <th style={{ padding: '12px 14px' }}>Status</th>
                              <th style={{ padding: '12px 16px' }}>Last Accessed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userActivityData.studies
                              ?.filter(s => {
                                if (!activitySearch) return true;
                                const q = activitySearch.toLowerCase();
                                return (s.studyName?.toLowerCase().includes(q) ||
                                  s.projectName?.toLowerCase().includes(q) ||
                                  s.facility?.toLowerCase().includes(q) ||
                                  s.phaType?.toLowerCase().includes(q));
                              })
                              .map(s => (
                                <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '12px 16px' }}>
                                    <strong style={{ color: '#0f172a', display: 'block' }}>{s.studyName}</strong>
                                    {s.projectName && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Proj: {s.projectName}</span>}
                                    {(s.studyCoordinator || s.facilitator) && (
                                      <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>
                                        {s.facilitator ? `Facilitator: ${s.facilitator}` : `Coordinator: ${s.studyCoordinator}`}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px 14px' }}>
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                      {s.phaType || 'HAZOP'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                                    {s.facility || '-'}{s.plantUnit ? ` / ${s.plantUnit}` : ''}
                                  </td>
                                  <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>
                                    {s.nodesCount}
                                  </td>
                                  <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#028090' }}>
                                    {s.scenariosCount}
                                  </td>
                                  <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 'bold', color: '#d97706' }}>
                                    {s.recommendationsCount}
                                  </td>
                                  <td style={{ padding: '12px 14px' }}>
                                    <span style={{
                                      background: s.studyStatus === 'Completed' ? '#dcfce7' : s.studyStatus === 'In Progress' ? '#fef9c3' : '#f1f5f9',
                                      color: s.studyStatus === 'Completed' ? '#15803d' : s.studyStatus === 'In Progress' ? '#854d0e' : '#475569',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.78rem',
                                      fontWeight: '600'
                                    }}>
                                      {s.studyStatus || 'Planned'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.82rem' }}>
                                    {s.lastAccessed ? new Date(s.lastAccessed).toLocaleDateString('en-GB') : '-'}
                                  </td>
                                </tr>
                              ))}
                            {userActivityData.studies?.length === 0 && (
                              <tr>
                                <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                  No studies or PHA projects created yet under this account.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: MOC Tickets */}
                  {activityTab === 'mocs' && (
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '12px 16px' }}>MOC ID / Title</th>
                              <th style={{ padding: '12px 14px' }}>Plant</th>
                              <th style={{ padding: '12px 14px' }}>Department</th>
                              <th style={{ padding: '12px 14px' }}>Current Stage</th>
                              <th style={{ padding: '12px 14px' }}>Status</th>
                              <th style={{ padding: '12px 16px' }}>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userActivityData.mocs?.map(m => (
                              <tr key={m._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 16px' }}>
                                  <strong style={{ color: '#0f172a', display: 'block' }}>{m.title || 'Untitled MOC'}</strong>
                                  <span style={{ color: '#028090', fontSize: '0.78rem', fontWeight: 'bold' }}>#{m.mocId || m._id}</span>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>{m.plant || '-'}</td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>{m.department || '-'}</td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>Stage {m.currentStageIndex ?? 1}</td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{
                                    background: m.status === 'Completed' || m.status === 'Approved' ? '#dcfce7' : '#fef9c3',
                                    color: m.status === 'Completed' || m.status === 'Approved' ? '#15803d' : '#854d0e',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: '600'
                                  }}>
                                    {m.status || 'Active'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.82rem' }}>
                                  {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-GB') : '-'}
                                </td>
                              </tr>
                            ))}
                            {userActivityData.mocs?.length === 0 && (
                              <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                  No MOC tickets logged yet for this account.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Team Members */}
                  {activityTab === 'team' && (
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '12px 16px' }}>Member Name</th>
                              <th style={{ padding: '12px 16px' }}>Email Address</th>
                              <th style={{ padding: '12px 14px' }}>Role</th>
                              <th style={{ padding: '12px 14px' }}>Department</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userActivityData.teamMembers?.map(t => (
                              <tr key={t._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0f172a' }}>{t.name}</td>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{t.email}</td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                                    {t.role || 'Member'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>{t.department || '-'}</td>
                              </tr>
                            ))}
                            {userActivityData.teamMembers?.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                  No team members registered yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Meeting Sessions */}
                  {activityTab === 'sessions' && (
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '12px 16px' }}>Date</th>
                              <th style={{ padding: '12px 14px' }}>Duration</th>
                              <th style={{ padding: '12px 16px' }}>Study / Objective</th>
                              <th style={{ padding: '12px 16px' }}>Comments / Scribe Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userActivityData.sessions?.map(sess => (
                              <tr key={sess._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0f172a' }}>
                                  {sess.date ? new Date(sess.date).toLocaleDateString('en-GB') : '-'}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    ⏱️ {sess.duration || 'N/A'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#334155' }}>
                                  {sess.objective || sess.studyId || 'HAZOP Session'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.84rem' }}>
                                  {sess.comments || '-'}
                                </td>
                              </tr>
                            ))}
                            {userActivityData.sessions?.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                  No HAZOP meeting sessions recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Active working time is tracked in real-time as users engage with PS-MagnaShield worksheets and tools.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenUserActivity(selectedUserForActivity)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}
                >
                  🔄 Refresh Data
                </button>
                <button
                  type="button"
                  onClick={() => { setActivityModalOpen(false); setSelectedUserForActivity(null); setUserActivityData(null); }}
                  style={{ padding: '8px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Live Demo Modal */}
      {scheduleModalOpen && selectedDemoForSchedule && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '30px', maxWidth: '540px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{ background: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '800' }}>
                  🗓️ Schedule Live Demo & Send Invite
                </span>
                <h3 style={{ margin: '8px 0 2px 0', fontSize: '1.35rem', color: '#1e293b', fontWeight: '800' }}>
                  {selectedDemoForSchedule.name}
                </h3>
                <div style={{ fontSize: '0.86rem', color: '#64748b' }}>
                  {selectedDemoForSchedule.company} &bull; <span style={{ color: '#00a896', fontWeight: '600' }}>{selectedDemoForSchedule.email}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontSize: '1.25rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              {/* Meeting Date & Time */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.86rem', color: '#334155', marginBottom: '6px' }}>
                  Meeting Date & Time (IST) *
                </label>
                <input 
                  type="datetime-local" 
                  required
                  value={scheduleForm.scheduledAt}
                  onChange={e => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              {/* Meeting Link */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.86rem', color: '#334155', marginBottom: '6px' }}>
                  Google Meet / Video Link *
                </label>
                <input 
                  type="url" 
                  required
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  value={scheduleForm.meetingLink}
                  onChange={e => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              {/* Message Box */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.86rem', color: '#334155', marginBottom: '6px' }}>
                  Custom Message / Agenda for Lead
                </label>
                <textarea 
                  rows="3"
                  placeholder="e.g. Hi Krishna, we have reserved this slot to walk through the HAZOP & Incident Investigation modules for your plant units..."
                  value={scheduleForm.scheduledMessage}
                  onChange={e => setScheduleForm({ ...scheduleForm, scheduledMessage: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.82rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✉️</span>
                <span>Saving will update status to <strong>Scheduled</strong> and instantly dispatch an official invite email with the Google Meet link to <strong>{selectedDemoForSchedule.email}</strong>.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingSchedule}
                  style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#00a896', color: '#ffffff', cursor: isSavingSchedule ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(0,168,150,0.3)' }}
                >
                  {isSavingSchedule ? 'Saving & Sending Invite...' : '🚀 Confirm & Send Meet Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Create / Edit Modal with Pricing Calculator */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.6rem', color: '#1a1a2e' }}>
              {editingPackageId ? '✏️ Edit Subscription Package' : '✨ Create Subscription Package'}
            </h2>

            {/* Excel Formula Pricing Calculator Accordion */}
            <div style={{ background: '#f0f9ff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.3rem' }}>🧮</span>
                  <div>
                    <strong style={{ color: '#0369a1', fontSize: '1.05rem', display: 'block' }}>Excel Pricing Calculator</strong>
                    <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>Auto-calculate One-Time & 25% Annual AMC</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowCalculator(!showCalculator)}
                  style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #7dd3fc', padding: '6px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {showCalculator ? '▲ Hide Calculator' : '▼ Open Calculator'}
                </button>
              </div>

              {showCalculator && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #7dd3fc' }}>
                  {/* Select Modules */}
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0369a1', display: 'block', marginBottom: '8px' }}>
                    1. Select Modules (Base ₹{(calcBaseRate).toLocaleString('en-IN')} each):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {availableFeatures.map(f => {
                      const isSelected = calcModules.includes(f);
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            setCalcModules(prev => isSelected ? prev.filter(m => m !== f) : [...prev, f]);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            background: isSelected ? '#0284c7' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#475569',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {getFeatureLabel(f)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Users and AMC inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0369a1' }}>2. Number of Users</label>
                      <input 
                        type="number"
                        min="1"
                        value={calcUsers}
                        onChange={e => setCalcUsers(Math.max(1, Number(e.target.value)))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #7dd3fc', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0369a1' }}>3. Annual AMC Rate (%)</label>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        value={calcAmcPercent}
                        onChange={e => setCalcAmcPercent(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #7dd3fc', marginTop: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Configurable Rates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#64748b' }}>Base Rate per Module (₹)</label>
                      <input 
                        type="number"
                        step="50000"
                        value={calcBaseRate}
                        onChange={e => setCalcBaseRate(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '3px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#64748b' }}>Rate per Add'l User (₹)</label>
                      <input 
                        type="number"
                        step="50000"
                        value={calcAddUserRate}
                        onChange={e => setCalcAddUserRate(Number(e.target.value))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '3px' }}
                      />
                    </div>
                  </div>

                  {/* Calculation Breakdown Result Box */}
                  <div style={{ background: '#ffffff', borderRadius: '8px', padding: '14px 16px', border: '1px solid #bae6fd', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Modules Base Cost ({calcModules.length} × ₹{calcBaseRate.toLocaleString('en-IN')}):</span>
                      <strong style={{ color: '#0f172a' }}>₹{calcBaseTotal.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#64748b' }}>Additional Users ({calcAddUsersCount} Add'l × ₹{calcAddUserRate.toLocaleString('en-IN')}):</span>
                      <strong style={{ color: '#0f172a' }}>+₹{calcAddUsersTotal.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>One-Time Total</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0284c7' }}>
                          ₹{calcOneTimeTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Annual Total ({calcAmcPercent}% AMC)</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#059669' }}>
                          ₹{calcAnnualTotal.toLocaleString('en-IN')}<span style={{ fontSize: '0.8rem', color: '#666' }}>/yr</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCalculation}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(2,132,199,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    ⚡ Apply Excel Pricing (₹{calcOneTimeTotal.toLocaleString('en-IN')} One-Time & ₹{calcAnnualTotal.toLocaleString('en-IN')}/yr)
                  </button>

                  {calcAppliedNotice && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                      {calcAppliedNotice}
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSavePackage}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label style={{ fontWeight: '700', color: '#333' }}>Package Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. HAZOP+LOPA (4 Users)"
                  required 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '6px' }}
                />
              </div>

              {/* Payment Methods Section (Dual One-Time & Annual) */}
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '10px', border: '1px solid #e1e4e8', marginBottom: '18px' }}>
                <label style={{ fontWeight: '800', color: '#1a1a2e', display: 'block', marginBottom: '10px' }}>
                  💳 Payment Methods & Pricing (Enable one or both for this package)
                </label>

                {/* One-Time Payment Option */}
                <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #eee' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#028090' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.hasOneTime} 
                      onChange={e => setFormData({...formData, hasOneTime: e.target.checked})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    Enable One-Time Payment (Perpetual / Lifetime)
                  </label>
                  {formData.hasOneTime && (
                    <div style={{ marginTop: '8px', paddingLeft: '26px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#555' }}>One-Time Price (₹)</label>
                      <input 
                        type="number" 
                        value={formData.oneTimePrice} 
                        onChange={e => setFormData({...formData, oneTimePrice: Number(e.target.value)})}
                        required={formData.hasOneTime}
                        min="0"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
                      />
                    </div>
                  )}
                </div>

                {/* Annual Payment Option */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#00a896' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.hasAnnual} 
                      onChange={e => setFormData({...formData, hasAnnual: e.target.checked})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    Enable Annual Payment (AMC / Yearly)
                  </label>
                  {formData.hasAnnual && (
                    <div style={{ marginTop: '8px', paddingLeft: '26px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#555' }}>Annual Price (₹ / year)</label>
                      <input 
                        type="number" 
                        value={formData.annualPrice} 
                        onChange={e => setFormData({...formData, annualPrice: Number(e.target.value)})}
                        required={formData.hasAnnual}
                        min="0"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontWeight: '700', color: '#333' }}>Max Projects (-1 for unlimited)</label>
                  <input 
                    type="number" 
                    value={formData.maxProjects} 
                    onChange={e => setFormData({...formData, maxProjects: Number(e.target.value)})} 
                    required 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '6px' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontWeight: '700', color: '#333' }}>Max Users (-1 for unlimited)</label>
                  <input 
                    type="number" 
                    value={formData.maxUsers} 
                    onChange={e => setFormData({...formData, maxUsers: Number(e.target.value)})} 
                    required 
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '6px' }}
                  />
                </div>
              </div>

              {/* Features List (PHA, MOC, LOPA, BOWTIE, INCIDENT) */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: '800', color: '#1a1a2e', display: 'block', marginBottom: '6px' }}>
                  📦 Included Features / Modules
                </label>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#666' }}>
                  Select which modules will be unlocked for users who subscribe to this package.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {availableFeatures.map(f => {
                    const isChecked = formData.features.includes(f);
                    return (
                      <label 
                        key={f} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          fontWeight: '600',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isChecked ? '1px solid #00a896' : '1px solid #e1e4e8',
                          background: isChecked ? 'rgba(0,168,150,0.06)' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleFeatureToggle(f)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>{getFeatureLabel(f)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#666' }} 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,168,150,0.3)' }}
                >
                  {editingPackageId ? '💾 Update Package' : '✨ Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformOwnerDashboard;
