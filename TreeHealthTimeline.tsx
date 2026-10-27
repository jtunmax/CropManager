import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, Calendar, Loader2, Heart, Camera, TreePine, Sprout, Droplets, Sun, ChevronLeft, ChevronRight, X, Ruler, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TreeFeature } from '@/services/featureService';
import { getAttachments, AttachmentInfo } from '@/services/attachmentService';
import { format, differenceInDays, differenceInMonths } from 'date-fns';

interface TreeHealthTimelineProps {
  tree: TreeFeature;
}

interface HealthCheckpoint {
  date: Date;
  healthScore: number;
  status: string;
  checkedBy?: string;
  notes?: string;
  height?: string;
  canopyWidth?: string;
}

// Parse height string like "1-2m", "3-5m" into a numeric midpoint in meters
function parseHeightToMeters(height?: string | null): number | null {
  if (!height) return null;
  const match = height.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?\s*m/i);
  if (match) {
    const low = parseFloat(match[1]);
    const high = match[2] ? parseFloat(match[2]) : low;
    return (low + high) / 2;
  }
  const single = height.match(/(\d+(?:\.\d+)?)\s*m/i);
  if (single) return parseFloat(single[1]);
  return null;
}

// Parse canopy width string similarly
function parseCanopyToMeters(canopy?: string | null): number | null {
  if (!canopy) return null;
  const match = canopy.match(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?\s*m/i);
  if (match) {
    const low = parseFloat(match[1]);
    const high = match[2] ? parseFloat(match[2]) : low;
    return (low + high) / 2;
  }
  const single = canopy.match(/(\d+(?:\.\d+)?)\s*m/i);
  if (single) return parseFloat(single[1]);
  return null;
}

