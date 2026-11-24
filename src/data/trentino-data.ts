import * as v from "valibot";
import type { FeatureCollectionSchema } from "../schema/listing";
import { SmetDataProvider } from "./smet-data-provider";

export const URL = "https://dati.meteotrentino.it/service.asmx/listaStazioniGeoJson";

/** A raw station feature as returned by meteotrentino's `listaStazioniGeoJson`. */
const MeteoTrentinoFeatureSchema = v.object({
  properties: v.object({
    codice: v.pipe(v.string(), v.trim(), v.nonEmpty()),
    nome: v.pipe(v.string(), v.trim(), v.nonEmpty()),
    quota: v.nullish(v.string()),
    inizio: v.nullish(v.string()),
    fine: v.nullish(v.string()),
  }),
  geometry: v.object({
    type: v.literal("Point"),
    coordinates: v.union([
      v.strictTuple([v.number(), v.number()]),
      v.strictTuple([v.number(), v.number(), v.number()]),
    ]),
  }),
});

/** The raw station listing; features are validated individually, see {@link MeteoTrentinoFeatureSchema}. */
const MeteoTrentinoGeoJSONSchema = v.object({
  features: v.array(v.unknown()),
});

type FeatureInput = v.InferInput<typeof FeatureCollectionSchema>["features"][number];

export class MeteoTrentinoDataProvider extends SmetDataProvider {
  constructor() {
    super("IT-32-TN", ["IT-32-TN"], URL, (id) => [
      `https://dati.meteotrentino.it/Service.asmx/GetSmetData?stazione=${id}&token=Euregio2026`,
    ]);
  }

  /**
   * Maps the Italian property names (`codice`, `nome`, `quota`, …) to the LINEA schema.
   * Invalid features are skipped (and logged) so that a single broken record does not hide all stations.
   * Stations with a `fine` (end) date are historical and no longer report data, so they are dropped.
   */
  protected override mapGeoJSON(json: unknown): v.InferInput<typeof FeatureCollectionSchema> {
    const { features } = v.parse(MeteoTrentinoGeoJSONSchema, json);
    return {
      type: "FeatureCollection",
      features: features.flatMap((feature): FeatureInput[] => {
        const result = v.safeParse(MeteoTrentinoFeatureSchema, feature);
        if (!result.success) {
          console.warn("Skipping invalid Meteotrentino station", feature, v.flatten(result.issues));
          return [];
        }
        const { properties: p, geometry } = result.output;
        if (p.fine?.trim()) return [];
        const quota = Number.parseFloat(p.quota ?? "");
        return [
          {
            type: "Feature",
            id: p.codice,
            geometry,
            properties: {
              name: p.nome,
              shortName: p.codice,
              altitude: Number.isFinite(quota) ? quota : null,
              startYear: p.inizio?.trim().slice(0, 4) || null,
              operator: "Meteotrentino",
              operatorLink: "https://www.meteotrentino.it/",
              operatorLicense: "CC BY 4.0",
              operatorLicenseLink: "https://creativecommons.org/licenses/by/4.0/deed.it",
            },
          },
        ];
      }),
    };
  }
}
