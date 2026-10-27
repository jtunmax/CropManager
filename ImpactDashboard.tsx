import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Sun, Apple, TreePine, Sparkles, TrendingUp, Car, Loader2, Droplets, Wind, Home, Users, Zap, Heart, Target, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import { supabase } from '@/integrations/supabase/client';
import { SocialShareCard } from '@/components/SocialShareCard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { PhotoGallery } from '@/components/PhotoGallery';

// CO2 lookup table (kg CO2 absorbed per tree per year - based on tree type category)
const CO2_LOOKUP: Record<string, number> = {
  // Fruit trees typically absorb 10-20 kg CO2/year
  'Mango': 18,
  'Coconut': 15,
  'Citrus': 12,
  'Avocado': 16,
  'Papaya': 10,
  'Banana': 8,
  // Native hardwoods absorb more (20-50 kg CO2/year)
  'Mahogany': 35,
  'Cedar': 30,
  'Santa Maria': 28,
  'Cohune Palm': 20,
  'Ceiba': 45,
  // General categories
  'Fruit Tree': 14,
  'Shade Tree': 25,
  'Native': 30,
  'Ornamental': 10,
  'default': 20,
};

// Native trees of Belize
const NATIVE_TREES = [
  'Mahogany', 'Cedar', 'Santa Maria', 'Cohune Palm', 'Ceiba',
  'Sapodilla', 'Breadnut', 'Cohune', 'Copal', 'Nargusta',
  'Billy Webb', 'Bullet Tree', 'Ironwood', 'Rosewood'
];

// Fruit trees
const FRUIT_TREES = [
  'Mango', 'Coconut', 'Citrus', 'Avocado', 'Papaya', 'Banana',
  'Orange', 'Lime', 'Lemon', 'Grapefruit', 'Soursop', 'Cashew',
  'Breadfruit', 'Guava', 'Starfruit', 'Jackfruit'
];

// Environmental impact constants
const AVG_SHADE_COVERAGE = 25; // m² per tree
const WATER_ABSORPTION_PER_TREE = 100; // gallons per day during rain
const OXYGEN_PER_TREE_YEAR = 120; // kg oxygen per tree per year
const AVG_CAR_CO2_YEAR = 4600; // kg CO2 per car per year
const AVG_HOME_CO2_YEAR = 7500; // kg CO2 per home per year
const AVG_FLIGHT_CO2 = 1000; // kg CO2 per round-trip domestic flight
const COOLING_SAVINGS_PER_TREE = 50; // USD per year in energy savings
const PROPERTY_VALUE_INCREASE = 1.5; // % increase per mature tree

interface ImpactMetrics {
  totalTrees: number;
  co2Offset: number;
  shadeCoverage: number;
  fruitTrees: number;
  nativeTrees: number;
  nonNativeTrees: number;
  nativeRatio: number;
  healthyTrees: number;
  // New metrics
  oxygenProduced: number;
  waterAbsorbed: number;
  carsOffset: number;
  homesOffset: number;
  flightsOffset: number;
  energySavings: number;
  propertyValue: number;
  uniquePlanters: number;
}

interface FunFact {
  icon: React.ElementType;
  fact: string;
  highlight: string;
}

interface ImpactDashboardProps {
  refreshTrigger?: number;
}

