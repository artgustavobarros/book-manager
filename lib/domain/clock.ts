/** Hora "de parede" num fuso: servidor e cliente calculam o mesmo dia/hora do usuário. */

export const DEFAULT_TZ = "America/Sao_Paulo";

export interface WallClock {
  year: number;
  /** 0–11, como Date#getMonth. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function wallClock(now: Date, tz: string): WallClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Fração do ano decorrida no fuso indicado (0–1). */
export function yearFraction(now: Date, tz: string): number {
  const w = wallClock(now, tz);
  const t = Date.UTC(w.year, w.month, w.day, w.hour, w.minute, w.second);
  const start = Date.UTC(w.year, 0, 1);
  return (t - start) / (Date.UTC(w.year + 1, 0, 1) - start);
}

export function currentYear(now: Date, tz: string): number {
  return wallClock(now, tz).year;
}
