"use client";

import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@vybx/ui";

export type AuditItem = {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  severity: "info" | "warning" | "success";
};

const COLOR_BY_SEVERITY = {
  info: "bg-sky-500/10 text-sky-300 border-sky-400/30",
  warning: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
} as const;

export function AuditTimeline({ title = "Audit Logs", items }: { title?: string; items: AuditItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
        ) : (
          items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: idx * 0.03 }}
              className="relative flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="mt-0.5">
                {item.severity === "warning" ? (
                  <AlertTriangle className="size-4 text-amber-400" />
                ) : item.severity === "success" ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <ShieldCheck className="size-4 text-sky-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.action}</p>
                  <Badge variant="outline" className={COLOR_BY_SEVERITY[item.severity]}>
                    {item.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-foreground/90">{item.actor}</span> · {item.target}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(item.at).toLocaleString("es-DO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
