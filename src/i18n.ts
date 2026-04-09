/// <reference types="vite-plus/client" />

import messagesEN from "./i18n/en.json";
import type { Unit } from "./data/units.ts";
import type { AnalyzerIntegratedUnit, AnalyzerUnit } from "./shared/measurement-dates.ts";
const messages = import.meta.glob("./i18n/*.json", {
  import: "default",
  eager: true,
});

export type messagesEN_t = keyof typeof messagesEN;

class I18n {
  get lang(): string {
    return document.documentElement.lang.slice(0, 2) || "en";
  }

  get messages(): typeof messagesEN | undefined {
    return messages[`./i18n/${this.lang}.json`] as typeof messagesEN;
  }

  message(id: messagesEN_t): string {
    return this.messages?.[id] ?? messagesEN[id] ?? id;
  }

  number(
    num: number | null | undefined,
    opts?: Intl.NumberFormatOptions,
    unit: Unit | AnalyzerUnit | AnalyzerIntegratedUnit | "" | undefined = undefined,
  ): string {
    if (typeof num !== "number" || !isFinite(num)) return "–";
    let s = new Intl.NumberFormat(this.lang, {
      useGrouping: num >= 10000,
      minimumFractionDigits: unit === "℃" ? 1 : 0,
      maximumFractionDigits: unit === "℃" ? 1 : 0,
      ...opts,
    }).format(num);
    if (unit) s += ` ${unit}`;
    return s;
  }

  time(date: Date | number | string, opts?: Intl.DateTimeFormatOptions) {
    if (typeof date === "string") date = Date.parse(date);
    if (!isFinite(+date)) return "";
    switch (this.lang) {
      case navigator.language.slice(0, 2):
        return new Intl.DateTimeFormat(navigator.language, opts).format(date);
      case "en":
        return new Intl.DateTimeFormat("en-GB", opts).format(date);
      case "de":
        return new Intl.DateTimeFormat("de-AT", opts).format(date);
    }
    return new Intl.DateTimeFormat(this.lang, opts).format(date);
  }

  timezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

export const i18n = new I18n();
