import { useCallback } from "react";
import toastPrimitive from "react-hot-toast";

type ToastPayload = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = useCallback((payload: ToastPayload) => {
    const message = payload.description
      ? `${payload.title}\n${payload.description}`
      : payload.title;

    if (payload.variant === "destructive") {
      toastPrimitive.error(message);
    } else {
      toastPrimitive.success(message);
    }
  }, []);

  return {
    toast,
    dismiss: toastPrimitive.dismiss,
  };
}

export type UseToastReturn = ReturnType<typeof useToast>;
