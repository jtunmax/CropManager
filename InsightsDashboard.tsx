import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TreePine, Heart, Users, Leaf, Activity, TrendingUp,
  Target, BarChart3, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';

interface InsightsDashboardProps {
  refreshTrigger: number;
  onFilterByType?: (treeType: string | null) => void;
  onFilterByStatus?: (status: string | null) => void;
  onFilterByHealth?: (healthRange: 'healthy' | 'needs_care' | null) => void;
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

export function InsightsDashboard({ refreshTrigger, onFilterByType, onFilterByStatus, onFilterByHealth }: InsightsDashboardProps) {
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrees() {
      try {
        setLoading(true);
        const records = await getTreeRecords();
        setTrees(records);
      } catch (error) {
        console.error('Failed to fetch trees:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrees();
  }, [refreshTrigger]);

  // === Computed data ===
  const speciesCount = useMemo(() => {
    const types = new Set(trees.map(t => t.treeType));
    return types.size;
  }, [trees]);

  const avgHealth = useMemo(() => {
    const scored = trees.filter(t => t.healthScore != null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, t) => s + (t.healthScore || 0), 0) / scored.length * 10) / 10;
  }, [trees]);

  const totalCO2 = useMemo(() => {
    return trees.reduce((sum, t) => {
      const co2 = CO2_LOOKUP[t.treeType] || CO2_LOOKUP['default'];
      return sum + co2;
    }, 0);
  }, [trees]);

  const healthyCount = useMemo(() => trees.filter(t => (t.healthScore || 0) >= 7).length, [trees]);
  const needsCareCount = useMemo(() => trees.filter(t => t.healthScore != null && t.healthScore <= 4).length, [trees]);

  const treeTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => {
      const type = t.treeType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trees]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => {
      const s = t.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [trees]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    trees.forEach(t => {
      const key = format(t.submittedDate, 'MMM yyyy');
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [trees]);

  const topPlanters = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => {
      const name = t.submittedBy || 'Anonymous';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [trees]);

  // === Interaction handlers ===
  const handleTypeClick = (type: string) => {
    const newFilter = activeFilter === `type:${type}` ? null : `type:${type}`;
    setActiveFilter(newFilter);
    onFilterByType?.(newFilter ? type : null);
  };

  const handleStatusClick = (status: string) => {
    const key = status.replace(' ', '_');
    const newFilter = activeFilter === `status:${key}` ? null : `status:${key}`;
    setActiveFilter(newFilter);
    onFilterByStatus?.(newFilter ? key : null);
  };

  const handleHealthClick = (range: 'healthy' | 'needs_care') => {
    const newFilter = activeFilter === `health:${range}` ? null : `health:${range}`;
    setActiveFilter(newFilter);
    onFilterByHealth?.(newFilter ? range : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const cardDelay = (i: number) => ({ delay: i * 0.05 });

  return (
    <div className="space-y-3 pb-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: TreePine, label: 'Total Trees', value: trees.length, color: 'from-primary/15 to-primary/5', iconColor: 'text-primary' },
          { icon: Leaf, label: 'Species', value: speciesCount, color: 'from-accent/15 to-accent/5', iconColor: 'text-accent' },
          { icon: Heart, label: 'Avg Health', value: `${avgHealth}/10`, color: 'from-destructive/10 to-destructive/5', iconColor: 'text-destructive' },
          { icon: TrendingUp, label: 'CO₂ Offset/yr', value: `${(totalCO2 / 1000).toFixed(1)}t`, color: 'from-primary/10 to-accent/5', iconColor: 'text-primary' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardDelay(i)}>
            <Card className={`bg-gradient-to-br ${kpi.color} border-border/30 hover:border-primary/30 transition-colors`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-card/80 flex items-center justify-center shrink-0">
                  <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Health Overview - clickable */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardDelay(4)}>
        <Card className="border-border/30">
          <CardContent className="p-3">
            <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" /> Health Overview
            </h4>
            <Progress value={avgHealth * 10} className="h-2 mb-2" />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleHealthClick('healthy')}
                className={`rounded-lg p-2 text-center transition-all cursor-pointer border ${
                  activeFilter === 'health:healthy'
                    ? 'border-primary bg-primary/15 ring-1 ring-primary/30'
                    : 'border-transparent bg-accent/10 hover:bg-accent/20'
                }`}
              >
                <p className="text-lg font-bold text-accent">{healthyCount}</p>
                <p className="text-[10px] text-muted-foreground">Healthy (7+)</p>
              </button>
              <button
                onClick={() => handleHealthClick('needs_care')}
                className={`rounded-lg p-2 text-center transition-all cursor-pointer border ${
                  activeFilter === 'health:needs_care'
                    ? 'border-destructive bg-destructive/15 ring-1 ring-destructive/30'
                    : 'border-transparent bg-destructive/10 hover:bg-destructive/20'
                }`}
              >
                <p className="text-lg font-bold text-destructive">{needsCareCount}</p>
                <p className="text-[10px] text-muted-foreground">Need Care (≤4)</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Species Breakdown - clickable pie chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardDelay(5)}>
        <Card className="border-border/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <TreePine className="w-3.5 h-3.5 text-primary" /> Species Distribution
              </h4>
              {activeFilter?.startsWith('type:') && (
                <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => { setActiveFilter(null); onFilterByType?.(null); }}>
                  ✕ {activeFilter.replace('type:', '')}
                </Badge>
              )}
            </div>
            {treeTypeData.length > 0 ? (
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="50%" height={130}>
                  <PieChart>
                    <Pie
                      data={treeTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={55}
                      innerRadius={30}
                      onClick={(_, index) => handleTypeClick(treeTypeData[index].name)}
                      className="cursor-pointer"
                    >
                      {treeTypeData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          opacity={activeFilter && activeFilter !== `type:${entry.name}` ? 0.3 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {treeTypeData.slice(0, 5).map((item, i) => (
                    <button
                      key={item.name}
                      onClick={() => handleTypeClick(item.name)}
                      className={`flex items-center gap-1.5 w-full text-left rounded px-1.5 py-0.5 transition-colors ${
                        activeFilter === `type:${item.name}` ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-foreground truncate flex-1">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{item.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Breakdown - clickable bars */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardDelay(6)}>
        <Card className="border-border/30">
          <CardContent className="p-3">
            <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" /> Status Breakdown
            </h4>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={statusData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => handleStatusClick(data.name)}
                    className="cursor-pointer"
                  >
                    {statusData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        opacity={activeFilter && activeFilter !== `status:${entry.name.replace(' ', '_')}` ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Planting Trend */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardDelay(7)}>
        <Card className="border-border/30">
          <CardContent className="p-3">
            <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-primary" /> Monthly Planting Trend
            </h4>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={monthlyData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 8 }} />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" fill="hsl(142, 71%, 35%, 0.15)" stroke="hsl(142, 71%, 35%)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Planters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardDelay(8)}>
        <Card className="border-border/30">
          <CardContent className="p-3">
            <h4 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> Top Planters
            </h4>
            <div className="space-y-1.5">
              {topPlanters.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i + 1}</span>
                  <span className="flex-1 text-foreground truncate">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.count}</Badge>
                </div>
              ))}
              {topPlanters.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
