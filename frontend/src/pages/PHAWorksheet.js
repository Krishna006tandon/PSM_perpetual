import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddScenarioModal from '../components/AddScenarioModal';
import './PHAWorksheet.css';

// A custom Select component that allows adding new options
const EditableSelect = ({ options, value, onChange, onBlur, className, style, placeholder }) => {
  return (
    <select 
      className={className} 
      style={{ ...style, cursor: 'pointer', appearance: 'auto' }} 
      value={value || ''} 
      onChange={(e) => {
        if (e.target.value === '__ADD_NEW__') {
          const newVal = window.prompt(`Enter new ${placeholder || 'value'}:`);
          if (newVal) {
            onChange({ target: { value: newVal } });
            if (onBlur) onBlur({ target: { value: newVal } });
          }
        } else {
          onChange(e);
        }
      }}
      onBlur={onBlur}
    >
      <option value="">{placeholder || ''}</option>
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      <option value="__ADD_NEW__" style={{fontStyle: 'italic', color: '#2563eb'}}>+ Add New...</option>
    </select>
  );
};

const PHAWorksheet = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({ deviationId: '', causeId: '' });
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Group scenarios visually by Deviation and Cause
  const processedScenarios = useMemo(() => {
    if (!scenarios || scenarios.length === 0) return [];
    
    // Sort scenarios by deviation ID then cause ID so they ALWAYS group correctly,
    // Add stable tie-breaker (_id) to prevent rows from swapping order during typing (which causes focus loss)
    const sortedScenarios = [...scenarios].sort((a, b) => {
      const devA = a.deviationId?._id || '';
      const devB = b.deviationId?._id || '';
      if (devA !== devB) return devA.localeCompare(devB);
      
      const causeA = a.causeId?._id || '';
      const causeB = b.causeId?._id || '';
      if (causeA !== causeB) return causeA.localeCompare(causeB);
      
      const consA = a.consequenceGroupId || '';
      const consB = b.consequenceGroupId || '';
      if (consA !== consB) return consA.localeCompare(consB);
      
      const idA = a._id || '';
      const idB = b._id || '';
      return idA.localeCompare(idB);
    });
    
    const result = [];
    let devNum = 0;
    let causeNum = 0;
    let consNum = 0;
    
    const getConsKey = (s) => s.consequenceGroupId || s._id;

    for (let i = 0; i < sortedScenarios.length; i++) {
      const sc = sortedScenarios[i];
      const prevSc = i > 0 ? sortedScenarios[i - 1] : null;
      
      const isNewDev = !prevSc || sc.deviationId?._id !== prevSc.deviationId?._id;
      const isNewCause = isNewDev || sc.causeId?._id !== prevSc.causeId?._id;
      const isNewCons = isNewCause || getConsKey(sc) !== getConsKey(prevSc);
      
      if (isNewDev) {
        devNum++;
        causeNum = 0;
      }
      if (isNewCause) {
        causeNum++;
        consNum = 0;
      }
      if (isNewCons) {
        consNum++;
      }
      
      let safeNum = 0;
      for(let j=0; j<=i; j++){
        if(sortedScenarios[j].deviationId?._id === sc.deviationId?._id &&
           sortedScenarios[j].causeId?._id === sc.causeId?._id &&
           getConsKey(sortedScenarios[j]) === getConsKey(sc)) {
             safeNum++;
        }
      }
      
      let devSpanCount = 0;
      let causeSpanCount = 0;
      let consSpanCount = 0;
      
      if (isNewDev) {
        for (let j = i; j < sortedScenarios.length; j++) {
          if (sortedScenarios[j].deviationId?._id === sc.deviationId?._id) devSpanCount++;
          else break;
        }
      }
      
      if (isNewCause) {
        for (let j = i; j < sortedScenarios.length; j++) {
          if (sortedScenarios[j].deviationId?._id === sc.deviationId?._id && sortedScenarios[j].causeId?._id === sc.causeId?._id) causeSpanCount++;
          else break;
        }
      }

      if (isNewCons) {
        for (let j = i; j < sortedScenarios.length; j++) {
          if (sortedScenarios[j].deviationId?._id === sc.deviationId?._id && 
              sortedScenarios[j].causeId?._id === sc.causeId?._id &&
              getConsKey(sortedScenarios[j]) === getConsKey(sc)) consSpanCount++;
          else break;
        }
      }
      
      result.push({
        ...sc,
        isNewDev,
        devSpanCount,
        isNewCause,
        causeSpanCount,
        isNewCons,
        consSpanCount,
        badgeDev: `${devNum}`,
        badgeCause: `${devNum}.${causeNum}`,
        badgeCons: `${devNum}.${causeNum}.${consNum}`,
        badgeSafe: `${devNum}.${causeNum}.${consNum}.${safeNum}`
      });
    }
    
    return result;
  }, [scenarios]);

  const uniqueDropdownOptions = useMemo(() => {
    const guidewords = new Set();
    const parameters = new Set();
    const materials = new Set();
    const equipments = new Set();
    const instruments = new Set();

    scenarios.forEach(sc => {
      if (sc.deviationId) {
        if (sc.deviationId.guidewords) guidewords.add(sc.deviationId.guidewords);
        if (sc.deviationId.parameter) parameters.add(sc.deviationId.parameter);
        if (sc.deviationId.processFlowMaterial) materials.add(sc.deviationId.processFlowMaterial);
        if (sc.deviationId.locationFrom) equipments.add(sc.deviationId.locationFrom);
        if (sc.deviationId.locationTo) instruments.add(sc.deviationId.locationTo);
      }
      if (sc.causeId) {
        if (sc.causeId.equipment) equipments.add(sc.causeId.equipment);
        if (sc.causeId.instrument) instruments.add(sc.causeId.instrument);
      }
    });

    return {
      guidewords: Array.from(guidewords).sort(),
      parameters: Array.from(parameters).sort(),
      materials: Array.from(materials).sort(),
      equipments: Array.from(equipments).sort(),
      instruments: Array.from(instruments).sort()
    };
  }, [scenarios]);

  useEffect(() => {
    fetchNodes();
  }, [study._id]);

  useEffect(() => {
    if (selectedNodeId) {
      fetchScenarios(selectedNodeId);
    } else {
      setScenarios([]);
      setLoading(false);
    }
  }, [selectedNodeId]);

  const fetchNodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nodes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNodes(data);
        if (data.length > 0) {
          setSelectedNodeId(data[0]._id);
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      setLoading(false);
    }
  };

  const fetchScenarios = async (nodeId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/scenarios/${study._id}?nodeId=${nodeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
      }
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (id, field, value) => {
    setScenarios(prev => {
      const targetSc = prev.find(s => s._id === id);
      const isConsGroupField = ['consequencesImmediate', 'consequencesUltimate', 'inherentRiskS', 'inherentRiskL'].includes(field);
      const targetGroupId = (isConsGroupField && targetSc?.consequenceGroupId) ? targetSc.consequenceGroupId : null;

      return prev.map(sc => {
        if (sc._id === id || (targetGroupId && sc.consequenceGroupId === targetGroupId)) {
          const updatedSc = { ...sc, [field]: value };
          
          if (field === 'inherentRiskS' || field === 'inherentRiskL') {
            const s = parseInt(updatedSc.inherentRiskS) || 0;
            const l = parseInt(updatedSc.inherentRiskL) || 0;
            updatedSc.inherentRiskRR = s && l ? s * l : '';
          }
          if (field === 'mitigatedRiskS' || field === 'mitigatedRiskL') {
            const s = parseInt(updatedSc.mitigatedRiskS) || 0;
            const l = parseInt(updatedSc.mitigatedRiskL) || 0;
            updatedSc.mitigatedRiskRR = s && l ? s * l : '';
          }
          if (field === 'residualRiskS' || field === 'residualRiskL') {
            const s = parseInt(updatedSc.residualRiskS) || 0;
            const l = parseInt(updatedSc.residualRiskL) || 0;
            updatedSc.residualRiskRR = s && l ? s * l : '';
          }
          
          return updatedSc;
        }
        return sc;
      });
    });
  };

  const handleBlur = async (id, field, value) => {
    try {
      const token = localStorage.getItem('token');
      
      let payload = { [field]: value };
      const targetSc = scenarios.find(s => s._id === id);
      
      if (field === 'inherentRiskS' || field === 'inherentRiskL') {
        const s = field === 'inherentRiskS' ? parseInt(value) : parseInt(targetSc.inherentRiskS);
        const l = field === 'inherentRiskL' ? parseInt(value) : parseInt(targetSc.inherentRiskL);
        payload.inherentRiskRR = s && l ? s * l : '';
      }
      if (field === 'mitigatedRiskS' || field === 'mitigatedRiskL') {
        const s = field === 'mitigatedRiskS' ? parseInt(value) : parseInt(targetSc.mitigatedRiskS);
        const l = field === 'mitigatedRiskL' ? parseInt(value) : parseInt(targetSc.mitigatedRiskL);
        payload.mitigatedRiskRR = s && l ? s * l : '';
      }
      if (field === 'residualRiskS' || field === 'residualRiskL') {
        const s = field === 'residualRiskS' ? parseInt(value) : parseInt(targetSc.residualRiskS);
        const l = field === 'residualRiskL' ? parseInt(value) : parseInt(targetSc.residualRiskL);
        payload.residualRiskRR = s && l ? s * l : '';
      }

      const isConsGroupField = ['consequencesImmediate', 'consequencesUltimate', 'inherentRiskS', 'inherentRiskL'].includes(field);
      const targetGroupId = (isConsGroupField && targetSc?.consequenceGroupId) ? targetSc.consequenceGroupId : null;

      const scenariosToUpdate = targetGroupId ? scenarios.filter(s => s.consequenceGroupId === targetGroupId) : [targetSc];

      await Promise.all(scenariosToUpdate.map(sc => 
        fetch(`http://localhost:5000/api/scenarios/${sc._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        })
      ));
    } catch (error) {
      console.error('Failed to save scenario:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/scenarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setScenarios(prev => prev.filter(sc => sc._id !== id));
        setSelectedRowIds(prev => prev.filter(rowId => rowId !== id));
      }
    } catch (error) {
      console.error('Failed to delete scenario:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRowIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRowIds.length} selected row(s)?`)) return;
    
    for (const id of selectedRowIds) {
      await handleDelete(id);
    }
    setSelectedRowIds([]);
  };

  const handleSelectRow = (id, isSelected) => {
    setSelectedRowIds(prev => {
      if (isSelected) {
        return [...prev, id];
      } else {
        return prev.filter(rowId => rowId !== id);
      }
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedRowIds(scenarios.map(sc => sc._id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleAddScenarioSuccess = (newScenario) => {
    setScenarios(prev => [...prev, newScenario]);
    setIsModalOpen(false);
  };

  const handleQuickAddConsequence = async (deviationId, causeId) => {
    if (!deviationId || !causeId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/scenarios/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          nodeId: selectedNodeId, 
          deviationId, 
          causeId,
          consequenceGroupId: 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
        })
      });
      if (response.ok) {
        const newScenario = await response.json();
        setScenarios(prev => [...prev, newScenario]);
      }
    } catch (error) {
      console.error('Error adding quick consequence:', error);
    }
  };

  const handleQuickAddCause = async (deviationId) => {
    if (!deviationId) return;
    try {
      const token = localStorage.getItem('token');
      // 1. Create a blank cause
      const causeRes = await fetch(`http://localhost:5000/api/causes/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ description: '' })
      });
      const newCause = await causeRes.json();
      
      // 2. Create scenario with existing deviation and new cause
      const response = await fetch(`http://localhost:5000/api/scenarios/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          nodeId: selectedNodeId, 
          deviationId, 
          causeId: newCause._id,
          consequenceGroupId: 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
        })
      });
      if (response.ok) {
        const newScenario = await response.json();
        setScenarios(prev => [...prev, newScenario]);
      }
    } catch (error) {
      console.error('Error adding quick cause:', error);
    }
  };

  const handleQuickAddDeviation = async () => {
    if (!selectedNodeId) return;
    try {
      const token = localStorage.getItem('token');
      // 1. Create a blank deviation
      const devRes = await fetch(`http://localhost:5000/api/deviations/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deviationAuto: '', guidewords: '', parameter: '' })
      });
      const newDev = await devRes.json();
      
      // 2. Create a blank cause
      const causeRes = await fetch(`http://localhost:5000/api/causes/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ description: '' })
      });
      const newCause = await causeRes.json();
      
      // 3. Create scenario
      const response = await fetch(`http://localhost:5000/api/scenarios/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          nodeId: selectedNodeId, 
          deviationId: newDev._id, 
          causeId: newCause._id,
          consequenceGroupId: 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
        })
      });
      if (response.ok) {
        const newScenario = await response.json();
        setScenarios(prev => [...prev, newScenario]);
      }
    } catch (error) {
      console.error('Error adding quick deviation:', error);
    }
  };

  const handleQuickAddSafeguard = async (sc) => {
    if (!sc.deviationId || !sc.causeId) return;
    try {
      const token = localStorage.getItem('token');
      
      let groupId = sc.consequenceGroupId;
      
      // If the current scenario doesn't have a group ID (created before the feature), generate one and update it first
      if (!groupId) {
        groupId = 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Update the current scenario in the backend
        await fetch(`http://localhost:5000/api/scenarios/${sc._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ consequenceGroupId: groupId })
        });
      }

      const response = await fetch(`http://localhost:5000/api/scenarios/${study._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          nodeId: selectedNodeId, 
          deviationId: sc.deviationId._id, 
          causeId: sc.causeId._id,
          consequenceGroupId: groupId,
          consequencesImmediate: sc.consequencesImmediate,
          consequencesUltimate: sc.consequencesUltimate,
          inherentRiskS: sc.inherentRiskS,
          inherentRiskL: sc.inherentRiskL
        })
      });
      if (response.ok) {
        const newScenario = await response.json();
        setScenarios(prev => {
          // Ensure the original scenario in state also gets the new groupId if it was just generated
          const updatedPrev = prev.map(s => s._id === sc._id ? { ...s, consequenceGroupId: groupId } : s);
          return [...updatedPrev, newScenario];
        });
      }
    } catch (error) {
      console.error('Error adding quick safeguard:', error);
    }
  };

  const handleDeviationFieldChange = (deviationId, field, value) => {
    if (!deviationId) return;
    setScenarios(prev => prev.map(sc => {
      if (sc.deviationId?._id === deviationId) {
        return { ...sc, deviationId: { ...sc.deviationId, [field]: value } };
      }
      return sc;
    }));
  };

  const handleDeviationFieldBlur = async (deviationId, field, value) => {
    if (!deviationId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/deviations/${deviationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error(`Failed to save deviation ${field}:`, error);
    }
  };

  const handleDeviationTextChange = (deviationId, value) => {
    handleDeviationFieldChange(deviationId, 'deviationAuto', value);
  };

  const handleDeviationTextBlur = async (deviationId, value) => {
    handleDeviationFieldBlur(deviationId, 'deviationAuto', value);
  };

  const handleCauseFieldChange = (causeId, field, value) => {
    if (!causeId) return;
    setScenarios(prev => prev.map(sc => {
      if (sc.causeId?._id === causeId) {
        return { ...sc, causeId: { ...sc.causeId, [field]: value } };
      }
      return sc;
    }));
  };

  const handleCauseFieldBlur = async (causeId, field, value) => {
    if (!causeId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/causes/${causeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error(`Failed to save cause ${field}:`, error);
    }
  };

  const handleCauseTextChange = (causeId, value) => {
    handleCauseFieldChange(causeId, 'description', value);
  };


  const handleCauseTextBlur = (causeId, value) => {
    handleCauseFieldBlur(causeId, 'description', value);
  };

  const selectedNode = nodes.find(n => n._id === selectedNodeId);
  const currentDate = new Date().toLocaleDateString('en-GB');

  if (!study) return null;

  return (
    <StudyLayout activeTab="pha-worksheets" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="pha-container-flush">
        
        {/* Metadata Header */}
        <div className="pha-metadata-flush">
          <div className="pha-metadata-header">
            <h2>HAZOP WORK SHEET</h2>
            <div className="pha-metadata-header-right">
              <div>DOC NO: <span style={{color: '#004d80', fontWeight: 'bold'}}>HAZOP-{study.projectNumber}</span></div>
              <div>DATE: <span style={{color: '#004d80', fontWeight: 'bold'}}>{currentDate}</span></div>
              <div>REV: <span style={{color: '#004d80', fontWeight: 'bold'}}>0</span></div>
            </div>
          </div>
          
          <div className="pha-metadata-row">
            <div className="pha-metadata-cell" style={{flex: 2}}>
              <span className="pha-metadata-label">SITE / LOCATION</span>
              <span className="pha-metadata-value">{study.facilityName || 'N/A'}</span>
            </div>
            <div className="pha-metadata-cell">
              <span className="pha-metadata-label">PLANT/UNIT</span>
              <span className="pha-metadata-value">PAGE 1 OF 1</span>
            </div>
          </div>
          
          <div className="pha-metadata-row">
            <div className="pha-metadata-cell">
              <span className="pha-metadata-label">NODE</span>
              <span className="pha-metadata-value">
                {selectedNode ? selectedNode.description : 'No node selected'}
              </span>
            </div>
          </div>
          
          <div className="pha-metadata-row">
            <div className="pha-metadata-cell">
              <span className="pha-metadata-label">INTENTION</span>
              <span className="pha-metadata-value">
                {selectedNode ? selectedNode.intention : 'Design Intention...'}
              </span>
            </div>
          </div>
          
          {selectedNode && selectedNode.equipments && selectedNode.equipments.length > 0 && (
            <div className="pha-metadata-row pha-metadata-equipments">
              <div className="pha-metadata-cell" style={{flex: 1, padding: 0}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px'}}>
                  <thead>
                    <tr style={{backgroundColor: '#f5f7fa', borderBottom: '1px solid #e0e0e0'}}>
                      <th style={{padding: '5px', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>TAG NO.</th>
                      <th style={{padding: '5px', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>EQUIPMENT NAME</th>
                      <th style={{padding: '5px', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>OPERATION CONDITION</th>
                      <th style={{padding: '5px', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>CAPACITY</th>
                      <th style={{padding: '5px', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>MOC</th>
                      <th style={{padding: '5px', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>DESIGN TEMP</th>
                      <th style={{padding: '5px', textAlign: 'left'}}>DESIGN PRESSURE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNode.equipments.map((eq, i) => (
                      <tr key={i} style={{borderBottom: '1px solid #e0e0e0'}}>
                        <td style={{padding: '5px', borderRight: '1px solid #e0e0e0'}}>{eq.tagNo}</td>
                        <td style={{padding: '5px', borderRight: '1px solid #e0e0e0'}}>{eq.equipmentName}</td>
                        <td style={{padding: '5px', borderRight: '1px solid #e0e0e0'}}>{eq.operationCondition}</td>
                        <td style={{padding: '5px', borderRight: '1px solid #e0e0e0'}}>{eq.capacity}</td>
                        <td style={{padding: '5px', borderRight: '1px solid #e0e0e0'}}>{eq.moc}</td>
                        <td style={{padding: '5px', borderRight: '1px solid #e0e0e0'}}>{eq.designTemp}</td>
                        <td style={{padding: '5px'}}>{eq.designPressure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="pha-toolbar-flush">
          <button className="toolbar-btn add-btn" onClick={handleQuickAddDeviation} disabled={!selectedNodeId}>
            <span style={{fontSize:'14px'}}>⊕</span> Add Deviation
          </button>
          
          <button 
            className="toolbar-btn" 
            onClick={handleDeleteSelected} 
            disabled={selectedRowIds.length === 0}
            style={{ color: selectedRowIds.length > 0 ? '#ef4444' : 'inherit', borderColor: selectedRowIds.length > 0 ? '#ef4444' : 'inherit' }}
          >
            🗑️ Delete Selected ({selectedRowIds.length})
          </button>
          
          <button className="toolbar-btn icon-only" onClick={() => window.print()} title="Print">🖨️</button>
          <button className="toolbar-btn icon-only" title="Export">📥</button>
          
          <div className="pha-node-selector">
            NODE: 
            <select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)}>
              {nodes.length === 0 && <option value="">No nodes</option>}
              {nodes.map((n, i) => (
                <option key={n._id} value={n._id}>{i + 1}. {n.description}</option>
              ))}
            </select>
          </div>
          
          <div className="pha-row-count">
            {scenarios.length} rows
          </div>
          
          <div className="pha-shortcuts">
            <span>e Enter = add nested row</span> | 
            <span>Shift+e = new first lvl cell</span> | 
            <span>Labels: Deviation, Cause, Consequence, Safeguard</span>
          </div>
        </div>

        {/* Data Grid */}
        <div className="pha-table-wrapper-flush">
          <table className="pha-table">
            <thead>
              <tr>
                <th className="th-primary" rowSpan={2} style={{width: '40px', textAlign: 'center'}}>
                  <input 
                    type="checkbox" 
                    checked={scenarios.length > 0 && selectedRowIds.length === scenarios.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th className="th-primary w-sr" rowSpan={2}>SR.</th>
                
                {/* Decomposition of Deviation */}
                <th className="th-primary" colSpan={5} style={{borderBottom: 'none'}}></th>
                
                <th className="th-primary w-deviation" rowSpan={2}>DEVIATION</th>
                <th className="th-primary w-cause" rowSpan={2}>CAUSE</th>
                
                <th className="th-primary" colSpan={2} style={{borderBottom: 'none'}}>CONSEQUENCES</th>
                
                <th className="th-primary th-risk-inherent" colSpan={3} style={{borderBottom: 'none'}}>INHERENT RISK</th>
                
                <th className="th-primary w-protection" rowSpan={2}>PRESENT / PLANNED PROTECTION<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Safeguards / IPLs)</span></th>
                
                <th className="th-primary th-risk-mitigated" colSpan={3} style={{borderBottom: 'none'}}>MITIGATED RISK</th>
                
                <th className="th-primary w-additional" rowSpan={2}>ADDITIONAL PROTECTION<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Recommendations)</span></th>
                
                <th className="th-primary th-risk-residual" colSpan={3} style={{borderBottom: 'none'}}>RESIDUAL RISK</th>
                <th className="th-primary w-remarks" rowSpan={2}>REMARKS</th>
                <th className="th-primary w-status" rowSpan={2}>STATUS</th>
              </tr>
              <tr>
                {/* Sub headers */}
                <th className="th-sub w-guideword">GUIDE WORD<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Auto)</span></th>
                <th className="th-sub w-parameter">PARAMETER<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Param)</span></th>
                <th className="th-sub w-material">MATERIAL<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Material)</span></th>
                <th className="th-sub w-from">EQUIPMENT<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Equipment)</span></th>
                <th className="th-sub w-to">INSTRUMENT<br/><span style={{fontSize:'8px', fontWeight:'normal'}}>(Instrument)</span></th>
                
                <th className="th-sub w-cons-imm">Immediate</th>
                <th className="th-sub w-cons-ult">Ultimate</th>
                
                <th className="th-sub th-risk-inherent th-sub-risk w-risk-s">S</th>
                <th className="th-sub th-risk-inherent th-sub-risk w-risk-l">L</th>
                <th className="th-sub th-risk-inherent th-sub-risk w-risk-rr">S×L=IR</th>
                
                <th className="th-sub th-risk-mitigated th-sub-risk w-risk-s">S</th>
                <th className="th-sub th-risk-mitigated th-sub-risk w-risk-l">L</th>
                <th className="th-sub th-risk-mitigated th-sub-risk w-risk-rr">S×L=MR</th>
                
                <th className="th-sub th-risk-residual th-sub-risk w-risk-s">S</th>
                <th className="th-sub th-risk-residual th-sub-risk w-risk-l">L</th>
                <th className="th-sub th-risk-residual th-sub-risk w-risk-rr">S×L=RR</th>
              </tr>
            </thead>
            <tbody>
              {!loading && scenarios.length === 0 && (
                <tr>
                  <td colSpan={24}>
                    <div className="pha-empty-state">
                      NO SCENARIOS YET — CLICK "+ ADD DEVIATION" TO BEGIN
                      <button className="btn-add-scenario-large" onClick={handleQuickAddDeviation} disabled={!selectedNodeId}>
                        <span style={{fontSize:'16px'}}>⊕</span> ADD DEVIATION / NEW ANALYSIS SCENARIO FOR CURRENT NODE
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              
              {!loading && processedScenarios.map((sc, index) => (
                <tr 
                  key={sc._id}
                  className={selectedRowIds.includes(sc._id) ? 'selected-row' : ''}
                >
                  <td style={{textAlign: 'center', backgroundColor: 'var(--bg-paper)'}}>
                    <input 
                      type="checkbox" 
                      checked={selectedRowIds.includes(sc._id)}
                      onChange={(e) => handleSelectRow(sc._id, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  {sc.isNewDev && (
                    <>
                      <td className="w-sr bg-deviation" rowSpan={sc.devSpanCount} style={{textAlign: 'center', fontWeight: 'bold', color: '#1d4ed8'}}>{sc.badgeDev}</td>
                      
                      <td className="w-guideword bg-deviation" rowSpan={sc.devSpanCount}>
                        <EditableSelect 
                          className="cell-guideword cell-select" 
                          style={{width:'100%', border:'none', background:'transparent', padding:'4px'}}
                          options={uniqueDropdownOptions.guidewords} 
                          value={sc.deviationId?.guidewords} 
                          onChange={(e) => handleDeviationFieldChange(sc.deviationId?._id, 'guidewords', e.target.value)} 
                          onBlur={(e) => handleDeviationFieldBlur(sc.deviationId?._id, 'guidewords', e.target.value)} 
                          placeholder="Guideword"
                        />
                      </td>
                      <td className="w-parameter bg-deviation" rowSpan={sc.devSpanCount}>
                        <EditableSelect 
                          className="cell-parameter cell-select" 
                          style={{width:'100%', border:'none', background:'transparent', padding:'4px'}}
                          options={uniqueDropdownOptions.parameters} 
                          value={sc.deviationId?.parameter} 
                          onChange={(e) => handleDeviationFieldChange(sc.deviationId?._id, 'parameter', e.target.value)} 
                          onBlur={(e) => handleDeviationFieldBlur(sc.deviationId?._id, 'parameter', e.target.value)} 
                          placeholder="Parameter"
                        />
                      </td>
                      <td className="w-material bg-deviation" rowSpan={sc.devSpanCount}>
                        <EditableSelect 
                          className="cell-material cell-select" 
                          style={{width:'100%', border:'none', background:'transparent', padding:'4px'}}
                          options={uniqueDropdownOptions.materials} 
                          value={sc.deviationId?.processFlowMaterial} 
                          onChange={(e) => handleDeviationFieldChange(sc.deviationId?._id, 'processFlowMaterial', e.target.value)} 
                          onBlur={(e) => handleDeviationFieldBlur(sc.deviationId?._id, 'processFlowMaterial', e.target.value)} 
                          placeholder="Material"
                        />
                      </td>
                      <td className="w-from bg-deviation" rowSpan={sc.devSpanCount}>
                        <EditableSelect 
                          className="cell-from cell-select" 
                          style={{width:'100%', border:'none', background:'transparent', padding:'4px'}}
                          options={uniqueDropdownOptions.equipments} 
                          value={sc.deviationId?.locationFrom} 
                          onChange={(e) => handleDeviationFieldChange(sc.deviationId?._id, 'locationFrom', e.target.value)} 
                          onBlur={(e) => handleDeviationFieldBlur(sc.deviationId?._id, 'locationFrom', e.target.value)} 
                          placeholder="From (Eq.)"
                        />
                      </td>
                      <td className="w-to bg-deviation" rowSpan={sc.devSpanCount}>
                        <EditableSelect 
                          className="cell-to cell-select" 
                          style={{width:'100%', border:'none', background:'transparent', padding:'4px'}}
                          options={uniqueDropdownOptions.instruments} 
                          value={sc.deviationId?.locationTo} 
                          onChange={(e) => handleDeviationFieldChange(sc.deviationId?._id, 'locationTo', e.target.value)} 
                          onBlur={(e) => handleDeviationFieldBlur(sc.deviationId?._id, 'locationTo', e.target.value)} 
                          placeholder="To (Inst.)"
                        />
                      </td>
                      
                      <td className="w-deviation bg-deviation" rowSpan={sc.devSpanCount}>
                        <span className="badge-dev">{sc.badgeDev}</span>
                        <textarea 
                          value={sc.deviationId?.deviationAuto || ''} 
                          onChange={(e) => handleDeviationTextChange(sc.deviationId?._id, e.target.value)}
                          onBlur={(e) => handleDeviationTextBlur(sc.deviationId?._id, e.target.value)}
                          style={{fontStyle:'italic', display:'inline-block', width:'calc(100% - 35px)', verticalAlign:'top'}}
                        />
                        <span className="action-link" onClick={() => handleQuickAddCause(sc.deviationId?._id)}>+ ADD CAUSE</span>
                      </td>
                    </>
                  )}
                  
                  {sc.isNewCause && (
                    <td className="w-cause bg-cause" rowSpan={sc.causeSpanCount}>
                      <span className="badge-cause">{sc.badgeCause}</span>
                      <textarea 
                        value={sc.causeId?.description || ''} 
                        onChange={(e) => handleCauseTextChange(sc.causeId?._id, e.target.value)}
                        onBlur={(e) => handleCauseTextBlur(sc.causeId?._id, e.target.value)}
                        style={{display:'inline-block', width:'calc(100% - 40px)', verticalAlign:'top', marginBottom: '4px'}}
                        placeholder="Description..."
                      />
                      <div style={{display: 'flex', gap: '4px', width: '100%', paddingLeft: '35px', boxSizing: 'border-box', marginBottom: '4px'}}>
                        <EditableSelect 
                          options={uniqueDropdownOptions.equipments} 
                          placeholder="Eq..." 
                          style={{flex: 1, padding: '2px 4px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '3px', width: '0'}}
                          value={sc.causeId?.equipment}
                          onChange={(e) => handleCauseFieldChange(sc.causeId?._id, 'equipment', e.target.value)}
                          onBlur={(e) => handleCauseFieldBlur(sc.causeId?._id, 'equipment', e.target.value)}
                        />
                        <EditableSelect 
                          options={uniqueDropdownOptions.instruments} 
                          placeholder="Inst..." 
                          style={{flex: 1, padding: '2px 4px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '3px', width: '0'}}
                          value={sc.causeId?.instrument}
                          onChange={(e) => handleCauseFieldChange(sc.causeId?._id, 'instrument', e.target.value)}
                          onBlur={(e) => handleCauseFieldBlur(sc.causeId?._id, 'instrument', e.target.value)}
                        />
                      </div>
                      <span className="action-link" style={{color: '#d97706', paddingLeft: '35px', display: 'block'}} onClick={() => handleQuickAddConsequence(sc.deviationId?._id, sc.causeId?._id)}>+ ADD CONSEQUENCE</span>
                    </td>
                  )}
                  
                  {/* Editable Cells */}
                  {sc.isNewCons && (
                    <>
                      <td className="w-cons-imm bg-consequence" rowSpan={sc.consSpanCount}>
                        <span className="badge-cons">{sc.badgeCons}</span>
                        <textarea 
                          style={{display:'inline-block', width:'calc(100% - 45px)', verticalAlign:'top'}}
                          value={sc.consequencesImmediate || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'consequencesImmediate', e.target.value)}
                          onBlur={(e) => handleBlur(sc._id, 'consequencesImmediate', e.target.value)}
                        />
                        <span className="action-link" style={{color: '#10b981'}} onClick={() => handleQuickAddSafeguard(sc)}>+ ADD SAFEGUARD</span>
                      </td>
                      <td className="w-cons-ult bg-consequence" rowSpan={sc.consSpanCount}>
                        <textarea 
                          value={sc.consequencesUltimate || ''} 
                          onChange={(e) => handleCellChange(sc._id, 'consequencesUltimate', e.target.value)}
                          onBlur={(e) => handleBlur(sc._id, 'consequencesUltimate', e.target.value)}
                        />
                      </td>
                      
                      <td className="w-risk-s" rowSpan={sc.consSpanCount}>
                        <select className="cell-select" style={{textAlign:'center', width:'100%', border:'none', background:'transparent'}} value={sc.inherentRiskS || ''} onChange={(e) => handleCellChange(sc._id, 'inherentRiskS', e.target.value)} onBlur={(e) => handleBlur(sc._id, 'inherentRiskS', e.target.value)}>
                          <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                        </select>
                      </td>
                      <td className="w-risk-l" rowSpan={sc.consSpanCount}>
                        <select className="cell-select" style={{textAlign:'center', width:'100%', border:'none', background:'transparent'}} value={sc.inherentRiskL || ''} onChange={(e) => handleCellChange(sc._id, 'inherentRiskL', e.target.value)} onBlur={(e) => handleBlur(sc._id, 'inherentRiskL', e.target.value)}>
                          <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                        </select>
                      </td>
                      <td className="w-risk-rr" rowSpan={sc.consSpanCount}><input style={{textAlign:'center', fontWeight:'bold'}} value={sc.inherentRiskRR || ''} readOnly title="Auto-calculated (S * L)"/></td>
                    </>
                  )}
                  
                  <td className="w-protection bg-protection">
                    <span className="badge-safe">{sc.badgeSafe}</span>
                    <textarea 
                      style={{display:'inline-block', width:'calc(100% - 55px)', verticalAlign:'top'}}
                      value={sc.presentProtection || ''} 
                      onChange={(e) => handleCellChange(sc._id, 'presentProtection', e.target.value)}
                      onBlur={(e) => handleBlur(sc._id, 'presentProtection', e.target.value)}
                    />
                  </td>
                  
                  <td className="w-risk-s">
                    <select className="cell-select" style={{textAlign:'center', width:'100%', border:'none', background:'transparent'}} value={sc.mitigatedRiskS || ''} onChange={(e) => handleCellChange(sc._id, 'mitigatedRiskS', e.target.value)} onBlur={(e) => handleBlur(sc._id, 'mitigatedRiskS', e.target.value)}>
                      <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                    </select>
                  </td>
                  <td className="w-risk-l">
                    <select className="cell-select" style={{textAlign:'center', width:'100%', border:'none', background:'transparent'}} value={sc.mitigatedRiskL || ''} onChange={(e) => handleCellChange(sc._id, 'mitigatedRiskL', e.target.value)} onBlur={(e) => handleBlur(sc._id, 'mitigatedRiskL', e.target.value)}>
                      <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                    </select>
                  </td>
                  <td className="w-risk-rr"><input style={{textAlign:'center', fontWeight:'bold'}} value={sc.mitigatedRiskRR || ''} readOnly title="Auto-calculated (S * L)"/></td>
                  
                  <td className="w-additional">
                    <textarea 
                      value={sc.additionalProtection || ''} 
                      onChange={(e) => handleCellChange(sc._id, 'additionalProtection', e.target.value)}
                      onBlur={(e) => handleBlur(sc._id, 'additionalProtection', e.target.value)}
                    />
                  </td>

                  <td className="w-risk-s">
                    <select className="cell-select" style={{textAlign:'center', width:'100%', border:'none', background:'transparent'}} value={sc.residualRiskS || ''} onChange={(e) => handleCellChange(sc._id, 'residualRiskS', e.target.value)} onBlur={(e) => handleBlur(sc._id, 'residualRiskS', e.target.value)}>
                      <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                    </select>
                  </td>
                  <td className="w-risk-l">
                    <select className="cell-select" style={{textAlign:'center', width:'100%', border:'none', background:'transparent'}} value={sc.residualRiskL || ''} onChange={(e) => handleCellChange(sc._id, 'residualRiskL', e.target.value)} onBlur={(e) => handleBlur(sc._id, 'residualRiskL', e.target.value)}>
                      <option value=""></option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                    </select>
                  </td>
                  <td className="w-risk-rr"><input style={{textAlign:'center', fontWeight:'bold'}} value={sc.residualRiskRR || ''} readOnly title="Auto-calculated (S * L)"/></td>
                  <td className="w-remarks">
                    <textarea 
                      value={sc.remarks || ''} 
                      onChange={(e) => handleCellChange(sc._id, 'remarks', e.target.value)}
                      onBlur={(e) => handleBlur(sc._id, 'remarks', e.target.value)}
                    />
                  </td>
                  <td className="w-status">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <select 
                        className="cell-select"
                        style={{width:'100%', border:'none', background:'transparent', padding:'8px'}}
                        value={sc.status || ''} 
                        onChange={(e) => handleCellChange(sc._id, 'status', e.target.value)}
                        onBlur={(e) => handleBlur(sc._id, 'status', e.target.value)}
                      >
                        <option value=""></option>
                        <option value="Proposed">Proposed</option>
                        <option value="Pending">Pending</option>
                        <option value="Implemented">Implemented</option>
                        <option value="Closed">Closed</option>
                        <option value="N/A">N/A</option>
                      </select>
                      <button 
                        onClick={() => {
                          if(window.confirm('Are you sure you want to delete this scenario row?')) {
                            handleDelete(sc._id);
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 8px', fontSize: '14px' }}
                        title="Delete Scenario"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {isModalOpen && selectedNodeId && (
        <AddScenarioModal 
          studyId={study._id} 
          nodeId={selectedNodeId}
          initialDeviationId={modalInitialData.deviationId}
          initialCauseId={modalInitialData.causeId}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleAddScenarioSuccess} 
        />
      )}
        
      {/* Datalists for dropdown autocompletes */}
      <datalist id="list-guidewords">
        {uniqueDropdownOptions.guidewords.map(g => <option key={g} value={g} />)}
      </datalist>
      <datalist id="list-parameters">
        {uniqueDropdownOptions.parameters.map(p => <option key={p} value={p} />)}
      </datalist>
      <datalist id="list-materials">
        {uniqueDropdownOptions.materials.map(m => <option key={m} value={m} />)}
      </datalist>
      <datalist id="list-equipments">
        {uniqueDropdownOptions.equipments.map(e => <option key={e} value={e} />)}
      </datalist>
      <datalist id="list-instruments">
        {uniqueDropdownOptions.instruments.map(i => <option key={i} value={i} />)}
      </datalist>
    </StudyLayout>
  );
};

export default PHAWorksheet;
