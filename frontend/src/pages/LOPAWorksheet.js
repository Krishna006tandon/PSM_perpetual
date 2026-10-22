import React, { useState, useEffect, useMemo } from 'react';
import StudyLayout from '../components/StudyLayout';
import ManageColumnsModal from '../components/ManageColumnsModal';
import AutoResizeTextarea from '../components/AutoResizeTextarea';
import TolerabilityMatrixModal, { getTolerabilityMatrix } from '../components/TolerabilityMatrixModal';
import {
  getLopaMapping,
  getScenarioText,
  getInitiatingEventText,
  getIplText,
  getSeverityValue,
  findFieldLabel
} from '../utils/lopaMapping';
import './DynamicRegistry.css';

const LOPAWorksheet = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [scenarios, setScenarios] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNodeFilter, setSelectedNodeFilter] = useState('ALL');
  const [lopaMapping, setLopaMapping] = useState(() => getLopaMapping());
  const [isTolerabilityModalOpen, setIsTolerabilityModalOpen] = useState(false);
  const [studyCriteria, setStudyCriteria] = useState(null);
  const [tolerabilityMatrix, setTolerabilityMatrix] = useState(() => {
    return getTolerabilityMatrix(study._id, null);
  });
  const [columnPreset, setColumnPreset] = useState(() => {
    const stored = localStorage.getItem('lopa_column_preset');
    return (stored === 'advanced' || stored === 'haz360') ? 'advanced' : 'standard';
  });

  const handlePresetChange = (preset) => {
    setColumnPreset(preset);
    localStorage.setItem('lopa_column_preset', preset);
  };

  const isAdvanced = columnPreset === 'advanced' || columnPreset === 'haz360';

  const getSuggestedSIL = (rrfVal) => {
    const r = parseFloat(rrfVal);
    if (!r || r <= 1) return '';
    if (r < 10) return '<1';
    if (r >= 10 && r < 100) return '1';
    if (r >= 100 && r < 1000) return '2';
    if (r >= 1000 && r < 10000) return '3';
    return '4';
  };

  const getRtfForSeverity = (sev) => {
    if (!sev && sev !== 0) return '';
    const num = parseInt(sev.toString().replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    const match = tolerabilityMatrix.find(m => m.level === num);
    return match ? match.rtf : '';
  };

  const handleBatchApplyRtf = async (updatedMatrix) => {
    setTolerabilityMatrix(updatedMatrix);
    const updatedScenarios = scenarios.map(sc => {
      const sev = getSeverityValue(sc, lopaMapping);
      const num = parseInt((sev || '').toString().replace(/\D/g, ''), 10);
      const match = updatedMatrix.find(m => m.level === num);
      if (match && match.rtf && !sc.lopaData?.tolerance) {
        return {
          ...sc,
          lopaData: {
            ...sc.lopaData,
            tolerance: match.rtf
          }
        };
      }
      return sc;
    });
    setScenarios(updatedScenarios);

    // Persist changes to server
    try {
      const token = localStorage.getItem('token');
      for (const sc of updatedScenarios) {
        if (sc.lopaData?.tolerance) {
          await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${sc._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ lopaData: sc.lopaData })
          });
        }
      }
    } catch (err) {
      console.error('Failed to batch save tolerance RTF:', err);
    }
  };

  useEffect(() => {
    const handleMappingChange = () => {
      setLopaMapping(getLopaMapping());
    };
    window.addEventListener('pha_lopa_mapping_changed', handleMappingChange);
    return () => {
      window.removeEventListener('pha_lopa_mapping_changed', handleMappingChange);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [study._id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const colRes = await fetch(`https://api.perpetualsolutions.co.in/api/columns/${study._id}/lopa`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

      const scRes = await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (scRes.ok) {
        let scData = await scRes.json();
        
        // Only include scenarios marked for LOPA in PHA Worksheet
        scData = scData.filter(sc => sc.isLopa === true || sc.isLopa === 'true');
        
        scData = scData.map(sc => {
          const defaultLopa = {
            freqOfInitiatingEvent: '',
            severity: '',
            cmPfd: 1,
            cmTimeAtRisk: 1,
            cmOccupancy: 1,
            tolerance: '',
            requiredSil: '',
            recommendationRequiredSil: '',
            iplCredit: 1, // Store IPL credit on the scenario itself
            recommendations: []
          };
          
          if (!sc.lopaData) {
            sc.lopaData = defaultLopa;
            const currentMapping = getLopaMapping();
            if (currentMapping.transferRecommendations !== false && sc.additionalProtection) {
              sc.lopaData.recommendations.push({ description: sc.additionalProtection, credit: 1 });
            }
          } else {
             if (!sc.lopaData.recommendations) sc.lopaData.recommendations = [];
             if (sc.lopaData.iplCredit === undefined) sc.lopaData.iplCredit = 1;
          }
          return sc;
        });
        setScenarios(scData);
      }

      const nodeRes = await fetch(`https://api.perpetualsolutions.co.in/api/nodes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (nodeRes.ok) setNodes(await nodeRes.json());

      const critRes = await fetch(`https://api.perpetualsolutions.co.in/api/risk-criteria/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (critRes.ok) {
        const critData = await critRes.json();
        setStudyCriteria(critData);
        setTolerabilityMatrix(getTolerabilityMatrix(study._id, critData));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLopaChange = (id, field, value) => {
    setScenarios(prev => prev.map(sc => {
      if (sc._id === id) {
        return {
          ...sc,
          lopaData: {
            ...sc.lopaData,
            [field]: value
          }
        };
      }
      return sc;
    }));
  };

  const handleArrayChange = (id, arrayName, index, field, value) => {
    setScenarios(prev => prev.map(sc => {
      if (sc._id === id) {
        const newArray = [...sc.lopaData[arrayName]];
        newArray[index] = { ...newArray[index], [field]: value };
        return {
          ...sc,
          lopaData: {
            ...sc.lopaData,
            [arrayName]: newArray
          }
        };
      }
      return sc;
    }));
  };

  const addArrayItem = (id, arrayName, isIpl = false) => {
    setScenarios(prev => prev.map(sc => {
      if (sc._id === id) {
        const newArray = [...sc.lopaData[arrayName]];
        newArray.push(isIpl ? { no: '', description: '', credit: 1 } : { description: '', credit: 1 });
        return { ...sc, lopaData: { ...sc.lopaData, [arrayName]: newArray } };
      }
      return sc;
    }));
  };

  const removeArrayItem = (id, arrayName, index) => {
    setScenarios(prev => prev.map(sc => {
      if (sc._id === id) {
        const newArray = [...sc.lopaData[arrayName]];
        newArray.splice(index, 1);
        return { ...sc, lopaData: { ...sc.lopaData, [arrayName]: newArray } };
      }
      return sc;
    }));
  };

  const handleBlur = async (id) => {
    const sc = scenarios.find(s => s._id === id);
    if (!sc) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lopaData: sc.lopaData })
      });
    } catch (e) {
      console.error('Failed to save LOPA data:', e);
    }
  };

  const nodeMap = useMemo(() => {
    let map = new Map();
    nodes.forEach((n, i) => map.set(n._id, i + 1));
    return map;
  }, [nodes]);

  // Group scenarios into Consequences, then individual safeguards are IPLs
  const formattedScenarios = useMemo(() => {
    let sortedList = [...scenarios];
    if (selectedNodeFilter !== 'ALL') {
      sortedList = sortedList.filter(s => (s.nodeId?._id || s.nodeId) === selectedNodeFilter);
    }

    const sorted = sortedList.sort((a, b) => {
      const n1 = a.nodeId?._id || '';
      const n2 = b.nodeId?._id || '';
      if (n1 !== n2) return n1.localeCompare(n2);
      
      const d1 = a.deviationId?._id || '';
      const d2 = b.deviationId?._id || '';
      if (d1 !== d2) return d1.localeCompare(d2);
      
      const c1 = a.causeId?._id || '';
      const c2 = b.causeId?._id || '';
      if (c1 !== c2) return c1.localeCompare(c2);
      
      const t1 = new Date(a.createdAt).getTime();
      const t2 = new Date(b.createdAt).getTime();
      return t1 - t2;
    });

// nodeMap is hoisted above

    let devCounter = 1;
    let causeCounter = 1;
    let consCounter = 1;

    let currentNode = null;
    let currentDev = null;
    let currentCause = null;
    let currentCons = null;
    let safeCounter = 1;

    const result = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const sc = sorted[i];
      const nId = sc.nodeId?._id || null;
      const devId = sc.deviationId?._id || null;
      const causeId = sc.causeId?._id || null;
      const consKey = sc.consequenceGroupId || sc.consequencesImmediate || '';

      if (nId !== currentNode) {
        currentNode = nId;
        devCounter = 1;
        currentDev = null;
      }

      if (devId !== currentDev) {
        currentDev = devId;
        causeCounter = 1;
        currentCause = null;
        if (i > 0 && nId === currentNode) devCounter++;
      }

      if (causeId !== currentCause) {
        currentCause = causeId;
        consCounter = 1;
        currentCons = null;
        if (i > 0 && devId === currentDev) causeCounter++;
      }

      if (consKey !== currentCons) {
        currentCons = consKey;
        safeCounter = 1;
        if (i > 0 && causeId === currentCause) consCounter++;
      } else {
        safeCounter++;
      }

      const nodeNum = nodeMap.get(nId) || 1;
      const devNum = `${nodeNum}.${devCounter}`;
      const causeNum = `${nodeNum}.${devCounter}.${causeCounter}`;
      const consNum = `${nodeNum}.${devCounter}.${causeCounter}.${consCounter}`;
      const safeNum = `${nodeNum}.${devCounter}.${causeCounter}.${consCounter}.${safeCounter}`;

      let isNewCons = false;
      let consSpanCount = 0;
      if (safeCounter === 1) {
        isNewCons = true;
        for (let j = i; j < sorted.length; j++) {
          const scJ = sorted[j];
          if (scJ.nodeId?._id === nId && scJ.deviationId?._id === devId && scJ.causeId?._id === causeId && ((scJ.consequenceGroupId || scJ.consequencesImmediate || '') === consKey)) {
            // we will need to calculate max of (1, recs.length) for each of these to get true consSpanCount
            const recsLen = scJ.lopaData?.recommendations?.length || 0;
            consSpanCount += Math.max(1, recsLen);
          } else {
            break;
          }
        }
      }

      result.push({
        ...sc,
        badgeDev: devNum,
        badgeCause: causeNum,
        badgeCons: consNum,
        badgeSafe: safeNum,
        isNewCons,
        consSpanCount
      });
    }
    
    return result;
  }, [scenarios, selectedNodeFilter, nodeMap]);

  const calculateRRF = (totalCredit, toleranceStr) => {
    const t = parseFloat(toleranceStr);
    if (!totalCredit || !t) return '';
    const rrf = totalCredit / t;
    return rrf >= 1 ? rrf.toFixed(2) : 1;
  };

  const exportToCSV = () => {
    const scCol = (lopaMapping.scenarioLabel || 'Scenario').toUpperCase();
    const ieCol = (lopaMapping.initiatingEventLabel || 'Initiating Event').toUpperCase();
    const iplCol = (lopaMapping.iplLabel || 'IPL').toUpperCase();
    let csv = isAdvanced
      ? `LOPA ID,NODE,CONSEQUENCE DESCRIPTION,INITIATING EVENT,IEF (PER YR),SEVERITY (S),CM PFD,CM TIME AT RISK,CM OCCUPANCY,IPL TAG,IPL DESCRIPTION,IPL PFD,MEF,RTF,RRF,TARGET SIL,PROPOSED SIF / RECOMMENDATION,REC PFD,FINAL MITIGATED FREQUENCY,RTF,RESIDUAL RRF,RESIDUAL SIL\n`
      : `SR.,NODE,${scCol},${ieCol},FREQ OF INITIATING EVENT,SEVERITY,CM PFD,CM TIME AT RISK,CM OCCUPANCY,IPL NO,${iplCol},IPL CREDITS,TOTAL IPL CREDIT,TOLERANCE,RRF,REQUIRED SIL,RECOMMENDATION,REC CREDIT,TOTAL REC CREDIT,REC TOLERANCE,REC RRF,REC REQUIRED SIL\n`;
    formattedScenarios.forEach((sc) => {
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      const nodeName = sc.nodeId?.description ? `${nodeMap.get(sc.nodeId?._id) || 1}. ${sc.nodeId.description}` : `Node ${nodeMap.get(sc.nodeId?._id) || 1}`;
      
      const freqi = parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0;
      const pfd = parseFloat(sc.lopaData?.cmPfd) || 1;
      const time = parseFloat(sc.lopaData?.cmTimeAtRisk) || 1;
      const occ = parseFloat(sc.lopaData?.cmOccupancy) || 1;
      
      let siblingProduct = 1;
      let siblingRecProduct = 1;
      for (let s of formattedScenarios) {
        if (s.badgeCons === sc.badgeCons) {
           siblingProduct *= (parseFloat(s.lopaData?.iplCredit) || 1);
           const srecs = s.lopaData?.recommendations || [];
           for (let r of srecs) {
             siblingRecProduct *= (parseFloat(r.credit) || 1);
           }
        }
      }
      const totalIplCredit = (freqi * pfd * time * occ * siblingProduct).toFixed(6);
      const totalRecCredit = (freqi * pfd * time * occ * siblingProduct * siblingRecProduct).toFixed(6);
      const rrf1 = calculateRRF(totalIplCredit, sc.lopaData?.tolerance);
      const rrf2 = calculateRRF(totalRecCredit, sc.lopaData?.tolerance);

      const recs = sc.lopaData?.recommendations || [];
      const recText = recs.map(r => r.description || r.text || '').join(' | ');
      const recCreditText = recs.map(r => r.credit || '').join(' | ');

      csv += [
        escape(sc.badgeCons),
        escape(nodeName),
        escape(getScenarioText(sc, lopaMapping)),
        escape(getInitiatingEventText(sc, lopaMapping)),
        escape(sc.lopaData?.freqOfInitiatingEvent),
        escape(getSeverityValue(sc, lopaMapping)),
        escape(sc.lopaData?.cmPfd),
        escape(sc.lopaData?.cmTimeAtRisk),
        escape(sc.lopaData?.cmOccupancy),
        escape(sc.badgeSafe || sc.lopaData?.iplNo),
        escape(getIplText(sc, lopaMapping)),
        escape(sc.lopaData?.iplCredit),
        escape(totalIplCredit),
        escape(sc.lopaData?.tolerance),
        escape(rrf1),
        escape(sc.lopaData?.requiredSil || (isAdvanced ? getSuggestedSIL(rrf1) : '')),
        escape(recText),
        escape(recCreditText),
        escape(totalRecCredit),
        escape(sc.lopaData?.tolerance),
        escape(rrf2),
        escape(sc.lopaData?.recommendationRequiredSil)
      ].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'LOPA_Worksheet.csv';
    link.click();
  };

  const exportToPDF = () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library is still loading. Please try again in a few seconds.");
      return;
    }
    
    const generatePDF = (logoImg) => {
      const doc = new window.jspdf.jsPDF('landscape', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', pageWidth / 2 - 40, 10, 80, 25);
      }
      
      doc.setFontSize(16);
      doc.text(`LOPA Worksheet: ${study?.studyName || 'Unknown Study'}`, 40, 40);
    
    const head = [
      [
        { content: isAdvanced ? 'LOPA ID' : 'SN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Node', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: isAdvanced ? 'Consequence Description' : (lopaMapping.scenarioLabel || 'Scenario'), rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: isAdvanced ? 'Initiating Event (IE)' : (lopaMapping.initiatingEventLabel || 'Initiating Event'), rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: isAdvanced ? 'IEF' : 'Freq', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: isAdvanced ? 'Sev (S)' : 'Sev', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: isAdvanced ? 'Cond. Modifiers (CM)' : 'Cond. Modifiers', colSpan: 3, styles: { halign: 'center' } },
        { content: isAdvanced ? 'IPLs (Existing Safeguards)' : (lopaMapping.iplLabel || 'Independent Protection Layers (IPL)'), colSpan: 4, styles: { halign: 'center' } },
        { content: isAdvanced ? 'MEF, RTF & SIL' : 'RRF & SIL', colSpan: 3, styles: { halign: 'center' } },
        { content: isAdvanced ? 'Proposed SIF & Residual Risk' : 'Recommendations & Mitigated Risk', colSpan: 6, styles: { halign: 'center' } }
      ],
      [
        isAdvanced ? 'Pe' : 'PFD', isAdvanced ? 'Pt' : 'Time', isAdvanced ? 'Po' : 'Occ',
        isAdvanced ? 'Tag' : 'No', 'IPL', isAdvanced ? 'PFD' : 'Credit', isAdvanced ? 'MEF' : 'Total',
        isAdvanced ? 'RTF' : 'Tol', 'RRF', isAdvanced ? 'Target SIL' : 'SIL',
        isAdvanced ? 'SIF / Rec' : 'Rec', isAdvanced ? 'PFD' : 'Credit', isAdvanced ? 'FMF' : 'Total', isAdvanced ? 'RTF' : 'Tol', isAdvanced ? 'Res. RRF' : 'RRF', isAdvanced ? 'Res. SIL' : 'SIL'
      ]
    ];

    const body = formattedScenarios.map((sc) => {
      const freqi = parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0;
      const pfd = parseFloat(sc.lopaData?.cmPfd) || 1;
      const time = parseFloat(sc.lopaData?.cmTimeAtRisk) || 1;
      const occ = parseFloat(sc.lopaData?.cmOccupancy) || 1;
      
      let siblingProduct = 1;
      let siblingRecProduct = 1;
      for (let s of formattedScenarios) {
        if (s.badgeCons === sc.badgeCons) {
           siblingProduct *= (parseFloat(s.lopaData?.iplCredit) || 1);
           const srecs = s.lopaData?.recommendations || [];
           for (let r of srecs) {
             siblingRecProduct *= (parseFloat(r.credit) || 1);
           }
        }
      }
      const totalIplCredit = (freqi * pfd * time * occ * siblingProduct).toFixed(6);
      const totalRecCredit = (freqi * pfd * time * occ * siblingProduct * siblingRecProduct).toFixed(6);
      const rrf1 = calculateRRF(totalIplCredit, sc.lopaData?.tolerance);
      const rrf2 = calculateRRF(totalRecCredit, sc.lopaData?.tolerance);

      const recs = sc.lopaData?.recommendations || [];
      const recText = recs.map(r => r.description || r.text || '').join(' \n ');
      const recCreditText = recs.map(r => r.credit || '').join(' \n ');

      const nodeName = sc.nodeId?.description ? `${nodeMap.get(sc.nodeId?._id) || 1}. ${sc.nodeId.description}` : `Node ${nodeMap.get(sc.nodeId?._id) || 1}`;
      return [
        sc.badgeCons || '', nodeName, getScenarioText(sc, lopaMapping), getInitiatingEventText(sc, lopaMapping),
        sc.lopaData?.freqOfInitiatingEvent || '', getSeverityValue(sc, lopaMapping), 
        sc.lopaData?.cmPfd || '', sc.lopaData?.cmTimeAtRisk || '', sc.lopaData?.cmOccupancy || '',
        sc.badgeSafe || sc.lopaData?.iplNo || '', getIplText(sc, lopaMapping), sc.lopaData?.iplCredit || '', totalIplCredit,
        sc.lopaData?.tolerance || '', rrf1, sc.lopaData?.recommendationRequiredSil || '',
        recText, recCreditText, totalRecCredit, sc.lopaData?.tolerance || '', rrf2, sc.lopaData?.recommendationRequiredSil || ''
      ];
    });
    
    doc.autoTable({
      startY: 60, head: head, body: body, theme: 'grid',
      styles: { fontSize: 4.5, cellPadding: 3, overflow: 'linebreak', textColor: [30, 30, 30], lineColor: [210, 214, 220], lineWidth: 0.5 },
      headStyles: { fillColor: [6, 95, 70], textColor: 255, fontSize: 5, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 15 }, // SN
        1: { cellWidth: 35 }, // Node
        2: { cellWidth: 35 }, // Dev
        3: { cellWidth: 45 }, // Scenario
        4: { cellWidth: 45 }, // Initiating Event
        5: { cellWidth: 20 }, // Freq
        6: { cellWidth: 15 }, // Sev
        7: { cellWidth: 15 }, 8: { cellWidth: 15 }, 9: { cellWidth: 15 }, // CMs
        10: { cellWidth: 15 }, 11: { cellWidth: 55 }, 12: { cellWidth: 20 }, 13: { cellWidth: 25 }, // IPL
        14: { cellWidth: 20 }, 15: { cellWidth: 20 }, 16: { cellWidth: 15 }, // RRF
        17: { cellWidth: 55 }, 18: { cellWidth: 20 }, 19: { cellWidth: 25 }, 20: { cellWidth: 20 }, 21: { cellWidth: 20 }, 22: { cellWidth: 15 } // Rec
      },
      margin: { left: 10, right: 10 }
    });
      doc.save(`LOPA_Worksheet_${study?.studyName || 'Study'}.pdf`);
    };

    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => generatePDF(img);
    img.onerror = () => generatePDF(null);
  };

  return (
    <StudyLayout activeTab="lopa" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="dynamic-container" style={{ padding: '0px' }}>
        <div className="dynamic-header" style={{ padding: '20px 30px' }}>
          <h2>LOPA WORKSHEET</h2>
          <span className="editable-indicator-badge">✏️ Highlighted fields are editable</span>
        </div>

        <div className="dynamic-toolbar" style={{ padding: '0 30px 10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canEdit && (
            <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
              <span className="icon">◫</span> MANAGE COLUMNS
            </button>
          )}
          <button className="btn-manage-columns" onClick={exportToCSV} style={{backgroundColor: '#3b82f6', color: 'white', border: 'none'}}>
            <span className="icon">📥</span> EXPORT CSV
          </button>
          <button className="btn-manage-columns" onClick={exportToPDF} style={{backgroundColor: '#ef4444', color: 'white', border: 'none'}}>
            <span className="icon">📥</span> EXPORT PDF
          </button>
          <button 
            className="btn-manage-columns" 
            onClick={() => onNavigate && onNavigate('settings')} 
            style={{backgroundColor: '#475569', color: 'white', border: 'none'}}
            title="Configure PHA → LOPA Field Mapping"
          >
            <span className="icon">⚙️</span> LOPA MAPPING
          </button>

          <button 
            className="btn-manage-columns" 
            onClick={() => setIsTolerabilityModalOpen(true)} 
            style={{backgroundColor: '#0891b2', color: 'white', border: 'none'}}
            title="View & Configure Risk Tolerability Criteria (Severity vs RTF Matrix)"
          >
            <span className="icon">🎯</span> TOLERABILITY MATRIX
          </button>

          {/* Format Selector: Standard (PSM) vs CCPS / IEC Format */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary, #f1f5f9)', padding: '3px 6px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary, #64748b)', padding: '0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Format:
            </span>
            <button
              type="button"
              onClick={() => handlePresetChange('standard')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: columnPreset === 'standard' ? '600' : '500',
                backgroundColor: columnPreset === 'standard' ? '#0284c7' : 'transparent',
                color: columnPreset === 'standard' ? '#ffffff' : 'var(--text-primary, #334155)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Standard (PSM)
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('advanced')}
              title="CCPS / IEC 61511 Industrial Standard Format (MEF, RTF, FMF, Target SIL)"
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: isAdvanced ? '600' : '500',
                backgroundColor: isAdvanced ? '#7c3aed' : 'transparent',
                color: isAdvanced ? '#ffffff' : 'var(--text-primary, #334155)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ CCPS / IEC Format
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>FILTER NODE:</span>
            <select
              value={selectedNodeFilter}
              onChange={(e) => setSelectedNodeFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: 'var(--bg-paper, #ffffff)',
                color: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Nodes ({scenarios.length} LOPA rows)</option>
              {nodes.map((n, i) => (
                <option key={n._id} value={n._id}>
                  {i + 1}. {n.description || `Node ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dynamic-table-wrapper" style={{ maxHeight: 'calc(100vh - 200px)', margin: '0' }}>
          <table className="dynamic-table lopa-table" style={{ borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th rowSpan="2" style={{width:'40px'}} title={isAdvanced ? "LOPA Scenario Identifier" : "Scenario Number"}>
                  {isAdvanced ? 'LOPA ID' : 'SN'}
                </th>
                <th rowSpan="2" style={{minWidth:'140px'}}>Node</th>
                <th rowSpan="2" style={{minWidth:'220px'}}>
                  {isAdvanced ? 'Consequence Description' : (lopaMapping.scenarioLabel || 'Scenario')}
                  <br/><span style={{fontSize:'8.5px', fontWeight:'normal'}}>({findFieldLabel(lopaMapping.scenarioSource)})</span>
                </th>
                <th rowSpan="2" style={{minWidth:'200px'}}>
                  {isAdvanced ? 'Initiating Event (IE)' : (lopaMapping.initiatingEventLabel || 'Initiating Event')}
                  <br/><span style={{fontSize:'8.5px', fontWeight:'normal'}}>({findFieldLabel(lopaMapping.initiatingEventSource)})</span>
                </th>
                <th rowSpan="2" style={{minWidth:'100px'}}>
                  {isAdvanced ? (
                    <>
                      IEF (per yr)<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Initiating Event Freq)</span>
                    </>
                  ) : 'Freq of Initiating Event'}
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  {isAdvanced ? 'Severity (S)' : 'Severity'}
                  <br/><span style={{fontSize:'8.5px', fontWeight:'normal'}}>({lopaMapping.severitySource === 'manual' ? 'Manual' : lopaMapping.severitySource.replace('RiskS', ' (S)')})</span>
                </th>
                <th colSpan="3" style={{textAlign:'center', background:'var(--surface-hover)'}}>
                  {isAdvanced ? 'Conditional Modifiers (CM)' : 'Condition Modifiers'}
                </th>
                <th rowSpan="2" style={{width:'60px'}}>
                  {isAdvanced ? 'IPL Tag' : 'IPL No'}
                </th>
                <th rowSpan="2" style={{minWidth:'250px'}}>
                  {isAdvanced ? 'IPL Description (Existing)' : (lopaMapping.iplLabel || 'Independent Protection Layer (IPL)')}
                  <br/><span style={{fontSize:'8.5px', fontWeight:'normal'}}>({findFieldLabel(lopaMapping.iplSource)})</span>
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  {isAdvanced ? (
                    <>
                      IPL PFD<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Risk Reduction)</span>
                    </>
                  ) : 'IPL Credits'}
                </th>
                <th rowSpan="2" style={{minWidth:'100px'}}>
                  {isAdvanced ? (
                    <>
                      MEF<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Mitigated Event Freq)</span>
                    </>
                  ) : 'Total IPL Credit'}
                </th>
                <th rowSpan="2" style={{minWidth:'100px'}}>
                  {isAdvanced ? (
                    <>
                      RTF<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Risk Tolerance Freq)</span>
                    </>
                  ) : 'Tolerance'}
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  RRF<br/>
                  <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(MEF / RTF)</span>
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  {isAdvanced ? (
                    <>
                      Target SIL<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Required SIF)</span>
                    </>
                  ) : 'Required SIL'}
                </th>
                <th rowSpan="2" style={{minWidth:'250px'}}>
                  {isAdvanced ? 'Proposed SIF / Recommendation' : 'Recommendation'}
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  {isAdvanced ? (
                    <>
                      Rec PFD<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Credit)</span>
                    </>
                  ) : 'Rec Credit'}
                </th>
                <th rowSpan="2" style={{minWidth:'100px'}}>
                  {isAdvanced ? (
                    <>
                      FMF<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Final Mitigated Freq)</span>
                    </>
                  ) : 'Total Credit'}
                </th>
                <th rowSpan="2" style={{minWidth:'100px'}}>
                  {isAdvanced ? (
                    <>
                      RTF<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Post-Mitigation)</span>
                    </>
                  ) : 'Tolerance'}
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  {isAdvanced ? (
                    <>
                      Residual RRF<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Residual Gap)</span>
                    </>
                  ) : 'RRF'}
                </th>
                <th rowSpan="2" style={{width:'80px'}}>
                  {isAdvanced ? (
                    <>
                      Residual SIL<br/>
                      <span style={{fontSize:'8.5px', fontWeight:'normal'}}>(Target SIL)</span>
                    </>
                  ) : 'Required SIL'}
                </th>
                {columns.filter(c => !c.isSystem).map(col => (
                  <th key={col.id} rowSpan="2" className="col-custom">{col.label}</th>
                ))}
              </tr>
              <tr>
                <th style={{width:'60px', fontSize:'11px'}}>{isAdvanced ? 'PFD (Pe)' : 'PFD'}</th>
                <th style={{width:'60px', fontSize:'11px'}}>{isAdvanced ? 'Time (Pt)' : 'Time at Risk'}</th>
                <th style={{width:'60px', fontSize:'11px'}}>{isAdvanced ? 'Occ (Po)' : 'Occupancy'}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && formattedScenarios.length === 0 && (
                <tr>
                  <td colSpan={24} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                        🛡️
                      </div>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px' }}>No Scenarios Marked for LOPA</h3>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '520px', fontSize: '13px', lineHeight: 1.5 }}>
                        To perform Layer of Protection Analysis (LOPA), open the <strong>PHA Worksheet</strong> and check the <strong>LOPA</strong> box on any consequence row. Based on your active mapping settings, the Consequence becomes <strong>{lopaMapping.scenarioLabel || 'Scenario'}</strong>, the Cause becomes <strong>{lopaMapping.initiatingEventLabel || 'Initiating Event'}</strong>, and the Safeguards become <strong>{lopaMapping.iplLabel || 'IPLs'}</strong>.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button 
                          type="button"
                          onClick={() => onNavigate('pha-worksheets')}
                          style={{
                            backgroundColor: '#0284c7',
                            color: 'white',
                            border: 'none',
                            padding: '8px 18px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          📋 Go to PHA Worksheet
                        </button>
                        <button 
                          type="button"
                          onClick={() => onNavigate && onNavigate('settings')}
                          style={{
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--divider, #cbd5e1)',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          ⚙️ Configure LOPA Mapping
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && formattedScenarios.map((sc, scIndex) => {
                const recs = sc.lopaData?.recommendations || [];
                const rowCount = Math.max(1, recs.length);

                // For Consequence level calculations, we need to gather all siblings
                let totalIplCredit = 1;
                let totalRecCredit = 1;

                if (sc.isNewCons) {
                  const freq = parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0;
                  const pfd = parseFloat(sc.lopaData?.cmPfd) || 1;
                  const time = parseFloat(sc.lopaData?.cmTimeAtRisk) || 1;
                  const occ = parseFloat(sc.lopaData?.cmOccupancy) || 1;
                  
                  // Product of all IPL credits in this consequence group
                  let siblingProduct = 1;
                  let siblingRecProduct = 1;
                  
                  for (let s of formattedScenarios) {
                    if (s.badgeCons === sc.badgeCons) {
                       siblingProduct *= (parseFloat(s.lopaData?.iplCredit) || 1);
                       // Also multiply recommendations
                       const srecs = s.lopaData?.recommendations || [];
                       for (let r of srecs) {
                         siblingRecProduct *= (parseFloat(r.credit) || 1);
                       }
                    }
                  }

                  totalIplCredit = (freq * pfd * time * occ * siblingProduct).toFixed(6);
                  totalRecCredit = (freq * pfd * time * occ * siblingProduct * siblingRecProduct).toFixed(6);
                }

                const rrf1 = calculateRRF(totalIplCredit, sc.lopaData?.tolerance);
                const rrf2 = calculateRRF(totalRecCredit, sc.lopaData?.tolerance);

                const rows = [];
                for (let i = 0; i < rowCount; i++) {
                  const rec = recs[i] || {};
                  const isFirstRow = i === 0;

                  rows.push(
                    <tr key={`${sc._id}-${i}`}>
                      {sc.isNewCons && isFirstRow && (
                        <>
                          <td rowSpan={sc.consSpanCount} style={{textAlign:'center', fontWeight: 'bold'}}>{sc.badgeCons}</td>
                          <td rowSpan={sc.consSpanCount} style={{whiteSpace:'normal'}}>
                            <span style={{ fontWeight: '600', color: '#0369a1' }}>
                              {sc.nodeId?.description ? `${nodeMap.get(sc.nodeId?._id) || 1}. ${sc.nodeId.description}` : `Node ${nodeMap.get(sc.nodeId?._id) || 1}`}
                            </span>
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{whiteSpace:'normal'}}>
                            <strong style={{color: '#b91c1c'}}>{sc.badgeCons}</strong> {getScenarioText(sc, lopaMapping)}
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{whiteSpace:'normal'}}>
                            <strong style={{color: '#d97706'}}>{sc.badgeCause}</strong> {getInitiatingEventText(sc, lopaMapping)}
                          </td>
                          
                          <td rowSpan={sc.consSpanCount}>
                            <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                              type="number" style={{width:'100%'}}
                              value={sc.lopaData?.freqOfInitiatingEvent || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'freqOfInitiatingEvent', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{textAlign: 'center', fontWeight: 'bold'}}>
                            {lopaMapping.severitySource === 'manual' ? (
                              <input disabled={!canEdit} data-gramm="false" spellcheck="false"
                                type="number" style={{width:'100%', textAlign: 'center'}}
                                value={sc.lopaData?.severity || ''}
                                onChange={(e) => handleLopaChange(sc._id, 'severity', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                            ) : (
                              getSeverityValue(sc, lopaMapping)
                            )}
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                            <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                              type="number" style={{width:'100%'}}
                              value={sc.lopaData?.cmPfd || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'cmPfd', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                            <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                              type="number" style={{width:'100%'}}
                              value={sc.lopaData?.cmTimeAtRisk || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'cmTimeAtRisk', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                            <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                              type="number" style={{width:'100%'}}
                              value={sc.lopaData?.cmOccupancy || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'cmOccupancy', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                        </>
                      )}
                      
                      {/* IPL Sub-row columns (One per Scenario) */}
                      {isFirstRow && (
                         <>
                            <td rowSpan={rowCount} style={{textAlign:'center'}}>
                              {sc.badgeSafe || ''}
                            </td>
                            <td rowSpan={rowCount} style={{position:'relative', whiteSpace:'normal'}}>
                              <div style={{width:'calc(100% - 20px)', padding:'5px'}}>
                                {getIplText(sc, lopaMapping)}
                              </div>
                            </td>
                            <td rowSpan={rowCount}>
                              <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                                type="number"
                                style={{width:'100%'}}
                                value={sc.lopaData?.iplCredit || ''}
                                onChange={(e) => handleLopaChange(sc._id, 'iplCredit', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                            </td>
                         </>
                      )}

                      {/* Calculated columns (Consequence Level) */}
                      {sc.isNewCons && isFirstRow && (
                        <>
                          <td rowSpan={sc.consSpanCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {totalIplCredit}
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                              <input disabled={!canEdit} data-gramm="false" spellcheck="false" 
                                type="text" style={{width:'100%', textAlign: 'center'}}
                                placeholder={getRtfForSeverity(getSeverityValue(sc, lopaMapping)) || (isAdvanced ? 'RTF' : 'Tolerance')}
                                title={getRtfForSeverity(getSeverityValue(sc, lopaMapping)) ? `Tolerability Matrix RTF for Severity ${getSeverityValue(sc, lopaMapping)}: ${getRtfForSeverity(getSeverityValue(sc, lopaMapping))} (Click 🎯 to apply)` : 'Target Risk Tolerance Frequency'}
                                value={sc.lopaData?.tolerance || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'tolerance', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                              {!sc.lopaData?.tolerance && getRtfForSeverity(getSeverityValue(sc, lopaMapping)) && canEdit && (
                                <button
                                  type="button"
                                  title={`Auto-apply Tolerability Matrix RTF (${getRtfForSeverity(getSeverityValue(sc, lopaMapping))})`}
                                  onClick={() => handleLopaChange(sc._id, 'tolerance', getRtfForSeverity(getSeverityValue(sc, lopaMapping)))}
                                  style={{
                                    position: 'absolute',
                                    right: '2px',
                                    fontSize: '9px',
                                    padding: '1px 3px',
                                    background: '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🎯
                                </button>
                              )}
                            </div>
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {rrf1}
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                              <input disabled={!canEdit} data-gramm="false" spellcheck="false" 
                                type="number" style={{width:'100%', textAlign: 'center'}}
                                placeholder={getSuggestedSIL(rrf1) ? `SIL ${getSuggestedSIL(rrf1)}` : 'SIL'}
                                title={getSuggestedSIL(rrf1) ? `IEC 61511 / CCPS Suggested Target: SIL ${getSuggestedSIL(rrf1)} (Click badge to apply)` : 'Required SIL'}
                                value={sc.lopaData?.requiredSil || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'requiredSil', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                              {!sc.lopaData?.requiredSil && getSuggestedSIL(rrf1) && canEdit && (
                                <button
                                  type="button"
                                  title={`Auto-apply CCPS calculated SIL ${getSuggestedSIL(rrf1)}`}
                                  onClick={() => handleLopaChange(sc._id, 'requiredSil', getSuggestedSIL(rrf1))}
                                  style={{
                                    position: 'absolute',
                                    right: '2px',
                                    fontSize: '9px',
                                    padding: '1px 3px',
                                    background: '#7c3aed',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⚡
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Recommendations (Multiple per Scenario) */}
                      <td style={{position:'relative', whiteSpace:'normal'}}>
                        <AutoResizeTextarea disabled={!canEdit} dataGramm="false" spellCheck={true} 
                          value={rec.description || ''}
                          onChange={(e) => handleArrayChange(sc._id, 'recommendations', i, 'description', e.target.value)}
                          onBlur={() => handleBlur(sc._id)}
                          style={{width:'calc(100% - 24px)', border:'none', background:'transparent', padding:'4px'}}
                          placeholder="Enter recommendation..."
                          minHeight={32}
                        />
                        {i < recs.length && canEdit && (
                          <button onClick={() => removeArrayItem(sc._id, 'recommendations', i)} style={{position:'absolute', right:'2px', top:'5px', color:'red', background:'none', border:'none', cursor:'pointer'}}>x</button>
                        )}
                        {i === recs.length - 1 && canEdit && (
                          <button onClick={() => addArrayItem(sc._id, 'recommendations')} style={{position:'absolute', right:'2px', bottom:'5px', color:'green', background:'none', border:'none', cursor:'pointer'}}>+</button>
                        )}
                        {recs.length === 0 && i === 0 && canEdit && (
                          <button onClick={() => addArrayItem(sc._id, 'recommendations')} style={{position:'absolute', right:'2px', bottom:'5px', color:'green', background:'none', border:'none', cursor:'pointer'}}>+</button>
                        )}
                      </td>
                      <td>
                        {i < recs.length && (
                          <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                            type="number"
                            style={{width:'100%'}}
                            value={rec.credit || ''}
                            onChange={(e) => handleArrayChange(sc._id, 'recommendations', i, 'credit', e.target.value)}
                            onBlur={() => handleBlur(sc._id)}
                          />
                        )}
                      </td>

                      {/* Rec Calculated (Consequence Level) */}
                      {sc.isNewCons && isFirstRow && (
                        <>
                          <td rowSpan={sc.consSpanCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {totalRecCredit}
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{textAlign:'center', fontWeight:'600'}}>
                             {sc.lopaData?.tolerance || getRtfForSeverity(getSeverityValue(sc, lopaMapping)) || ''}
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {rrf2}
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                              <input disabled={!canEdit} data-gramm="false" spellcheck="false" 
                                type="number" style={{width:'100%', textAlign: 'center'}}
                                placeholder={rrf2 && parseFloat(rrf2) <= 1 ? 'Satisfied' : (getSuggestedSIL(rrf2) ? `SIL ${getSuggestedSIL(rrf2)}` : 'SIL')}
                                title={rrf2 && parseFloat(rrf2) <= 1 ? 'Residual Risk Tolerable (No further SIL required)' : `Residual Target: SIL ${getSuggestedSIL(rrf2)}`}
                                value={sc.lopaData?.recommendationRequiredSil || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'recommendationRequiredSil', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                              {!sc.lopaData?.recommendationRequiredSil && (rrf2 && parseFloat(rrf2) <= 1 ? '0' : getSuggestedSIL(rrf2)) && canEdit && (
                                <button
                                  type="button"
                                  title="Auto-apply CCPS calculated residual SIL"
                                  onClick={() => handleLopaChange(sc._id, 'recommendationRequiredSil', rrf2 && parseFloat(rrf2) <= 1 ? '0' : getSuggestedSIL(rrf2))}
                                  style={{
                                    position: 'absolute',
                                    right: '2px',
                                    fontSize: '9px',
                                    padding: '1px 3px',
                                    background: '#7c3aed',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⚡
                                </button>
                              )}
                            </div>
                          </td>
                          {columns.filter(c => !c.isSystem).map(col => (
                            <td key={col.id} rowSpan={sc.consSpanCount}>
                              <AutoResizeTextarea disabled={!canEdit} dataGramm="false" spellCheck={true} 
                                style={{width:'100%', border:'none', background:'transparent', padding:'4px'}}
                                value={(sc.lopaData || {})[col.id] || ''} 
                                onChange={(e) => handleLopaChange(sc._id, col.id, e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                                minHeight={32}
                              />
                            </td>
                          ))}
                        </>
                      )}

                    </tr>
                  );
                }
                return rows;
              })}
              
              {!loading && formattedScenarios.length === 0 && (
                <tr>
                  <td colSpan="20" style={{textAlign:'center', padding:'20px'}}>No scenarios available. Add data in PHA Worksheet first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isManageColumnsOpen && (
          <ManageColumnsModal
            studyId={study._id}
            registryType="lopa"
            onClose={() => setIsManageColumnsOpen(false)}
            onSave={(newCols) => {
              setColumns(newCols);
              setIsManageColumnsOpen(false);
            }}
          />
        )}

        {isTolerabilityModalOpen && (
          <TolerabilityMatrixModal
            studyId={study._id}
            studyCriteria={studyCriteria}
            onClose={() => setIsTolerabilityModalOpen(false)}
            onSaveMatrix={(newMatrix) => setTolerabilityMatrix(newMatrix)}
            onBatchApplyRtf={handleBatchApplyRtf}
            scenariosCount={scenarios.length}
          />
        )}
      </div>
    </StudyLayout>
  );
};

export default LOPAWorksheet;
