export type ServiceCategoryId = "materials" | "engineering" | "water" | "insurance";

export type Provider = {
  id: string;
  name: string;
  blurb: string;
  location: string;
  phone: string;
  items: ProviderItem[];
};

export type ProviderItem = {
  id: string;
  name: string;
  price: number; // MMK
  unit?: string;
  // If appointment is required, purchase becomes "Book appointment"
  appointment?: boolean;
};

export const CATEGORIES: { id: ServiceCategoryId; label: string; description: string }[] = [
  { id: "materials", label: "Building Materials", description: "Cement, rebar, bricks and finishing supplies from local Myanmar vendors." },
  { id: "engineering", label: "Engineering Firms", description: "Structural assessment, retrofitting and consulting (by appointment)." },
  { id: "water", label: "Water Purification", description: "Filter installation, testing and maintenance (by appointment)." },
  { id: "insurance", label: "Insurance", description: "Earthquake, fire and flood coverage from licensed providers (by appointment)." },
];

export const PROVIDERS: Record<ServiceCategoryId, Provider[]> = {
  materials: [
    {
      id: "mat-shree",
      name: "Shwe Cement Depot",
      blurb: "Quality OPC/PPC cement, rebar and aggregates with bulk delivery across Yangon.",
      location: "Yangon",
      phone: "+95 1 230 0111",
      items: [
        { id: "cement-opc", name: "OPC Cement (50kg)", price: 22000, unit: "bag" },
        { id: "cement-ppc", name: "PPC Cement (50kg)", price: 20000, unit: "bag" },
        { id: "rebar-12", name: "TMT Rebar 12mm", price: 18000, unit: "rod" },
      ],
    },
    {
      id: "mat-mandalay-bricks",
      name: "Mandalay Bricks & Blocks",
      blurb: "Fly-ash bricks and AAC blocks engineered for seismic walls.",
      location: "Mandalay",
      phone: "+95 2 661 0222",
      items: [
        { id: "brick-flyash", name: "Fly-ash Brick", price: 250, unit: "piece" },
        { id: "block-aac", name: "AAC Block 600x200x100", price: 2500, unit: "piece" },
      ],
    },
  ],
  engineering: [
    {
      id: "eng-quakeshield",
      name: "QuakeShield Engineers",
      blurb: "Licensed structural engineers — assessments, retrofit design, supervision.",
      location: "Yangon",
      phone: "+95 1 555 0333",
      items: [
        { id: "eng-assess", name: "Building Safety Assessment", price: 250000, appointment: true },
        { id: "eng-retrofit", name: "Retrofit Design Consultation", price: 600000, appointment: true },
      ],
    },
    {
      id: "eng-terraconsult",
      name: "Terra Consult Myanmar",
      blurb: "Geotechnical and soil investigation specialists.",
      location: "Mandalay",
      phone: "+95 2 540 0444",
      items: [
        { id: "eng-soil", name: "Soil Investigation Visit", price: 350000, appointment: true },
      ],
    },
  ],
  water: [
    {
      id: "water-purelife",
      name: "PureLife Water Systems",
      blurb: "RO + UV filtration installation and annual servicing.",
      location: "Yangon",
      phone: "+95 1 400 1234",
      items: [
        { id: "water-install", name: "RO Filter Installation", price: 450000, appointment: true },
        { id: "water-service", name: "Annual Maintenance Visit", price: 80000, appointment: true },
        { id: "water-test", name: "Water Quality Test", price: 40000, appointment: true },
      ],
    },
  ],
  insurance: [
    {
      id: "ins-ayeyar",
      name: "Ayeyar Insurance",
      blurb: "Earthquake & fire home insurance with fast claims across Myanmar.",
      location: "Nationwide (Myanmar)",
      phone: "+95 1 422 0555",
      items: [
        { id: "ins-earthquake", name: "Home Earthquake Cover (1 yr)", price: 150000, appointment: true },
        { id: "ins-bundle", name: "Earthquake + Fire Bundle (1 yr)", price: 250000, appointment: true },
      ],
    },
    {
      id: "ins-yoma",
      name: "Yoma General Insurance",
      blurb: "Flexible property and flood coverage plans.",
      location: "Nationwide (Myanmar)",
      phone: "+95 1 422 0666",
      items: [
        { id: "ins-flood", name: "Flood & Landslide Add-on (1 yr)", price: 100000, appointment: true },
      ],
    },
  ],
};
