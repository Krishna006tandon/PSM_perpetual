import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import ManageColumnsModal from '../components/ManageColumnsModal';
import './DynamicRegistry.css';

const LOPAWorksheet = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
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
      
      const colRes = await fetch(`http://localhost:5000/api/columns/${study._id}/lopa`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

      const scRes = await fetch(`http://localhost:5000/api/scenarios/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (scRes.ok) {
        let scData = await scRes.json();
        
        // Ensure lopaData structure exists for all scenarios
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
            ipls: [],
            recommendations: []
          };
          
          if (!sc.lopaData) {
            sc.lopaData = defaultLopa;
            
            // Pre-populate IPLs from presentProtection if exists
            if (sc.presentProtection) {
              sc.lopaData.ipls.push({ no: '1.1', description: sc.presentProtection, credit: 1 });
            }
            
            // Pre-populate Recs from additionalProtection if exists
            if (sc.additionalProtection) {
              sc.lopaData.recommendations.push({ description: sc.additionalProtection, credit: 1 });
            }
          } else {
             // ensure arrays exist
             if (!sc.lopaData.ipls) sc.lopaData.ipls = [];
             if (!sc.lopaData.recommendations) sc.lopaData.recommendations = [];
          }
          return sc;
        });
        setScenarios(scData);
      }

      const nodeRes = await fetch(`http://localhost:5000/api/nodes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (nodeRes.ok) setNodes(await nodeRes.json());

      const devRes = await fetch(`http://localhost:5000/api/deviations/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (devRes.ok) setDeviations(await devRes.json());

      const causeRes = await fetch(`http://localhost:5000/api/causes/${study._id}`, {
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
        if (isIpl) {
          const newNo = `${scenarios.indexOf(sc) + 1}.${newArray.length + 1}`;
          newArray.push({ no: newNo, description: '', credit: 1 });
        } else {
          newArray.push({ description: '', credit: 1 });
        }
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
        
        // Re-number IPLs if needed
        if (arrayName === 'ipls') {
           const scIndex = scenarios.indexOf(sc) + 1;
           newArray.forEach((item, i) => item.no = `${scIndex}.${i + 1}`);
        }
        
        return { ...sc, lopaData: { ...sc.lopaData, [arrayName]: newArray } };
      }
      return sc;
    }));
  };

  const handleBlur = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const sc = scenarios.find(s => s._id === id);
      if (!sc) return;

      await fetch(`http://localhost:5000/api/scenarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lopaData: sc.lopaData })
      });
    } catch (error) {
      console.error('Failed to save scenario:', error);
    }
  };

  const calculateTotalCredit = (sc, includeRecs = false) => {
    const data = sc.lopaData || {};
    const freq = parseFloat(data.freqOfInitiatingEvent) || 0;
    const pfd = parseFloat(data.cmPfd) || 1;
    const time = parseFloat(data.cmTimeAtRisk) || 1;
    const occ = parseFloat(data.cmOccupancy) || 1;
    
    let total = freq * pfd * time * occ;
    
    if (data.ipls && data.ipls.length > 0) {
      data.ipls.forEach(ipl => {
         const cr = parseFloat(ipl.credit);
         if (!isNaN(cr)) total *= cr;
      });
    }

    if (includeRecs && data.recommendations && data.recommendations.length > 0) {
      data.recommendations.forEach(rec => {
         const cr = parseFloat(rec.credit);
         if (!isNaN(cr)) total *= cr;
      });
    }

    // Format to avoid huge floating points, e.g. 0.000100
    return total > 0 ? Number(total.toPrecision(4)) : '';
  };

  const calculateRRF = (totalCredit, tolerance) => {
    const t = parseFloat(totalCredit);
    const tol = parseFloat(tolerance);
    if (!isNaN(t) && !isNaN(tol) && tol > 0) {
      return Number((t / tol).toPrecision(4));
    }
    return '';
  };

  const evaluateFormula = (formulaStr, sc) => {
    if (!formulaStr) return '';
    try {
      let expr = formulaStr;
      
      // Known predefined values
      const dict = {
        '[Severity]': parseFloat(sc.lopaData?.severity) || 0,
        '[Tolerance]': parseFloat(sc.lopaData?.tolerance) || 0,
        '[Required SIL]': parseFloat(sc.lopaData?.requiredSil) || 0,
        '[Freq of Initiating Event]': parseFloat(sc.lopaData?.freqOfInitiatingEvent) || 0,
        '[PFD]': parseFloat(sc.lopaData?.cmPfd) || 0,
        '[Time at Risk]': parseFloat(sc.lopaData?.cmTimeAtRisk) || 0,
        '[Occupancy]': parseFloat(sc.lopaData?.cmOccupancy) || 0
      };
      
      // Handle array accumulations
      let allIplCredits = 1;
      (sc.lopaData?.ipls || []).forEach(ipl => {
         const cr = parseFloat(ipl.credit);
         if (!isNaN(cr)) allIplCredits *= cr;
      });
      dict['[ALL_IPL_CREDITS]'] = allIplCredits;
      
      let allRecCredits = 1;
      (sc.lopaData?.recommendations || []).forEach(rec => {
         const cr = parseFloat(rec.credit);
         if (!isNaN(cr)) allRecCredits *= cr;
      });
      dict['[ALL_REC_CREDITS]'] = allRecCredits;
      
      // Custom columns
      columns.forEach(col => {
         if (!col.isSystem) {
           const val = parseFloat((sc.lopaData || {})[col.id]) || 0;
           dict[`[${col.label}]`] = val;
         }
      });
      
      Object.keys(dict).forEach(key => {
        const escapedKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        expr = expr.replace(regex, dict[key]);
      });
      
      if (/^[0-9+\-*/().\s]+$/.test(expr)) {
         // eslint-disable-next-line no-new-func
         const result = new Function('return ' + expr)();
         return isNaN(result) ? 'ERR' : Number(result.toPrecision(4));
      }
      return 'ERR (Invalid)';
    } catch (e) {
      return 'ERR';
    }
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="lopa" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="dynamic-container" style={{ padding: '0px' }}>
        <div className="dynamic-header" style={{ padding: '20px 30px' }}>
          <h2>LOPA WORKSHEET</h2>
        </div>

        <div className="dynamic-toolbar" style={{ padding: '0 30px 10px' }}>
          <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
            <span className="icon">◫</span> MANAGE COLUMNS
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
                <th rowSpan="2" style={{width:'80px'}}>IPL Credit</th>
                <th rowSpan="2" style={{minWidth:'100px'}}>Total IPL Credit</th>
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
              {!loading && scenarios.map((sc, scIndex) => {
                const ipls = sc.lopaData?.ipls || [];
                const recs = sc.lopaData?.recommendations || [];
                const rowCount = Math.max(1, ipls.length, recs.length);

                const sysTotalIpl = columns.find(c => c.id === 'sys_total_ipl');
                const sysTolerance = columns.find(c => c.id === 'sys_tolerance');
                const sysRrf = columns.find(c => c.id === 'sys_rrf');
                const sysReqSil = columns.find(c => c.id === 'sys_req_sil');

                const totalCredit1 = sysTotalIpl?.formulaString ? evaluateFormula(sysTotalIpl.formulaString, sc) : calculateTotalCredit(sc, false);
                const rrf1 = sysRrf?.formulaString ? evaluateFormula(sysRrf.formulaString, sc) : calculateRRF(totalCredit1, sc.lopaData?.tolerance);
                
                const totalCredit2 = calculateTotalCredit(sc, true);
                const rrf2 = calculateRRF(totalCredit2, sc.lopaData?.tolerance);

                const rows = [];
                for (let i = 0; i < rowCount; i++) {
                  const ipl = ipls[i] || {};
                  const rec = recs[i] || {};
                  
                  const isFirstRow = i === 0;

                  rows.push(
                    <tr key={`${sc._id}-${i}`}>
                      {isFirstRow && (
                        <>
                          <td rowSpan={rowCount} style={{textAlign:'center'}}>{scIndex + 1}</td>
                          <td rowSpan={rowCount} style={{whiteSpace:'normal'}}>{sc.deviationId?.deviationAuto || ''}</td>
                          <td rowSpan={rowCount} style={{whiteSpace:'normal'}}>{sc.consequencesImmediate || ''}</td>
                          <td rowSpan={rowCount} style={{whiteSpace:'normal'}}>{sc.causeId?.description || ''}</td>
                          <td rowSpan={rowCount}>
                            <input 
                              type="number" 
                              style={{width:'100%'}}
                              value={sc.lopaData?.freqOfInitiatingEvent || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'freqOfInitiatingEvent', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={rowCount}>
                            <input 
                              type="number" 
                              style={{width:'100%'}}
                              value={sc.lopaData?.severity || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'severity', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={rowCount}>
                            <input 
                              type="number" 
                              style={{width:'100%'}}
                              value={sc.lopaData?.cmPfd || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'cmPfd', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={rowCount}>
                            <input 
                              type="number" 
                              style={{width:'100%'}}
                              value={sc.lopaData?.cmTimeAtRisk || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'cmTimeAtRisk', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          <td rowSpan={rowCount}>
                            <input 
                              type="number" 
                              style={{width:'100%'}}
                              value={sc.lopaData?.cmOccupancy || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'cmOccupancy', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                        </>
                      )}
                      
                      {/* IPL Sub-row columns */}
                      <td style={{textAlign:'center'}}>
                        {ipl.no || ''}
                      </td>
                      <td style={{position:'relative', whiteSpace:'normal'}}>
                        <textarea 
                          value={ipl.description || ''}
                          onChange={(e) => handleArrayChange(sc._id, 'ipls', i, 'description', e.target.value)}
                          onBlur={() => handleBlur(sc._id)}
                          style={{width:'calc(100% - 20px)'}}
                        />
                        {i < ipls.length && (
                          <button onClick={() => removeArrayItem(sc._id, 'ipls', i)} style={{position:'absolute', right:'2px', top:'5px', color:'red', background:'none', border:'none', cursor:'pointer'}}>x</button>
                        )}
                        {i === ipls.length - 1 && (
                          <button onClick={() => addArrayItem(sc._id, 'ipls', true)} style={{position:'absolute', right:'2px', bottom:'5px', color:'green', background:'none', border:'none', cursor:'pointer'}}>+</button>
                        )}
                        {ipls.length === 0 && i === 0 && (
                          <button onClick={() => addArrayItem(sc._id, 'ipls', true)} style={{position:'absolute', right:'2px', bottom:'5px', color:'green', background:'none', border:'none', cursor:'pointer'}}>+</button>
                        )}
                      </td>
                      <td>
                        {i < ipls.length && (
                          <input 
                            type="number"
                            style={{width:'100%'}}
                            value={ipl.credit || ''}
                            onChange={(e) => handleArrayChange(sc._id, 'ipls', i, 'credit', e.target.value)}
                            onBlur={() => handleBlur(sc._id)}
                          />
                        )}
                      </td>

                      {/* Calculated columns (rowSpan) */}
                      {isFirstRow && (
                        <>
                          <td rowSpan={rowCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {totalCredit1}
                          </td>
                          <td rowSpan={rowCount}>
                            {sysTolerance?.formulaString ? (
                              <div style={{textAlign:'center', background:'rgba(0,0,0,0.05)', padding:'5px'}}>{evaluateFormula(sysTolerance.formulaString, sc)}</div>
                            ) : (
                              <input 
                                type="number" 
                                style={{width:'100%'}}
                                value={sc.lopaData?.tolerance || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'tolerance', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                            )}
                          </td>
                          <td rowSpan={rowCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {rrf1}
                          </td>
                          <td rowSpan={rowCount}>
                            {sysReqSil?.formulaString ? (
                              <div style={{textAlign:'center', background:'rgba(0,0,0,0.05)', padding:'5px'}}>{evaluateFormula(sysReqSil.formulaString, sc)}</div>
                            ) : (
                              <input 
                                type="number" 
                                style={{width:'100%'}}
                                value={sc.lopaData?.requiredSil || ''} 
                                onChange={(e) => handleLopaChange(sc._id, 'requiredSil', e.target.value)}
                                onBlur={() => handleBlur(sc._id)}
                              />
                            )}
                          </td>
                        </>
                      )}

                      {/* Recommendations Sub-row columns */}
                      <td style={{position:'relative', whiteSpace:'normal'}}>
                        <textarea 
                          value={rec.description || ''}
                          onChange={(e) => handleArrayChange(sc._id, 'recommendations', i, 'description', e.target.value)}
                          onBlur={() => handleBlur(sc._id)}
                          style={{width:'calc(100% - 20px)'}}
                        />
                        {i < recs.length && (
                          <button onClick={() => removeArrayItem(sc._id, 'recommendations', i)} style={{position:'absolute', right:'2px', top:'5px', color:'red', background:'none', border:'none', cursor:'pointer'}}>x</button>
                        )}
                        {i === recs.length - 1 && (
                          <button onClick={() => addArrayItem(sc._id, 'recommendations', false)} style={{position:'absolute', right:'2px', bottom:'5px', color:'green', background:'none', border:'none', cursor:'pointer'}}>+</button>
                        )}
                        {recs.length === 0 && i === 0 && (
                          <button onClick={() => addArrayItem(sc._id, 'recommendations', false)} style={{position:'absolute', right:'2px', bottom:'5px', color:'green', background:'none', border:'none', cursor:'pointer'}}>+</button>
                        )}
                      </td>
                      <td>
                        {i < recs.length && (
                          <input 
                            type="number"
                            style={{width:'100%'}}
                            value={rec.credit || ''}
                            onChange={(e) => handleArrayChange(sc._id, 'recommendations', i, 'credit', e.target.value)}
                            onBlur={() => handleBlur(sc._id)}
                          />
                        )}
                      </td>

                      {/* New Calculated columns (rowSpan) */}
                      {isFirstRow && (
                        <>
                          <td rowSpan={rowCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {totalCredit2}
                          </td>
                          <td rowSpan={rowCount} style={{textAlign:'center', color:'var(--text-secondary)'}}>
                            {sysTolerance?.formulaString ? evaluateFormula(sysTolerance.formulaString, sc) : (sc.lopaData?.tolerance || '')}
                          </td>
                          <td rowSpan={rowCount} style={{background:'rgba(34, 197, 94, 0.1)', fontWeight:'bold', textAlign:'center'}}>
                            {rrf2}
                          </td>
                          <td rowSpan={rowCount}>
                            <input 
                              type="number" 
                              style={{width:'100%'}}
                              value={sc.lopaData?.recommendationRequiredSil || ''} 
                              onChange={(e) => handleLopaChange(sc._id, 'recommendationRequiredSil', e.target.value)}
                              onBlur={() => handleBlur(sc._id)}
                            />
                          </td>
                          {columns.filter(c => !c.isSystem).map(col => (
                            <td key={col.id} rowSpan={rowCount} className="col-custom" style={col.type === 'formula' ? {background:'var(--surface-hover)', textAlign:'center'} : {}}>
                              {col.type === 'formula' ? (
                                <span>{evaluateFormula(col.formulaString, sc)}</span>
                              ) : (
                                <input
                                  type="text"
                                  style={{width:'100%'}}
                                  value={(sc.lopaData || {})[col.id] || ''}
                                  onChange={(e) => handleLopaChange(sc._id, col.id, e.target.value)}
                                  onBlur={() => handleBlur(sc._id)}
                                />
                              )}
                            </td>
                          ))}
                        </>
                      )}
                    </tr>
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isManageColumnsOpen && (
        <ManageColumnsModal 
          studyId={study._id}
          registryType="lopa"
          onClose={() => setIsManageColumnsOpen(false)}
          onSave={(newCols) => { setColumns(newCols); setIsManageColumnsOpen(false); }}
        />
      )}
    </StudyLayout>
  );
};

export default LOPAWorksheet;
