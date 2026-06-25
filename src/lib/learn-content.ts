export type LearnPost = {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  body: string[]; // paragraphs
  takeaways?: string[];
};

export type LearnCategory = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  accent: string; // css color
  icon: "alert" | "building" | "soil" | "materials" | "water" | "waste";
  posts: LearnPost[];
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  {
    slug: "emergency-response",
    title: "Emergency Responses During Earthquake",
    shortTitle: "Emergency Response",
    description:
      "What to actually do in the first 60 seconds — at home, at school, in a car, or outdoors — and how to act in the hours that follow.",
    accent: "var(--color-risk-very-high)",
    icon: "alert",
    posts: [
      {
        slug: "drop-cover-hold-on",
        title: "Drop, Cover, and Hold On: the 60 seconds that matter",
        excerpt:
          "Most injuries in an earthquake come from falling objects, not collapsing buildings. Here is the response that consistently saves lives.",
        readTime: "5 min read",
        body: [
          "The single most studied protective action during shaking is Drop, Cover, and Hold On. Drop to your hands and knees before the shaking knocks you down — this also lowers your center of gravity. Cover your head and neck with one arm, and if a sturdy desk or table is nearby, crawl under it. Hold on to that shelter and be ready to move with it until the shaking stops.",
          "Do not run for an exit during shaking. Stairwells move differently from the rest of the building and are common injury sites, and door frames in modern buildings are no stronger than the surrounding wall. The 'triangle of life' idea that you should lie next to furniture has been repeatedly rejected by structural engineers and emergency agencies.",
          "If you are in bed, stay there, lie face down, and protect your head and neck with a pillow. If you are in a wheelchair, lock the wheels, lean forward, and cover your head and neck. Outdoors, move into the open away from buildings, trees, streetlights, and power lines, then drop and cover.",
          "Plan ahead by identifying two 'safe spots' in every room you spend time in — typically under a heavy table or against an interior wall away from windows. Practicing the motion just twice a year is enough for it to become automatic when the ground actually moves.",
        ],
        takeaways: [
          "Drop, Cover, Hold On — do not run during shaking",
          "Protect head and neck first; everything else is secondary",
          "Outdoors: move clear of buildings and power lines, then cover",
        ],
      },
      {
        slug: "after-the-shaking",
        title: "The first hour after the shaking stops",
        excerpt:
          "Aftershocks, gas leaks, and broken glass cause more harm than people expect. A calm, ordered checklist keeps your household safe.",
        readTime: "6 min read",
        body: [
          "Expect aftershocks. They can be nearly as strong as the main shock and arrive within seconds or hours. Stay alert and keep shoes on — broken glass is the leading injury source in the post-shaking phase.",
          "Check yourself, then the people closest to you, for injuries before moving through the home. Treat bleeding, then look for hazards: gas smell, water leaks, sparking outlets, fallen power lines outside. If you smell gas, open windows, leave the building, and shut off the main valve only if you can do it safely.",
          "Do not use elevators. Use stairs slowly, watching for cracked steps and fallen debris. If you are trapped, do not light a match or shout continuously — tap on a pipe or wall in groups of three so rescuers can locate you while you conserve air and energy.",
          "Once outside, meet your household at a pre-agreed location. Use text messages instead of calls; SMS goes through congested networks more reliably than voice. Keep listening to a battery or hand-cranked radio for official instructions before re-entering any structure.",
        ],
        takeaways: [
          "Aftershocks are likely — keep shoes on, stay alert",
          "Smell gas? Ventilate, evacuate, shut off the main valve",
          "Text, don't call. Use a battery radio for official updates",
        ],
      },
      {
        slug: "emergency-kit",
        title: "Building a 72-hour earthquake kit that you will actually use",
        excerpt:
          "Skip the doomsday gear. A focused, lightweight kit covers the realistic first three days when services are still being restored.",
        readTime: "4 min read",
        body: [
          "Aim for three days of self-sufficiency per person. The kit should fit in a backpack so it can leave with you if the building becomes unsafe.",
          "Essentials: one gallon of water per person per day, ready-to-eat food that needs no cooking, a flashlight with spare batteries, a battery or hand-crank radio, a basic first-aid kit, a whistle, a dust mask, and copies of important documents in a sealed bag.",
          "Personal additions matter just as much: prescription medication for a week, glasses, infant or pet supplies, a power bank with the right cables, cash in small bills, sturdy shoes and gloves, and a printed list of emergency contacts. Rotate food and water every six months when you change clocks for daylight saving.",
        ],
        takeaways: [
          "3 days, 1 gallon of water per person per day",
          "Keep the kit in a grab-and-go backpack",
          "Rotate consumables twice a year",
        ],
      },
    ],
  },
  {
    slug: "safe-building",
    title: "Safe & Ideal for a Building",
    shortTitle: "Safer Buildings",
    description:
      "Site selection, layout choices, and retrofits that decide whether a building survives a moderate quake unscathed or becomes uninhabitable.",
    accent: "var(--color-primary)",
    icon: "building",
    posts: [
      {
        slug: "site-selection",
        title: "Site selection: the decision that outweighs everything else",
        excerpt:
          "A well-built house on bad ground still fails. A modest house on good ground often survives. Here is how to read a site.",
        readTime: "5 min read",
        body: [
          "Earthquake intensity at a specific spot is governed less by distance to the epicenter than by the ground beneath the foundation. Soft, saturated soils amplify shaking by a factor of two to four compared with bedrock — this is why neighborhoods on old lakebeds or river deltas perform worst.",
          "Avoid building directly on fault traces, on slopes with active landslide history, on uncompacted fill, and within 200 meters of unprotected coastline in tsunami zones. If you cannot avoid soft soil, ground improvement (compaction, stone columns, deep foundations) becomes mandatory.",
          "Good signs: shallow bedrock, gentle slope under 15 degrees, drained soils, and no history of liquefaction or flooding. Local geological surveys and hazard maps are usually free and worth reading before any purchase decision.",
        ],
        takeaways: [
          "Soft soil amplifies shaking 2-4x — site beats construction",
          "Avoid fault traces, fill, and steep or saturated slopes",
          "Always check local hazard maps before buying or building",
        ],
      },
      {
        slug: "regular-shape-matters",
        title: "Why boxy, symmetrical buildings outperform 'interesting' shapes",
        excerpt:
          "L-shapes, big setbacks, and tall narrow towers concentrate stress at predictable failure points.",
        readTime: "4 min read",
        body: [
          "Earthquakes load buildings horizontally. A symmetric rectangle distributes that load evenly through walls and floors. The moment you add an L, a T, or a setback, the building twists around its stiff core, and the corners experience large displacements that brittle materials cannot follow.",
          "Vertical irregularities matter just as much. A 'soft story' — typically an open ground floor with parking instead of walls — is the single most common cause of total collapse in residential mid-rises during major events.",
          "If your design must be irregular, separate the wings with seismic joints so each block can move independently, and add steel braced frames or shear walls around the openings on the soft floor.",
        ],
        takeaways: [
          "Symmetric rectangles distribute seismic load best",
          "Soft ground floors collapse first — brace them",
          "Use seismic joints to separate irregular wings",
        ],
      },
      {
        slug: "retrofitting-existing",
        title: "Retrofitting an existing home without rebuilding it",
        excerpt:
          "Three high-impact upgrades that drop collapse risk dramatically in older houses for a fraction of new-construction cost.",
        readTime: "6 min read",
        body: [
          "Bolt the house to its foundation. In older wood-frame homes the sill plate is often only nailed; anchor bolts every 1.2 meters into the concrete foundation prevent the entire structure from sliding off during strong shaking.",
          "Brace cripple walls — the short stud walls between the foundation and the first floor — with plywood sheathing. Unbraced cripple walls are the second leading cause of residential collapse after soft stories.",
          "Strap the water heater and secure tall furniture. Falling water heaters cause fires; falling bookshelves cause injuries. Both fixes take an afternoon and inexpensive hardware. For masonry homes, anchor parapets and chimneys to the roof structure — these are the first elements to detach in even moderate shaking.",
        ],
        takeaways: [
          "Bolt the sill plate to the foundation",
          "Sheathe cripple walls with plywood",
          "Strap water heaters and tall furniture today",
        ],
      },
    ],
  },
  {
    slug: "soil-quality",
    title: "Soil Quality for Earthquake & Farming",
    shortTitle: "Soil Quality",
    description:
      "How a single soil profile determines both seismic amplification and long-term productivity — and why farmers and engineers care about the same numbers.",
    accent: "oklch(0.5 0.06 80)",
    icon: "soil",
    posts: [
      {
        slug: "reading-a-soil-profile",
        title: "Reading a soil profile: what the layers tell you",
        excerpt:
          "Texture, density, and water content are the three readings that decide both how the ground shakes and how well crops grow.",
        readTime: "5 min read",
        body: [
          "Soils are classified by particle size: gravel, sand, silt, and clay, in descending order. A balanced loam — roughly 40% sand, 40% silt, 20% clay — is ideal for agriculture and behaves predictably under seismic load.",
          "Pure clay holds water and nutrients well but amplifies long-period shaking and is prone to swelling and shrinking, which cracks foundations. Pure sand drains too fast for most crops and, when saturated, can liquefy during an earthquake — losing all bearing capacity in seconds.",
          "A good soil report includes texture, organic content, bulk density, and depth to water table. The same report serves a farmer choosing crops and an engineer choosing foundation type.",
        ],
        takeaways: [
          "Loam is ideal both agriculturally and seismically",
          "Clay swells and amplifies long-period shaking",
          "Saturated sand can liquefy — check the water table",
        ],
      },
      {
        slug: "liquefaction-explained",
        title: "Liquefaction in plain language",
        excerpt:
          "Why solid-looking ground can briefly behave like quicksand during strong shaking — and how to know if your land is at risk.",
        readTime: "4 min read",
        body: [
          "When loose, saturated sand is shaken, the grains momentarily lose contact with each other and the soil behaves like a fluid. Buildings tip, underground tanks pop up, and roads heave. The phenomenon lasts seconds but the damage is permanent.",
          "Risk factors are loose granular soil, a shallow water table (under five meters), and a magnitude 5+ earthquake within a few tens of kilometers. River deltas, reclaimed land, and old harbor fills are classic liquefaction zones.",
          "Mitigation is possible but expensive: densify the soil with vibro-compaction, install stone columns, or use deep pile foundations bearing on the firm layer below. For agriculture, well-drained soils that resist liquefaction are also the soils that resist waterlogging in heavy rain.",
        ],
        takeaways: [
          "Loose sand + shallow water table + shaking = liquefaction",
          "River deltas and reclaimed land are highest risk",
          "Densification or deep piles are the structural fixes",
        ],
      },
      {
        slug: "farming-and-shaking",
        title: "The overlap between farm-grade and quake-safe soil",
        excerpt:
          "The same drainage and structure that make soil productive also make it stable under seismic load.",
        readTime: "4 min read",
        body: [
          "A productive farming soil has good structure (visible crumbs, not dust or hard clods), moderate organic content (2-5%), and natural drainage that prevents waterlogging. These same properties — structure and drainage — reduce seismic amplification and liquefaction risk.",
          "Over-irrigated or over-grazed land loses structure and compacts into a layer that both drowns roots and amplifies shaking. Cover cropping, contour plowing, and rotational grazing are agronomic practices that double as seismic risk reduction at the landscape scale.",
          "If you are choosing land for a homestead, ask for both an agronomic soil test and a geotechnical bore log. Together they cost less than one bad season and tell you what crops will grow and what foundation you will need.",
        ],
        takeaways: [
          "Good farm soil structure also resists shaking",
          "Compaction increases both flood and seismic risk",
          "Agronomic + geotechnical tests answer different questions",
        ],
      },
    ],
  },
  {
    slug: "building-materials",
    title: "Different Building Materials & Safety Levels",
    shortTitle: "Building Materials",
    description:
      "Why the same wall thickness in two materials can give wildly different outcomes — a clear ranking with the trade-offs of each.",
    accent: "oklch(0.55 0.12 30)",
    icon: "materials",
    posts: [
      {
        slug: "ductility-vs-strength",
        title: "Ductility beats raw strength in earthquakes",
        excerpt:
          "Why steel-reinforced concrete and wood frames survive shaking that crushes plain masonry — even when the masonry is technically 'stronger'.",
        readTime: "5 min read",
        body: [
          "Seismic loads are dynamic and reverse direction many times per second. The relevant property is not how much load a wall can carry but how much deformation it can absorb before failing — this is called ductility.",
          "Steel-reinforced concrete (RCC), well-detailed steel frames, and light wood frames are ductile. They bend, crack in controlled ways, and dissipate energy through that deformation. Unreinforced masonry and adobe are brittle: they carry significant load right up until they suddenly do not, with little warning.",
          "Modern codes require ductile detailing: closely spaced stirrups in concrete columns, full-strength welds in steel connections, and shear panels in wood frames. A 30-year-old RCC building without these details can perform worse than a new wood frame designed to today's standards.",
        ],
        takeaways: [
          "Ductility — not raw strength — saves lives in earthquakes",
          "RCC, steel, and wood frames absorb energy by deforming",
          "Detailing matters more than the material name on the plan",
        ],
      },
      {
        slug: "materials-ranked",
        title: "Common building materials ranked by seismic performance",
        excerpt:
          "From light wood frames at the top to unreinforced adobe at the bottom — with realistic costs and where each makes sense.",
        readTime: "6 min read",
        body: [
          "Best (well-detailed): light wood frames and steel moment frames. Light, ductile, and forgiving. Wood frames dominate single-family housing in seismic regions like the western US and Japan for good reason.",
          "Very good: reinforced concrete with modern detailing. Most mid-rise apartments and offices in seismic zones rely on RCC shear walls. Performance depends almost entirely on the quality of the reinforcement layout — not the concrete strength itself.",
          "Mixed: confined masonry (brick walls with small reinforced-concrete columns at corners and openings). Far better than unreinforced masonry, affordable, and widely used in Latin America and South Asia.",
          "Poor: unreinforced masonry, including most older brick and stone buildings. Acceptable for low-rise rural use only if walls are short, openings are small, and the roof is light.",
          "Worst (without major retrofit): adobe and unreinforced rubble stone. Heavy, brittle, and historically responsible for the highest death tolls in major earthquakes. Modern stabilized-adobe with internal mesh and bond beams performs dramatically better and can be acceptable for one-story housing.",
        ],
        takeaways: [
          "Wood and steel frames lead; RCC follows when well-detailed",
          "Confined masonry is the affordable middle path",
          "Plain adobe and rubble stone are the deadliest materials",
        ],
      },
      {
        slug: "what-to-ask-a-builder",
        title: "Five questions to ask before signing a construction contract",
        excerpt:
          "Most homeowners cannot inspect rebar layout, but everyone can ask the questions that force a builder to be specific.",
        readTime: "3 min read",
        body: [
          "1. What seismic zone is this site in, and what design acceleration are you using? A vague answer is a red flag.",
          "2. Show me the reinforcement drawings for columns and beam-column joints. Closely spaced ties at joints are the single best predictor of survival.",
          "3. Will the foundation be tied together with a continuous grade beam? Isolated footings without ties are far more vulnerable.",
          "4. How will partition walls be separated from the structural frame? Rigid infill walls crack columns when the building flexes.",
          "5. What is the inspection schedule, and who signs off? A signed checklist at each pour is worth more than the final certificate.",
        ],
        takeaways: [
          "Force specifics on zone, detailing, and inspection",
          "Reinforcement at joints predicts survival more than concrete grade",
          "A signed checklist per pour is the strongest quality control",
        ],
      },
    ],
  },
  {
    slug: "groundwater-impact",
    title: "Impact of Ground Water Level on Earthquake Intensity",
    shortTitle: "Groundwater & Quakes",
    description:
      "How groundwater changes site response, triggers liquefaction, and even influences when small earthquakes occur.",
    accent: "oklch(0.6 0.12 230)",
    icon: "water",
    posts: [
      {
        slug: "water-table-and-shaking",
        title: "How the water table changes felt intensity",
        excerpt:
          "Two identical houses on the same street can experience very different shaking depending on how deep the water is below the foundation.",
        readTime: "5 min read",
        body: [
          "Seismic waves travel faster through dense, dry rock and slow down in saturated, loose soil. As waves slow, their amplitude increases — this is the same physics as ocean swells rising as they reach shore. A site with a water table at 2 meters can feel one full intensity unit stronger than the same soil with the water table at 15 meters.",
          "Saturated soils also generate excess pore pressure during shaking. That pore pressure pushes soil grains apart, reducing their strength and stiffness throughout the event. Foundations settle, walls crack, and shaking duration effectively lengthens.",
          "This is why hazard maps include groundwater depth alongside soil type. Two neighborhoods with the same soil class but different water tables are not the same site.",
        ],
        takeaways: [
          "Shallow water tables amplify shaking and lengthen duration",
          "Pore pressure weakens soil throughout the event",
          "Always combine soil class with water-table depth",
        ],
      },
      {
        slug: "induced-seismicity",
        title: "When humans change the water table and trigger earthquakes",
        excerpt:
          "Reservoir filling, deep wastewater injection, and even aggressive groundwater extraction have all triggered measurable seismicity.",
        readTime: "5 min read",
        body: [
          "Pumping fluid into the ground reduces friction on existing faults. The Rocky Mountain Arsenal wastewater wells (1960s) and the Oklahoma injection boom (2010s) both produced clear, well-documented swarms of small to moderate earthquakes that stopped or slowed when injection slowed.",
          "Large reservoirs add weight to the crust and raise water pressure in underlying rock. The 1967 Koyna (India) M6.3 event is the best-known example of reservoir-triggered seismicity.",
          "Aggressive groundwater extraction has the opposite mechanical effect — the ground deflates and faults can re-stress as the surface subsides. Effects are usually small but measurable, and matter for long-term planning in fast-developing aquifer regions.",
        ],
        takeaways: [
          "Fluid injection reduces fault friction and triggers swarms",
          "Reservoir loading has caused damaging events",
          "Extraction subsidence quietly redistributes crustal stress",
        ],
      },
      {
        slug: "monitoring-your-well",
        title: "Why monitoring your well matters before and after quakes",
        excerpt:
          "Sudden changes in well level are one of the few measurable precursor signals — and a quick post-quake test reveals damage to the aquifer.",
        readTime: "4 min read",
        body: [
          "Well levels respond to seismic waves in real time. Most changes are small and recover quickly, but step changes — a sudden drop or rise that does not recover — indicate that the surrounding aquifer has been re-plumbed by the earthquake. New cracks open new paths; old paths close.",
          "Communities that share well-level readings build the data foundation needed to detect these changes. A single well is anecdote; a network is evidence.",
          "After a significant earthquake, test well water for turbidity and bacteria before drinking. Even when the well structure looks intact, ground motion can mobilize sediments and contaminants from the surrounding soil column.",
        ],
        takeaways: [
          "Step changes in well level indicate aquifer damage",
          "Networks of readings beat any single well for detection",
          "Always test water quality after a significant quake",
        ],
      },
    ],
  },
];

export function findCategory(slug: string) {
  return LEARN_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function findPost(catSlug: string, postSlug: string) {
  const cat = findCategory(catSlug);
  if (!cat) return null;
  const post = cat.posts.find((p) => p.slug === postSlug);
  if (!post) return null;
  return { category: cat, post };
}
