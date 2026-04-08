import type { EventStatus } from "./types";

export type EventStatusBadge = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
};

type EventLike = {
  status: EventStatus;
  isActive: boolean;
};

export function getEventStatusBadge(
  event: EventLike,
  options?: { pendingLabel?: string },
): EventStatusBadge {
  if (!event.isActive && event.status === "APPROVED") {
    return { label: "Inactivo", variant: "secondary" };
  }

  const pendingLabel = options?.pendingLabel ?? "Pendiente";
  const map: Record<EventStatus, EventStatusBadge> = {
    APPROVED: { label: "Publicado", variant: "default" },
    PENDING: { label: pendingLabel, variant: "outline" },
    REJECTED: { label: "Rechazado", variant: "destructive" },
  };

  return map[event.status];
}

export function getPublicationFeedback(event: EventLike): {
  title: string;
  detail: string;
  tone: "ok" | "warn" | "danger";
} {
  if (event.status === "APPROVED" && event.isActive) {
    return {
      title: "Publicado y visible",
      detail: "Tu evento ya está vendiendo en la plataforma.",
      tone: "ok",
    };
  }

  if (event.status === "APPROVED" && !event.isActive) {
    return {
      title: "Aprobado pero inactivo",
      detail: "Actívalo para retomar ventas y validación.",
      tone: "warn",
    };
  }

  if (event.status === "PENDING") {
    return {
      title: "En revisión",
      detail: "Estamos revisando el evento antes de publicarlo.",
      tone: "warn",
    };
  }

  return {
    title: "Requiere ajustes",
    detail: "Corrige detalles y vuelve a enviarlo para aprobación.",
    tone: "danger",
  };
}
