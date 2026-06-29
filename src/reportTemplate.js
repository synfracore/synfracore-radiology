// v1 formatter: takes raw dictated text + modality and wraps it into a
// standard report shape. This is intentionally simple (no AI API call yet),
// so it works for free with zero backend. Swap buildReport() later to call
// a real language model without changing any page that uses it.

const TEMPLATES = {
  CT: "CT SCAN REPORT",
  MR: "MRI REPORT",
  "X-RAY": "X-RAY REPORT",
  USG: "ULTRASOUND REPORT",
  "PET-CT": "PET-CT REPORT",
};

export function buildReport({ modality, study, clinicalHistory, dictatedText, patient }) {
  const header = TEMPLATES[modality] || "RADIOLOGY REPORT";
  const findings = dictatedText?.trim() || "(no findings dictated)";

  return `${header}
Study: ${study || "-"}
Patient: ${patient?.name || "-"}  |  Age/Sex: ${patient?.age || "-"}/${patient?.gender || "-"}  |  ID: ${patient?.id || "-"}

CLINICAL HISTORY:
${clinicalHistory || "-"}

FINDINGS:
${findings}

IMPRESSION:
(Doctor to review and finalize impression before approving.)

---
Drafted by SynfraCore Radiology AI Voice Assistant. AI creates draft reports only.
Final approval remains with the radiologist.`;
}
