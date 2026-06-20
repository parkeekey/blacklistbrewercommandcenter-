export type CustomerProfile = 'R' | 'P' | 'U' | 'C' | 'A'

export type MenuCategory = 'Iced Coffee Drinks' | 'Espresso Drinks' | 'Brewed/Filter Coffee' | 'Other'

export type AutoDecide = 'hot' | 'ice' | 'decided'
export type Sweetness = 'regular' | 'less-sweet' | 'more-sweet' | 'no-sweet'

export interface Recipe {
  grindSize?: number
  ratio?: string
  temp?: number
  dose?: number
  espressoYield?: number
  ice?: number
  cupSize?: number
  milk?: number
  water?: number
  tdsRange?: [number, number]
  eyRange?: [number, number]
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: MenuCategory
  autoDecide: AutoDecide
  beanId?: string
  active: boolean
  recipe?: Recipe
  createdAt: string
}

import type { TastingNotes } from './coffee-data'

export interface BeanInventory {
  id: string
  name: string
  origin: string
  variety?: string
  process: string
  group: CustomerProfile
  costPerGram: number
  stockGrams: number
  density?: number
  altitude?: number
  roastLevel: number
  roastDate?: string
  tastingNotes: TastingNotes
  createdAt: string
}

export type InvTransactionType = 'purchase' | 'usage' | 'adjustment' | 'spoilage'

export interface InventoryTransaction {
  id: string
  date: string
  beanId: string
  beanName: string
  type: InvTransactionType
  quantity: number
  costPerGram: number
  totalCost: number
  note: string
  createdAt: string
}

export interface BeanCostSummary {
  fifoCostPerGram: number
  lifoCostPerGram: number
  avgCostPerGram: number
  totalInvested: number
  totalUsedGrams: number
}

export interface SaleItem {
  menuItemId: string
  menuItemName: string
  price: number
  quantity: number
  autoDecide: AutoDecide
  sweetness?: Sweetness
  doseOverride?: number
  doseUpcharge?: number
}

export interface Sale {
  id: string
  items: SaleItem[]
  total: number
  timestamp: string
  customerProfile: CustomerProfile
  nationality: string
  note: string
  discountPercent?: number
}

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy'

export interface WeatherLog {
  id: string
  timestamp: string
  condition: WeatherCondition
  temperature: number
  humidity: number
  uvIndex: number
  wind: number
  feelsLike: number
  rainRisk: number
  flavors?: string[]
}

export interface OperatorState {
  energy: number
  mood: number
  difficulty: number
  resistance: number
}

export interface ActionPoints {
  speed: number
  quality: number
  service: number
  focus: number
}

export interface DifficultyLog {
  id: string
  timestamp: string
  value: number
  note: string
}

export interface ResistLog {
  id: string
  timestamp: string
  value: number
  note: string
}

export interface DarkEventLog {
  id: string
  timestamp: string
  note: string
}

export interface DayRun {
  id: string
  date: string
  dayNumber: number
  startTime?: string
  endTime?: string
  goalMin: number
  goalMax: number
  weatherLogs: WeatherLog[]
  operatorState: OperatorState | null
  actionPoints: ActionPoints | null
  sales: Sale[]
  note: string
  status: 'active' | 'paused' | 'ended'
  difficultyLogs?: DifficultyLog[]
  resistLogs?: ResistLog[]
  darkEventLogs?: DarkEventLog[]
}

export type PosMode = 'operational' | 'aftercount'

export interface PurchaseOrderItem {
  itemName: string
  category: string
  quantity: number
  unit: string
  totalCost: number
  note: string
  purchaseDate: string
  expirationDate?: string
  roastedDate?: string
  fundingSourceId?: string
}

export const PURCHASE_CATEGORIES = ['Coffee Beans', 'Daily product', 'Syrup & Ingredients', 'Cups & Lids', 'Straw & Utensil', 'Packaging', 'Cleaning', 'Equipment', 'Other']

export interface PurchaseOrder {
  id: string
  createdAt: string
  executedAt?: string
  items: PurchaseOrderItem[]
  status: 'draft' | 'executed'
  note: string
}

export interface FundingSource {
  id: string
  name: string
  initialAmount: number
  createdAt: string
  categories: string[]
}

export interface AppData {
  menu: MenuItem[]
  beans: BeanInventory[]
  runs: DayRun[]
  transactions: InventoryTransaction[]
  purchaseOrders: PurchaseOrder[]
  fundingSources: FundingSource[]
  activeRunId: string | null
  mode: PosMode
}

export const CUSTOMER_PROFILES: { label: string; value: CustomerProfile; description: string; color: string }[] = [
  { label: 'Returning', value: 'R', description: 'Returning guest — best one', color: 'emerald' },
  { label: 'Pro', value: 'P', description: 'Prosumer — coffee lover', color: 'amber' },
  { label: 'Upgraded', value: 'U', description: 'Needs special menu', color: 'violet' },
  { label: 'Common', value: 'C', description: 'Standard espresso/americano', color: 'slate' },
  { label: 'Agent', value: 'A', description: 'Rival/snob — stay vigilant', color: 'rose' },
]

export const MENU_CATEGORIES: MenuCategory[] = [
  'Iced Coffee Drinks',
  'Espresso Drinks',
  'Brewed/Filter Coffee',
  'Other',
]

export const AUTO_DECIDE_OPTIONS: { label: string; value: AutoDecide }[] = [
  { label: 'Hot', value: 'hot' },
  { label: 'Ice', value: 'ice' },
  { label: 'Decided', value: 'decided' },
]

export const NATIONALITIES = [
  'Thai', 'Arab', 'European', 'Asian', 'Russian', 'Chinese', 'Korean',
  'Indian', 'Japanese', 'US', 'UK', 'Australian', 'African', 'Latin', 'None',
]
