import { devRevClient } from '../../clients/devrev.client';
import { TicketMetadataDto } from '../../schema/index';

export class TicketService {
  public async getMetadata(ticketId: string): Promise<TicketMetadataDto> {
    const rawData = await devRevClient.getTicketMetadata(ticketId);
    const work = rawData.work;

    if (!work) {
      throw new Error('Ticket not found');
    }

    // Safely extract SLA Name
    const slaSummary = work.sla_summary?.sla_tracker;
    const slaRegion = slaSummary?.sla?.name || 'Global (Default)';

    // Safely extract Timezone by finding the first org_schedule
    let timezone = 'UTC';
    const targets = slaSummary?.metric_target_summaries || [];
    for (const target of targets) {
      if (target.org_schedule?.timezone) {
        timezone = target.org_schedule.timezone;
        break; // Found the timezone
      }
    }

    return {
      ticketId: work.display_id,
      title: work.title || 'Unknown Title',
      slaRegion,
      timezone,
    };
  }
}

export const ticketService = new TicketService();