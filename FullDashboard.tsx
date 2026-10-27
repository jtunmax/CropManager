import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TreePine, Leaf, Heart, Activity, TrendingUp, Wind,
  Users, Target, BarChart3, Loader2, List, X,
  ArrowLeft, Sparkles, Brain, DollarSign, ShieldCheck,
  Lightbulb, Zap, Droplets
} from 'lucide-react';
import { MapView, MapFilter } from '@/components/MapView';
import { TreeList } from '@/components/TreeList';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { format } from 'date-fns';

interface FullDashboardProps {
  refreshTrigger: number;
  onBack: () => void;
  onLocationSelect: (lat: number, lng: number) => void;
  onTreeClick: (tree: TreeFeature) => void;
  selectedLocation: { lat: number; lng: number } | null;
  selectedTree: TreeFeature | null;
  mapFilter: MapFilter | null;
  onMapFilterChange: (filter: MapFilter | null) => void;
  onSubmit: (data: any) => void;
}

interface AIInsights {
  summary: string;
  co2_insight: string;
  biodiversity_score: number;
  health_prediction: string;
  recommendations: string[];
  fun_fact: string;
  ecosystem_value: string;
}

const COLORS = [
  'hsl(142, 71%, 35%)', 'hsl(199, 89%, 48%)', 'hsl(45, 93%, 47%)',
  'hsl(0, 72%, 51%)', 'hsl(271, 81%, 56%)', 'hsl(187, 85%, 43%)',
  'hsl(25, 95%, 53%)', 'hsl(330, 81%, 60%)'
];

const CO2_LOOKUP: Record<string, number> = {
  'Mahogany': 35, 'Cedar': 30, 'Ceiba': 45, 'Mango': 18,
  'Coconut': 15, 'Citrus': 12, 'default': 20,
};


const noop = () => {};

