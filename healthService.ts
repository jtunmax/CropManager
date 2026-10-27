import esriRequest from '@arcgis/core/request';

const FEATURE_SERVICE_URL = 'https://services.arcgis.com/lkHhAsiwtcKnwSeA/arcgis/rest/services/treetrackerapp/FeatureServer/0';

export type TreeStatus = 'planted' | 'alive' | 'needs_care' | 'dead';

export interface HealthCheckData {
  objectId: number;
  status: TreeStatus;
  healthScore: number;
  notes: string;
  height?: string;
  canopyWidth?: string;
  checkedBy: string;
  imageBase64?: string;
}

export interface HealthAnalysis {
  healthScore: number;
  status: TreeStatus;
  condition: string;
  observations: string[];
  recommendations: string[];
  estimatedHeight?: string;
  estimatedCanopyWidth?: string;
}

/**
 * Analyze tree health using AI from a photo
 */
export async function analyzeTreeHealth(
  imageBase64: string,
  treeType?: string,
  previousStatus?: string
): Promise<HealthAnalysis> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-tree-health`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        imageBase64,
        treeType,
        previousStatus,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze tree health');
  }

  return response.json();
}

/**
 * Update tree health status in ArcGIS feature service
 * Note: This requires the feature service to have these fields:
 * - status (string)
 * - health_score (integer)
 * - last_check_date (date)
 * - last_checked_by (string)
 * - tree_height (string)
 * - canopy_width (string)
 */
// Helper to truncate strings to avoid ArcGIS field length limits
function truncate(value: string | undefined | null, maxLength: number): string | null {
  if (!value) return null;
  return value.length > maxLength ? value.substring(0, maxLength - 3) + '...' : value;
}

export async function updateTreeHealth(data: HealthCheckData): Promise<boolean> {
  try {
    const updateUrl = `${FEATURE_SERVICE_URL}/updateFeatures`;
    
    // Truncate string fields to fit ArcGIS field limits
    // Adjust these lengths to match your ArcGIS feature layer field definitions
    const features = [{
      attributes: {
        OBJECTID: data.objectId,
        status: truncate(data.status, 50),
        health_score: data.healthScore,
        last_check_date: Date.now(),
        last_checked_by: truncate(data.checkedBy, 100),
        tree_height: truncate(data.height, 50),
        canopy_width: truncate(data.canopyWidth, 50),
        health_notes: truncate(data.notes, 255), // Increase in ArcGIS if you need longer notes
      },
    }];

    const formData = new FormData();
    formData.append('features', JSON.stringify(features));
    formData.append('f', 'json');

    const response = await esriRequest(updateUrl, {
      method: 'post',
      body: formData,
    });

    const updateResult = response.data?.updateResults?.[0];

    if (updateResult?.success) {
      console.log('Tree health updated successfully');
      
      // Add photo as attachment if provided
      if (data.imageBase64) {
        await addHealthCheckPhoto(data.objectId, data.imageBase64);
      }
      
      return true;
    }

    // ArcGIS returns useful error details on a per-feature basis
    const arcgisError = updateResult?.error;
    const message = arcgisError?.description || arcgisError?.message || 'Unknown ArcGIS update error';
    console.error('Failed to update tree health:', response.data);
    throw new Error(message);
  } catch (error) {
    console.error('Error updating tree health:', error);
    // Re-throw so UI can display a helpful error
    throw error instanceof Error ? error : new Error('Failed to update tree health');
  }
}

/**
 * Add a health check photo as an attachment
 */
async function addHealthCheckPhoto(objectId: number, imageBase64: string): Promise<void> {
  try {
    const base64Data = imageBase64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    const file = new File([blob], `health_check_${objectId}_${Date.now()}.jpg`, { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('attachment', file);
    formData.append('f', 'json');

    const attachmentUrl = `${FEATURE_SERVICE_URL}/${objectId}/addAttachment`;
    
    await esriRequest(attachmentUrl, {
      method: 'post',
      body: formData,
    });

    console.log('Health check photo added successfully');
  } catch (error) {
    console.error('Failed to add health check photo:', error);
  }
}

/**
 * Get status color for map symbology
 */
export function getStatusColor(status: TreeStatus): [number, number, number, number] {
  switch (status) {
    case 'alive':
      return [34, 139, 34, 0.9]; // Forest green
    case 'planted':
      return [100, 149, 237, 0.9]; // Cornflower blue
    case 'needs_care':
      return [255, 193, 7, 0.9]; // Amber/Yellow
    case 'dead':
      return [220, 53, 69, 0.9]; // Red
    default:
      return [34, 139, 34, 0.8]; // Default green
  }
}

/**
 * Get status color as hex string for SVG symbols
 */
export function getStatusHex(status: TreeStatus): string {
  switch (status) {
    case 'alive':
      return '#228B22'; // Forest green
    case 'planted':
      return '#6495ED'; // Cornflower blue
    case 'needs_care':
      return '#FFC107'; // Amber/Yellow
    case 'dead':
      return '#DC3545'; // Red
    default:
      return '#228B22'; // Default green
  }
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: TreeStatus): string {
  const labels: Record<TreeStatus, string> = {
    planted: 'Newly Planted',
    alive: 'Healthy',
    needs_care: 'Needs Care',
    dead: 'Dead/Replaced',
  };
  return labels[status] || 'Unknown';
}

/**
 * Get status icon emoji
 */
export function getStatusEmoji(status: TreeStatus): string {
  const emojis: Record<TreeStatus, string> = {
    planted: '🌱',
    alive: '🌳',
    needs_care: '⚠️',
    dead: '💀',
  };
  return emojis[status] || '🌳';
}
