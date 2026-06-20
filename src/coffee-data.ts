export const COFFEE_COUNTRIES = [
  'Brazil', 'Colombia', 'Ethiopia', 'Vietnam', 'Indonesia',
  'India', 'Honduras', 'Uganda', 'Guatemala', 'Mexico',
  'Nicaragua', 'Peru', 'Costa Rica', 'Kenya', 'Tanzania',
  'Rwanda', 'Burundi', 'El Salvador', 'Panama', 'China',
  'Thailand', 'Myanmar', 'Philippines', 'Malaysia', 'Laos',
  'Cambodia', 'Timor-Leste', 'Papua New Guinea', 'Sri Lanka',
  'Taiwan', 'Nepal', 'Bangladesh', 'Japan', 'Yemen',
  'Cuba', 'Jamaica', 'Dominican Republic', 'Haiti',
  'Puerto Rico', 'Ecuador', 'Bolivia', 'Venezuela',
  'Congo (DRC)', 'Madagascar', 'Cameroon', 'Zambia',
  'Zimbabwe', 'Malawi', 'Angola', 'Togo', 'Ghana',
  'Sierra Leone', 'Liberia', 'Nigeria', 'Ivory Coast',
  'Guinea', 'Central African Republic', 'Gabon',
  'Sao Tome & Principe', 'Mozambique', 'Suriname',
  'Fiji', 'Vanuatu', 'Solomon Islands', 'Hawaii',
  'New Caledonia', 'Trinidad & Tobago',
]

export const PROCESS_GROUPS = [
  { label: 'Washed', group: 'Traditional' },
  { label: 'Natural / Dry', group: 'Traditional' },
  { label: 'Honey (Yellow)', group: 'Traditional' },
  { label: 'Honey (Red)', group: 'Traditional' },
  { label: 'Honey (Black)', group: 'Traditional' },
  { label: 'Semi-Washed', group: 'Traditional' },
  { label: 'Wet-Hulled (Giling Basah)', group: 'Traditional' },
  { label: 'Pulped Natural', group: 'Traditional' },
  { label: 'Anaerobic Natural', group: 'Anaerobic' },
  { label: 'Anaerobic Washed', group: 'Anaerobic' },
  { label: 'Carbonic Maceration', group: 'Anaerobic' },
  { label: 'Double Carbonic Maceration', group: 'Anaerobic' },
  { label: 'Triple Carbonic Maceration', group: 'Anaerobic' },
  { label: 'Fruit Co-ferment', group: 'Co-fermentation' },
  { label: 'Wine Co-ferment', group: 'Co-fermentation' },
  { label: 'Yeast Co-ferment', group: 'Co-fermentation' },
  { label: 'Spice Co-ferment', group: 'Co-fermentation' },
  { label: 'Bean Co-ferment', group: 'Co-fermentation' },
  { label: 'Lactic Process', group: 'Experimental' },
  { label: 'Thermal Shock', group: 'Experimental' },
  { label: 'Frozen / Cryo', group: 'Experimental' },
  { label: 'Monsoon', group: 'Experimental' },
  { label: 'Peaberry', group: 'Experimental' },
  { label: 'Aged', group: 'Experimental' },
  { label: 'Raised Bed', group: 'Experimental' },
]

export const COFFEE_VARIETIES = [
  'Typica', 'Bourbon', 'Caturra', 'Catuai', 'Mundo Novo',
  'SL28', 'SL34', 'Geisha', 'Pacamara', 'Maragogype',
  'Catimor', 'Sarchimor', 'Castillo', 'Colombia', 'Tabi',
  'Ruiru 11', 'Batian', 'K7', 'Blue Mountain', 'Java',
  'Kent', 'Arusha', 'Mokka', 'Rume Sudan', 'Laurina',
  'Bourbon Pointu', 'Yellow Bourbon', 'Red Bourbon', 'Pink Bourbon',
  'Orange Bourbon', 'Yellow Caturra', 'Red Catuai', 'Yellow Catuai',
  'Icatu', 'Obata', 'Tupi', 'Acaua', 'Iapar 59',
  'Costa Rica 95', 'Marsellesa', 'Parainema', 'H1 Centroamericano',
  'Villa Sarchi', 'Villalobos', 'Garnica', 'Ethiopian Heirloom',
  'Yemenia', 'Timor Hybrid', 'Devamachy', 'S795', 'S288',
  'Cauvery', 'Chandragiri', 'Selection 9', 'Anodio',
]

