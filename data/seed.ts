/**
 * Single source of truth for demo seed data.
 * Used by: npm run gen:seed → supabase/seed.sql
 *          POST /api/seed (in-app reset)
 *
 * All payers, patients, and claims are fictional / synthetic.
 */

export type SeedPolicy = {
  id: string;
  payer: string;
  policy_code: string;
  title: string;
  body: string;
};

export type SeedClaim = {
  id: string;
  patient_alias: string;
  cpt_codes: string[];
  billed_amount: number;
  payer_name: string;
  carc_code: string;
  rarc_code: string | null;
  denial_reason: string;
  denied_at: string;
  status: "denied" | "analyzed" | "appeal_ready" | "uphold";
  policy_id: string;
  /** Expected pipeline verdict — used by eval, not stored in DB. */
  expected_verdict: "appeal" | "weak" | "uphold_denial";
};

export type SeedNote = {
  id: string;
  claim_id: string;
  note_type: string;
  authored_at: string;
  text: string;
};

export const SEED_POLICIES: SeedPolicy[] = [
  {
    id: "POL-ORTHO-112",
    payer: "Meridian Health – AutoReview",
    policy_code: "ORTHO-112",
    title: "Total Knee Arthroplasty Medical Necessity",
    body: `Meridian Health – AutoReview Policy ORTHO-112: Total Knee Arthroplasty (CPT 27447).

Coverage criteria: Total knee arthroplasty is considered medically necessary when BOTH of the following are documented:

1. Radiographic evidence of advanced osteoarthritis (Kellgren-Lawrence grade 3 or 4) of the affected knee; AND
2. Failure of at least 12 weeks of documented conservative therapy, which may include physical therapy, NSAIDs, activity modification, or intra-articular injections.

EXCEPTION — KL grade 4 waiver: The 12-week conservative therapy requirement is waived when weight-bearing radiographs demonstrate Kellgren-Lawrence grade 4 osteoarthritis with bone-on-bone articulation. In such cases, the radiographic findings alone establish medical necessity for total knee arthroplasty, provided the operative report and clinical notes corroborate severe symptomatic disease.

Non-coverage: Total knee arthroplasty performed for mild osteoarthritis (KL grade 1–2) without documented conservative failure is not covered.`,
  },
  {
    id: "POL-CC-201",
    payer: "Corvalis Mutual – ClaimSense AI",
    policy_code: "CC-201",
    title: "Critical Care Services (99291)",
    body: `Corvalis Mutual – ClaimSense AI Policy CC-201: Critical Care Evaluation and Management (CPT 99291).

Critical care is defined as the direct delivery by a physician of medical care for a critically ill or critically injured patient. A critical illness or injury acutely impairs one or more vital organ systems such that there is a high probability of imminent or life-threatening deterioration.

Coverage criteria for CPT 99291:
1. Documented acute organ dysfunction (e.g., cardiovascular, respiratory, renal, or neurologic) meeting criteria for critical illness; AND
2. At least 30 minutes of critical care time must be documented by the attending physician on the calendar day of service.

Septic shock meeting Sepsis-3 criteria (suspected or documented infection plus vasopressor requirement to maintain MAP ≥ 65 mmHg and serum lactate > 2 mmol/L despite adequate fluid resuscitation) constitutes qualifying organ dysfunction under this policy.

Downcoding to a lower level of E/M is not appropriate when both organ dysfunction and the time threshold are met and documented.`,
  },
  {
    id: "POL-NEURO-09",
    payer: "Meridian Health – AutoReview",
    policy_code: "NEURO-09",
    title: "Brain MRI with and without Contrast for Headache",
    body: `Meridian Health – AutoReview Policy NEURO-09: MRI Brain with and without Contrast (CPT 70553) for Headache Evaluation.

Standard coverage: MRI brain is covered for chronic or recurrent headache only after a documented trial of conservative headache management (analgesics, lifestyle modification, and/or specialist referral) lasting at least 4 weeks, unless a red-flag exception applies.

RED-FLAG EXCEPTION: Conservative management is NOT required, and MRI brain is considered medically necessary on an urgent basis, when ANY of the following red-flag features are documented:
- Thunderclap onset of headache (sudden, maximal intensity within seconds to minutes);
- New focal neurologic deficit, including cranial nerve palsy (e.g., cranial nerve III palsy with ptosis, anisocoria, or ophthalmoplegia);
- Sudden severe headache with altered mental status or meningismus;
- Headache in the setting of known or suspected subarachnoid hemorrhage risk.

Thunderclap headache with acute cranial nerve III palsy constitutes a red-flag presentation warranting immediate neuroimaging without a prior conservative management trial.`,
  },
  {
    id: "POL-CARD-33",
    payer: "Aether Guard Life – PriorAuthX",
    policy_code: "CARD-33",
    title: "Primary Prevention ICD Implant",
    body: `Aether Guard Life – PriorAuthX Policy CARD-33: Implantable Cardioverter-Defibrillator for Primary Prevention (CPT 33249).

Primary-prevention ICD implantation is covered when ALL of the following criteria are met:
1. Left ventricular ejection fraction (LVEF) ≤ 35% measured by echocardiography, radionuclide imaging, or cardiac MRI; AND
2. Measurement obtained ≥ 40 days after acute myocardial infarction (MI); AND
3. Patient has been on guideline-directed medical therapy (GDMT) for heart failure with reduced ejection fraction for ≥ 3 months; AND
4. NYHA functional class II or III symptoms (or class I with prior cardiac arrest or inducible VT in selected indications).

LVEF criteria: An LVEF of 35% or less satisfies the ejection-fraction requirement. An LVEF of 28% measured 52 days post-MI in a patient on 4 months of GDMT with NYHA class II symptoms meets all CARD-33 primary-prevention criteria.`,
  },
  {
    id: "POL-SPINE-04",
    payer: "Corvalis Mutual – ClaimSense AI",
    policy_code: "SPINE-04",
    title: "Lumbar Spine MRI Without Contrast",
    body: `Corvalis Mutual – ClaimSense AI Policy SPINE-04: Lumbar MRI Without Contrast (CPT 72148).

Coverage criteria: Lumbar spine MRI is considered medically necessary for low back pain when EITHER:
1. At least 6 weeks of documented conservative care (physical therapy, NSAIDs, activity modification) has been completed without adequate improvement; OR
2. Red-flag features are present (progressive neurologic deficit, saddle anesthesia, bowel/bladder dysfunction, suspected malignancy, infection, or fracture).

Non-coverage: Lumbar MRI ordered for nonspecific low back pain of less than 6 weeks' duration in the absence of neurologic deficit or red-flag features is not covered under SPINE-04. Nine days of low back pain with a normal neurologic examination and no documented red flags does not meet medical necessity criteria.`,
  },
];

