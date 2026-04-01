import type { ActivityItem } from "@/components/pro/ActivityFeed";
import type { AuditItem } from "@/components/pro/AuditTimeline";

export type KycStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PromoterKyc = {
  id: string;
  name: string;
  email: string;
  company: string;
  documentsOk: boolean;
  bankVerified: boolean;
  status: KycStatus;
  submittedAt: string;
  activeEvents: number;
};

export type PayoutStatus = "PENDING" | "IN_REVIEW" | "PAID";

export type PayoutItem = {
  id: string;
  promoter: string;
  gateway: "STRIPE_CONNECT" | "PAYPAL";
  grossSales: number;
  vybeCommission: number;
  itbis: number;
  netPayout: number;
  status: PayoutStatus;
  updatedAt: string;
};

export function computeNetPayout(grossSales: number, vybeCommission: number, itbis: number) {
  return grossSales - vybeCommission - itbis;
}

const now = Date.now();

export const seedPromoters: PromoterKyc[] = [
  {
    id: "prm-001",
    name: "Luna Events",
    email: "ops@lunaevents.do",
    company: "Luna Entertainment SRL",
    documentsOk: true,
    bankVerified: true,
    status: "APPROVED",
    submittedAt: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
    activeEvents: 5,
  },
  {
    id: "prm-002",
    name: "Caribe House",
    email: "team@caribehouse.do",
    company: "Caribe House Group",
    documentsOk: true,
    bankVerified: false,
    status: "PENDING",
    submittedAt: new Date(now - 1000 * 60 * 60 * 21).toISOString(),
    activeEvents: 0,
  },
  {
    id: "prm-003",
    name: "Noche Alta",
    email: "admin@nochealta.do",
    company: "Noche Alta Production",
    documentsOk: false,
    bankVerified: false,
    status: "REJECTED",
    submittedAt: new Date(now - 1000 * 60 * 60 * 98).toISOString(),
    activeEvents: 0,
  },
  {
    id: "prm-004",
    name: "Arena Fest",
    email: "contact@arenafest.do",
    company: "Arena Fest US",
    documentsOk: true,
    bankVerified: true,
    status: "PENDING",
    submittedAt: new Date(now - 1000 * 60 * 60 * 9).toISOString(),
    activeEvents: 2,
  },
];

export const seedPayouts: PayoutItem[] = [
  {
    id: "pyt-001",
    promoter: "Luna Events",
    gateway: "STRIPE_CONNECT",
    grossSales: 560000,
    vybeCommission: 56000,
    itbis: 90720,
    netPayout: computeNetPayout(560000, 56000, 90720),
    status: "PENDING",
    updatedAt: new Date(now - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "pyt-002",
    promoter: "Caribe House",
    gateway: "PAYPAL",
    grossSales: 320000,
    vybeCommission: 38400,
    itbis: 51840,
    netPayout: computeNetPayout(320000, 38400, 51840),
    status: "IN_REVIEW",
    updatedAt: new Date(now - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "pyt-003",
    promoter: "Arena Fest",
    gateway: "STRIPE_CONNECT",
    grossSales: 790000,
    vybeCommission: 94800,
    itbis: 128160,
    netPayout: computeNetPayout(790000, 94800, 128160),
    status: "PAID",
    updatedAt: new Date(now - 1000 * 60 * 120).toISOString(),
  },
];

export const seedAuditItems: AuditItem[] = [
  {
    id: "log-001",
    actor: "admin@vybxlive.com",
    action: "Aprobo promotor",
    target: "Caribe House Group",
    at: new Date(now - 1000 * 60 * 18).toISOString(),
    severity: "success",
  },
  {
    id: "log-002",
    actor: "ops@vybxlive.com",
    action: "Pauso evento",
    target: "Urban Sunset Vol. 2",
    at: new Date(now - 1000 * 60 * 43).toISOString(),
    severity: "warning",
  },
  {
    id: "log-003",
    actor: "risk@vybxlive.com",
    action: "Aprobo reembolso",
    target: "Orden #VT-9382",
    at: new Date(now - 1000 * 60 * 64).toISOString(),
    severity: "info",
  },
  {
    id: "log-004",
    actor: "admin@vybxlive.com",
    action: "Marco payout como pagado",
    target: "pyt-003",
    at: new Date(now - 1000 * 60 * 96).toISOString(),
    severity: "success",
  },
];

export const seedActivity: ActivityItem[] = [
  {
    id: "act-001",
    type: "sale",
    title: "Nueva venta en Festival del Malecon",
    subtitle: "2 tickets VIP · US$140",
    at: new Date(now - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "act-002",
    type: "refund",
    title: "Solicitud de reembolso",
    subtitle: "Orden VT-9382 · Pendiente",
    at: new Date(now - 1000 * 60 * 7).toISOString(),
  },
  {
    id: "act-003",
    type: "payout",
    title: "Liquidacion enviada a Stripe",
    subtitle: "Luna Events · US$6,888 neto",
    at: new Date(now - 1000 * 60 * 16).toISOString(),
  },
];
