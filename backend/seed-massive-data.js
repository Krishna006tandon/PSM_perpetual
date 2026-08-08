const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pha_db').then(() => console.log('MongoDB Connected for Massive CP-1 IVLD Seeding...'))
  .catch(err => console.log(err));

const Study = require('./models/Study');
const Node = require('./models/Node');
const Deviation = require('./models/Deviation');
const Cause = require('./models/Cause');
const Scenario = require('./models/Scenario');
const TeamMember = require('./models/TeamMember');
const Session = require('./models/Session');
const StudyRevision = require('./models/StudyRevision');
const StudyDocument = require('./models/StudyDocument');

const generateData = async () => {
  try {
    console.log("Starting massive data generation (CP-1 IVLD HAZOP Replica)...");
    
    const User = require('./models/User');
    const allUsers = await User.find({});
    
    // Get unique company codes
    const companyCodes = [...new Set(allUsers.map(u => u.companyCode).filter(Boolean))];
    if (companyCodes.length === 0) companyCodes.push("IVLD");

    for (const userCompanyCode of companyCodes) {
      console.log(`Generating study for company code: ${userCompanyCode}`);

      // 1. Create Study
    const study = new Study({
      studyName: "CP-1 IVLD HAZOP",
      projectNumber: "1000008018",
      facility: "Indorama (Company)",
      facilityName: "Indorama (Company)",
      companyCode: userCompanyCode,
      studyCoordinator: "Avinash Gore",
      plantUnit: "Integrated PET / IDPI Egypt",
      scope: "Complete HAZOP study of Plant 1",
      objective: "The objective of a HAZOP (Hazard and Operability) study is to systematically identify potential hazards and operability issues in a process or system to improve safety and efficiency. The key objectives include: Identify Hazards, Assess Operability Issues, Analyze Causes & Consequences, Improve Safety & Risk Management, Enhance Process Reliability.",
      executiveSummary: "This report was prepared for IVLD Egypt by Pragna Consultants Pvt. Ltd. (PC), India. This report documents the results of the HAZOP study conducted at the IVLD Egypt facility. IVLD Egypt owns and operates an industrial processing plant equipped with heat transfer systems, critical process units, and supporting utilities.",
      assumptions: [
        { assumption: "The process will work in accordance to its design.", valid: "Y", comments: "This plant has operated for 8 years, Since Indorama Ventures tookover the Dhunseri plant. Equipment works as expected, and production has consistently met targets." },
        { assumption: "The equipment is suitable for the intended use, and is operated, maintained, and periodically inspected in accordance with applicable standards and guidelines.", valid: "Y", comments: "All equipment in this unit is subjected to a preventative maintenance programme." },
        { assumption: "Written operating procedures are followed.", valid: "Y", comments: "In general, there are no known issues with operating procedures." },
        { assumption: "The plant is not operated outside its operating envelope.", valid: "Y", comments: "Any changes to the operating envelope, or requirements to operate outside the envelope, are governed by the MOC process." },
        { assumption: "Operators are competent and well trained.", valid: "Y", comments: "Training is provided to all new personnel as part of the initial qualification process." }
      ]
    });
    await study.save();
    console.log(`Created Study: ${study.studyName}`);

    // 2. Team Members
    const team = [
      { studyId: study._id, companyCode: userCompanyCode, fullName: "Avinash Gore", role: "HAZOP Chairman", discipline: "PSM", email: "avinash@example.com", expertise: "PSM" },
      { studyId: study._id, companyCode: userCompanyCode, fullName: "Harshit Mandal", role: "HAZOP Scribe", discipline: "PSM", email: "harshit@example.com", expertise: "HAZOP Scribe work" },
      { studyId: study._id, companyCode: userCompanyCode, fullName: "Yogesh Galaft", role: "Deputy Manager", discipline: "Production", email: "yogesh@example.com", expertise: "Process/ Production" }
    ];
    
    // Add all actual users in this company code to the team so they can see it
    const companyUsers = allUsers.filter(u => u.companyCode === userCompanyCode);
    for (const u of companyUsers) {
      team.push({ studyId: study._id, companyCode: userCompanyCode, fullName: u.name || "User", role: u.role || "Member", discipline: "Engineering", email: u.email, expertise: "General" });
    }

    await TeamMember.insertMany(team);

    // 3. Sessions
    const sessions = [
      { studyId: study._id, date: "23-Apr-25", duration: "7.75 hrs", description: "The HAZOP Study for the CP was initiated with the corresponding P&ID. The study began at 9:15 AM, starting with the first node...", placesUsed: "Session: 1.1, 2.1, 3.1, 4.1, 5.1" },
      { studyId: study._id, date: "24-Apr-25", duration: "8.50 hrs", description: "The HAZOP study for the CP unit continued with the initiation of Node No. 6. During the first half, the team successfully completed...", placesUsed: "Session: 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1" },
      { studyId: study._id, date: "26-Apr-25", duration: "8.25 hrs", description: "The HAZOP session commenced with Node 14 (Paste Preparation)...", placesUsed: "Session: 14.1, 15.1" },
      { studyId: study._id, date: "27-Apr-25", duration: "8.00 hrs", description: "The HAZOP study continued with the evaluation of Node 17 (EST Process Column)...", placesUsed: "Session: 17.1, 18.1, 19.1" },
      { studyId: study._id, date: "28-Apr-25", duration: "8.75 hrs", description: "The session commenced with Node 20 of the Prepolymerization section...", placesUsed: "Session: 20.1, 21.1, 22.1, 23.1, 24.1, 25.1, 27.1, 28.1" }
    ];
    await Session.insertMany(sessions);

    // 4. Revisions
    const revisions = [
      { studyId: study._id, revision: "1.00", startDate: "23-Apr-25", endDate: "24-Jun-25", changesMade: "Report Preparation", changedBy: "Avinash Gore", reviewBy: "Team", approvedBy: "Site Head" }
    ];
    await StudyRevision.insertMany(revisions);

    // 5. Documents
    const docs = [
      { studyId: study._id, documentType: "P&ID", originalFileName: "112120-PR03-CP-0100", revisionNumber: "3", placesUsed: "Nodes: 1", comment: "EG Tankfarm" },
      { studyId: study._id, documentType: "P&ID", originalFileName: "112120-PR03-CP-0101", revisionNumber: "4", placesUsed: "Nodes: 3", comment: "EG Distribution" },
      { studyId: study._id, documentType: "P&ID", originalFileName: "112120-PRO3-CP-1-0102", revisionNumber: "3", placesUsed: "Nodes: 4, 5", comment: "Recycle EG" },
      { studyId: study._id, documentType: "P&ID", originalFileName: "112120-PR03-CP-0103", revisionNumber: "4", placesUsed: "Nodes: 2", comment: "DEG Unloading" },
      { studyId: study._id, documentType: "P&ID", originalFileName: "112120-PR03-CP-1-0201", revisionNumber: "3", placesUsed: "Nodes: 6", comment: "PTA Unloading" }
    ];
    await StudyDocument.insertMany(docs);

    // 6. Nodes & Scenarios
    const nodeTitles = [
      "EG Tankfarm", "DEG Unloading and storage", "EG Distribution", "Recycle EG collection", "Crude EG and Blowdown tank",
      "PTA Unloading and Conveying", "Catalyst Preparation and feed", "DEG Preparation and feed", "Stabilizer preparation and feed", "Blue toner preparation and feed",
      "Red toner preparation and feed", "TI Catalyst preparation and feed", "FRH preparation and feed", "CP1 Paste preparation system", "CP1 Esterification - 1",
      "CP1 Esterification - 2", "CP1 Esterification process column", "CP1 Polycondensation (Prepoly) - 1", "CP1 Prepoly-1 EG recovery system", "CP1 Polycondensation (Prepoly) - 2",
      "CP1 Prepoly-2 EG recovery system", "CP1 Pre-polymer transfer line", "CP1 Finisher", "CP1 Finisher EG Recovery system", "Prepoly-1 vacuum system",
      "CP1 Glycol jet vacuum system", "CP1 Polycondensation vacuum system", "CP1 Ejector EG Evaporator system", "CP1 Off gas Scrubbing system", "CP1 Polymer Transfer Line",
      "CP1 Chips Granulation", "CP1 DM Water System", "CP1 APET Chips Conveying, Storage & Bagging", "CP1 Prepoly 2 Shaft sealing system", "CP1 Finisher Inlet Shaft Sealing System",
      "CP1 Finisher Outlet Shaft Sealing System", "SSP1 Product Chips Conveying, Storage & Bagging", "Stripping Column System", "Filter Cleaning System", "DM, Raw & Potable Water Distribution",
      "Raw Water Storage and Transfer", "Fuel Distribution Part-1 HSD", "Fuel Distribution Part-2 fuel gas", "CP & SSP Effluent Handling", "Amorphous Blending for CP-1",
      "Amorphous Charging System", "New Water loop for critical HTM Pumps"
    ];

    const risks = [
      {s: "7", l: "F", rr: "4", c: "EH"},
      {s: "6", l: "G", rr: "2", c: "EH"},
      {s: "8", l: "F", rr: "3", c: "EH"},
      {s: "5", l: "G", rr: "2", c: "EH"},
      {s: "4", l: "F", rr: "1", c: "EHS-2"},
    ];

    for (let i = 0; i < nodeTitles.length; i++) {
      const nodeTitle = nodeTitles[i];
      const nodeNum = i + 1;
      
      const node = new Node({
        studyId: study._id,
        nodeNumber: nodeNum.toString(),
        nodeTitle: nodeTitle,
        description: `Design Conditions: Capacity 6000m3, Temp 120 C. P&ID Ref: 112120-PR03-CP-${nodeNum.toString().padStart(4, '0')}`,
        intention: `Maintain safe operations in ${nodeTitle}`,
        drawings: `112120-PR03-CP-${nodeNum.toString().padStart(4, '0')}`,
        equipments: [
          { tagNo: `T0${nodeNum}01`, equipmentName: `${nodeTitle} Tank`, designTemp: "120C", designPressure: "Atm" },
          { tagNo: `P0${nodeNum}01A/B`, equipmentName: `${nodeTitle} Pump`, designTemp: "60C", designPressure: "0.8 MPa" }
        ]
      });
      await node.save();

      // We need about 538 deviations total (approx 11 per node). We'll generate 11 per node.
      const devTypes = [
        'No or less flow', 'More flow', 'Reverse Flow', 'Low level', 'High level',
        'Low pressure', 'High pressure', 'Low temperature', 'High temperature',
        'Other - Leakage', 'Other - Maintenance'
      ];

      for (let d = 0; d < devTypes.length; d++) {
        const dt = devTypes[d];
        const deviation = new Deviation({
          studyId: study._id,
          nodeId: node._id,
          parameter: dt.split(' ')[1] || 'Flow',
          deviationAuto: dt,
        });
        await deviation.save();

        // 696 total causes / 47 nodes = ~14.8 causes per node
        // Let's do 1 cause for most, 2 for some. We'll do 1 cause per deviation.
        const cause = new Cause({
          studyId: study._id,
          nodeId: node._id,
          deviationId: deviation._id,
          description: `Failure of Pump P0${nodeNum}01A/B or inadvertent valve closure.`
        });
        await cause.save();

        const risk = risks[d % risks.length];
        
        // Generate recommendation randomly (~62 recs total across 538 scenarios = ~11% chance)
        const hasRec = Math.random() < 0.12;
        let recs = [];
        if (hasRec) {
          recs.push({
            recommendation: `Install a level transmitter (LT) with high level alarm and an interlock system to automatically close control valves LV-08310 in the ${nodeTitle} stream.`,
            type: "A",
            personResponsible: "HAZOP",
            targetDate: ""
          });
        }

        const scen = new Scenario({
          studyId: study._id,
          nodeId: node._id,
          deviationId: deviation._id,
          causeId: cause._id,
          consequencesImmediate: `High level in ${nodeTitle} leading to overflow.`,
          consequencesUltimate: "Potential exposure to operator and environmental concern.",
          inherentRiskS: risk.s,
          inherentRiskL: risk.l,
          inherentRiskRR: risk.rr,
          presentProtection: `Level transmitter LT-010010A/B/C are available.\nPPEs mandatory for working personnel.`,
          mitigatedRiskS: (parseInt(risk.s) - 1).toString(),
          mitigatedRiskL: risk.l,
          mitigatedRiskRR: (parseInt(risk.rr) - 1).toString(),
          additionalProtection: hasRec ? recs[0].recommendation : "",
          residualRiskS: hasRec ? (parseInt(risk.s) - 2).toString() : "",
          residualRiskL: hasRec ? risk.l : "",
          residualRiskRR: hasRec ? (parseInt(risk.rr) - 2).toString() : "",
          remarks: hasRec ? "Update P&ID to reflect the new interlock." : "",
          recommendations: recs,
          status: "Proposed"
        });
        await scen.save();
      }
    }
    } // end of companyCode loop

    console.log("Massive CP-1 IVLD Replica generation complete!");
    console.log(`\n\n---> Please refresh the app, select the study: "${study.studyName}", and click '📥 PDF' <---`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

generateData();
