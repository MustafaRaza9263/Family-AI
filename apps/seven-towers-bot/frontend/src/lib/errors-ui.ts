export function fieldErrorMessage(
  fields: { path: string; message: string }[] | undefined,
  path: string,
): string | undefined {
  return fields?.find((f) => f.path === path)?.message;
}

/** Map message-only VALIDATION_ERROR onto a field when details are absent. */
export function inferRegisterFields(
  message: string,
): { path: string; message: string }[] | undefined {
  const lower = message.toLowerCase();
  if (lower.includes("password")) return [{ path: "password", message }];
  if (lower.includes("phone")) return [{ path: "phone", message }];
  if (lower.includes("email")) return [{ path: "email", message }];
  if (lower.includes("name")) return [{ path: "fullName", message }];
  return undefined;
}

/** Plain-language copy for known API / stream error codes. */
export function messageForErrorCode(
  code: string,
  fallback?: string,
): string {
  switch (code) {
    case "RATE_LIMITED":
      return "You're sending messages too quickly. Please slow down.";
    case "ALREADY_STREAMING":
      return "A reply is already in progress for this chat.";
    case "BUSY":
      return "The assistant is busy. Retry in a few seconds.";
    case "MESSAGE_TOO_LONG":
      return "That message is too long. Shorten it and try again.";
    case "LLM_UNAVAILABLE":
      return "The assistant is temporarily unavailable. Try again shortly.";
    case "INVALID_CREDENTIALS":
      return "Invalid email or password.";
    case "ACCOUNT_LOCKED":
      return "Account is temporarily locked. Try again later.";
    case "ACCOUNT_DISABLED":
      return "This account has been disabled.";
    case "EMAIL_TAKEN":
      return "That email is already registered.";
    case "NETWORK":
      return "Network error. Check your connection and retry.";
    default:
      return fallback ?? "Something went wrong. Please try again.";
  }
}

/** Copy text without relying on a secure context (plain HTTP LAN). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(area);
  }
  return ok;
}

let tempIdCounter = 0;

/** Temporary client ids — avoids crypto.randomUUID (needs secure context). */
export function tempId(prefix: string): string {
  tempIdCounter += 1;
  return `${prefix}-${Date.now()}-${tempIdCounter}`;
}
