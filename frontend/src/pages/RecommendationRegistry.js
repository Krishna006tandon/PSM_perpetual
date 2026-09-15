import React, { useState, useEffect, useMemo } from 'react';
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
      <textarea disabled={!canEdit} data-gramm="false" spellCheck={true} 
        value={value} 
        onChange={(e) => handleCellChange(sc._id, col.id, e.target.value, true)}
        onBlur={(e) => handleBlur(sc._id, col.id, e.target.value, true)}
      />
    );
  };

  // Node-wise sorting (Issue 7)
  const sortedScenariosWithRecs = useMemo(() => {
    const recs = scenarios.filter(sc => sc.additionalProtection && sc.additionalProtection.trim() !== '');
    const nodeOrderMap = {};
    nodes.forEach((n, idx) => {
      nodeOrderMap[n._id] = n.order !== undefined ? n.order : idx;
    });

    return [...recs].sort((a, b) => {
      const nodeA = a.nodeId?._id || a.nodeId;
      const nodeB = b.nodeId?._id || b.nodeId;
      const orderA = nodeOrderMap[nodeA] ?? 9999;
      const orderB = nodeOrderMap[nodeB] ?? 9999;
      if (orderA !== orderB) return orderA - orderB;

      const devA = a.deviationId?.deviationAuto || '';
      const devB = b.deviationId?.deviationAuto || '';
      if (devA !== devB) return devA.localeCompare(devB);

      return (a.order || 0) - (b.order || 0);
    });
  }, [scenarios, nodes]);

  // Dynamic sequential recommendation numbering (Issue 11 & 12)
  const recNumberMap = useMemo(() => {
    const map = {};
    let counter = 1;
    sortedScenariosWithRecs.forEach((sc) => {
      if (sc.recommendationNo) {
        map[sc._id] = sc.recommendationNo;
      } else {
        map[sc._id] = `R${counter++}`;
      }
    });
    return map;
  }, [sortedScenariosWithRecs]);

  // Delete Recommendation with warning and auto-renumber (Issue 11)
  const handleDeleteRecommendation = async (sc) => {
    const recNo = recNumberMap[sc._id] || 'this recommendation';
    if (!window.confirm(`Are you sure you want to delete recommendation ${recNo}? This action cannot be undone and will re-number remaining recommendations.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${sc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ additionalProtection: '', recommendationNo: '' })
      });

      setScenarios(prev => prev.map(s => s._id === sc._id ? { ...s, additionalProtection: '', recommendationNo: '' } : s));
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      alert('Failed to delete recommendation.');
    }
  };

  // Export Recommendation Sheet to Excel (Issue 9)
  const exportToExcel = () => {
    const colHeaders = columns.map(c => c.label);
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Recommendations</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
          td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
          .node-hdr { background-color: #e2e8f0; font-weight: bold; font-size: 13px; color: #0f172a; }
        </style>
      </head>
      <body>
        <h2>RECOMMENDATIONS REGISTRY - ${study.studyName || ''}</h2>
        <p>Project: ${study.projectName || ''} | Facility: ${study.facilityName || ''} | Generated: ${new Date().toLocaleDateString()}</p>
        <table border="1">
          <thead>
            <tr>
              <th>#</th>
              <th>RECOMMENDATION STATEMENT</th>
              <th>NODE</th>
              <th>DEVIATION</th>
              <th>CAUSE</th>
              <th>CONSEQUENCE</th>
              ${colHeaders.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    let lastNodeId = null;
    sortedScenariosWithRecs.forEach((sc) => {
      const nodeDesc = sc.nodeId?.description || 'General Node';
      if (sc.nodeId?._id !== lastNodeId) {
        lastNodeId = sc.nodeId?._id;
        tableHtml += `
          <tr class="node-hdr">
            <td colspan="${6 + columns.length}">📁 NODE: ${nodeDesc}</td>
          </tr>
        `;
      }

      const recNo = recNumberMap[sc._id] || '';
      const customCells = columns.map(c => `<td>${(sc.recommendationData && sc.recommendationData[c.id]) || ''}</td>`).join('');
      tableHtml += `
        <tr>
          <td align="center" style="font-weight: bold;">${recNo}</td>
          <td>${sc.additionalProtection || ''}</td>
          <td>${nodeDesc}</td>
          <td>${sc.deviationId?.deviationAuto || ''}</td>
          <td>${sc.causeId?.description || ''}</td>
          <td>${sc.consequencesImmediate || ''}</td>
          ${customCells}
        </tr>
      `;
    });

    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Recommendations_Registry_${study.studyName || 'Study'}.xls`;
    link.click();
  };

  // Export Recommendation Sheet to CSV (Issue 9)
  const exportToCSV = () => {
    const colHeaders = columns.map(c => `"${c.label.replace(/"/g, '""')}"`);
    let csv = `"REC NO","RECOMMENDATION STATEMENT","NODE","DEVIATION","CAUSE","CONSEQUENCE",${colHeaders.join(',')}\n`;

    const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
    sortedScenariosWithRecs.forEach((sc) => {
      const recNo = recNumberMap[sc._id] || '';
      const customCells = columns.map(c => escape((sc.recommendationData && sc.recommendationData[c.id]) || ''));
      csv += [
        escape(recNo),
        escape(sc.additionalProtection),
        escape(sc.nodeId?.description),
        escape(sc.deviationId?.deviationAuto),
        escape(sc.causeId?.description),
        escape(sc.consequencesImmediate),
        ...customCells
      ].join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Recommendations_Registry_${study.studyName || 'Study'}.csv`;
    link.click();
  };

  if (!study) return null;

  let renderLastNodeId = null;

  return (
    <StudyLayout activeTab="recommendations" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="dynamic-container">
        <div className="dynamic-header">
          <h2>RECOMMENDATIONS REGISTRY</h2>
        </div>

        <div className="dynamic-toolbar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canEdit && (
            <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
              <span className="icon">◫</span> MANAGE COLUMNS
            </button>
          )}
          <button 
            className="btn-manage-columns" 
            onClick={exportToExcel}
            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none' }}
            title="Export Recommendations to Excel"
          >
            📥 EXPORT EXCEL
          </button>
          <button 
            className="btn-manage-columns" 
            onClick={exportToCSV}
            style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none' }}
            title="Export Recommendations to CSV"
          >
            📥 EXPORT CSV
          </button>
        </div>

        <div className="dynamic-table-wrapper">
          <table className="dynamic-table">
            <thead>
              <tr>
                <th style={{width:'60px'}}>#</th>
                <th className="col-custom">RECOMMENDATION STATEMENT</th>
                <th className="col-node">NODE</th>
                <th className="col-dev">DEVIATION</th>
                <th className="col-cause">CAUSE</th>
                <th className="col-cons">CONSEQUENCE</th>
                <th style={{width: '90px', textAlign: 'center'}}>ACTIONS</th>
                {columns.map(col => (
                  <th key={col.id} className="col-custom">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && sortedScenariosWithRecs.map((sc) => {
                const isNewNode = sc.nodeId?._id !== renderLastNodeId;
                if (isNewNode) {
                  renderLastNodeId = sc.nodeId?._id;
                }
                const recNo = recNumberMap[sc._id] || '';

                return (
                  <React.Fragment key={sc._id}>
                    {isNewNode && (
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                        <td colSpan={7 + columns.length} style={{ padding: '8px 12px', color: '#0f172a', fontSize: '12px' }}>
                          📁 NODE: {sc.nodeId?.description || 'General Node'}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{textAlign:'center', fontWeight:'bold', color:'#0369a1'}}>{recNo}</td>
                      <td className="col-custom">
                        <textarea disabled={!canEdit} data-gramm="false" spellCheck={true} 
                          value={sc.additionalProtection || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'additionalProtection', e.target.value)}
                          onBlur={(e) => handleBlur(sc._id, 'additionalProtection', e.target.value)}
                        />
                      </td>
                      <td className="col-node">{sc.nodeId?.description || ''}</td>
                      <td className="col-dev">{sc.deviationId?.deviationAuto || ''}</td>
                      <td className="col-cause">{sc.causeId?.description || ''}</td>
                      <td className="col-cons">{sc.consequencesImmediate || ''}</td>
                      <td style={{textAlign: 'center', whiteSpace: 'nowrap'}}>
                        <span 
                          title="Go to Worksheet" 
                          onClick={() => {
                            if (sc.nodeId?._id) localStorage.setItem('targetNodeId', sc.nodeId._id);
                            if (sc._id) localStorage.setItem('targetScenarioId', sc._id);
                            onNavigate('pha-worksheets');
                          }} 
                          style={{cursor: 'pointer', color: '#0ea5e9', fontSize: '13px', textDecoration: 'underline', marginRight: '8px'}}
                        >
                          View
                        </span>
                        {canEdit && (
                          <span
                            title="Delete Recommendation"
                            onClick={() => handleDeleteRecommendation(sc)}
                            style={{cursor: 'pointer', color: '#ef4444', fontSize: '14px'}}
                          >
                            🗑️
                          </span>
                        )}
                      </td>
                      {columns.map(col => (
                        <td key={col.id} className="col-custom">
                          {renderCustomCell(sc, col)}
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                );
              })}
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
