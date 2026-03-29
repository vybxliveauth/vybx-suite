"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@vybx/ui";

type BulkAction = {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive" | "ghost" | "secondary";
};

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,920px)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#071024]/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm">
              <span className="font-semibold text-primary">{selectedCount}</span> elementos seleccionados
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.variant ?? "outline"}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={onClear}>
                Limpiar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
