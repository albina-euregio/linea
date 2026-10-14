import SmetWorker from "./smet-worker?worker";
import { StationData } from "./station-data";

export const USE_SMET_WORKER =
  typeof location !== "undefined" && new URLSearchParams(location.search).has("linea-worker");

export function fetchSMETInWorker(url: string): Promise<StationData> {
  const worker = new SmetWorker();
  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      worker.terminate();
      if (data.error) return reject(new Error(data.error));
      resolve(
        new StationData(data.station, data.altitude, data.timestamps, data.units, data.values),
      );
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };
    worker.postMessage(url);
  });
}