export const SEED_CLAIMS: SeedClaim[] = [
  {
    id: "CLM-001",
    patient_alias: "Patient A-7421",
    cpt_codes: ["27447"],
    billed_amount: 34500,
    payer_name: "Meridian Health – AutoReview",
    carc_code: "CO-50",
    rarc_code: "N115",
    denial_reason:
      "12 weeks documented conservative therapy not met. Procedure does not meet medical necessity criteria per ORTHO-112.",
    denied_at: "2026-08-14T16:22:00Z",
    status: "denied",
    policy_id: "POL-ORTHO-112",
    expected_verdict: "appeal",
  },
  {
    id: "CLM-002",
    patient_alias: "Patient B-3390",
    cpt_codes: ["99291"],
    billed_amount: 18900,
    payer_name: "Corvalis Mutual – ClaimSense AI",
    carc_code: "CO-150",
    rarc_code: "N362",
    denial_reason:
      "Downcoded from critical care (99291) to lower level of service. Documentation does not support critical care criteria per CC-201.",
    denied_at: "2026-09-02T11:05:00Z",
    status: "denied",
    policy_id: "POL-CC-201",
    expected_verdict: "appeal",
  },
  {
    id: "CLM-003",
    patient_alias: "Patient C-1188",
    cpt_codes: ["70553"],
    billed_amount: 6400,
    payer_name: "Meridian Health – AutoReview",
    carc_code: "CO-50",
    rarc_code: "N115",
    denial_reason:
      "Conservative headache management not attempted prior to advanced imaging. Does not meet NEURO-09 medical necessity.",
    denied_at: "2026-07-28T09:40:00Z",
    status: "denied",
    policy_id: "POL-NEURO-09",
    expected_verdict: "appeal",
  },
  {
    id: "CLM-004",
    patient_alias: "Patient D-5502",
    cpt_codes: ["33249"],
    billed_amount: 42000,
    payer_name: "Aether Guard Life – PriorAuthX",
    carc_code: "CO-50",
    rarc_code: "N115",
    denial_reason:
      "LVEF criteria not met for primary-prevention ICD. Claim denied under CARD-33.",
    denied_at: "2026-08-30T14:18:00Z",
    status: "denied",
    policy_id: "POL-CARD-33",
    expected_verdict: "appeal",
  },
  {
    id: "CLM-005",
    patient_alias: "Patient E-9914",
    cpt_codes: ["72148"],
    billed_amount: 2100,
    payer_name: "Corvalis Mutual – ClaimSense AI",
    carc_code: "CO-50",
    rarc_code: "N115",
    denial_reason:
      "Lumbar MRI ordered without 6 weeks of conservative care and without red-flag indications per SPINE-04.",
    denied_at: "2026-09-10T08:55:00Z",
    status: "denied",
    policy_id: "POL-SPINE-04",
    expected_verdict: "uphold_denial",
  },
];

