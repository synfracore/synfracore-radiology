// Standard first sentence of the Findings section per modality + body part
// (e.g. "The liver is normal in size and echotexture." as a default-normal
// opener for USG abdomen). Consumed by pipeline/step4_generate.js as the
// starting point for a section before extracted entities are slotted in.
import { getStudyKey } from "../ontology/anatomy_map.js";

// OPENING_SENTENCES: { [studyKey: string]: string }
// Keys match the same "MODALITY_BODYPART" convention as ANATOMY_MAP.
export const OPENING_SENTENCES = {
  CT_BRAIN: "The ventricles, sulci, and basal cisterns are normal in size and configuration.",
  CT_CHEST: "The lungs are clear with no focal consolidation or pleural effusion.",
  CT_ABDOMEN: "The liver, gallbladder, pancreas, spleen, and kidneys are evaluated in detail below.",
  CT_PELVIS: "The urinary bladder, prostate/uterus and adnexa, and rectum are evaluated in detail below.",
  CT_SPINE: "Vertebral height and alignment are maintained throughout the visualized spine.",
  CT_NECK: "The thyroid gland, larynx, and cervical soft tissues are evaluated in detail below.",
  CT_EXTREMITIES: "The visualized osseous structures and soft tissues are evaluated in detail below.",
  MR_BRAIN: "The brain parenchyma shows normal signal intensity on all sequences.",
  MR_SPINE: "Vertebral body height, alignment, and marrow signal are maintained.",
  MR_ABDOMEN: "The liver, pancreas, spleen, and kidneys are evaluated in detail below.",
  "X-RAY_CHEST": "The heart size and mediastinal contours are within normal limits.",
  "X-RAY_EXTREMITIES": "The visualized osseous structures show no acute fracture or dislocation.",
  USG_ABDOMEN: "The liver, gallbladder, pancreas, spleen, and kidneys are evaluated in detail below.",
  USG_PELVIS: "The uterus, ovaries, and urinary bladder are evaluated in detail below.",
  "PET-CT_WHOLE_BODY": "Whole body FDG-PET/CT images are evaluated for abnormal metabolic activity.",
};

const DEFAULT_OPENING = "The visualized structures are evaluated in detail below.";

// getOpeningSentence(modality, bodyPart) -> string
// Returns the default opening Findings sentence for the given study type.
export function getOpeningSentence(modality, bodyPart) {
  return OPENING_SENTENCES[getStudyKey(modality, bodyPart)] || DEFAULT_OPENING;
}

// --- Self-test (manual reference, not executed automatically) ---
// getOpeningSentence("CT", "Brain")
//   -> "The ventricles, sulci, and basal cisterns are normal in size and configuration."
// getOpeningSentence("X-RAY", "Chest")
//   -> "The heart size and mediastinal contours are within normal limits."
// getOpeningSentence("CT", "Unknown Region")
//   -> "The visualized structures are evaluated in detail below."
