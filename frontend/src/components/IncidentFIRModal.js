import React, { useState, useEffect } from 'react';
import Api754HelpModal from './Api754HelpModal';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import './IncidentFIRModal.css';

const API_URL = getApiUrl();

const TRC_OPTIONS = [
  { value: 'N/A', label: 'None / Non-Chemical Event' },
  { value: 'TRC 1', label: 'TRC 1: TIH Zone A (LC50 <= 200 ppm, e.g. Phosgene, Chlorine Trifluoride) [T1: >=5 kg, T2: >=0.5 kg]' },
  { value: 'TRC 2', label: 'TRC 2: TIH Zone B (200 < LC50 <= 1000 ppm, e.g. Chlorine, Ammonia, H2S) [T1: >=25 kg, T2: >=2.5 kg]' },
  { value: 'TRC 3', label: 'TRC 3: TIH Zone C (1000 < LC50 <= 3000 ppm, e.g. Hydrogen Cyanide, SO2) [T1: >=100 kg, T2: >=10 kg]' },
  { value: 'TRC 4', label: 'TRC 4: TIH Zone D (3000 < LC50 <= 5000 ppm) [T1: >=200 kg, T2: >=20 kg]' },
  { value: 'TRC 5', label: 'TRC 5: Flammable Gases (Methane, Propane, H2) & PG I Liquids (BP <= 35°C, FP < 23°C) [T1: >=500 kg, T2: >=50 kg]' },
  { value: 'TRC 6', label: 'TRC 6: PG II Flammables (BP > 35°C, FP < 23°C) & Crude Oil >= 15 API [T1: >=1000 kg / 7 bbl, T2: >=100 kg]' },
  { value: 'TRC 7', label: 'TRC 7: PG III Combustibles (23°C <= FP <= 60°C) & Crude < 15 API & Asphyxiants [T1: >=2000 kg / 14 bbl, T2: >=200 kg]' },
  { value: 'TRC 8', label: 'TRC 8: Liquids 60°C < FP <= 93°C & Strong Acids/Bases (pH < 1 or > 12.5) [T2: >=1000 kg]' }
];

const NATURE_GROUPS = [
  {
    category: '🧪 Loss of Containment & Leaks',
    options: [
      'Loss of Primary Containment (LOPC)',
      'Leakage from equipment, piping, flange, valve or instrument',
      'Chemical / liquid spill',
      'Toxic gas release',
      'Flammable gas / vapour release',
      'Steam / hot water release'
    ]
  },
  {
    category: '🔥 Fire & Explosion',
    options: [
      'Fire',
      'Explosion',
      'Flash fire'
    ]
  },
  {
    category: '⚡ Process Deviations & Relief',
    options: [
      'Pressure relief device (PRD) discharge',
      'Safety Instrumented System (SIS) activation',
      'Safe Operating Limit excursion',
      'Process upset / deviation'
    ]
  },
  {
    category: '⚙️ Equipment & Potential Events',
    options: [
      'Equipment rupture or failure',
      'Equipment failure / malfunction',
      'Unsafe condition identified',
      'Near miss / Potential incident',
      'Other'
    ]
  }
];

const SOURCE_OF_RELEASE_OPTIONS = [
  'Primary containment – Process equipment / piping',
  'Secondary containment',
  'Pressure relief valve / rupture disc',
  'Flare / vent / scrubber / stack',
  'Engineered depressurisation system',
  'Permitted / regulated emission source',
  'Other',
  'N/A'
];

const SHIFT_OPTIONS = ['Shift A', 'Shift B', 'Shift C', 'General Shift', 'Night Shift'];
const FACILITY_OPTIONS = ['Refining', 'Petrochemical', 'Chemical Processing', 'Storage / Terminal', 'Utilities', 'Other'];
const OPERATING_STATUS_OPTIONS = [
  'Normal - Steady State',
  'Start-up',
  'Shutdown',
  'Routine Maintenance',
  'Turnaround',
  'Other'
];

