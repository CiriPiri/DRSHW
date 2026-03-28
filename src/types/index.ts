/**
 * Standardized API Response Wrapper
 */
export type ApiResponse<T> = 
  | { success: true; data: T; next_cursor?: string | null }
  | { success: false; error: string; code: string };

/**
 * Stage Update Data Transfer Object
 */
export interface StageUpdateDto {
  timestamp: string;
  from: string;
  to: string;
}

/**
 * Expected shape of the DevRev external API response
 */
export interface DevRevTimelineEntry {
  type: string;
  created_date: string;
  event?: {
    type: string;
    updated?: {
      field_deltas?: Array<{
        name: string;
        old_value?: { fields?: { name?: { value?: string } } };
        new_value?: { fields?: { name?: { value?: string } } };
      }>;
    };
  };
}

export interface DevRevApiResponse {
  timeline_entries?: DevRevTimelineEntry[];
  next_cursor?: string;
}