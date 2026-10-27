import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import esriRequest from '@arcgis/core/request';

const FEATURE_SERVICE_URL = 'https://services.arcgis.com/lkHhAsiwtcKnwSeA/arcgis/rest/services/treetrackerapp/FeatureServer/0';

// Helper to truncate strings to avoid ArcGIS field length limits
function truncate(value: string | undefined | null, maxLength: number): string | null {
  if (!value) return null;
  return value.length > maxLength ? value.substring(0, maxLength - 3) + '...' : value;
}

export interface TreeRecord {
  latitude: number;
  longitude: number;
  treeType: string;
  reason: string;
  notes: string;
  imageBase64?: string;
  submittedBy: string;
  // Initial health fields (optional on submission)
  status?: 'planted' | 'alive' | 'needs_care' | 'dead';
  healthScore?: number;
  treeHeight?: string;
  canopyWidth?: string;
}

export interface TreeFeature {
  objectId: number;
  latitude: number;
  longitude: number;
  treeType: string;
  reason: string;
  notes: string;
  submittedBy: string;
  submittedDate: Date;
  hasAttachment?: boolean;
  // Health tracking fields
  status?: 'planted' | 'alive' | 'needs_care' | 'dead';
  healthScore?: number;
  lastCheckDate?: Date;
  lastCheckedBy?: string;
  treeHeight?: string;
  canopyWidth?: string;
  healthNotes?: string;
}

let featureLayer: FeatureLayer | null = null;

export function getFeatureLayer(): FeatureLayer {
  if (!featureLayer) {
    featureLayer = new FeatureLayer({
      url: FEATURE_SERVICE_URL,
    });
  }
  return featureLayer;
}

export async function submitTreeRecord(record: TreeRecord): Promise<{ objectId: number; success: boolean }> {
  const layer = getFeatureLayer();
  
  const point = new Point({
    longitude: record.longitude,
    latitude: record.latitude,
    spatialReference: { wkid: 4326 },
  });

  const graphic = new Graphic({
    geometry: point,
    attributes: {
      tree_type: truncate(record.treeType, 100),
      planting_reason: truncate(record.reason, 100),
      notes: truncate(record.notes, 255) || '',
      submitted_by: truncate(record.submittedBy, 100),
      submitted_date: Date.now(),
      // Initial health data
      status: truncate(record.status || 'planted', 50),
      health_score: record.healthScore || 8,
      last_check_date: Date.now(),
      last_checked_by: truncate(record.submittedBy, 100),
      tree_height: truncate(record.treeHeight, 50),
      canopy_width: truncate(record.canopyWidth, 50),
    },
  });

  const result = await layer.applyEdits({
    addFeatures: [graphic],
  });

  if (result.addFeatureResults.length > 0) {
    const addResult = result.addFeatureResults[0];
    
    if (addResult.error) {
      throw new Error(addResult.error.message || 'Failed to add feature');
    }

    const objectId = addResult.objectId as number;

    // If there's an image, add it as an attachment using esriRequest
    if (record.imageBase64) {
      await addAttachment(objectId, record.imageBase64);
    }

    return { objectId, success: true };
  }

  throw new Error('No results returned from feature service');
}

export interface TreeUpdate {
  latitude?: number;
  longitude?: number;
  treeType?: string;
  reason?: string;
  notes?: string;
  submittedBy?: string;
}

/** Edit an existing tree record — attributes and/or its map location. */
export async function updateTreeRecord(objectId: number, updates: TreeUpdate): Promise<void> {
  const layer = getFeatureLayer();

  const attributes: Record<string, unknown> = { OBJECTID: objectId };
  if (updates.treeType !== undefined) attributes.tree_type = truncate(updates.treeType, 100);
  if (updates.reason !== undefined) attributes.planting_reason = truncate(updates.reason, 100);
  if (updates.notes !== undefined) attributes.notes = truncate(updates.notes, 255) || '';
  if (updates.submittedBy !== undefined) attributes.submitted_by = truncate(updates.submittedBy, 100);

  const graphicProps: __esri.GraphicProperties = { attributes };
  if (updates.latitude !== undefined && updates.longitude !== undefined) {
    graphicProps.geometry = new Point({
      longitude: updates.longitude,
      latitude: updates.latitude,
      spatialReference: { wkid: 4326 },
    });
  }

  const result = await layer.applyEdits({
    updateFeatures: [new Graphic(graphicProps)],
  });

  const updateResult = result.updateFeatureResults?.[0];
  if (!updateResult || updateResult.error) {
    throw new Error(updateResult?.error?.message || 'Failed to update tree record');
  }
}

