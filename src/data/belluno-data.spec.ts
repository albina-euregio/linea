import { expect, test, vi } from "vite-plus/test";
import "temporal-polyfill/global";
import { fetchAll } from "./providers";
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

  const data = await fetchAll((c) => c instanceof belluno.BellunoDataProvider);
  expect(data).toHaveLength(2);
  expect(data[0].id).toBe("0047");
  expect(data[1].id).toBe("0009");
  expect(data).toMatchSnapshot();
});

test("Belluno data parsing", async () => {
  const csv = `CODSTAZ;NOME;DATAORA;"Temperatura aria a 2m";"Umidità relativa a 2m";"Precipitazione";"Radiazione solare globale";"Velocità vento a 10m";"Direzione vento a 10m";"Pressione atmosferica ridotta a livello del mare";"Altezza neve"\n
218;"Asiago - aeroporto";16/04/2026 11:30;15.8;67;0.0;538;2.3;80;1017.0;>>\n
218;"Asiago - aeroporto";16/04/2026 11:00;15.4;67;0.0;830;2.2;52;1017.2;>>\n
218;"Asiago - aeroporto";16/04/2026 10:30;15.0;69;0.0;724;1.1;160;1017.3;>>\n
218;"Asiago - aeroporto";16/04/2026 10:00;14.2;67;0.0;536;1.1;72;1017.7;>>
`;

  const url0 = "https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/218.csv";

  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL | string) => {
      if (url.toString() === url0) {
        return Promise.resolve(new Response(csv));
      }
      throw new Error(`Unsupported URL ${url.toString()}`);
    }),
  );

  const stationData = await new belluno.BellunoDataProvider().fetchStationData(null, new URL(url0));
  expect(stationData).toMatchSnapshot();
});