export function FullDashboard({
  refreshTrigger, onBack, onLocationSelect, onTreeClick,
  selectedLocation, selectedTree, mapFilter, onMapFilterChange, onSubmit
}: FullDashboardProps) {
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState<'list' | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const records = await getTreeRecords();
        setTrees(records);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    if (trees.length === 0 || aiInsights) return;
    fetchAIInsights();
  }, [trees]);

  const fetchAIInsights = async () => {
    if (trees.length === 0) return;
    setAiLoading(true);
    try {
      const speciesCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};
      trees.forEach(t => {
        speciesCounts[t.treeType || 'Unknown'] = (speciesCounts[t.treeType || 'Unknown'] || 0) + 1;
        statusCounts[t.status || 'unknown'] = (statusCounts[t.status || 'unknown'] || 0) + 1;
      });
      const scored = trees.filter(t => t.healthScore != null);
      const avgH = scored.length ? scored.reduce((s, t) => s + (t.healthScore || 0), 0) / scored.length : 0;
      const totalCO2Val = trees.reduce((sum, t) => sum + (CO2_LOOKUP[t.treeType] || CO2_LOOKUP['default']), 0);

      const treeSummary = {
        totalTrees: trees.length,
        speciesDistribution: speciesCounts,
        statusDistribution: statusCounts,
        averageHealthScore: Math.round(avgH * 10) / 10,
        totalCO2OffsetKg: totalCO2Val,
        uniqueSpecies: Object.keys(speciesCounts).length,
        healthyTreesPercent: scored.length ? Math.round(scored.filter(t => (t.healthScore || 0) >= 7).length / scored.length * 100) : 0,
        oldestPlanting: trees.length ? format(new Date(Math.min(...trees.map(t => t.submittedDate.getTime()))), 'MMMM yyyy') : 'N/A',
        newestPlanting: trees.length ? format(new Date(Math.max(...trees.map(t => t.submittedDate.getTime()))), 'MMMM yyyy') : 'N/A',
        totalPlanters: new Set(trees.map(t => t.submittedBy)).size,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-trees`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ treeSummary }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAiInsights(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // === Computed data ===
  const speciesCount = useMemo(() => new Set(trees.map(t => t.treeType)).size, [trees]);
  const avgHealth = useMemo(() => {
    const scored = trees.filter(t => t.healthScore != null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, t) => s + (t.healthScore || 0), 0) / scored.length * 10) / 10;
  }, [trees]);
  const totalCO2 = useMemo(() => trees.reduce((sum, t) => sum + (CO2_LOOKUP[t.treeType] || CO2_LOOKUP['default']), 0), [trees]);
  const healthyCount = useMemo(() => trees.filter(t => (t.healthScore || 0) >= 7).length, [trees]);
  const needsCareCount = useMemo(() => trees.filter(t => t.healthScore != null && t.healthScore <= 4).length, [trees]);
  const treesThisMonth = useMemo(() => {
    const now = new Date();
    return trees.filter(t => t.submittedDate.getMonth() === now.getMonth() && t.submittedDate.getFullYear() === now.getFullYear()).length;
  }, [trees]);

  const treeTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => { counts[t.treeType || 'Unknown'] = (counts[t.treeType || 'Unknown'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [trees]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => { const s = t.status || 'unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [trees]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    trees.forEach(t => { const key = format(t.submittedDate, 'MMM yyyy'); months[key] = (months[key] || 0) + 1; });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [trees]);

  const topPlanters = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => { const name = t.submittedBy || 'Anonymous'; counts[name] = (counts[name] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [trees]);

  // Oxygen production estimate: avg tree produces ~100 lbs O2/year
  const oxygenKg = useMemo(() => Math.round(trees.length * 45.4), [trees]);

  // Interaction handlers (no map zoom, just visual filtering)
  const handleTypeClick = (type: string) => {
    const newFilter = activeFilter === `type:${type}` ? null : `type:${type}`;
    setActiveFilter(newFilter);
    onMapFilterChange(newFilter ? { type } : null);
  };

  const handleStatusClick = (status: string) => {
    const key = status.replace(' ', '_');
    const newFilter = activeFilter === `status:${key}` ? null : `status:${key}`;
    setActiveFilter(newFilter);
    onMapFilterChange(newFilter ? { status: key } : null);
  };

  const handleHealthClick = (range: 'healthy' | 'needs_care') => {
    const newFilter = activeFilter === `health:${range}` ? null : `health:${range}`;
    setActiveFilter(newFilter);
    onMapFilterChange(newFilter ? { healthRange: range } : null);
  };

  const handlePlanterClick = (name: string) => {
    const newFilter = activeFilter === `planter:${name}` ? null : `planter:${name}`;
    setActiveFilter(newFilter);
    onMapFilterChange(newFilter ? { submittedBy: name } : null);
  };

  const cardAnim = (i: number) => ({
    initial: { opacity: 0, y: 12 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 300, damping: 25 },
  });

  if (loading) {
    return (
      <div className="h-screen bg-muted/30 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-muted/30 flex flex-col overflow-hidden">
      <Header />

      {/* Dashboard toolbar */}
      <div className="px-3 lg:px-4 pt-2 pb-1 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Map
        </Button>
        <div className="flex items-center gap-2">
          {activeFilter && (
            <Badge variant="secondary" className="text-[10px] cursor-pointer gap-1" onClick={() => { setActiveFilter(null); onMapFilterChange(null); }}>
              ✕ Clear Filter
            </Badge>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setShowPanel('list')}>
            <List className="w-3.5 h-3.5" /> Records
          </Button>
        </div>
      </div>

      {/* Full-screen dashboard grid */}
      <main className="flex-1 px-3 lg:px-4 pb-3 lg:pb-4 min-h-0 overflow-auto">
        <div className="h-full grid grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-2.5 lg:gap-3 max-w-[1800px] mx-auto">

          {/* === ROW 1: KPI Cards === */}
          {[
            { icon: TreePine, label: 'Tree Records', value: trees.length, gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary' },
            { icon: Leaf, label: 'Species', value: speciesCount, gradient: 'from-accent/15 to-accent/5', iconColor: 'text-accent' },
            { icon: Heart, label: 'Avg Health', value: `${avgHealth}/10`, gradient: 'from-destructive/12 to-destructive/5', iconColor: 'text-destructive' },
            { icon: Target, label: 'National target · 2030', value: '1,000,000', gradient: 'from-primary/12 to-accent/5', iconColor: 'text-primary' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} {...cardAnim(i)}>
              <Card className="bg-card border-border/40 hover:shadow-soft transition-shadow">
                <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shrink-0`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xl lg:text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* === ROW 2-3: Map (2 cols, 2 rows) + Species + Health === */}
          <motion.div {...cardAnim(4)} className="col-span-2 row-span-2 min-h-[260px] lg:min-h-0">
            <Card className="h-full border-border/40 overflow-hidden">
              <CardContent className="p-0 h-full relative">
                <MapView
                  onLocationSelect={noop}
                  selectedLocation={null}
                  refreshTrigger={refreshTrigger}
                  onTreeClick={noop}
                  selectedTree={null}
                  mapFilter={mapFilter}
                  readOnly
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Species Distribution */}
          <motion.div {...cardAnim(5)}>
            <Card className="h-full border-border/40">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <TreePine className="w-3.5 h-3.5 text-primary" /> Species
                  </h4>
                  {activeFilter?.startsWith('type:') && (
                    <Badge variant="secondary" className="text-[9px] cursor-pointer h-5" onClick={() => { setActiveFilter(null); onMapFilterChange(null); }}>✕</Badge>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  {treeTypeData.length > 0 ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 min-h-[80px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={treeTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="65%" innerRadius="35%"
                              onClick={(_, index) => handleTypeClick(treeTypeData[index].name)} className="cursor-pointer">
                              {treeTypeData.map((entry, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={activeFilter && activeFilter !== `type:${entry.name}` ? 0.25 : 1} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {treeTypeData.slice(0, 4).map((item, i) => (
                          <button key={item.name} onClick={() => handleTypeClick(item.name)}
                            className={`flex items-center gap-1.5 w-full text-left rounded px-1 py-0.5 transition-colors ${activeFilter === `type:${item.name}` ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[9px] text-foreground truncate flex-1">{item.name}</span>
                            <span className="text-[9px] text-muted-foreground">{item.value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center"><p className="text-xs text-muted-foreground">No data</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Health Overview */}
          <motion.div {...cardAnim(6)}>
            <Card className="h-full border-border/40">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col">
                <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" /> Health
                </h4>
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{avgHealth}<span className="text-sm text-muted-foreground font-normal">/10</span></p>
                    <Progress value={avgHealth * 10} className="h-1.5 mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => handleHealthClick('healthy')}
                      className={`rounded-lg p-2 text-center transition-all border ${activeFilter === 'health:healthy' ? 'border-accent bg-accent/15 ring-1 ring-accent/30' : 'border-border/30 bg-accent/5 hover:bg-accent/10'}`}>
                      <p className="text-lg font-bold text-accent">{healthyCount}</p>
                      <p className="text-[9px] text-muted-foreground">Healthy</p>
                    </button>
                    <button onClick={() => handleHealthClick('needs_care')}
                      className={`rounded-lg p-2 text-center transition-all border ${activeFilter === 'health:needs_care' ? 'border-destructive bg-destructive/15 ring-1 ring-destructive/30' : 'border-border/30 bg-destructive/5 hover:bg-destructive/10'}`}>
                      <p className="text-lg font-bold text-destructive">{needsCareCount}</p>
                      <p className="text-[9px] text-muted-foreground">Need Care</p>
                    </button>
                  </div>
                  {aiInsights?.health_prediction && (
                    <div className="mt-1 p-1.5 rounded-md bg-primary/5 border border-primary/10">
                      <div className="flex items-start gap-1">
                        <Brain className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <p className="text-[9px] text-muted-foreground leading-tight">{aiInsights.health_prediction}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* === ROW 4: Bottom widgets filling full width === */}

          {/* Top Planters - clickable to filter map */}
          <motion.div {...cardAnim(7)}>
            <Card className="h-full border-border/40">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" /> Community contributors
                  </h4>
                  {activeFilter?.startsWith('planter:') && (
                    <Badge variant="secondary" className="text-[9px] cursor-pointer h-5" onClick={() => { setActiveFilter(null); onMapFilterChange(null); }}>✕</Badge>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 flex flex-col justify-center">
                  {topPlanters.map((p, i) => (
                    <button key={p.name} onClick={() => handlePlanterClick(p.name)}
                      className={`flex items-center gap-2 text-xs w-full text-left rounded px-1 py-1 transition-colors ${activeFilter === `planter:${p.name}` ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}>
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{i + 1}</span>
                      <span className="flex-1 text-foreground truncate">{p.name}</span>
                      <span className="text-muted-foreground font-medium">{p.count}</span>
                    </button>
                  ))}
                  {topPlanters.length === 0 && <p className="text-xs text-muted-foreground text-center">No data</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Highlight card - Trees this month + AI summary */}
          <motion.div {...cardAnim(8)}>
            <Card className="h-full bg-gradient-to-br from-primary to-primary/70 border-0 text-primary-foreground overflow-hidden relative">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col justify-between relative z-10">
                <div>
                  <p className="text-3xl lg:text-4xl font-bold">{treesThisMonth}</p>
                  <p className="text-xs text-primary-foreground/80 mt-0.5">Trees this month</p>
                </div>
                {aiInsights?.summary ? (
                  <p className="text-[9px] text-primary-foreground/70 leading-tight mt-2 line-clamp-4">{aiInsights.summary}</p>
                ) : (
                  <div className="mt-2">
                    <ResponsiveContainer width="100%" height={40}>
                      <AreaChart data={monthlyData.slice(-6)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                        <Area type="monotone" dataKey="count" fill="hsla(0, 0%, 100%, 0.15)" stroke="hsla(0, 0%, 100%, 0.6)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {aiInsights?.recommendations && aiInsights.recommendations.length > 0 && (
                  <div className="mt-1.5 flex items-start gap-1">
                    <ShieldCheck className="w-3 h-3 text-primary-foreground/60 mt-0.5 shrink-0" />
                    <p className="text-[8px] text-primary-foreground/60 leading-tight line-clamp-2">
                      Tip: {aiInsights.recommendations[0]}
                    </p>
                  </div>
                )}
              </CardContent>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-primary-foreground/5" />
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary-foreground/5" />
            </Card>
          </motion.div>

          {/* === LAST ROW: Planting Trend + AI Insights + Status + O2 (all 1 col each) === */}

          {/* Planting Trend */}
          <motion.div {...cardAnim(9)}>
            <Card className="h-full border-border/40">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col">
                <h4 className="font-semibold text-xs text-foreground mb-1 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" /> Planting Trend
                </h4>
                <div className="flex-1 min-h-[80px]">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData} margin={{ left: -10, right: 0, top: 4, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" fill="hsl(142, 71%, 35%, 0.15)" stroke="hsl(142, 71%, 35%)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center"><p className="text-xs text-muted-foreground">No data</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Insights Panel */}
          <motion.div {...cardAnim(10)}>
            <Card className="h-full border-border/40 border-primary/20">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col">
                <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Insights
                </h4>
                {aiLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-[10px] text-muted-foreground">Analyzing tree data...</p>
                  </div>
                ) : aiInsights ? (
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-accent/5">
                      <Wind className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                      <p className="text-[9px] text-foreground leading-tight">{aiInsights.co2_insight}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-[9px] text-muted-foreground">Biodiversity</p>
                        <Progress value={aiInsights.biodiversity_score} className="h-1.5 mt-0.5" />
                      </div>
                      <span className="text-xs font-bold text-primary">{aiInsights.biodiversity_score}</span>
                    </div>
                    {aiInsights.ecosystem_value && (
                      <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-primary/5">
                        <DollarSign className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <p className="text-[9px] text-foreground leading-tight">{aiInsights.ecosystem_value}</p>
                      </div>
                    )}
                    {aiInsights.fun_fact && (
                      <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-secondary/50">
                        <Lightbulb className="w-3 h-3 text-foreground mt-0.5 shrink-0" />
                        <p className="text-[9px] text-muted-foreground leading-tight">{aiInsights.fun_fact}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={fetchAIInsights}>
                      <Zap className="w-3 h-3 mr-1" /> Generate Insights
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Breakdown */}
          <motion.div {...cardAnim(11)}>
            <Card className="h-full border-border/40">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-primary" /> Status Breakdown
                  </h4>
                  {activeFilter?.startsWith('status:') && (
                    <Badge variant="secondary" className="text-[9px] cursor-pointer h-5" onClick={() => { setActiveFilter(null); onMapFilterChange(null); }}>✕</Badge>
                  )}
                </div>
                <div className="flex-1 min-h-[80px]">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{ left: -10, right: 0, top: 4, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis hide />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}
                          onClick={(data) => handleStatusClick(data.name)} className="cursor-pointer">
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]}
                              opacity={activeFilter && activeFilter !== `status:${entry.name.replace(' ', '_')}` ? 0.3 : 1} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center"><p className="text-xs text-muted-foreground">No data</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Oxygen Production */}
          <motion.div {...cardAnim(12)}>
            <Card className="h-full border-border/40 bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="p-3 lg:p-4 h-full flex flex-col justify-center items-center text-center">
                <Droplets className="w-8 h-8 text-accent mb-2" />
                <p className="text-3xl font-bold text-foreground">{oxygenKg.toLocaleString()}<span className="text-sm text-muted-foreground font-normal"> kg</span></p>
                <p className="text-xs text-muted-foreground mt-1">O₂ Produced / Year</p>
                <p className="text-[10px] text-muted-foreground mt-1">Enough for ~{Math.round(trees.length * 0.5)} people annually</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Slide-over panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowPanel(null)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-elevated border-l border-border/50 flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h3 className="font-semibold text-foreground">Tree Activity</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowPanel(null)} className="h-8 w-8"><X className="w-4 h-4" /></Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <TreeList onTreeSelect={(tree) => { setShowPanel(null); onTreeClick(tree); }} refreshTrigger={refreshTrigger} selectedTree={selectedTree} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
