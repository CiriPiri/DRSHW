// src/modules/timeline/timeline.svc.ts
import { devRevClient } from '../../clients/devrev.client';
import { StageUpdateDto } from '../../types';

export class TimelineService {
  /**
   * Orchestrates data fetching and parsing for RWT formatting
   */
  public async getProcessedTimeline(ticketId: string, cursor?: string) {
    // 1. Fetch raw data from the repository layer
    const rawData = await devRevClient.getTimelineEntries(ticketId, cursor);
    
    // 2. Apply business logic: Filter and transform to our strict DTO
    const stageUpdates: StageUpdateDto[] = [];
    const entries = rawData.timeline_entries || [];

    for (const entry of entries) {
      if (entry.type === 'timeline_change_event' && entry.event?.type === 'updated') {
        const stageDelta = (entry.event.updated?.field_deltas || []).find(d => d.name === 'stage');
        
        if (stageDelta) {
          stageUpdates.push({
            timestamp: entry.created_date,
            // Fallbacks prevent undefined crashes if DevRev changes payload structure slightly
            from: stageDelta.old_value?.fields?.name?.value || 'unknown',
            to: stageDelta.new_value?.fields?.name?.value || 'unknown',
          });
        }
      }
    }

    return {
      data: stageUpdates,
      next_cursor: rawData.next_cursor || null,
    };
  }
}

export const timelineService = new TimelineService();