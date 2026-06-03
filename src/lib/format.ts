export function localDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (value.includes("T")) {
    const parsed = new Date(value);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const local = typeof date === "string" ? localDate(date) : localDate(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(date: Date | string | null | undefined, mode: "full" | "md" = "full"): string {
  if (!date) return "-";
  const iso = toISODate(date);
  const [, month, day] = iso.split("-");
  if (mode === "md") return `${month}/${day}`;
  return iso.replaceAll("-", "/");
}

export function encodeIds(ids: string[]): string {
  return JSON.stringify(ids);
}

export function decodeIds(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function dateTimeAt(date: Date | string, hour = 9, minute = 30): Date {
  const local = typeof date === "string" ? localDate(date) : localDate(date);
  local.setHours(hour, minute, 0, 0);
  return local;
}
