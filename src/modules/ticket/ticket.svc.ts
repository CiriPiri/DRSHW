import { devRevClient } from '../../clients/devrev.client.js';

// 1. Define exactly what this service guarantees to return to your app
export interface TicketMetadata {
  ticketId: string;
  title: string;
  slaRegion: string;
  createdAt?: string; // (Added this since your timeline controller expects it!)
}

// 2. Define a loose but helpful map of the expected vendor payload
interface DevRevCustomFields {
  tnt__region_salesforce?: string;
  tnt__region?: string;
  [key: string]: any; 
}

interface DevRevTicketData {
  id?: string;
  title?: string;
  created_date?: string;
  custom_fields?: DevRevCustomFields;
}

interface DevRevWorksResponse {
  work?: DevRevTicketData;
  ticket?: DevRevTicketData;
  [key: string]: any;
}

export class TicketService {
  /**
   * Fetches core ticket details and maps vendor-specific custom fields
   * into standardized internal routing metrics (like SLA Region).
   */
  public async getMetadata(ticketId: string): Promise<TicketMetadata> {
    
    // Cast the 'any' response from the client into our expected shape
    const rawData = (await devRevClient.getTicketMetadata(ticketId)) as DevRevWorksResponse;
    
    // Safely extract the core object, falling back to an empty object to prevent null pointer crashes
    const ticket = rawData?.work || rawData?.ticket || (rawData as DevRevTicketData) || {};
    const customFields = ticket.custom_fields || {};
    
    // ✅ THE CALCULATION TRIGGER: 
    // We pull the region ONLY to tell our math engine which clock to use.
    const slaRegion = customFields.tnt__region_salesforce || customFields.tnt__region || 'Default';

    return {
      ticketId: ticket.id || ticketId,
      title: ticket.title || 'Untitled Ticket',
      slaRegion,
      createdAt: ticket.created_date, // Exposing this so your Timeline Controller can use it!
    };
  }
}

export const ticketService = new TicketService();