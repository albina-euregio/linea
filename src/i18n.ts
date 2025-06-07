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

  number(num: number, opts: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(this.lang, opts).format(num);
  }

  time(date: Date | number | string, opts?: Intl.DateTimeFormatOptions) {
    if (typeof date === "string") date = Date.parse(date);
    if (!isFinite(+date)) return "";
    return new Intl.DateTimeFormat(this.lang, opts).format(date);
  }
}

export const i18n = new I18n();