export default function IncidentFIRModal({ isOpen, onClose, onIncidentCreated, onIncidentUpdated, currentUser, incidentToEdit }) {
  const [activeTab, setActiveTab] = useState('secA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Section A - Basic Incident Information
  const [title, setTitle] = useState('');
  const [facilityName, setFacilityName] = useState(currentUser?.companyName || 'Main Refinery Complex');
  const [plantZone, setPlantZone] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [equipmentTag, setEquipmentTag] = useState('');
  const [equipmentDescription, setEquipmentDescription] = useState('');
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [shift, setShift] = useState('Shift A');
  const [unitOperatingStatus, setUnitOperatingStatus] = useState('Normal - Steady State');
  const [facilityType, setFacilityType] = useState('Refining');
  const [isNearMiss, setIsNearMiss] = useState(false);

  // Reporter Credentials
  const [reporterName, setReporterName] = useState(currentUser?.name || '');
  const [department, setDepartment] = useState('Operations');
  const [designation, setDesignation] = useState(currentUser?.role || 'Shift Engineer');
  const [contactPhone, setContactPhone] = useState(currentUser?.contact || '');
  const [reporterEmail, setReporterEmail] = useState(currentUser?.email || '');

  // Section B - Nature of Event
  const [selectedNature, setSelectedNature] = useState(['Loss of Primary Containment (LOPC)']);
  const [otherNatureText, setOtherNatureText] = useState('');
  const [isActualRelease, setIsActualRelease] = useState('Yes'); // 'Yes', 'No', 'Not sure'
  const [sourceOfRelease, setSourceOfRelease] = useState('Primary containment – Process equipment / piping');
  const [releaseAuthorization, setReleaseAuthorization] = useState('Unplanned');
  const [whatHappened, setWhatHappened] = useState('');
  const [whatWasObserved, setWhatWasObserved] = useState('');
  const [whatCouldHaveHappened, setWhatCouldHaveHappened] = useState('');
  const [immediateActionsTaken, setImmediateActionsTaken] = useState('');

  // Section C - Material & Release Details (Conditional on Release = Yes / Not sure)
  const [materialName, setMaterialName] = useState('');
  const [chemicalName, setChemicalName] = useState('');
  const [casNumber, setCasNumber] = useState('');
  const [chemicalTRC, setChemicalTRC] = useState('TRC 5');
  const [physicalState, setPhysicalState] = useState('Liquid');
  const [isFlammable, setIsFlammable] = useState(true);
  const [isToxic, setIsToxic] = useState(false);
  const [isCorrosive, setIsCorrosive] = useState(false);
  const [temperatureC, setTemperatureC] = useState(30);
  const [operatingPressureBar, setOperatingPressureBar] = useState(3.5);
  const [releasePressureBar, setReleasePressureBar] = useState(1.0);
  const [releaseLocation, setReleaseLocation] = useState('Outdoor');
  const [estimatedQuantity, setEstimatedQuantity] = useState(0);
  const [quantityUnit, setQuantityUnit] = useState('kg');
  const [quantityInOneHourKg, setQuantityInOneHourKg] = useState(0);
  const [quantityUnknown, setQuantityUnknown] = useState(false); // Flags Pending Classification!
  const [releaseDurationHours, setReleaseDurationHours] = useState(1);
  const [releaseRateKgHr, setReleaseRateKgHr] = useState(0);
  const [wasRecovered, setWasRecovered] = useState('No');
  const [stoppedBy, setStoppedBy] = useState('Manual intervention');
  const [isPrimaryContainment, setIsPrimaryContainment] = useState('Yes');
  const [sdsAvailable, setSdsAvailable] = useState(true);
  const [isMixture, setIsMixture] = useState(false);
  const [mixtureDetails, setMixtureDetails] = useState('');

  // Section D - Human Consequences
  const [injuredPersons, setInjuredPersons] = useState([]);
  const [hasInjuriesPending, setHasInjuriesPending] = useState(false); // Flags Pending Classification!
  const [newInjured, setNewInjured] = useState({
    name: '',
    role: 'Employee',
    injuryType: 'Days Away From Work (LTI)',
    medicalStatus: 'Treated & Released',
    daysAwayFromWork: 1,
    natureOfInjury: 'Chemical burn / Inhalation'
  });

  // Section E - Fire & Explosion Consequences (Conditional)
  const [fireOccurred, setFireOccurred] = useState(false);
  const [explosionOccurred, setExplosionOccurred] = useState(false);
  const [isFlashFire, setIsFlashFire] = useState(false);
  const [isVCE, setIsVCE] = useState(false);
  const [equipmentDamage, setEquipmentDamage] = useState(false);
  const [structuralDamage, setStructuralDamage] = useState(false);
  const [directCostUSD, setDirectCostUSD] = useState(0);
  const [directCostPending, setDirectCostPending] = useState(false); // Flags Pending Classification!
  const [firefightingRequired, setFirefightingRequired] = useState(false);
  const [unitShutdown, setUnitShutdown] = useState(false);

  // Section F - Emergency Response & Protective Measures
  const [onSiteEvac, setOnSiteEvac] = useState(false);
  const [onSiteShelter, setOnSiteShelter] = useState(false);
  const [communityEvac, setCommunityEvac] = useState(false);
  const [communityShelter, setCommunityShelter] = useState(false);
  const [officiallyDeclared, setOfficiallyDeclared] = useState(false); // Crucial for Tier 1!
  const [publicProtective, setPublicProtective] = useState(false);
  const [precautionaryOnly, setPrecautionaryOnly] = useState(false);
  const [dischargeToUnsafeLocation, setDischargeToUnsafeLocation] = useState(false);
  const [liquidRainout, setLiquidRainout] = useState(false);
  const [offSiteImpact, setOffSiteImpact] = useState(false);

  // Section G - Equipment & Process Safety Barrier Information
  const [prdOperated, setPrdOperated] = useState(false);
  const [sisActivated, setSisActivated] = useState(false);
  const [solExceeded, setSolExceeded] = useState(false);
  const [emergencyDepressureOperated, setEmergencyDepressureOperated] = useState(false);
  const [interlockTripDemand, setInterlockTripDemand] = useState(false);
  const [safetyCriticalEquipmentFailed, setSafetyCriticalEquipmentFailed] = useState(false);
  const [barrierTag, setBarrierTag] = useState('');
  const [barrierSetpoint, setBarrierSetpoint] = useState('');
  const [barrierActualValue, setBarrierActualValue] = useState('');
  const [performedAsIntended, setPerformedAsIntended] = useState(true);

  // Section H - Near-Miss Assessment (Conditional)
  const [isCrediblePotential, setIsCrediblePotential] = useState(true);
  const [barrierPreventedEscalation, setBarrierPreventedEscalation] = useState(true);
  const [safeguardThatPrevented, setSafeguardThatPrevented] = useState('SIS High-Pressure Interlock Trip');
  const [credibleWorstCaseConsequence, setCredibleWorstCaseConsequence] = useState('');

  // Stage 2 - Real-Time Classification Preview
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [liveEvaluation, setLiveEvaluation] = useState({
    category: 'Pending Classification',
    tier: 'Pending Classification',
    title: 'Pending Classification – Additional Information Required',
    badgeColor: 'warning',
    reasons: ['Initial report intake'],
    tier1SeverityPoints: 0
  });

  // Populate form states if editing an existing incident
  useEffect(() => {
    if (incidentToEdit && isOpen) {
      setTitle(incidentToEdit.title || '');
      setFacilityName(incidentToEdit.facilityName || currentUser?.companyName || 'Main Refinery Complex');
      setPlantZone(incidentToEdit.plantZone || '');
      setExactLocation(incidentToEdit.exactLocation || '');
      setEquipmentTag(incidentToEdit.equipmentTag || '');
      setEquipmentDescription(incidentToEdit.equipmentDescription || '');
      setDateTime(incidentToEdit.dateTime ? new Date(incidentToEdit.dateTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
      setShift(incidentToEdit.shift || 'Shift A');
      setUnitOperatingStatus(incidentToEdit.unitOperatingStatus || 'Normal - Steady State');
      setFacilityType(incidentToEdit.facilityType || 'Refining');
      setIsNearMiss(Boolean(incidentToEdit.isNearMiss || incidentToEdit.incidentCategory === 'Near Miss'));

      // Reporter
      setReporterName(incidentToEdit.reporter?.name || currentUser?.name || '');
      setDepartment(incidentToEdit.reporter?.department || 'Operations');
      setDesignation(incidentToEdit.reporter?.designation || currentUser?.role || 'Shift Engineer');
      setContactPhone(incidentToEdit.reporter?.contactPhone || currentUser?.contact || '');
      setReporterEmail(incidentToEdit.reporter?.email || currentUser?.email || '');

      // Section B
      setSelectedNature(Array.isArray(incidentToEdit.natureOfEvents) && incidentToEdit.natureOfEvents.length > 0 ? incidentToEdit.natureOfEvents : ['Loss of Primary Containment (LOPC)']);
      setIsActualRelease(incidentToEdit.isActualRelease || 'Yes');
      setSourceOfRelease(incidentToEdit.sourceOfRelease || 'Primary containment – Process equipment / piping');
      setReleaseAuthorization(incidentToEdit.releaseAuthorization || 'Unplanned');
      setWhatHappened(incidentToEdit.descriptionMatrix?.whatHappened || '');
      setWhatWasObserved(incidentToEdit.descriptionMatrix?.whatWasObserved || '');
      setWhatCouldHaveHappened(incidentToEdit.descriptionMatrix?.whatCouldHaveHappened || '');
      setImmediateActionsTaken(incidentToEdit.immediateActionsTaken || '');

      // Section C - Material
      const mat = incidentToEdit.materialDetails || {};
      setMaterialName(mat.materialName || '');
      setChemicalName(mat.chemicalName || '');
      setCasNumber(mat.casNumber || '');
      setChemicalTRC(mat.chemicalTRC || 'TRC 5');
      setPhysicalState(mat.physicalState || 'Liquid');
      setIsFlammable(mat.isFlammable ?? true);
      setIsToxic(mat.isToxic ?? false);
      setIsCorrosive(mat.isCorrosive ?? false);
      setTemperatureC(mat.temperatureC ?? 30);
      setOperatingPressureBar(mat.operatingPressureBar ?? 3.5);
      setReleasePressureBar(mat.releasePressureBar ?? 1.0);
      setReleaseLocation(mat.releaseLocation || 'Outdoor');
      setEstimatedQuantity(mat.estimatedQuantity ?? 0);
      setQuantityUnit(mat.quantityUnit || 'kg');
      setQuantityInOneHourKg(mat.quantityInOneHourKg ?? 0);
      setQuantityUnknown(mat.quantityUnknown ?? false);
      setReleaseDurationHours(mat.releaseDurationHours ?? 1);
      setReleaseRateKgHr(mat.releaseRateKgHr ?? 0);
      setWasRecovered(mat.wasRecovered || 'No');
      setStoppedBy(mat.stoppedBy || 'Manual intervention');
      setSdsAvailable(mat.sdsAvailable ?? true);
      setIsMixture(mat.isMixture ?? false);
      setMixtureDetails(mat.mixtureDetails || '');

      // Section D - Human
      setInjuredPersons(Array.isArray(incidentToEdit.injuredPersons) ? incidentToEdit.injuredPersons : []);
      setHasInjuriesPending(incidentToEdit.hasInjuriesPending ?? false);

      // Section E - Fire
      const fe = incidentToEdit.fireExplosionDetails || {};
      setFireOccurred(fe.didFireOccur ?? false);
      setExplosionOccurred(fe.didExplosionOccur ?? false);
      setIsFlashFire(fe.isFlashFire ?? false);
      setIsVCE(fe.isVCE ?? false);
      setEquipmentDamage(fe.equipmentDamage ?? false);
      setStructuralDamage(fe.structuralDamage ?? false);
      setDirectCostUSD(fe.directCostUSD ?? 0);
      setDirectCostPending(fe.directCostPending ?? false);
      setFirefightingRequired(fe.firefightingRequired ?? false);
      setUnitShutdown(fe.unitShutdown ?? false);

      // Section F - Emergency
      const em = incidentToEdit.emergencyMeasures || {};
      setOnSiteEvac(em.onSiteEvacuation ?? false);
      setOnSiteShelter(em.onSiteShelter ?? false);
      setCommunityEvac(em.communityEvacuation ?? false);
      setCommunityShelter(em.communityShelter ?? false);
      setOfficiallyDeclared(em.officiallyDeclared ?? false);
      setPublicProtective(em.publicProtectiveMeasures ?? false);
      setPrecautionaryOnly(em.precautionaryOnly ?? false);
      setDischargeToUnsafeLocation(em.dischargeToUnsafeLocation ?? false);
      setLiquidRainout(em.liquidRainout ?? false);
      setOffSiteImpact(em.offSiteImpact ?? false);

      // Section G - Barriers
      const bp = incidentToEdit.barrierPerformance || {};
      setPrdOperated(bp.prdOperated ?? false);
      setSisActivated(bp.sisActivated ?? false);
      setSolExceeded(bp.solExceeded ?? false);
      setEmergencyDepressureOperated(bp.emergencyDepressureOperated ?? false);
      setInterlockTripDemand(bp.interlockTripDemand ?? false);
      setSafetyCriticalEquipmentFailed(bp.safetyCriticalEquipmentFailed ?? false);
      setBarrierTag(bp.equipmentTag || '');
      setBarrierSetpoint(bp.setPoint || '');
      setBarrierActualValue(bp.actualValue || '');
      setPerformedAsIntended(bp.performedAsIntended ?? true);

      // Section H - Near Miss
      const nm = incidentToEdit.nearMissAssessment || {};
      setIsCrediblePotential(nm.isCrediblePotential ?? true);
      setBarrierPreventedEscalation(nm.barrierPreventedEscalation ?? true);
      setSafeguardThatPrevented(nm.safeguardThatPrevented || 'SIS High-Pressure Interlock Trip');
      setCredibleWorstCaseConsequence(nm.credibleWorstCaseConsequence || '');

      // Classification
      if (incidentToEdit.api754Classification) {
        setLiveEvaluation(incidentToEdit.api754Classification);
      }
    } else if (!incidentToEdit && isOpen) {
      setTitle('');
      setPlantZone('');
      setExactLocation('');
      setEquipmentTag('');
      setEquipmentDescription('');
      setDateTime(new Date().toISOString().slice(0, 16));
      setShift('Shift A');
      setUnitOperatingStatus('Normal - Steady State');
      setFacilityType('Refining');
      setIsNearMiss(false);
      setSelectedNature(['Loss of Primary Containment (LOPC)']);
      setIsActualRelease('Yes');
      setWhatHappened('');
      setWhatWasObserved('');
      setWhatCouldHaveHappened('');
      setImmediateActionsTaken('');
      setInjuredPersons([]);
      setFireOccurred(false);
      setExplosionOccurred(false);
    }
  }, [incidentToEdit, isOpen, currentUser]);

  // Handle Near Miss toggle
  const handleNearMissChange = (isNM) => {
    setIsNearMiss(isNM);
    if (isNM) {
      setIsActualRelease('No');
      setSelectedNature(prev => {
        const withoutLopc = prev.filter(n => n !== 'Loss of Primary Containment (LOPC)');
        if (!withoutLopc.includes('Near miss / Potential incident')) {
          return [...withoutLopc, 'Near miss / Potential incident'];
        }
        return withoutLopc.length > 0 ? withoutLopc : ['Near miss / Potential incident'];
      });
    } else {
      setIsActualRelease('Yes');
      setSelectedNature(prev => {
        const withoutNM = prev.filter(n => n !== 'Near miss / Potential incident');
        if (withoutNM.length === 0) {
          return ['Loss of Primary Containment (LOPC)'];
        }
        return withoutNM;
      });
    }
  };

  const hasLossOfContainmentSelected = NATURE_GROUPS[0].options.some(opt =>
    selectedNature.includes(opt)
  );

  // Toggle selection for Section B checkboxes with Near Miss synchronization & Group Locking
  const handleToggleNature = (opt) => {
    const isContainmentOpt = NATURE_GROUPS[0].options.includes(opt);
    const hasContainment = selectedNature.some((item) => NATURE_GROUPS[0].options.includes(item));

    // If attempting to toggle a non-containment option while no containment option is selected, prevent it
    if (!isContainmentOpt && !hasContainment) {
      return;
    }

    if (selectedNature.includes(opt)) {
      let updated = selectedNature.filter(item => item !== opt);
      // If user unchecks the last containment option, also auto-clear selections from the other 3 locked groups
      const stillHasContainment = updated.some(item => NATURE_GROUPS[0].options.includes(item));
      if (!stillHasContainment) {
        updated = [];
      }
      setSelectedNature(updated);
      if (opt === 'Near miss / Potential incident' && isNearMiss) {
        setIsNearMiss(false);
      }
    } else {
      const updated = [...selectedNature, opt];
      setSelectedNature(updated);
      if (opt === 'Near miss / Potential incident') {
        setIsNearMiss(true);
        setIsActualRelease('No');
      }
    }
  };

  // Determine if conditional sections are required
  const isNearMissApplicable = isNearMiss || isActualRelease === 'No' || selectedNature.includes('Near miss / Potential incident');

  const isReleaseSectionApplicable = !isNearMiss && (
    isActualRelease === 'Yes' || isActualRelease === 'Not sure' ||
    selectedNature.some(n => [
      'Loss of Primary Containment (LOPC)',
      'Leakage from equipment, piping, flange, valve or instrument',
      'Toxic gas release',
      'Flammable gas / vapour release',
      'Chemical / liquid spill'
    ].includes(n))
  );

  const isFireSectionApplicable = fireOccurred || explosionOccurred || isFlashFire || isVCE ||
    selectedNature.some(n => ['Fire', 'Explosion', 'Flash fire'].includes(n));

  // Trigger live API 754 evaluation whenever inputs change
  useEffect(() => {
    let fatalitiesCount = 0;
    let daysAwayInjuriesCount = 0;
    let recordableInjuriesCount = 0;
    let hospitalAdmissionThirdParty = 0;

    injuredPersons.forEach(p => {
      if (p.injuryType === 'Fatality' || p.medicalStatus === 'Deceased') fatalitiesCount++;
      if (p.injuryType === 'Days Away From Work (LTI)') daysAwayInjuriesCount++;
      if (p.injuryType === 'Medical Treatment Case (MTC)') recordableInjuriesCount++;
      if (p.role === 'Third Party' && p.medicalStatus === 'Hospital Admission') hospitalAdmissionThirdParty++;
    });

    const payload = {
      isActualRelease,
      releaseLocation,
      fatalitiesCount,
      daysAwayInjuriesCount,
      recordableInjuriesCount,
      hospitalAdmissionThirdParty,
      hasInjuriesPending,
      fireExplosionOccurred: isFireSectionApplicable,
      directCostUSD: Number(directCostUSD) || 0,
      directCostPending,
      evacOrShelter: communityEvac || communityShelter || onSiteEvac,
      officiallyDeclared,
      isPRDOrUpset: prdOperated,
      prdDischargeConsequences: {
        rainout: liquidRainout,
        unsafeLocation: dischargeToUnsafeLocation,
        onSiteEvac,
        publicProtective
      },
      isSOLChallenge: solExceeded,
      isSafetySystemDemand: sisActivated || interlockTripDemand,
      isManagementSystemIssue: safetyCriticalEquipmentFailed,
      isNearMiss: isNearMissApplicable,
      isLOPC: isReleaseSectionApplicable,
      chemicalTRC: isNearMiss ? 'N/A' : chemicalTRC,
      releaseQuantityKg: isNearMiss ? 0 : (Number(quantityInOneHourKg) || Number(estimatedQuantity) || 0),
      quantityUnknown: isNearMiss ? false : quantityUnknown
    };

    const token = localStorage.getItem('token');
    safeFetchJson(`${API_URL}/api/incidents/evaluate-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    })
      .then(data => {
        if (data && data.category) {
          setLiveEvaluation(data);
        }
      })
      .catch(err => console.warn('Live evaluate warning:', err.message));
  }, [
    isActualRelease, isReleaseSectionApplicable, chemicalTRC, releaseLocation,
    quantityInOneHourKg, estimatedQuantity, quantityUnknown,
    injuredPersons, hasInjuriesPending, isFireSectionApplicable,
    directCostUSD, directCostPending, communityEvac, communityShelter, onSiteEvac,
    officiallyDeclared, prdOperated, liquidRainout, dischargeToUnsafeLocation,
    publicProtective, solExceeded, sisActivated, interlockTripDemand,
    safetyCriticalEquipmentFailed, isNearMissApplicable, isNearMiss
  ]);

  if (!isOpen) return null;

  const handleAddInjured = () => {
    if (!newInjured.name.trim()) return;
    setInjuredPersons([...injuredPersons, { ...newInjured }]);
    setNewInjured({
      name: '',
      role: 'Employee',
      injuryType: 'First Aid Case (FAC)',
      medicalStatus: 'On-site First Aid',
      daysAwayFromWork: 0,
      natureOfInjury: ''
    });
  };

  const handleRemoveInjured = (idx) => {
    setInjuredPersons(injuredPersons.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim() || !plantZone.trim() || !whatHappened.trim()) {
      setError('Please fill in all mandatory fields: Incident Title, Plant / Unit / Department, and What Happened.');
      if (!title.trim() || !plantZone.trim()) setActiveTab('secA');
      else setActiveTab('secB');
      return;
    }

    if (!selectedNature.some(opt => NATURE_GROUPS[0].options.includes(opt))) {
      setError("Please select at least one applicable characteristic under 'Loss of Containment & Leaks' in Section B.");
      setActiveTab('secB');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      title,
      facilityName,
      plantZone,
      exactLocation,
      equipmentTag,
      equipmentDescription,
      dateTime,
      shift,
      unitOperatingStatus,
      facilityType,
      isNearMiss,
      incidentCategory: isNearMiss ? 'Near Miss' : 'Actual Incident',
      companyCode: currentUser?.companyCode || 'DEFAULT',
      reporter: {
        userId: currentUser?._id,
        name: reporterName,
        department,
        designation,
        contactPhone,
        email: reporterEmail
      },
      natureOfEvents: selectedNature.includes('Other') && otherNatureText
        ? [...selectedNature.filter(n => n !== 'Other'), `Other: ${otherNatureText}`]
        : selectedNature,
      isActualRelease,
      sourceOfRelease,
      releaseAuthorization,
      descriptionMatrix: {
        whatHappened,
        whatWasObserved,
        whatCouldHaveHappened
      },
      immediateActionsTaken,
      isLOPC: isReleaseSectionApplicable,
      materialDetails: {
        materialName,
        chemicalName,
        casNumber,
        chemicalTRC,
        physicalState,
        isFlammable,
        isToxic,
        isCorrosive,
        temperatureC: Number(temperatureC) || 25,
        operatingPressureBar: Number(operatingPressureBar) || 1,
        releasePressureBar: Number(releasePressureBar) || 1,
        releaseLocation,
        estimatedQuantity: Number(estimatedQuantity) || 0,
        quantityUnit,
        quantityInOneHourKg: Number(quantityInOneHourKg) || 0,
        quantityUnknown,
        releaseDurationHours: Number(releaseDurationHours) || 1,
        releaseRateKgHr: Number(releaseRateKgHr) || 0,
        wasRecovered,
        stoppedBy,
        sdsAvailable,
        isMixture,
        mixtureDetails
      },
      injuredPersons,
      hasInjuriesPending,
      fireExplosionDetails: {
        occurred: isFireSectionApplicable,
        didFireOccur: fireOccurred,
        didExplosionOccur: explosionOccurred,
        isFlashFire,
        isVCE,
        equipmentDamage,
        structuralDamage,
        directCostUSD: Number(directCostUSD) || 0,
        directCostPending,
        firefightingRequired,
        unitShutdown
      },
      emergencyMeasures: {
        onSiteEvacuation: onSiteEvac,
        onSiteShelter,
        communityEvacuation: communityEvac,
        communityShelter,
        officiallyDeclared,
        publicProtectiveMeasures: publicProtective,
        precautionaryOnly,
        dischargeToUnsafeLocation,
        liquidRainout,
        offSiteImpact
      },
      barrierPerformance: {
        prdOperated,
        sisActivated,
        emergencyDepressureOperated,
        solExceeded,
        interlockTripDemand,
        safetyCriticalEquipmentFailed,
        equipmentTag: barrierTag,
        setPoint: barrierSetpoint,
        actualValue: barrierActualValue,
        performedAsIntended
      },
      nearMissAssessment: {
        isCrediblePotential,
        barrierPreventedEscalation,
        safeguardThatPrevented,
        credibleWorstCaseConsequence
      }
    };

    try {
      const token = localStorage.getItem('token');
      const isEditing = Boolean(incidentToEdit && incidentToEdit._id);
      const url = isEditing ? `${API_URL}/api/incidents/${incidentToEdit._id}` : `${API_URL}/api/incidents`;
      const method = isEditing ? 'PATCH' : 'POST';

      const result = await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      setLoading(false);
      if (isEditing && onIncidentUpdated) {
        onIncidentUpdated(result);
      } else if (onIncidentCreated) {
        onIncidentCreated(result);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Badge styles for classification preview
  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'Tier 1 PSE':
        return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444', icon: '🚨' };
      case 'Tier 2 PSE':
        return { bg: '#ffedd5', text: '#9a3412', border: '#f97316', icon: '⚠️' };
      case 'Tier 3 Indicator':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', icon: '⚡' };
      case 'Tier 4 Indicator':
        return { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6', icon: '📊' };
      case 'Pending Classification':
        return { bg: '#fef9c3', text: '#854d0e', border: '#ca8a04', icon: '⏳' };
      case 'Other Incident':
        return { bg: '#f1f5f9', text: '#334155', border: '#94a3b8', icon: '📋' };
      default:
        return { bg: '#e0f2fe', text: '#075985', border: '#0284c7', icon: '🛡️' };
    }
  };

  const catTheme = getCategoryTheme(liveEvaluation.category);

  // Steps configuration
  const steps = [
    { id: 'secA', label: '1. General Info', subtitle: 'Section A' },
    { id: 'secB', label: '2. Event Nature', subtitle: 'Section B' },
    { id: 'secC', label: '3. Material & Release', subtitle: 'Section C', badge: isReleaseSectionApplicable ? 'Active' : 'N/A', badgeColor: isReleaseSectionApplicable ? '#16a34a' : '#94a3b8' },
    { id: 'secD', label: '4. Human Impact', subtitle: 'Section D', badge: `${injuredPersons.length}`, badgeColor: injuredPersons.length > 0 ? '#ef4444' : '#64748b' },
    { id: 'secEFG', label: '5. Fire & Barriers', subtitle: 'Sec E, F, G' },
    { id: 'secH', label: '6. Near Miss', subtitle: 'Section H', badge: isNearMissApplicable ? 'Active' : 'Optional', badgeColor: isNearMissApplicable ? '#2563eb' : '#94a3b8' },
    { id: 'secPreview', label: '7. Classification', subtitle: 'Stage 2 Preview', badge: liveEvaluation.tier, badgeColor: catTheme.border }
  ];

  const currentStepIdx = steps.findIndex(s => s.id === activeTab);

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setActiveTab(steps[currentStepIdx + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setActiveTab(steps[currentStepIdx - 1].id);
    }
  };

  return (
    <>
      <div className="fir-modal-overlay">
      <div className="fir-modal-card">
        {/* Header */}
        <div className="fir-modal-header">
          <div>
            <div className="fir-header-title-row">
              <span style={{ fontSize: '1.35rem' }}>{incidentToEdit ? '✏️' : '🚨'}</span>
              <h2 className="fir-header-title">
                {incidentToEdit ? `Edit Incident Report – ${incidentToEdit.incidentNumber}` : 'Stage 1 – First Incident Report (FIR)'}
              </h2>
              <span className="fir-header-badge">
                {incidentToEdit ? 'Editing Mode (Pre-CFT)' : 'API RP 754 4th Ed. Compliant'}
              </span>
            </div>
            <p className="fir-header-subtitle">
              {incidentToEdit
                ? 'Update observable incident details, consequences, or initial narrative before the Cross-Functional Team (CFT) begins investigation.'
                : 'Reporter records observable facts; classification engine determines Tier 1–4, Near Miss, or Pending Classification.'}
            </p>
          </div>
          <button onClick={onClose} className="fir-close-btn" title="Close">×</button>
        </div>

        {/* Live Classification Engine Banner */}
        <div
          className="fir-rating-banner"
          style={{ background: catTheme.bg, borderColor: catTheme.border }}
        >
          <div className="fir-rating-left">
            <span className="fir-rating-pill" style={{ background: catTheme.border }}>
              <span>{catTheme.icon}</span> {liveEvaluation.category.toUpperCase()}
            </span>
            <span className="fir-rating-title" style={{ color: catTheme.text }}>
              {liveEvaluation.title}
            </span>
          </div>

          <div className="fir-rating-right">
            {liveEvaluation.tier === 'Tier 1' && liveEvaluation.tier1SeverityPoints > 0 && (
              <span style={{
                fontSize: '0.76rem',
                fontWeight: '800',
                background: '#fee2e2',
                color: '#991b1b',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #ef4444'
              }}>
                Annex D Severity: {liveEvaluation.tier1SeverityPoints} pts
              </span>
            )}
            {(liveEvaluation.category === 'Pending Classification' || liveEvaluation.tier === 'Pending Classification') && (
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="fir-rating-btn"
                style={{ background: '#d97706', color: '#ffffff', marginRight: '6px', fontWeight: 800 }}
                title="Click to understand why classification is pending and how to resolve"
              >
                ❓ Why Pending? (Help)
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="fir-rating-btn"
              style={{ background: '#0284c7', color: '#ffffff', marginRight: '6px' }}
              title="ANSI/API RP 754 Classification Standard & Reference Guide"
            >
              📘 PSE Guide
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('secPreview')}
              className="fir-rating-btn"
              style={{ background: catTheme.border }}
            >
              Review Rationale →
            </button>
          </div>
        </div>

        {/* Stepper Tabs Strip */}
        <div className="fir-stepper-strip">
          {steps.map((st, i) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setActiveTab(st.id)}
              className={`fir-step-tab ${activeTab === st.id ? 'active' : ''}`}
            >
              <span className="fir-step-num">Step {i + 1}</span>
              <span className="fir-step-label">{st.label}</span>
              {st.badge && (
                <span className="fir-step-badge" style={{ background: st.badgeColor }}>
                  {st.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="fir-form-body">
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '10px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: SECTION A - GENERAL INCIDENT INFO */}
          {activeTab === 'secA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 className="fir-section-title">Section A – Basic Incident Information</h3>
                <p className="fir-section-desc">Record the operational context, asset tag, and reporting personnel.</p>

                {/* Event Classification / Near Miss Toggle Banner */}
                <div style={{
                  background: isNearMiss ? 'rgba(2, 132, 199, 0.08)' : 'rgba(241, 245, 249, 0.7)',
                  border: `1.5px solid ${isNearMiss ? '#0284c7' : '#cbd5e1'}`,
                  borderRadius: '10px',
                  padding: '12px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.25rem' }}>{isNearMiss ? '🛡️' : '🚨'}</span>
                      <strong style={{ fontSize: '0.92rem', color: isNearMiss ? '#0284c7' : 'var(--text-primary)' }}>
                        Is this event a Near Miss?
                      </strong>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: '800',
                        letterSpacing: '0.3px',
                        background: isNearMiss ? '#0284c7' : '#fee2e2',
                        color: isNearMiss ? '#ffffff' : '#991b1b'
                      }}>
                        {isNearMiss ? '✓ NEAR MISS SELECTED' : 'ACTUAL INCIDENT'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {isNearMiss
                        ? 'No actual loss or release occurred. A barrier or timely intervention prevented escalation. Step 6 (Near Miss Assessment) is activated.'
                        : 'Actual event involving material release, fire, explosion, equipment damage, or personal injury.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleNearMissChange(false)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: !isNearMiss ? '800' : '600',
                        cursor: 'pointer',
                        border: !isNearMiss ? '2px solid #ef4444' : '1px solid var(--divider)',
                        background: !isNearMiss ? '#fee2e2' : 'var(--bg-paper, #ffffff)',
                        color: !isNearMiss ? '#991b1b' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>🚨</span> No – Actual Incident
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNearMissChange(true)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: isNearMiss ? '800' : '600',
                        cursor: 'pointer',
                        border: isNearMiss ? '2px solid #0284c7' : '1px solid var(--divider)',
                        background: isNearMiss ? '#0284c7' : 'var(--bg-paper, #ffffff)',
                        color: isNearMiss ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: isNearMiss ? '0 2px 8px rgba(2, 132, 199, 0.35)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>🛡️</span> Yes – Near Miss
                    </button>
                  </div>
                </div>
                
                <div className="fir-grid-1" style={{ marginBottom: '14px' }}>
                  <div className="fir-field-group">
                    <label className="fir-label fir-label-required">Incident Title / Event Headline</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flange leak on Reactor Reflux loop during feed switchover"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                </div>

                <div className="fir-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="fir-field-group">
                    <label className="fir-label">Company / Facility Name</label>
                    <input
                      type="text"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      className="fir-input"
                    />
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label fir-label-required">Plant / Unit / Department</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hydrocracker Unit (HCU-02)"
                      value={plantZone}
                      onChange={(e) => setPlantZone(e.target.value)}
                      className="fir-input"
                    />
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label">Exact Incident Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Elevation +12m, East Pipe Rack Flange #FL-104"
                      value={exactLocation}
                      onChange={(e) => setExactLocation(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                </div>

                <div className="fir-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="fir-field-group">
                    <label className="fir-label">Equipment / Tag Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 02-P-101A / PSV-2004" data-spellcheck="false"
                      value={equipmentTag}
                      onChange={(e) => setEquipmentTag(e.target.value)}
                      className="fir-input"
                    />
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label">Equipment Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Heavy Gas Oil Feed Booster Pump"
                      value={equipmentDescription}
                      onChange={(e) => setEquipmentDescription(e.target.value)}
                      className="fir-input"
                    />
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label fir-label-required">Date & Time of Incident</label>
                    <input
                      type="datetime-local"
                      required
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                </div>

                <div className="fir-grid-4">
                  <div className="fir-field-group">
                    <label className="fir-label">Operational Shift</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                      className="fir-select"
                    >
                      {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label">Was the Unit Operating?</label>
                    <select
                      value={unitOperatingStatus}
                      onChange={(e) => setUnitOperatingStatus(e.target.value)}
                      className="fir-select"
                    >
                      {OPERATING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label">Facility Type</label>
                    <select
                      value={facilityType}
                      onChange={(e) => setFacilityType(e.target.value)}
                      className="fir-select"
                    >
                      {FACILITY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label fir-label-required">Is this a Near Miss?</label>
                    <select
                      value={isNearMiss ? 'Yes' : 'No'}
                      onChange={(e) => handleNearMissChange(e.target.value === 'Yes')}
                      className="fir-select"
                      style={{
                        fontWeight: '700',
                        borderColor: isNearMiss ? '#0284c7' : undefined,
                        background: isNearMiss ? '#f0f9ff' : undefined,
                        color: isNearMiss ? '#0369a1' : undefined
                      }}
                    >
                      <option value="No">No – Actual Incident</option>
                      <option value="Yes">Yes – Near Miss</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reporter Details Card */}
              <div className="fir-card fir-card-highlight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>👤</span>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--primary-main)' }}>
                    Reporter Information
                  </strong>
                </div>

                <div className="fir-grid-3" style={{ marginBottom: '10px' }}>
                  <div className="fir-field-group">
                    <label className="fir-label">Reported By (Full Name)</label>
                    <input
                      type="text"
                      value={reporterName} data-spellcheck="false"
                      onChange={(e) => setReporterName(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Reporter Email</label>
                    <input
                      type="email"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Contact Phone / Ext</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                </div>

                <div className="fir-grid-2">
                  <div className="fir-field-group">
                    <label className="fir-label">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Designation / Role</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECTION B - NATURE OF EVENT & NARRATIVE */}
          {activeTab === 'secB' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 className="fir-section-title">Section B – Nature of Event</h3>
                <p className="fir-section-desc">1. What happened? Select all applicable observable event characteristics:</p>

                {/* 4 Clean Category Cards for the 17 Checkboxes with Group Locking */}
                <div className="fir-grid-2" style={{ marginBottom: '16px' }}>
                  {NATURE_GROUPS.map((grp, gIdx) => {
                    const isLocked = gIdx > 0 && !hasLossOfContainmentSelected;

                    return (
                      <div
                        key={gIdx}
                        className={`fir-nature-group ${isLocked ? 'locked' : ''}`}
                        title={isLocked ? "Select at least 1 option in 'Loss of Containment & Leaks' to unlock this section" : ''}
                      >
                        <div className="fir-nature-group-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{grp.category}</span>
                          {gIdx === 0 ? (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              padding: '1px 7px',
                              borderRadius: '999px',
                              background: hasLossOfContainmentSelected ? '#dcfce7' : '#fef3c7',
                              color: hasLossOfContainmentSelected ? '#166534' : '#92400e',
                              border: `1px solid ${hasLossOfContainmentSelected ? '#86efac' : '#fcd34d'}`
                            }}>
                              {hasLossOfContainmentSelected ? '✓ Active' : '⚠️ At least 1 required'}
                            </span>
                          ) : isLocked ? (
                            <span className="fir-locked-badge">
                              🔒 Locked
                            </span>
                          ) : null}
                        </div>

                        {grp.options.map(opt => (
                          <label
                            key={opt}
                            className="fir-checkbox-label"
                            style={isLocked ? { cursor: 'not-allowed', color: '#94a3b8' } : {}}
                          >
                            <input
                              type="checkbox"
                              checked={selectedNature.includes(opt)}
                              disabled={isLocked}
                              onChange={() => handleToggleNature(opt)}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {!hasLossOfContainmentSelected && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    fontSize: '0.78rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🔒</span>
                    <span>
                      <strong>Fire & Explosion</strong>, <strong>Process Deviations & Relief</strong>, and <strong>Equipment & Potential Events</strong> categories are locked. Please select at least one applicable characteristic under <strong>Loss of Containment & Leaks</strong> above to unlock them.
                    </span>
                  </div>
                )}

                {selectedNature.includes('Other') && (
                  <div className="fir-field-group" style={{ marginBottom: '14px' }}>
                    <label className="fir-label">Specify Other Nature of Event:</label>
                    <input
                      type="text"
                      value={otherNatureText}
                      onChange={(e) => setOtherNatureText(e.target.value)}
                      placeholder="Describe other specific nature of event..."
                      className="fir-input"
                    />
                  </div>
                )}

                {/* Questions 2, 3, 4 */}
                <div className="fir-grid-3" style={{ marginBottom: '16px' }}>
                  <div className="fir-field-group">
                    <label className="fir-label fir-label-required">2. Was there an actual release of material?</label>
                    <select
                      value={isActualRelease}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIsActualRelease(val);
                        if (val === 'No') {
                          handleNearMissChange(true);
                        } else if (val === 'Yes' && isNearMiss) {
                          handleNearMissChange(false);
                        }
                      }}
                      className="fir-select"
                      style={{
                        borderColor: isActualRelease === 'Not sure' ? '#ca8a04' : undefined,
                        background: isActualRelease === 'Not sure' ? '#fef9c3' : undefined
                      }}
                    >
                      <option value="Yes">Yes – Actual Release Occurred</option>
                      <option value="No">No – No Release (e.g. Near Miss / Upset)</option>
                      <option value="Not sure">Not sure – Under Investigation (Pending Classification)</option>
                    </select>
                    {isActualRelease === 'Not sure' && (
                      <span className="fir-hint" style={{ color: '#854d0e', fontWeight: '700' }}>
                        ⚠️ Triggers "Pending Classification – Additional Information Required"
                      </span>
                    )}
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label">3. Source of Release</label>
                    <select
                      value={sourceOfRelease}
                      onChange={(e) => setSourceOfRelease(e.target.value)}
                      disabled={isActualRelease === 'No'}
                      className="fir-select"
                    >
                      {SOURCE_OF_RELEASE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="fir-field-group">
                    <label className="fir-label">4. Was release planned and authorised?</label>
                    <select
                      value={releaseAuthorization}
                      onChange={(e) => setReleaseAuthorization(e.target.value)}
                      disabled={isActualRelease === 'No'}
                      className="fir-select"
                    >
                      <option value="Unplanned">Unplanned (Accidental)</option>
                      <option value="Uncontrolled">Uncontrolled</option>
                      <option value="Planned and controlled">Planned and controlled (e.g. safe blowdown)</option>
                      <option value="Not sure">Not sure</option>
                    </select>
                  </div>
                </div>

                {/* Narrative Description Matrix */}
                <div className="fir-field-group" style={{ marginBottom: '12px' }}>
                  <label className="fir-label fir-label-required">
                    5. Detailed Incident Sequence & Narrative (What Happened)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the chronological sequence of events, operating conditions prior to the event, and immediate response..."
                    value={whatHappened}
                    onChange={(e) => setWhatHappened(e.target.value)}
                    className="fir-textarea"
                  />
                </div>

                <div className="fir-grid-3">
                  <div className="fir-field-group">
                    <label className="fir-label">What Was Observed (Physical evidence)</label>
                    <textarea
                      rows={2}
                      placeholder="Vapor cloud, liquid pooling, pressure dip on DCS, gas detector alarm..."
                      value={whatWasObserved}
                      onChange={(e) => setWhatWasObserved(e.target.value)}
                      className="fir-textarea"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">What Could Have Happened</label>
                    <textarea
                      rows={2}
                      placeholder="Potential pool fire, unconfined vapor cloud explosion if ignited..."
                      value={whatCouldHaveHappened}
                      onChange={(e) => setWhatCouldHaveHappened(e.target.value)}
                      className="fir-textarea"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Immediate Actions Taken</label>
                    <textarea
                      rows={2}
                      placeholder="Tripped booster pump, closed manual block valves, deployed water fog curtain..."
                      value={immediateActionsTaken}
                      onChange={(e) => setImmediateActionsTaken(e.target.value)}
                      className="fir-textarea"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECTION C - MATERIAL & RELEASE DETAILS */}
          {activeTab === 'secC' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 className="fir-section-title">
                  Section C – Material and Release Details (API RP 754 Table 1 Engine)
                </h3>
                <p className="fir-section-desc">Chemical identification, threshold release category (TRC 1 to 8), and release rates.</p>

                {isActualRelease === 'No' ? (
                  <div className="fir-card" style={{ textAlign: 'center', padding: '36px' }}>
                    <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🛡️</div>
                    <strong style={{ fontSize: '0.96rem' }}>No Actual Material Release Reported</strong>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '8px auto 16px auto' }}>
                      In Section B, you indicated there was no actual release. If this was a near miss or challenge to safety systems, proceed to Human Consequences or Near-Miss Assessment.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsActualRelease('Yes')}
                      className="fir-btn-primary"
                    >
                      Change to "Actual Release Occurred"
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="fir-grid-4" style={{ marginBottom: '14px' }}>
                      <div className="fir-field-group">
                        <label className="fir-label">Material / Trade Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Reformate, Sour Gas, Crude"
                          value={materialName}
                          onChange={(e) => setMaterialName(e.target.value)}
                          className="fir-input"
                        />
                      </div>

                      <div className="fir-field-group">
                        <label className="fir-label fir-label-required">Chemical / Common Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Hydrogen Sulfide (H2S), Propane"
                          value={chemicalName}
                          onChange={(e) => setChemicalName(e.target.value)}
                          className="fir-input"
                        />
                      </div>

                      <div className="fir-field-group">
                        <label className="fir-label">CAS Registry Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 7783-06-4" data-spellcheck="false"
                          value={casNumber}
                          onChange={(e) => setCasNumber(e.target.value)}
                          className="fir-input"
                        />
                      </div>

                      <div className="fir-field-group">
                        <label className="fir-label">Physical State at Release</label>
                        <select
                          value={physicalState}
                          onChange={(e) => setPhysicalState(e.target.value)}
                          className="fir-select"
                        >
                          <option value="Gas">Gas</option>
                          <option value="Liquid">Liquid</option>
                          <option value="Vapour">Vapour</option>
                          <option value="Two-phase">Two-phase (Liquid + Vapour)</option>
                          <option value="Solid">Solid</option>
                        </select>
                      </div>
                    </div>

                    <div className="fir-field-group" style={{ marginBottom: '14px' }}>
                      <label className="fir-label fir-label-required">
                        API RP 754 Threshold Release Category (Table 1 TRC 1 to 8)
                      </label>
                      <select
                        value={chemicalTRC}
                        onChange={(e) => setChemicalTRC(e.target.value)}
                        className="fir-select"
                        style={{ border: '2px solid var(--primary-main)', fontWeight: '600' }}
                      >
                        {TRC_OPTIONS.map(trc => <option key={trc.value} value={trc.value}>{trc.label}</option>)}
                      </select>
                    </div>

                    <div className="fir-grid-3" style={{ marginBottom: '14px' }}>
                      <div className="fir-field-group">
                        <label className="fir-label">Release Location</label>
                        <select
                          value={releaseLocation}
                          onChange={(e) => setReleaseLocation(e.target.value)}
                          className="fir-select"
                        >
                          <option value="Outdoor">Outdoor / Open Plant Structure</option>
                          <option value="Indoor">Indoor (10% indoor threshold applies)</option>
                        </select>
                      </div>

                      <div className="fir-field-group">
                        <label className="fir-label fir-label-required">Estimated Quantity in 1-Hour Period (kg)</label>
                        <input
                          type="number"
                          disabled={quantityUnknown}
                          value={quantityUnknown ? '' : quantityInOneHourKg}
                          onChange={(e) => setQuantityInOneHourKg(e.target.value)}
                          placeholder="kg in any 1-hour window"
                          className="fir-input"
                        />
                      </div>

                      <div className="fir-field-group">
                        <label className="fir-label">Total Release Quantity & Unit</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            value={estimatedQuantity}
                            onChange={(e) => setEstimatedQuantity(e.target.value)}
                            className="fir-input"
                            style={{ flex: 1 }}
                          />
                          <select
                            value={quantityUnit}
                            onChange={(e) => setQuantityUnit(e.target.value)}
                            className="fir-select"
                            style={{ width: '85px' }}
                          >
                            <option value="kg">kg</option>
                            <option value="tonnes">tonnes</option>
                            <option value="litres">litres</option>
                            <option value="bbl">bbl</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Pending Warning Toggle */}
                    <div
                      className={`fir-card ${quantityUnknown ? 'fir-card-warning' : ''}`}
                      style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: '700' }}>
                        <input
                          type="checkbox"
                          checked={quantityUnknown}
                          onChange={(e) => setQuantityUnknown(e.target.checked)}
                        />
                        <span>Release quantity is currently unknown / calculation in progress</span>
                      </label>
                      <span style={{ fontSize: '0.74rem', color: '#854d0e', fontWeight: '700' }}>
                        ⚠️ Triggers "Pending Classification – Additional Information Required"
                      </span>
                    </div>

                    {/* Operating Conditions */}
                    <div className="fir-grid-5" style={{ marginBottom: '14px' }}>
                      <div className="fir-field-group">
                        <label className="fir-label">Temp (°C)</label>
                        <input
                          type="number"
                          value={temperatureC}
                          onChange={(e) => setTemperatureC(e.target.value)}
                          className="fir-input"
                        />
                      </div>
                      <div className="fir-field-group">
                        <label className="fir-label">Oper. Press (bar)</label>
                        <input
                          type="number"
                          value={operatingPressureBar}
                          onChange={(e) => setOperatingPressureBar(e.target.value)}
                          className="fir-input"
                        />
                      </div>
                      <div className="fir-field-group">
                        <label className="fir-label">Release Press (bar)</label>
                        <input
                          type="number"
                          value={releasePressureBar}
                          onChange={(e) => setReleasePressureBar(e.target.value)}
                          className="fir-input"
                        />
                      </div>
                      <div className="fir-field-group">
                        <label className="fir-label">Duration (hours)</label>
                        <input
                          type="number"
                          value={releaseDurationHours}
                          onChange={(e) => setReleaseDurationHours(e.target.value)}
                          className="fir-input"
                        />
                      </div>
                      <div className="fir-field-group">
                        <label className="fir-label">Est. Rate (kg/hr)</label>
                        <input
                          type="number"
                          value={releaseRateKgHr}
                          onChange={(e) => setReleaseRateKgHr(e.target.value)}
                          className="fir-input"
                        />
                      </div>
                    </div>

                    <div className="fir-grid-3" style={{ marginBottom: '14px' }}>
                      <div className="fir-field-group">
                        <label className="fir-label">Was Material Recovered?</label>
                        <select
                          value={wasRecovered}
                          onChange={(e) => setWasRecovered(e.target.value)}
                          className="fir-select"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes – Fully Recovered</option>
                          <option value="Partially">Partially Recovered</option>
                        </select>
                      </div>
                      <div className="fir-field-group">
                        <label className="fir-label">Release Stopped By</label>
                        <select
                          value={stoppedBy}
                          onChange={(e) => setStoppedBy(e.target.value)}
                          className="fir-select"
                        >
                          <option value="Manual intervention">Manual intervention</option>
                          <option value="Automatic ESD">Automatic Emergency Shutdown (ESD)</option>
                          <option value="Depletion of inventory">Depletion of inventory</option>
                        </select>
                      </div>
                      <div className="fir-field-group">
                        <label className="fir-label">From Primary Containment?</label>
                        <select
                          value={isPrimaryContainment}
                          onChange={(e) => setIsPrimaryContainment(e.target.value)}
                          className="fir-select"
                        >
                          <option value="Yes">Yes – Primary Process Containment</option>
                          <option value="No">No – Secondary / Flare / Vent</option>
                          <option value="Uncertain">Uncertain</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '6px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isFlammable} onChange={(e) => setIsFlammable(e.target.checked)} />
                        <span>Flammable</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isToxic} onChange={(e) => setIsToxic(e.target.checked)} />
                        <span>Toxic</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isCorrosive} onChange={(e) => setIsCorrosive(e.target.checked)} />
                        <span>Corrosive</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={sdsAvailable} onChange={(e) => setSdsAvailable(e.target.checked)} />
                        <span>SDS Available on site</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isMixture} onChange={(e) => setIsMixture(e.target.checked)} />
                        <span>Chemical Mixture</span>
                      </label>
                    </div>

                    {isMixture && (
                      <div className="fir-field-group" style={{ marginTop: '10px' }}>
                        <label className="fir-label">Mixture Composition & Concentration:</label>
                        <input
                          type="text"
                          placeholder="e.g. 70% Methane, 20% Ethane, 10% H2S by volume"
                          value={mixtureDetails}
                          onChange={(e) => setMixtureDetails(e.target.value)}
                          className="fir-input"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECTION D - HUMAN CONSEQUENCES */}
          {activeTab === 'secD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 className="fir-section-title">Section D – Human Consequences (Injuries & Fatalities)</h3>
                <p className="fir-section-desc">Track all employee, contractor, and third-party injuries and clinical outcomes.</p>

                {/* Assessment Pending Warning Box */}
                <div
                  className={`fir-card ${hasInjuriesPending ? 'fir-card-warning' : ''}`}
                  style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: '700' }}>
                    <input
                      type="checkbox"
                      checked={hasInjuriesPending}
                      onChange={(e) => setHasInjuriesPending(e.target.checked)}
                    />
                    <span>Medical evaluation / injury recordability assessment pending</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#854d0e', fontWeight: '700' }}>
                    ⚠️ Triggers "Pending Classification – Additional Information Required"
                  </span>
                </div>

                {/* Add Injured Person Form */}
                <div className="fir-card" style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '0.86rem', display: 'block', marginBottom: '10px', color: 'var(--primary-main)' }}>
                    + Add Affected Person to Roster:
                  </strong>

                  <div className="fir-grid-3" style={{ marginBottom: '10px' }}>
                    <div className="fir-field-group">
                      <label className="fir-label">Full Name / ID</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe / Tech #481"
                        value={newInjured.name}
                        onChange={(e) => setNewInjured({ ...newInjured, name: e.target.value })}
                        className="fir-input"
                      />
                    </div>
                    <div className="fir-field-group">
                      <label className="fir-label">Affiliation / Role</label>
                      <select
                        value={newInjured.role}
                        onChange={(e) => setNewInjured({ ...newInjured, role: e.target.value })}
                        className="fir-select"
                      >
                        <option value="Employee">Company Employee</option>
                        <option value="Contractor">Contractor / Subcontractor</option>
                        <option value="Third Party">Third Party / Public Member</option>
                      </select>
                    </div>
                    <div className="fir-field-group">
                      <label className="fir-label">Injury Classification</label>
                      <select
                        value={newInjured.injuryType}
                        onChange={(e) => setNewInjured({ ...newInjured, injuryType: e.target.value })}
                        className="fir-select"
                      >
                        <option value="First Aid Case (FAC)">First Aid Case (FAC)</option>
                        <option value="Medical Treatment Case (MTC)">Medical Treatment Case (MTC) - Tier 2</option>
                        <option value="Days Away From Work (LTI)">Days Away From Work (LTI) - Tier 1</option>
                        <option value="Fatality">Fatality - Tier 1</option>
                      </select>
                    </div>
                  </div>

                  <div className="fir-grid-3" style={{ marginBottom: '10px' }}>
                    <div className="fir-field-group">
                      <label className="fir-label">Medical Status</label>
                      <select
                        value={newInjured.medicalStatus}
                        onChange={(e) => setNewInjured({ ...newInjured, medicalStatus: e.target.value })}
                        className="fir-select"
                      >
                        <option value="On-site First Aid">On-site First Aid</option>
                        <option value="Treated & Released">Treated & Released from Clinic</option>
                        <option value="Hospital Admission">Hospital Admission (Inpatient)</option>
                        <option value="Assessment Pending">Assessment Pending (Pending Classification)</option>
                        <option value="Deceased">Deceased</option>
                      </select>
                    </div>
                    <div className="fir-field-group">
                      <label className="fir-label">Days Away From Work</label>
                      <input
                        type="number"
                        value={newInjured.daysAwayFromWork}
                        onChange={(e) => setNewInjured({ ...newInjured, daysAwayFromWork: Number(e.target.value) || 0 })}
                        className="fir-input"
                      />
                    </div>
                    <div className="fir-field-group">
                      <label className="fir-label">Nature of Injury</label>
                      <input
                        type="text"
                        placeholder="e.g. 2nd degree burn, inhalation"
                        value={newInjured.natureOfInjury}
                        onChange={(e) => setNewInjured({ ...newInjured, natureOfInjury: e.target.value })}
                        className="fir-input"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddInjured}
                    className="fir-btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    + Add Person to Incident Log
                  </button>
                </div>

                {/* Table */}
                {injuredPersons.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    No injuries recorded for this incident.
                  </div>
                ) : (
                  <table className="fir-table">
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Role</th>
                        <th>Injury Type</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Days Away</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {injuredPersons.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '700' }}>{p.name}</td>
                          <td>{p.role}</td>
                          <td>
                            <span style={{
                              background: p.injuryType === 'Fatality' || p.injuryType === 'Days Away From Work (LTI)' ? '#fee2e2' : '#fef3c7',
                              color: p.injuryType === 'Fatality' || p.injuryType === 'Days Away From Work (LTI)' ? '#991b1b' : '#92400e',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.74rem'
                            }}>
                              {p.injuryType}
                            </span>
                          </td>
                          <td>{p.medicalStatus}</td>
                          <td style={{ textAlign: 'center' }}>{p.daysAwayFromWork}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveInjured(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '800' }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SECTIONS E, F & G - FIRE, EMERGENCY & BARRIERS */}
          {activeTab === 'secEFG' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section E */}
              <div>
                <h3 className="fir-section-title">Section E – Fire and Explosion Consequences</h3>
                <div className="fir-grid-4" style={{ marginBottom: '14px' }}>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={fireOccurred} onChange={(e) => setFireOccurred(e.target.checked)} />
                    <span>Fire Occurred</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={explosionOccurred} onChange={(e) => setExplosionOccurred(e.target.checked)} />
                    <span>Explosion Occurred</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={isFlashFire} onChange={(e) => setIsFlashFire(e.target.checked)} />
                    <span>Flash Fire</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={isVCE} onChange={(e) => setIsVCE(e.target.checked)} />
                    <span>Vapour Cloud Explosion (VCE)</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={equipmentDamage} onChange={(e) => setEquipmentDamage(e.target.checked)} />
                    <span>Equipment Damage</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={structuralDamage} onChange={(e) => setStructuralDamage(e.target.checked)} />
                    <span>Structural Damage</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={firefightingRequired} onChange={(e) => setFirefightingRequired(e.target.checked)} />
                    <span>Emergency Firefighting</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={unitShutdown} onChange={(e) => setUnitShutdown(e.target.checked)} />
                    <span>Process Unit Shutdown</span>
                  </label>
                </div>

                <div className="fir-grid-2">
                  <div className="fir-field-group">
                    <label className="fir-label">Estimated Direct Cost of Fire / Explosion Damage (USD)</label>
                    <input
                      type="number"
                      disabled={directCostPending}
                      value={directCostPending ? '' : directCostUSD}
                      onChange={(e) => setDirectCostUSD(e.target.value)}
                      placeholder="e.g. 125000 (T1: >=$100k, T2: >=$25k)"
                      className="fir-input"
                    />
                    <span className="fir-hint">Direct repair/replacement cost only; exclude production loss.</span>
                  </div>

                  <div className={`fir-card ${directCostPending ? 'fir-card-warning' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}>
                      <input
                        type="checkbox"
                        checked={directCostPending}
                        onChange={(e) => setDirectCostPending(e.target.checked)}
                      />
                      <span>Cost estimation still in progress / pending</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: '700' }}>
                      ⚠️ Flags Pending Classification
                    </span>
                  </div>
                </div>
              </div>

              {/* Section F */}
              <div>
                <h3 className="fir-section-title">Section F – Emergency Response & Protective Measures</h3>
                <div className="fir-grid-2" style={{ marginBottom: '12px' }}>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={onSiteEvac} onChange={(e) => setOnSiteEvac(e.target.checked)} />
                    <span>On-Site Evacuation Carried Out</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={onSiteShelter} onChange={(e) => setOnSiteShelter(e.target.checked)} />
                    <span>On-Site Shelter-in-Place Declared</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={communityEvac} onChange={(e) => setCommunityEvac(e.target.checked)} />
                    <span>Community / Off-Site Evacuation</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={communityShelter} onChange={(e) => setCommunityShelter(e.target.checked)} />
                    <span>Community Shelter-in-Place</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={publicProtective} onChange={(e) => setPublicProtective(e.target.checked)} />
                    <span>Public Protective Measures (e.g. road closure)</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={precautionaryOnly} onChange={(e) => setPrecautionaryOnly(e.target.checked)} />
                    <span>Precautionary Measure Only</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={dischargeToUnsafeLocation} onChange={(e) => setDischargeToUnsafeLocation(e.target.checked)} />
                    <span>Relief Discharged to Potentially Unsafe Location</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={liquidRainout} onChange={(e) => setLiquidRainout(e.target.checked)} />
                    <span>Liquid Carryover / Rainout from Relief Discharge</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={offSiteImpact} onChange={(e) => setOffSiteImpact(e.target.checked)} />
                    <span>Off-Site Environmental / Community Impact</span>
                  </label>
                </div>

                {/* Officially Declared Alert */}
                <div
                  className={`fir-card ${officiallyDeclared ? 'fir-card-danger' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: '700' }}>
                    <input
                      type="checkbox"
                      checked={officiallyDeclared}
                      onChange={(e) => setOfficiallyDeclared(e.target.checked)}
                    />
                    <span>Evacuation or Shelter was officially declared by public authority / fire department</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: '800' }}>
                    {officiallyDeclared ? '🚨 Mandatory Tier 1 PSE Criterion' : 'API 754 Trigger'}
                  </span>
                </div>
              </div>

              {/* Section G */}
              <div>
                <h3 className="fir-section-title">Section G – Equipment & Process Safety Barrier Information</h3>
                <div className="fir-grid-3" style={{ marginBottom: '12px' }}>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={prdOperated} onChange={(e) => setPrdOperated(e.target.checked)} />
                    <span>PRD / PSV Operated</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={sisActivated} onChange={(e) => setSisActivated(e.target.checked)} />
                    <span>SIS / Trip Demand</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={solExceeded} onChange={(e) => setSolExceeded(e.target.checked)} />
                    <span>Safe Operating Limit (SOL) Exceeded</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={emergencyDepressureOperated} onChange={(e) => setEmergencyDepressureOperated(e.target.checked)} />
                    <span>Emergency Depressurisation Operated</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={interlockTripDemand} onChange={(e) => setInterlockTripDemand(e.target.checked)} />
                    <span>Interlock Demand Recorded</span>
                  </label>
                  <label className="fir-checkbox-label">
                    <input type="checkbox" checked={safetyCriticalEquipmentFailed} onChange={(e) => setSafetyCriticalEquipmentFailed(e.target.checked)} />
                    <span>Safety-Critical Equipment Failed</span>
                  </label>
                </div>

                <div className="fir-grid-4">
                  <div className="fir-field-group">
                    <label className="fir-label">Barrier Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. PSV-2004 / SIS-101"
                      value={barrierTag}
                      onChange={(e) => setBarrierTag(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Setpoint</label>
                    <input
                      type="text"
                      placeholder="e.g. 15.0 barg"
                      value={barrierSetpoint}
                      onChange={(e) => setBarrierSetpoint(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Actual Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 17.2 barg"
                      value={barrierActualValue}
                      onChange={(e) => setBarrierActualValue(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                  <div className="fir-field-group">
                    <label className="fir-label">Barrier Performance</label>
                    <select
                      value={performedAsIntended ? 'Yes' : 'No'}
                      onChange={(e) => setPerformedAsIntended(e.target.value === 'Yes')}
                      className="fir-select"
                    >
                      <option value="Yes">Yes – Successfully Prevented</option>
                      <option value="No">No – Barrier Failed / Defective</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECTION H - NEAR-MISS ASSESSMENT */}
          {activeTab === 'secH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 className="fir-section-title">Section H – Near-Miss & Credible Potential Assessment</h3>
                <p className="fir-section-desc">
                  A near miss should not automatically be classified as a PSE. This section assesses the barrier that prevented escalation and the credible worst-case consequence.
                </p>

                {isNearMiss && (
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0369a1',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                    <span>
                      This event is flagged as a <strong>Near Miss</strong>. Please record the safeguard that successfully intervened to prevent escalation.
                    </span>
                  </div>
                )}

                <div className="fir-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="fir-card">
                    <label className="fir-label">Credible Potential for Harm?</label>
                    <select
                      value={isCrediblePotential ? 'Yes' : 'No'}
                      onChange={(e) => setIsCrediblePotential(e.target.value === 'Yes')}
                      className="fir-select"
                    >
                      <option value="Yes">Yes – Credible Potential Event</option>
                      <option value="No">No – Benign Deviation / No Potential</option>
                    </select>
                  </div>

                  <div className="fir-card">
                    <label className="fir-label">Did barrier prevent escalation?</label>
                    <select
                      value={barrierPreventedEscalation ? 'Yes' : 'No'}
                      onChange={(e) => setBarrierPreventedEscalation(e.target.value === 'Yes')}
                      className="fir-select"
                    >
                      <option value="Yes">Yes – Barrier Prevented Escalation</option>
                      <option value="No">No – Safeguard Failed / NA</option>
                    </select>
                  </div>

                  <div className="fir-card">
                    <label className="fir-label">Safeguard that prevented escalation:</label>
                    <input
                      type="text"
                      placeholder="e.g. SIS Interlock trip, PSV, Operator"
                      value={safeguardThatPrevented}
                      onChange={(e) => setSafeguardThatPrevented(e.target.value)}
                      className="fir-input"
                    />
                  </div>
                </div>

                <div className="fir-field-group">
                  <label className="fir-label">
                    Describe the Credible Worst-Case Consequence (If safeguards had failed):
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe what could reasonably have happened if the safety systems had not intervened (e.g. overpressurization leading to rupture, toxic cloud dispersing towards control room)..."
                    value={credibleWorstCaseConsequence}
                    onChange={(e) => setCredibleWorstCaseConsequence(e.target.value)}
                    className="fir-textarea"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: STAGE 2 - CLASSIFICATION ENGINE PREVIEW */}
          {activeTab === 'secPreview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 className="fir-section-title">Stage 2 – Automated PSE Classification Engine Preview</h3>
                <p className="fir-section-desc">Evaluated under ANSI/API Recommended Practice 754 (Fourth Edition / Third Edition).</p>

                {/* Main Card */}
                <div
                  className="fir-card"
                  style={{
                    background: catTheme.bg,
                    borderColor: catTheme.border,
                    borderWidth: '2px',
                    marginBottom: '16px',
                    padding: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '2.2rem' }}>{catTheme.icon}</span>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: catTheme.text }}>
                          {liveEvaluation.category}
                        </div>
                        <div style={{ fontSize: '0.86rem', color: catTheme.text, fontWeight: '700' }}>
                          {liveEvaluation.title}
                        </div>
                      </div>
                    </div>

                    {liveEvaluation.tier === 'Tier 1' && liveEvaluation.tier1SeverityPoints > 0 && (
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #ef4444',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        textAlign: 'right'
                      }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#991b1b' }}>
                          {liveEvaluation.tier1SeverityPoints} pts
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#7f1d1d', fontWeight: '700', textTransform: 'uppercase' }}>
                          Annex D Severity Rating
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#ffffff', borderRadius: '10px', padding: '14px 16px', border: `1px solid ${catTheme.border}` }}>
                    <strong style={{ fontSize: '0.85rem', color: catTheme.text, display: 'block', marginBottom: '8px' }}>
                      Automated Evaluation Rationale:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.84rem', color: '#1e293b' }}>
                      {liveEvaluation.reasons?.map((reason, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Why Is Classification Pending Checklist Card */}
                  {(liveEvaluation.category === 'Pending Classification' || liveEvaluation.tier === 'Pending Classification') && (
                    <div style={{
                      marginTop: '14px',
                      background: '#fffbeb',
                      border: '1.5px solid #f59e0b',
                      borderRadius: '10px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>⏳</span> Why is this marked "Pending Classification"?
                        </strong>
                        <button
                          type="button"
                          onClick={() => setShowHelpModal(true)}
                          style={{
                            background: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          📘 Open Classification Guide →
                        </button>
                      </div>

                      <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#78350f', lineHeight: 1.5 }}>
                        API RP 754 states: <em>"If any mandatory information is missing, the software should display Pending Classification – Additional Information Required, rather than automatically declaring the event as Near Miss or Non-PSE."</em>
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(liveEvaluation.reasons && liveEvaluation.reasons.length > 0 ? liveEvaluation.reasons : [
                          'Initial report intake: Release quantity, medical injury assessment, or direct cost is pending.'
                        ]).map((reason, i) => (
                          <div key={i} style={{
                            background: '#ffffff',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '0.82rem',
                            color: '#92400e',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>⚠️</span> {reason}
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: '6px' }}>
                        💡 <strong>Reporter Guidance:</strong> You can submit this report now as <strong>Pending Classification</strong>. During the 7-day manager review and Stage 5 investigation, the Cross-Functional Team (CFT) will attach verified engineering mass-balance calculations, lab reports, or doctor's certifications to resolve the Tier.
                      </div>
                    </div>
                  )}
                </div>

                {/* Pre-submission Summary */}
                <div className="fir-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>
                      {incidentToEdit ? 'Ready to save updated incident details?' : 'Ready to submit First Incident Report?'}
                    </strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {incidentToEdit
                        ? 'Saving will update the initial incident record and re-evaluate the API RP 754 tier rating.'
                        : 'Submission saves Section A–H records, initiates the immutable audit trail, and starts the 7-Day Manager Review clock.'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="fir-btn-submit"
                  >
                    {loading ? 'Saving...' : (incidentToEdit ? '💾 Save Changes →' : 'Submit Incident Report (FIR) →')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="fir-modal-footer">
          <div className="fir-footer-status">
            Step <strong>{currentStepIdx + 1} of {steps.length}</strong>: {steps[currentStepIdx].label} | Status: <strong>Open / Draft</strong>
          </div>

          <div className="fir-footer-actions">
            <button type="button" onClick={onClose} className="fir-btn-secondary">
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="fir-btn-secondary"
            >
              ← Previous
            </button>

            {currentStepIdx < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="fir-btn-primary"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="fir-btn-submit"
              >
                {loading ? 'Saving...' : (incidentToEdit ? '💾 Save Changes' : 'Submit FIR →')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    <Api754HelpModal
      isOpen={showHelpModal}
      onClose={() => setShowHelpModal(false)}
      incident={incidentToEdit ? { ...incidentToEdit, api754Classification: liveEvaluation } : { title, api754Classification: liveEvaluation }}
      initialTab={(liveEvaluation.category === 'Pending Classification' || liveEvaluation.tier === 'Pending Classification') ? 'pending' : 'tiers'}
    />
    </>
  );
}
