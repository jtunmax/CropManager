import { useEffect, useRef, useState, useCallback } from 'react';
import Map from '@arcgis/core/Map';
import MapViewModule from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import Extent from '@arcgis/core/geometry/Extent';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol';
import HeatmapRenderer from '@arcgis/core/renderers/HeatmapRenderer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import Locate from '@arcgis/core/widgets/Locate';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Crosshair, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { getTreeRecords, TreeFeature } from '@/services/featureService';
import { TreePopup } from './TreePopup';
import { HealthCheckForm } from './HealthCheckForm';
import { getStatusHex, TreeStatus } from '@/services/healthService';
import { validateLocation, isInBelize } from '@/services/locationValidation';
import { useToast } from '@/hooks/use-toast';
import { HeatmapToggle, HeatmapMode } from './HeatmapToggle';
import { BasemapSwitcher } from './BasemapSwitcher';
import { HealthStatusFilter } from './HealthStatusFilter';
import { TreeEditForm } from './TreeEditForm';

export interface MapFilter {
  type?: string | null;
  status?: string | null;
  healthRange?: 'healthy' | 'needs_care' | null;
  submittedBy?: string | null;
}

interface MapViewProps {
  onLocationSelect: (lat: number, lng: number, meta?: { inWater: boolean }) => void;
  selectedLocation: { lat: number; lng: number } | null;
  refreshTrigger?: number;
  onTreeClick?: (tree: TreeFeature) => void;
  onViewDetails?: (tree: TreeFeature) => void;
  selectedTree?: TreeFeature | null;
  mapFilter?: MapFilter | null;
  readOnly?: boolean;
}

