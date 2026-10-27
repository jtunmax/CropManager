export interface TreeTypeOption {
  value: string;
  label: string;
  /** True for species that tolerate waterlogged / saline coastal sites */
  waterTolerant?: boolean;
}

export const TREE_TYPES: TreeTypeOption[] = [
  { value: 'mahogany', label: 'Mahogany' },
  { value: 'cedar', label: 'Spanish Cedar' },
  { value: 'ceiba', label: 'Ceiba (Cotton Tree)' },
  { value: 'cohune', label: 'Cohune Palm' },
  { value: 'mangrove', label: 'Mangrove', waterTolerant: true },
  { value: 'neem', label: 'Neem' },
  { value: 'coconut', label: 'Coconut Palm', waterTolerant: true },
  { value: 'breadfruit', label: 'Breadfruit' },
  { value: 'mango', label: 'Mango' },
  { value: 'citrus', label: 'Citrus (Orange/Lime/Grapefruit)' },
  { value: 'avocado', label: 'Avocado' },
  { value: 'cacao', label: 'Cacao' },
  { value: 'cashew', label: 'Cashew', waterTolerant: true },
  { value: 'soursop', label: 'Soursop' },
  { value: 'guanacaste', label: 'Guanacaste' },
  { value: 'santa_maria', label: 'Santa Maria' },
  { value: 'sapodilla', label: 'Sapodilla (Chicle)' },
  { value: 'calabash', label: 'Calabash', waterTolerant: true },
  { value: 'pine', label: 'Caribbean Pine' },
  { value: 'bamboo', label: 'Bamboo', waterTolerant: true },
  { value: 'fruit', label: 'Fruit Tree (Other)' },
  { value: 'native', label: 'Native Species (Other)' },
  { value: 'other', label: 'Other' },
];

/** Species that may be planted in or beside water */
export const WATER_TOLERANT_TREE_TYPES = TREE_TYPES.filter((t) => t.waterTolerant);

export const TREE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TREE_TYPES.map((t) => [t.value, t.label])
);

export const PLANTING_REASONS = [
  { value: 'reforestation', label: 'Reforestation' },
  { value: 'hurricane_recovery', label: 'Hurricane Recovery' },
  { value: 'mangrove_restoration', label: 'Mangrove / Coastal Restoration' },
  { value: 'carbon_offset', label: 'Carbon Offset' },
  { value: 'wildlife_habitat', label: 'Wildlife Habitat' },
  { value: 'riparian_buffer', label: 'River / Creek Buffer' },
  { value: 'erosion_control', label: 'Erosion Control' },
  { value: 'shade', label: 'Shade' },
  { value: 'fruit_production', label: 'Fruit Production' },
  { value: 'agroforestry', label: 'Agroforestry / Farm Use' },
  { value: 'beautification', label: 'Beautification' },
  { value: 'school_project', label: 'School / Youth Project' },
  { value: 'community_project', label: 'Community Project' },
  { value: 'memorial', label: 'Memorial / Dedication' },
  { value: 'other', label: 'Other' },
];

export const REASON_LABELS: Record<string, string> = Object.fromEntries(
  PLANTING_REASONS.map((r) => [r.value, r.label])
);
