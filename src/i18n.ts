/// <reference types="vite-plus/client" />

import messagesEN from "./i18n/en.json";
import type { Unit } from "./data/units";
import type { AnalyzerIntegratedUnit, AnalyzerUnit } from "./shared/measurement-dates";
const messages = import.meta.glob("./i18n/*.json", {
  import: "default",
  eager: true,
});

export type messagesEN_t = keyof typeof messagesEN;

declare global {
  namespace Intl {
    interface DateTimeFormat {
      // Temporal extends Intl.DateTimeFormat to format Temporal objects (missing in lib.esnext.temporal.d.ts)
      format(date?: Temporal.PlainDate | Date | number): string;
    }
  }
}

class I18n {
  get lang(): string {
    return document.documentElement.lang.slice(0, 2) || "en";
  }

  #timeLocale(): string {
    switch (this.lang) {
      case navigator.language.slice(0, 2):
        return navigator.language;
      case "en":
        return "en-GB";
      case "de":
        return "de-AT";
    }
    return this.lang;
  }

  get messages(): typeof messagesEN | undefined {
    return messages[`./i18n/${this.lang}.json`] as typeof messagesEN;
  }

  message(id: messagesEN_t): string {
    return this.messages?.[id] || messagesEN[id] || id;
  }

  number(
    num: number | null | undefined,
    opts?: Intl.NumberFormatOptions,
    unit: Unit | AnalyzerUnit | AnalyzerIntegratedUnit | "" | undefined = undefined,
  ): string {
    if (typeof num !== "number" || !isFinite(num)) return "–";
    let s = this.#numberFormat(this.lang, {
      useGrouping: "min2",
      minimumFractionDigits: unit === "℃" ? 1 : 0,
      maximumFractionDigits: unit === "℃" ? 1 : 0,
      ...opts,
    }).format(num);
    if (unit) s += ` ${unit}`;
    return s;
  }

  time(date: Temporal.PlainDate | Date | number | string, opts?: Intl.DateTimeFormatOptions) {
    if (typeof date === "string") date = Date.parse(date);
    if (date instanceof Date) date = +date;
    if (typeof date === "number" && !isFinite(+date)) return "";
    return this.#dateTimeFormat(this.#timeLocale(), opts).format(date);
  }

  #numberFormats = new Map<string, Intl.NumberFormat>();
  #numberFormat(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = JSON.stringify([locale, opts]);
    let format = this.#numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(locale, opts);
      this.#numberFormats.set(key, format);
    }
    return format;
  }

  #dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
  #dateTimeFormat(locale?: string, opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = JSON.stringify([locale, opts]);
    let format = this.#dateTimeFormats.get(key);
    if (!format) {
      format = new Intl.DateTimeFormat(locale, opts);
      this.#dateTimeFormats.set(key, format);
    }
    return format;
  }

  timezone(): string {
    return this.#dateTimeFormat().resolvedOptions().timeZone || "Europe/Vienna";
  }
}

export const i18n = new I18n();
