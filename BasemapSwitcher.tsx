import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers } from 'lucide-react';

// Raster basemaps only — vector basemaps (*-vector) require an ArcGIS API key
// and trigger an unwanted sign-in prompt.
const BASEMAPS = [
  { id: 'osm', label: 'Streets' },
  { id: 'dark-gray', label: 'Streets Night' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'topo', label: 'Topographic' },
] as const;

interface BasemapSwitcherProps {
  currentBasemap: string;
  onBasemapChange: (basemap: string) => void;
}

export function BasemapSwitcher({ currentBasemap, onBasemapChange }: BasemapSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-lg bg-card/90 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
        title="Switch basemap"
      >
        <Layers className="w-4 h-4 text-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-11 left-0 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px]"
          >
            {BASEMAPS.map((basemap) => (
              <button
                key={basemap.id}
                onClick={() => {
                  onBasemapChange(basemap.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  currentBasemap === basemap.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {basemap.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
