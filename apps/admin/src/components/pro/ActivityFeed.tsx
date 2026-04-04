"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Ticket, CircleDollarSign, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@vybx/ui";

export type ActivityItem = {
  id: string;
  type: "sale" | "refund" | "payout";
  title: string;
  subtitle: string;
  at: string;
};

export function ActivityFeed({
  initialItems,
  pollMs = 15000,
  source,
}: {
  initialItems: ActivityItem[];
  pollMs?: number;
  source?: () => Promise<ActivityItem[]>;
}) {
  const [items, setItems] = useState<ActivityItem[]>(initialItems);

  useEffect(() => {
    if (!source) return;
    let active = true;

    const tick = async () => {
      try {
        const next = await source();
        if (active && next?.length) {
          setItems(next);
        }
      } catch {
        // Keep last snapshot if polling fails.
      }
    };

    const id = setInterval(() => {
      void tick();
    }, pollMs);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs, source]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8),
    [items]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="size-4 text-primary" /> Activity Feed
        </CardTitle>
        <span className="text-xs text-emerald-400">Live (polling)</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence initial={false}>
          {sorted.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="mt-0.5 text-primary">
                {item.type === "sale" && <Ticket className="size-4" />}
                {item.type === "refund" && <RotateCcw className="size-4" />}
                {item.type === "payout" && <CircleDollarSign className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(item.at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
