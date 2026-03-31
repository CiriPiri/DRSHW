import { devRevClient } from '../../clients/devrev.client.js';

export class TicketService {
  public async getMetadata(ticketId: string) {
    const rawData = await devRevClient.getTicketMetadata(ticketId);
    const ticket = rawData.work || rawData.ticket || rawData;
    const customFields = ticket?.custom_fields || {};
    
    // ✅ THE CALCULATION TRIGGER: 
    // We pull the region ONLY to tell our math engine which clock to use.
    const slaRegion = customFields.tnt__region_salesforce || customFields.tnt__region || 'Default';

    return {
      ticketId: ticket.id || ticketId,
      title: ticket.title || 'Untitled Ticket',
      slaRegion, 
    };
  }
}

export const ticketService = new TicketService();