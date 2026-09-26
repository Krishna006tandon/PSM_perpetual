import React, { useState, useEffect } from 'react';
import './StudyOverview.css';
import StudyLayout from '../components/StudyLayout';

const StudyOverview = ({ study, onBack, onNavigate, theme, toggleTheme, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (study) {
      setFormData({
        studyName: study.studyName || '',
        projectName: study.projectName || '',
        clientName: study.clientName || '',
        facilitator: study.facilitator || '',
        siteLocation: study.siteLocation || '',
        plantUnit: study.plantUnit || '',
        businessUnit: study.businessUnit || ''
      });
    }
  }, [study]);

  if (!study) return null;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedStudy = await response.json();
        setIsEditing(false);
        if (onUpdate) {
          onUpdate(updatedStudy);
        }
      } else {
        console.error('Failed to update study');
        alert('Failed to save changes.');
      }
    } catch (error) {
      console.error('Error saving study:', error);
      alert('Error saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      studyName: study.studyName || '',
      projectName: study.projectName || '',
      clientName: study.clientName || '',
      facilitator: study.facilitator || '',
      siteLocation: study.siteLocation || '',
      plantUnit: study.plantUnit || '',
      businessUnit: study.businessUnit || ''
    });
    setIsEditing(false);
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}/full-export-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch export data');
      const data = await res.json();

      let csv = "NODE,SR.,DEVIATION (PARAM),DEVIATION (MATERIAL),DEVIATION (EQUIPMENT),DEVIATION (INSTRUMENT),DEVIATION,CAUSE,CONSEQUENCE (IMMEDIATE),CONSEQUENCE (ULTIMATE),CAT,INHERENT RISK S,INHERENT RISK L,INHERENT RISK RR,PRESENT/PLANNED PROTECTION,MITIGATED RISK S,MITIGATED RISK L,MITIGATED RISK RR,ADDITIONAL PROTECTION (REC),RESIDUAL RISK S,RESIDUAL RISK L,RESIDUAL RISK RR,REMARKS,STATUS\n";
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;

      let devCounter = 0;
      let lastDevId = null;

      (data.scenarios || []).forEach((sc, idx) => {
        const curDevId = sc.deviationId?._id ? String(sc.deviationId._id) : (sc.deviationId ? String(sc.deviationId) : null);
        if (!lastDevId || curDevId !== lastDevId) {
          devCounter++;
          lastDevId = curDevId;
        }

        csv += [
          escape(sc.nodeId?.description || 'Node'),
          escape(devCounter),
          escape(sc.deviationId?.parameter),
          escape(sc.deviationId?.processFlowMaterial),
          escape(sc.deviationId?.locationFrom),
          escape(sc.deviationId?.locationTo),
          escape(sc.deviationId?.deviationAuto),
          escape(sc.causeId?.description),
          escape(sc.consequencesImmediate),
          escape(sc.consequencesUltimate),
          escape(sc.consequenceCategory),
          escape(sc.inherentRiskS),
          escape(sc.inherentRiskL),
          escape(sc.inherentRiskRR),
          escape(sc.presentProtection),
          escape(sc.mitigatedRiskS),
          escape(sc.mitigatedRiskL),
          escape(sc.mitigatedRiskRR),
          escape(sc.additionalProtection),
          escape(sc.residualRiskS),
          escape(sc.residualRiskL),
          escape(sc.residualRiskRR),
          escape(sc.remarks),
          escape(sc.status)
        ].join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Full_Study_${(study.studyName || 'PHA').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV: ' + err.message);
    }
  };

  const handleFullExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}/full-export-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch full study data');
      const data = await res.json();

      const riskCriteria = data.riskCriteria;
      const getRiskColor = (s, l) => {
        if (!s || !l || !riskCriteria) return 'transparent';
        const cell = riskCriteria.matrixCells?.find(c => String(c.severityLevel) === String(s) && String(c.likelihoodLevel) === String(l));
        if (!cell) return 'transparent';
        const cat = riskCriteria.riskCategories?.find(c => c.name === cell.category);
        return cat ? cat.color : 'transparent';
      };

      let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Full PHA Report</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 6px; font-size: 11px; }
            td { border: 1px solid #cbd5e1; padding: 5px; font-size: 11px; vertical-align: top; }
            .section-header { background-color: #0369a1; color: #ffffff; font-size: 13px; font-weight: bold; }
            .node-header { background-color: #e2e8f0; color: #0f172a; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>PROCESS HAZARD ANALYSIS (PHA) STUDY REPORT</h2>
          <table border="1" style="margin-bottom: 20px;">
            <tr><th colspan="2" class="section-header">1. STUDY INFORMATION</th></tr>
            <tr><td><b>Study Name:</b></td><td>${data.study?.studyName || ''}</td></tr>
            <tr><td><b>Project Name:</b></td><td>${data.study?.projectName || ''}</td></tr>
            <tr><td><b>Client Name:</b></td><td>${data.study?.clientName || ''}</td></tr>
            <tr><td><b>Facilitator:</b></td><td>${data.study?.facilitator || ''}</td></tr>
            <tr><td><b>Facility / Location:</b></td><td>${data.study?.facilityName || data.study?.siteLocation || ''}</td></tr>
            <tr><td><b>Plant / Unit:</b></td><td>${data.study?.plantUnit || ''}</td></tr>
            <tr><td><b>Created Date:</b></td><td>${data.study?.createdAt ? new Date(data.study.createdAt).toLocaleDateString() : ''}</td></tr>
          </table>

          <table border="1" style="margin-bottom: 20px;">
            <thead>
              <tr><th colspan="4" class="section-header">2. TEAM MEMBERS</th></tr>
              <tr><th>NAME</th><th>TITLE</th><th>DEPARTMENT</th><th>EXPERTISE</th></tr>
            </thead>
            <tbody>
              ${(data.teamMembers || []).map(t => `
                <tr>
                  <td>${t.name || t.fullName || ''}</td>
                  <td>${t.title || ''}</td>
                  <td>${t.department || ''}</td>
                  <td>${t.expertise || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table border="1" style="margin-bottom: 20px;">
            <thead>
              <tr><th colspan="4" class="section-header">3. STUDY NODES</th></tr>
              <tr><th>NODE #</th><th>TITLE / DESCRIPTION</th><th>DESIGN INTENTION</th><th>BOUNDARY</th></tr>
            </thead>
            <tbody>
              ${(data.nodes || []).map((n, i) => `
                <tr>
                  <td align="center"><b>${n.nodeNumber || i + 1}</b></td>
                  <td><b>${n.description || ''}</b></td>
                  <td>${n.intention || ''}</td>
                  <td>${n.boundary || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table border="1" style="margin-bottom: 20px;">
            <thead>
              <tr><th colspan="17" class="section-header">4. PHA WORKSHEET (ALL NODES)</th></tr>
              <tr>
                <th rowspan="2">#</th>
                <th rowspan="2">DEVIATION</th>
                <th rowspan="2">CAUSE</th>
                <th rowspan="2">CONSEQUENCES</th>
                <th rowspan="2">CAT</th>
                <th colspan="3">INHERENT RISK</th>
                <th rowspan="2">PRESENT PROTECTION (SAFEGUARDS)</th>
                <th colspan="3">MITIGATED RISK</th>
                <th rowspan="2">ADDITIONAL PROTECTION (RECOMMENDATIONS)</th>
                <th colspan="3">RESIDUAL RISK</th>
                <th rowspan="2">STATUS</th>
              </tr>
              <tr>
                <th>S</th><th>L</th><th>RR</th>
                <th>S</th><th>L</th><th>RR</th>
                <th>S</th><th>L</th><th>RR</th>
              </tr>
            </thead>
            <tbody>
      `;

      let lastNodeId = null;
      let devCounter = 0;
      let lastDevId = null;

      (data.scenarios || []).forEach((sc, idx) => {
        const nodeDesc = sc.nodeId?.description || 'General Node';
        if (sc.nodeId?._id !== lastNodeId) {
          lastNodeId = sc.nodeId?._id;
          tableHtml += `
            <tr class="node-header">
              <td colspan="17">📁 NODE: ${nodeDesc}</td>
            </tr>
          `;
        }

        const curDevId = sc.deviationId?._id ? String(sc.deviationId._id) : (sc.deviationId ? String(sc.deviationId) : null);
        if (!lastDevId || curDevId !== lastDevId) {
          devCounter++;
          lastDevId = curDevId;
        }

        const irColor = getRiskColor(sc.inherentRiskS, sc.inherentRiskL);
        const mrColor = getRiskColor(sc.mitigatedRiskS, sc.mitigatedRiskL);
        const rrColor = getRiskColor(sc.residualRiskS, sc.residualRiskL);

        const cons = [sc.consequencesImmediate, sc.consequencesUltimate].filter(Boolean).join('<br/>');

        tableHtml += `
          <tr>
            <td align="center">${devCounter}</td>
            <td>${sc.deviationId?.deviationAuto || ''}</td>
            <td>${sc.causeId?.description || ''}</td>
            <td>${cons}</td>
            <td align="center">${sc.consequenceCategory || ''}</td>
            <td align="center"><b>${sc.inherentRiskS || ''}</b></td>
            <td align="center"><b>${sc.inherentRiskL || ''}</b></td>
            <td align="center" style="background-color: ${irColor}; font-weight: bold; color: ${irColor !== 'transparent' ? '#000' : 'inherit'}">${sc.inherentRiskRR || ''}</td>
            <td>${sc.presentProtection || ''}</td>
            <td align="center"><b>${sc.mitigatedRiskS || ''}</b></td>
            <td align="center"><b>${sc.mitigatedRiskL || ''}</b></td>
            <td align="center" style="background-color: ${mrColor}; font-weight: bold; color: ${mrColor !== 'transparent' ? '#000' : 'inherit'}">${sc.mitigatedRiskRR || ''}</td>
            <td>${sc.additionalProtection || ''}</td>
            <td align="center"><b>${sc.residualRiskS || ''}</b></td>
            <td align="center"><b>${sc.residualRiskL || ''}</b></td>
            <td align="center" style="background-color: ${rrColor}; font-weight: bold; color: ${rrColor !== 'transparent' ? '#000' : 'inherit'}">${sc.residualRiskRR || ''}</td>
            <td>${sc.status || ''}</td>
          </tr>
        `;
      });

      // Recommendations Section in Excel
      const recs = (data.scenarios || []).filter(s => s.additionalProtection && s.additionalProtection.trim() !== '');
      tableHtml += `
            </tbody>
          </table>

          <table border="1">
            <thead>
              <tr><th colspan="6" class="section-header">5. RECOMMENDATIONS SUMMARY</th></tr>
              <tr><th>#</th><th>RECOMMENDATION STATEMENT</th><th>NODE</th><th>DEVIATION</th><th>CAUSE</th><th>CONSEQUENCE</th></tr>
            </thead>
            <tbody>
      `;

      recs.forEach((r, rIdx) => {
        tableHtml += `
          <tr>
            <td align="center"><b>${r.recommendationNo || `R${rIdx + 1}`}</b></td>
            <td>${r.additionalProtection}</td>
            <td>${r.nodeId?.description || ''}</td>
            <td>${r.deviationId?.deviationAuto || ''}</td>
            <td>${r.causeId?.description || ''}</td>
            <td>${r.consequencesImmediate || ''}</td>
          </tr>
        `;
      });

      tableHtml += `</tbody></table></body></html>`;

      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Full_Study_${(study.studyName || 'PHA').replace(/[^a-zA-Z0-9_-]/g, '_')}.xls`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Error generating full export: ' + err.message);
    }
  };

  return (
    <StudyLayout activeTab="overview" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="overview-container">
        <div className="content-header">
          <h2>STUDY OVERVIEW</h2>
          <div className="export-buttons">
            <button className="theme-toggle" onClick={toggleTheme} style={{ padding: '10px 20px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', backgroundColor: 'var(--bg-paper)', color: 'var(--text-primary)', border: '1px solid var(--divider)' }}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button 
              className="btn-export save" 
              onClick={handleSave} 
              disabled={isSaving}
              style={{
                backgroundColor: isSaving ? '#94a3b8' : '#0ea5e9',
                cursor: isSaving ? 'wait' : 'pointer'
              }}
            >
              {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            <button className="btn-export csv" onClick={handleExportCSV}>EXPORT CSV</button>
            <button className="btn-export json" onClick={handleFullExport}>FULL EXPORT</button>
          </div>
        </div>

        <div className="study-details-card">


          <div className="detail-row">
            <span className="detail-label">STUDY NAME</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="studyName" 
              className="detail-value-input" 
              value={formData.studyName} 
              onChange={handleInputChange} 
              placeholder="Study Name"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">PROJECT NAME</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="projectName" 
              className="detail-value-input" 
              value={formData.projectName} 
              onChange={handleInputChange} 
              placeholder="Project Name"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">CLIENT NAME</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="clientName" 
              className="detail-value-input" 
              value={formData.clientName} 
              onChange={handleInputChange} 
              placeholder="Client Name"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">FACILITATOR</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="facilitator" 
              className="detail-value-input" 
              value={formData.facilitator} 
              onChange={handleInputChange} 
              placeholder="Facilitator"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">SITE / LOCATION</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="siteLocation" 
              className="detail-value-input" 
              value={formData.siteLocation} 
              onChange={handleInputChange} 
              placeholder="Site / Location"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">PLANT / UNIT</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="plantUnit" 
              className="detail-value-input" 
              value={formData.plantUnit} 
              onChange={handleInputChange} 
              placeholder="Plant / Unit"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">BUSINESS UNIT</span>
            <input data-gramm="false" spellCheck={true} 
              type="text" 
              name="businessUnit" 
              className="detail-value-input" 
              value={formData.businessUnit} 
              onChange={handleInputChange} 
              placeholder="Business Unit"
            />
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon nodes-icon">📋</div>
            <div className="stat-info">
              <span className="stat-value">12</span>
              <span className="stat-label">TOTAL NODES</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon scenarios-icon">⚡</div>
            <div className="stat-info">
              <span className="stat-value">45</span>
              <span className="stat-label">TOTAL SCENARIOS</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon recs-icon">🎯</div>
            <div className="stat-info">
              <span className="stat-value">8</span>
              <span className="stat-label">RECOMMENDATIONS</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon drawings-icon">📐</div>
            <div className="stat-info">
              <span className="stat-value">3</span>
              <span className="stat-label">DRAWINGS</span>
            </div>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
};

export default StudyOverview;
