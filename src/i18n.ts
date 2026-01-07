/// <reference types="vite/client" />

import messagesEN from "./i18n/en.json";
const messages = import.meta.glob("./i18n/*.json", {
  import: "default",
  eager: true,
});

class I18n {
  get lang(): string {
    return document.documentElement.lang.slice(0, 2) || "en";
  }

  get messages(): typeof messagesEN | undefined {
    return messages[`./i18n/${this.lang}.json`] as typeof messagesEN;
  }

  message(id: keyof typeof messagesEN): string {
    return this.messages?.[id] ?? messagesEN[id] ?? id;
  }

  number(num: number | null | undefined, opts?: Intl.NumberFormatOptions, unit = ""): string {
    if (typeof num !== "number" || !isFinite(num)) return "–";
    let s = new Intl.NumberFormat(this.lang, {
      useGrouping: num >= 10000,
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      ...opts,
    }).format(num);
    if (unit) s += ` ${unit}`;
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
