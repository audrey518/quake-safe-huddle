export type BuildingMaterial = "reinforced-concrete" | "masonry" | "wood" | "steel" | "adobe";

export interface BuildingInput {
  yearBuilt: number;
  floors: number;
  material: BuildingMaterial;
}

export type HazardType = "earthquake-damage" | "flooding" | "landslide" | "ground-crack";

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

export type RiskCategory = "Low" | "Moderate" | "High" | "Very High";

export interface RiskResult {
  score: number;
  category: RiskCategory;
  explanation: string;
  factors: { label: string; impact: string }[];
}

export function assessRisk(b: BuildingInput): RiskResult {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - b.yearBuilt);

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

  let category: RiskCategory;
  if (score < 25) category = "Low";
  else if (score < 50) category = "Moderate";
  else if (score < 75) category = "High";
  else category = "Very High";

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

export function riskCategoryColor(cat: RiskCategory): string {
  switch (cat) {
    case "Low": return "var(--color-risk-low)";
    case "Moderate": return "var(--color-risk-moderate)";
    case "High": return "var(--color-risk-high)";
    case "Very High": return "var(--color-risk-very-high)";
  }
}

export function magnitudeColor(mag: number): string {
  if (mag >= 6) return "var(--color-risk-very-high)";
  if (mag >= 4.5) return "var(--color-risk-high)";
  if (mag >= 3) return "var(--color-risk-moderate)";
  return "var(--color-risk-low)";
}