export function ImpactDashboard({ refreshTrigger }: ImpactDashboardProps) {
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    async function loadTrees() {
      setLoading(true);
      try {
        const records = await getTreeRecords();
        setTrees(records);
      } catch (error) {
        console.error('Failed to load trees for impact:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTrees();
  }, [refreshTrigger]);

  const metrics = useMemo((): ImpactMetrics => {
    if (trees.length === 0) {
      return {
        totalTrees: 0,
        co2Offset: 0,
        shadeCoverage: 0,
        fruitTrees: 0,
        nativeTrees: 0,
        nonNativeTrees: 0,
        nativeRatio: 0,
        healthyTrees: 0,
        oxygenProduced: 0,
        waterAbsorbed: 0,
        carsOffset: 0,
        homesOffset: 0,
        flightsOffset: 0,
        energySavings: 0,
        propertyValue: 0,
        uniquePlanters: 0,
      };
    }

    let co2Total = 0;
    let fruitCount = 0;
    let nativeCount = 0;
    let healthyCount = 0;
    const planterSet = new Set<string>();

    trees.forEach((tree) => {
      const treeType = tree.treeType || '';
      const typeUpper = treeType.toLowerCase();

      // Track unique planters
      if (tree.submittedBy && tree.submittedBy !== 'Anonymous') {
        planterSet.add(tree.submittedBy.toLowerCase());
      }

      // Calculate CO2 based on tree type
      let co2Rate = CO2_LOOKUP.default;
      for (const [key, value] of Object.entries(CO2_LOOKUP)) {
        if (typeUpper.includes(key.toLowerCase())) {
          co2Rate = value;
          break;
        }
      }
      co2Total += co2Rate;

      // Check if fruit tree
      if (FRUIT_TREES.some((ft) => typeUpper.includes(ft.toLowerCase()))) {
        fruitCount++;
      }

      // Check if native
      if (NATIVE_TREES.some((nt) => typeUpper.includes(nt.toLowerCase()))) {
        nativeCount++;
      }

      // Count healthy trees
      if (tree.status === 'alive' || tree.status === 'planted') {
        healthyCount++;
      }
    });

    const oxygenProduced = trees.length * OXYGEN_PER_TREE_YEAR;
    const waterAbsorbed = trees.length * WATER_ABSORPTION_PER_TREE * 365;
    
    return {
      totalTrees: trees.length,
      co2Offset: co2Total,
      shadeCoverage: trees.length * AVG_SHADE_COVERAGE,
      fruitTrees: fruitCount,
      nativeTrees: nativeCount,
      nonNativeTrees: trees.length - nativeCount,
      nativeRatio: trees.length > 0 ? (nativeCount / trees.length) * 100 : 0,
      healthyTrees: healthyCount,
      oxygenProduced,
      waterAbsorbed,
      carsOffset: co2Total / AVG_CAR_CO2_YEAR,
      homesOffset: co2Total / AVG_HOME_CO2_YEAR,
      flightsOffset: co2Total / AVG_FLIGHT_CO2,
      energySavings: trees.length * COOLING_SAVINGS_PER_TREE,
      propertyValue: trees.length * PROPERTY_VALUE_INCREASE,
      uniquePlanters: planterSet.size,
    };
  }, [trees]);

  // Generate fun facts based on metrics
  const funFacts = useMemo((): FunFact[] => {
    if (metrics.totalTrees === 0) return [];
    
    const facts: FunFact[] = [];
    
    // People breathing equivalent
    const peopleBreathing = Math.round(metrics.oxygenProduced / 740); // 740 kg O2 per person per year
    if (peopleBreathing > 0) {
      facts.push({
        icon: Wind,
        fact: `Producing enough oxygen for`,
        highlight: `${peopleBreathing} ${peopleBreathing === 1 ? 'person' : 'people'} per year`,
      });
    }

    // Swimming pools of water
    const swimmingPools = (metrics.waterAbsorbed / 20000).toFixed(1); // ~20,000 gallons per pool
    if (parseFloat(swimmingPools) > 0.1) {
      facts.push({
        icon: Droplets,
        fact: `Absorbing rainwater equivalent to`,
        highlight: `${swimmingPools} swimming pools annually`,
      });
    }

    // Flights offset
    if (metrics.flightsOffset >= 0.5) {
      facts.push({
        icon: Zap,
        fact: `Offsetting the carbon from`,
        highlight: `${metrics.flightsOffset.toFixed(1)} round-trip flights`,
      });
    }

    // Energy savings
    if (metrics.energySavings > 0) {
      facts.push({
        icon: Home,
        fact: `Saving an estimated`,
        highlight: `$${metrics.energySavings.toLocaleString()} in cooling costs`,
      });
    }

    // Community engagement
    if (metrics.uniquePlanters > 1) {
      facts.push({
        icon: Users,
        fact: `Planted by a community of`,
        highlight: `${metrics.uniquePlanters} dedicated stewards`,
      });
    }

    // Food security
    if (metrics.fruitTrees > 0) {
      const mealsPerYear = metrics.fruitTrees * 50; // Rough estimate of meals from fruit trees
      facts.push({
        icon: Apple,
        fact: `Potentially providing fruit for`,
        highlight: `${mealsPerYear}+ meals per year`,
      });
    }

    return facts.slice(0, 4); // Show max 4 fun facts
  }, [metrics]);

  // Generate AI summary when metrics change
  useEffect(() => {
    async function generateSummary() {
      if (metrics.totalTrees === 0) {
        setAiSummary('');
        return;
      }

      setSummaryLoading(true);
      try {
        const prompt = `Generate a single short, inspiring sentence (max 25 words) about community tree planting impact. Use these stats creatively:
- ${metrics.totalTrees} trees planted by ${metrics.uniquePlanters || 'community members'}
- ${metrics.co2Offset.toLocaleString()} kg CO2 offset per year (≈ ${metrics.carsOffset.toFixed(1)} cars)
- Enough oxygen for ${Math.round(metrics.oxygenProduced / 740)} people
- ${metrics.fruitTrees} fruit trees for food security
- ${metrics.nativeTrees} native Belizean trees preserving biodiversity
- $${metrics.energySavings.toLocaleString()} in potential cooling savings

Make it feel personal, celebratory, and focus on ONE impressive metric. Vary between different stats. Start with "Together" or "Your community" or "Every tree". Example: "Together, you've planted enough trees to provide oxygen for 12 people every year!"`;

        const { data, error } = await supabase.functions.invoke('analyze-location', {
          body: { 
            latitude: 17.2, 
            longitude: -88.75,
            customPrompt: prompt 
          },
        });

        if (error) throw error;
        
        const summary = data?.recommendation || data?.summary || 
          `Together, your community has planted ${metrics.totalTrees} trees, creating a greener future for Belize!`;
        
        setAiSummary(summary);
      } catch (error) {
        console.error('Failed to generate AI summary:', error);
        const carsOffset = metrics.carsOffset.toFixed(1);
        setAiSummary(`Together, your community has planted ${metrics.totalTrees} trees, offsetting approximately ${carsOffset} cars' worth of emissions each year!`);
      } finally {
        setSummaryLoading(false);
      }
    }

    generateSummary();
  }, [metrics.totalTrees, metrics.co2Offset, metrics.fruitTrees, metrics.nativeTrees, metrics.oxygenProduced, metrics.uniquePlanters, metrics.energySavings, metrics.carsOffset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const primaryStats = [
    {
      icon: Leaf,
      label: 'CO₂ Offset',
      value: `${(metrics.co2Offset / 1000).toFixed(1)}`,
      unit: 'tonnes/year',
      color: 'from-primary to-forest-light',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Wind,
      label: 'Oxygen Made',
      value: `${(metrics.oxygenProduced / 1000).toFixed(1)}`,
      unit: 'tonnes/year',
      color: 'from-sky-500 to-cyan-400',
      bgColor: 'bg-sky-500/10',
    },
    {
      icon: Sun,
      label: 'Shade Added',
      value: `${(metrics.shadeCoverage / 1000).toFixed(1)}`,
      unit: 'k m² coverage',
      color: 'from-gold to-sunset',
      bgColor: 'bg-gold/10',
    },
    {
      icon: Heart,
      label: 'Tree Health',
      value: `${metrics.totalTrees > 0 ? ((metrics.healthyTrees / metrics.totalTrees) * 100).toFixed(0) : 0}%`,
      unit: `${metrics.healthyTrees} thriving`,
      color: 'from-rose-500 to-pink-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  const secondaryStats = [
    {
      icon: Apple,
      label: 'Fruit Trees',
      value: metrics.fruitTrees.toString(),
      description: 'Food security',
    },
    {
      icon: TreePine,
      label: 'Native Species',
      value: metrics.nativeTrees.toString(),
      description: 'Biodiversity',
    },
    {
      icon: Car,
      label: 'Cars Offset',
      value: metrics.carsOffset.toFixed(1),
      description: 'Per year',
    },
    {
      icon: Users,
      label: 'Planters',
      value: metrics.uniquePlanters.toString(),
      description: 'Community',
    },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-forest-light flex items-center justify-center shadow-soft">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Community Impact</h2>
            <p className="text-xs text-muted-foreground">Your environmental contribution</p>
          </div>
        </div>
        <SocialShareCard stats={{
          totalTrees: metrics.totalTrees,
          co2Offset: metrics.co2Offset,
          carsOffset: metrics.carsOffset,
          oxygenProduced: metrics.oxygenProduced,
          fruitTrees: metrics.fruitTrees,
          nativeTrees: metrics.nativeTrees,
          uniquePlanters: metrics.uniquePlanters,
        }} />
      </div>

      {/* AI Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 via-forest-light/5 to-moss/5 border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-sunset flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {summaryLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating impact summary...</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {aiSummary || 'Plant your first tree to see your community impact!'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Primary Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        {primaryStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
          >
            <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 bg-card/80 backdrop-blur-sm">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-80`} />
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-7 h-7 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className="w-3.5 h-3.5 text-foreground" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{stat.unit}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-4 gap-2">
              {secondaryStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-1">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fun Facts */}
      {funFacts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-moss/5 to-primary/5 border-moss/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Did You Know?</span>
              </div>
              <div className="space-y-2">
                {funFacts.map((fact, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <fact.icon className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fact.fact} <span className="font-semibold text-foreground">{fact.highlight}</span>
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Native vs Non-Native Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Native Species Ratio</span>
              <span className="text-xs font-bold text-primary">{metrics.nativeRatio.toFixed(0)}%</span>
            </div>
            <Progress value={metrics.nativeRatio} className="h-2" />
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>{metrics.nativeTrees} native Belizean</span>
              <span>{metrics.nonNativeTrees} introduced</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Goals Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-gold/5 to-sunset/5 border-gold/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-gold" />
              <span className="text-xs font-semibold text-foreground">Community Goals</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Next milestone: 10 trees</span>
                  <span className="font-medium text-foreground">{Math.min(metrics.totalTrees, 10)}/10</span>
                </div>
                <Progress value={Math.min((metrics.totalTrees / 10) * 100, 100)} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">1 tonne CO₂ offset</span>
                  <span className="font-medium text-foreground">{Math.min(metrics.co2Offset, 1000)}/1000 kg</span>
                </div>
                <Progress value={Math.min((metrics.co2Offset / 1000) * 100, 100)} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      {/* Weather Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <WeatherWidget />
      </motion.div>

      {/* Photo Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <PhotoGallery refreshTrigger={refreshTrigger} />
      </motion.div>
    </div>
  );
}
