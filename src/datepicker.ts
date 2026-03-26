import AirDatepicker, { type AirDatepickerLocale } from "air-datepicker";
import cssAirDatepicker from "air-datepicker/air-datepicker.css?raw";
import en from "air-datepicker/locale/en";
import ca from "air-datepicker/locale/ca";
import de from "air-datepicker/locale/de";
import es from "air-datepicker/locale/es";
import fr from "air-datepicker/locale/fr";
import it from "air-datepicker/locale/it";
import pl from "air-datepicker/locale/pl";
import sk from "air-datepicker/locale/sk";
import sl from "air-datepicker/locale/sl";

export { AirDatepicker };
export { cssAirDatepicker };

/**
 * Localizes the AirDatepicker
 */
export function localizeDatePicker(lang: string): AirDatepickerLocale {
  switch (lang) {
    case "en":
      return en; // English
    case "ca":
      return ca; // Catalan
    case "de":
      return de; // German
    case "es":
      return es; // Spanish
    case "fr":
      return fr; // French
    case "it":
      return it; // Italian
    case "oc":
      return {
        days: ["Dimenge", "Diluns", "Mars", "Dimècres", "Dijòus", "Divendres", "Dissabte"],
        daysShort: ["Dg", "Dl", "Dm", "Dc", "Dj", "Dv", "Ds"],
        daysMin: ["Dg", "Dl", "Dm", "Dc", "Dj", "Dv", "Ds"],
        months: [
          "Genièr",
          "Febrièr",
          "Març",
          "Abril",
          "Mai",
          "Junh",
          "Julhet",
          "Agost",
          "Setembre",
          "Octòbre",
          "Novembre",
          "Decembre",
        ],
        monthsShort: [
          "Gen.",
          "Feb.",
          "Març",
          "Abr.",
          "Mai",
          "Junh",
          "Jul.",
          "Ago.",
          "Set",
          "Oct",
          "Nov",
          "Dec",
        ],
        today: "Uèi",
        clear: "Esfacar",
        dateFormat: "dd/mm/yyyy",
        timeFormat: "hh:ii",
        firstDay: 1,
      };
    case "pl":
      return pl; // Polish
    case "sk":
      return sk; // Slovak
    case "sl":
      return sl; // Slovenian
    default:
      return en; // Default to English if no match
  }
}
