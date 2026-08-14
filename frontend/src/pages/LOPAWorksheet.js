import React, { useState, useEffect, useMemo } from 'react';
import StudyLayout from '../components/StudyLayout';
import ManageColumnsModal from '../components/ManageColumnsModal';
import './DynamicRegistry.css';

const LOPAWorksheet = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [scenarios, setScenarios] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [causes, setCauses] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
            if (sc.additionalProtection) {
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

      const devRes = await fetch(`https://api.perpetualsolutions.co.in/api/deviations/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (devRes.ok) setDeviations(await devRes.json());

      const causeRes = await fetch(`https://api.perpetualsolutions.co.in/api/causes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (causeRes.ok) setCauses(await causeRes.json());

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

  // Group scenarios into Consequences, then individual safeguards are IPLs
  const formattedScenarios = useMemo(() => {
    const sorted = [...scenarios].sort((a, b) => {
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

    let nodeMap = new Map();
    nodes.forEach((n, i) => nodeMap.set(n._id, i + 1));

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
      const consKey = sc.consequencesImmediate || '';

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
          if (scJ.nodeId?._id === nId && scJ.deviationId?._id === devId && scJ.causeId?._id === causeId && (scJ.consequencesImmediate || '') === consKey) {
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
  }, [scenarios, nodes]);

  // Evaluate Custom Formulas
  const evaluateFormula = (formulaString, sc, parentSc = sc) => {
    try {
      if (!formulaString) return '';
      
      const pfd = parseFloat(parentSc.lopaData?.cmPfd) || 1;
      const timeAtRisk = parseFloat(parentSc.lopaData?.cmTimeAtRisk) || 1;
      const occ = parseFloat(parentSc.lopaData?.cmOccupancy) || 1;
      const freq = parseFloat(parentSc.lopaData?.freqOfInitiatingEvent) || 1;
      const iplCredit = parseFloat(sc.lopaData?.iplCredit) || 1;
      
      const dict = {
        '[Severity]': parseFloat(parentSc.inherentRiskS || parentSc.lopaData?.severity) || 0,
        '[Tolerance]': parseFloat(parentSc.lopaData?.tolerance) || 0,
        '[Required SIL]': parseFloat(parentSc.lopaData?.requiredSil) || 0,
        '[Freq of Initiating Event]': freq,
        '[PFD]': pfd,
        '[Time at Risk]': timeAtRisk,
        '[Occupancy]': occ
      };

      let expr = formulaString;
      for (const [key, val] of Object.entries(dict)) {
        expr = expr.split(key).join(val);
      }
      
      // Calculate total credit for formula
      // We will just do a simple eval for demonstration.
      return (new Function('return ' + expr))();
    } catch (e) {
      return 'Error';
    }
  };

  const calculateTotalCredit = (parentSc, includeRecs = false) => {
    const f = parseFloat(parentSc.lopaData?.freqOfInitiatingEvent) || 0;
    if (!f) return 0;
    
    const pfd = parseFloat(parentSc.lopaData?.cmPfd) || 1;
    const timeAtRisk = parseFloat(parentSc.lopaData?.cmTimeAtRisk) || 1;
    const occ = parseFloat(parentSc.lopaData?.cmOccupancy) || 1;
    
    // Total IPL credit is product of all IPL credits in the consequence group
    // But since we pass parentSc, we need to gather all siblings?
    // Wait, the formula in the image: Total IPL Credit = PDI * Time at Risk * Occupancy * IPL1 * IPL2 ...
    // Since we map per scenario (Safeguard = IPL), the "Total IPL Credit" should be calculated per Consequence and displayed once!
    return 0; // Handled inline below for consequence group
  };

  const calculateRRF = (totalCredit, toleranceStr) => {
    const t = parseFloat(toleranceStr);
    if (!totalCredit || !t) return '';
    const rrf = totalCredit / t;
    return rrf >= 1 ? rrf.toFixed(2) : 1;
  };

  const exportToCSV = () => {
    let csv = "SR.,DEVIATION,CONSEQUENCE,CAUSE,FREQ OF INITIATING EVENT,SEVERITY,CM PFD,CM TIME AT RISK,CM OCCUPANCY,IPL NO,IPL,IPL CREDITS,TOTAL IPL CREDIT,TOLERANCE,RRF,REQUIRED SIL,RECOMMENDATION,REC CREDIT,TOTAL REC CREDIT,REC TOLERANCE,REC RRF,REC REQUIRED SIL\\n";
    formattedScenarios.forEach((sc) => {
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      
      const freqi = parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0;
      const pfd = parseFloat(sc.lopaData?.cmPfd) || 1;
      const time = parseFloat(sc.lopaData?.cmTimeAtRisk) || 1;
      const occ = parseFloat(sc.lopaData?.cmOccupancy) || 1;
      
      let siblingProduct = 1;
      let siblingRecProduct = 1;
      for(let s of formattedScenarios) {
        if (s.badgeCons === sc.badgeCons) {
           siblingProduct *= (parseFloat(s.lopaData?.iplCredit) || 1);
           const srecs = s.lopaData?.recommendations || [];
           if (srecs.length > 0) {
             srecs.forEach(r => { siblingRecProduct *= (parseFloat(r.credit) || 1); });
           }
        }
      }
      const totalIplCredit = (freqi * pfd * time * occ * siblingProduct).toFixed(6);
      const totalRecCredit = (freqi * pfd * time * occ * siblingProduct * siblingRecProduct).toFixed(6);
      const rrf1 = calculateRRF(totalIplCredit, sc.lopaData?.tolerance);
      const rrf2 = calculateRRF(totalRecCredit, sc.lopaData?.tolerance);

      const recs = sc.lopaData?.recommendations || [];
      const recText = recs.map(r => r.text || '').join(' | ');
      const recCreditText = recs.map(r => r.credit || '').join(' | ');

      csv += [
        escape(sc.badgeCons), escape(sc.deviationId?.deviationAuto), escape(sc.consequencesImmediate), escape(sc.causeId?.description),
        escape(sc.lopaData?.freqOfInitiatingEvent), escape(sc.lopaData?.severity),
        escape(sc.lopaData?.cmPfd), escape(sc.lopaData?.cmTimeAtRisk), escape(sc.lopaData?.cmOccupancy),
        escape(sc.lopaData?.iplNo), escape(sc.lopaData?.ipl), escape(sc.lopaData?.iplCredit),
        escape(totalIplCredit), escape(sc.lopaData?.tolerance), escape(rrf1), escape(sc.lopaData?.recommendationRequiredSil),
        escape(recText), escape(recCreditText),
        escape(totalRecCredit), escape(sc.lopaData?.tolerance), escape(rrf2), escape(sc.lopaData?.recommendationRequiredSil)
      ].join(',') + '\\n';
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
        { content: 'SN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Deviation', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Consequence', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Cause', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Freq', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Sev', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Cond. Modifiers', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Independent Protection Layers (IPL)', colSpan: 4, styles: { halign: 'center' } },
        { content: 'RRF & SIL', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Recommendations & Mitigated Risk', colSpan: 6, styles: { halign: 'center' } }
      ],
      [
        'PFD', 'Time', 'Occ',
        'No', 'IPL', 'Credit', 'Total',
        'Tol', 'RRF', 'SIL',
        'Rec', 'Credit', 'Total', 'Tol', 'RRF', 'SIL'
      ]
    ];

    const body = formattedScenarios.map((sc) => {
      const freqi = parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0;
      const pfd = parseFloat(sc.lopaData?.cmPfd) || 1;
      const time = parseFloat(sc.lopaData?.cmTimeAtRisk) || 1;
      const occ = parseFloat(sc.lopaData?.cmOccupancy) || 1;
      
      let siblingProduct = 1;
      let siblingRecProduct = 1;
      for(let s of formattedScenarios) {
        if (s.badgeCons === sc.badgeCons) {
           siblingProduct *= (parseFloat(s.lopaData?.iplCredit) || 1);
           const srecs = s.lopaData?.recommendations || [];
           if (srecs.length > 0) {
             srecs.forEach(r => { siblingRecProduct *= (parseFloat(r.credit) || 1); });
           }
        }
      }
      const totalIplCredit = (freqi * pfd * time * occ * siblingProduct).toFixed(6);
      const totalRecCredit = (freqi * pfd * time * occ * siblingProduct * siblingRecProduct).toFixed(6);
      const rrf1 = calculateRRF(totalIplCredit, sc.lopaData?.tolerance);
      const rrf2 = calculateRRF(totalRecCredit, sc.lopaData?.tolerance);

      const recs = sc.lopaData?.recommendations || [];
      const recText = recs.map(r => r.text || '').join(' \\n ');
      const recCreditText = recs.map(r => r.credit || '').join(' \\n ');

      return [
        sc.badgeCons || '', sc.deviationId?.deviationAuto || '', sc.consequencesImmediate || '', sc.causeId?.description || '',
        sc.lopaData?.freqOfInitiatingEvent || '', sc.lopaData?.severity || '', 
        sc.lopaData?.cmPfd || '', sc.lopaData?.cmTimeAtRisk || '', sc.lopaData?.cmOccupancy || '',
        sc.lopaData?.iplNo || '', sc.lopaData?.ipl || '', sc.lopaData?.iplCredit || '', totalIplCredit,
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
        1: { cellWidth: 40 }, // Dev
        2: { cellWidth: 50 }, // Cons
        3: { cellWidth: 50 }, // Cause
        4: { cellWidth: 20 }, // Freq
        5: { cellWidth: 15 }, // Sev
        6: { cellWidth: 15 }, 7: { cellWidth: 15 }, 8: { cellWidth: 15 }, // CMs
        9: { cellWidth: 15 }, 10: { cellWidth: 60 }, 11: { cellWidth: 20 }, 12: { cellWidth: 25 }, // IPL
        13: { cellWidth: 20 }, 14: { cellWidth: 20 }, 15: { cellWidth: 15 }, // RRF
        16: { cellWidth: 60 }, 17: { cellWidth: 20 }, 18: { cellWidth: 25 }, 19: { cellWidth: 20 }, 20: { cellWidth: 20 }, 21: { cellWidth: 15 } // Rec
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
        </div>

        <div className="dynamic-toolbar" style={{ padding: '0 30px 10px', display: 'flex', gap: '10px' }}>
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
        </div>

        <div className="dynamic-table-wrapper" style={{ maxHeight: 'calc(100vh - 200px)', margin: '0' }}>
          <table className="dynamic-table lopa-table" style={{ borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th rowSpan="2" style={{width:'40px'}}>SN</th>
                <th rowSpan="2" style={{minWidth:'150px'}}>Deviation</th>
                <th rowSpan="2" style={{minWidth:'200px'}}>Consequence</th>
                <th rowSpan="2" style={{minWidth:'200px'}}>Initiating Event (Cause)</th>
                <th rowSpan="2" style={{minWidth:'100px'}}>Freq of Initiating Event</th>
                <th rowSpan="2" style={{width:'80px'}}>Severity</th>
                <th colSpan="3" style={{textAlign:'center', background:'var(--surface-hover)'}}>Condition Modifiers</th>
                <th rowSpan="2" style={{width:'60px'}}>IPL No</th>
                <th rowSpan="2" style={{minWidth:'250px'}}>IPL</th>
                <th rowSpan="2" style={{width:'80px'}}>IPL Credits</th>
                <th rowSpan="2" style={{minWidth:'100px'}}>Total IPL Credit</th>
                <th rowSpan="2" style={{minWidth:'100px'}}>Tolerance</th>
                <th rowSpan="2" style={{width:'80px'}}>RRF</th>
                <th rowSpan="2" style={{width:'80px'}}>Required SIL</th>
                <th rowSpan="2" style={{minWidth:'250px'}}>Recommendation</th>
                <th rowSpan="2" style={{width:'80px'}}>Rec Credit</th>
                <th rowSpan="2" style={{minWidth:'100px'}}>Total Credit</th>
                <th rowSpan="2" style={{minWidth:'100px'}}>Tolerance</th>
                <th rowSpan="2" style={{width:'80px'}}>RRF</th>
                <th rowSpan="2" style={{width:'80px'}}>Required SIL</th>
                {columns.filter(c => !c.isSystem).map(col => (
                  <th key={col.id} rowSpan="2" className="col-custom">{col.label}</th>
                ))}
              </tr>
              <tr>
                <th style={{width:'60px', fontSize:'11px'}}>PFD</th>
                <th style={{width:'60px', fontSize:'11px'}}>Time at Risk</th>
                <th style={{width:'60px', fontSize:'11px'}}>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {!loading && formattedScenarios.map((sc, scIndex) => {
                const recs = sc.lopaData?.recommendations || [];
                const rowCount = Math.max(1, recs.length);

                // For Consequence level calculations, we need to gather all siblings
                let totalIplCredit = 1;
                let totalRecCredit = 1;
                let parentSc = sc;

                if (sc.isNewCons) {
                  const freq = parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0;
                  const pfd = parseFloat(sc.lopaData?.cmPfd) || 1;
                  const time = parseFloat(sc.lopaData?.cmTimeAtRisk) || 1;
                  const occ = parseFloat(sc.lopaData?.cmOccupancy) || 1;
                  
                  // Product of all IPL credits in this consequence group
                  let siblingProduct = 1;
                  let siblingRecProduct = 1;
                  
                  for(let s of formattedScenarios) {
                    if (s.badgeCons === sc.badgeCons) {
                       siblingProduct *= (parseFloat(s.lopaData?.iplCredit) || 1);
                       // Also multiply recommendations
                       const srecs = s.lopaData?.recommendations || [];
                       if (srecs.length > 0) {
                         srecs.forEach(r => {
                           siblingRecProduct *= (parseFloat(r.credit) || 1);
                         });
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
                          <td rowSpan={sc.consSpanCount} style={{textAlign:'center'}}>{sc.badgeCons}</td>
                          <td rowSpan={sc.consSpanCount} style={{whiteSpace:'normal'}}>{sc.badgeDev} {sc.deviationId?.deviationAuto || ''}</td>
                          <td rowSpan={sc.consSpanCount} style={{whiteSpace:'normal'}}>{sc.badgeCons} {sc.consequencesImmediate || ''}</td>
                          <td rowSpan={sc.consSpanCount} style={{whiteSpace:'normal'}}>{sc.badgeCause} {sc.causeId?.description || ''}</td>
                          
                          <td rowSpan={sc.consSpanCount}>
                            <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                              type="number" style={{width:'100%'}}
                              value={sc.lopaData?.freqOfInitiatingEvent || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'freqOfInitiatingEvent', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{textAlign: 'center', fontWeight: 'bold'}}>
                            {sc.inherentRiskS || ''}
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
                                {sc.presentProtection || ''}
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
                             <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                                type="number" style={{width:'100%'}}
                                value={sc.lopaData?.tolerance || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'tolerance', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {rrf1}
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                             <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                                type="number" style={{width:'100%'}}
                                value={sc.lopaData?.requiredSil || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'requiredSil', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                          </td>
                        </>
                      )}

                      {/* Recommendations (Multiple per Scenario) */}
                      <td style={{position:'relative', whiteSpace:'normal'}}>
                        <textarea disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                          value={rec.description || ''}
                          onChange={(e) => handleArrayChange(sc._id, 'recommendations', i, 'description', e.target.value)}
                          onBlur={() => handleBlur(sc._id)}
                          style={{width:'calc(100% - 20px)'}}
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
                          <td rowSpan={sc.consSpanCount}>
                             {sc.lopaData?.tolerance || ''}
                          </td>
                          <td rowSpan={sc.consSpanCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {rrf2}
                          </td>
                          <td rowSpan={sc.consSpanCount}>
                             <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                                type="number" style={{width:'100%'}}
                                value={sc.lopaData?.recommendationRequiredSil || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'recommendationRequiredSil', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                          </td>
                          {columns.filter(c => !c.isSystem).map(col => (
                            <td key={col.id} rowSpan={sc.consSpanCount}>
                              <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                                style={{width:'100%'}}
                                value={(sc.lopaData || {})[col.id] || ''} 
                                onChange={(e) => handleLopaChange(sc._id, col.id, e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
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
      </div>
    </StudyLayout>
  );
};

export default LOPAWorksheet;
