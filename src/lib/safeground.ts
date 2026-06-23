export type BuildingMaterial = "reinforced-concrete" | "masonry" | "wood" | "steel" | "adobe";

export interface Building {
  id: string;
  name: string;
  address: string;
  yearBuilt: number;
  floors: number;
  material: BuildingMaterial;
  createdAt: string;
}

export type HazardType = "earthquake-damage" | "flooding" | "landslide" | "ground-crack";

export interface HazardReport {
  id: string;
  type: HazardType;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  createdAt: string;
}

export const MATERIAL_LABELS: Record<BuildingMaterial, string> = {
  "reinforced-concrete": "Reinforced concrete",
  masonry: "Masonry / brick",
  wood: "Wood frame",
  steel: "Steel frame",
  adobe: "Adobe / mud brick",
};

export const HAZARD_LABELS: Record<HazardType, string> = {
  "earthquake-damage": "Earthquake damage",
  flooding: "Flooding",
  landslide: "Landslide",
  "ground-crack": "Ground crack",
};

export interface RiskResult {
  score: number; // 0-100
  category: "Low" | "Moderate" | "High" | "Very High";
  explanation: string;
  factors: { label: string; impact: string }[];
}

export function assessRisk(b: Pick<Building, "yearBuilt" | "floors" | "material">): RiskResult {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - b.yearBuilt);

  // Age factor: older = riskier
  const ageScore = Math.min(40, age * 0.5);

  // Material factor
  const materialScores: Record<BuildingMaterial, number> = {
    steel: 5,
    "reinforced-concrete": 10,
    wood: 18,
    masonry: 28,
    adobe: 38,
  };
  const materialScore = materialScores[b.material];

  // Floors factor: very low or very tall = more risk
  let floorScore = 0;
  if (b.floors >= 8) floorScore = 22;
  else if (b.floors >= 5) floorScore = 14;
  else if (b.floors >= 3) floorScore = 8;
  else floorScore = 4;

  const score = Math.round(Math.min(100, ageScore + materialScore + floorScore));

  let category: RiskResult["category"];
  if (score < 25) category = "Low";
  else if (score < 50) category = "Moderate";
  else if (score < 75) category = "High";
  else category = "Very High";

  const factors = [
    {
      label: `Age — ${age} year${age === 1 ? "" : "s"} old`,
      impact: age < 15 ? "Modern code likely applied" : age < 40 ? "May predate recent seismic codes" : "Likely built before modern seismic standards",
    },
    {
      label: `Material — ${MATERIAL_LABELS[b.material]}`,
      impact:
        b.material === "adobe" || b.material === "masonry"
          ? "Brittle under shaking — higher vulnerability"
          : b.material === "wood"
            ? "Flexible but susceptible at connections"
            : "Generally good seismic performance",
    },
    {
      label: `Height — ${b.floors} floor${b.floors === 1 ? "" : "s"}`,
      impact:
        b.floors >= 8
          ? "Taller buildings sway more — design quality matters"
          : b.floors >= 3
            ? "Mid-rise — performance depends on structure"
            : "Low-rise tends to perform better",
    },
  ];

  const explanation =
    category === "Low"
      ? "This building appears to have favorable basic characteristics for earthquake shaking. This is a rough community-level estimate — not an engineering assessment."
      : category === "Moderate"
        ? "Some characteristics suggest moderate vulnerability. Consider learning about your local seismic code and consulting a professional for a proper inspection."
        : category === "High"
          ? "Several characteristics increase earthquake vulnerability. A qualified structural engineer should evaluate this building."
          : "Multiple high-risk factors are present. Seek a professional structural assessment as soon as possible.";

  return { score, category, explanation, factors };
}
