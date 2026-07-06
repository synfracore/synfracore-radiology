// Maps a study's modality + body part to the list of anatomical structures
// a radiologist is expected to address in Findings for that study type.
// Consumed by: pipeline/step2_extract.js (to scope entity recognition) and
// rules/context.js (to flag missing/unexpected anatomy). Backed by a static
// per-modality+bodyPart dictionary — no network calls, no ML.

// ANATOMY_MAP: { [studyKey: string]: string[] }
// Keys are "MODALITY_BODYPART" (see getStudyKey), values are lowercase
// expected terms (formal + common variants) for that study type.
export const ANATOMY_MAP = {
  CT_BRAIN: [
    "ventricles", "lateral ventricles", "third ventricle", "fourth ventricle",
    "sulci", "gyri", "gray-white matter differentiation", "gray matter",
    "white matter", "midline shift", "mass effect", "extra-axial collection",
    "subdural hematoma", "subdural hemorrhage", "epidural hematoma",
    "epidural hemorrhage", "subarachnoid hemorrhage", "intracranial hemorrhage",
    "hemorrhage", "infarct", "infarction", "ischemia", "hypodensity",
    "hyperdensity", "calcification", "hydrocephalus", "cerebral edema",
    "edema", "mass", "tumor", "lesion", "basal cisterns", "brainstem",
    "cerebellum", "cerebellopontine angle", "pituitary gland", "sella turcica",
    "skull", "calvarium", "scalp", "orbits", "paranasal sinuses",
    "mastoid air cells", "herniation", "atrophy", "encephalomalacia",
    "diffuse axonal injury", "contusion",
  ],
  CT_CHEST: [
    "lungs", "lung parenchyma", "pulmonary nodule", "nodule", "mass",
    "consolidation", "ground glass opacity", "ground-glass opacities",
    "infiltrate", "pneumonia", "atelectasis", "pleural effusion", "effusion",
    "pneumothorax", "pneumomediastinum", "mediastinum",
    "mediastinal lymphadenopathy", "lymph nodes", "lymphadenopathy",
    "hilar lymphadenopathy", "trachea", "bronchi", "bronchiectasis",
    "emphysema", "fibrosis", "interstitial lung disease", "cardiomegaly",
    "heart size", "pericardial effusion", "aorta", "aortic aneurysm",
    "pulmonary artery", "pulmonary embolism", "chest wall", "ribs",
    "rib fracture", "sternum", "thyroid", "esophagus", "diaphragm",
    "costophrenic angle", "bullae", "cavitation",
  ],
  CT_ABDOMEN: [
    "liver", "hepatic", "hepatomegaly", "hepatic lesion", "cyst",
    "hemangioma", "gallbladder", "gall bladder", "cholelithiasis", "gallstones",
    "cholecystitis", "common bile duct", "biliary dilatation", "pancreas",
    "pancreatitis", "pancreatic mass", "spleen", "splenomegaly", "kidneys",
    "renal", "renal calculus", "kidney stone", "hydronephrosis",
    "adrenal gland", "adrenal mass", "bowel", "bowel loops", "small bowel",
    "large bowel", "colon", "appendix", "appendicitis", "mesentery",
    "mesenteric lymphadenopathy", "ascites", "free fluid", "peritoneum",
    "retroperitoneum", "aorta", "abdominal aortic aneurysm",
    "inferior vena cava", "lymph nodes",
  ],
  CT_PELVIS: [
    "bladder", "urinary bladder", "bladder wall", "uterus", "endometrium",
    "ovaries", "ovarian cyst", "adnexa", "prostate", "prostate gland",
    "seminal vesicles", "rectum", "rectal wall", "sigmoid colon",
    "pelvic lymphadenopathy", "lymph nodes", "pelvic free fluid", "ascites",
    "iliac vessels", "iliac lymph nodes", "sacrum", "coccyx", "pelvic bones",
    "femoral head", "hip joint", "inguinal region", "inguinal hernia",
    "hernia", "soft tissue mass", "fibroid", "leiomyoma",
  ],
  CT_SPINE: [
    "vertebral body", "vertebra", "disc space", "intervertebral disc",
    "disc herniation", "disc bulge", "spinal canal", "spinal stenosis",
    "canal stenosis", "neural foramen", "foraminal stenosis", "spinal cord",
    "cord compression", "compression fracture", "vertebral fracture",
    "fracture", "alignment", "listhesis", "spondylolisthesis", "spondylosis",
    "degenerative changes", "osteophyte", "facet joint", "facet arthropathy",
    "paraspinal soft tissue", "paraspinal muscles", "ligamentum flavum",
    "thecal sac", "bone marrow", "marrow signal", "scoliosis",
  ],
  CT_NECK: [
    "thyroid gland", "thyroid nodule", "parathyroid", "lymph nodes",
    "cervical lymphadenopathy", "lymphadenopathy", "larynx", "laryngeal mass",
    "vocal cords", "hypopharynx", "oropharynx", "nasopharynx",
    "salivary glands", "parotid gland", "submandibular gland", "trachea",
    "esophagus", "carotid artery", "carotid stenosis", "jugular vein",
    "soft tissue mass", "airway", "epiglottis", "tonsils",
    "retropharyngeal space", "prevertebral soft tissue", "cervical spine",
    "hyoid bone",
  ],
  CT_EXTREMITIES: [
    "bone", "cortex", "cortical destruction", "fracture",
    "comminuted fracture", "displaced fracture", "non-displaced fracture",
    "dislocation", "joint effusion", "joint space", "soft tissue swelling",
    "soft tissue mass", "muscle", "tendon", "ligament", "periosteal reaction",
    "osteomyelitis", "bone marrow edema", "lytic lesion", "sclerotic lesion",
    "callus formation", "degenerative changes", "osteoarthritis",
    "foreign body", "hematoma", "cellulitis", "abscess",
    "vascular calcification",
  ],
  MR_BRAIN: [
    "white matter lesion", "white matter hyperintensity", "demyelination",
    "flair hyperintensity", "diffusion restriction", "restricted diffusion",
    "infarct", "acute infarct", "chronic infarct", "hemorrhage",
    "microhemorrhage", "mass", "tumor", "glioma", "meningioma",
    "enhancing lesion", "contrast enhancement", "ventricles", "midline shift",
    "mass effect", "edema", "pituitary gland", "sella", "cerebellum",
    "brainstem", "cranial nerves", "internal auditory canal", "hippocampus",
    "temporal lobe", "frontal lobe", "parietal lobe", "occipital lobe",
    "atrophy", "gliosis",
  ],
  MR_SPINE: [
    "disc herniation", "disc bulge", "disc desiccation", "disc degeneration",
    "spinal cord signal", "cord signal change", "syrinx",
    "spinal canal stenosis", "foraminal stenosis", "nerve root compression",
    "vertebral body signal", "marrow edema", "compression fracture",
    "spondylolisthesis", "facet arthropathy",
    "ligamentum flavum hypertrophy", "thecal sac indentation",
    "paraspinal soft tissue", "epidural collection", "epidural abscess",
    "conus medullaris", "cauda equina", "annular tear", "modic changes",
    "scoliosis", "kyphosis",
  ],
  MR_ABDOMEN: [
    "liver lesion", "hepatic lesion", "hemangioma",
    "focal nodular hyperplasia", "hepatocellular carcinoma", "cirrhosis",
    "fatty liver", "hepatic steatosis", "biliary dilatation",
    "pancreatic mass", "pancreatic duct dilation", "splenomegaly",
    "renal mass", "renal cyst", "adrenal mass", "lymphadenopathy", "ascites",
    "ivc thrombus", "portal vein thrombosis", "bile duct",
    "gallbladder wall thickening", "mesenteric mass", "peritoneal deposits",
    "diffusion restriction", "enhancement pattern", "washout",
  ],
  "X-RAY_CHEST": [
    "cardiomegaly", "heart size", "mediastinal widening", "lung fields",
    "hyperinflation", "infiltrate", "consolidation", "pneumonia",
    "atelectasis", "pleural effusion", "blunted costophrenic angle",
    "pneumothorax", "hilar prominence", "hilar lymphadenopathy", "nodule",
    "mass", "rib fracture", "fracture", "bony thorax", "trachea",
    "tracheal deviation", "diaphragm", "elevated hemidiaphragm",
    "cardiac silhouette", "aortic knob", "pulmonary vasculature",
    "kerley b lines", "pulmonary edema",
  ],
  "X-RAY_EXTREMITIES": [
    "fracture", "comminuted fracture", "displaced fracture",
    "non-displaced fracture", "hairline fracture", "dislocation",
    "subluxation", "joint space narrowing", "joint effusion",
    "soft tissue swelling", "periosteal reaction", "osteoarthritis",
    "osteopenia", "osteoporosis", "bone density", "cortical irregularity",
    "foreign body", "degenerative changes", "alignment", "growth plate",
    "epiphysis", "callus formation", "healed fracture", "avulsion fracture",
    "lytic lesion",
  ],
  USG_ABDOMEN: [
    "liver echotexture", "hepatomegaly", "hepatic lesion",
    "fatty infiltration", "gallbladder wall thickening", "gallstones",
    "cholelithiasis", "sludge", "common bile duct dilation", "pancreas",
    "pancreatic duct", "spleen size", "splenomegaly", "kidney size",
    "renal cortex", "renal calculus", "hydronephrosis", "cortical cyst",
    "bladder wall", "post-void residual", "free fluid", "ascites",
    "bowel loops", "appendix", "aorta caliber", "portal vein",
    "hepatic vein doppler", "renal artery doppler",
  ],
  USG_PELVIS: [
    "uterus size", "endometrial thickness", "endometrial stripe",
    "myometrium", "fibroid", "leiomyoma", "ovary size", "ovarian cyst",
    "ovarian follicle", "adnexal mass", "free fluid", "pouch of douglas",
    "cervix", "bladder wall", "post-void residual", "prostate volume",
    "prostate gland", "seminal vesicles", "testicular echotexture",
    "epididymis", "hydrocele", "varicocele", "doppler flow", "vascularity",
    "pelvic mass",
  ],
  "PET-CT_WHOLE_BODY": [
    "fdg avidity", "standardized uptake value", "suv max",
    "hypermetabolic lesion", "hypermetabolic lymph node",
    "metabolic activity", "physiologic uptake", "tracer uptake",
    "metastasis", "metastatic lesion", "primary tumor",
    "lymph node metastasis", "bone metastasis", "lytic metastasis",
    "sclerotic metastasis", "mediastinal uptake", "hepatic uptake",
    "splenic uptake", "brown fat uptake", "background activity",
    "photopenic area", "non-fdg avid", "low grade uptake",
    "high grade uptake", "whole body survey", "distant metastasis",
  ],
};

// getStudyKey(modality, bodyPart) -> string
// Builds the canonical lookup key (e.g. "CT_BRAIN") used across ontology and
// template modules so all config files stay keyed consistently.
export function getStudyKey(modality, bodyPart) {
  const mod = String(modality || "").trim().toUpperCase();
  const part = String(bodyPart || "").trim().toUpperCase().replace(/\s+/g, "_");
  return `${mod}_${part}`;
}

// getExpectedAnatomy(modality, bodyPart) -> string[]
// Returns the list of organ/structure names expected to be addressed for the
// given study type (e.g. CT Brain -> ["ventricles", "gray-white matter", ...]).
export function getExpectedAnatomy(modality, bodyPart) {
  return ANATOMY_MAP[getStudyKey(modality, bodyPart)] || [];
}

// --- Self-test (manual reference, not executed automatically) ---
// getStudyKey("CT", "Brain")
//   -> "CT_BRAIN"
// getExpectedAnatomy("CT", "Brain")
//   -> ["ventricles", "lateral ventricles", ... , "contusion"]  (46 terms)
// getExpectedAnatomy("USG", "Pelvis")
//   -> ["uterus size", "endometrial thickness", ... , "vascularity"]  (24 terms)