export function getRoastLabel(value: number): string {
  if (value <= 10) return 'Cinnamon (Very Light)'
  if (value <= 25) return 'Light'
  if (value <= 38) return 'Light-Medium'
  if (value <= 55) return 'Medium'
  if (value <= 68) return 'Medium-Dark'
  if (value <= 80) return 'Dark'
  if (value <= 90) return 'Espresso'
  if (value <= 97) return 'French'
  return 'Italian (Charred)'
}

export function getRoastColor(value: number): string {
  const pct = value / 100
  const r = Math.round(141 + (55 - 141) * pct)
  const g = Math.round(115 + (35 - 115) * pct)
  const b = Math.round(75 + (5 - 75) * pct)
  return `rgb(${r}, ${g}, ${b})`
}

export interface TastingNotes {
  floral: string[]
  fruity: string[]
  sweet: string[]
  nutty: string[]
  spicy: string[]
  fermented: string[]
  other: string[]
}

export const EMPTY_TASTE_NOTES: TastingNotes = {
  floral: [], fruity: [], sweet: [], nutty: [],
  spicy: [], fermented: [], other: [],
}

export const TASTE_CATEGORIES: { key: keyof TastingNotes; label: string; suggestions: string[] }[] = [
  { key: 'floral', label: 'Floral', suggestions: ['jasmine', 'lavender', 'rose', 'chamomile', 'orange blossom', 'bergamot'] },
  { key: 'fruity', label: 'Fruity', suggestions: ['blueberry', 'strawberry', 'raspberry', 'blackberry', 'cherry', 'lemon', 'lime', 'orange', 'grapefruit', 'apple', 'pear', 'peach', 'apricot', 'mango', 'papaya', 'passionfruit', 'pineapple', 'lychee', 'raisin', 'fig', 'plum'] },
  { key: 'sweet', label: 'Sweet', suggestions: ['caramel', 'honey', 'maple syrup', 'brown sugar', 'vanilla', 'butterscotch', 'milk chocolate', 'dark chocolate', 'cocoa', 'nougat', 'toffee'] },
  { key: 'nutty', label: 'Nutty / Grain', suggestions: ['almond', 'hazelnut', 'walnut', 'peanut', 'pecan', 'macadamia', 'coconut', 'cereal', 'toast'] },
  { key: 'spicy', label: 'Spicy', suggestions: ['cinnamon', 'clove', 'nutmeg', 'ginger', 'cardamom', 'black pepper', 'anise', 'mint'] },
  { key: 'fermented', label: 'Fermented', suggestions: ['wine', 'whiskey', 'rum', 'brandy', 'vinegar', 'sourdough', 'yeast', 'overripe fruit'] },
  { key: 'other', label: 'Other', suggestions: ['tobacco', 'leather', 'cedar', 'pine', 'earthy', 'woody', 'smoky', 'herbal', 'grassy', 'tea-like', 'black tea', 'green tea'] },
]

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function getFreshness(roastDate: string): { label: string; color: string } {
  const days = daysSince(roastDate)
  if (days <= 3) return { label: 'Degassing', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' }
  if (days <= 7) return { label: 'Degassing', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' }
  if (days <= 14) return { label: 'Optimal', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' }
  if (days <= 30) return { label: 'Optimal', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' }
  return { label: 'Stale', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' }
}
