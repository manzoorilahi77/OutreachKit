// Vendored from manzoorilahi77/base-website src/themes/library.ts at commit ff0b440e3b4c5bee9b6f9bdafb2458b647641d7e.
// Do not edit by hand: run `pnpm themes:sync`. Everything below this header is a verbatim copy.
// GENERATED FROM the prompt-coach reference `ui-style-library.md`.
// All 50 palette + typography combos, transcribed verbatim.
// Hex values are copied exactly from the reference - do not "improve" or normalise them.
//
// This is the ONLY file in the repo that may contain raw hex values.
// Components must consume colors through the Tailwind @theme variables
// (bg-bg, text-text, bg-accent, ...). See CLAUDE.md.

export type ThemeMode = 'light' | 'dark'

/** Typography direction ids, T1-T10. */
export type TypeId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'T9' | 'T10'

/** Palette combo ids, C1-C50. */
export type ThemeId =
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4'
  | 'C5'
  | 'C6'
  | 'C7'
  | 'C8'
  | 'C9'
  | 'C10'
  | 'C11'
  | 'C12'
  | 'C13'
  | 'C14'
  | 'C15'
  | 'C16'
  | 'C17'
  | 'C18'
  | 'C19'
  | 'C20'
  | 'C21'
  | 'C22'
  | 'C23'
  | 'C24'
  | 'C25'
  | 'C26'
  | 'C27'
  | 'C28'
  | 'C29'
  | 'C30'
  | 'C31'
  | 'C32'
  | 'C33'
  | 'C34'
  | 'C35'
  | 'C36'
  | 'C37'
  | 'C38'
  | 'C39'
  | 'C40'
  | 'C41'
  | 'C42'
  | 'C43'
  | 'C44'
  | 'C45'
  | 'C46'
  | 'C47'
  | 'C48'
  | 'C49'
  | 'C50'

/** A font family key resolved to a real loader in `fonts.ts`. */
export type FontFamilyKey =
  | 'bitter'
  | 'bodoniModa'
  | 'dmSans'
  | 'ibmPlexSans'
  | 'inter'
  | 'jost'
  | 'libreCaslonText'
  | 'nunito'
  | 'nunitoSans'
  | 'sourceSans3'
  | 'sourceSerif4'
  | 'zillaSlab'

export interface TypeDirection {
  id: TypeId
  name: string
  /** Font families as written in the reference library. */
  fonts: string
  character: string
  /** Family key used for headings. */
  display: FontFamilyKey
  /** Family key used for body copy. */
  body: FontFamilyKey
}

export interface Theme {
  id: ThemeId
  name: string
  mode: ThemeMode
  /** Optional nuance from the reference label, e.g. "warm", "parchment". */
  tone?: string
  bg: string
  surface: string
  text: string
  muted: string
  accent: string
  positive: string
  negative: string
  type: TypeDirection
  bestFor: string
}

export const TYPE_DIRECTIONS: Record<
  TypeId,
  Omit<TypeDirection, 'display' | 'body'> & {
    display: FontFamilyKey
    body: FontFamilyKey
  }
