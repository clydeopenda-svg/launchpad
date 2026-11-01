// Shared TypeScript types used by the database layer, API routes and UI.

export type TicketType = "General" | "VIP" | "Speaker" | "Press" | "Sponsor";

export interface Guest {
  id: number;
  fullName: string;
  email: string;
  organization: string;
  ticketType: TicketType;
  checkinCode: string;
  /** ISO timestamp, or null if the guest has not arrived yet. */
  checkedInAt: string | null;
}

export type PollStatus = "open" | "closed";

export interface PollOption {
  id: number;
  label: string;
  votes: number;
}

export interface Poll {
  id: number;
  question: string;
  status: PollStatus;
  showResults: boolean;
  options: PollOption[];
  totalVotes: number;
}

export interface AttendanceStats {
  totalGuests: number;
  checkedIn: number;
  notCheckedIn: number;
  /** 0–100, rounded to one decimal place. */
  attendancePercent: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EventSession {
  time: string;
  title: string;
  speaker?: string;
  location: string;
}

export interface EventInfo {
  name: string;
  tagline: string;
  date: string;
  venue: string;
  address: string;
  checkinOpens: string;
  wifi: { network: string; password: string };
  agenda: EventSession[];
  faqs: { question: string; answer: string }[];
}
