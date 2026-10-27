import { describe, expect, it } from 'vitest';
import { CAMPAIGN_TARGET, CAMPAIGN_TARGET_YEAR, summarizeCampaignRecords } from '@/services/campaignService';
import type { TreeFeature } from '@/services/featureService';

const tree = (objectId: number, status?: TreeFeature['status']): TreeFeature => ({
  objectId, status, latitude: 17, longitude: -88, treeType: 'mahogany',
  reason: 'reforestation', notes: '', submittedBy: 'Contributor', submittedDate: new Date('2026-10-22'),
});

describe('Greening Belize campaign', () => {
  it('has a one-million-tree target', () => expect(CAMPAIGN_TARGET).toBe(1_000_000));
  it('targets 2030', () => expect(CAMPAIGN_TARGET_YEAR).toBe(2030));
  it('keeps unknown and newly planted conditions out of reported alive totals', () => {
    expect(summarizeCampaignRecords([tree(1, 'alive'), tree(2, 'planted'), tree(3), tree(4, 'needs_care'), tree(5, 'dead')]))
      .toEqual({ records: 5, species: 1, needsCare: 1, newlyPlanted: 1, reportedAlive: 1 });
  });
});