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
  const [undoStack, setUndoStack] = useState([]);
  const [undoToast, setUndoToast] = useState(null);
  const [riskCriteria, setRiskCriteria] = useState(null);

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

      // Fetch Risk Criteria
      const rcRes = await fetch(`https://api.perpetualsolutions.co.in/api/risk-criteria/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (rcRes.ok) setRiskCriteria(await rcRes.json());

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (sVal, lVal) => {
    const s = parseInt(sVal);
    const l = parseInt(lVal);
    if (!s || !l || !riskCriteria) return 'transparent';
    const cell = riskCriteria.matrixCells?.find(c => c.severityLevel === s && c.likelihoodLevel === l);
    if (!cell) return 'transparent';
    const cat = riskCriteria.riskCategories?.find(c => c.name === cell.category);
    return cat ? cat.color : 'transparent';
  };

  const calculateRiskScore = (sVal, lVal) => {
    const s = parseInt(sVal);
    const l = parseInt(lVal);
    if (isNaN(s) || isNaN(l) || !s || !l) return '';
    if (riskCriteria?.matrixCells) {
      const cell = riskCriteria.matrixCells.find(
        c => String(c.severityLevel) === String(s) && String(c.likelihoodLevel) === String(l)
      );
      if (cell && cell.score) return String(cell.score);
    }
    return String(s * l);
  };

  const renderSeverityOptions = (currentVal) => {
    const levels = (riskCriteria?.severityLevels && riskCriteria.severityLevels.length > 0)
      ? riskCriteria.severityLevels.map(l => l.level)
      : [1, 2, 3, 4, 5];
    const strVal = currentVal !== undefined && currentVal !== null ? String(currentVal) : '';
    return (
      <>
        <option value=""></option>
        {strVal && !levels.some(lvl => String(lvl) === strVal) && (
          <option value={strVal}>{strVal}</option>
        )}
        {levels.map(lvl => (
          <option key={lvl} value={String(lvl)}>{lvl}</option>
        ))}
      </>
    );
  };

  const renderLikelihoodOptions = (currentVal) => {
    const levels = (riskCriteria?.likelihoodLevels && riskCriteria.likelihoodLevels.length > 0)
      ? riskCriteria.likelihoodLevels.map(l => l.level)
      : [1, 2, 3, 4, 5];
    const strVal = currentVal !== undefined && currentVal !== null ? String(currentVal) : '';
    return (
      <>
        <option value=""></option>
        {strVal && !levels.some(lvl => String(lvl) === strVal) && (
          <option value={strVal}>{strVal}</option>
        )}
        {levels.map(lvl => (
          <option key={lvl} value={String(lvl)}>{lvl}</option>
        ))}
      </>
    );
  };

  const handleCellChange = (id, field, value, isCustom = false) => {
    setScenarios(prev => prev.map(sc => {
      if (sc._id === id) {
        if (isCustom) {
          const newData = { ...(sc.recommendationData || {}) };
          newData[field] = value;
          return { ...sc, recommendationData: newData };
        }
        const updated = { ...sc, [field]: value };
        if (field === 'inherentRiskS' || field === 'inherentRiskL') {
          updated.inherentRiskRR = calculateRiskScore(updated.inherentRiskS, updated.inherentRiskL);
        } else if (field === 'mitigatedRiskS' || field === 'mitigatedRiskL') {
          updated.mitigatedRiskRR = calculateRiskScore(updated.mitigatedRiskS, updated.mitigatedRiskL);
        } else if (field === 'residualRiskS' || field === 'residualRiskL') {
          updated.residualRiskRR = calculateRiskScore(updated.residualRiskS, updated.residualRiskL);
        }
        return updated;
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
        if (field === 'inherentRiskS' || field === 'inherentRiskL') {
          const s = field === 'inherentRiskS' ? value : sc.inherentRiskS;
          const l = field === 'inherentRiskL' ? value : sc.inherentRiskL;
          payload.inherentRiskRR = calculateRiskScore(s, l);
        } else if (field === 'mitigatedRiskS' || field === 'mitigatedRiskL') {
          const s = field === 'mitigatedRiskS' ? value : sc.mitigatedRiskS;
          const l = field === 'mitigatedRiskL' ? value : sc.mitigatedRiskL;
          payload.mitigatedRiskRR = calculateRiskScore(s, l);
        } else if (field === 'residualRiskS' || field === 'residualRiskL') {
          const s = field === 'residualRiskS' ? value : sc.residualRiskS;
          const l = field === 'residualRiskL' ? value : sc.residualRiskL;
          payload.residualRiskRR = calculateRiskScore(s, l);
        }
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

  // Auto-scroll and highlight target recommendation if navigated from Action Tracking
  useEffect(() => {
    const targetId = localStorage.getItem('targetScenarioId');
    if (targetId && !loading && sortedScenariosWithRecs.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`rec-row-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const origBg = el.style.backgroundColor;
          el.style.backgroundColor = '#fef08a';
          setTimeout(() => {
            el.style.backgroundColor = origBg;
            localStorage.removeItem('targetScenarioId');
          }, 2500);
        }
      }, 300);
    }
  }, [loading, sortedScenariosWithRecs]);

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
    if (!window.confirm(`Are you sure you want to delete recommendation ${recNo}? You can undo this action.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in';

      setUndoStack(prev => [...prev, {
        scenarioId: sc._id,
        description: `recommendation ${recNo}`,
        fields: {
          additionalProtection: sc.additionalProtection,
          recommendationNo: sc.recommendationNo
        }
      }]);
      setUndoToast({
        message: `Recommendation ${recNo} deleted.`,
        type: 'recommendation'
      });

      await fetch(`${apiUrl}/api/scenarios/${sc._id}`, {
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

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setUndoToast(null);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in';

      const res = await fetch(`${apiUrl}/api/scenarios/${lastAction.scenarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          additionalProtection: lastAction.fields.additionalProtection,
          recommendationNo: lastAction.fields.recommendationNo
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setScenarios(prev => prev.map(s => s._id === lastAction.scenarioId ? updated : s));
        setUndoToast({
          message: `↩️ Restored ${lastAction.description} successfully!`,
          isSuccess: true
        });
      }
    } catch (err) {
      console.error('Failed to undo deletion:', err);
      alert('Failed to undo deletion: ' + err.message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, scenarios]);

  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [undoToast]);

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
              <th>INHERENT S</th>
              <th>INHERENT L</th>
              <th>INHERENT RR</th>
              <th>MITIGATED S</th>
              <th>MITIGATED L</th>
              <th>MITIGATED RR</th>
              <th>RESIDUAL S</th>
              <th>RESIDUAL L</th>
              <th>RESIDUAL RR</th>
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
            <td colspan="${15 + columns.length}">📁 NODE: ${nodeDesc}</td>
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
          <td>${sc.inherentRiskS || ''}</td>
          <td>${sc.inherentRiskL || ''}</td>
          <td>${sc.inherentRiskRR || calculateRiskScore(sc.inherentRiskS, sc.inherentRiskL)}</td>
          <td>${sc.mitigatedRiskS || ''}</td>
          <td>${sc.mitigatedRiskL || ''}</td>
          <td>${sc.mitigatedRiskRR || calculateRiskScore(sc.mitigatedRiskS, sc.mitigatedRiskL)}</td>
          <td>${sc.residualRiskS || ''}</td>
          <td>${sc.residualRiskL || ''}</td>
          <td>${sc.residualRiskRR || calculateRiskScore(sc.residualRiskS, sc.residualRiskL)}</td>
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
    let csv = `"REC NO","RECOMMENDATION STATEMENT","NODE","DEVIATION","CAUSE","CONSEQUENCE","INHERENT S","INHERENT L","INHERENT RR","MITIGATED S","MITIGATED L","MITIGATED RR","RESIDUAL S","RESIDUAL L","RESIDUAL RR",${colHeaders.join(',')}\n`;

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
        escape(sc.inherentRiskS),
        escape(sc.inherentRiskL),
        escape(sc.inherentRiskRR || calculateRiskScore(sc.inherentRiskS, sc.inherentRiskL)),
        escape(sc.mitigatedRiskS),
        escape(sc.mitigatedRiskL),
        escape(sc.mitigatedRiskRR || calculateRiskScore(sc.mitigatedRiskS, sc.mitigatedRiskL)),
        escape(sc.residualRiskS),
        escape(sc.residualRiskL),
        escape(sc.residualRiskRR || calculateRiskScore(sc.residualRiskS, sc.residualRiskL)),
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
          <span className="editable-indicator-badge">✏️ Highlighted fields are editable</span>
        </div>

        <div className="dynamic-toolbar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canEdit && (
            <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
              <span className="icon">◫</span> MANAGE COLUMNS
            </button>
          )}
          {canEdit && (
            <button 
              className="btn-manage-columns" 
              onClick={handleUndo} 
              disabled={undoStack.length === 0}
              title={undoStack.length > 0 ? `Undo ${undoStack[undoStack.length - 1].description}` : 'Undo'}
              style={{ 
                backgroundColor: undoStack.length > 0 ? '#2563eb' : '#64748b', 
                color: '#ffffff', 
                border: 'none',
                opacity: undoStack.length > 0 ? 1 : 0.6
              }}
            >
              ↩️ UNDO {undoStack.length > 0 ? `(${undoStack.length})` : ''}
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
                <th rowSpan={2} style={{width:'60px', textAlign:'center'}}>#</th>
                <th rowSpan={2} className="col-custom" style={{width: '280px'}}>RECOMMENDATION STATEMENT</th>
                
                <th colSpan={3} className="th-risk-inherent" style={{textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)'}}>INHERENT RISK</th>
                <th colSpan={3} className="th-risk-mitigated" style={{textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)'}}>MITIGATED RISK</th>
                <th colSpan={3} className="th-risk-residual" style={{textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)'}}>RESIDUAL RISK</th>
                
                <th rowSpan={2} style={{width: '90px', textAlign: 'center'}}>ACTIONS</th>
                {columns.map(col => (
                  <th key={col.id} rowSpan={2} className="col-custom">{col.label}</th>
                ))}
              </tr>
              <tr>
                {/* Inherent Risk Sub-headers */}
                <th className="th-risk-sub w-risk-s">S</th>
                <th className="th-risk-sub w-risk-l">L</th>
                <th className="th-risk-sub w-risk-rr">IR</th>

                {/* Mitigated Risk Sub-headers */}
                <th className="th-risk-sub w-risk-s">S</th>
                <th className="th-risk-sub w-risk-l">L</th>
                <th className="th-risk-sub w-risk-rr">MR</th>

                {/* Residual Risk Sub-headers */}
                <th className="th-risk-sub w-risk-s">S</th>
                <th className="th-risk-sub w-risk-l">L</th>
                <th className="th-risk-sub w-risk-rr">RR</th>
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
                        <td colSpan={12 + columns.length} style={{ padding: '8px 12px', color: '#0f172a', fontSize: '12px' }}>
                          📁 NODE: {sc.nodeId?.description || 'General Node'}
                        </td>
                      </tr>
                    )}
                    <tr id={`rec-row-${sc._id}`}>
                      <td style={{textAlign:'center', fontWeight:'bold', color:'#0369a1'}}>{recNo}</td>
                      <td className="col-custom">
                        <textarea disabled={!canEdit} data-gramm="false" spellCheck={true} 
                          value={sc.additionalProtection || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'additionalProtection', e.target.value)}
                          onBlur={(e) => handleBlur(sc._id, 'additionalProtection', e.target.value)}
                        />
                      </td>

                      {/* INHERENT RISK */}
                      <td className="w-risk-s">
                        <select 
                          disabled={!canEdit}
                          className="risk-level-select"
                          value={sc.inherentRiskS || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'inherentRiskS', e.target.value)} 
                          onBlur={(e) => handleBlur(sc._id, 'inherentRiskS', e.target.value)}
                        >
                          {renderSeverityOptions(sc.inherentRiskS)}
                        </select>
                      </td>
                      <td className="w-risk-l">
                        <select 
                          disabled={!canEdit}
                          className="risk-level-select"
                          value={sc.inherentRiskL || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'inherentRiskL', e.target.value)} 
                          onBlur={(e) => handleBlur(sc._id, 'inherentRiskL', e.target.value)}
                        >
                          {renderLikelihoodOptions(sc.inherentRiskL)}
                        </select>
                      </td>
                      <td className="w-risk-rr" style={{
                        backgroundColor: getRiskColor(sc.inherentRiskS, sc.inherentRiskL),
                        color: getRiskColor(sc.inherentRiskS, sc.inherentRiskL) !== 'transparent' ? '#000000' : 'inherit',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {sc.inherentRiskRR || calculateRiskScore(sc.inherentRiskS, sc.inherentRiskL)}
                      </td>

                      {/* MITIGATED RISK */}
                      <td className="w-risk-s">
                        <select 
                          disabled={!canEdit}
                          className="risk-level-select"
                          value={sc.mitigatedRiskS || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'mitigatedRiskS', e.target.value)} 
                          onBlur={(e) => handleBlur(sc._id, 'mitigatedRiskS', e.target.value)}
                        >
                          {renderSeverityOptions(sc.mitigatedRiskS)}
                        </select>
                      </td>
                      <td className="w-risk-l">
                        <select 
                          disabled={!canEdit}
                          className="risk-level-select"
                          value={sc.mitigatedRiskL || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'mitigatedRiskL', e.target.value)} 
                          onBlur={(e) => handleBlur(sc._id, 'mitigatedRiskL', e.target.value)}
                        >
                          {renderLikelihoodOptions(sc.mitigatedRiskL)}
                        </select>
                      </td>
                      <td className="w-risk-rr" style={{
                        backgroundColor: getRiskColor(sc.mitigatedRiskS, sc.mitigatedRiskL),
                        color: getRiskColor(sc.mitigatedRiskS, sc.mitigatedRiskL) !== 'transparent' ? '#000000' : 'inherit',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {sc.mitigatedRiskRR || calculateRiskScore(sc.mitigatedRiskS, sc.mitigatedRiskL)}
                      </td>

                      {/* RESIDUAL RISK */}
                      <td className="w-risk-s">
                        <select 
                          disabled={!canEdit}
                          className="risk-level-select"
                          value={sc.residualRiskS || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'residualRiskS', e.target.value)} 
                          onBlur={(e) => handleBlur(sc._id, 'residualRiskS', e.target.value)}
                        >
                          {renderSeverityOptions(sc.residualRiskS)}
                        </select>
                      </td>
                      <td className="w-risk-l">
                        <select 
                          disabled={!canEdit}
                          className="risk-level-select"
                          value={sc.residualRiskL || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'residualRiskL', e.target.value)} 
                          onBlur={(e) => handleBlur(sc._id, 'residualRiskL', e.target.value)}
                        >
                          {renderLikelihoodOptions(sc.residualRiskL)}
                        </select>
                      </td>
                      <td className="w-risk-rr" style={{
                        backgroundColor: getRiskColor(sc.residualRiskS, sc.residualRiskL),
                        color: getRiskColor(sc.residualRiskS, sc.residualRiskL) !== 'transparent' ? '#000000' : 'inherit',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        {sc.residualRiskRR || calculateRiskScore(sc.residualRiskS, sc.residualRiskL)}
                      </td>
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

      {/* Floating Undo Notification Toast */}
      {undoToast && (
        <div className="pha-undo-toast">
          <span>{undoToast.message}</span>
          {!undoToast.isSuccess && (
            <button className="pha-undo-toast-btn" onClick={handleUndo}>
              ↩️ Undo
            </button>
          )}
          <button className="pha-undo-toast-close" onClick={() => setUndoToast(null)} title="Dismiss">
            ✕
          </button>
        </div>
      )}
    </StudyLayout>
  );
};

export default RecommendationRegistry;
