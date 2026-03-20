export class BulletinFetcher {
  readonly container: HTMLElement;
  private allData: Record<string, { bulletins?: unknown[] }> = {};
  private availableRegions: Array<{ regionID: string; name?: string }> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.wireEvents();
    this.initializeDates();
  }

  render() {
    const css = `
            .controls {
                background: #ffffff;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .form-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
            }

            label {
                margin-bottom: 8px;
                font-weight: 600;
                color: #000;
                font-size: 14px;
            }

            input {
                padding: 12px;
                border: 2px solid #f5f5f5;
                border-radius: 8px;
                font-size: 14px;
                background: #fff;
                color: black;
                transition: border-color 0.3s ease;
            }

            input:focus {
                outline: none;
                border-color: #19abff;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            button {
                background: #ffffff;
                color: black;
                border: none;
                padding: 12px 24px;
                border-radius: 50px;
                border: 2px solid #19abff;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                margin-right: 10px;
                margin-bottom: 10px;
            }

            button:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            .elevation-inputs {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }

            .regions-container {
                max-height: 200px;
                overflow-y: auto;
                border: 2px solid #f0f0f0;
                border-radius: 8px;
                padding: 10px;
                background: #fff;
            }

            .region-item {
                align-items: center;
                margin-bottom: 8px;
                padding: 5px;
                border-radius: 5px;
                transition: background-color 0.2s;
                font-size: 13px;
            }

            .region-item:hover {
                background-color: #f5f5f5;
            }

            .status {
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 12px;
                font-size: 14px;
            }

            .status.success {
                background: #e9f9ef;
                border-left: 4px solid #27ae60;
                color: #21663a;
            }

            .status.error {
                background: #fdecec;
                border-left: 4px solid #e74c3c;
                color: #8a2720;
            }

            .status.loading {
                background: #eef7ff;
                border-left: 4px solid #3498db;
                color: #1f5f8f;
            }
        `;
    const html = `
        <div class="controls">
            <div class="form-row">
            <div class="form-group">
                <label for="startDate">Start Date</label>
                <input type="date" id="startDate" />
            </div>

            <div class="form-group">
                <label for="endDate">End Date (optional)</label>
                <input type="date" id="endDate" />
            </div>
            </div>

            <div class="form-row">
            <div class="form-group">
                <label
                >Elevation Bounds [m] (set lowest point and highest point of the microregion)</label
                >
                <div class="elevation-inputs">
                <input
                    type="number"
                    id="lowerBound"
                    placeholder="Lower"
                    value="500"
                    min="0"
                    max="5000"
                />
                <input
                    type="number"
                    id="upperBound"
                    placeholder="Upper"
                    value="3500"
                    min="0"
                    max="5000"
                />
                </div>
            </div>
            </div>

            <div class="form-row">
            <div style="display: flex; gap: 10px; align-items: center">
                <button id="fetchBtn">Fetch Data</button>
                <button id="resetBtn" disabled>Reset Zoom</button>
                <button id="exportBtn" class="export-btn" disabled>
                Export Chart
                </button>
            </div>
            </div>

            <div class="form-row" id="regionsSection" style="display: none">
            <div class="form-group">
                <label>Regions (select which to visualize)</label>
                <div style="margin-bottom: 10px">
                <button type="button" id="selectAllRegionsBtn">Select All</button>
                <button type="button" id="deselectAllRegionsBtn">Deselect All</button>
                <button id="updateChartBtn" style="background: #19abff; color: #ffffff">
                    Update Chart
                </button>
                </div>
                <div class="regions-container" id="regionsContainer">
                <div class="region-item">
                    <span style="font-size: 12px; color: #000000"
                    >Fetch data first to see available regions</span
                    >
                </div>
                </div>
            </div>
            </div>
        </div>

        <div id="statusContainer"></div>
        `;
    this.container.innerHTML = html;
    const style = document.createElement("style");
    style.textContent = css;
    this.container.appendChild(style);
  }

  private wireEvents() {
    this.query<HTMLInputElement>("#startDate")?.addEventListener("change", () => {
      const start = this.query<HTMLInputElement>("#startDate")?.value;
      const endInput = this.query<HTMLInputElement>("#endDate");
      if (!start || !endInput || endInput.value) {
        return;
      }
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      endInput.value = end.toISOString().split("T")[0];
    });

    this.query<HTMLButtonElement>("#fetchBtn")?.addEventListener("click", () => {
      void this.fetchData();
    });
    this.query<HTMLButtonElement>("#resetBtn")?.addEventListener("click", () => {
      this.container.dispatchEvent(new CustomEvent("chart-reset-request", { bubbles: true }));
    });
    this.query<HTMLButtonElement>("#exportBtn")?.addEventListener("click", () => {
      this.container.dispatchEvent(new CustomEvent("chart-export-request", { bubbles: true }));
    });
    this.query<HTMLButtonElement>("#selectAllRegionsBtn")?.addEventListener("click", () => {
      this.selectAllRegions();
    });
    this.query<HTMLButtonElement>("#deselectAllRegionsBtn")?.addEventListener("click", () => {
      this.deselectAllRegions();
    });
    this.query<HTMLButtonElement>("#updateChartBtn")?.addEventListener("click", () => {
      this.emitSelection();
    });
  }

  private initializeDates() {
    const startInput = this.query<HTMLInputElement>("#startDate");
    if (!startInput) {
      return;
    }
    const today = new Date();
    startInput.value = today.toISOString().split("T")[0];
  }

  private query<T extends HTMLElement>(selector: string): T | null {
    return this.container.querySelector(selector) as T | null;
  }

  private showStatus(message: string, type: "loading" | "success" | "error") {
    const statusContainer = this.query<HTMLDivElement>("#statusContainer");
    if (!statusContainer) {
      return;
    }
    statusContainer.innerHTML = `<div class="status ${type}">${message}</div>`;
  }

  private getDateRange(startDate: string, endDate: string) {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private async fetchBulletinData(dateString: string) {
    const url = `https://static.avalanche.report/bulletins/${dateString}/${dateString}_EUREGIO_en_CAAMLv6.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for ${dateString}`);
    }
    return (await response.json()) as { bulletins?: unknown[] };
  }

  private async fetchMultipleDays(dates: string[]) {
    const results: Record<string, { bulletins?: unknown[] }> = {};
    const errors: string[] = [];

    for (const date of dates) {
      try {
        this.showStatus(`Fetching data for ${date}...`, "loading");
        results[date] = await this.fetchBulletinData(date);
      } catch {
        errors.push(date);
      }
    }
    return { results, errors };
  }

  private extractAllRegions(dataByDate: Record<string, { bulletins?: unknown[] }>) {
    const regionMap = new Map<string, { regionID: string; name?: string }>();

    for (const day of Object.values(dataByDate)) {
      for (const bulletin of day.bulletins ?? []) {
        const asRecord = bulletin as Record<string, unknown>;
        const regions = (asRecord.regions as Array<Record<string, unknown>> | undefined) ?? [];
        for (const region of regions) {
          const regionID = typeof region.regionID === "string" ? region.regionID : "";
          if (!regionID) {
            continue;
          }
          regionMap.set(regionID, {
            regionID,
            name: typeof region.name === "string" ? region.name : regionID,
          });
        }
      }
    }

    return Array.from(regionMap.values()).sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? ""),
    );
  }

  private updateRegionsUI() {
    const regionsContainer = this.query<HTMLDivElement>("#regionsContainer");
    if (!regionsContainer) {
      return;
    }

    if (this.availableRegions.length === 0) {
      regionsContainer.innerHTML = '<div class="region-item"><span>No regions found</span></div>';
      return;
    }

    regionsContainer.innerHTML = this.availableRegions
      .map(
        (region) => `
                <div class="region-item">
                    <input type="checkbox" id="region_${region.regionID}" value="${region.regionID}" checked />
                    <label for="region_${region.regionID}" style="margin: 0; cursor: pointer; flex: 1; color: #000;">
                        ${region.name ?? region.regionID}
                    </label>
                </div>
            `,
      )
      .join("");
  }

  private getSelectedRegionIds() {
    return Array.from(
      this.container.querySelectorAll<HTMLInputElement>(
        "#regionsContainer input[type='checkbox']:checked",
      ),
    ).map((checkbox) => checkbox.value);
  }

  private selectAllRegions() {
    for (const checkbox of this.container.querySelectorAll<HTMLInputElement>(
      "#regionsContainer input[type='checkbox']",
    )) {
      checkbox.checked = true;
    }
    this.emitSelection();
  }

  private deselectAllRegions() {
    for (const checkbox of this.container.querySelectorAll<HTMLInputElement>(
      "#regionsContainer input[type='checkbox']",
    )) {
      checkbox.checked = false;
    }
  }

  private emitSelection() {
    const selectedRegions = this.getSelectedRegionIds();
    if (selectedRegions.length === 0) {
      this.showStatus("Please select at least one region", "error");
      return;
    }

    const filteredBulletins: unknown[] = [];
    for (const day of Object.values(this.allData)) {
      for (const bulletin of day.bulletins ?? []) {
        const bulletinRecord = bulletin as Record<string, unknown>;
        const regions =
          (bulletinRecord.regions as Array<Record<string, unknown>> | undefined) ?? [];
        const hasRegion = regions.some((region) => {
          return typeof region.regionID === "string" && selectedRegions.includes(region.regionID);
        });
        if (hasRegion) {
          filteredBulletins.push(bulletin);
        }
      }
    }

    const lowerBound = Number(this.query<HTMLInputElement>("#lowerBound")?.value ?? 500);
    const upperBound = Number(this.query<HTMLInputElement>("#upperBound")?.value ?? 3500);

    this.container.dispatchEvent(
      new CustomEvent("bulletins-change", {
        bubbles: true,
        detail: {
          bulletins: filteredBulletins,
          selectedRegions,
          lowerBound,
          upperBound,
        },
      }),
    );

    this.query<HTMLButtonElement>("#resetBtn")!.disabled = false;
    this.query<HTMLButtonElement>("#exportBtn")!.disabled = false;
    this.showStatus(`Chart updated for ${selectedRegions.length} selected region(s)`, "success");
  }

  private async fetchData() {
    const startDate = this.query<HTMLInputElement>("#startDate")?.value ?? "";
    const endDate = this.query<HTMLInputElement>("#endDate")?.value || startDate;

    if (!startDate) {
      this.showStatus("Please select a start date", "error");
      return;
    }

    const fetchBtn = this.query<HTMLButtonElement>("#fetchBtn");
    if (fetchBtn) {
      fetchBtn.disabled = true;
    }

    try {
      const dates = this.getDateRange(startDate, endDate);
      if (dates.length > 200) {
        this.showStatus("Date range too large. Please select a maximum of 200 days.", "error");
        return;
      }

      const { results, errors } = await this.fetchMultipleDays(dates);
      this.allData = results;
      this.availableRegions = this.extractAllRegions(results);
      this.updateRegionsUI();

      const regionsSection = this.query<HTMLDivElement>("#regionsSection");
      if (regionsSection) {
        regionsSection.style.display = "block";
      }

      const successfulDays = Object.keys(results).length;
      this.showStatus(
        `Loaded ${successfulDays} day(s), found ${this.availableRegions.length} region(s)` +
          (errors.length > 0 ? `, ${errors.length} failed` : ""),
        errors.length > 0 ? "error" : "success",
      );

      this.emitSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.showStatus(`Error: ${message}`, "error");
    } finally {
      if (fetchBtn) {
        fetchBtn.disabled = false;
      }
    }
  }
}