async function addAttachment(objectId: number, imageBase64: string): Promise<void> {
  try {
    // Convert base64 to blob
    const base64Data = imageBase64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    // Create a File object from the blob
    const file = new File([blob], `tree_photo_${objectId}.jpg`, { type: 'image/jpeg' });

    // Create FormData for the attachment
    const formData = new FormData();
    formData.append('attachment', file);
    formData.append('f', 'json');

    const attachmentUrl = `${FEATURE_SERVICE_URL}/${objectId}/addAttachment`;
    
    // Use esriRequest which handles authentication automatically
    const response = await esriRequest(attachmentUrl, {
      method: 'post',
      body: formData,
    });

    if (response.data?.error) {
      console.error('Failed to add attachment:', response.data.error);
    } else {
      console.log('Attachment added successfully:', response.data);
    }
  } catch (error) {
    console.error('Failed to add attachment:', error);
    // Don't throw - the feature was added successfully, attachment is optional
  }
}

export async function getTreeCount(): Promise<number> {
  try {
    // Use native fetch to bypass auth requirement
    const queryUrl = `${FEATURE_SERVICE_URL}/query`;
    const params = new URLSearchParams({
      where: '1=1',
      returnCountOnly: 'true',
      f: 'json',
    });
    
    const response = await fetch(`${queryUrl}?${params.toString()}`);
    const data = await response.json();
    
    if (data.error) {
      console.warn('Feature service requires authentication for count');
      return 0;
    }
    
    return data.count || 0;
  } catch (error) {
    console.error('Failed to fetch tree count:', error);
    return 0;
  }
}

export async function getTreeRecords(): Promise<TreeFeature[]> {
  try {
    // Use native fetch to bypass ArcGIS auth requirement for public queries
    const queryUrl = `${FEATURE_SERVICE_URL}/query`;
    const params = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      geometryType: 'esriGeometryPoint',
      outSR: '4326',
      f: 'json',
    });
    
    const response = await fetch(`${queryUrl}?${params.toString()}`);
    const data = await response.json();
    
    // Check if token is required - if so, the service isn't public
    if (data.error) {
      console.warn('Feature service requires authentication:', data.error.message);
      return [];
    }

    const features = data.features || [];
    console.log('Raw feature service response:', features);
    
    const mappedTrees = features.map((feature: any) => {
      const geometry = feature.geometry;
      const attrs = feature.attributes;
      
      // Handle missing geometry - some features may have been added without proper geometry
      let latitude = 0;
      let longitude = 0;
      
      if (geometry) {
        latitude = geometry.y;
        longitude = geometry.x;
      } else {
        console.warn(`Feature ${attrs.OBJECTID} has no geometry - it won't appear on the map`, attrs);
      }
      
      return {
        objectId: attrs.OBJECTID || attrs.objectid || attrs.FID,
        latitude,
        longitude,
        treeType: attrs.tree_type || '',
        reason: attrs.planting_reason || '',
        notes: attrs.notes || '',
        submittedBy: attrs.submitted_by || '',
        submittedDate: new Date(attrs.submitted_date || Date.now()),
        // Health tracking fields
        status: attrs.status || 'planted',
        healthScore: attrs.health_score || null,
        lastCheckDate: attrs.last_check_date ? new Date(attrs.last_check_date) : null,
        lastCheckedBy: attrs.last_checked_by || null,
        treeHeight: attrs.tree_height || null,
        canopyWidth: attrs.canopy_width || null,
        healthNotes: attrs.health_notes || null,
      };
    });
    
    // Return all trees for the list, but they'll only show on map if they have coordinates
    return mappedTrees;
  } catch (error) {
    console.error('Error fetching tree records:', error);
    return [];
  }
}
