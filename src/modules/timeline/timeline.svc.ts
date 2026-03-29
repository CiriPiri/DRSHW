// src/modules/timeline/timeline.svc.ts
import { devRevClient } from '../../clients/devrev.client.js';
import { StageUpdateDto } from '../../types/index.js';

export class TimelineService {
  /**
   * Orchestrates data fetching and parsing for RWT formatting
   */
  public async getProcessedTimeline(ticketId: string, cursor?: string) {
    const rawData = await devRevClient.getTimelineEntries(ticketId, cursor);
    
    const stageUpdates: StageUpdateDto[] = [];
    const entries = rawData.timeline_entries || [];

    // Initialize our golden timestamp variable
    let ticketCreatedAt: string | null = null;

    for (const entry of entries) {
      
      // ✅ NEW LOGIC: Hunt for the exact moment the ticket was born
      if (entry.type === 'timeline_change_event' && entry.event?.type === 'created') {
        ticketCreatedAt = entry.created_date;
      }

      // Existing logic: Extract stage changes
      if (entry.type === 'timeline_change_event' && entry.event?.type === 'updated') {
        const stageDelta = (entry.event.updated?.field_deltas || []).find((d: any) => d.name === 'stage');
        
        if (stageDelta) {
          stageUpdates.push({
            timestamp: entry.created_date,
            from: stageDelta.old_value?.fields?.name?.value || 'unknown',
            to: stageDelta.new_value?.fields?.name?.value || 'unknown',
          });
        }
      }
    }

    // Return the payload with the extracted creation date at the top level
    return {
      ticketCreatedAt, 
      data: stageUpdates,
      next_cursor: rawData.next_cursor || null,
    };
  }
}

export const timelineService = new TimelineService();