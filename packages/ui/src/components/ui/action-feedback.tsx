import { AlertCircle, CheckCircle2 } from "lucide-react";

export type FeedbackStatus = "idle" | "success" | "error" | "validation_error";

type ActionFeedbackProps = {
  status: FeedbackStatus;
  message: string;
};

export function ActionFeedback({ status, message }: ActionFeedbackProps) {
  if (status === "idle" || !message) return null;

  const isPositive = status === "success";
  const background = isPositive ? "rgba(34,197,94,0.1)" : "rgba(244,63,94,0.1)";
  const border = isPositive
    ? "1px solid rgba(34,197,94,0.3)"
    : "1px solid rgba(244,63,94,0.3)";
  const color = isPositive ? "#4ade80" : "#fda4af";

  return (
    <div
      style={{
        padding: "0.65rem 0.9rem",
        borderRadius: "var(--radius-md)",
        background,
        border,
        color,
        fontSize: "0.82rem",
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      {isPositive ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {message}
    </div>
  );
}
