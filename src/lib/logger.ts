import { LOG_LEVEL } from "./config";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

const parseLogLevel = (value: string | undefined): LogLevel => {
  const normalized = value?.toUpperCase();
  if (normalized === "INFO" || normalized === "WARN" || normalized === "ERROR") {
    return normalized;
  }
  return "DEBUG";
};

const activeLevel = parseLogLevel(LOG_LEVEL);

const normalizeMeta = (meta: unknown) => {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }

  if (meta && typeof meta === "object" && "error" in meta) {
    const error = (meta as { error: unknown }).error;
    if (error instanceof Error) {
      return {
        ...meta,
        error: { name: error.name, message: error.message, stack: error.stack },
      };
    }
  }

  return meta;
};

const write = (level: LogLevel, message: string, meta?: unknown) => {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel]) {
    return;
  }

  const payload = meta === undefined ? undefined : normalizeMeta(meta);
  const prefix = `[${level}] ${message}`;

  if (level === "ERROR") {
    console.error(prefix, payload ?? "");
    return;
  }
  if (level === "WARN") {
    console.warn(prefix, payload ?? "");
    return;
  }
  if (level === "INFO") {
    console.info(prefix, payload ?? "");
    return;
  }
  console.debug(prefix, payload ?? "");
};

export const logger = {
  debug: (message: string, meta?: unknown) => write("DEBUG", message, meta),
  info: (message: string, meta?: unknown) => write("INFO", message, meta),
  warn: (message: string, meta?: unknown) => write("WARN", message, meta),
  error: (message: string, meta?: unknown) => write("ERROR", message, meta),
};
