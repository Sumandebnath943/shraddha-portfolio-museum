import type { Exhibit } from "./types";

// All 28 exhibits — one per supplied design sheet. `source` is the exact file in
// /design assets. Placard copy is hand-authored from what each sheet shows and
// the designer's résumé; scripts/ingest.mjs may regenerate it via Groq + Neon.
const F = (n: number) =>
  `Graphic Designer - Portfolio - Shraddha Sonel  2025-images-${n}.jpg`;

export const exhibits: Exhibit[] = [
  // ───────────────────────── INFOGRAPHICS / INFORMATION DESIGN ─────────────────────────
  {
    slug: "infographics-freedom-movements",
    source: F(2),
    title: "Freedom Movements & Campus Communications",
    category: "Infographics",
    wing: "infographics",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Infographics", "Information Design", "Editorial", "Print"],
    brief:
      "A Gandhi Jayanti infographic charting six important freedom movements, paired with a campus-reopening guidelines infographic for PIBM Pune.",
    overview:
      "An information-design set that ranges from national history to operational guidance — proof that the same visual system can carry both a commemorative story and a practical instruction sheet.",
    challenge:
      "Dense, sequential information — six historical movements, multi-point safety protocols — had to remain scannable and dignified rather than crowded.",
    solution:
      "A strict modular grid, numbered entries, and a restrained palette let each fact occupy its own zone, with iconography guiding the eye through the sequence.",
    outcomes: [
      "Complex content made readable at a glance",
      "Consistent brand voice across editorial and operational pieces",
      "Reusable infographic template for future drops",
    ],
    insight:
      "Information design is editing made visible — deciding what the reader sees first is most of the work.",
  },
  {
    slug: "infographics-programme-festival",
    source: F(4),
    title: "Programme & Festival Infographics",
    category: "Infographics",
    wing: "infographics",
    client: "PIBM",
    year: "2019 – 2024",
    startYear: 2019,
    endYear: 2024,
    phase: "integrated",
    tags: ["Infographics", "Information Design", "Branding"],
    brief:
      "MBA / PGDM specialization and USP infographics alongside a Mahavir Jayanti 'Five Maha-vratas' explainer, in both poster and story formats.",
    overview:
      "A pairing of recruitment communication and cultural storytelling, each resolved as a clean, hierarchical infographic that adapts across poster and vertical-story ratios.",
    challenge:
      "Two very different tones — promotional and reverent — had to feel like one designer's hand, and work in multiple aspect ratios.",
    solution:
      "A shared system of cards, accent rules, and a disciplined type scale flexes between formats while a tonal palette shift signals the change in subject.",
    outcomes: [
      "One visual system spanning promotional and cultural content",
      "Format-flexible layouts (poster + story)",
      "Clear, hierarchy-led reading order",
    ],
    insight:
      "A good system doesn't flatten tone — it gives different tones a shared backbone.",
  },
  {
    slug: "infographics-public-awareness",
    source: F(6),
    title: "Public Awareness Infographics",
    category: "Infographics",
    wing: "infographics",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Infographics", "Information Design", "Awareness"],
    brief:
      "Awareness infographics for Child Abuse Prevention, World Spine Day, and Global Handwashing Day — each a multi-section explainer of facts and habits.",
    overview:
      "Public-health and social-awareness explainers that translate guidance into approachable, shareable visuals without losing seriousness.",
    challenge:
      "Sensitive subject matter required clarity and warmth at once — informative, never alarming, and genuinely useful.",
    solution:
      "Sectioned layouts, friendly iconography, and colour-coded steps make each habit or fact self-contained and easy to act on.",
    outcomes: [
      "Sensitive topics handled with clarity and care",
      "Step-based layouts that read as actionable",
      "Consistent awareness-campaign visual language",
    ],
    insight:
      "When the message matters most, restraint is the design — let the information lead.",
  },
  {
    slug: "infographics-skills-study",
    source: F(7),
    title: "Skills & Study Infographics",
    category: "Infographics",
    wing: "infographics",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Infographics", "Information Design", "Editorial"],
    brief:
      "Study-and-skills infographics including a 'Time Management Like a Pro' guide, a Global MBA admission process flow, and an IELTS facts explainer.",
    overview:
      "Educational explainers that turn processes and tips into clean, confidence-building visual guides for prospective students.",
    challenge:
      "Procedural content — steps, tips, criteria — risks becoming a wall of text the audience skips.",
    solution:
      "Numbered cards, process flows, and generous whitespace break each topic into digestible, motivating chunks.",
    outcomes: [
      "Process content turned into clear visual journeys",
      "Higher shareability through scannable layouts",
      "Template reused across study-guide topics",
    ],
    insight:
      "People don't read instructions — they navigate them. Design the path, not the paragraph.",
  },

  // ───────────────────────── SOCIAL & DIGITAL ─────────────────────────
  {
    slug: "social-confidence-marketing",
    source: F(11),
    title: "Programme Promotion Posts",
    category: "Social Media Creatives",
    wing: "social",
    client: "PIBM",
    year: "2020 – 2025",
    startYear: 2020,
    endYear: 2025,
    phase: "integrated",
    tags: ["Social Media", "Digital", "Campaign", "Branding"],
    brief:
      "Social posts promoting PIBM's Confidence-Building training and the growth of the Marketing domain, with profile-led layouts and bold programme typography.",
    overview:
      "Feed-native programme promotion that balances aspirational photography with hard programme facts — built to stop the scroll and convert interest.",
    challenge:
      "Each post had to carry a benefit, a programme name, and a call to action without feeling cluttered in a fast-moving feed.",
    solution:
      "A consistent brand frame, a single dominant headline, and tidy feature lists give every post a clear focal point and a recognisable identity.",
    outcomes: [
      "Instantly recognisable in-feed brand presence",
      "Clear hierarchy: hook → benefit → CTA",
      "Repeatable post system across programmes",
    ],
    insight:
      "In the feed you get one glance — spend it on a single, confident idea.",
  },
  {
    slug: "social-academic-campaigns",
    source: F(12),
    title: "Academic Campaign Posts",
    category: "Social Media Creatives",
    wing: "social",
    client: "PIBM",
    year: "2020 – 2025",
    startYear: 2020,
    endYear: 2025,
    phase: "integrated",
    tags: ["Social Media", "Digital", "Campaign"],
    brief:
      "Campaign posts for the Research Cell, certification courses, the Global Joint Degree programme, and CAT 2022 key dates.",
    overview:
      "A run of academic-marketing posts spanning everything from research culture to time-sensitive exam-date reminders, unified by one visual system.",
    challenge:
      "Wildly different content types — evergreen and deadline-driven — needed to feel coherent across the page.",
    solution:
      "A flexible card system handles dense date tables and aspirational programme art alike, with accent colours signalling content type.",
    outcomes: [
      "Coherent feed across diverse content types",
      "Date-driven posts that stayed legible and urgent",
      "Scalable templates for ongoing campaigns",
    ],
    insight:
      "Consistency isn't sameness — it's a recognisable logic the audience can trust.",
  },
  {
    slug: "carousel-marketing-trends",
    source: F(31),
    title: "Global Marketing Trends Carousel",
    category: "Carousel Posts",
    wing: "social",
    client: "PIBM",
    year: "2019 – 2024",
    startYear: 2019,
    endYear: 2024,
    phase: "integrated",
    tags: ["Social Media", "Carousel", "Editorial", "Information Design"],
    brief:
      "A multi-slide carousel unpacking eight global marketing trends — from sustainability to data-driven marketing — with illustrated, sequential slides.",
    overview:
      "An educational carousel engineered for swipe-through engagement, where each slide advances a single idea and the set reads as one narrative.",
    challenge:
      "Carousels live or die on momentum — every slide must reward the swipe and pull to the next.",
    solution:
      "A cover-hook, one-idea-per-slide pacing, consistent illustration style, and a closing CTA build a complete, satisfying arc.",
    outcomes: [
      "Swipe-through narrative with strong completion pull",
      "Eight complex trends made approachable",
      "Reusable carousel framework",
    ],
    insight:
      "A carousel is a tiny film — design the pacing, not just the frames.",
  },
  {
    slug: "carousel-business-analytics",
    source: F(32),
    title: "Business Analytics Carousel",
    category: "Carousel Posts",
    wing: "social",
    client: "PIBM",
    year: "2019 – 2024",
    startYear: 2019,
    endYear: 2024,
    phase: "integrated",
    tags: ["Social Media", "Carousel", "Information Design"],
    brief:
      "A career-focused carousel on Business Analytics — the role, top recruiters, in-demand skills, and sectors — closing on an enrolment CTA.",
    overview:
      "A persuasive, fact-led carousel that walks a prospective student from curiosity to a clear next step.",
    challenge:
      "Data-heavy slides (salaries, recruiters, skills) needed structure without feeling like a spreadsheet.",
    solution:
      "Iconography, panels, and a warm accent palette organise the data into confident, branded slides with a clear payoff.",
    outcomes: [
      "Data presented as motivation, not noise",
      "Logical curiosity-to-CTA journey",
      "Consistent with the wider carousel system",
    ],
    insight:
      "Numbers persuade only once they're given a shape the eye can hold.",
  },
  {
    slug: "carousel-advanced-excel",
    source: F(33),
    title: "Advanced Excel Carousel",
    category: "Carousel Posts",
    wing: "social",
    client: "PIBM",
    year: "2019 – 2024",
    startYear: 2019,
    endYear: 2024,
    phase: "integrated",
    tags: ["Social Media", "Carousel", "Information Design", "Editorial"],
    brief:
      "An extended educational carousel on Advanced Excel — applications across HR, operations, finance, marketing and project management — with a summary and follow CTA.",
    overview:
      "One of the longer carousels: a structured mini-course delivered slide by slide, demonstrating endurance of system across many panels.",
    challenge:
      "A long set risks visual fatigue and drift — the tenth slide must feel as considered as the first.",
    solution:
      "A locked grid, repeating section headers, and a green domain palette hold the whole series together while each function gets its own clear slide.",
    outcomes: [
      "Long-form carousel with sustained visual consistency",
      "Course-like structure that aids retention",
      "Domain-coded design that signals topic instantly",
    ],
    insight:
      "Consistency over many slides is a discipline — the system has to survive the long set.",
  },
  {
    slug: "blog-banners-careers",
    source: F(13),
    title: "Blog Banners — Careers",
    category: "Blog Banners",
    wing: "social",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Digital", "Editorial", "Banner"],
    brief:
      "Blog hero banners on careers themes — placement opportunities, Python for MBAs, affordable MBA abroad, and a three-step confidence methodology.",
    overview:
      "Editorial banners that give each article a strong, on-brand visual entry point while harmonising as a set across the blog.",
    challenge:
      "Banners must summarise an article's promise in one image and headline, across varied topics.",
    solution:
      "A consistent type system, photographic treatment, and accent rule let each banner feel distinct yet unmistakably part of one publication.",
    outcomes: [
      "Stronger article entry points",
      "Cohesive blog visual identity",
      "Fast, templated production",
    ],
    insight:
      "A banner is a headline you can see — the picture should finish the sentence.",
  },
  {
    slug: "blog-banners-global",
    source: F(14),
    title: "Blog Banners — Global Study",
    category: "Blog Banners",
    wing: "social",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Digital", "Editorial", "Banner"],
    brief:
      "Blog banners on global-study themes — US work visas, cost of study in the USA, online MBA, effective communication, and international MBA journeys.",
    overview:
      "A second run of blog heroes focused on study-abroad aspirations, extending the publication's visual language to a new content cluster.",
    challenge:
      "Aspirational travel-and-study imagery had to stay grounded and credible, not stocky.",
    solution:
      "Considered photo selection, layered depth, and disciplined typography keep the banners aspirational yet trustworthy.",
    outcomes: [
      "Aspirational tone without losing credibility",
      "Seamless extension of the blog system",
      "Reusable layout patterns",
    ],
    insight:
      "Aspiration sells, but only when the craft makes it believable.",
  },
  {
    slug: "facebook-covers",
    source: F(46),
    title: "Facebook Cover Pages",
    category: "Facebook Covers",
    wing: "social",
    client: "PIBM",
    year: "2019 – 2024",
    startYear: 2019,
    endYear: 2024,
    phase: "integrated",
    tags: ["Digital", "Social Media", "Banner"],
    brief:
      "Facebook cover designs for the PGDM Hybrid programme, Online MBA, and Business Analytics — wide-format brand headers with photography and key messaging.",
    overview:
      "Profile cover art that turns a brand's most-seen banner real estate into a clear, current campaign statement.",
    challenge:
      "The cover format is wide, awkward, and partly obscured by profile UI — composition has to account for the crop.",
    solution:
      "Safe-zone-aware layouts place messaging and focal imagery where the platform keeps them visible across devices.",
    outcomes: [
      "Crop-safe layouts that survive platform UI",
      "Consistent cross-programme header system",
      "On-brand, always-current banner presence",
    ],
    insight:
      "Designing for a platform means designing for its crop, not just its canvas.",
  },

  // ───────────────────────── MARKETING & CAMPAIGNS ─────────────────────────
  {
    slug: "ad-pgdm-hybrid",
    source: F(15),
    title: "PGDM Hybrid Ad Campaign",
    category: "Ads",
    wing: "marketing",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Advertising", "Performance Creative", "Campaign", "Digital"],
    brief:
      "Performance ad creative for the PGDM Hybrid and Online MBA programmes, plus a 'Global Career in the USA' admissions push — built for Google and Meta placements.",
    overview:
      "Conversion-focused advertising designed to earn the click: clear value propositions, strong CTAs, and brand-consistent visuals tuned for paid placements.",
    challenge:
      "Ad creative must communicate value and prompt action in a fraction of a second, while staying on-brand and within platform constraints.",
    solution:
      "Benefit-led headlines, high-contrast CTAs, and a tight brand frame maximise clarity and click-through across formats.",
    outcomes: [
      "Creative optimised for click-through performance",
      "Consistent brand presence across paid placements",
      "Multiple programme variants from one system",
    ],
    insight:
      "An ad has one job — make the next step obvious and irresistible.",
  },
  {
    slug: "promotional-musical-melody",
    source: F(28),
    title: "Musical Melody 2021",
    category: "Promotional Banners",
    wing: "marketing",
    client: "PIBM · RamanByte",
    year: "2019 – 2021",
    startYear: 2019,
    endYear: 2021,
    phase: "integrated",
    tags: ["Event", "Promotion", "Poster", "Campaign"],
    brief:
      "Event posters for 'Musical Melody 2021', an inter-college music event — multiple energetic poster variations with stage lighting, instruments, and prize callouts.",
    overview:
      "High-energy event promotion that captures the drama of live music while keeping critical details — date, prize, sponsor — crystal clear.",
    challenge:
      "Event posters must feel exciting yet still function as information — date, venue, prize, and sponsor cannot get lost in the atmosphere.",
    solution:
      "Dramatic concert imagery and triangular framing create energy, while a structured detail zone keeps the practical information legible.",
    outcomes: [
      "Atmosphere and information balanced in one poster",
      "Multiple on-brand variations for the campaign",
      "Clear sponsor and prize visibility",
    ],
    insight:
      "A great event poster sells a feeling first and the facts a half-second later.",
  },
  {
    slug: "promotional-national-days",
    source: F(37),
    title: "National Day Tributes",
    category: "Promotional Banners",
    wing: "marketing",
    client: "PIBM",
    year: "2020 – 2025",
    startYear: 2020,
    endYear: 2025,
    phase: "integrated",
    tags: ["Promotion", "Social Media", "Cultural"],
    brief:
      "Commemorative creatives for National Mathematics Day, Martyrs' Day, Rabindranath Tagore's anniversary, and Chhatrapati Shivaji Maharaj Jayanti.",
    overview:
      "Tribute pieces that mark national and cultural occasions with dignity and craft, sustaining brand presence through the calendar.",
    challenge:
      "Commemorative work must feel respectful and distinctive, avoiding the generic templated look these occasions often attract.",
    solution:
      "Considered portraiture, restrained palettes, and elegant typography give each tribute gravity and a clear point of view.",
    outcomes: [
      "Dignified, non-generic commemorative work",
      "Year-round branded calendar presence",
      "Distinct treatments unified by craft",
    ],
    insight:
      "Occasion design is judged by taste — restraint reads as respect.",
  },
  {
    slug: "promotional-festivals-awareness",
    source: F(38),
    title: "Festivals & Awareness",
    category: "Promotional Banners",
    wing: "marketing",
    client: "PIBM",
    year: "2020 – 2025",
    startYear: 2020,
    endYear: 2025,
    phase: "integrated",
    tags: ["Promotion", "Social Media", "Cultural", "Awareness"],
    brief:
      "Festival and awareness creatives — Ganesh Chaturthi, Constitution Day, World Day Against Child Labour, World Father's Day, Polio Day, and more.",
    overview:
      "A broad set of festive and awareness greetings that keep the brand warm, timely, and culturally fluent across the year.",
    challenge:
      "A high volume of occasion posts risks repetition and dilution of the brand's look.",
    solution:
      "A flexible greeting system — shared type, adaptive illustration and photography — keeps each post fresh yet recognisably from one house.",
    outcomes: [
      "Consistent brand warmth across many occasions",
      "Culturally attuned, timely creative",
      "Efficient, system-driven production",
    ],
    insight:
      "Volume is the real test of a system — it has to hold up post after post.",
  },
  {
    slug: "promotional-cultural-tributes",
    source: F(39),
    title: "Cultural & Commemorative",
    category: "Promotional Banners",
    wing: "marketing",
    client: "PIBM",
    year: "2020 – 2025",
    startYear: 2020,
    endYear: 2025,
    phase: "integrated",
    tags: ["Promotion", "Social Media", "Cultural", "Awareness"],
    brief:
      "Cultural and commemorative creatives — Onam, Tokyo 2020 Paralympics, International Pi Day, 26/11 tribute, World Braille Day, Vijay Diwas, and more.",
    overview:
      "A wide-ranging commemorative set spanning festivals, sport, science, and remembrance — each calibrated to its moment's mood.",
    challenge:
      "Tones swing from celebratory to solemn; each piece must read the room correctly.",
    solution:
      "Palette, imagery, and typographic weight shift to match each occasion's emotional register while staying within the brand frame.",
    outcomes: [
      "Tone matched precisely to each occasion",
      "Breadth of subjects handled with consistency",
      "Sustained, sensitive brand presence",
    ],
    insight:
      "Knowing when to celebrate and when to be quiet is its own design skill.",
  },
  {
    slug: "corporate-leadership-series",
    source: F(8),
    title: "Virtual Leadership Series",
    category: "Corporate Creatives",
    wing: "marketing",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Corporate", "Event", "Social Media", "Campaign"],
    brief:
      "Speaker-announcement creatives for PIBM's Virtual Leadership Series, featuring industry leaders from Harley-Davidson, the Hiranandani Group, Darashaw and more.",
    overview:
      "A speaker-card system that lends visiting executives a premium, consistent stage while reinforcing the institute's brand at every announcement.",
    challenge:
      "A recurring series needs a template strong enough to feel premium yet flexible for varied speaker photography and details.",
    solution:
      "A confident card layout with circular portrait framing, clear name/title hierarchy, and session details creates an instantly recognisable series.",
    outcomes: [
      "Premium, recognisable speaker-series identity",
      "Flexible template across many announcements",
      "Reinforced institutional brand authority",
    ],
    insight:
      "A series is a promise of consistency — the template is the brand.",
  },
  {
    slug: "corporate-isdsi-conference",
    source: F(9),
    title: "ISDSI Global Conference 2024",
    category: "Corporate Creatives",
    wing: "marketing",
    client: "PIBM",
    year: "2024",
    startYear: 2024,
    endYear: 2024,
    phase: "integrated",
    tags: ["Corporate", "Event", "Conference", "Campaign"],
    brief:
      "Panellist welcome cards for PIBM's 18th ISDSI Global Conference 2024, introducing speakers across CEO, CHRO, accreditation and publication panels.",
    overview:
      "A co-branded conference identity applied across a full roster of panellist welcome cards — a system that scales gracefully to many people.",
    challenge:
      "Dual branding (PIBM + ISDSI) and a large speaker roster had to stay consistent and uncluttered across every card.",
    solution:
      "A locked co-brand lockup, panel-coded accents, and a repeatable portrait-and-credentials layout keep the whole set unified.",
    outcomes: [
      "Co-branded system applied cleanly at scale",
      "Panel-coded clarity across the roster",
      "Conference-ready, professional polish",
    ],
    insight:
      "Co-branding is a negotiation — the system has to honour two logos and still look like one.",
  },

  // ───────────────────────── PRINT & EDITORIAL ─────────────────────────
  {
    slug: "brochure-grupo-holidays",
    source: F(16),
    title: "Grupo Holidays Travel Brochures",
    category: "Brochures",
    wing: "print",
    client: "Grupo Holidays",
    year: "2018 – 2019",
    startYear: 2018,
    endYear: 2019,
    phase: "identity",
    tags: ["Print", "Brochure", "Editorial", "Travel"],
    brief:
      "Travel brochures for Grupo Holidays — International Tours, Domestic Tours (North), and an 'Be Adventurous' range — using mosaic photo treatments and vivid destination imagery.",
    overview:
      "Destination print collateral that packages the romance of travel into structured, browsable brochures for a tour operator.",
    challenge:
      "Travel pieces must feel abundant and exciting without becoming a chaotic photo dump.",
    solution:
      "Dynamic mosaic and faceted photo layouts organise dozens of destinations into energetic yet legible spreads.",
    outcomes: [
      "Abundant imagery kept organised and inviting",
      "Distinct ranges unified under one brand",
      "Print-ready, retail-facing collateral",
    ],
    insight:
      "Travel design sells longing — the layout has to feel like possibility, not a catalogue.",
  },
  {
    slug: "brochure-fellowship",
    source: F(19),
    title: "Fellowship Programme Brochure",
    category: "Brochures",
    wing: "print",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Print", "Brochure", "Editorial", "Information Design"],
    brief:
      "A multi-page brochure for PIBM's Doctorate / Fellowship Programme in Management — covering overview, eligibility, selection, and regulations.",
    overview:
      "A long-form editorial document that guides a serious, high-consideration audience through a complex academic programme.",
    challenge:
      "Dense regulatory and procedural content across many pages had to stay authoritative yet navigable.",
    solution:
      "A consistent editorial grid, clear section system, pull-quotes, and considered imagery give the document rhythm and a confident institutional voice.",
    outcomes: [
      "Complex programme made navigable across many pages",
      "Authoritative, premium editorial tone",
      "Reusable multi-page document system",
    ],
    insight:
      "Long documents are wayfinding problems — the reader should always know where they are.",
  },
  {
    slug: "brochure-global-degree",
    source: F(21),
    title: "Global Joint Degree Brochure",
    category: "Brochures",
    wing: "print",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Print", "Brochure", "Editorial", "Information Design"],
    brief:
      "A brochure for the PIBM × Lawrence Technological University Global Joint Degree Dual Programme — programme features, training, certifications, recruiters, fees and admission.",
    overview:
      "A flagship programme brochure marshalling a large amount of proof — features, recruiter logos, certifications, fees — into a persuasive, structured read.",
    challenge:
      "A premium international programme demanded credibility and density without overwhelming the prospective student.",
    solution:
      "A bold deep-blue system, panelled feature blocks, and logo walls organise the evidence into a confident, scannable narrative.",
    outcomes: [
      "High-trust, premium programme presentation",
      "Heavy proof organised into a clear story",
      "Consistent flagship-brochure system",
    ],
    insight:
      "Persuasion at this level is curation — show the strongest proof, structured to be believed.",
  },
  {
    slug: "cover-pages-journal",
    source: F(44),
    title: "Prospectus & Journal Covers",
    category: "Cover Pages",
    wing: "print",
    client: "PIBM",
    year: "2019 – 2022",
    startYear: 2019,
    endYear: 2022,
    phase: "integrated",
    tags: ["Print", "Editorial", "Cover", "Branding"],
    brief:
      "Cover designs including a PGDM management-programme prospectus and the 'Business Intervention & Technology' PIBM Management Journal.",
    overview:
      "Cover art that has to do a publication's whole job in one page — signalling category, quality, and theme before a page is turned.",
    challenge:
      "A cover must compress an entire publication's promise into a single, memorable composition.",
    solution:
      "Strong central concepts — a layered campus grid, a futuristic technology motif — paired with confident typographic lockups give each cover instant identity.",
    outcomes: [
      "Distinct, theme-true cover identities",
      "Premium first impression for each publication",
      "Consistent institutional cover language",
    ],
    insight:
      "A cover is a thesis statement — it should promise exactly what's inside.",
  },
  {
    slug: "invitation-convocation",
    source: F(48),
    title: "Convocation & CEO Charisma Invitations",
    category: "Invitation Cards",
    wing: "print",
    client: "PIBM",
    year: "2020 – 2025",
    startYear: 2020,
    endYear: 2025,
    phase: "integrated",
    tags: ["Print", "Invitation", "Event", "Branding"],
    brief:
      "Formal invitations for PIBM's 14th and 15th Convocation ceremonies and the CEO Charisma leadership event — gold-on-navy ceremonial cards.",
    overview:
      "Ceremonial invitation design where craft signals occasion — the card itself communicates the prestige of the event.",
    challenge:
      "Formal invitations must feel prestigious and celebratory while remaining clear and correct on every detail.",
    solution:
      "A gold-and-navy palette, ornamental framing, and refined typography create ceremony, with a disciplined information block ensuring legibility.",
    outcomes: [
      "Genuinely ceremonial, prestige feel",
      "Clear, correct event detailing",
      "Cohesive across multiple ceremonies",
    ],
    insight:
      "An invitation sets expectations — its craft is the first note of the event.",
  },
  {
    slug: "invitation-instudio",
    source: F(49),
    title: "inStudio Musical Event Invitation",
    category: "Invitation Cards",
    wing: "print",
    client: "inStudio Davenet",
    year: "2017 – 2018",
    startYear: 2017,
    endYear: 2018,
    phase: "production",
    tags: ["Print", "Invitation", "Event", "Production"],
    brief:
      "A printed invitation for inStudio Davenet's 'Aawaz Nai, Andaaz Wahi' musical event — a richly textured card with newspaper-style insert and floral motifs.",
    overview:
      "An early printed invitation that shows command of physical print craft — texture, type, and layout working together on real stock.",
    challenge:
      "A regional cultural event invitation had to feel rich and festive while remaining print-production-correct.",
    solution:
      "Warm metallic textures, expressive Devanagari and Latin type, and a structured insert balance festivity with legible event detail.",
    outcomes: [
      "Print-ready, texture-rich invitation",
      "Festive yet legible composition",
      "Early proof of production craft",
    ],
    insight:
      "Print remembers everything — designing for paper is designing for the physical world.",
  },

  // ───────────────────────── IDENTITY & BRAND ─────────────────────────
  {
    slug: "logo-designs",
    source: F(26),
    title: "Logo Collection",
    category: "Logo Designs",
    wing: "identity",
    client: "Various",
    year: "2016 – 2018",
    startYear: 2016,
    endYear: 2018,
    phase: "identity",
    tags: ["Logo", "Brand Identity", "Branding"],
    brief:
      "A collection of logomarks across industries — including vrat, FOOD'M, SB, MN Mehandi Art, Swibac, MK Marian Kids, and i-designworld.",
    overview:
      "A foundational identity collection demonstrating range — from playful F&B and kids' brands to elegant traditional marks — each tuned to its market.",
    challenge:
      "Every client needed a distinct, memorable mark suited to a different audience and industry.",
    solution:
      "Each logo starts from its brand's character — colour, form, and type chosen to fit the sector — proving versatility across very different briefs.",
    outcomes: [
      "Distinct marks across multiple industries",
      "Demonstrated identity versatility",
      "Scalable, application-ready logomarks",
    ],
    insight:
      "A logo isn't a drawing — it's the smallest possible container for a brand's character.",
  },
  {
    slug: "event-branding-pibm",
    source: F(17),
    title: "Event Branding Systems",
    category: "Event Branding",
    wing: "identity",
    client: "PIBM",
    year: "2019 – 2025",
    startYear: 2019,
    endYear: 2025,
    phase: "integrated",
    tags: ["Event", "Brand Identity", "Branding", "Campaign"],
    brief:
      "Event identity systems including the 6th International Conference, CEO Charisma, Leadership Talk, and Shivjanmotsav — logos and applied branding across formats.",
    overview:
      "Full event identities — not just posters but systems: an event logo, palette, and applied collateral that hold together across every touchpoint.",
    challenge:
      "Each flagship event needed its own identity that still belonged to the parent institute's brand.",
    solution:
      "Bespoke event logotypes and palettes are built within the institutional frame, then applied consistently across banners, cards, and signage.",
    outcomes: [
      "Distinct yet on-brand event identities",
      "Systems applied across multiple formats",
      "Reinforced flagship-event recognition",
    ],
    insight:
      "An event identity is a sub-brand — distinct enough to own the moment, loyal enough to belong.",
  },
  {
    slug: "branding-saksham-rojgar",
    source: F(45),
    title: "SAKSHAM Cycle Day & Rojgar Mela",
    category: "Identity / Branding",
    wing: "identity",
    client: "Government / Public Campaign",
    year: "2018 – 2019",
    startYear: 2018,
    endYear: 2019,
    phase: "identity",
    tags: ["Brand Identity", "Public Campaign", "Branding", "Print"],
    brief:
      "Public-campaign branding for SAKSHAM Cycle Day, Indore and the Dewas Rojgar (employment) Mela — campaign logos and bilingual promotional material.",
    overview:
      "Civic-campaign branding for public initiatives, designed to communicate clearly to a broad, general-public audience across languages.",
    challenge:
      "Government and public-campaign work must be inclusive, bilingual, and immediately legible to everyone.",
    solution:
      "Bold campaign marks, energetic illustration, and clear bilingual typography make the messages accessible and motivating across audiences.",
    outcomes: [
      "Inclusive, broadly legible public branding",
      "Bilingual communication handled cleanly",
      "Recognisable campaign identities",
    ],
    insight:
      "Public design has the widest audience and the least margin for ambiguity — clarity is everything.",
  },
];

export const exhibitBySlug = Object.fromEntries(
  exhibits.map((e) => [e.slug, e]),
) as Record<string, Exhibit>;
