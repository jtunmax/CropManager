import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Loader2, LayoutDashboard, TreePine, 
  Heart, Activity, TrendingUp, Users, Target, AlertTriangle,
  BarChart3, PieChart, Calendar, Sparkles, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

interface DashboardBuilderProps {
  refreshTrigger: number;
}

type WidgetId = 
  | 'tree_type_chart' | 'health_overview' | 'status_breakdown'
  | 'impact_summary' | 'recent_activity' | 'top_planters'
  | 'planting_reasons' | 'monthly_trend' | 'tree_count' | 'health_alerts';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--accent))', 
  '#228B22', '#6495ED', '#FFC107', '#FF6B6B',
  '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899'
];

const QUICK_PROMPTS = [
  'Show me everything',
  'Focus on tree health',
  'Environmental impact stats',
  'Community activity',
];

// CO2 lookup (simplified from ImpactDashboard)
const CO2_LOOKUP: Record<string, number> = {
  'Mahogany': 35, 'Cedar': 30, 'Ceiba': 45, 'Mango': 18,
  'Coconut': 15, 'Citrus': 12, 'default': 20,
};

export function DashboardBuilder({ refreshTrigger }: DashboardBuilderProps) {
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const { toast } = useToast();

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

  const handleGenerate = async (message?: string) => {
    const msg = message || prompt;
    if (!msg.trim()) return;

    setIsGenerating(true);
    setPrompt('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-dashboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: msg,
            currentWidgets: activeWidgets,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate dashboard');
      }

      const result = await response.json();
      setActiveWidgets(result.widgets || []);
      setAiMessage(result.message || '');
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setActiveWidgets([]);
    setAiMessage('');
  };

  // === Data computation for widgets ===
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
    const counts = { alive: 0, planted: 0, needs_care: 0, dead: 0, unknown: 0 };
    trees.forEach(t => {
      const s = t.status || 'unknown';
      if (s in counts) counts[s as keyof typeof counts]++;
      else counts.unknown++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
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

  const reasonData = useMemo(() => {
    const counts: Record<string, number> = {};
    trees.forEach(t => {
      const r = t.reason || 'Unknown';
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trees]);

  const healthAlerts = useMemo(() => {
    return trees
      .filter(t => t.healthScore != null && t.healthScore <= 4)
      .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0))
      .slice(0, 5);
  }, [trees]);

  const recentTrees = useMemo(() => {
    return [...trees]
      .sort((a, b) => b.submittedDate.getTime() - a.submittedDate.getTime())
      .slice(0, 5);
  }, [trees]);

  // === Widget renderers ===
  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'tree_count':
        return (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <TreePine className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-foreground">{trees.length}</p>
              <p className="text-xs text-muted-foreground">Total Trees Recorded</p>
            </CardContent>
          </Card>
        );

      case 'tree_type_chart':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" /> Species Breakdown
              </h4>
              {treeTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <RechartsPie>
                    <Pie data={treeTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {treeTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        );

      case 'health_overview':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" /> Health Overview
              </h4>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{avgHealth}/10</p>
                  <p className="text-xs text-muted-foreground">Average Health Score</p>
                  <Progress value={avgHealth * 10} className="mt-2 h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-accent/10 rounded-lg p-2">
                    <p className="text-lg font-bold text-accent">{trees.filter(t => (t.healthScore || 0) >= 7).length}</p>
                    <p className="text-[10px] text-muted-foreground">Healthy</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-2">
                    <p className="text-lg font-bold text-destructive">{trees.filter(t => (t.healthScore || 0) <= 4 && t.healthScore != null).length}</p>
                    <p className="text-[10px] text-muted-foreground">Need Care</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'status_breakdown':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Status Breakdown
              </h4>
              <div className="space-y-2">
                {statusData.map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{name === 'alive' ? '🌳' : name === 'planted' ? '🌱' : name === 'needs_care' ? '⚠️' : name === 'dead' ? '💀' : '❓'}</span>
                      <span className="text-xs text-foreground capitalize">{name.replace('_', ' ')}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'impact_summary':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Environmental Impact
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{(totalCO2 / 1000).toFixed(1)}t</p>
                  <p className="text-[10px] text-muted-foreground">CO₂ Offset/yr</p>
                </div>
                <div className="bg-accent/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-accent">{(trees.length * 120 / 1000).toFixed(1)}t</p>
                  <p className="text-[10px] text-muted-foreground">O₂ Produced/yr</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{(trees.length * 25).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">m² Shade</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">${(trees.length * 50).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Energy Savings/yr</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'recent_activity':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Recent Activity
              </h4>
              <div className="space-y-2">
                {recentTrees.length > 0 ? recentTrees.map((t) => (
                  <div key={t.objectId} className="flex items-center gap-2 text-xs">
                    <span>🌱</span>
                    <span className="flex-1 text-foreground truncate">{t.treeType}</span>
                    <span className="text-muted-foreground">{format(t.submittedDate, 'MMM d')}</span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'top_planters':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Top Planters
              </h4>
              <div className="space-y-2">
                {topPlanters.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-primary w-4">{i + 1}</span>
                    <span className="flex-1 text-foreground truncate">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.count} trees</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'planting_reasons':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Planting Reasons
              </h4>
              {reasonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={reasonData.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>
        );

      case 'monthly_trend':
        return (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Monthly Planting Trend
              </h4>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={monthlyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>
        );

      case 'health_alerts':
        return (
          <Card className="border-border/50 border-destructive/20">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Health Alerts
              </h4>
              {healthAlerts.length > 0 ? (
                <div className="space-y-2">
                  {healthAlerts.map(t => (
                    <div key={t.objectId} className="flex items-center gap-2 text-xs">
                      <span>⚠️</span>
                      <span className="flex-1 text-foreground truncate">{t.treeType}</span>
                      <Badge variant="destructive" className="text-[10px]">{t.healthScore}/10</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">All trees are healthy! 🎉</p>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-soft">
          <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-foreground">Dashboard Builder</h2>
          <p className="text-xs text-muted-foreground">Tell me what you want to see</p>
        </div>
        {activeWidgets.length > 0 && (
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* AI Message */}
      <AnimatePresence>
        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">{aiMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick prompts (shown when no widgets) */}
      {activeWidgets.length === 0 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 space-y-2"
        >
          <p className="text-xs text-muted-foreground mb-2">Quick start:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <Button
                key={qp}
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-full"
                onClick={() => handleGenerate(qp)}
              >
                {qp}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Widgets grid */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mb-3">
        <AnimatePresence>
          {activeWidgets.map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.1 }}
            >
              {renderWidget(id)}
            </motion.div>
          ))}
        </AnimatePresence>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-8 gap-2 text-muted-foreground"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Building your dashboard...</span>
          </motion.div>
        )}
      </div>

      {/* Chat input */}
      <div className="pt-3 border-t border-border/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="flex gap-2"
        >
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={activeWidgets.length ? "Modify your dashboard..." : "What do you want to see?"}
            className="flex-1 bg-card border-border text-sm h-9"
            disabled={isGenerating}
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!prompt.trim() || isGenerating}
            className="h-9 w-9 shrink-0"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
