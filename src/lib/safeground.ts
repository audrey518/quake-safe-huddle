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
  category: "Low" | "Moderate" | "High";
  explanation: string;
  factors: { label: string; impact: string }[];
}

export function assessRisk(b: Pick<Building, "yearBuilt" | "floors" | "material">): RiskResult {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - b.yearBuilt);

  // Baseline material risk
  const materialScores: Record<BuildingMaterial, number> = {
    steel: 5,
    "reinforced-concrete": 5,
    wood: 12,
    masonry: 15,
    adobe: 30,
  };

  let score = materialScores[b.material];
  if (age > 30) score += 20;
  if (b.floors > 5) score += 15;

  score = Math.round(Math.min(100, score));

  let category: RiskResult["category"];
  if (score < 35) category = "Low";
  else if (score < 65) category = "Moderate";
  else category = "High";

  const factors = [
    {
      label: `Age — ${age} year${age === 1 ? "" : "s"} old`,
      impact: age > 30 ? "Built before many modern seismic standards were common" : "Relatively modern construction",
    },
    {
      label: `Material — ${MATERIAL_LABELS[b.material]}`,
      impact:
        b.material === "masonry" || b.material === "adobe"
          ? "Brittle under shaking — higher vulnerability"
          : b.material === "wood"
            ? "Flexible but can be vulnerable at connections"
            : "Generally good seismic performance",
    },
    {
      label: `Height — ${b.floors} floor${b.floors === 1 ? "" : "s"}`,
      impact: b.floors > 5 ? "Taller buildings experience stronger sway forces" : "Low-to-mid rise tends to perform better",
    },
  ];

  const contributors: string[] = [];
  if (age > 30) contributors.push("it is over 30 years old");
  if (b.material === "masonry") contributors.push("it is constructed primarily from brick materials");
  else if (b.material === "adobe") contributors.push("it is built from adobe/mud brick");
  else if (b.material === "wood") contributors.push("it uses a wood frame");
  if (b.floors > 5) contributors.push("it has more than 5 floors");

  let explanation: string;
  if (contributors.length === 0) {
    explanation = "Your building shows low earthquake vulnerability because it is relatively modern, built with resilient materials, and has a modest number of floors.";
  } else {
    const joined =
      contributors.length === 1
        ? contributors[0]
        : `${contributors.slice(0, -1).join(", ")} and ${contributors[contributors.length - 1]}`;
    explanation = `Your building shows ${category.toLowerCase()} earthquake vulnerability because ${joined}.`;
  }

  return { score, category, explanation, factors };
}
