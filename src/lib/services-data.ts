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
  price: number; // in local currency units
  unit?: string;
  // If appointment is required, purchase becomes "Book appointment"
  appointment?: boolean;
};

export const CATEGORIES: { id: ServiceCategoryId; label: string; description: string }[] = [
  { id: "materials", label: "Building Materials", description: "Cement, rebar, bricks and finishing supplies from local vendors." },
  { id: "engineering", label: "Engineering Firms", description: "Structural assessment, retrofitting and consulting (by appointment)." },
  { id: "water", label: "Water Purification", description: "Filter installation, testing and maintenance (by appointment)." },
  { id: "insurance", label: "Insurance", description: "Earthquake, fire and flood coverage from licensed providers (by appointment)." },
];

export const PROVIDERS: Record<ServiceCategoryId, Provider[]> = {
  materials: [
    {
      id: "mat-shree",
      name: "Shree Cement Depot",
      blurb: "Quality OPC/PPC cement, rebar and aggregates with bulk delivery.",
      location: "Kathmandu",
      phone: "+977-1-4000111",
      items: [
        { id: "cement-opc", name: "OPC Cement (50kg)", price: 950, unit: "bag" },
        { id: "cement-ppc", name: "PPC Cement (50kg)", price: 880, unit: "bag" },
        { id: "rebar-12", name: "TMT Rebar 12mm", price: 1250, unit: "rod" },
      ],
    },
    {
      id: "mat-himalbrick",
      name: "Himal Bricks & Blocks",
      blurb: "Fly-ash bricks and AAC blocks engineered for seismic walls.",
      location: "Bhaktapur",
      phone: "+977-1-6610222",
      items: [
        { id: "brick-flyash", name: "Fly-ash Brick", price: 18, unit: "piece" },
        { id: "block-aac", name: "AAC Block 600x200x100", price: 95, unit: "piece" },
      ],
    },
  ],
  engineering: [
    {
      id: "eng-quakeshield",
      name: "QuakeShield Engineers",
      blurb: "Licensed structural engineers — assessments, retrofit design, supervision.",
      location: "Lalitpur",
      phone: "+977-1-5550333",
      items: [
        { id: "eng-assess", name: "Building Safety Assessment", price: 7500, appointment: true },
        { id: "eng-retrofit", name: "Retrofit Design Consultation", price: 15000, appointment: true },
      ],
    },
    {
      id: "eng-terraconsult",
      name: "Terra Consult",
      blurb: "Geotechnical and soil investigation specialists.",
      location: "Pokhara",
      phone: "+977-61-540444",
      items: [
        { id: "eng-soil", name: "Soil Investigation Visit", price: 9000, appointment: true },
      ],
    },
  ],
  water: [
    {
      id: "water-purelife",
      name: "PureLife Water Systems",
      blurb: "RO + UV filtration installation and annual servicing.",
      location: "Kathmandu",
      phone: "+977-1-4001234",
      items: [
        { id: "water-install", name: "RO Filter Installation", price: 22000, appointment: true },
        { id: "water-service", name: "Annual Maintenance Visit", price: 2500, appointment: true },
        { id: "water-test", name: "Water Quality Test", price: 1200, appointment: true },
      ],
    },
  ],
  insurance: [
    {
      id: "ins-sagarmatha",
      name: "Sagarmatha Insurance",
      blurb: "Earthquake & fire home insurance with fast claims.",
      location: "Nationwide",
      phone: "+977-1-4220555",
      items: [
        { id: "ins-earthquake", name: "Home Earthquake Cover (1 yr)", price: 5500, appointment: true },
        { id: "ins-bundle", name: "Earthquake + Fire Bundle (1 yr)", price: 8800, appointment: true },
      ],
    },
    {
      id: "ins-everest",
      name: "Everest General Insurance",
      blurb: "Flexible property and flood coverage plans.",
      location: "Nationwide",
      phone: "+977-1-4220666",
      items: [
        { id: "ins-flood", name: "Flood & Landslide Add-on (1 yr)", price: 3200, appointment: true },
      ],
    },
  ],
};
