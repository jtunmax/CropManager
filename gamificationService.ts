import { TreeFeature } from './featureService';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  earnedDate?: Date;
}

export interface UserStats {
  name: string;
  totalTrees: number;
  nativeSpeciesCount: number;
  firstTreeDate?: Date;
  lastTreeDate?: Date;
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
  neighborhoods: string[];
  treeTypes: Record<string, number>;
  monthlyActivity: Record<string, number>;
}

// Belize coordinates for rough neighborhood detection
const BELIZE_REGIONS: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  'Belize City': { lat: [17.45, 17.55], lng: [-88.25, -88.15] },
  'San Ignacio': { lat: [17.13, 17.18], lng: [-89.12, -89.05] },
  'Orange Walk': { lat: [18.05, 18.15], lng: [-88.58, -88.52] },
  'Dangriga': { lat: [16.95, 17.0], lng: [-88.25, -88.2] },
  'Belmopan': { lat: [17.22, 17.28], lng: [-88.78, -88.72] },
  'Corozal': { lat: [18.38, 18.42], lng: [-88.4, -88.35] },
  'Punta Gorda': { lat: [16.08, 16.12], lng: [-88.82, -88.78] },
  'San Pedro': { lat: [17.9, 17.95], lng: [-87.98, -87.93] },
  'Placencia': { lat: [16.5, 16.55], lng: [-88.38, -88.33] },
  'Hopkins': { lat: [16.98, 17.02], lng: [-88.26, -88.22] },
};

const NATIVE_SPECIES = ['mahogany', 'ceiba', 'cohune', 'native', 'mangrove', 'breadfruit', 'breadnut'];

export function detectNeighborhood(lat: number, lng: number): string {
  for (const [region, bounds] of Object.entries(BELIZE_REGIONS)) {
    if (
      lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
      lng >= bounds.lng[0] && lng <= bounds.lng[1]
    ) {
      return region;
    }
  }
  
  // Broader district detection
  if (lat > 18.0) return 'Corozal District';
  if (lat > 17.5 && lng < -88.5) return 'Orange Walk District';
  if (lat > 17.0 && lat < 17.5 && lng > -88.5) return 'Belize District';
  if (lat > 17.0 && lat < 17.5 && lng < -88.5) return 'Cayo District';
  if (lat > 16.5 && lat < 17.0) return 'Stann Creek District';
  if (lat < 16.5) return 'Toledo District';
  
  return 'Unknown Region';
}

