"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@vybx/ui";

type DialogTone = "default" | "destructive";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

type PromptOptions = ConfirmOptions & {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  required?: boolean;
  minLength?: number;
  inputType?: "text" | "number" | "email" | "password";
  validate?: (value: string) => string | null;
};

type ConfirmDialogState = {
  kind: "confirm";
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type PromptDialogState = {
  kind: "prompt";
  options: PromptOptions;
  resolve: (value: string | null) => void;
};

type DialogState = ConfirmDialogState | PromptDialogState;

export function useAdminActionDialog() {
  const [state, setState] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const closeDialog = useCallback(
    (value?: boolean | string | null) => {
      if (!state) return;
      if (state.kind === "confirm") {
        state.resolve(Boolean(value));
      } else {
        state.resolve(typeof value === "string" ? value : null);
      }
      setState(null);
      setError(null);
      setInputValue("");
    },
    [state]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setError(null);
      setInputValue("");
      setState({
        kind: "confirm",
        options,
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setError(null);
      setInputValue(options.defaultValue ?? "");
      setState({
        kind: "prompt",
        options,
        resolve,
      });
    });
  }, []);

  const submitPrompt = useCallback(() => {
    if (!state || state.kind !== "prompt") return;

    const value = inputValue;
    const trimmed = value.trim();
    const {
      required = false,
      minLength,
      validate,
    } = state.options;

    if (required && trimmed.length === 0) {
      setError("Este campo es obligatorio.");
      return;
    }
    if (typeof minLength === "number" && trimmed.length > 0 && trimmed.length < minLength) {
      setError(`Debe tener al menos ${minLength} caracteres.`);
      return;
    }
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    closeDialog(value);
  }, [closeDialog, inputValue, state]);

  const dialog = useMemo(() => {
    if (!state) return null;

    const isDestructive = state.options.tone === "destructive";
    const confirmLabel = state.options.confirmLabel ?? "Confirmar";
    const cancelLabel = state.options.cancelLabel ?? "Cancelar";
    const promptState = state.kind === "prompt" ? state : null;

    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) {
            closeDialog(state.kind === "confirm" ? false : null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{state.options.title}</DialogTitle>
            {state.options.description ? (
              <DialogDescription>{state.options.description}</DialogDescription>
            ) : null}
          </DialogHeader>

          {promptState ? (
            <div className="space-y-2">
              {promptState.options.label ? (
                <Label htmlFor="admin-action-dialog-input">{promptState.options.label}</Label>
              ) : null}
              {promptState.options.multiline ? (
                <Textarea
                  id="admin-action-dialog-input"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder={promptState.options.placeholder}
                  autoFocus
                />
              ) : (
                <Input
                  id="admin-action-dialog-input"
                  type={promptState.options.inputType ?? "text"}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder={promptState.options.placeholder}
                  autoFocus
                />
              )}
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeDialog(state.kind === "confirm" ? false : null)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={isDestructive ? "destructive" : "default"}
              onClick={() => {
                if (state.kind === "confirm") {
                  closeDialog(true);
                  return;
                }
                submitPrompt();
              }}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }, [closeDialog, error, inputValue, state, submitPrompt]);

  return { confirm, prompt, dialog };
}

