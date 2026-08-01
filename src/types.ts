export type ThemeType = 'astronaut' | 'safari' | 'floral' | 'natural';

export type DiaperSize = 'RN' | 'P' | 'M' | 'G' | 'GG' | 'XG';

export type PaymentOption = 'diaper' | 'pix';

export type TicketStatus = 'available' | 'reserved' | 'paid';

export interface DiaperRange {
  from: number;
  to: number;
  size: DiaperSize;
}

export interface Ticket {
  number: number;
  status: TicketStatus;
  name: string;
  phone: string;
  option: PaymentOption;
  diaperSize?: DiaperSize;
  pixTxid?: string;
  createdAt?: string;
  paidAt?: string;
}

export interface RaffleSettings {
  title: string;
  description: string;
  prize: string;
  prizes?: string[];
  pixKey?: string;
  pixKeyType?: string;
  pixQrCode?: string; // Base64 string of uploaded image
  pixCopyAndPaste?: string; // Custom Copy and Paste Pix code
  whatsappNumber?: string; // WhatsApp number for proof of payment
  paymentDeadline?: string; // Deadline date for payment or diaper delivery (e.g., 25/06/2026)
  theme: ThemeType;
  raffleDate: string; // ISO date-time string or YYYY-MM-DD
  ticketPrice: number;
  allowDiaper: boolean;
  allowPix: boolean;
  diaperSizes: DiaperSize[];
  adminKey: string;
  numberOfTickets: number; // e.g. 100
  diaperRanges?: DiaperRange[];
  howItWorks?: string;
  diaperObservation?: string;
  drawVideoUrl?: string;
}

export interface DatabaseState {
  settings: RaffleSettings;
  tickets: Record<number, Ticket>;
  drawnNumbers: number[];
}
