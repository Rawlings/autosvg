// How the set is organised: 8 sections, 28 categories, and every vector in exactly ONE category.
//
// The shape comes from two sources. PriceRunner's 14 top-level categories (Home & Interior, Garden & Patio, Toys &
// Hobbies, Computing, Health & Beauty, ...) say what real products and shops need vectors for. Lucide and Tabler
// (about 40 flat categories each: Arrows, Devices, Food, Weather, ...) say how a vector library keeps that findable.
// Ours has two levels like PriceRunner and a plain, flat list of names like Lucide.
//
// Rules, so the set stays orderly as it grows:
//  - A vector lives in one category, chosen by what the thing IS, not by where it is used (a bell is `status`, even
//    though a shop might use it). Other ways to find it are search terms (apps/studio/src/data/search-terms.ts).
//  - A state is never a vector of its own (mic-off belongs to mic), so a category lists base names only.
//  - Sections are fixed. A new category needs a reason (about 8 vectors that no other category fits); until then it
//    goes in the nearest one. Run `pnpm categories:check`: it fails for a vector with no category or a name twice.
//  - Keep each list sorted: the file is read by people.

export const SECTIONS = [
  { id: 'interface', label: 'Interface' },
  { id: 'content', label: 'Content and data' },
  { id: 'devices', label: 'Devices and media' },
  { id: 'people', label: 'People and access' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'living', label: 'Home and living' },
  { id: 'world', label: 'Nature and world' },
  { id: 'activity', label: 'Making and play' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

export interface Category {
  readonly id: string
  readonly section: SectionId
  readonly label: string
  /** What belongs here, in a line: the test for "does this vector go in this category?". */
  readonly about: string
  /** The PriceRunner category (or categories) this serves: where the next vectors are needed. */
  readonly shops?: string
  /** The vectors, sorted. */
  readonly members: readonly string[]
}

const list = (names: string): readonly string[] => names.trim().split(/\s+/)

export const CATEGORIES = [
  // Interface -----------------------------------------------------------------------------------------------------
  {
    id: 'actions',
    section: 'interface',
    label: 'Actions',
    about: 'Verbs a person triggers: edit, copy, send, search, undo.',
    members: list(`backspace check close copy crop download edit expand external-link filter link log-out maximize
      paperclip plus refresh repeat return save scissors search send share shuffle sort trash undo zoom`),
  },
  {
    id: 'controls',
    section: 'interface',
    label: 'Controls and layout',
    about: 'Parts of an interface: switches, menus, panes, grids, cursors, settings.',
    members: list(`align checkbox cursor grid knob layers layout list menu more power radio settings sidebar sliders
      table text-cursor toggle window`),
  },
  {
    id: 'status',
    section: 'interface',
    label: 'Status and reactions',
    about: 'What state something is in, and how people respond to it: alerts, loading, likes.',
    members: list(`alert-circle alert-triangle ban bell flag heart help info loader siren smile star thumbs-up`),
  },
  {
    id: 'shapes',
    section: 'interface',
    label: 'Shapes and symbols',
    about: 'Plain geometry and typographic marks with no subject of their own.',
    members: list(`asterisk at-sign circle cube diamond hash hexagon spark triangle`),
  },

  // Content and data ----------------------------------------------------------------------------------------------
  {
    id: 'files',
    section: 'content',
    label: 'Files and writing',
    about: 'Documents, folders, books and the things used to keep or print them.',
    members: list(`archive book-open bookmark clipboard file folder inbox notebook stamp sticky-note type`),
  },
  {
    id: 'design',
    section: 'content',
    label: 'Design and drawing',
    about: 'Tools and marks for making an image: pens, paint, frames.',
    members: list(`crayon feather frame palette pen-tool`),
  },
  {
    id: 'charts',
    section: 'content',
    label: 'Charts and maths',
    about: 'Measuring, counting, plotting: charts, gauges, operators.',
    members: list(`activity bar-chart calculator equal gauge infinity percent pie-chart sigma trending`),
  },
  {
    id: 'code',
    section: 'content',
    label: 'Code and data',
    about: 'Software and data: code, version control, databases, networks of things.',
    members: list(`bot braces brackets branch code component database git-commit git-pull-request network server
      terminal workflow`),
  },
  {
    id: 'time',
    section: 'content',
    label: 'Time and calendar',
    about: 'Clocks, dates and durations.',
    members: list(`alarm-clock calendar clock hourglass timer watch`),
  },

  // Devices and media ---------------------------------------------------------------------------------------------
  {
    id: 'computing',
    section: 'devices',
    label: 'Computing and devices',
    about: 'Computers, phones and what plugs into them.',
    shops: 'Computing, Phones & Wearables',
    members: list(
      `battery bolt chip hard-drive keyboard laptop monitor mouse plug printer smartphone tablet tv webcam`,
    ),
  },
  {
    id: 'connectivity',
    section: 'devices',
    label: 'Connectivity',
    about: 'Signals and links between devices: wireless, broadcast, casting.',
    members: list(`bluetooth cast radar radio-tower rss signal wifi`),
  },
  {
    id: 'sound',
    section: 'devices',
    label: 'Sound and music',
    about: 'Hearing and making sound: speakers, playback, instruments.',
    shops: 'Sound & Vision, Gaming & Entertainment (musical instruments)',
    members: list(`disc drum headphones metronome mic music play skip speaker volume`),
  },
  {
    id: 'photo',
    section: 'devices',
    label: 'Photo and video',
    about: 'Still and moving pictures, and showing them.',
    shops: 'Photography',
    members: list(`camera film image presentation video`),
  },

  // People and access ---------------------------------------------------------------------------------------------
  {
    id: 'people',
    section: 'people',
    label: 'People and access',
    about: 'Who someone is and what they may do: accounts, identity, locks, visibility.',
    members: list(`accessibility eye id-card key lock shield user users`),
  },
  {
    id: 'communication',
    section: 'people',
    label: 'Communication',
    about: 'Saying something to someone: mail, messages, calls, announcements.',
    members: list(`chat mail megaphone phone`),
  },

  // Commerce ------------------------------------------------------------------------------------------------------
  {
    id: 'shopping',
    section: 'commerce',
    label: 'Shopping and payments',
    about: 'Buying and selling: baskets, prices, money, tickets, codes on products.',
    shops: 'the whole of PriceRunner: a shop, a basket, a price, a deal',
    members: list(`banknote barcode cart credit-card dollar-sign gift qr-code receipt scale shopping-bag store tag
      ticket wallet`),
  },
  {
    id: 'fashion',
    section: 'commerce',
    label: 'Fashion and accessories',
    about: 'What is worn or carried.',
    shops: 'Clothing & Accessories',
    members: list(`backpack briefcase crown gem glasses shirt top-hat`),
  },

  // Home and living -----------------------------------------------------------------------------------------------
  {
    id: 'home',
    section: 'living',
    label: 'Home and furniture',
    about: 'The house and what is in it, apart from the kitchen.',
    shops: 'Home & Interior',
    members: list(`bed bench candle chair door home lamp lantern sofa stool vase washing-machine`),
  },
  {
    id: 'food',
    section: 'living',
    label: 'Food and kitchen',
    about: 'What is eaten and drunk, and what it is cooked or kept in.',
    shops: 'Home & Interior (kitchen appliances, food and drink)',
    members: list(`apple cake cherry coffee cup cupcake egg fish fridge ice-cream jar kettle lollipop mushroom
      popsicle pot toaster utensils wine`),
  },
  {
    id: 'garden',
    section: 'living',
    label: 'Garden and outdoors',
    about: 'Gardening, camping and the things kept outside.',
    shops: 'Garden & Patio, Sports & Outdoor (camping)',
    members: list(`bucket cactus fence flower rake shovel sprout tent tree watering-can`),
  },

  // Nature and world ----------------------------------------------------------------------------------------------
  {
    id: 'places',
    section: 'world',
    label: 'Direction and places',
    about: 'Where things are and how to get there: maps, arrows, landmarks and buildings.',
    members: list(`arrow building chevron compass globe hydrant landmark lighthouse locate map map-pin navigation pin
      route signpost`),
  },
  {
    id: 'transport',
    section: 'world',
    label: 'Transport',
    about: 'Vehicles and what keeps them moving or safe.',
    shops: 'Motor Transport',
    members: list(`anchor car life-buoy rocket sailboat train`),
  },
  {
    id: 'weather',
    section: 'world',
    label: 'Weather and sky',
    about: 'Conditions, the sun and moon, water falling.',
    members: list(`cloud droplet moon rainbow snowflake sun sunrise tornado umbrella wind`),
  },
  {
    id: 'nature',
    section: 'world',
    label: 'Nature and animals',
    about: 'Landscape, plants growing wild, animals and what they leave.',
    members: list(`bone flame leaf mountain paw-print waves`),
  },

  // Making and play -----------------------------------------------------------------------------------------------
  {
    id: 'tools',
    section: 'activity',
    label: 'Tools and DIY',
    about: 'Things used to build, mend and measure.',
    shops: 'Do it yourself',
    members: list(`flashlight hammer hard-hat ladder magnet paint-roller ruler screwdriver traffic-cone wrench`),
  },
  {
    id: 'health',
    section: 'activity',
    label: 'Health and sport',
    about: 'Looking after a body: medicine, exercise, winning.',
    shops: 'Health & Beauty, Sports & Outdoor',
    members: list(`award bandage dumbbell pill syringe target thermometer trophy`),
  },
  {
    id: 'play',
    section: 'activity',
    label: 'Games and toys',
    about: 'Play, parties and toys.',
    shops: 'Toys & Hobbies, Kids & Family, Gaming & Entertainment',
    members: list(`balloon dice gamepad ghost kite party-popper`),
  },
  {
    id: 'learning',
    section: 'activity',
    label: 'Science and learning',
    about: 'Ideas, school and the lab.',
    members: list(`atom flask graduation-cap lightbulb`),
  },
] as const satisfies readonly Category[]

export type CategoryId = (typeof CATEGORIES)[number]['id']

const home = new Map<string, Category>()
for (const category of CATEGORIES) for (const name of category.members) home.set(name, category)

/** The category a vector lives in, or undefined for a name that has none (the check script reports those). */
export const categoryOf = (name: string): Category | undefined => home.get(name)

/** The sections with their categories, in display order. */
export const bySection = (): readonly { id: SectionId; label: string; categories: readonly Category[] }[] =>
  SECTIONS.map((s) => ({ ...s, categories: CATEGORIES.filter((c) => c.section === s.id) }))

/** Every vector name that appears in a category, with the names that appear in more than one. */
export const listedNames = (): { names: readonly string[]; duplicates: readonly string[] } => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const category of CATEGORIES) {
    for (const name of category.members) {
      if (seen.has(name)) duplicates.add(name)
      seen.add(name)
    }
  }
  return { names: [...seen], duplicates: [...duplicates] }
}
