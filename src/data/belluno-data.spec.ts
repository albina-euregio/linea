import { expect, test, vi } from "vite-plus/test";
import { fetchAll } from "./fetch-listing";
import * as belluno from "./belluno-data";

/**
 * @vitest-environment jsdom
 */
test("Belluno station listing", async () => {
  const stationsXml = `<?xml version="1.0" encoding="UTF-8"?>
<METEOGRAMMI>
    <FORNITORE>
        <![CDATA[ARPAV - Dipartimento Regionale per la Sicurezza del Territorio. Servizio Centro Meteorologico di Teolo]]>
    </FORNITORE>
    <ISTANTERUN>
        202604161315
    </ISTANTERUN>
    <NOTE>
        <![CDATA[I dati della Rete Idrografica sono esposti nelle tabelle e nei grafici in modo automatico, senza validazione preventiva. ARPAV non assume responsabilita' alcuna per usi diversi dalla pura informazione sulle condizioni dei corsi d'acqua. In seguito a validazione i dati possono subire modifiche anche notevoli, oppure i dati possono essere invalidati e quindi non riportati negli archivi definitivi.]]>
    </NOTE>
    <LICENZA>
        <![CDATA[Dati rilasciati con licenza CC BY 4.0 https://creativecommons.org/licenses/by/4.0/deed.it]]>
    </LICENZA>
    <PERIODO>
        <![CDATA[Dati dal 14/04/2026 00:01 al 16/04/2026 13:00 compresi (orario solare).]]>
    </PERIODO>
    <INIZIO>
        202604140001
    </INIZIO>
    <FINE>
        202604161300
    </FINE>
    <PROJECTION>EPSG:4258</PROJECTION>
	<STAZIONE>
		<IDSTAZ>47</IDSTAZ>
		<NOME><![CDATA[Faloria]]></NOME>
		<X>12.17508664</X>
		<Y>46.52744551</Y>
		<QUOTA>2235</QUOTA>
		<TIPOSTAZ>METEO</TIPOSTAZ>
		<PROVINCIA>BL</PROVINCIA>
		<COMUNE><![CDATA[CORTINA D'AMPEZZO]]></COMUNE>
		<LINKSTAZ>0047.xml</LINKSTAZ>
	</STAZIONE>
	<STAZIONE>
		<IDSTAZ>9</IDSTAZ>
		<NOME><![CDATA[Caprile]]></NOME>
		<X>11.924</X>
		<Y>46.433</Y>
		<QUOTA>1007</QUOTA>
		<TIPOSTAZ>METEO</TIPOSTAZ>
		<PROVINCIA>BL</PROVINCIA>
		<COMUNE><![CDATA[ALLEGHE]]></COMUNE>
		<LINKSTAZ>0009.xml</LINKSTAZ>
	</STAZIONE>
</METEOGRAMMI>`;

  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL | string) => {
      if (url.toString() === belluno.URL) {
        return Promise.resolve(new Response(stationsXml));
      }
      throw new Error(`Unsupported URL ${url.toString()}`);
    }),
  );

  const data = await fetchAll((c) => c.geojson === belluno.URL);
  expect(data).toHaveLength(2);
  expect(data[0].id).toBe("0047");
  expect(data[1].id).toBe("0009");
  expect(data[0].$smet[0]).toContain("/0047.csv");
  expect(data[1].$smet[0]).toContain("/0009.csv");
  expect(data).toMatchSnapshot();
});
