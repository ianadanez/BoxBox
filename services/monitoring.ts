import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { auth, firestore } from "../firebaseConfig";

type ErrorContext = Record<string, unknown>;

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 3000;
const MAX_URL_LENGTH = 700;
const MAX_USER_AGENT_LENGTH = 300;
const RECENT_ERROR_WINDOW_MS = 4000;

const recentErrorKeys = new Map<string, number>();
let globalListenersInitialized = false;

const trimText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") return null;
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

const sanitizeContext = (context?: ErrorContext): ErrorContext | undefined => {
  if (!context) return undefined;
  const output: ErrorContext = {};
  Object.entries(context).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      output[key] = null;
      return;
    }
    if (typeof value === "string") {
      output[key] = trimText(value, 250) ?? "";
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      output[key] = value;
      return;
    }
    try {
      output[key] = trimText(JSON.stringify(value), 250) ?? "[unserializable]";
    } catch {
      output[key] = "[unserializable]";
    }
  });
  return Object.keys(output).length ? output : undefined;
};

const getErrorPayload = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: trimText(error.name, 120) ?? "Error",
      message: trimText(error.message, MAX_MESSAGE_LENGTH) ?? "Unknown error",
      stack: trimText(error.stack, MAX_STACK_LENGTH),
    };
  }
  if (typeof error === "string") {
    return {
      name: "Error",
      message: trimText(error, MAX_MESSAGE_LENGTH) ?? "Unknown error",
      stack: null as string | null,
    };
  }
  return {
    name: "Error",
    message: trimText(JSON.stringify(error), MAX_MESSAGE_LENGTH) ?? "Unknown error",
    stack: null as string | null,
  };
};

const shouldSkipRepeatedError = (source: string, message: string): boolean => {
  const now = Date.now();
  const key = `${source}:${message}`;
  const prev = recentErrorKeys.get(key);
  recentErrorKeys.set(key, now);
  if (prev && now - prev < RECENT_ERROR_WINDOW_MS) {
    return true;
  }
  return false;
};

export const reportClientError = async (
  source: string,
  error: unknown,
  context?: ErrorContext
): Promise<void> => {
  const payload = getErrorPayload(error);
  if (shouldSkipRepeatedError(source, payload.message)) {
    return;
  }

  console.error(`[monitor:${source}]`, error, context);

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const record = {
    source,
    name: payload.name,
    message: payload.message,
    stack: payload.stack ?? "",
    context: sanitizeContext(context) ?? {},
    platform: "web",
    route: trimText(window.location.pathname, 150) ?? "",
    url: trimText(window.location.href, MAX_URL_LENGTH) ?? "",
    userAgent: trimText(window.navigator.userAgent, MAX_USER_AGENT_LENGTH) ?? "",
    at: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await firestore.collection("users").doc(uid).set(
      {
        monitoring: {
          errorCount: firebase.firestore.FieldValue.increment(1),
          lastErrorAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastClientError: record,
        },
      },
      { merge: true }
    );
  } catch (persistError) {
    console.warn("[monitor] failed to persist client error", persistError);
  }
};

export const initGlobalErrorMonitoring = (): void => {
  if (globalListenersInitialized) return;
  globalListenersInitialized = true;

  window.addEventListener("error", (event) => {
    const message = typeof event.message === "string" ? event.message : "";
    if (message.includes("ResizeObserver loop limit exceeded")) return;

    void reportClientError("window.error", event.error ?? message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    void reportClientError("window.unhandledrejection", event.reason);
  });
};