export function MapView({ onLocationSelect, selectedLocation, refreshTrigger, onTreeClick, onViewDetails, selectedTree, mapFilter, readOnly = false }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<__esri.MapView | null>(null);
  const mapInstanceRef = useRef<__esri.Map | null>(null);
  const markerRef = useRef<Graphic | null>(null);
  const treeGraphicsRef = useRef<Graphic[]>([]);
  const heatmapLayerRef = useRef<__esri.FeatureLayer | null>(null);
  const treesDataRef = useRef<TreeFeature[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [instructions, setInstructions] = useState(true);
  const [popupTree, setPopupTree] = useState<TreeFeature | null>(null);
  const [healthCheckTree, setHealthCheckTree] = useState<TreeFeature | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off');
  const [currentBasemap, setCurrentBasemap] = useState('osm');
  const [statusFilter, setStatusFilter] = useState('');
  // Edit-tree flow state
  const [editTree, setEditTree] = useState<TreeFeature | null>(null);
  const [editMovedLocation, setEditMovedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [editIsWater, setEditIsWater] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  // Refs so the long-lived map click handler never reads stale state
  const pickingLocationRef = useRef(false);
  const editTreeRef = useRef<TreeFeature | null>(null);
  const { toast } = useToast();

  const updateMarker = useCallback((lat: number, lng: number) => {
    if (!viewRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      viewRef.current.graphics.remove(markerRef.current);
    }

    // Create new marker
    const point = new Point({
      latitude: lat,
      longitude: lng,
    });

    const symbol = new SimpleMarkerSymbol({
      style: 'circle',
      color: [45, 80, 22, 0.9],
      size: 16,
      outline: {
        color: [255, 255, 255],
        width: 3,
      },
    });

    const marker = new Graphic({
      geometry: point,
      symbol: symbol,
    });

    viewRef.current.graphics.add(marker);
    markerRef.current = marker;
  }, []);

  const loadExistingTrees = useCallback(async () => {
    if (!viewRef.current) return;

    // Clear existing tree graphics
    treeGraphicsRef.current.forEach((graphic) => {
      viewRef.current?.graphics.remove(graphic);
    });
    treeGraphicsRef.current = [];

    try {
      const trees = await getTreeRecords();
      treesDataRef.current = trees;
      
      // Only show trees with valid coordinates on the map
      const treesWithCoords = trees.filter(tree => tree.latitude !== 0 && tree.longitude !== 0);
      console.log(`Displaying ${treesWithCoords.length} of ${trees.length} trees on map (${trees.length - treesWithCoords.length} missing coordinates)`);
      
      // Only render markers if heatmap is off
      if (heatmapMode === 'off') {
        treesWithCoords.forEach((tree) => {
          const point = new Point({
            latitude: tree.latitude,
            longitude: tree.longitude,
          });

          // Get color based on health status - smart symbology
          const treeStatus = (tree.status as TreeStatus) || 'planted';
          const statusHex = getStatusHex(treeStatus);

          // Create tree SVG icon with status-based color
          const treeSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
              <path d="M16 4 L8 16 L11 16 L6 26 L14 26 L14 36 L18 36 L18 26 L26 26 L21 16 L24 16 Z" 
                    fill="${statusHex}" 
                    stroke="#ffffff" 
                    stroke-width="1.5"/>
            </svg>
          `;
          
          const svgDataUrl = `data:image/svg+xml;base64,${btoa(treeSvg)}`;

          // Tree marker symbol with custom tree icon
          const markerSymbol = new PictureMarkerSymbol({
            url: svgDataUrl,
            width: '24px',
            height: '30px',
          });

          const marker = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            attributes: tree,
          });

          viewRef.current?.graphics.add(marker);
          treeGraphicsRef.current.push(marker);
        });
      }
    } catch (error) {
      console.error('Failed to load existing trees:', error);
    }
  }, [heatmapMode]);

  // Handle heatmap mode changes
  const updateHeatmapLayer = useCallback(() => {
    if (!mapInstanceRef.current || !viewRef.current) return;

    // Remove existing heatmap layer
    if (heatmapLayerRef.current) {
      mapInstanceRef.current.remove(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }

    if (heatmapMode === 'off') {
      // Show tree markers again
      loadExistingTrees();
      return;
    }

    // Clear tree marker graphics when showing heatmap
    treeGraphicsRef.current.forEach((graphic) => {
      viewRef.current?.graphics.remove(graphic);
    });
    treeGraphicsRef.current = [];

    // Filter trees based on mode
    let filteredTrees = treesDataRef.current.filter(tree => tree.latitude !== 0 && tree.longitude !== 0);
    
    if (heatmapMode === 'healthy') {
      filteredTrees = filteredTrees.filter(tree => 
        tree.status === 'alive' || tree.status === 'planted' || !tree.status
      );
    }

    if (filteredTrees.length === 0) {
      toast({
        title: 'No trees to display',
        description: heatmapMode === 'healthy' ? 'No healthy trees found for heatmap' : 'No trees found for heatmap',
      });
      return;
    }

    // Create graphics for heatmap
    const graphics = filteredTrees.map((tree, index) => {
      return new Graphic({
        geometry: new Point({
          latitude: tree.latitude,
          longitude: tree.longitude,
        }),
        attributes: {
          ObjectID: index,
          treeType: tree.treeType,
          status: tree.status || 'planted',
        },
      });
    });

    // Create a client-side feature layer for the heatmap
    const heatmapLayer = new FeatureLayer({
      source: graphics,
      objectIdField: 'ObjectID',
      fields: [
        { name: 'ObjectID', type: 'oid' },
        { name: 'treeType', type: 'string' },
        { name: 'status', type: 'string' },
      ],
      renderer: new HeatmapRenderer({
        colorStops: [
          { color: 'rgba(255, 255, 255, 0)', ratio: 0 },
          { color: 'rgba(144, 238, 144, 0.4)', ratio: 0.1 },  // Light green
          { color: 'rgba(34, 197, 94, 0.6)', ratio: 0.3 },    // Green
          { color: 'rgba(250, 204, 21, 0.7)', ratio: 0.5 },   // Yellow
          { color: 'rgba(251, 146, 60, 0.8)', ratio: 0.7 },   // Orange
          { color: 'rgba(239, 68, 68, 0.9)', ratio: 0.9 },    // Red
          { color: 'rgba(185, 28, 28, 1)', ratio: 1 },        // Dark red
        ],
        radius: 12,
        maxDensity: 0.04,
        minDensity: 0,
      }),
    });

    mapInstanceRef.current.add(heatmapLayer);
    heatmapLayerRef.current = heatmapLayer;
  }, [heatmapMode, loadExistingTrees, toast]);

  // Update heatmap when mode changes
  useEffect(() => {
    if (isReady) {
      updateHeatmapLayer();
    }
  }, [heatmapMode, isReady, updateHeatmapLayer]);

  // Switch basemap when heatmap mode or user selection changes
  useEffect(() => {
    if (mapInstanceRef.current && viewRef.current) {
      const basemap = heatmapMode !== 'off' ? 'dark-gray' : currentBasemap;
      mapInstanceRef.current.basemap = basemap as any;
    }
  }, [heatmapMode, currentBasemap]);

  const handleBasemapChange = (basemap: string) => {
    setCurrentBasemap(basemap);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new Map({
      basemap: 'osm',
    });

    mapInstanceRef.current = map;

    // Add Belize Districts boundary layer
    // NOTE: public hosted service (no sign-in required); the previous
    // services3.arcgis.com "districts" service is secured and triggers a login prompt.
    const districtsLayer = new FeatureLayer({
      url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Administrative_Divisions/FeatureServer/0',
      definitionExpression: "COUNTRY = 'Belize'",
      opacity: 0.35,
      renderer: new SimpleRenderer({
        symbol: {
          type: 'simple-fill',
          color: [45, 80, 22, 0.08],
          outline: {
            color: [45, 80, 22, 0.7],
            width: 1.5,
          },
        } as any,
      }),
      // Popup disabled: districts stay queryable for data but clicking
      // them (e.g. while planting a tree) must not open a district popup.
      popupEnabled: false,
    });
    map.add(districtsLayer);

    // Create tighter Belize extent for geofencing
    const belizeExtent = new Extent({
      xmin: -89.3,
      ymin: 15.85,
      xmax: -87.4,
      ymax: 18.55,
      spatialReference: { wkid: 4326 },
    });

    const view = new MapViewModule({
      container: mapRef.current,
      map: map,
      center: [-88.75, 17.2],
      zoom: 8,
      ui: {
        components: ['zoom'],
      },
      constraints: {
        minZoom: 6,
        geometry: belizeExtent,
      },
    });

    // Add locate widget
    const locateWidget = new Locate({
      view: view,
    });

    view.ui.add(locateWidget, 'top-right');

    view.when(() => {
      setIsReady(true);
      viewRef.current = view;

      // Load existing trees
      loadExistingTrees();

      // Handle click - check if a tree graphic was clicked
      view.on('click', async (event) => {
        // In readOnly or heatmap mode, disable all interactions
        if (readOnly || heatmapMode !== 'off') {
          return;
        }

        // Picking a new location for a tree being edited
        if (pickingLocationRef.current) {
          const { latitude, longitude } = event.mapPoint;

          if (!isInBelize(latitude, longitude)) {
            toast({
              title: 'Invalid Location',
              description: 'Please select a location within Belize.',
              variant: 'destructive',
            });
            return;
          }

          updateMarker(latitude, longitude);
          setIsValidating(true);
          const moveValidation = await validateLocation(latitude, longitude);
          setIsValidating(false);

          pickingLocationRef.current = false;
          setPickingLocation(false);
          setEditMovedLocation({ lat: latitude, lng: longitude });
          setEditIsWater(moveValidation.isWater ?? false);
          toast({
            title: moveValidation.isWater ? 'Water location selected' : 'New location selected',
            description: moveValidation.isWater
              ? 'Only water-tolerant species can be planted here.'
              : 'Save the form to move the tree.',
          });
          return;
        }

        const response = await view.hitTest(event);
        
        // Check if a tree graphic was clicked
        const treeHit = response.results.find((result) => {
          if (result.type === 'graphic') {
            const graphic = result.graphic;
            // Skip the districts boundary layer — its features also have
            // objectId and must not be treated as trees.
            const layer = (result as any).layer;
            if (layer && layer.id === districtsLayer.id) return false;
            // Check if it's a tree graphic (has tree attributes)
            return graphic.attributes && graphic.attributes.objectId !== undefined;
          }
          return false;
        });

        if (treeHit && treeHit.type === 'graphic') {
          const treeData = treeHit.graphic.attributes as TreeFeature;
          setPopupTree(treeData);
          setValidationError(null);
          
          // Zoom to tree location
          view.goTo({
            center: [treeData.longitude, treeData.latitude],
            zoom: 16,
          });
        } else {
          // No tree clicked - validate and select location for new tree
          const { latitude, longitude } = event.mapPoint;
          setPopupTree(null);
          setValidationError(null);
          
          // Quick client-side check for Belize bounds
          if (!isInBelize(latitude, longitude)) {
            setValidationError('This location is outside of Belize. Please select a location within Belize.');
            toast({
              title: 'Invalid Location',
              description: 'Please select a location within Belize.',
              variant: 'destructive',
            });
            return;
          }
          
          // Show temporary marker while validating
          updateMarker(latitude, longitude);
          setIsValidating(true);
          
          // Validate location (checks for water)
          const validation = await validateLocation(latitude, longitude);
          setIsValidating(false);
          
          if (!validation.valid) {
            setValidationError(validation.reason || 'Invalid location');
            // Remove the marker
            if (markerRef.current && viewRef.current) {
              viewRef.current.graphics.remove(markerRef.current);
              markerRef.current = null;
            }
            toast({
              title: 'Invalid Location',
              description: validation.reason,
              variant: 'destructive',
            });
            return;
          }
          
          // Location is valid (isWater flags water spots so the form
          // can restrict species to water-tolerant ones)
          onLocationSelect(latitude, longitude, { inWater: validation.isWater ?? false });
          setInstructions(false);
        }
      });
    });

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLocationSelect, updateMarker, toast]);

  // Load trees on initial mount and when refreshTrigger changes
  useEffect(() => {
    if (isReady) {
      loadExistingTrees().then(() => {
        if (heatmapMode !== 'off') {
          updateHeatmapLayer();
        }
      });
    }
  }, [refreshTrigger, isReady, loadExistingTrees, heatmapMode, updateHeatmapLayer]);

  // Handle dashboard filter - show/hide tree markers and zoom to filtered extent
  // Apply map filter by removing/re-adding graphics (ArcGIS Graphic has no .visible property)
  useEffect(() => {
    if (!viewRef.current || !isReady || heatmapMode !== 'off') return;
    if (!treeGraphicsRef.current.length) return;

    const filter = { ...mapFilter, status: statusFilter || mapFilter?.status || undefined };
    const hasFilter = filter.type || filter.status || filter.healthRange || filter.submittedBy;

    // Remove all tree graphics from the view first
    treeGraphicsRef.current.forEach((graphic) => {
      viewRef.current?.graphics.remove(graphic);
    });

    // Re-add only the ones that pass the filter
    const visibleGraphics: Graphic[] = [];
    treeGraphicsRef.current.forEach((graphic) => {
      const tree = graphic.attributes as TreeFeature;
      let visible = true;

      if (filter.type) {
        visible = tree.treeType === filter.type;
      }
      if (filter.status) {
        visible = visible && (tree.status || 'unknown') === filter.status;
      }
      if (filter.healthRange) {
        if (filter.healthRange === 'healthy') {
          visible = visible && (tree.healthScore || 0) >= 7;
        } else if (filter.healthRange === 'needs_care') {
          visible = visible && tree.healthScore != null && tree.healthScore <= 4;
        }
      }
      if (filter.submittedBy) {
        visible = visible && (tree.submittedBy || 'Anonymous') === filter.submittedBy;
      }

      if (visible) {
        viewRef.current?.graphics.add(graphic);
        visibleGraphics.push(graphic);
      }
    });

    // Zoom to extent of visible trees when filter is active
    if (visibleGraphics.length > 0 && hasFilter) {
      const lats = visibleGraphics.map(g => (g.attributes as TreeFeature).latitude);
      const lngs = visibleGraphics.map(g => (g.attributes as TreeFeature).longitude);
      
      if (visibleGraphics.length === 1) {
        viewRef.current.goTo({
          center: [lngs[0], lats[0]],
          zoom: 14,
        }, { duration: 800 });
      } else {
        const extent = new Extent({
          xmin: Math.min(...lngs) - 0.01,
          ymin: Math.min(...lats) - 0.01,
          xmax: Math.max(...lngs) + 0.01,
          ymax: Math.max(...lats) + 0.01,
          spatialReference: { wkid: 4326 },
        });
        viewRef.current.goTo(extent, { duration: 800 });
      }
    } else if (!hasFilter) {
      // No filter — all graphics already re-added, zoom to default
        viewRef.current.goTo({
        center: [-88.75, 17.2],
        zoom: 8,
      }, { duration: 800 });
    }
  }, [mapFilter, statusFilter, isReady, heatmapMode, refreshTrigger]);

  // Update marker when selectedLocation changes externally
  useEffect(() => {
    if (selectedLocation && viewRef.current) {
      updateMarker(selectedLocation.lat, selectedLocation.lng);
      
      // Center map on location
      viewRef.current.goTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 15,
      });
    }
  }, [selectedLocation, updateMarker]);

  const goToLocation = (lat: number, lng: number) => {
    if (viewRef.current) {
      viewRef.current.goTo({
        center: [lng, lat],
        zoom: 16,
      });
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border shadow-card">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map controls - heatmap toggle and basemap switcher */}
      {!readOnly && (
        <div className="absolute top-24 left-4 z-10 flex flex-col gap-2">
          <HeatmapToggle mode={heatmapMode} onModeChange={setHeatmapMode} />
          <HealthStatusFilter value={statusFilter} onChange={setStatusFilter} />
          <BasemapSwitcher currentBasemap={heatmapMode !== 'off' ? 'dark-gray-vector' : currentBasemap} onBasemapChange={handleBasemapChange} />
        </div>
      )}
      
      {/* Basemap switcher removed from here - now in HeatmapToggle area */}
      
      {/* Loading overlay */}
      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-card flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <MapPin className="w-8 h-8 text-primary" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays hidden in readOnly mode */}
      {!readOnly && (
        <>
          <AnimatePresence>
            {isReady && instructions && !selectedLocation && !isValidating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-[2px] right-2 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:bottom-4 md:w-auto"
              >
                <div className="glass-card rounded-lg px-2 py-1 md:px-4 md:py-3 flex items-center gap-2 md:gap-3">
                  <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Crosshair className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-sm font-medium text-foreground whitespace-nowrap md:whitespace-normal">
                      <span className="md:hidden">Tap the map</span>
                      <span className="hidden md:inline">Click on the map</span>
                    </p>
                    <p className="hidden md:block text-xs text-muted-foreground">Select where the tree was planted</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isValidating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-auto"
              >
                <div className="glass-card rounded-lg px-4 py-3 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Validating location...</p>
                    <p className="text-xs text-muted-foreground">Checking if this is a suitable planting spot</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {validationError && !isValidating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:max-w-sm"
              >
                <div className="glass-card rounded-lg px-4 py-3 flex items-center gap-3 border border-destructive/30 bg-destructive/5">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Invalid Location</p>
                    <p className="text-xs text-muted-foreground">{validationError}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedLocation && !popupTree && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-36 left-4"
              >
                <div className="glass-card rounded-lg px-3 py-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Heatmap legend */}
      <AnimatePresence>
        {heatmapMode !== 'off' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-12 right-4 z-10"
          >
            <div className="glass-card rounded-lg p-3">
              <p className="text-xs font-medium text-foreground mb-2">
                {heatmapMode === 'healthy' ? 'Healthy Trees' : 'All Trees'} Density
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Low</span>
                <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-300 via-yellow-400 via-orange-400 to-red-600" />
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tree popup */}
      <AnimatePresence>
        {popupTree && !healthCheckTree && heatmapMode === 'off' && (
          <TreePopup 
            tree={popupTree} 
            onClose={() => setPopupTree(null)}
            onHealthCheck={() => {
              setHealthCheckTree(popupTree);
            }}
            onEdit={() => {
              editTreeRef.current = popupTree;
              setEditTree(popupTree);
              setEditMovedLocation(null);
              setEditIsWater(false);
              setPopupTree(null);
            }}
            onViewInActivity={() => {
              onViewDetails?.(popupTree);
              // On mobile close popup, on desktop keep it open
              if (window.innerWidth < 768) {
                setPopupTree(null);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Health check modal */}
      <AnimatePresence>
        {healthCheckTree && (
          <div className="absolute inset-0 bg-black/50 flex items-end md:items-center justify-center z-30 p-4 pt-14 md:pt-4">
            <HealthCheckForm
              tree={healthCheckTree}
              onComplete={() => {
                setHealthCheckTree(null);
                setPopupTree(null);
                loadExistingTrees(); // Refresh to show updated status
              }}
              onCancel={() => setHealthCheckTree(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Edit tree modal */}
      <AnimatePresence>
        {editTree && !pickingLocation && (
          <div className="absolute inset-0 bg-black/50 flex items-end md:items-center justify-center z-30 p-4 pt-14 md:pt-4">
            <TreeEditForm
              tree={editTree}
              movedLocation={editMovedLocation}
              isWater={editIsWater}
              onPickLocation={() => {
                pickingLocationRef.current = true;
                setPickingLocation(true);
              }}
              onSaved={() => {
                const savedTree = editTree;
                editTreeRef.current = null;
                setEditTree(null);
                setEditMovedLocation(null);
                // Refresh markers, then reopen the popup on the moved tree
                loadExistingTrees().then(() => {
                  const updated = treesDataRef.current.find((t) => t.objectId === savedTree?.objectId);
                  if (updated) setPopupTree(updated);
                });
              }}
              onCancel={() => {
                editTreeRef.current = null;
                setEditTree(null);
                setEditMovedLocation(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Pick-location banner */}
      <AnimatePresence>
        {pickingLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-auto z-30"
          >
            <div className="glass-card rounded-lg px-4 py-3 flex items-center gap-3 border border-primary/30">
              <Crosshair className="w-5 h-5 text-primary animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Choose a new location</p>
                <p className="text-xs text-muted-foreground">Tap the map where the tree should be</p>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => {
                  pickingLocationRef.current = false;
                  setPickingLocation(false);
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ArcGIS Attribution */}
      <div className="absolute left-2 bottom-2 z-10">
        <div className="glass-card rounded px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <span>Powered by</span>
          <span className="font-semibold text-foreground">ESRI</span>
        </div>
      </div>
    </div>
  );
}

export type { MapViewProps };
