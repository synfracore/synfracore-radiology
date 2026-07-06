// Provides the standard Technique paragraph text for a given modality +
// body part + contrast setting (e.g. "Non-contrast CT of the brain was
// performed" vs "Post IV contrast CT abdomen, arterial and portal venous
// phase"). Consumed by pipeline/step4_generate.js when assembling the
// structured report's Technique section.

// TECHNIQUE_TEMPLATES: { [key: string]: string }
// Keys are "MODALITY_BODYPART_CONTRAST" (see buildTechniqueKey below).
// Contrast values used: "CONTRAST" | "NON_CONTRAST" for CT/MR, and
// "STANDARD" for modalities where IV contrast is not the typical variable
// (X-RAY, USG, PET-CT — the latter always uses an FDG tracer by protocol).
export const TECHNIQUE_TEMPLATES = {
  CT_BRAIN_NON_CONTRAST:
    "Non-contrast axial CT images of the brain were obtained from the skull base to the vertex.",
  CT_BRAIN_CONTRAST:
    "Axial CT images of the brain were obtained before and after intravenous contrast administration.",
  CT_CHEST_NON_CONTRAST:
    "Non-contrast axial CT images of the chest were obtained from the thoracic inlet to the upper abdomen.",
  CT_CHEST_CONTRAST:
    "Contrast-enhanced axial CT images of the chest were obtained following intravenous administration of contrast material.",
  CT_ABDOMEN_NON_CONTRAST:
    "Non-contrast axial CT images of the abdomen were obtained from the diaphragm to the iliac crests.",
  CT_ABDOMEN_CONTRAST:
    "Axial CT images of the abdomen were obtained following intravenous contrast administration in the portal venous phase.",
  CT_PELVIS_NON_CONTRAST:
    "Non-contrast axial CT images of the pelvis were obtained from the iliac crests to the pubic symphysis.",
  CT_PELVIS_CONTRAST:
    "Axial CT images of the pelvis were obtained following intravenous contrast administration in the portal venous phase.",
  CT_SPINE_NON_CONTRAST:
    "Non-contrast axial CT images of the spine were obtained with sagittal and coronal reformations.",
  CT_SPINE_CONTRAST:
    "Axial CT images of the spine were obtained following intravenous contrast administration, with sagittal and coronal reformations.",
  CT_NECK_NON_CONTRAST:
    "Non-contrast axial CT images of the neck were obtained from the skull base to the thoracic inlet.",
  CT_NECK_CONTRAST:
    "Axial CT images of the neck were obtained following intravenous contrast administration, from the skull base to the thoracic inlet.",
  CT_EXTREMITIES_NON_CONTRAST:
    "Non-contrast axial CT images of the extremity were obtained with multiplanar reformations.",
  CT_EXTREMITIES_CONTRAST:
    "Axial CT images of the extremity were obtained following intravenous contrast administration, with multiplanar reformations.",

  MR_BRAIN_NON_CONTRAST:
    "Multiplanar, multisequence MRI of the brain was performed without intravenous contrast.",
  MR_BRAIN_CONTRAST:
    "Multiplanar, multisequence MRI of the brain was performed before and after intravenous gadolinium contrast administration.",
  MR_SPINE_NON_CONTRAST:
    "Multiplanar, multisequence MRI of the spine was performed without intravenous contrast.",
  MR_SPINE_CONTRAST:
    "Multiplanar, multisequence MRI of the spine was performed before and after intravenous gadolinium contrast administration.",
  MR_ABDOMEN_NON_CONTRAST:
    "Multiplanar, multisequence MRI of the abdomen was performed without intravenous contrast.",
  MR_ABDOMEN_CONTRAST:
    "Multiplanar, multisequence MRI of the abdomen was performed before and after intravenous gadolinium contrast administration, including dynamic post-contrast sequences.",

  "X-RAY_CHEST_STANDARD":
    "Standard frontal (and lateral, where obtained) radiographs of the chest were acquired.",
  "X-RAY_EXTREMITIES_STANDARD":
    "Standard orthogonal radiographic views of the affected extremity were acquired.",

  USG_ABDOMEN_STANDARD:
    "Real-time greyscale ultrasound of the abdomen was performed using a curvilinear transducer.",
  USG_PELVIS_STANDARD:
    "Real-time greyscale ultrasound of the pelvis was performed using transabdominal (and transvaginal, where indicated) technique.",

  "PET-CT_WHOLE_BODY_STANDARD":
    "Whole body PET-CT images were acquired following intravenous administration of 18F-FDG, with low-dose CT for attenuation correction and anatomical localization.",
};

// buildTechniqueKey(modality, bodyPart, contrast) -> string
// Builds the canonical "MODALITY_BODYPART_CONTRAST" lookup key. Contrast is
// normalized to "CONTRAST" / "NON_CONTRAST" / "STANDARD".
function buildTechniqueKey(modality, bodyPart, contrast) {
  const mod = String(modality || "").trim().toUpperCase();
  const part = String(bodyPart || "").trim().toUpperCase().replace(/\s+/g, "_");
  const rawContrast = String(contrast || "").trim().toUpperCase();
  const normalizedContrast =
    rawContrast === "CONTRAST" || rawContrast === "NON_CONTRAST"
      ? rawContrast
      : "STANDARD";
  return `${mod}_${part}_${normalizedContrast}`;
}

// getTechniqueText(modality, bodyPart, contrast) -> string
// Returns the fixed Technique section text matching the given study context.
export function getTechniqueText(modality, bodyPart, contrast) {
  return TECHNIQUE_TEMPLATES[buildTechniqueKey(modality, bodyPart, contrast)] || "";
}

// --- Self-test (manual reference, not executed automatically) ---
// getTechniqueText("CT", "Brain", "NON_CONTRAST")
//   -> "Non-contrast axial CT images of the brain were obtained from the skull base to the vertex."
// getTechniqueText("MR", "Abdomen", "CONTRAST")
//   -> "Multiplanar, multisequence MRI of the abdomen was performed before and after intravenous gadolinium contrast administration, including dynamic post-contrast sequences."
// getTechniqueText("USG", "Pelvis")
//   -> "Real-time greyscale ultrasound of the pelvis was performed using transabdominal (and transvaginal, where indicated) technique."
