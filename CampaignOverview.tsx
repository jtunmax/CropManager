import { useEffect, useState } from 'react';
import { ArrowRight, HeartPulse, Leaf, Loader2, MapPin, Plus, Target, TreePine, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTreeRecords, type TreeFeature } from '@/services/featureService';
import { CAMPAIGN_TARGET, CAMPAIGN_TARGET_YEAR, summarizeCampaignRecords } from '@/services/campaignService';

interface CampaignOverviewProps {
  refreshTrigger: number;
  onRecord: () => void;
  onInsights: () => void;
  onCommunity: () => void;
  onNeedsCare: () => void;
}

export function CampaignOverview({ refreshTrigger, onRecord, onInsights, onCommunity, onNeedsCare }: CampaignOverviewProps) {
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    getTreeRecords().then(records => { if (active) setTrees(records); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshTrigger]);
  const summary = summarizeCampaignRecords(trees);

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-6">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase"><Target className="h-4 w-4" /> National ambition</div>
        <h2 className="mt-3 text-4xl font-bold text-foreground">{CAMPAIGN_TARGET.toLocaleString('en-US')}</h2>
        <p className="text-lg font-semibold text-primary mt-1">trees by {CAMPAIGN_TARGET_YEAR}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">A shared effort led by the Belize Forest Department under the Greening Belize Initiative to restore Belize’s landscapes—one backyard, school, community, and planting site at a time.</p>
        <Button onClick={onRecord} className="mt-5 w-full gap-2"><Plus className="h-4 w-4" /> Record a tree</Button>
      </section>

      <section>
        <h3 className="font-semibold text-foreground">Recorded in this app</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Demonstration records. Not verified national progress.</p>
        {loading ? <Loader2 aria-label="Loading record summary" className="my-6 h-5 w-5 animate-spin text-primary" /> : (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            {[
              { label: 'Tree records', value: summary.records, icon: TreePine },
              { label: 'Species recorded', value: summary.species, icon: Leaf },
              { label: 'Reported healthy', value: summary.reportedAlive, icon: HeartPulse },
              { label: 'Newly planted', value: summary.newlyPlanted, icon: MapPin },
            ].map(item => <div key={item.label}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><item.icon className="h-3.5 w-3.5 shrink-0" />{item.label}</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{item.value}</dd>
            </div>)}
          </dl>
        )}
      </section>

      <section className="border-y border-border py-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><HeartPulse className="h-4 w-4 text-destructive" /> Keep trees growing</div>
        <p className="mt-2 text-sm text-muted-foreground">{loading ? 'Checking records…' : `${summary.needsCare} records marked as needing care.`}</p>
        <Button variant="outline" onClick={onNeedsCare} className="mt-3 w-full justify-between gap-2">View trees needing care<ArrowRight className="h-4 w-4" /></Button>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">Condition reflects the latest report, not a confirmed survival rate.</p>
      </section>

      <div className="space-y-2">
        <Button variant="outline" onClick={onInsights} className="w-full justify-between">Campaign insights<ArrowRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={onCommunity} className="w-full justify-start gap-2 text-muted-foreground"><Users className="h-4 w-4" /> Community recognition</Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">Every contribution matters—from individual planters to schools, businesses, government agencies, and NGOs.</p>
    </div>
  );
}