function calculateStreak(trees: TreeFeature[]): { current: number; longest: number } {
  if (trees.length === 0) return { current: 0, longest: 0 };
  
  // Sort by date
  const sorted = [...trees].sort((a, b) => b.submittedDate.getTime() - a.submittedDate.getTime());
  
  // Group by month
  const months = new Set<string>();
  sorted.forEach(tree => {
    const month = `${tree.submittedDate.getFullYear()}-${String(tree.submittedDate.getMonth() + 1).padStart(2, '0')}`;
    months.add(month);
  });
  
  const sortedMonths = Array.from(months).sort().reverse();
  
  // Calculate current streak (consecutive months from now)
  let currentStreak = 0;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  // Check if active this month or last month
  if (sortedMonths[0] === currentMonth || sortedMonths[0] === lastMonthStr) {
    currentStreak = 1;
    for (let i = 1; i < sortedMonths.length; i++) {
      const prevDate = new Date(sortedMonths[i - 1] + '-01');
      const currDate = new Date(sortedMonths[i] + '-01');
      const monthDiff = (prevDate.getFullYear() - currDate.getFullYear()) * 12 + 
                        (prevDate.getMonth() - currDate.getMonth());
      if (monthDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  const allMonths = Array.from(months).sort();
  
  for (let i = 1; i < allMonths.length; i++) {
    const prevDate = new Date(allMonths[i - 1] + '-01');
    const currDate = new Date(allMonths[i] + '-01');
    const monthDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + 
                      (currDate.getMonth() - prevDate.getMonth());
    if (monthDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  return { current: currentStreak, longest: longestStreak };
}

function calculateBadges(stats: Omit<UserStats, 'badges'>): Badge[] {
  const badges: Badge[] = [];
  
  // 🌱 First Tree
  if (stats.totalTrees >= 1 && stats.firstTreeDate) {
    badges.push({
      id: 'first-tree',
      name: 'First Tree',
      emoji: '🌱',
      description: 'Planted your first tree!',
      earned: true,
      earnedDate: stats.firstTreeDate,
    });
  }
  
  // 🌳 10 Trees
  if (stats.totalTrees >= 10) {
    badges.push({
      id: 'ten-trees',
      name: '10 Trees',
      emoji: '🌳',
      description: 'Planted 10 trees!',
      earned: true,
    });
  }
  
  // 🏅 Native Species Champion (planted 5+ native species)
  if (stats.nativeSpeciesCount >= 5) {
    badges.push({
      id: 'native-champion',
      name: 'Native Species Champion',
      emoji: '🏅',
      description: 'Planted 5+ native Belizean trees!',
      earned: true,
    });
  }
  
  // 🔥 Streak Master (3+ month streak)
  if (stats.currentStreak >= 3 || stats.longestStreak >= 3) {
    badges.push({
      id: 'streak-master',
      name: 'Streak Master',
      emoji: '🔥',
      description: 'Planted trees for 3+ months in a row!',
      earned: true,
    });
  }
  
  // 🌍 Community Builder (planted in 3+ neighborhoods)
  if (stats.neighborhoods.length >= 3) {
    badges.push({
      id: 'community-builder',
      name: 'Community Builder',
      emoji: '🌍',
      description: 'Planted trees in 3+ different areas!',
      earned: true,
    });
  }
  
  // 🎯 Diversity Champion (planted 5+ different tree types)
  if (Object.keys(stats.treeTypes).length >= 5) {
    badges.push({
      id: 'diversity-champion',
      name: 'Diversity Champion',
      emoji: '🎯',
      description: 'Planted 5+ different tree species!',
      earned: true,
    });
  }
  
  // 💯 Century Planter (100 trees)
  if (stats.totalTrees >= 100) {
    badges.push({
      id: 'century-planter',
      name: 'Century Planter',
      emoji: '💯',
      description: 'Planted 100 trees!',
      earned: true,
    });
  }
  
  return badges;
}

export function calculateUserStats(trees: TreeFeature[], userName: string): UserStats {
  const userTrees = trees.filter(t => t.submittedBy === userName);
  
  if (userTrees.length === 0) {
    return {
      name: userName,
      totalTrees: 0,
      nativeSpeciesCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      neighborhoods: [],
      treeTypes: {},
      monthlyActivity: {},
    };
  }
  
  // Sort by date
  const sorted = [...userTrees].sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());
  
  // Count native species
  const nativeSpeciesCount = userTrees.filter(t => 
    NATIVE_SPECIES.some(ns => t.treeType.toLowerCase().includes(ns))
  ).length;
  
  // Collect neighborhoods
  const neighborhoods = new Set<string>();
  userTrees.forEach(t => {
    if (t.latitude && t.longitude) {
      neighborhoods.add(detectNeighborhood(t.latitude, t.longitude));
    }
  });
  
  // Count tree types
  const treeTypes: Record<string, number> = {};
  userTrees.forEach(t => {
    const type = t.treeType || 'unknown';
    treeTypes[type] = (treeTypes[type] || 0) + 1;
  });
  
  // Monthly activity
  const monthlyActivity: Record<string, number> = {};
  userTrees.forEach(t => {
    const month = `${t.submittedDate.getFullYear()}-${String(t.submittedDate.getMonth() + 1).padStart(2, '0')}`;
    monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
  });
  
  const { current, longest } = calculateStreak(userTrees);
  
  const baseStats: Omit<UserStats, 'badges'> = {
    name: userName,
    totalTrees: userTrees.length,
    nativeSpeciesCount,
    firstTreeDate: sorted[0]?.submittedDate,
    lastTreeDate: sorted[sorted.length - 1]?.submittedDate,
    currentStreak: current,
    longestStreak: longest,
    neighborhoods: Array.from(neighborhoods),
    treeTypes,
    monthlyActivity,
  };
  
  return {
    ...baseStats,
    badges: calculateBadges(baseStats),
  };
}

export function getCommunityStats(trees: TreeFeature[]): {
  totalTrees: number;
  totalContributors: number;
  totalNeighborhoods: number;
  thisMonthTrees: number;
  lastMonthTrees: number;
} {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  const contributors = new Set<string>();
  const neighborhoods = new Set<string>();
  let thisMonthCount = 0;
  let lastMonthCount = 0;
  
  trees.forEach(t => {
    contributors.add(t.submittedBy || 'Anonymous');
    if (t.latitude && t.longitude) {
      neighborhoods.add(detectNeighborhood(t.latitude, t.longitude));
    }
    const treeMonth = `${t.submittedDate.getFullYear()}-${String(t.submittedDate.getMonth() + 1).padStart(2, '0')}`;
    if (treeMonth === thisMonth) thisMonthCount++;
    if (treeMonth === lastMonth) lastMonthCount++;
  });
  
  return {
    totalTrees: trees.length,
    totalContributors: contributors.size,
    totalNeighborhoods: neighborhoods.size,
    thisMonthTrees: thisMonthCount,
    lastMonthTrees: lastMonthCount,
  };
}
