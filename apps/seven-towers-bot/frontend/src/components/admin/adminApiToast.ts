import { ApiError } from "@/lib/api";
import { messageForErrorCode } from "@/lib/errors-ui";

type ToastFn = (message: string, tone?: "default" | "success" | "danger") => void;

export function toastAdminApiError(
  toast: ToastFn,
  err: unknown,
  fallback = "Something went wrong.",
): void {
  if (err instanceof ApiError) {
    const msg =
      err.code === "FORBIDDEN"
        ? err.message
        : messageForErrorCode(err.code, err.message);
    toast(msg, "danger");
    return;
  }
  toast(fallback, "danger");
}
