import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import './RiskRegistry.css';

const RiskRegistry = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [criteria, setCriteria] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriteria();
  }, [study._id]);

  const fetchCriteria = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/risk-criteria/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCriteria(await res.json());
      }
    } catch (err) {
      console.error('Error fetching risk criteria:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/risk-criteria/${study._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(criteria)
      });
      if (res.ok) {
        alert('Risk Criteria saved successfully');
      }
    } catch (err) {
      console.error('Error saving risk criteria:', err);
    }
  };

  const handleMatrixCellChange = (sLevel, lLevel, field, value) => {
    setCriteria(prev => {
      const newCells = prev.matrixCells.map(cell => {
        if (cell.severityLevel === sLevel && cell.likelihoodLevel === lLevel) {
          return { ...cell, [field]: value };
        }
        return cell;
      });
      return { ...prev, matrixCells: newCells };
    });
  };

  const handleConsequenceChange = (sLevel, category, value) => {
    setCriteria(prev => {
      const newSeverity = prev.severityLevels.map(s => {
        if (s.level === sLevel) {
          const newCons = { ...s.consequences };
          newCons[category] = value;
          return { ...s, consequences: newCons };
        }
        return s;
      });
      return { ...prev, severityLevels: newSeverity };
    });
  };

  const handleLikelihoodChange = (lLevel, field, value) => {
    setCriteria(prev => {
      const newLikelihood = prev.likelihoodLevels.map(l => {
        if (l.level === lLevel) {
          return { ...l, [field]: value };
        }
        return l;
      });
      return { ...prev, likelihoodLevels: newLikelihood };
    });
  };

  const addSeverityLevel = () => {
    setCriteria(prev => {
      const newLevel = prev.severityLevels.length + 1;
      const newSev = [...prev.severityLevels, { level: newLevel, name: `Severity ${newLevel}`, consequences: {} }];
      
      const newMatrixCells = [...prev.matrixCells];
      prev.likelihoodLevels.forEach(l => {
        newMatrixCells.push({
          severityLevel: newLevel,
          likelihoodLevel: l.level,
          score: newLevel * l.level,
          category: prev.riskCategories.length > 0 ? prev.riskCategories[0].name : ''
        });
      });
      return { ...prev, severityLevels: newSev, matrixCells: newMatrixCells };
    });
  };

  const removeSeverityLevel = () => {
    setCriteria(prev => {
      if (prev.severityLevels.length <= 1) return prev;
      const newSev = [...prev.severityLevels];
      const removedLevel = newSev.pop().level;
      
      const newMatrixCells = prev.matrixCells.filter(cell => cell.severityLevel !== removedLevel);
      return { ...prev, severityLevels: newSev, matrixCells: newMatrixCells };
    });
  };

  const addLikelihoodLevel = () => {
    setCriteria(prev => {
      const newLevel = prev.likelihoodLevels.length + 1;
      const newLik = [...prev.likelihoodLevels, { level: newLevel, name: `Likelihood ${newLevel}`, description: '', frequency: '' }];
      
      const newMatrixCells = [...prev.matrixCells];
      prev.severityLevels.forEach(s => {
        newMatrixCells.push({
          severityLevel: s.level,
          likelihoodLevel: newLevel,
          score: s.level * newLevel,
          category: prev.riskCategories.length > 0 ? prev.riskCategories[0].name : ''
        });
      });
      return { ...prev, likelihoodLevels: newLik, matrixCells: newMatrixCells };
    });
  };

  const removeLikelihoodLevel = () => {
    setCriteria(prev => {
      if (prev.likelihoodLevels.length <= 1) return prev;
      const newLik = [...prev.likelihoodLevels];
      const removedLevel = newLik.pop().level;
      
      const newMatrixCells = prev.matrixCells.filter(cell => cell.likelihoodLevel !== removedLevel);
      return { ...prev, likelihoodLevels: newLik, matrixCells: newMatrixCells };
    });
  };

  const addRiskCategory = () => {
    setCriteria(prev => {
      return { ...prev, riskCategories: [...prev.riskCategories, { name: 'New Category', color: '#cccccc' }] };
    });
  };

  const removeRiskCategory = (index) => {
    setCriteria(prev => {
      if (prev.riskCategories.length <= 1) return prev;
      const newCats = [...prev.riskCategories];
      newCats.splice(index, 1);
      return { ...prev, riskCategories: newCats };
    });
  };

  if (!study || loading || !criteria) return <StudyLayout activeTab="risk-criteria" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}><div style={{padding:'20px'}}>Loading...</div></StudyLayout>;

  return (
    <StudyLayout activeTab="risk-criteria" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="risk-container">
        <div className="risk-header">
          <h2>RISK CRITERIA & MATRIX</h2>
          <button className="btn-primary" onClick={handleSave}>SAVE CRITERIA</button>
        </div>

        <div className="risk-content">
          
          <div className="risk-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Consequence Categories (Severity Definitions)</h3>
              {canEdit && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={addSeverityLevel} style={{ padding: '5px 10px', fontSize: '12px' }}>+ ADD ROW</button>
                  <button className="btn-secondary" onClick={removeSeverityLevel} style={{ padding: '5px 10px', fontSize: '12px', color: 'red' }}>- REMOVE LAST</button>
                </div>
              )}
            </div>
            <div className="table-responsive">
              <table className="criteria-table">
                <thead>
                  <tr>
                    <th>Severity Level</th>
                    <th>Name</th>
                    {criteria.consequenceCategories.map(cat => (
                      <th key={cat}>{cat}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.severityLevels.map(s => (
                    <tr key={s.level}>
                      <td className="level-col">{s.level}</td>
                      <td>
                        <input disabled={!canEdit}  data-gramm="false" spellcheck="false" className="w-full" value={s.name} onChange={e => {
                          const newSev = [...criteria.severityLevels];
                          newSev.find(x => x.level === s.level).name = e.target.value;
                          setCriteria({...criteria, severityLevels: newSev});
                        }} />
                      </td>
                      {criteria.consequenceCategories.map(cat => (
                        <td key={cat}>
                          <textarea disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                            className="w-full"
                            rows="2"
                            value={(s.consequences && s.consequences[cat]) || ''} 
                            onChange={e => handleConsequenceChange(s.level, cat, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="risk-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Likelihood Definitions</h3>
              {canEdit && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={addLikelihoodLevel} style={{ padding: '5px 10px', fontSize: '12px' }}>+ ADD ROW</button>
                  <button className="btn-secondary" onClick={removeLikelihoodLevel} style={{ padding: '5px 10px', fontSize: '12px', color: 'red' }}>- REMOVE LAST</button>
                </div>
              )}
            </div>
            <div className="table-responsive">
              <table className="criteria-table">
                <thead>
                  <tr>
                    <th>Likelihood Level</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.likelihoodLevels.map(l => (
                    <tr key={l.level}>
                      <td className="level-col">{l.level}</td>
                      <td>
                        <input disabled={!canEdit}  data-gramm="false" spellcheck="false" className="w-full" value={l.name} onChange={e => handleLikelihoodChange(l.level, 'name', e.target.value)} />
                      </td>
                      <td>
                        <textarea disabled={!canEdit}  data-gramm="false" spellcheck="false" className="w-full" rows="2" value={l.description} onChange={e => handleLikelihoodChange(l.level, 'description', e.target.value)} />
                      </td>
                      <td>
                        <input disabled={!canEdit}  data-gramm="false" spellcheck="false" className="w-full" value={l.frequency} onChange={e => handleLikelihoodChange(l.level, 'frequency', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="risk-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3>Risk Categories (Colors)</h3>
              {canEdit && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={addRiskCategory} style={{ padding: '5px 10px', fontSize: '12px' }}>+ ADD CATEGORY</button>
                </div>
              )}
            </div>
            <div className="category-cards">
              {criteria.riskCategories.map((cat, i) => (
                <div key={i} className="category-card" style={{borderLeft: `5px solid ${cat.color}`, position: 'relative'}}>
                  <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                    value={cat.name} 
                    onChange={e => {
                      const newCats = [...criteria.riskCategories];
                      newCats[i].name = e.target.value;
                      setCriteria({...criteria, riskCategories: newCats});
                    }}
                  />
                  <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                    type="color" 
                    value={cat.color} 
                    onChange={e => {
                      const newCats = [...criteria.riskCategories];
                      newCats[i].color = e.target.value;
                      setCriteria({...criteria, riskCategories: newCats});
                    }}
                  />
                  {canEdit && criteria.riskCategories.length > 1 && (
                    <button 
                      onClick={() => removeRiskCategory(i)}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px' }}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="risk-section matrix-wrapper">
            <h3>Risk Matrix (Severity x Likelihood)</h3>
            <table className="risk-matrix-table">
              <thead>
                <tr>
                  <th colSpan="2" rowSpan="2"></th>
                  <th colSpan={criteria.severityLevels.length}>SEVERITY</th>
                </tr>
                <tr>
                  {criteria.severityLevels.map(s => (
                    <th key={s.level}>{s.name} ({s.level})</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.likelihoodLevels.map((l, i) => (
                  <tr key={l.level}>
                    {i === 0 && <th rowSpan={criteria.likelihoodLevels.length} className="likelihood-header">LIKELIHOOD</th>}
                    <th>{l.name} ({l.level})</th>
                    {criteria.severityLevels.map(s => {
                      const cell = criteria.matrixCells.find(c => c.severityLevel === s.level && c.likelihoodLevel === l.level) || {};
                      const categoryData = criteria.riskCategories.find(c => c.name === cell.category);
                      const bgColor = categoryData ? categoryData.color : '#ffffff';
                      
                      return (
                        <td key={s.level} style={{ backgroundColor: bgColor }}>
                          <div className="matrix-cell">
                            <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                              type="number" 
                              value={cell.score || ''} 
                              onChange={e => handleMatrixCellChange(s.level, l.level, 'score', parseInt(e.target.value) || 0)}
                              className="cell-score"
                            />
                            <select disabled={!canEdit}  
                              value={cell.category || ''} 
                              onChange={e => handleMatrixCellChange(s.level, l.level, 'category', e.target.value)}
                              className="cell-category"
                            >
                              {criteria.riskCategories.map(cat => (
                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
};

export default RiskRegistry;
