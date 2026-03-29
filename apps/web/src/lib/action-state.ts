export type UiActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const uiActionInitialState: UiActionState = {
  status: "idle",
  message: "",
};

export function actionErrorState(error: unknown, fallback = "Error inesperado"): UiActionState {
  if (error instanceof Error && error.message.trim().length > 0) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: fallback };
}

export function actionSuccessState(message: string): UiActionState {
  return { status: "success", message };
}
