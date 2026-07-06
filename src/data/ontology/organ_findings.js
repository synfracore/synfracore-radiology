// For a given organ/structure, lists findings and related organs commonly
// dictated together. Used to power the suggestion engine (pipeline/step5_suggest.js)
// so that after an organ is mentioned, likely next-phrase suggestions can be
// offered (e.g. after "liver", suggest "no focal lesion" / "gallbladder is normal").
// Static rule-based lookup only — no learning/model involved yet.

// ORGAN_FINDINGS: { [organ: string]: string[] }
// Values are ordered most-common-first; normal/unremarkable phrasing is
// listed first since it is the most frequent dictation for any given organ.
export const ORGAN_FINDINGS = {
  liver: [
    "normal in size and echotexture", "unremarkable", "no focal lesion",
    "hepatomegaly", "fatty infiltration", "hepatic steatosis",
    "hypodense lesion", "cyst", "hemangioma", "cirrhotic morphology",
  ],
  gallbladder: [
    "normal", "unremarkable", "no calculus", "wall not thickened",
    "gallstones", "cholelithiasis", "wall thickening", "sludge",
    "distended", "pericholecystic fluid",
  ],
  pancreas: [
    "normal in size and echotexture", "unremarkable",
    "not enlarged", "no ductal dilatation", "peripancreatic fat stranding",
    "pancreatic duct dilatation", "focal mass", "atrophic",
    "calcification", "pseudocyst",
  ],
  spleen: [
    "normal in size", "unremarkable", "not enlarged", "splenomegaly",
    "focal lesion", "infarct", "subcapsular collection", "calcification",
    "accessory spleen", "laceration",
  ],
  kidney: [
    "normal in size and echotexture", "unremarkable",
    "no hydronephrosis", "no calculus", "cortical cyst",
    "hydronephrosis", "renal calculus", "cortical thinning",
    "mass lesion", "pelvicalyceal dilatation",
  ],
  "adrenal gland": [
    "normal", "unremarkable", "not enlarged", "nodule",
    "adenoma", "mass lesion", "hyperplasia", "calcification",
  ],
  bladder: [
    "normal distension", "wall not thickened", "unremarkable",
    "no calculus", "wall thickening", "diverticulum",
    "intraluminal mass", "post-void residual increased",
    "calculus", "debris",
  ],
  uterus: [
    "normal in size and configuration", "unremarkable",
    "anteverted", "retroverted", "endometrial thickening",
    "fibroid", "leiomyoma", "adenomyosis", "endometrial polyp",
    "bulky",
  ],
  ovary: [
    "normal in size", "unremarkable", "normal follicular pattern",
    "simple cyst", "ovarian cyst", "enlarged", "hemorrhagic cyst",
    "mass lesion", "polycystic morphology", "dermoid",
  ],
  prostate: [
    "normal in size", "unremarkable", "not enlarged",
    "enlarged", "hypertrophy", "heterogeneous echotexture",
    "nodule", "calcification", "capsular bulge",
  ],
  bowel: [
    "normal caliber loops", "no dilatation", "unremarkable",
    "wall thickening", "dilated loops", "obstruction",
    "intussusception", "free air", "diverticulosis", "mass",
  ],
  appendix: [
    "normal", "not visualized", "non-inflamed", "not identified",
    "dilated", "wall thickening", "appendicolith", "inflamed",
    "periappendiceal fat stranding", "perforation",
  ],
  aorta: [
    "normal caliber", "no aneurysmal dilatation", "unremarkable",
    "atherosclerotic changes", "calcified plaque", "aneurysm",
    "dissection", "mural thrombus",
  ],
  "lymph nodes": [
    "no significant lymphadenopathy", "not enlarged", "unremarkable",
    "reactive nodes", "enlarged lymph node", "lymphadenopathy",
    "necrotic node", "conglomerate nodal mass",
  ],
  thyroid: [
    "normal in size and echotexture", "unremarkable",
    "no focal nodule", "nodule", "heterogeneous echotexture",
    "diffuse enlargement", "goiter", "calcification",
    "cystic change",
  ],
  lung: [
    "clear", "no focal consolidation", "unremarkable", "normal lung fields",
    "consolidation", "nodule", "ground glass opacity", "atelectasis",
    "fibrotic changes", "cavitary lesion",
  ],
  pleura: [
    "no pleural effusion", "normal", "unremarkable",
    "pleural effusion", "pleural thickening", "pleural nodule",
    "pneumothorax", "pleural calcification",
  ],
  heart: [
    "normal size", "unremarkable", "cardiomegaly",
    "pericardial effusion", "calcification of valves", "enlarged chambers",
  ],
  mediastinum: [
    "no mediastinal widening", "unremarkable", "normal contour",
    "mediastinal lymphadenopathy", "mediastinal mass", "widened mediastinum",
  ],
  brain: [
    "normal", "unremarkable", "no acute intracranial abnormality",
    "no mass effect", "no midline shift", "infarct", "hemorrhage",
    "mass lesion", "atrophy", "white matter changes",
  ],
  ventricles: [
    "normal in size and configuration", "not dilated", "unremarkable",
    "mildly dilated", "dilated", "effaced", "asymmetric",
  ],
  cerebellum: [
    "normal", "unremarkable", "no focal lesion",
    "atrophy", "infarct", "mass lesion",
  ],
  spine: [
    "normal alignment", "unremarkable", "no fracture",
    "degenerative changes", "disc herniation", "compression fracture",
    "spondylolisthesis", "canal stenosis", "scoliosis",
  ],
  vertebra: [
    "normal height maintained", "unremarkable", "no fracture",
    "compression fracture", "wedge deformity", "marrow edema",
    "lytic lesion", "sclerotic lesion",
  ],
  disc: [
    "normal disc height", "unremarkable", "no herniation",
    "disc bulge", "disc herniation", "disc desiccation",
    "annular tear", "disc space narrowing",
  ],
  "spinal cord": [
    "normal signal", "unremarkable", "no cord compression",
    "cord compression", "cord signal change", "syrinx", "myelomalacia",
  ],
  bone: [
    "normal bone density", "no fracture", "unremarkable",
    "fracture", "lytic lesion", "sclerotic lesion",
    "periosteal reaction", "marrow edema", "cortical destruction",
  ],
  joint: [
    "normal joint space", "unremarkable", "no effusion",
    "joint effusion", "joint space narrowing", "degenerative changes",
    "erosion", "dislocation", "subluxation",
  ],
  "soft tissue": [
    "unremarkable", "no significant abnormality", "normal",
    "swelling", "mass", "hematoma", "abscess", "foreign body",
    "fat stranding",
  ],
  testis: [
    "normal size and echotexture", "unremarkable",
    "normal vascularity", "hydrocele", "varicocele", "mass lesion",
    "heterogeneous echotexture", "epididymo-orchitis",
  ],
  epididymis: [
    "normal", "unremarkable", "not enlarged",
    "enlarged", "epididymitis", "cyst", "heterogeneous echotexture",
  ],
  "common bile duct": [
    "normal caliber", "not dilated", "unremarkable",
    "dilated", "calculus", "stricture", "wall thickening",
  ],
  "portal vein": [
    "normal caliber and flow", "patent", "unremarkable",
    "thrombosis", "cavernous transformation", "reversed flow",
  ],
  stomach: [
    "normal wall thickness", "unremarkable", "no mass",
    "wall thickening", "mass lesion", "distended", "ulcer",
  ],
  colon: [
    "normal caliber", "unremarkable", "no wall thickening",
    "diverticulosis", "wall thickening", "mass lesion", "dilated",
  ],
};

