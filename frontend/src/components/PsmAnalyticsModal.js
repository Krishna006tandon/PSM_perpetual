import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import { printElementIsolated } from '../utils/printHelper';
import './PsmAnalyticsModal.css';

const API_URL = getApiUrl();

const escapeCsvCell = (val) => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export default function PsmAnalyticsModal({ isOpen, onClose }) {
  const printContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filters
  const [plantZone, setPlantZone] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Exposure Hours Calculator for API RP 754 PSER
  const [exposureHours, setExposureHours] = useState(1000000);
  const [rateBasis, setRateBasis] = useState(200000);

  const loadAnalytics = useCallback(async (zoneVal = plantZone, fromVal = startDate, toVal = endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (zoneVal && zoneVal !== 'all') params.append('plantZone', zoneVal);
      if (fromVal) params.append('startDate', fromVal);
      if (toVal) params.append('endDate', toVal);

      const token = localStorage.getItem('token');
      const json = await safeFetchJson(
        `${API_URL}/api/incidents/analytics?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to load PSM analytics.');
    } finally {
      setLoading(false);
    }
  }, [plantZone, startDate, endDate]);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics(plantZone, startDate, endDate);
    }
  }, [isOpen, loadAnalytics, plantZone, startDate, endDate]);

  if (!isOpen) return null;

  const summary = data?.summary || {
    totalIncidents: 0,
    tier1Count: 0,
    tier2Count: 0,
    tier3Count: 0,
    tier4Count: 0,
    nearMissCount: 0,
    otherIncidentCount: 0,
    pendingClassificationCount: 0,
    totalTier1SeverityPoints: 0,
    totalLopcKg: 0,
    totalDirectCostUSD: 0,
    closedCount: 0,
    activeCount: 0,
    overdueTriageCount: 0,
    phaRevalidationPendingCount: 0
  };

  const hoursNum = Math.max(Number(exposureHours) || 0, 0);
  const basisNum = Number(rateBasis) || 200000;
  const calcRate = (numerator) => {
    if (!hoursNum) return '0.00';
    return ((numerator * basisNum) / hoursNum).toFixed(2);
  };

  const handleExportWorkbook = () => {
    if (!data?.exportDataset) return;
    const wb = XLSX.utils.book_new();

    const s1 = XLSX.utils.json_to_sheet(
      data.exportDataset.incidents.length > 0
        ? data.exportDataset.incidents
        : [{ Note: 'No incidents in current filter range' }]
    );
    XLSX.utils.book_append_sheet(wb, s1, 'API 754 Register');

    const s2 = XLSX.utils.json_to_sheet(
      data.exportDataset.capas.length > 0
        ? data.exportDataset.capas
        : [{ Note: 'No CAPA items in current filter range' }]
    );
    XLSX.utils.book_append_sheet(wb, s2, 'CAPA Tracker');

    const s3 = XLSX.utils.json_to_sheet(
      data.exportDataset.rootCauses.length > 0
        ? data.exportDataset.rootCauses
        : [{ Note: 'No finalized root causes yet' }]
    );
    XLSX.utils.book_append_sheet(wb, s3, 'Root Causes');

    const s4 = XLSX.utils.json_to_sheet(
      data.exportDataset.barriers.length > 0
        ? data.exportDataset.barriers
        : [{ Note: 'No barrier evaluations recorded yet' }]
    );
    XLSX.utils.book_append_sheet(wb, s4, 'LOPA Barriers');

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `API754_PSM_Analytics_${stamp}.xlsx`);
  };

  const handleExportIncidentCsv = () => {
    const rows = data?.exportDataset?.incidents || [];
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(','))
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `API754_Incidents_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tierBars = [
    { label: 'Tier 1 PSE (Major)', count: summary.tier1Count, color: '#dc2626' },
    { label: 'Tier 2 PSE (Lesser)', count: summary.tier2Count, color: '#ea580c' },
    { label: 'Tier 3 Indicators', count: summary.tier3Count, color: '#d97706' },
    { label: 'Tier 4 Indicators', count: summary.tier4Count, color: '#7c3aed' },
    { label: 'Near Miss', count: summary.nearMissCount, color: '#0284c7' },
    { label: 'Other Incident', count: summary.otherIncidentCount, color: '#64748b' },
    { label: 'Pending Classification', count: summary.pendingClassificationCount, color: '#ca8a04' }
  ];
  const maxTierCount = Math.max(1, ...tierBars.map((t) => t.count));

  const monthlyTrend = data?.monthlyTrend || [];
  const maxMonthlyTotal = Math.max(1, ...monthlyTrend.map((m) => m.total));

  const rootCauseCats = data?.rootCausePareto?.byApi754Category || [];
  const maxRcCount = Math.max(1, ...rootCauseCats.map((r) => r.count));

  const barrierPerf = (data?.barrierPerformance || []).slice(0, 8);
  const capaRollup = data?.capaRollup || {
    totalCapas: 0,
    verifiedClosed: 0,
    openCount: 0,
    pendingVerificationCount: 0,
    overdueCount: 0,
    mocLinkedCount: 0,
    closureRate: 0,
    byDepartment: []
  };

  return (
    <div className="pa-modal-overlay">
      <div className="pa-modal-container" ref={printContainerRef}>
        {/* Header */}
        <div className="pa-header">
          <div>
            <span className="pa-eyebrow">Stage 5 — Plant-Wide API RP 754 KPI Analytics & Regulatory Export</span>
            <h2 className="pa-title">Process Safety Event Metrics, PSER Calculator & Audit Export</h2>
            <div className="pa-sub">
              Cross-unit lagging & leading indicators, causal factor Pareto, LOPA barrier reliability & CAPA SLA compliance
            </div>
          </div>
          <div className="pa-header-actions pa-no-print">
            <button type="button" className="pa-btn-export" disabled={!data} onClick={handleExportWorkbook}>
              📥 Export Excel (.xlsx)
            </button>
            <button type="button" className="pa-btn-export-alt" disabled={!data} onClick={handleExportIncidentCsv}>
              📄 Export CSV
            </button>
            <button
              type="button"
              className="pa-btn-export-alt"
              onClick={() =>
                printElementIsolated(
                  printContainerRef.current,
                  'API RP 754 Process Safety Analytics Dashboard'
                )
              }
            >
              🖨️ Print Dashboard
            </button>
            <button type="button" className="pa-btn-close" onClick={onClose}>
              ✖ Close
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="pa-filter-bar pa-no-print">
          <div className="pa-filter-group">
            <div>
              <span className="pa-label">Plant Zone / Unit</span>
              <select
                className="pa-select"
                value={plantZone}
                onChange={(e) => setPlantZone(e.target.value)}
              >
                <option value="all">All Plant Zones</option>
                {(data?.availableZones || []).map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="pa-label">From Date</span>
              <input
                type="date"
                className="pa-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <span className="pa-label">To Date</span>
              <input
                type="date"
                className="pa-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="pa-btn-primary"
              onClick={() => loadAnalytics(plantZone, startDate, endDate)}
            >
              🔄 Refresh Analytics
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
            Showing <strong>{summary.totalIncidents}</strong> incident(s) •{' '}
            <strong>{capaRollup.totalCapas}</strong> CAPA(s) •{' '}
            <strong>{data?.rootCausePareto?.totalRootCauses || 0}</strong> verified root causes
          </div>
        </div>

        <div className="pa-body">
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontWeight: 700 }}>
              {error}
            </div>
          )}
          {loading && <div className="pa-card">Loading Plant-Wide PSM Analytics...</div>}

          {/* API RP 754 Exposure Hours & PSER Calculator */}
          <div className="pa-rate-box">
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 800, color: '#0c4a6e' }}>
                API RP 754 Frequency Rate (PSER) Calculator
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span className="pa-label">Total Exposure Hours</span>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    className="pa-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={exposureHours}
                    onChange={(e) => setExposureHours(e.target.value)}
                  />
                </div>
                <div>
                  <span className="pa-label">Rate Denominator Basis</span>
                  <select
                    className="pa-select"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={rateBasis}
                    onChange={(e) => setRateBasis(Number(e.target.value))}
                  >
                    <option value={200000}>Per 200,000 hrs (API / OSHA)</option>
                    <option value={1000000}>Per 1,000,000 hrs (IOGP)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pa-rate-metrics">
              <div className="pa-rate-pill">
                <div className="pa-kpi-label">Tier 1 PSER</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>
                  {calcRate(summary.tier1Count)}
                </div>
                <div className="pa-kpi-sub">{summary.tier1Count} Tier 1 events</div>
              </div>
              <div className="pa-rate-pill">
                <div className="pa-kpi-label">Tier 2 PSER</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ea580c' }}>
                  {calcRate(summary.tier2Count)}
                </div>
                <div className="pa-kpi-sub">{summary.tier2Count} Tier 2 events</div>
              </div>
              <div className="pa-rate-pill">
                <div className="pa-kpi-label">Tier 1+2 Combined PSER</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0369a1' }}>
                  {calcRate(summary.tier1Count + summary.tier2Count)}
                </div>
                <div className="pa-kpi-sub">Total PSE rate</div>
              </div>
              <div className="pa-rate-pill">
                <div className="pa-kpi-label">Tier 1 Severity Rate</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7c3aed' }}>
                  {calcRate(summary.totalTier1SeverityPoints)}
                </div>
                <div className="pa-kpi-sub">{summary.totalTier1SeverityPoints} total severity pts</div>
              </div>
            </div>
          </div>

          {/* Top Executive KPI Cards */}
          <div className="pa-kpi-grid">
            <div className="pa-kpi-card">
              <div className="pa-kpi-label">Total Logged Events</div>
              <div className="pa-kpi-value">{summary.totalIncidents}</div>
              <div className="pa-kpi-sub">{summary.closedCount} Closed • {summary.activeCount} Active</div>
            </div>
            <div className="pa-kpi-card tier1">
              <div className="pa-kpi-label">Cumulative LOPC Mass</div>
              <div className="pa-kpi-value">{summary.totalLopcKg.toLocaleString()} kg</div>
              <div className="pa-kpi-sub">Verified 1-hr release total</div>
            </div>
            <div className="pa-kpi-card cost">
              <div className="pa-kpi-label">Fire / Damage Direct Cost</div>
              <div className="pa-kpi-value">${summary.totalDirectCostUSD.toLocaleString()}</div>
              <div className="pa-kpi-sub">Reported USD asset impact</div>
            </div>
            <div className="pa-kpi-card capa">
              <div className="pa-kpi-label">CAPA Closure Rate</div>
              <div className="pa-kpi-value">{capaRollup.closureRate}%</div>
              <div className="pa-kpi-sub">
                {capaRollup.verifiedClosed}/{capaRollup.totalCapas} verified • {capaRollup.overdueCount} overdue
              </div>
            </div>
            <div className="pa-kpi-card tier2">
              <div className="pa-kpi-label">MOC-Linked CAPAs</div>
              <div className="pa-kpi-value">{capaRollup.mocLinkedCount}</div>
              <div className="pa-kpi-sub">{summary.phaRevalidationPendingCount} PHA revalidations pending</div>
            </div>
          </div>

          {/* Row 1 Charts: Tier Pyramid & Monthly Trend */}
          <div className="pa-grid-2">
            <div className="pa-card">
              <h3>API RP 754 Classification Distribution</h3>
              <div className="pa-bar-list">
                {tierBars.map((tb) => (
                  <div key={tb.label} className="pa-bar-row">
                    <div className="pa-bar-head">
                      <span>{tb.label}</span>
                      <span>{tb.count}</span>
                    </div>
                    <div className="pa-bar-track">
                      <div
                        className="pa-bar-fill"
                        style={{
                          width: `${Math.round((tb.count / maxTierCount) * 100)}%`,
                          background: tb.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pa-card">
              <h3>Monthly Incident Trend (SVG Stacked View)</h3>
              {monthlyTrend.length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                  No incident timeline data in selected range.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <svg
                    width={Math.max(460, monthlyTrend.length * 68)}
                    height="210"
                    viewBox={`0 0 ${Math.max(460, monthlyTrend.length * 68)} 210`}
                  >
                    {monthlyTrend.map((m, idx) => {
                      const x = 24 + idx * 64;
                      const barW = 36;
                      const maxH = 140;
                      const t12H = ((m.tier1 + m.tier2) / maxMonthlyTotal) * maxH;
                      const leadH = ((m.tier3 + m.tier4) / maxMonthlyTotal) * maxH;
                      const nmH = ((m.nearMiss + m.other + m.pending) / maxMonthlyTotal) * maxH;
                      const baseLineY = 168;

                      return (
                        <g key={m.monthKey}>
                          <rect x={x} y={baseLineY - nmH} width={barW} height={nmH} fill="#0284c7" rx="2" />
                          <rect x={x} y={baseLineY - nmH - leadH} width={barW} height={leadH} fill="#f59e0b" rx="2" />
                          <rect x={x} y={baseLineY - nmH - leadH - t12H} width={barW} height={t12H} fill="#dc2626" rx="2" />
                          <text x={x + barW / 2} y={baseLineY - nmH - leadH - t12H - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a">
                            {m.total}
                          </text>
                          <text x={x + barW / 2} y={188} textAnchor="middle" fontSize="10" fontWeight="700" fill="#475569">
                            {m.label}
                          </text>
                        </g>
                      );
                    })}
                    <line x1="12" y1="168" x2={Math.max(448, monthlyTrend.length * 68 - 12)} y2="168" stroke="#cbd5e1" strokeWidth="1.5" />
                  </svg>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '4px' }}>
                    <span><span style={{ color: '#dc2626' }}>■</span> Tier 1/2 PSE</span>
                    <span><span style={{ color: '#f59e0b' }}>■</span> Tier 3/4 Leading</span>
                    <span><span style={{ color: '#0284c7' }}>■</span> Near Miss / Other / Pending</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Systemic Root Cause Pareto & Barrier Reliability */}
          <div className="pa-grid-2">
            <div className="pa-card">
              <h3>API RP 754 Causal Factor Pareto ({data?.rootCausePareto?.totalRootCauses || 0} Root Causes)</h3>
              {rootCauseCats.length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                  No verified root causes finalized in Stage 3A yet.
                </div>
              ) : (
                <div className="pa-bar-list">
                  {rootCauseCats.map((rc) => (
                    <div key={rc.name} className="pa-bar-row">
                      <div className="pa-bar-head">
                        <span>{rc.name}</span>
                        <span>{rc.count}</span>
                      </div>
                      <div className="pa-bar-track">
                        <div
                          className="pa-bar-fill"
                          style={{
                            width: `${Math.round((rc.count / maxRcCount) * 100)}%`,
                            background: '#312e81'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pa-card">
              <h3>LOPA Barrier Effectiveness Rollup (Top Challenged Layers)</h3>
              {barrierPerf.length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                  No Stage 3C barrier evaluations saved yet.
                </div>
              ) : (
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>Barrier Layer</th>
                      <th>Worked</th>
                      <th>Failed</th>
                      <th>Bypassed</th>
                      <th>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barrierPerf.map((b) => (
                      <tr key={b.layerName}>
                        <td><strong>{b.layerName}</strong></td>
                        <td style={{ color: '#16a34a', fontWeight: 800 }}>{b.worked}</td>
                        <td style={{ color: '#dc2626', fontWeight: 800 }}>{b.failed}</td>
                        <td style={{ color: '#ea580c', fontWeight: 800 }}>{b.bypassed}</td>
                        <td style={{ color: '#7c3aed', fontWeight: 800 }}>{b.missing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Row 3: Departmental CAPA Backlog & Plant Zone Breakdown */}
          <div className="pa-grid-2">
            <div className="pa-card">
              <h3>CAPA SLA & Backlog by Department</h3>
              {capaRollup.byDepartment.length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                  No CAPA actions created yet.
                </div>
              ) : (
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total</th>
                      <th>Open</th>
                      <th>Overdue</th>
                      <th>Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capaRollup.byDepartment.map((d) => (
                      <tr key={d.department}>
                        <td><strong>{d.department}</strong></td>
                        <td>{d.total}</td>
                        <td>{d.open}</td>
                        <td style={{ color: d.overdue > 0 ? '#dc2626' : '#475569', fontWeight: 800 }}>{d.overdue}</td>
                        <td style={{ color: '#16a34a', fontWeight: 800 }}>{d.closed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pa-card">
              <h3>Incidents & LOPC Mass by Plant Zone</h3>
              {(data?.zoneBreakdown || []).length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                  No incidents recorded for selected filter.
                </div>
              ) : (
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>Plant Zone</th>
                      <th>Total</th>
                      <th>Tier 1</th>
                      <th>Tier 2</th>
                      <th>Tier 3</th>
                      <th>LOPC (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.zoneBreakdown.map((z) => (
                      <tr key={z.plantZone}>
                        <td><strong>{z.plantZone}</strong></td>
                        <td>{z.total}</td>
                        <td style={{ color: '#dc2626', fontWeight: 800 }}>{z.tier1}</td>
                        <td style={{ color: '#ea580c', fontWeight: 800 }}>{z.tier2}</td>
                        <td>{z.tier3}</td>
                        <td>{Math.round(z.lopcKg * 100) / 100}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
