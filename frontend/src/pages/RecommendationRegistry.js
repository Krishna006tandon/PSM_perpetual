import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import ManageColumnsModal from '../components/ManageColumnsModal';
import './DynamicRegistry.css';

const RecommendationRegistry = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [scenarios, setScenarios] = useState([]);
  const [columns, setColumns] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [causes, setCauses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [allStudies, setAllStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study._id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch Custom Columns
      const colRes = await fetch(`https://api.perpetualsolutions.co.in/api/columns/${study._id}/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

      // Fetch Scenarios
      const scRes = await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (scRes.ok) {
        const scData = await scRes.json();
        setScenarios(scData);
      }

      // Fetch Team Members
      const teamRes = await fetch(`https://api.perpetualsolutions.co.in/api/teams/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamMembers(teamData);
      }

      // Fetch Nodes
      const nodeRes = await fetch(`https://api.perpetualsolutions.co.in/api/nodes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (nodeRes.ok) {
        const nodeData = await nodeRes.json();
        setNodes(nodeData);
      }

      // Fetch Deviations
      const devRes = await fetch(`https://api.perpetualsolutions.co.in/api/deviations/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (devRes.ok) setDeviations(await devRes.json());

      // Fetch Causes
      const causeRes = await fetch(`https://api.perpetualsolutions.co.in/api/causes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (causeRes.ok) setCauses(await causeRes.json());

      // Fetch Documents
      const docRes = await fetch(`https://api.perpetualsolutions.co.in/api/documents/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (docRes.ok) setDocuments(await docRes.json());

      // Fetch Studies
      const studyRes = await fetch(`https://api.perpetualsolutions.co.in/api/studies/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studyRes.ok) setAllStudies(await studyRes.json());

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (id, field, value, isCustom = false) => {
    setScenarios(prev => prev.map(sc => {
      if (sc._id === id) {
        if (isCustom) {
          const newData = { ...(sc.recommendationData || {}) };
          newData[field] = value;
          return { ...sc, recommendationData: newData };
        }
        return { ...sc, [field]: value };
      }
      return sc;
    }));
  };

  const handleBlur = async (id, field, value, isCustom = false) => {
    try {
      const token = localStorage.getItem('token');
      const sc = scenarios.find(s => s._id === id);
      if (!sc) return;

      let payload = {};
      if (isCustom) {
        payload.recommendationData = { ...(sc.recommendationData || {}) };
        payload.recommendationData[field] = value;
      } else {
        payload[field] = value;
      }

      await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to save scenario:', error);
    }
  };

  const handleColumnsSaved = (newCols) => {
    setColumns(newCols);
    setIsManageColumnsOpen(false);
  };

  const renderCustomCell = (sc, col) => {
    const value = (sc.recommendationData && sc.recommendationData[col.id]) || '';
    
    if (col.type === 'checkbox') {
      const isChecked = value === 'true' || value === true;
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '30px' }}>
          <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
            type="checkbox" 
            checked={isChecked}
            onChange={(e) => {
              const checkedVal = e.target.checked.toString();
              handleCellChange(sc._id, col.id, checkedVal, true);
              handleBlur(sc._id, col.id, checkedVal, true);
            }}
          />
        </div>
      );
    }

    if (col.type === 'dropdown') {
      return (
        <select disabled={!canEdit}  
          value={value} 
          onChange={(e) => {
            handleCellChange(sc._id, col.id, e.target.value, true);
            handleBlur(sc._id, col.id, e.target.value, true);
          }}
        >
          <option value=""></option>
          {(col.options || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (col.type === 'fetch') {
      let fetchOptions = [];
      if (col.dataSource === 'team') {
        fetchOptions = teamMembers.map(tm => tm.fullName);
      } else if (col.dataSource === 'nodes') {
        fetchOptions = nodes.map(n => n.description);
      } else if (col.dataSource === 'deviations') {
        fetchOptions = deviations.map(d => d.deviationAuto);
      } else if (col.dataSource === 'causes') {
        fetchOptions = causes.map(c => c.description);
      } else if (col.dataSource === 'documents') {
        fetchOptions = documents.map(d => d.description || d.originalFileName || d.documentType);
      } else if (col.dataSource === 'studies') {
        fetchOptions = allStudies.map(s => s.studyName);
      } else if (col.dataSource === 'scenarios_consequences') {
        fetchOptions = scenarios.map(s => s.consequencesImmediate);
      } else if (col.dataSource === 'scenarios_safeguards') {
        fetchOptions = scenarios.map(s => s.presentProtection);
      } else if (col.dataSource === 'scenarios_recommendations') {
        fetchOptions = scenarios.map(s => s.additionalProtection);
      }
      
      // Remove empty options and duplicates
      fetchOptions = [...new Set(fetchOptions.filter(Boolean))];

      return (
        <select disabled={!canEdit}  
          value={value} 
          onChange={(e) => {
            handleCellChange(sc._id, col.id, e.target.value, true);
            handleBlur(sc._id, col.id, e.target.value, true);
          }}
        >
          <option value=""></option>
          {fetchOptions.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // Default to text
    return (
      <textarea disabled={!canEdit}  data-gramm="false" spellcheck="false" 
        value={value} 
        onChange={(e) => handleCellChange(sc._id, col.id, e.target.value, true)}
        onBlur={(e) => handleBlur(sc._id, col.id, e.target.value, true)}
      />
    );
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="recommendations" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="dynamic-container">
        <div className="dynamic-header">
          <h2>RECOMMENDATIONS REGISTRY</h2>
        </div>

        <div className="dynamic-toolbar">
          {canEdit && (
            <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
              <span className="icon">◫</span> MANAGE COLUMNS
            </button>
          )}
        </div>

        <div className="dynamic-table-wrapper">
          <table className="dynamic-table">
            <thead>
              <tr>
                <th style={{width:'50px'}}>#</th>
                <th className="col-custom">RECOMMENDATION STATEMENT</th>
                <th className="col-node">NODE</th>
                <th className="col-dev">DEVIATION</th>
                <th className="col-cause">CAUSE</th>
                <th className="col-cons">CONSEQUENCE</th>
                <th style={{width: '60px', textAlign: 'center'}}>LINK</th>
                {columns.map(col => (
                  <th key={col.id} className="col-custom">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && scenarios.filter(sc => sc.additionalProtection && sc.additionalProtection.trim() !== '').map((sc, index) => (
                <tr key={sc._id}>
                  <td style={{textAlign:'center'}}>R{index + 1}</td>
                  <td className="col-custom">
                    <textarea disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      value={sc.additionalProtection || ''} 
                      onChange={(e) => handleCellChange(sc._id, 'additionalProtection', e.target.value)}
                      onBlur={(e) => handleBlur(sc._id, 'additionalProtection', e.target.value)}
                    />
                  </td>
                  <td className="col-node">{sc.nodeId?.description || ''}</td>
                  <td className="col-dev">{sc.deviationId?.deviationAuto || ''}</td>
                  <td className="col-cause">{sc.causeId?.description || ''}</td>
                  <td className="col-cons">{sc.consequencesImmediate || ''}</td>
                  <td style={{textAlign: 'center'}}>
                    <span 
                      title="Go to Worksheet" 
                      onClick={() => {
                        if (sc.nodeId?._id) localStorage.setItem('targetNodeId', sc.nodeId._id);
                        if (sc._id) localStorage.setItem('targetScenarioId', sc._id);
                        onNavigate('pha-worksheets');
                      }} 
                      style={{cursor: 'pointer', color: '#0ea5e9', fontSize: '16px', textDecoration: 'underline'}}
                    >
                      View
                    </span>
                  </td>
                  {columns.map(col => (
                    <td key={col.id} className="col-custom">
                      {renderCustomCell(sc, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isManageColumnsOpen && (
        <ManageColumnsModal 
          studyId={study._id}
          registryType="recommendations"
          onClose={() => setIsManageColumnsOpen(false)}
          onSave={handleColumnsSaved}
        />
      )}
    </StudyLayout>
  );
};

export default RecommendationRegistry;
