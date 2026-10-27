import type { TreeFeature } from '@/services/featureService';

export const CAMPAIGN_TARGET = 1_000_000;
export const CAMPAIGN_TARGET_YEAR = 2030;

/** Latest reported condition, not confirmed survival or an official campaign total. */
export function summarizeCampaignRecords(trees: TreeFeature[]) {
  return {
    records: trees.length,
    species: new Set(trees.map(tree => tree.treeType.trim().toLowerCase()).filter(Boolean)).size,
    needsCare: trees.filter(tree => tree.status === 'needs_care').length,
    newlyPlanted: trees.filter(tree => tree.status === 'planted').length,
    reportedAlive: trees.filter(tree => tree.status === 'alive').length,
  };
}