// getLikelyFindings(organ) -> string[]
// Returns common finding phrases associated with the given organ, ordered by
// how frequently they follow that organ mention in typical dictation.
export function getLikelyFindings(organ) {
  return ORGAN_FINDINGS[String(organ || "").trim().toLowerCase()] || [];
}

// RELATED_ORGANS: { [organ: string]: string[] }
// Organs commonly dictated immediately after the given organ within the same
// study (used to prompt "did you mean to also cover X?").
const RELATED_ORGANS = {
  liver: ["gallbladder", "common bile duct", "portal vein", "spleen"],
  gallbladder: ["liver", "common bile duct", "pancreas"],
  pancreas: ["common bile duct", "spleen", "liver"],
  spleen: ["liver", "pancreas", "kidney"],
  kidney: ["adrenal gland", "bladder", "aorta"],
  "adrenal gland": ["kidney"],
  bladder: ["prostate", "uterus", "ovary"],
  uterus: ["ovary", "bladder"],
  ovary: ["uterus", "bladder"],
  prostate: ["bladder", "seminal vesicles"],
  bowel: ["appendix", "colon", "mesentery"],
  appendix: ["bowel", "colon"],
  aorta: ["kidney", "inferior vena cava"],
  thyroid: ["lymph nodes", "parathyroid"],
  lung: ["pleura", "mediastinum", "heart"],
  pleura: ["lung", "chest wall"],
  heart: ["pericardium", "mediastinum", "aorta"],
  mediastinum: ["lung", "heart", "lymph nodes"],
  brain: ["ventricles", "cerebellum", "brainstem"],
  ventricles: ["brain", "midline structures"],
  cerebellum: ["brainstem", "brain"],
  spine: ["vertebra", "disc", "spinal cord"],
  vertebra: ["disc", "spinal cord"],
  disc: ["vertebra", "spinal cord"],
  "spinal cord": ["vertebra", "disc"],
  bone: ["joint", "soft tissue"],
  joint: ["bone", "soft tissue"],
  testis: ["epididymis"],
  epididymis: ["testis"],
  "common bile duct": ["liver", "gallbladder", "pancreas"],
  "portal vein": ["liver"],
  stomach: ["pancreas", "liver"],
  colon: ["bowel", "appendix"],
};

// getRelatedOrgans(organ) -> string[]
// Returns organs commonly dictated immediately after the given organ within
// the same study (used to prompt "did you mean to also cover X?").
export function getRelatedOrgans(organ) {
  return RELATED_ORGANS[String(organ || "").trim().toLowerCase()] || [];
}

// --- Self-test (manual reference, not executed automatically) ---
// getLikelyFindings("liver")
//   -> ["normal in size and echotexture", "unremarkable", "no focal lesion",
//       "hepatomegaly", "fatty infiltration", "hepatic steatosis",
//       "hypodense lesion", "cyst", "hemangioma", "cirrhotic morphology"]
// getLikelyFindings("unknown_organ")
//   -> []
// getRelatedOrgans("kidney")
//   -> ["adrenal gland", "bladder", "aorta"]
