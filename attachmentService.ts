const FEATURE_SERVICE_URL = 'https://services.arcgis.com/lkHhAsiwtcKnwSeA/arcgis/rest/services/treetrackerapp/FeatureServer/0';

export interface AttachmentInfo {
  id: number;
  name: string;
  contentType: string;
  size: number;
  url: string;
}

export async function getAttachments(objectId: number): Promise<AttachmentInfo[]> {
  try {
    const url = `${FEATURE_SERVICE_URL}/${objectId}/attachments?f=json`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error || !data.attachmentInfos) {
      return [];
    }

    return data.attachmentInfos.map((att: any) => ({
      id: att.id,
      name: att.name,
      contentType: att.contentType,
      size: att.size,
      url: `${FEATURE_SERVICE_URL}/${objectId}/attachments/${att.id}`,
    }));
  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return [];
  }
}
