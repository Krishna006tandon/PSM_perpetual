const Incident = require('../models/Incident');
const WhyWhyNode = require('../models/WhyWhyNode');
const CAPA = require('../models/CAPA');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const normalizeCategoryBucket = (cat = '') => {
  if (cat === 'Tier 1 PSE' || cat === 'Tier 1') return 'tier1';
  if (cat === 'Tier 2 PSE' || cat === 'Tier 2') return 'tier2';
  if (cat === 'Tier 3 Indicator' || cat === 'Tier 3') return 'tier3';
  if (cat === 'Tier 4 Indicator' || cat === 'Tier 4') return 'tier4';
  if (cat === 'Near Miss') return 'nearMiss';
  if (cat === 'Other Incident') return 'other';
  if (cat === 'Pending Classification' || String(cat).includes('Pending')) return 'pending';
  return 'nearMiss';
};

// GET /api/incidents/analytics
exports.getPlantPsmAnalytics = async (req, res) => {
  try {
    const baseTenantFilter = {};
    if (req.user?.companyCode && req.user.role !== 'SuperAdmin') {
      baseTenantFilter.companyCode = req.user.companyCode;
    }

    const allCompanyIncidents = await Incident.find(baseTenantFilter, { plantZone: 1 });
    const availableZones = Array.from(
      new Set(allCompanyIncidents.map((i) => (i.plantZone || '').trim()).filter(Boolean))
    ).sort();

    const query = { ...baseTenantFilter };
    const { plantZone, startDate, endDate } = req.query;

    if (plantZone && plantZone !== 'all') {
      query.plantZone = plantZone;
    }

    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!Number.isNaN(s.getTime())) query.dateTime.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!Number.isNaN(e.getTime())) {
          e.setHours(23, 59, 59, 999);
          query.dateTime.$lte = e;
        }
      }
      if (Object.keys(query.dateTime).length === 0) delete query.dateTime;
    }

    const incidents = await Incident.find(query).sort({ dateTime: 1 });
    const incidentIds = incidents.map((i) => i._id);
    const incidentMap = new Map(incidents.map((i) => [String(i._id), i]));

    const [rootCauseNodes, capas] = incidentIds.length > 0
      ? await Promise.all([
          WhyWhyNode.find({ incidentId: { $in: incidentIds }, isRootCause: true }),
          CAPA.find({ incidentId: { $in: incidentIds } }).populate('mocReference.mocId', 'mocNumber status')
        ])
      : [[], []];

    const now = new Date();
    const summary = {
      totalIncidents: incidents.length,
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

    const monthlyMap = new Map();
    const zoneMap = new Map();
    const barrierMap = new Map();

    const incidentRows = [];
    const barrierRows = [];

    incidents.forEach((inc) => {
      const rawCat = inc.api754Classification?.category || inc.api754Classification?.tier || 'Near Miss';
      const bucket = normalizeCategoryBucket(rawCat);
      const sevPts = Number(inc.api754Classification?.tier1SeverityPoints || 0);
      const lopcKg = inc.isActualRelease === 'Yes' ? Number(inc.materialDetails?.quantityInOneHourKg || 0) : 0;
      const directCost = Number(inc.fireExplosionDetails?.directCostUSD || 0);

      if (bucket === 'tier1') summary.tier1Count++;
      else if (bucket === 'tier2') summary.tier2Count++;
      else if (bucket === 'tier3') summary.tier3Count++;
      else if (bucket === 'tier4') summary.tier4Count++;
      else if (bucket === 'nearMiss') summary.nearMissCount++;
      else if (bucket === 'other') summary.otherIncidentCount++;
      else summary.pendingClassificationCount++;

      summary.totalTier1SeverityPoints += sevPts;
      summary.totalLopcKg += lopcKg;
      summary.totalDirectCostUSD += directCost;

      if (inc.status === 'Closed' || inc.status === 'Administratively Closed') {
        summary.closedCount++;
      } else {
        summary.activeCount++;
      }

      if (inc.triage?.status === 'Pending' && inc.managerReviewDeadline && now > new Date(inc.managerReviewDeadline)) {
        summary.overdueTriageCount++;
      }

      if (inc.phaBowTieLink?.phaRevalidationRequired && inc.phaBowTieLink?.revalidationStatus !== 'Completed') {
        summary.phaRevalidationPendingCount++;
      }

      // Monthly bucket
      const dt = new Date(inc.dateTime || inc.createdAt || now);
      const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          label: monthLabel,
          tier1: 0,
          tier2: 0,
          tier3: 0,
          tier4: 0,
          nearMiss: 0,
          other: 0,
          pending: 0,
          total: 0
        });
      }
      const mEntry = monthlyMap.get(monthKey);
      mEntry[bucket]++;
      mEntry.total++;

      // Zone bucket
      const zone = inc.plantZone || 'Unspecified';
      if (!zoneMap.has(zone)) {
        zoneMap.set(zone, { plantZone: zone, total: 0, tier1: 0, tier2: 0, tier3: 0, nearMiss: 0, lopcKg: 0 });
      }
      const zEntry = zoneMap.get(zone);
      zEntry.total++;
      if (bucket === 'tier1') zEntry.tier1++;
      if (bucket === 'tier2') zEntry.tier2++;
      if (bucket === 'tier3') zEntry.tier3++;
      if (bucket === 'nearMiss') zEntry.nearMiss++;
      zEntry.lopcKg += lopcKg;

      // Barrier performance aggregation
      (inc.barrierAnalysis || []).forEach((b) => {
        const layerName = b.layerName || 'Unnamed Barrier';
        if (!barrierMap.has(layerName)) {
          barrierMap.set(layerName, {
            layerName,
            barrierType: b.barrierType || 'Prevention',
            worked: 0,
            failed: 0,
            bypassed: 0,
            missing: 0,
            notApplicable: 0
          });
        }
        const br = barrierMap.get(layerName);
        if (b.status === 'Worked as Intended') br.worked++;
        else if (b.status === 'Failed / Degraded') br.failed++;
        else if (b.status === 'Bypassed / Defeated') br.bypassed++;
        else if (b.status === 'Missing / Not Installed') br.missing++;
        else br.notApplicable++;

        barrierRows.push({
          incidentNumber: inc.incidentNumber,
          plantZone: inc.plantZone || '',
          layerName,
          barrierType: b.barrierType || '',
          safeguardTag: b.safeguardTag || '',
          status: b.status || '',
          failureReason: b.failureReason || ''
        });
      });

      const evidenceList = inc.supportingEvidence || [];
      const appEv = evidenceList.filter((e) => e.isApplicable && e.status !== 'Not Applicable');
      const upEv = appEv.filter((e) => e.status === 'Uploaded / Attached' || e.fileUrl);

      incidentRows.push({
        incidentNumber: inc.incidentNumber,
        title: inc.title,
        dateTime: dt.toISOString(),
        plantZone: zone,
        equipmentTag: inc.equipmentTag || '',
        api754Category: rawCat,
        tier1SeverityPoints: sevPts,
        actualRelease: inc.isActualRelease || 'No',
        chemicalTRC: inc.materialDetails?.chemicalTRC || 'N/A',
        lopcQuantityKgHr: lopcKg,
        directCostUSD: directCost,
        status: inc.status,
        triageStatus: inc.triage?.status || 'Pending',
        cftLeader: inc.cft?.leader?.name || '',
        evidenceUploaded: `${upEv.length}/${appEv.length}`,
        phaRevalidationStatus: inc.phaBowTieLink?.revalidationStatus || 'Not Required',
        closedAt: inc.closureGovernance?.closedAt ? new Date(inc.closureGovernance.closedAt).toISOString() : ''
      });
    });

    // Root Cause Pareto
    const rcTypeMap = new Map();
    const apiCatMap = new Map();
    const rootCauseRows = [];

    rootCauseNodes.forEach((node) => {
      const parentInc = incidentMap.get(String(node.incidentId));
      const rcType = node.rootCauseType || 'Unclassified';
      const apiCat = node.api754Category || 'Uncategorized';

      rcTypeMap.set(rcType, (rcTypeMap.get(rcType) || 0) + 1);
      apiCatMap.set(apiCat, (apiCatMap.get(apiCat) || 0) + 1);

      rootCauseRows.push({
        incidentNumber: parentInc?.incidentNumber || '',
        plantZone: parentInc?.plantZone || '',
        whyLevel: node.whyLevel,
        rootCauseType: rcType,
        api754Category: apiCat,
        api754Subcategory: node.api754Subcategory || '',
        statement: node.statement
      });
    });

    const byRootCauseType = Array.from(rcTypeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const byApi754Category = Array.from(apiCatMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // CAPA Rollup & Department SLA
    const deptMap = new Map();
    let verifiedClosed = 0;
    let openCount = 0;
    let pendingVerificationCount = 0;
    let overdueCount = 0;
    let mocLinkedCount = 0;
    const capaRows = [];

    capas.forEach((c) => {
      const parentInc = incidentMap.get(String(c.incidentId));
      const isClosed = c.status === 'Verified & Closed';
      const isOverdue = !isClosed && c.targetDate && now > new Date(c.targetDate);
      const dept = c.department || 'Unassigned';

      if (isClosed) verifiedClosed++;
      else openCount++;
      if (c.status === 'Submitted For Verification') pendingVerificationCount++;
      if (isOverdue) overdueCount++;
      if (c.mocReference?.mocId || c.mocReference?.mocNumber) mocLinkedCount++;

      if (!deptMap.has(dept)) {
        deptMap.set(dept, { department: dept, total: 0, open: 0, overdue: 0, closed: 0 });
      }
      const dEntry = deptMap.get(dept);
      dEntry.total++;
      if (isClosed) dEntry.closed++;
      else dEntry.open++;
      if (isOverdue) dEntry.overdue++;

      capaRows.push({
        incidentNumber: parentInc?.incidentNumber || '',
        actionNumber: c.actionNumber,
        actionType: c.actionType,
        priority: c.priority || 'Medium',
        department: dept,
        assignee: c.assignee?.name || '',
        targetDate: c.targetDate ? new Date(c.targetDate).toISOString().slice(0, 10) : '',
        overdue: isOverdue ? 'Yes' : 'No',
        status: c.status,
        mocNumber: c.mocReference?.mocNumber || '',
        description: c.description
      });
    });

    const barrierPerformance = Array.from(barrierMap.values())
      .map((b) => ({
        ...b,
        deficiencyCount: b.failed + b.bypassed + b.missing,
        applicableCount: b.worked + b.failed + b.bypassed + b.missing
      }))
      .sort((a, b) => b.deficiencyCount - a.deficiencyCount);

    res.json({
      availableZones,
      summary: {
        ...summary,
        totalLopcKg: Math.round(summary.totalLopcKg * 100) / 100,
        totalDirectCostUSD: Math.round(summary.totalDirectCostUSD)
      },
      monthlyTrend: Array.from(monthlyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
      zoneBreakdown: Array.from(zoneMap.values()).sort((a, b) => b.total - a.total),
      rootCausePareto: {
        totalRootCauses: rootCauseNodes.length,
        byRootCauseType,
        byApi754Category
      },
      barrierPerformance,
      capaRollup: {
        totalCapas: capas.length,
        verifiedClosed,
        openCount,
        pendingVerificationCount,
        overdueCount,
        mocLinkedCount,
        closureRate: capas.length > 0 ? Math.round((verifiedClosed / capas.length) * 100) : 0,
        byDepartment: Array.from(deptMap.values()).sort((a, b) => b.total - a.total)
      },
      exportDataset: {
        incidents: incidentRows,
        capas: capaRows,
        rootCauses: rootCauseRows,
        barriers: barrierRows
      }
    });
  } catch (error) {
    console.error('Error generating Stage 5 PSM analytics:', error);
    res.status(500).json({ error: 'Failed to generate PSM analytics: ' + error.message });
  }
};
