/**
 * Pre-generated, human-reviewed appeal analyses for demo fallback.
 * Quotes are verbatim substrings of seed notes/policies so validators pass.
 * latency_ms values are representative of a local Gemma 3 run.
 */
import type { Analysis } from "@/lib/schemas";

export type CachedAppeal = {
  id: string;
  claim_id: string;
  analysis: Analysis;
  model: string;
  latency_ms: number;
  created_at: string;
};

export const CACHED_APPEALS: CachedAppeal[] = [
  {
    id: "APL-CACHE-001",
    claim_id: "CLM-001",
    model: "gemma3",
    latency_ms: 4820,
    created_at: "2026-09-01T12:00:00Z",
    analysis: {
      verdict: "appeal",
      confidence: 0.92,
      denial_reason:
        "12 weeks documented conservative therapy not met. Procedure does not meet medical necessity criteria per ORTHO-112.",
      policy_clause: {
        policy_code: "ORTHO-112",
        quote:
          "The 12-week conservative therapy requirement is waived when weight-bearing radiographs demonstrate Kellgren-Lawrence grade 4 osteoarthritis with bone-on-bone articulation.",
      },
      evidence: [
        {
          quote:
            "Patient A-7421 completed 14 weeks of supervised physical therapy (28 visits spanning 2026-03-02 through 2026-06-09).",
          note_id: "N-103",
          timestamp: "2026-06-09T11:00:00Z",
        },
        {
          quote:
            "Kellgren-Lawrence grade 4 osteoarthritis of the right knee.",
          note_id: "N-104",
          timestamp: "2026-06-12T15:45:00Z",
        },
        {
          quote:
            "Advanced (KL grade 4) right knee osteoarthritis with bone-on-bone medial compartment disease.",
          note_id: "N-104",
          timestamp: "2026-06-12T15:45:00Z",
        },
      ],
      gaps: [],
      letter: {
        sections: [
          {
            heading: "Re: Appeal of Denial — CPT 27447 / Claim CLM-001",
            body: "We respectfully appeal the CO-50 denial asserting that 12 weeks of conservative therapy were not documented. The clinical record demonstrates both satisfaction of the conservative-therapy duration and an independent policy exception under ORTHO-112.",
          },
          {
            heading: "Conservative therapy exceeded the 12-week requirement",
            body: "Physical therapy notes document a continuous 14-week supervised course (28 visits from 2026-03-02 through 2026-06-09) with persistent severe symptoms despite adherence.",
          },
          {
            heading: "KL grade 4 waiver applies",
            body: "Weight-bearing radiographs demonstrate Kellgren-Lawrence grade 4 osteoarthritis with bone-on-bone medial compartment disease. Per ORTHO-112, the 12-week conservative therapy requirement is waived in this setting.",
          },
          {
            heading: "Request",
            body: "We request overturn of the denial and payment for CPT 27447 as billed. This letter is a DRAFT pending physician and billing review.",
          },
        ],
        citations: ["ORTHO-112"],
      },
      p2p: {
        opening:
          "Thank you for taking this peer-to-peer. This is a CO-50 denial on a total knee arthroplasty where AutoReview alleged insufficient conservative therapy.",
        talking_points: [
          "14 weeks / 28 PT visits documented — exceeds the 12-week bar.",
          "Weight-bearing films: KL grade 4, bone-on-bone — ORTHO-112 waiver applies.",
          "Operative indication explicitly cites failed conservative care plus KL-4 imaging.",
        ],
        likely_pushback: [
          {
            objection: "We only counted office visits, not PT sessions.",
            response:
              "ORTHO-112 accepts physical therapy as qualifying conservative therapy; the PT record is complete with dated visits spanning 14 weeks.",
          },
          {
            objection: "Imaging alone is insufficient.",
            response:
              "Policy explicitly waives the 12-week requirement for KL grade 4 with bone-on-bone — and we also met the duration anyway.",
          },
        ],
        ask: "Please overturn the CO-50 denial and authorize payment for CPT 27447.",
      },
    },
  },
  {
    id: "APL-CACHE-002",
    claim_id: "CLM-002",
    model: "gemma3",
    latency_ms: 5110,
    created_at: "2026-09-01T12:05:00Z",
    analysis: {
      verdict: "appeal",
      confidence: 0.9,
      denial_reason:
        "Downcoded from critical care (99291) to lower level of service. Documentation does not support critical care criteria per CC-201.",
      policy_clause: {
        policy_code: "CC-201",
        quote:
          "Septic shock meeting Sepsis-3 criteria (suspected or documented infection plus vasopressor requirement to maintain MAP ≥ 65 mmHg and serum lactate > 2 mmol/L despite adequate fluid resuscitation) constitutes qualifying organ dysfunction under this policy.",
      },
      evidence: [
        {
          quote: "Serum lactate 4.8 mmol/L (ref < 2.0).",
          note_id: "N-202",
          timestamp: "2026-08-18T02:28:00Z",
        },
        {
          quote:
            "Despite adequate fluid resuscitation, MAP remained < 65 mmHg (recorded MAP 58 mmHg). Norepinephrine started at 0.05 mcg/kg/min",
          note_id: "N-203",
          timestamp: "2026-08-18T02:45:00Z",
        },
        {
          quote:
            "Patient received 30 mL/kg crystalloid bolus (2.4 L) for presumed septic shock.",
          note_id: "N-203",
          timestamp: "2026-08-18T02:45:00Z",
        },
        {
          quote:
            "I personally provided 68 minutes of critical care time at the bedside managing septic shock",
          note_id: "N-204",
          timestamp: "2026-08-18T04:10:00Z",
        },
      ],
      gaps: [],
      letter: {
        sections: [
          {
            heading: "Re: Appeal of Downcode — CPT 99291 / Claim CLM-002",
            body: "We appeal the CO-150 downcode from critical care. Documentation establishes septic shock meeting Sepsis-3 criteria and 68 minutes of attested critical care time, satisfying CC-201.",
          },
          {
            heading: "Organ dysfunction — septic shock",
            body: "Lactate was 4.8 mmol/L. After 30 mL/kg fluids, MAP remained below 65 mmHg and norepinephrine was started. This meets Sepsis-3 septic shock and CC-201 organ-dysfunction criteria.",
          },
          {
            heading: "Time threshold",
            body: "The attending attested 68 minutes of critical care time, exceeding the 30-minute minimum for CPT 99291.",
          },
          {
            heading: "Request",
            body: "Restore CPT 99291 and reverse the downcode. DRAFT — requires physician/billing review.",
          },
        ],
        citations: ["CC-201"],
      },
      p2p: {
        opening:
          "This is a critical-care downcode on a septic-shock presentation. Both organ dysfunction and time are documented.",
        talking_points: [
          "Lactate 4.8; MAP < 65 after 30 mL/kg; norepinephrine started — Sepsis-3 shock.",
          "68 minutes critical care time attested — above the 30-minute bar.",
          "CC-201 states downcoding is inappropriate when both criteria are met.",
        ],
        likely_pushback: [
          {
            objection: "Floor-level E/M is sufficient for sepsis.",
            response:
              "Vasopressor-dependent shock with lactate 4.8 is critical illness with acute organ dysfunction under CC-201 — not routine E/M.",
          },
        ],
        ask: "Please restore CPT 99291 as billed.",
      },
    },
  },
  {
    id: "APL-CACHE-003",
    claim_id: "CLM-003",
    model: "gemma3",
    latency_ms: 4450,
    created_at: "2026-09-01T12:10:00Z",
    analysis: {
      verdict: "appeal",
      confidence: 0.94,
      denial_reason:
        "Conservative headache management not attempted prior to advanced imaging. Does not meet NEURO-09 medical necessity.",
      policy_clause: {
        policy_code: "NEURO-09",
        quote:
          "Thunderclap headache with acute cranial nerve III palsy constitutes a red-flag presentation warranting immediate neuroimaging without a prior conservative management trial.",
      },
      evidence: [
        {
          quote:
            'sudden-onset, maximal-intensity headache described as "the worst headache of my life," peaking within seconds (thunderclap onset).',
          note_id: "N-301",
          timestamp: "2026-07-15T19:22:00Z",
        },
        {
          quote:
            "Exam notable for acute cranial nerve III palsy on the right: complete ptosis, pupil dilated and poorly reactive, eye \"down and out.\"",
          note_id: "N-302",
          timestamp: "2026-07-15T19:40:00Z",
        },
        {
          quote:
            "Thunderclap headache plus new CN III palsy is a red-flag presentation concerning for posterior communicating artery aneurysm.",
          note_id: "N-302",
          timestamp: "2026-07-15T19:40:00Z",
        },
      ],
      gaps: [],
      letter: {
        sections: [
          {
            heading: "Re: Appeal of Denial — CPT 70553 / Claim CLM-003",
            body: "We appeal the CO-50 denial for failure to attempt conservative headache management. NEURO-09 provides an explicit red-flag exception for thunderclap onset and acute cranial nerve III palsy.",
          },
          {
            heading: "Red-flag presentation",
            body: "ED documentation describes thunderclap onset and acute right CN III palsy (ptosis, dilated pupil, down-and-out eye). Neurology ordered urgent MRI; delaying for conservative therapy would have been inappropriate.",
          },
          {
            heading: "Request",
            body: "Overturn the denial and pay CPT 70553. DRAFT pending physician/billing review.",
          },
        ],
        citations: ["NEURO-09"],
      },
      p2p: {
        opening:
          "This denial ignored a documented red-flag exception under NEURO-09 for thunderclap headache with CN III palsy.",
        talking_points: [
          "Thunderclap onset — maximal within seconds.",
          "Acute CN III palsy on exam.",
          "Policy: red-flag exception waives conservative management.",
        ],
        likely_pushback: [
          {
            objection: "Patient needed a headache trial first.",
            response:
              "NEURO-09 lists thunderclap onset and cranial nerve palsy as red flags that require urgent imaging without a conservative trial.",
          },
        ],
        ask: "Please overturn the CO-50 and authorize CPT 70553.",
      },
    },
  },
  {
    id: "APL-CACHE-004",
    claim_id: "CLM-004",
    model: "gemma3",
    latency_ms: 5300,
    created_at: "2026-09-01T12:15:00Z",
    analysis: {
      verdict: "appeal",
      confidence: 0.91,
      denial_reason:
        "LVEF criteria not met for primary-prevention ICD. Claim denied under CARD-33.",
      policy_clause: {
        policy_code: "CARD-33",
        quote:
          "An LVEF of 28% measured 52 days post-MI in a patient on 4 months of GDMT with NYHA class II symptoms meets all CARD-33 primary-prevention criteria.",
      },
      evidence: [
        {
          quote: "MI date documented as 2026-02-08.",
          note_id: "N-401",
          timestamp: "2026-02-10T12:00:00Z",
        },
        {
          quote:
            "Date of study: 2026-04-01 (52 days after MI dated 2026-02-08).",
          note_id: "N-402",
          timestamp: "2026-04-01T14:30:00Z",
        },
        {
          quote: "LVEF estimated at 28% by biplane Simpson method.",
          note_id: "N-402",
          timestamp: "2026-04-01T14:30:00Z",
        },
        {
          quote:
            "Patient has been on continuous guideline-directed medical therapy (carvedilol, ACE inhibitor, MRA, SGLT2i added 2026-03) for 4 months since MI. Remains NYHA class II",
          note_id: "N-403",
          timestamp: "2026-06-12T10:15:00Z",
        },
      ],
      gaps: [],
      letter: {
        sections: [
          {
            heading: "Re: Appeal of Denial — CPT 33249 / Claim CLM-004",
            body: "We appeal the CO-50 denial alleging LVEF criteria were not met. The record shows LVEF 28% at 52 days post-MI, 4 months of GDMT, and NYHA II — meeting CARD-33 as documented.",
          },
          {
            heading: "Criteria mapping",
            body: "LVEF 28% on echo. Timing: echo at 52 days post-MI. GDMT: 4 months documented. Functional class: NYHA II.",
          },
          {
            heading: "Request",
            body: "Overturn the denial and pay CPT 33249. DRAFT — physician/billing review required.",
          },
        ],
        citations: ["CARD-33"],
      },
      p2p: {
        opening:
          "CARD-33 primary-prevention ICD — payer alleged LVEF criteria unmet, but echo shows 28% at 52 days with 4 months GDMT and NYHA II.",
        talking_points: [
          "LVEF 28% on biplane Simpson echo.",
          "Echo timed at 52 days post-MI.",
          "4 months continuous GDMT; NYHA class II.",
        ],
        likely_pushback: [
          {
            objection: "Need a lower LVEF threshold for primary prevention.",
            response:
              "Documented LVEF 28% at 52 days post-MI with 4 months GDMT and NYHA II meets the CARD-33 findings cited in the policy clause.",
          },
        ],
        ask: "Please overturn the CO-50 and authorize the ICD implant claim.",
      },
    },
  },
  {
    id: "APL-CACHE-005",
    claim_id: "CLM-005",
    model: "gemma3",
    latency_ms: 3980,
    created_at: "2026-09-01T12:20:00Z",
    analysis: {
      verdict: "uphold_denial",
      confidence: 0.88,
      denial_reason:
        "Lumbar MRI ordered without 6 weeks of conservative care and without red-flag indications per SPINE-04.",
      policy_clause: {
        policy_code: "SPINE-04",
        quote:
          "Nine days of low back pain with a normal neurologic examination and no documented red flags does not meet medical necessity criteria.",
      },
      evidence: [
        {
          quote:
            "Patient E-9914 reports 9 days of low back pain after lifting boxes at home.",
          note_id: "N-501",
          timestamp: "2026-09-01T13:20:00Z",
        },
        {
          quote: "No red flags identified.",
          note_id: "N-501",
          timestamp: "2026-09-01T13:20:00Z",
        },
        {
          quote:
            "Neurologic examination: strength 5/5 in all lower extremity myotomes, reflexes symmetric, sensation intact, negative straight-leg raise bilaterally.",
          note_id: "N-501",
          timestamp: "2026-09-01T13:20:00Z",
        },
      ],
      gaps: [
        "Documentation gap — query the attending before write-off or external appeal.",
        "No 6-week conservative care course documented before MRI order.",
        "No red-flag features (progressive deficit, saddle anesthesia, bowel/bladder dysfunction, malignancy, infection, fracture) documented.",
      ],
      letter: {
        sections: [
          {
            heading: "Internal assessment — documentation gap / query attending",
            body: "Current chart under SPINE-04 shows 9 days of nonspecific low back pain, normal neuro exam, and no red flags. MRI at day 9 does not meet documented medical necessity. Query the attending for omitted red-flag or conservative-care documentation before any write-off. Do not treat this as an automatic abandon.",
          },
        ],
        citations: ["SPINE-04"],
      },
      p2p: {
        opening:
          "Internal huddle only — documentation appears insufficient to overturn. Query the attending before write-off or external peer-to-peer.",
        talking_points: [
          "Symptom duration 9 days — far below 6-week requirement.",
          "Normal neurologic exam; no red flags documented.",
          "SPINE-04 non-coverage language matches this presentation.",
          "Ask attending whether red flags or prior conservative care exist outside this note.",
        ],
        likely_pushback: [
          {
            objection: "Billing wants to write this off now.",
            response:
              "Pause. Query the attending for omitted documentation first; only then decide appeal vs acceptance.",
          },
        ],
        ask: "Query the attending for missing documentation before peer-to-peer or write-off.",
      },
    },
  },
];
