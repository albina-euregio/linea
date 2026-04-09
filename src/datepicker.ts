import AirDatepicker, { type AirDatepickerLocale } from "air-datepicker";
import cssAirDatepicker from "air-datepicker/air-datepicker.css?raw";
import { i18n } from "./i18n";

export { AirDatepicker };
export { cssAirDatepicker };

/**
 * Localizes the AirDatepicker
 */
export function localizeDatePicker(): AirDatepickerLocale {
  const days = Array.from({ length: 7 }).map((_, i) => new Temporal.PlainDate(2023, 1, i + 1));
  const months = Array.from({ length: 12 }).map((_, i) => new Temporal.PlainDate(2023, i + 1, 1));
  return {
    firstDay: 1,
    // days starts with Sunday ++ 2023-01-01 is Sunday
    days: days.map((day) => i18n.time(day, { weekday: "long" })),
    daysShort: days.map((day) => i18n.time(day, { weekday: "short" })),
    daysMin: days.map((day) => i18n.time(day, { weekday: "narrow" })),
    months: months.map((month) => i18n.time(month, { month: "long" })),
    monthsShort: months.map((month) => i18n.time(month, { month: "short" })),
    today: i18n.message("linea:controls:datepicker:today"),
    clear: i18n.message("linea:controls:datepicker:clear"),
    dateFormat: i18n.message("linea:controls:datepicker:dateFormat"),
    timeFormat: i18n.message("linea:controls:datepicker:timeFormat"),
  };
}
