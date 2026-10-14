import { fetchSMET } from "./smet-data";

self.onmessage = async (e: MessageEvent<string>) => {
  try {
    const { station, altitude, timestamps, units, values } = await fetchSMET(e.data);
    self.postMessage({ station, altitude, timestamps, units, values });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