export function TreeHealthTimeline({ tree }: TreeHealthTimelineProps) {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch all attachments (photos over time)
  useEffect(() => {
    setLoadingPhotos(true);
    getAttachments(tree.objectId).then((atts) => {
      setAttachments(atts.filter(a => a.contentType?.startsWith('image/')));
      setLoadingPhotos(false);
    });
  }, [tree.objectId]);

  const healthHistory = useMemo((): HealthCheckpoint[] => {
    const history: HealthCheckpoint[] = [];
    
    history.push({
      date: tree.submittedDate,
      healthScore: 8,
      status: 'planted',
      checkedBy: tree.submittedBy,
      notes: 'Initial planting',
    });

    if (tree.lastCheckDate && tree.lastCheckDate.getTime() !== tree.submittedDate.getTime()) {
      history.push({
        date: tree.lastCheckDate,
        healthScore: tree.healthScore || 7,
        status: tree.status || 'alive',
        checkedBy: tree.lastCheckedBy || 'Community',
        notes: tree.healthNotes || undefined,
        height: tree.treeHeight || undefined,
        canopyWidth: tree.canopyWidth || undefined,
      });
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tree]);

  const chartData = useMemo(() => {
    return healthHistory.map((checkpoint) => ({
      date: format(checkpoint.date, 'MMM d'),
      fullDate: checkpoint.date,
      score: checkpoint.healthScore,
      status: checkpoint.status,
    }));
  }, [healthHistory]);

  // Calculate tree age
  const treeAge = useMemo(() => {
    const months = differenceInMonths(new Date(), tree.submittedDate);
    const days = differenceInDays(new Date(), tree.submittedDate);
    if (months < 1) return `${days} day${days !== 1 ? 's' : ''} old`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} old`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths}mo` : ''} old`;
  }, [tree.submittedDate]);

  // Parse growth metrics for animation
  const heightMeters = parseHeightToMeters(tree.treeHeight);
  const canopyMeters = parseCanopyToMeters(tree.canopyWidth);

  const getTrendIcon = () => {
    if (healthHistory.length < 2) return <Minus className="w-4 h-4 text-muted-foreground" />;
    const firstScore = healthHistory[0].healthScore;
    const lastScore = healthHistory[healthHistory.length - 1].healthScore;
    if (lastScore > firstScore) return <TrendingUp className="w-4 h-4 text-primary" />;
    if (lastScore < firstScore) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive': return 'bg-primary/10 text-primary border-primary/20';
      case 'planted': return 'bg-moss/10 text-moss border-moss/20';
      case 'needs_care': return 'bg-gold/10 text-gold border-gold/20';
      case 'dead': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getHealthColor = (score: number): string => {
    if (score >= 8) return 'hsl(142, 65%, 42%)';
    if (score >= 6) return 'hsl(90, 35%, 48%)';
    if (score >= 4) return 'hsl(45, 95%, 55%)';
    return 'hsl(0, 72%, 51%)';
  };

  const currentHealth = tree.healthScore || healthHistory[healthHistory.length - 1]?.healthScore || 8;

  // Animated tree growth visualization
  const maxTreeHeight = 12; // max display height in meters
  const displayHeight = heightMeters ? Math.min(heightMeters, maxTreeHeight) : 2;
  const displayCanopy = canopyMeters ? Math.min(canopyMeters, 10) : 1.5;
  const heightPercent = (displayHeight / maxTreeHeight) * 100;
  const canopyPercent = (displayCanopy / 10) * 100;

  return (
    <div className="space-y-5">
      {/* Life Story Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Sprout className="w-3.5 h-3.5" />
          Life Story
        </div>
        <h3 className="text-lg font-bold text-foreground">{tree.treeType || 'Unknown Tree'}</h3>
        <p className="text-sm text-muted-foreground mt-1">{treeAge} · Planted by {tree.submittedBy || 'Anonymous'}</p>
      </motion.div>

      {/* Photo Gallery Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            {loadingPhotos ? (
              <div className="h-40 flex items-center justify-center bg-muted/20">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : attachments.length > 0 ? (
              <div className="relative">
                {/* Main photo */}
                <div
                  className="relative h-48 cursor-pointer group"
                  onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                >
                  <img
                    src={attachments[0].url}
                    alt="Tree photo"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-xs">
                    <Camera className="w-3.5 h-3.5" />
                    {attachments.length} photo{attachments.length !== 1 ? 's' : ''} over time
                  </div>
                  {attachments.length > 1 && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/80 text-xs bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                      <Maximize2 className="w-3 h-3" />
                      View all
                    </div>
                  )}
                </div>

                {/* Thumbnail strip for multiple photos */}
                {attachments.length > 1 && (
                  <div className="flex gap-1 p-2 bg-muted/20 overflow-x-auto">
                    {attachments.map((att, idx) => (
                      <motion.div
                        key={att.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all"
                        onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                      >
                        <img src={att.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground">
                <Camera className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">No photos yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Growth Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TreePine className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Growth Snapshot</p>
            </div>

            <div className="flex items-end gap-6">
              {/* Animated tree visualization */}
              <div className="flex flex-col items-center flex-shrink-0">
                <svg width="100" height="140" viewBox="0 0 100 140" className="overflow-visible">
                  {/* Ground */}
                  <motion.ellipse
                    cx="50" cy="132" rx="32" ry="6"
                    fill="hsl(30, 30%, 38%)"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  />

                  {/* Trunk */}
                  <motion.rect
                    x="45" width="10" rx="3"
                    fill="url(#trunkGrad)"
                    initial={{ y: 130, height: 0 }}
                    animate={{ y: 130 - Math.max(30, heightPercent * 0.55), height: Math.max(30, heightPercent * 0.55) }}
                    transition={{ delay: 0.7, duration: 1, type: 'spring', stiffness: 60 }}
                  />

                  {/* Left branch */}
                  <motion.line
                    x1="48" x2="32"
                    y1={130 - Math.max(30, heightPercent * 0.55) * 0.55}
                    y2={130 - Math.max(30, heightPercent * 0.55) * 0.7}
                    stroke="hsl(30, 32%, 33%)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                  />

                  {/* Right branch */}
                  <motion.line
                    x1="52" x2="70"
                    y1={130 - Math.max(30, heightPercent * 0.55) * 0.65}
                    y2={130 - Math.max(30, heightPercent * 0.55) * 0.78}
                    stroke="hsl(30, 32%, 33%)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 1.7, duration: 0.5 }}
                  />

                  {/* Main canopy - large ellipse */}
                  <motion.ellipse
                    cx="50"
                    cy={130 - Math.max(30, heightPercent * 0.55) - Math.max(18, canopyPercent * 0.28)}
                    rx={Math.max(22, canopyPercent * 0.35)}
                    ry={Math.max(18, canopyPercent * 0.28)}
                    fill="url(#canopyGrad)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.05, 1], opacity: 1 }}
                    transition={{ delay: 1.4, duration: 1.2, type: 'spring', stiffness: 50, damping: 12 }}
                  />

                  {/* Left canopy cluster */}
                  <motion.ellipse
                    cx={50 - Math.max(12, canopyPercent * 0.18)}
                    cy={130 - Math.max(30, heightPercent * 0.55) - Math.max(10, canopyPercent * 0.16)}
                    rx={Math.max(14, canopyPercent * 0.22)}
                    ry={Math.max(12, canopyPercent * 0.2)}
                    fill="url(#canopyGrad2)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    transition={{ delay: 1.8, duration: 0.8, type: 'spring' }}
                  />

                  {/* Right canopy cluster */}
                  <motion.ellipse
                    cx={50 + Math.max(10, canopyPercent * 0.16)}
                    cy={130 - Math.max(30, heightPercent * 0.55) - Math.max(8, canopyPercent * 0.14)}
                    rx={Math.max(13, canopyPercent * 0.2)}
                    ry={Math.max(11, canopyPercent * 0.18)}
                    fill="url(#canopyGrad3)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.85 }}
                    transition={{ delay: 2.0, duration: 0.8, type: 'spring' }}
                  />

                  {/* Top canopy tuft */}
                  <motion.ellipse
                    cx="50"
                    cy={130 - Math.max(30, heightPercent * 0.55) - Math.max(28, canopyPercent * 0.44)}
                    rx={Math.max(10, canopyPercent * 0.16)}
                    ry={Math.max(9, canopyPercent * 0.14)}
                    fill="url(#canopyGrad)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    transition={{ delay: 2.2, duration: 0.6, type: 'spring' }}
                  />

                  {/* Breathing animation overlay on main canopy */}
                  <motion.ellipse
                    cx="50"
                    cy={130 - Math.max(30, heightPercent * 0.55) - Math.max(18, canopyPercent * 0.28)}
                    rx={Math.max(22, canopyPercent * 0.35)}
                    ry={Math.max(18, canopyPercent * 0.28)}
                    fill="hsla(142, 60%, 55%, 0.15)"
                    animate={{ scale: [1, 1.04, 1], opacity: [0.15, 0.25, 0.15] }}
                    transition={{ delay: 2.8, duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(30, 35%, 26%)" />
                      <stop offset="50%" stopColor="hsl(30, 30%, 36%)" />
                      <stop offset="100%" stopColor="hsl(30, 35%, 26%)" />
                    </linearGradient>
                    <radialGradient id="canopyGrad" cx="40%" cy="35%">
                      <stop offset="0%" stopColor="hsl(142, 62%, 48%)" />
                      <stop offset="60%" stopColor="hsl(142, 52%, 36%)" />
                      <stop offset="100%" stopColor="hsl(142, 42%, 26%)" />
                    </radialGradient>
                    <radialGradient id="canopyGrad2" cx="50%" cy="40%">
                      <stop offset="0%" stopColor="hsl(142, 58%, 44%)" />
                      <stop offset="100%" stopColor="hsl(142, 48%, 30%)" />
                    </radialGradient>
                    <radialGradient id="canopyGrad3" cx="45%" cy="35%">
                      <stop offset="0%" stopColor="hsl(142, 55%, 46%)" />
                      <stop offset="100%" stopColor="hsl(142, 45%, 32%)" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              {/* Growth metrics */}
              <div className="flex-1 space-y-3">
                {/* Height */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Ruler className="w-3 h-3" /> Height
                    </span>
                    <span className="text-sm font-bold text-foreground">{tree.treeHeight || 'N/A'}</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${heightPercent}%` }}
                      transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                    />
                  </div>
                </div>

                {/* Canopy */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sun className="w-3 h-3" /> Canopy
                    </span>
                    <span className="text-sm font-bold text-foreground">{tree.canopyWidth || 'N/A'}</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${canopyPercent}%` }}
                      transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60"
                    />
                  </div>
                </div>

                {/* Age */}
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sprout className="w-3 h-3 text-primary" />
                    <span>{treeAge}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getTrendIcon()}
                  <Badge className={`${getStatusColor(tree.status || 'planted')} border`}>
                    {(tree.status || 'planted').replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${getHealthColor(currentHealth)}20` }}
                >
                  <Heart className="w-5 h-5" style={{ color: getHealthColor(currentHealth) }} />
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{currentHealth}/10</p>
                  <p className="text-[10px] text-muted-foreground">Health Score</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Health Chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Health Over Time
              </p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id="healthGradientTimeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 65%, 42%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 65%, 42%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={20}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(142, 65%, 42%)"
                      strokeWidth={2}
                      fill="url(#healthGradientTimeline)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timeline Events */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Check-in History
        </p>
        <div className="relative pl-4 border-l-2 border-border space-y-4">
          {healthHistory.map((checkpoint, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="relative"
            >
              <div
                className="absolute -left-[21px] w-4 h-4 rounded-full border-2 border-background"
                style={{ backgroundColor: getHealthColor(checkpoint.healthScore) }}
              />

              <Card className="bg-card/50 ml-2">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Score: {checkpoint.healthScore}/10
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          by {checkpoint.checkedBy || 'Community'}
                        </span>
                      </div>
                      {checkpoint.notes && (
                        <p className="text-xs text-muted-foreground">{checkpoint.notes}</p>
                      )}
                      {(checkpoint.height || checkpoint.canopyWidth) && (
                        <div className="flex gap-3 mt-1">
                          {checkpoint.height && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Ruler className="w-2.5 h-2.5" /> {checkpoint.height}
                            </span>
                          )}
                          {checkpoint.canopyWidth && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Sun className="w-2.5 h-2.5" /> {checkpoint.canopyWidth}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                      <Calendar className="w-3 h-3" />
                      {format(checkpoint.date, 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Environmental Impact Estimate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-gradient-to-br from-moss/5 to-primary/5 border-moss/20">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              Estimated Impact
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: 'spring' }}
                  className="text-lg font-bold text-primary"
                >
                  {Math.max(1, Math.round(differenceInDays(new Date(), tree.submittedDate) * 0.06))}
                </motion.p>
                <p className="text-[10px] text-muted-foreground">kg CO₂ absorbed</p>
              </div>
              <div>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.0, type: 'spring' }}
                  className="text-lg font-bold text-primary"
                >
                  {Math.max(1, Math.round(differenceInDays(new Date(), tree.submittedDate) * 0.27))}
                </motion.p>
                <p className="text-[10px] text-muted-foreground">kg O₂ produced</p>
              </div>
              <div>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.1, type: 'spring' }}
                  className="text-lg font-bold text-primary"
                >
                  {Math.max(1, Math.round(differenceInDays(new Date(), tree.submittedDate) * 0.4))}
                </motion.p>
                <p className="text-[10px] text-muted-foreground">L water filtered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Photo Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden bg-black/95">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {attachments.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => setLightboxIndex(i => i > 0 ? i - 1 : attachments.length - 1)}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => setLightboxIndex(i => i < attachments.length - 1 ? i + 1 : 0)}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-full h-[65vh] max-h-[65vh] flex items-center justify-center">
                  <img
                    src={attachments[lightboxIndex]?.url}
                    alt={`Tree photo ${lightboxIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-4 bg-black/80 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    <span className="text-sm">Photo {lightboxIndex + 1} of {attachments.length}</span>
                  </div>
                  <span className="text-xs text-white/50">{attachments[lightboxIndex]?.name}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
