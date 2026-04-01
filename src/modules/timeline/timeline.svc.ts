import { devRevClient } from '../../clients/devrev.client.js';
import { StageUpdateDto, DevRevTimelineEntry } from '../../types/index.js';
import { logger } from '../../utils/logger.js'; 
import { UpstreamApiError } from '../../utils/errors.js';

const BOT_BYPASS_THRESHOLD_MS = 60000;

export interface ProcessedTimelineResponse {
  firstResponseAt: string | null;
  customerReplyTimestamps: string[];
  agentReplyTimestamps: string[];
  data: StageUpdateDto[];
  nextCursor: string | null;
  next_cursor?: string | null;
}

interface DevRevCommentPayload {
  visibility?: 'external' | 'internal' | string;
  created_by?: { type: string };
  snap_widget_body?: Array<{
    type: string;
    from?: Array<{ user?: { type: string } }>;
  }>;
}

export class TimelineService {
  public async getProcessedTimeline(
    ticketId: string,
    ticketCreatedAt: Date,
    cursor?: string
  ): Promise<ProcessedTimelineResponse> {
    
    let rawData;
    try {
      rawData = await devRevClient.getTimelineEntries(ticketId, cursor); 
    } catch (error) {
      logger.error({ ticketId, cursor, error }, 'Failed to fetch timeline from DevRev API');
      throw new UpstreamApiError('DevRev API unreachable or failed', 502, 'UPSTREAM_API_FAILURE');
    }

    const stageUpdates: StageUpdateDto[] = [];
    const entries: DevRevTimelineEntry[] = rawData?.timeline_entries || [];

    let firstResponseAt: string | null = null;
    let firstResponseTimestamp: number = Infinity;
    const customerReplyTimestamps: string[] = [];
    const agentReplyTimestamps: string[] = [];
    const creationTimeMs = ticketCreatedAt.getTime();

    // 🛡️ Helper to violently extract the stage name
    const extractStageName = (payload: any): string => {
      if (!payload) return 'Unknown';
      
      // Postman Payload Path 1: Initial Creation (event.created.object.stage.name)
      if (typeof payload === 'string') return payload; 
      
      // Postman Payload Path 2: Updates (fields.name.value)
      if (payload.fields?.name?.value) return payload.fields.name.value;
      
      // Fallbacks
      if (payload.display_name) return payload.display_name;
      if (payload.stage?.name) return payload.stage.name;
      if (payload.name) return payload.name;
      
      return 'Unknown';
    };

    for (const entry of entries) {
      const entryTimestamp = new Date(entry.created_date).getTime();

   // --- 1. PROCESS STAGE TRANSITIONS ---
      if (entry.type === 'timeline_change_event') {
        const event = entry.event as any; 

        // 🛡️ Helper: strictly prioritizes the original path that built your table
        const extractStageName = (payload: any): string => {
          if (!payload) return 'Unknown';
          if (typeof payload === 'string') return payload; 
          if (payload.fields?.name?.value) return payload.fields.name.value;
          if (payload.display_name) return payload.display_name;
          if (payload.stage?.name) return payload.stage.name;
          if (payload.name) return payload.name;
          return 'Unknown';
        };

        // ❌ DELETED: The 'created' event block has been entirely removed.
        // We only care about actual transitions so the frontend can infer the origin.

        // Catch actual stage updates
        if (event?.type === 'updated') {
          const updatedDeltas = event.updated?.field_deltas || [];
          const stageDelta = updatedDeltas.find((d: any) => d.name === 'stage' || d.name === 'status');
          
          if (stageDelta) {
            stageUpdates.push({
              timestamp: entry.created_date,
              from: extractStageName(stageDelta.old_value),
              to: extractStageName(stageDelta.new_value),
            });
          }
        }
        continue;
      }

      // --- 2. PROCESS EXTERNAL COMMENTS ---
      if (entry.type === 'timeline_comment') {
        const commentEntry = entry as DevRevTimelineEntry & DevRevCommentPayload;

        if (commentEntry.visibility === 'external') {
          const isDirectAgentReply = commentEntry.created_by?.type === 'dev_user';
          const isDirectCustomerReply = commentEntry.created_by?.type === 'rev_user';

          const isEmailAgentReply = !!commentEntry.snap_widget_body?.some(
            (widget: any) => widget.type === 'email_preview' && widget.from?.some((f: any) => f.user?.type === 'dev_user')
          );

          const isEmailCustomerReply = !!commentEntry.snap_widget_body?.some(
            (widget: any) => widget.type === 'email_preview' && widget.from?.some((f: any) => f.user?.type === 'rev_user')
          );

          const isAutoForward = (entryTimestamp - creationTimeMs) < BOT_BYPASS_THRESHOLD_MS;

          if (!isAutoForward) {
            if (isDirectAgentReply || isEmailAgentReply) {
              agentReplyTimestamps.push(commentEntry.created_date);
              
              if (entryTimestamp < firstResponseTimestamp) {
                firstResponseTimestamp = entryTimestamp;
                firstResponseAt = commentEntry.created_date;
              }
            } else if (isDirectCustomerReply || isEmailCustomerReply) {
              customerReplyTimestamps.push(commentEntry.created_date);
            }
          }
        }
      }
    }

    // --- 3. HARD LIMIT PAGINATION CIRCUIT BREAKER ---
    let finalNextCursor = rawData.next_cursor || null;
    
    // If DevRev sends an empty page (entries.length === 0), it is lying about next_cursor.
    // We MUST force it to null here to stop the frontend loop.
    if (finalNextCursor === cursor || entries.length === 0) {
      finalNextCursor = null;
    }

    return {
      firstResponseAt,
      customerReplyTimestamps,
      agentReplyTimestamps,
      data: stageUpdates,
      nextCursor: finalNextCursor, 
      next_cursor: finalNextCursor, 
    };
  }
}

export const timelineService = new TimelineService();