import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, TreePine, List, Users, TrendingUp, LayoutDashboard, Target } from 'lucide-react';
import { MapView, MapFilter } from '@/components/MapView';
import { TreeSubmissionForm, TreeSubmissionData } from '@/components/TreeSubmissionForm';
import { TreeList } from '@/components/TreeList';
import { Leaderboard } from '@/components/Leaderboard';
import { ImpactDashboard } from '@/components/ImpactDashboard';
import { FullDashboard } from '@/components/FullDashboard';
import { CampaignOverview } from '@/components/CampaignOverview';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { submitTreeRecord, getTreeCount, TreeFeature } from '@/services/featureService';

export function Dashboard() {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocationIsWater, setSelectedLocationIsWater] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [treeCount, setTreeCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'list' | 'leaderboard' | 'impact' | 'add' | 'dashboard'>('list');
  const [mapFilter, setMapFilter] = useState<MapFilter | null>(null);
  const [selectedTreeFromMap, setSelectedTreeFromMap] = useState<TreeFeature | null>(null);
  const [showTreeDetail, setShowTreeDetail] = useState(false);
  const [recordStatus, setRecordStatus] = useState('');
  const [recordFilterKey, setRecordFilterKey] = useState(0);
  const [showCampaign, setShowCampaign] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCount() {
      try {
        const count = await getTreeCount();
        setTreeCount(count);
      } catch (error) {
        console.error('Failed to fetch tree count:', error);
      }
    }
    fetchCount();
  }, [refreshTrigger]);

  const handleLocationSelect = useCallback((lat: number, lng: number, meta?: { inWater: boolean }) => {
    setSelectedLocation({ lat, lng });
    setSelectedLocationIsWater(meta?.inWater ?? false);
    setShowForm(true);
    setSidebarTab('add');
  }, []);

  const handleTreeSelect = useCallback((tree: TreeFeature) => {
    setSelectedLocation({ lat: tree.latitude, lng: tree.longitude });
    setSelectedTreeFromMap(tree);
    setSidebarTab('list');
    setShowForm(true);
  }, []);

  const handleTreeClickFromMap = useCallback((tree: TreeFeature) => {
    setSelectedTreeFromMap(tree);
    setSidebarTab('list');
    setShowForm(true);
  }, []);

  const handleViewDetails = useCallback((tree: TreeFeature) => {
    setSelectedTreeFromMap(tree);
    setSidebarTab('list');
    setShowForm(true);
    setShowTreeDetail(true);
  }, []);

  const handleSubmit = async (data: TreeSubmissionData) => {
    try {
      await submitTreeRecord({
        latitude: data.latitude, longitude: data.longitude,
        treeType: data.treeType, reason: data.reason, notes: data.notes,
        imageBase64: data.imageBase64, submittedBy: data.submittedBy,
        status: data.status, healthScore: data.healthScore,
        treeHeight: data.treeHeight, canopyWidth: data.canopyWidth,
      });
      toast({ title: 'Tree recorded successfully!', description: `Location: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` });
      const newCount = await getTreeCount();
      setTreeCount(newCount);
      setRefreshTrigger((prev) => prev + 1);
      setShowForm(false);
      setSelectedLocation(null);
      setSidebarTab('list');
    } catch (error) {
      toast({ title: 'Submission failed', description: error instanceof Error ? error.message : 'Failed to record tree.', variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedLocation(null);
  };

  const showRecords = (status = '') => {
    setRecordStatus(status);
    setRecordFilterKey(key => key + 1);
    setMapFilter(status ? { status } : null);
    setSidebarTab('list');
    setShowTreeDetail(false);
    setShowForm(true);
    setShowCampaign(false);
  };
  const campaignOverview = <CampaignOverview
    refreshTrigger={refreshTrigger}
    onRecord={() => { setShowCampaign(false); setSidebarTab('add'); setShowForm(true); }}
    onInsights={() => { setShowCampaign(false); setSidebarTab('dashboard'); }}
    onCommunity={() => { setShowCampaign(false); setSidebarTab('leaderboard'); setShowForm(true); }}
    onNeedsCare={() => showRecords('needs_care')}
  />;

  // If Insights tab is active, render the full-screen dashboard
  if (sidebarTab === 'dashboard') {
    return (
      <FullDashboard
        refreshTrigger={refreshTrigger}
        onBack={() => setSidebarTab('list')}
        onLocationSelect={handleLocationSelect}
        onTreeClick={handleTreeClickFromMap}
        selectedLocation={selectedLocation}
        selectedTree={selectedTreeFromMap}
        mapFilter={mapFilter}
        onMapFilterChange={setMapFilter}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Campaign panel - desktop only */}
        <div className="hidden lg:flex lg:flex-1 lg:min-w-0 lg:h-full bg-card/95 backdrop-blur-xl border-r border-border/50 flex-col shadow-lg">
          <div className="border-b border-border/50 bg-muted/30 px-4 pt-4 pb-3">
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-forest-light flex items-center justify-center">
                <Target className="w-4 h-4 text-primary-foreground" />
              </div>
              Campaign overview
            </h2>
          </div>
          <div className="flex-1 p-5 overflow-y-auto min-h-0">
            {campaignOverview}
          </div>
        </div>

        {/* Map section */}
        <div className="flex-1 relative min-h-0 lg:h-full">
          <div className="absolute inset-0 p-3 pb-20 lg:p-4 lg:pr-0 lg:pb-4">
            <MapView 
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
              refreshTrigger={refreshTrigger}
              onTreeClick={handleTreeClickFromMap}
              onViewDetails={handleViewDetails}
              selectedTree={selectedTreeFromMap}
              mapFilter={mapFilter}
            />
          </div>

          {/* Stats overlay */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="absolute top-32 right-4 lg:top-20 lg:right-8 z-10"
          >
            <div className="glass-card rounded-lg lg:rounded-xl px-2 py-1.5 lg:px-3.5 lg:py-2.5 flex items-center gap-2 lg:gap-2.5">
              <div className="relative">
                <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-md lg:rounded-lg bg-gradient-to-br from-primary to-forest-light flex items-center justify-center shadow-soft">
                  <TreePine className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary-foreground" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-accent flex items-center justify-center"
                >
                  <span className="text-[5px] lg:text-[7px] font-bold text-accent-foreground">✓</span>
                </motion.div>
              </div>
              <div>
                <p className="text-lg lg:text-xl font-bold text-foreground tracking-tight">{treeCount}</p>
                <p className="text-[8px] lg:text-[10px] text-muted-foreground font-medium">Tree Records</p>
              </div>
            </div>
          </motion.div>

          {/* Mobile buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:hidden z-10 flex gap-2">
            <Button variant="outline" size="icon" aria-label="Open campaign overview" className="h-12 w-12 bg-card" onClick={() => { setShowCampaign(true); setShowForm(true); }}><Target className="h-5 w-5" /></Button>
            <Button size="default" variant="outline" className="shadow-lg bg-card/95 backdrop-blur-sm h-12 px-4"
              aria-label="Open tree records" onClick={() => showRecords()}>
              <List className="w-5 h-5" />
            </Button>
            <Button size="default" className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all px-5 gap-2 h-12"
              onClick={() => { setShowForm(true); setSidebarTab('add'); }}>
              <Plus className="w-5 h-5" /> Record Tree
            </Button>
          </div>
        </div>

        {/* Side panel */}
        <div className={`lg:flex-1 lg:min-w-0 lg:h-full bg-card/95 backdrop-blur-xl border-l border-border/50 flex flex-col shadow-lg ${
          showForm ? 'fixed inset-0 top-16 z-20 lg:relative lg:top-0 overflow-hidden' : 'hidden lg:flex'
        }`}>
          <div className="border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <Tabs value={sidebarTab} onValueChange={(v) => { setShowCampaign(false); setSidebarTab(v as typeof sidebarTab); }} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="list" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-2">
                    <List className="w-3.5 h-3.5" />
                    <span>Records</span>
                  </TabsTrigger>
                  <TabsTrigger value="leaderboard" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-2">
                    <Users className="w-3.5 h-3.5 hidden xl:block" />
                    <span>Community</span>
                  </TabsTrigger>
                  <TabsTrigger value="impact" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Impact</span>
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="gap-1 text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-2">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Insights</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="icon" aria-label="Back to map" onClick={handleCancel} className="lg:hidden ml-2 shrink-0 hover:bg-destructive/10 hover:text-destructive">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto min-h-0">
            {showCampaign && <div className="lg:hidden">{campaignOverview}</div>}
            {!showCampaign && sidebarTab === 'list' && (
              <TreeList
                onTreeSelect={handleTreeSelect}
                initialStatus={recordStatus}
                filterResetKey={recordFilterKey}
                refreshTrigger={refreshTrigger}
                selectedTree={selectedTreeFromMap}
                autoShowDetail={showTreeDetail}
                onDetailClosed={() => setShowTreeDetail(false)}
              />
            )}
            {!showCampaign && sidebarTab === 'leaderboard' && (
              <div className="h-full">
                <Leaderboard refreshTrigger={refreshTrigger} />
              </div>
            )}
            {!showCampaign && sidebarTab === 'impact' && <ImpactDashboard refreshTrigger={refreshTrigger} />}
            {!showCampaign && sidebarTab === 'add' && (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-forest-light flex items-center justify-center shadow-soft">
                    <TreePine className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-foreground">Record New Tree</h2>
                    <p className="text-sm text-muted-foreground">Add details about your planting</p>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TreeSubmissionForm selectedLocation={selectedLocation} isWater={selectedLocationIsWater} onSubmit={handleSubmit} onCancel={handleCancel} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