> = {
  T1: {
    id: 'T1',
    name: 'Neo-Grotesque',
    fonts: 'Inter or Neue Haas Grotesk',
    character: 'neutral Swiss sans, hierarchy from size alone',
    display: 'inter',
    body: 'inter',
  },
  T2: {
    id: 'T2',
    name: 'Humanist Warm',
    fonts: 'Nunito Sans or Figtree',
    character: 'friendly humanist sans, less clinical',
    display: 'nunitoSans',
    body: 'nunitoSans',
  },
  T3: {
    id: 'T3',
    name: 'Editorial Serif+Sans',
    fonts: 'Source Serif 4 + Inter',
    character: 'serif display over quiet sans body',
    display: 'sourceSerif4',
    body: 'inter',
  },
  T4: {
    id: 'T4',
    name: 'Bookish Serif',
    fonts: 'Bitter or Source Serif 4',
    character: 'serif throughout, reading-first',
    display: 'bitter',
    body: 'bitter',
  },
  T5: {
    id: 'T5',
    name: 'Geometric Display',
    fonts: 'Jost + DM Sans',
    character: 'circular caps for headlines, plain sans body',
    display: 'jost',
    body: 'dmSans',
  },
  T6: {
    id: 'T6',
    name: 'Old-Style Refined',
    fonts: 'Libre Caslon + Source Sans 3',
    character: 'classical high-trust serif display',
    display: 'libreCaslonText',
    body: 'sourceSans3',
  },
  T7: {
    id: 'T7',
    name: 'Mono-Forward',
    fonts: 'IBM Plex Sans + IBM Plex Mono',
    character: 'sans prose; numbers, labels, data in mono',
    display: 'ibmPlexSans',
    body: 'ibmPlexSans',
  },
  T8: {
    id: 'T8',
    name: 'Soft Rounded',
    fonts: 'Nunito or Quicksand',
    character: 'rounded terminals, encouraging tone',
    display: 'nunito',
    body: 'nunito',
  },
  T9: {
    id: 'T9',
    name: 'Didone Display',
    fonts: 'Bodoni Moda + Inter',
    character: 'high-contrast fashion serif display',
    display: 'bodoniModa',
    body: 'inter',
  },
  T10: {
    id: 'T10',
    name: 'Typewriter Slab',
    fonts: 'Zilla Slab + Source Sans 3',
    character: 'slab display, sans body',
    display: 'zillaSlab',
    body: 'sourceSans3',
  },
}