export const SEED_NOTES: SeedNote[] = [
  // ─── CLM-001: Total knee arthroplasty ───────────────────────────────────
  {
    id: "N-101",
    claim_id: "CLM-001",
    note_type: "physical_therapy",
    authored_at: "2026-03-02T09:14:00Z",
    text: `PT INITIAL EVALUATION — Right Knee OA
Patient A-7421 presents with progressive right knee pain limiting ambulation to <2 blocks. Started supervised physical therapy today focusing on quadriceps strengthening, range-of-motion, and gait training. Plan: 2–3 sessions/week. Visit 1 of planned conservative course.`,
  },
  {
    id: "N-102",
    claim_id: "CLM-001",
    note_type: "physical_therapy",
    authored_at: "2026-04-10T10:30:00Z",
    text: `PT PROGRESS NOTE — Week 6
Patient continues twice-weekly PT. Completed 12 sessions since 2026-03-02. Pain remains 7/10 with weight-bearing. Minimal improvement in functional reach. Continuing conservative therapy as ordered.`,
  },
  {
    id: "N-103",
    claim_id: "CLM-001",
    note_type: "physical_therapy",
    authored_at: "2026-06-09T11:00:00Z",
    text: `PT DISCHARGE / SUMMARY — Week 14
Patient A-7421 completed 14 weeks of supervised physical therapy (28 visits spanning 2026-03-02 through 2026-06-09). Despite adherence, pain persists at 8/10 and ambulation remains limited. Conservative therapy has failed. Referred back to orthopedics for surgical evaluation.`,
  },
  {
    id: "N-104",
    claim_id: "CLM-001",
    note_type: "radiology",
    authored_at: "2026-06-12T15:45:00Z",
    text: `RADIOLOGY REPORT — Weight-Bearing Bilateral Knee X-Rays
INDICATION: Severe right knee osteoarthritis, surgical planning.
FINDINGS: Right knee demonstrates severe joint-space obliteration of the medial compartment with bone-on-bone articulation. Osteophyte formation and subchondral sclerosis present. Kellgren-Lawrence grade 4 osteoarthritis of the right knee. Left knee KL grade 2.
IMPRESSION: Advanced (KL grade 4) right knee osteoarthritis with bone-on-bone medial compartment disease.`,
  },
  {
    id: "N-105",
    claim_id: "CLM-001",
    note_type: "operative_note",
    authored_at: "2026-06-20T08:00:00Z",
    text: `ORTHOPEDIC PRE-OP / OPERATIVE NOTE
Indication: End-stage right knee OA refractory to 14 weeks of PT and NSAIDs. Weight-bearing films show Kellgren-Lawrence grade 4, bone-on-bone. Proceeding with right total knee arthroplasty (CPT 27447). Informed consent obtained.`,
  },

  // ─── CLM-002: Critical care 99291 ───────────────────────────────────────
  {
    id: "N-201",
    claim_id: "CLM-002",
    note_type: "ed_triage",
    authored_at: "2026-08-18T02:14:00Z",
    text: `ED TRIAGE
Patient B-3390 arrives via EMS with fever, hypotension, and altered mentation. Suspected sepsis. Triage acuity ESI-1. Immediate resuscitation bay.`,
  },
  {
    id: "N-202",
    claim_id: "CLM-002",
    note_type: "labs",
    authored_at: "2026-08-18T02:28:00Z",
    text: `LAB RESULTS — Critical Care Panel
Serum lactate 4.8 mmol/L (ref < 2.0). WBC 22.1. Creatinine 2.1 (baseline 0.9). Blood cultures pending. Elevated lactate consistent with tissue hypoperfusion.`,
  },
  {
    id: "N-203",
    claim_id: "CLM-002",
    note_type: "ed_physician",
    authored_at: "2026-08-18T02:45:00Z",
    text: `ED PHYSICIAN CRITICAL CARE NOTE
Patient received 30 mL/kg crystalloid bolus (2.4 L) for presumed septic shock. Despite adequate fluid resuscitation, MAP remained < 65 mmHg (recorded MAP 58 mmHg). Norepinephrine started at 0.05 mcg/kg/min and titrated to maintain MAP ≥ 65. Meets Sepsis-3 septic shock criteria: infection + vasopressor requirement + lactate > 2 mmol/L after fluids.`,
  },
  {
    id: "N-204",
    claim_id: "CLM-002",
    note_type: "critical_care_attestation",
    authored_at: "2026-08-18T04:10:00Z",
    text: `CRITICAL CARE TIME ATTESTATION
I personally provided 68 minutes of critical care time at the bedside managing septic shock, vasopressor titration, fluid resuscitation, and antimicrobial selection for Patient B-3390 on this date. Time exclusive of separately billable procedures. CPT 99291 supported.`,
  },

  // ─── CLM-003: Brain MRI thunderclap / CN III ────────────────────────────
  {
    id: "N-301",
    claim_id: "CLM-003",
    note_type: "ed_physician",
    authored_at: "2026-07-15T19:22:00Z",
    text: `ED PHYSICIAN NOTE — Neurologic Emergency
Patient C-1188 presents with sudden-onset, maximal-intensity headache described as "the worst headache of my life," peaking within seconds (thunderclap onset). Onset while at rest approximately 90 minutes prior to arrival. No prior migraine history matching this character.`,
  },
  {
    id: "N-302",
    claim_id: "CLM-003",
    note_type: "neurology",
    authored_at: "2026-07-15T19:40:00Z",
    text: `NEUROLOGY CONSULT — ED
Exam notable for acute cranial nerve III palsy on the right: complete ptosis, pupil dilated and poorly reactive, eye "down and out." No other focal motor deficit. Thunderclap headache plus new CN III palsy is a red-flag presentation concerning for posterior communicating artery aneurysm. Urgent MRI brain with and without contrast (CPT 70553) ordered; conservative headache management is not appropriate prior to imaging.`,
  },
  {
    id: "N-303",
    claim_id: "CLM-003",
    note_type: "radiology",
    authored_at: "2026-07-15T21:05:00Z",
    text: `MRI BRAIN W/ AND W/O CONTRAST — RESULTS
Study performed emergently. Findings discussed with neurology. Clinical indication: thunderclap headache with acute CN III palsy.`,
  },

  // ─── CLM-004: Primary prevention ICD ────────────────────────────────────
  {
    id: "N-401",
    claim_id: "CLM-004",
    note_type: "discharge_summary",
    authored_at: "2026-02-10T12:00:00Z",
    text: `HOSPITAL DISCHARGE SUMMARY — Acute MI
Patient D-5502 admitted 2026-02-08 with STEMI, s/p primary PCI to LAD. Peak troponin elevated. Discharged on GDMT: carvedilol 12.5 mg BID, lisinopril 10 mg daily, spironolactone 25 mg daily, and high-intensity statin. MI date documented as 2026-02-08.`,
  },
  {
    id: "N-402",
    claim_id: "CLM-004",
    note_type: "echocardiogram",
    authored_at: "2026-04-01T14:30:00Z",
    text: `TRANSTHORACIC ECHOCARDIOGRAM
Indication: Post-MI LV function assessment.
Date of study: 2026-04-01 (52 days after MI dated 2026-02-08).
FINDINGS: Severely reduced LV systolic function. LVEF estimated at 28% by biplane Simpson method. Regional wall motion abnormalities in LAD territory. Mild MR.
IMPRESSION: LVEF 28%, 52 days post-MI.`,
  },
  {
    id: "N-403",
    claim_id: "CLM-004",
    note_type: "cardiology",
    authored_at: "2026-06-12T10:15:00Z",
    text: `CARDIOLOGY FOLLOW-UP — Heart Failure / Device Clinic
Patient has been on continuous guideline-directed medical therapy (carvedilol, ACE inhibitor, MRA, SGLT2i added 2026-03) for 4 months since MI. Remains NYHA class II with dyspnea on moderate exertion. LVEF 28% on echo 52 days post-MI. Meets primary-prevention ICD criteria. Proceeding with ICD implant (CPT 33249).`,
  },
  {
    id: "N-404",
    claim_id: "CLM-004",
    note_type: "operative_note",
    authored_at: "2026-06-18T09:00:00Z",
    text: `ICD IMPLANT OPERATIVE NOTE
Indication: Primary prevention, LVEF 28%, ≥40 days post-MI, ≥3 months GDMT, NYHA II. Dual-chamber ICD implanted without complication.`,
  },

  // ─── CLM-005: Lumbar MRI — CORRECT denial ───────────────────────────────
  {
    id: "N-501",
    claim_id: "CLM-005",
    note_type: "office_visit",
    authored_at: "2026-09-01T13:20:00Z",
    text: `PRIMARY CARE OFFICE VISIT
Patient E-9914 reports 9 days of low back pain after lifting boxes at home. Pain is axial, non-radiating. Denies bowel or bladder dysfunction, saddle anesthesia, fever, night pain, or unexplained weight loss. Neurologic examination: strength 5/5 in all lower extremity myotomes, reflexes symmetric, sensation intact, negative straight-leg raise bilaterally. No red flags identified. Assessment: acute nonspecific mechanical low back pain, day 9. Plan: NSAIDs, activity modification, home exercises. MRI not indicated at this time per guidelines; reconsider if no improvement after 6 weeks of conservative care.`,
  },
  {
    id: "N-502",
    claim_id: "CLM-005",
    note_type: "order",
    authored_at: "2026-09-01T13:35:00Z",
    text: `IMAGING ORDER — Lumbar MRI without contrast (CPT 72148)
Ordered same day as office visit for 9 days of low back pain. Clinical indication listed as "low back pain." No neurologic deficit. No red flags documented on exam.`,
  },
  {
    id: "N-503",
    claim_id: "CLM-005",
    note_type: "office_visit",
    authored_at: "2026-09-08T09:00:00Z",
    text: `FOLLOW-UP NOTE
Patient returns stating pain persists. Still only 16 days since onset. Exam again normal. Patient requests MRI; order already placed 2026-09-01. Counseling given that early MRI for nonspecific LBP without red flags is low-yield. No PT yet initiated.`,
  },
];
