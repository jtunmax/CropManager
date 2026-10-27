import { motion } from 'framer-motion';
import { TreePine, MapPin, Leaf, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomePageProps {
  onEnter: () => void;
}

export function WelcomePage({ onEnter }: WelcomePageProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Layered background gradient */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Decorative glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px]" />
      </div>
      
      {/* Floating leaves and trees - spread across entire screen */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(45)].map((_, i) => {
          const startX = (i * 7.3) % 100;
          const size = 18 + (i % 6) * 6;
          const duration = 9 + (i % 8) * 1.5;
          const delay = -((i * 0.9) % duration);
          const drift = ((i % 5) - 2) * 60;
          const isTree = i % 5 === 0;
          const Icon = isTree ? TreePine : Leaf;
          
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{ 
                left: `${startX}%`,
                color: isTree ? 'hsl(142 50% 70% / 0.45)' : 'hsl(80 50% 75% / 0.55)'
              }}
              initial={{ 
                y: -80,
                rotate: 0,
                opacity: 0.5 + (i % 4) * 0.12
              }}
              animate={{ 
                y: '120vh',
                rotate: isTree ? 0 : 360 + (i % 2 === 0 ? 180 : -180),
                x: drift
              }}
              transition={{ 
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: 'linear'
              }}
            >
              <Icon size={size} />
            </motion.div>
          );
        })}
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 flex items-center justify-center shadow-lg">
            <TreePine className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-lg text-primary-foreground">Belize Tree Planting Tracker</span>
            <span className="text-primary-foreground/60 text-sm block -mt-0.5">Supporting the Greening Belize Initiative</span>
          </div>
        </motion.div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-center max-w-2xl"
        >
          {/* Animated floating icon with glow */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 relative"
          >
            <div className="absolute inset-0 w-28 h-28 mx-auto rounded-2xl bg-accent/30 blur-2xl" />
            <div className="relative w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-primary-foreground/15 to-primary-foreground/5 backdrop-blur-xl border border-primary-foreground/20 flex items-center justify-center shadow-2xl">
              <TreePine className="w-14 h-14 text-primary-foreground drop-shadow-lg" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold flex items-center justify-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </motion.div>
          </motion.div>

          {/* Title with gradient and serif accent */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-2 tracking-tight">
              Belize Tree Planting Tracker
            </h1>
            <p className="font-serif text-3xl md:text-4xl lg:text-5xl italic text-primary-foreground/80 mb-6">
              One million trees by 2030
            </p>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-lg mx-auto leading-relaxed"
          >
            Record each tree you plant, follow how it grows, and see your community's impact across Belize's districts.
            <span className="text-primary-foreground/90 font-medium"> Small seedlings today, a greener country tomorrow.</span>
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {[
              { icon: MapPin, label: 'Geo-locate trees', color: 'bg-accent/20 border-accent/30' },
              { icon: Leaf, label: 'Track species', color: 'bg-moss/20 border-moss/30' },
              { icon: Heart, label: 'Monitor health', color: 'bg-sunset/20 border-sunset/30' },
            ].map((feature) => (
              <motion.div 
                key={feature.label}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full backdrop-blur-md border ${feature.color} transition-all`}
              >
                <feature.icon className="w-4 h-4 text-primary-foreground/80" />
                <span className="text-sm font-medium text-primary-foreground/80">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              size="lg"
              onClick={onEnter}
              className="group relative bg-primary-foreground text-primary hover:bg-primary-foreground/95 font-bold px-10 py-7 text-lg rounded-2xl shadow-2xl hover:shadow-[0_20px_60px_-10px_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-1 gap-3 overflow-hidden"
            >
              <span className="relative z-10">Enter the Tracker</span>
              <ArrowRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
          </motion.div>

          {/* Stats teaser */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 inline-flex items-center justify-center gap-8 px-8 py-4 rounded-2xl bg-primary/80 backdrop-blur-md border border-primary-foreground/15 text-primary-foreground/80 shadow-lg"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-foreground/70">🌳</p>
              <p className="text-xs mt-1">Track Trees</p>
            </div>
            <div className="w-px h-8 bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-foreground/70">📍</p>
              <p className="text-xs mt-1">Map Locations</p>
            </div>
            <div className="w-px h-8 bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-foreground/70">🏆</p>
              <p className="text-xs mt-1">Grow Together</p>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-primary-foreground/35 font-medium"
        >
          Demonstration edition · Sample records are not national campaign totals 🇧🇿
        </motion.p>
      </footer>
    </div>
  );
}