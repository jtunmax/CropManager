import { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapViewModule from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import { getStatusHex, TreeStatus } from '@/services/healthService';

interface MiniTreeMapProps {
  latitude: number;
  longitude: number;
  status?: string;
}

export function MiniTreeMap({ latitude, longitude, status }: MiniTreeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || latitude === 0 || longitude === 0) return;

    const color = getStatusHex((status || 'planted') as TreeStatus);
    const map = new Map({ basemap: 'topo' });
    const view = new MapViewModule({
      container: mapRef.current,
      map,
      center: [longitude, latitude],
      zoom: 14,
      ui: { components: ['attribution'] },
    });

    view.graphics.add(
      new Graphic({
        geometry: new Point({ longitude, latitude }),
        symbol: new SimpleMarkerSymbol({
          color,
          size: 14,
          outline: { color: [255, 255, 255], width: 2 },
        }),
      })
    );

    return () => {
      view.destroy();
    };
  }, [latitude, longitude, status]);

  if (latitude === 0 && longitude === 0) return null;

  return (
    <div className="lg:hidden mb-4 rounded-xl overflow-hidden border border-border shadow-card h-40 relative">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