export const THEMES: Record<ThemeId, Theme> = {
  C1: {
    id: 'C1',
    name: "Banker's Indigo",
    mode: 'light',
    bg: '#FFFFFF',
    surface: '#F5F7FB',
    text: '#1B2240',
    muted: '#636E92',
    accent: '#3A56C8',
    positive: '#177E58',
    negative: '#C03038',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'payments and billing dashboards',
  },
  C2: {
    id: 'C2',
    name: 'Private Vault',
    mode: 'light',
    tone: 'warm',
    bg: '#F8F5EE',
    surface: '#FFFFFF',
    text: '#26231B',
    muted: '#7E7862',
    accent: '#8A6D24',
    positive: '#33795B',
    negative: '#B0392E',
    type: TYPE_DIRECTIONS.T6,
    bestFor: 'wealth management, high-trust advisory',
  },
  C3: {
    id: 'C3',
    name: 'Mint Ledger',
    mode: 'light',
    bg: '#F4FAF6',
    surface: '#FFFFFF',
    text: '#1B3324',
    muted: '#5F7A68',
    accent: '#0F8A5F',
    positive: '#2FA36B',
    negative: '#C24C33',
    type: TYPE_DIRECTIONS.T7,
    bestFor: 'bookkeeping and expense tracking',
  },
  C4: {
    id: 'C4',
    name: 'Navy & Brass',
    mode: 'dark',
    bg: '#101A2C',
    surface: '#18253C',
    text: '#E7ECF5',
    muted: '#8DA0BC',
    accent: '#D9A441',
    positive: '#4FBE8B',
    negative: '#E36060',
    type: TYPE_DIRECTIONS.T3,
    bestFor: 'executive reporting, board decks',
  },
  C5: {
    id: 'C5',
    name: 'Counting House',
    mode: 'light',
    bg: '#F3F2EE',
    surface: '#FCFBF8',
    text: '#2A2723',
    muted: '#7B766C',
    accent: '#8E2F38',
    positive: '#2E7D52',
    negative: '#B04226',
    type: TYPE_DIRECTIONS.T4,
    bestFor: 'accounting software, audit trails',
  },
  C6: {
    id: 'C6',
    name: 'Cobalt Wire',
    mode: 'light',
    bg: '#FFFFFF',
    surface: '#F4F7FB',
    text: '#17263B',
    muted: '#5E7189',
    accent: '#1D5FBF',
    positive: '#1B7E5A',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'B2B payments, treasury tools',
  },
  C7: {
    id: 'C7',
    name: 'Graphite & Sky',
    mode: 'light',
    bg: '#F5F7F9',
    surface: '#FFFFFF',
    text: '#232E38',
    muted: '#6C7B88',
    accent: '#2E8BC7',
    positive: '#28855F',
    negative: '#BE4048',
    type: TYPE_DIRECTIONS.T7,
    bestFor: 'financial analytics, forecasting',
  },
  C8: {
    id: 'C8',
    name: 'Evergreen Trust',
    mode: 'light',
    bg: '#F3F6F3',
    surface: '#FFFFFF',
    text: '#1F2C24',
    muted: '#69796D',
    accent: '#1D5E45',
    positive: '#3D8B37',
    negative: '#B8422F',
    type: TYPE_DIRECTIONS.T6,
    bestFor: 'insurance, savings, pensions',
  },
  C9: {
    id: 'C9',
    name: 'Midnight Bond',
    mode: 'dark',
    bg: '#0F1118',
    surface: '#181B24',
    text: '#ECEDF2',
    muted: '#8F94A3',
    accent: '#E3C88F',
    positive: '#5BC490',
    negative: '#E5646E',
    type: TYPE_DIRECTIONS.T9,
    bestFor: 'premium cards, membership finance',
  },
  C10: {
    id: 'C10',
    name: 'Steel Invoice',
    mode: 'light',
    bg: '#FBFCFD',
    surface: '#F2F5F8',
    text: '#212B36',
    muted: '#687583',
    accent: '#4A6FA5',
    positive: '#257A5C',
    negative: '#BE4048',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'invoicing, quotes, contracts',
  },
  C11: {
    id: 'C11',
    name: 'Terminal Green',
    mode: 'dark',
    bg: '#0C1210',
    surface: '#141C18',
    text: '#DFEAE3',
    muted: '#7E9488',
    accent: '#3FCF6E',
    positive: '#3FCF6E',
    negative: '#E0555C',
    type: TYPE_DIRECTIONS.T7,
    bestFor: 'developer tools, CLIs with a GUI',
  },
  C12: {
    id: 'C12',
    name: 'Carbon Indigo',
    mode: 'dark',
    bg: '#101014',
    surface: '#1A1A20',
    text: '#E9E9EF',
    muted: '#8B8FA0',
    accent: '#6E79D6',
    positive: '#43BE83',
    negative: '#E5484D',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'issue trackers, project tools',
  },
  C13: {
    id: 'C13',
    name: 'Obsidian Amber',
    mode: 'dark',
    bg: '#14120D',
    surface: '#1E1B14',
    text: '#EFEBE0',
    muted: '#9A927E',
    accent: '#E5A83B',
    positive: '#55B96E',
    negative: '#E0555C',
    type: TYPE_DIRECTIONS.T5,
    bestFor: 'monitoring, alerting, on-call',
  },
  C14: {
    id: 'C14',
    name: 'Deep Space Cyan',
    mode: 'dark',
    bg: '#0A1220',
    surface: '#121C2E',
    text: '#E2E9F2',
    muted: '#7E90AA',
    accent: '#38BDDC',
    positive: '#55B96E',
    negative: '#E0555C',
    type: TYPE_DIRECTIONS.T7,
    bestFor: 'infrastructure and network dashboards',
  },
  C15: {
    id: 'C15',
    name: 'Porcelain Rose',
    mode: 'light',
    bg: '#FBF8F9',
    surface: '#FFFFFF',
    text: '#2E2226',
    muted: '#8A767E',
    accent: '#D6577C',
    positive: '#27A874',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T3,
    bestFor: 'design and review tools',
  },
  C16: {
    id: 'C16',
    name: 'Glacier',
    mode: 'light',
    bg: '#F6FAFD',
    surface: '#FFFFFF',
    text: '#1E2B36',
    muted: '#68798A',
    accent: '#3E88C4',
    positive: '#257A5C',
    negative: '#BE4048',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'reading and research tools',
  },
  C17: {
    id: 'C17',
    name: 'Basalt Lime',
    mode: 'dark',
    bg: '#121408',
    surface: '#1B1E10',
    text: '#EBEEDC',
    muted: '#93987C',
    accent: '#A8CC3A',
    positive: '#A8CC3A',
    negative: '#E0555C',
    type: TYPE_DIRECTIONS.T5,
    bestFor: 'fitness and training trackers',
  },
  C18: {
    id: 'C18',
    name: 'Lilac Stage',
    mode: 'light',
    bg: '#FAF8FD',
    surface: '#FFFFFF',
    text: '#2A2333',
    muted: '#7E7590',
    accent: '#9D5BD2',
    positive: '#27A874',
    negative: '#D6455D',
    type: TYPE_DIRECTIONS.T9,
    bestFor: 'music, video, media libraries',
  },
  C19: {
    id: 'C19',
    name: 'Gunmetal Signal',
    mode: 'dark',
    bg: '#14171A',
    surface: '#1D2126',
    text: '#E9ECEF',
    muted: '#8B939C',
    accent: '#E8703A',
    positive: '#55B96E',
    negative: '#E0555C',
    type: TYPE_DIRECTIONS.T7,
    bestFor: 'logistics, fleet, warehouse ops',
  },
  C20: {
    id: 'C20',
    name: 'Void Violet',
    mode: 'dark',
    bg: '#131126',
    surface: '#1C1933',
    text: '#EAE8F5',
    muted: '#918CAD',
    accent: '#8F7FF7',
    positive: '#58C99A',
    negative: '#E5646E',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'AI products, technical SaaS',
  },
  C21: {
    id: 'C21',
    name: 'Cornflower Pop',
    mode: 'light',
    bg: '#FBFCFF',
    surface: '#FFFFFF',
    text: '#232839',
    muted: '#717A90',
    accent: '#4E7DF2',
    positive: '#27A874',
    negative: '#D6455D',
    type: TYPE_DIRECTIONS.T2,
    bestFor: 'team SaaS, onboarding-heavy products',
  },
  C22: {
    id: 'C22',
    name: 'Peach Sorbet',
    mode: 'light',
    tone: 'warm',
    bg: '#FFF9F5',
    surface: '#FFFFFF',
    text: '#33291F',
    muted: '#8A7B6E',
    accent: '#F2764B',
    positive: '#27A874',
    negative: '#D6455D',
    type: TYPE_DIRECTIONS.T8,
    bestFor: 'habit trackers, family apps',
  },
  C23: {
    id: 'C23',
    name: 'Lagoon',
    mode: 'light',
    bg: '#F4FBFA',
    surface: '#FFFFFF',
    text: '#173230',
    muted: '#5E7B78',
    accent: '#12939B',
    positive: '#27A874',
    negative: '#D6455D',
    type: TYPE_DIRECTIONS.T2,
    bestFor: 'travel and booking apps',
  },
  C24: {
    id: 'C24',
    name: 'Bubblegum Slate',
    mode: 'light',
    bg: '#FAFAFC',
    surface: '#FFFFFF',
    text: '#2B2B33',
    muted: '#767685',
    accent: '#E25C9C',
    positive: '#27A874',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T8,
    bestFor: 'social and community apps',
  },
  C25: {
    id: 'C25',
    name: 'Citrus Morning',
    mode: 'light',
    tone: 'cream',
    bg: '#FFFDF4',
    surface: '#FFFFFF',
    text: '#2E2A1D',
    muted: '#847C66',
    accent: '#E88A1F',
    positive: '#27A874',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T5,
    bestFor: 'personal productivity, to-dos',
  },
  C26: {
    id: 'C26',
    name: 'Sky Kite',
    mode: 'light',
    bg: '#F5FAFF',
    surface: '#FFFFFF',
    text: '#1E2E3C',
    muted: '#66788A',
    accent: '#2F9BE8',
    positive: '#27A874',
    negative: '#D6455D',
    type: TYPE_DIRECTIONS.T8,
    bestFor: 'kids and education apps',
  },
  C27: {
    id: 'C27',
    name: 'Grape Soda',
    mode: 'light',
    bg: '#FBF9FF',
    surface: '#FFFFFF',
    text: '#28223A',
    muted: '#7A7290',
    accent: '#7B4FD8',
    positive: '#27A874',
    negative: '#D6455D',
    type: TYPE_DIRECTIONS.T2,
    bestFor: 'notes, journaling, creative SaaS',
  },
  C28: {
    id: 'C28',
    name: 'Fresh Fern',
    mode: 'light',
    bg: '#F7FBF3',
    surface: '#FFFFFF',
    text: '#22301D',
    muted: '#71816A',
    accent: '#4E9E3D',
    positive: '#4E9E3D',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T8,
    bestFor: 'plants, food logging, light health',
  },
  C29: {
    id: 'C29',
    name: 'Coral Reef',
    mode: 'light',
    bg: '#FFFFFF',
    surface: '#FBF6F6',
    text: '#2E2326',
    muted: '#87757A',
    accent: '#E85D67',
    positive: '#27A874',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T2,
    bestFor: 'dating, lifestyle, events',
  },
  C30: {
    id: 'C30',
    name: 'Butter & Denim',
    mode: 'light',
    bg: '#FDFBF0',
    surface: '#FFFFFF',
    text: '#242A3D',
    muted: '#767E93',
    accent: '#33549E',
    positive: '#27A874',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T5,
    bestFor: 'newsletters, blogging platforms',
  },
  C31: {
    id: 'C31',
    name: 'Terracotta Kiln',
    mode: 'light',
    tone: 'warm',
    bg: '#F6EFE7',
    surface: '#FDF9F4',
    text: '#372C22',
    muted: '#8A7B6A',
    accent: '#BC5B32',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T6,
    bestFor: "artisanal commerce, makers' shops",
  },
  C32: {
    id: 'C32',
    name: 'Olive Grove',
    mode: 'light',
    tone: 'warm',
    bg: '#F5F4EA',
    surface: '#FCFBF4',
    text: '#2C2E1F',
    muted: '#7C7E68',
    accent: '#68742F',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T4,
    bestFor: 'recipes, food and cooking apps',
  },
  C33: {
    id: 'C33',
    name: 'Desert Clay',
    mode: 'light',
    tone: 'warm',
    bg: '#F3EADF',
    surface: '#FBF5EC',
    text: '#393026',
    muted: '#8B7D6C',
    accent: '#B5573F',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T10,
    bestFor: 'travel journals, guides',
  },
  C34: {
    id: 'C34',
    name: 'Cacao',
    mode: 'light',
    tone: 'warm',
    bg: '#F2ECE6',
    surface: '#FAF6F1',
    text: '#33281E',
    muted: '#847666',
    accent: '#6B4A32',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T4,
    bestFor: 'coffee, chocolate, food brands',
  },
  C35: {
    id: 'C35',
    name: 'Rosewood',
    mode: 'light',
    tone: 'blush',
    bg: '#FAF4F2',
    surface: '#FFFFFF',
    text: '#33262A',
    muted: '#8A767C',
    accent: '#A5474E',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T9,
    bestFor: 'beauty, boutique retail',
  },
  C36: {
    id: 'C36',
    name: 'Harvest Amber',
    mode: 'light',
    tone: 'warm',
    bg: '#FCF7EC',
    surface: '#FFFFFF',
    text: '#31291B',
    muted: '#847A64',
    accent: '#B26E0E',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T2,
    bestFor: "local commerce, farmers' markets",
  },
  C37: {
    id: 'C37',
    name: 'Sage Spa',
    mode: 'light',
    bg: '#F3F7F2',
    surface: '#FCFEFB',
    text: '#25332B',
    muted: '#75857C',
    accent: '#6B9080',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T8,
    bestFor: 'wellness, meditation, sleep',
  },
  C38: {
    id: 'C38',
    name: 'Ochre Study',
    mode: 'light',
    tone: 'parchment',
    bg: '#F7F3E8',
    surface: '#FDFAF2',
    text: '#312B1D',
    muted: '#82796A',
    accent: '#9C7514',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T3,
    bestFor: 'learning, libraries, reading apps',
  },
  C39: {
    id: 'C39',
    name: 'Brick & Linen',
    mode: 'light',
    bg: '#F7F4EF',
    surface: '#FDFBF8',
    text: '#332B26',
    muted: '#867C72',
    accent: '#9E3B2F',
    positive: '#4F7D46',
    negative: '#8A2A20',
    type: TYPE_DIRECTIONS.T10,
    bestFor: 'heritage and craft brands',
  },
  C40: {
    id: 'C40',
    name: 'Driftwood',
    mode: 'light',
    tone: 'stone',
    bg: '#F4F1EC',
    surface: '#FBF9F6',
    text: '#332E28',
    muted: '#847C71',
    accent: '#7D6752',
    positive: '#4F7D46',
    negative: '#A93226',
    type: TYPE_DIRECTIONS.T6,
    bestFor: 'minimal journals, quiet lifestyle tools',
  },
  C41: {
    id: 'C41',
    name: 'Gallery White',
    mode: 'light',
    tone: 'stark',
    bg: '#FFFFFF',
    surface: '#F6F6F5',
    text: '#111111',
    muted: '#6E6E6A',
    accent: '#111111',
    positive: '#1F7A44',
    negative: '#C8102E',
    type: TYPE_DIRECTIONS.T9,
    bestFor: 'portfolios, galleries, studios',
  },
  C42: {
    id: 'C42',
    name: 'Riso Blue',
    mode: 'light',
    bg: '#F4F6FF',
    surface: '#FFFFFF',
    text: '#1B2145',
    muted: '#6B7194',
    accent: '#2A3BC8',
    positive: '#1F7A44',
    negative: '#C8102E',
    type: TYPE_DIRECTIONS.T5,
    bestFor: 'zines, indie creative tools',
  },
  C43: {
    id: 'C43',
    name: 'Chartreuse Court',
    mode: 'light',
    bg: '#FAFAF5',
    surface: '#FFFFFF',
    text: '#22251A',
    muted: '#7C8069',
    accent: '#8FA818',
    positive: '#2E7D52',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'creative suites, agency tools',
  },
  C44: {
    id: 'C44',
    name: 'Vermilion Press',
    mode: 'light',
    tone: 'warm',
    bg: '#FBF9F4',
    surface: '#FFFFFF',
    text: '#211E19',
    muted: '#7B7669',
    accent: '#D0432B',
    positive: '#1F7A44',
    negative: '#A82814',
    type: TYPE_DIRECTIONS.T3,
    bestFor: 'magazines, news, longform',
  },
  C45: {
    id: 'C45',
    name: 'Ultramarine Poster',
    mode: 'light',
    bg: '#F2F4FC',
    surface: '#FFFFFF',
    text: '#1A2150',
    muted: '#6A7095',
    accent: '#2B3FD8',
    positive: '#1F7A44',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T5,
    bestFor: 'events, campaigns, launches',
  },
  C46: {
    id: 'C46',
    name: 'Magenta Signal',
    mode: 'light',
    bg: '#FFFFFF',
    surface: '#F9F4F8',
    text: '#2A2028',
    muted: '#877D85',
    accent: '#C42B8A',
    positive: '#1F7A44',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T1,
    bestFor: 'fashion, creator platforms',
  },
  C47: {
    id: 'C47',
    name: 'Teal & Tangerine',
    mode: 'light',
    bg: '#F6FBFB',
    surface: '#FFFFFF',
    text: '#1C2F2D',
    muted: '#66807D',
    accent: '#0E8578',
    positive: '#27A874',
    negative: '#D96C2B',
    type: TYPE_DIRECTIONS.T2,
    bestFor: 'playful brand and marketing tools',
  },
  C48: {
    id: 'C48',
    name: 'Noir Editorial',
    mode: 'dark',
    bg: '#121212',
    surface: '#1C1C1C',
    text: '#F2F2ED',
    muted: '#9A9A94',
    accent: '#EDEDE6',
    positive: '#5BC490',
    negative: '#E5646E',
    type: TYPE_DIRECTIONS.T9,
    bestFor: 'photography, film portfolios',
  },
  C49: {
    id: 'C49',
    name: 'Cobalt & Butter',
    mode: 'light',
    bg: '#FFFBEA',
    surface: '#FFFFFF',
    text: '#22283D',
    muted: '#7A7F93',
    accent: '#2149B8',
    positive: '#2E7D52',
    negative: '#C13440',
    type: TYPE_DIRECTIONS.T10,
    bestFor: 'indie apps with personality',
  },
  C50: {
    id: 'C50',
    name: 'Redline Mono',
    mode: 'light',
    tone: 'mono',
    bg: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#161616',
    muted: '#6F6F6F',
    accent: '#D42F2F',
    positive: '#1F7A44',
    negative: '#D42F2F',
    type: TYPE_DIRECTIONS.T7,
    bestFor: 'metrics, timing, sports data',
  },
}

/** All 50 combos in reference order, for THEMES.md and /style-guide. */
export const THEME_LIST: readonly Theme[] = Object.values(THEMES)

export function getTheme(id: ThemeId): Theme {
  return THEMES[id]
}
