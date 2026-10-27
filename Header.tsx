import { motion } from 'framer-motion';
import { TreePine, Leaf } from 'lucide-react';
import { ExportReportButton } from '@/components/ExportReportButton';

export function Header() {
  return (
    <header className="h-16 shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-xs">
      <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-forest-light flex items-center justify-center shadow-soft">
              <TreePine className="w-5 h-5 text-primary-foreground" />
            </div>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center"
            >
              <Leaf className="w-2.5 h-2.5 text-accent-foreground" />
            </motion.div>
          </div>
          <div>
            <h1 className="font-bold text-foreground tracking-tight">Belize Tree Planting Tracker</h1>
            <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
              <span>Plant</span>
              <span className="w-1 h-1 rounded-full bg-accent" />
              <span>Care</span>
              <span className="w-1 h-1 rounded-full bg-accent" />
              <span>Restore</span>
            </p>
          </div>
        </motion.div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ExportReportButton />
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium text-accent">Demonstration</span>
          </div>
        </div>
      </div>
    </header>
  );
}