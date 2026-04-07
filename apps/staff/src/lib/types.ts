import type { AuthUserCore, UserRole as SharedUserRole } from "@vybx/types";

export type UserRole = SharedUserRole;

export interface AuthUser extends AuthUserCore {}

// ── Staff event (from GET /event-staff/my-events) ─────────────────────────────

export interface StaffEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  isActive: boolean;
  assignmentRole: "OWNER" | "ADMIN" | "SCANNER" | "SUPERVISOR";
  metrics: {
    totalCapacity: number;
    totalSold: number;
  };
  permissions: {
    canScan: boolean;
    canManageStaff: boolean;
  };
}

// ── Scanner ───────────────────────────────────────────────────────────────────

export interface TicketSecret {
  ticketId: string;
  secret: string;
  tierName: string | null;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  ticket?: {
    id: string;
    type: string | null;
    event: string | null;
    attendeeEmail: string | null;
  };
  source: "online" | "offline";
  scannedAt: string;
}
