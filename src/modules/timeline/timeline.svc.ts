import { devRevClient } from '../../clients/devrev.client.js';
import { StageUpdateDto } from '../../types/index.js';

export class TimelineService {
  public async getProcessedTimeline(ticketId: string, cursor?: string): Promise<{
    ticketCreatedAt: string | null;
    firstResponseAt: string | null;
    customerReplyTimestamps: string[]; 
    agentReplyTimestamps: string[]; // ✅ NEW: Track all agent touches
    data: StageUpdateDto[];
    next_cursor: string | null;
  }> {
    const rawData = await devRevClient.getTimelineEntries(ticketId, cursor);
    
    const stageUpdates: StageUpdateDto[] = [];
    const entries = rawData.timeline_entries || [];

    let ticketCreatedAt: string | null = null;
    let firstResponseAt: string | null = null;
    const customerReplyTimestamps: string[] = []; 
    const agentReplyTimestamps: string[] = []; // ✅ NEW

    for (const entry of entries) {
      if (entry.type === 'timeline_change_event' && entry.event?.type === 'created') {
        ticketCreatedAt = entry.created_date;
      }

      const commentEntry = entry as any;

      if (commentEntry.type === 'timeline_comment' && commentEntry.visibility === 'external') {
        
        const isDirectReply = commentEntry.created_by?.type === 'dev_user';
        const isCustomerReply = commentEntry.created_by?.type === 'rev_user'; 

        const isEmailReply = commentEntry.snap_widget_body?.some((widget: any) => 
          widget.type === 'email_preview' && 
          widget.from?.some((f: any) => f.user?.type === 'dev_user')
        );

        const isCustomerEmailReply = commentEntry.snap_widget_body?.some((widget: any) => 
          widget.type === 'email_preview' && 
          widget.from?.some((f: any) => f.user?.type === 'rev_user')
        );

        let isAutoForward = false;
        if (ticketCreatedAt) {
          const timeDiffMs = new Date(commentEntry.created_date).getTime() - new Date(ticketCreatedAt).getTime();
          if (timeDiffMs < 60000) { 
            isAutoForward = true;
          }
        }

        if (!isAutoForward) {
            if (isDirectReply || isEmailReply) {
              agentReplyTimestamps.push(commentEntry.created_date); // ✅ Save every agent reply
              if (!firstResponseAt || new Date(commentEntry.created_date) < new Date(firstResponseAt)) {
                firstResponseAt = commentEntry.created_date;
              }
            } else if (isCustomerReply || isCustomerEmailReply) {
              customerReplyTimestamps.push(commentEntry.created_date);
            }
        }
      }

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

    return {
      ticketCreatedAt, 
      firstResponseAt,
      customerReplyTimestamps, 
      agentReplyTimestamps, // ✅ Export it
      data: stageUpdates,
      next_cursor: rawData.next_cursor || null,
    };
  }
}

export const timelineService = new TimelineService();