import { i18n } from "./i18n";
import { LineaPlot } from "./linea-plot";

export class ExportModal {

    private exportOptions: HTMLDivElement;
    private exportSettings: HTMLDivElement;
    private exportResult: HTMLDivElement;
    private exportdata: {blob: Blob, data: string, filename: string, type: string} | null = null;

    constructor(
        readonly modal: HTMLDivElement, 
        private lineaPlot: LineaPlot
    ) {
        const style: HTMLStyleElement = document.createElement('style');
        style.textContent = `
            label {
                margin-bottom: 8px;
                font-weight: 600;
                color: #black;
                font-size: 14px;
            }
            
            input {
                padding: 12px;
                border: 2px solid #F5F5F5;
                border-radius: 8px;
                font-size: 14px;
                background: #black;
                color: black;
                transition: border-color 0.3s ease;
            }
            
            input:focus {
                outline: none;
                border-color: #19abff;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .export-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: #ffffff;
            }
            
            .export-modal-content {
                background-color: #ffffff;
                margin: 5% auto;
                padding: 20px;
                border-radius: 12px;
                width: 90%;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .export-close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                line-height: 1;
            }
            
            .export-close:hover {
                color: #fff;
            }
            
            .export-options {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .export-option {
                background: #3498db;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            
            .export-option:hover {
                background: #444;
            }
            
            .export-option h4 {
                margin: 0 0 10px 0;
                color: #ffffff;
            }
            
            .export-option p {
                margin: 0;
                font-size: 13px;
                color: #ffffff;
            }
            
            .code-container {
                background: #ffffff;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                position: relative;
            }
            
            .code-container pre {
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 12px;
                color: #000000;
            }
            
            .code-container button {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #3498db;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .code-container button:hover {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #3498db;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .export-settings {
                background: #ffffff;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                display: flex;
                flex-direction: column;
            }
            
            .export-settings h4 {
                margin: 0 0 15px 0;
                color: #3498db;
            }
            
            .export-settings label {
                margin-bottom: 5px;
            }

            .export-settings input {
                width: 100%;
                max-width: 200px;
            } 
            
        `;
        this.modal.appendChild(style);
        
        this.modal.classList.add("export-modal");
        this.modal.id = "exportModal";
        this.modal.insertAdjacentHTML("beforeend", `<div class="export-modal-content">
                <span class="export-close" onclick="this.closest('.export-modal').style.display='none'">&times;</span>
                <h2>${i18n.message("dialog:weather-station-diagram:controls:label:exportchart")}</h2>
    
                <div class="export-options">
                    <div class="export-option" id="btnExportIframe">
                        <h4>${i18n.message("dialog:weather-station-diagram:controls:button:iframe")}</h4>
                        <p>${i18n.message("dialog:weather-station-diagram:controls:button:iframe:sub")}</p>
                    </div>
    
                    <div class="export-option" id="btnExportStandalone">
                        <h4>${i18n.message("dialog:weather-station-diagram:controls:button:standalonehtml")}</h4>
                        <p>${i18n.message("dialog:weather-station-diagram:controls:button:standalonehtml:sub")}</p>
                    </div>
    
                    <div class="export-option" id="btnExportPNG">
                        <h4>${i18n.message("dialog:weather-station-diagram:controls:button:pngimage")}</h4>
                        <p>${i18n.message("dialog:weather-station-diagram:controls:button:pngimage:sub")}</p>
                    </div>
                </div>
    
                <div class="export-settings" id="exportSettings" style="display:none;">
                    <h4>${i18n.message("dialog:weather-station-diagram:controls:label:exportsettings")}</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <label for="exportWidth">${i18n.message("dialog:weather-station-diagram:controls:label:width")} (px)</label>
                            <input type="number" id="exportWidth" value="1100" min="400" max="2000" step="100">
                        </div>
                        <div>
                            <label for="exportHeight">${i18n.message("dialog:weather-station-diagram:controls:label:heightpercanvas")} (px):</label>
                            <input type="number" id="exportHeight" value="300" min="100" max="600" step="50">
                        </div>
                        <div>
                            <label for="exportTitle">${i18n.message("dialog:weather-station-diagram:controls:label:title")}</label>
                            <input type="text" id="exportTitle" value="">
                        </div>
                    </div>
                </div>
    
                <div id="exportResult" style="display:none;">
                    <h3>${i18n.message("dialog:weather-station-diagram:controls:label:exportresult")}</h3>
                    <div class="code-container">
                        <button class="dwn-btn" style="right: 62px;" id="downloadBtn">${i18n.message("dialog:weather-station-diagram:controls:button:download")}</button>
                        <button class="open-btn" style="right: 10px;" id="openBtn">${i18n.message("dialog:weather-station-diagram:controls:button:open")}</button>
                        <button class="copy-btn" style="right: 138px;" id="copyExportBtn">${i18n.message("dialog:weather-station-diagram:controls:button:copytoclipboard")}</button>
                        <pre id="exportCode"></pre>
                    </div>
                </div>
            </div>`);
        
        this.exportOptions = this.modal.querySelector(".export-options") as HTMLDivElement;
        this.exportSettings = this.modal.querySelector("#exportSettings") as HTMLDivElement;
        this.exportResult = this.modal.querySelector("#exportResult") as HTMLDivElement;

        this.modal.querySelector("#btnExportIframe")?.addEventListener("click", () => {
            this.exportSettings.style.display = "flex";
            this.#exportAsIframe();
        });

        this.modal.querySelector("#btnExportStandalone")?.addEventListener("click", () => {
            this.exportSettings.style.display = "flex";
            // this.exportAsStandalone();
        });

        this.modal.querySelector("#btnExportPNG")?.addEventListener("click", () => {
            this.exportSettings.style.display = "flex";
            const exportSettings = this.#getExportSettings();
            const initHeightPerCanvas = this.lineaPlot.lineacharts[0].plots[0].height;
            for (const lineachart of this.lineaPlot.lineacharts){
                lineachart.resizeObserver.unobserve(lineachart);
                lineachart.resizePlots(exportSettings.width, lineachart.style, exportSettings.height);
            }
            setTimeout(() => {
                this.#exportAllPlotsToPNG(exportSettings.title);
                for (const lineachart of this.lineaPlot.lineacharts){
                    lineachart.resizePlots(this.lineaPlot.clientWidth, lineachart.style, initHeightPerCanvas);
                    lineachart.resizeObserver.observe(lineachart);
                }
            }, 500);
        });

        this.modal.querySelector("#copyExportBtn")?.addEventListener("click", () => {
            this.#copyToClipboard();
        });

        this.modal.querySelector("#downloadBtn")?.addEventListener("click", () => {
            this.#downloadExport();
        });

        this.modal.querySelector("#openBtn")?.addEventListener("click", () => {
            this.#openExport();
        });
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('exportModal');
            if (event.target === modal && modal) {
                modal.style.display = 'none';
            }
        };
    }

    show() {
        this.modal.style.display = 'block';
        this.exportSettings.style.display = 'block';
        this.exportResult.style.display = 'none';
        (document.getElementById("exportTitle") as HTMLInputElement)!.value = this.#generateTitleString();
        (document.getElementById("exportWidth") as HTMLInputElement)!.value = String(this.lineaPlot.clientWidth);
        (document.getElementById("exportHeight") as HTMLInputElement)!.value = String(this.lineaPlot.lineacharts[0].plots[0].height);
    }

    #copyToClipboard() {
        let code: ClipboardItem[] = [];
        if(this.exportdata){
            if(this.exportdata.type === "image/png"){
                code = [
                    new ClipboardItem({
                        "image/png": this.exportdata.blob,
                    })
                ];
            } else if (this.exportdata.type === "text/html"){
                code = [
                    new ClipboardItem({
                        "text/html": new Blob([this.exportdata.data], { type: "text/html" }),
                    })
                ];
            }
        } else {
            return;
        }
        navigator.clipboard.write(code).then(() => {
            const btn = document.querySelector('.copy-btn') as HTMLButtonElement;
            const originalText = btn.textContent;
            btn.textContent = `${i18n.message("dialog:weather-station-diagram:controls:button:copytoclipboard:clicked")}`;
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#667eea';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    #downloadExport() {
        if(!this.exportdata){
            return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(this.exportdata.blob);;
        a.download = this.exportdata.filename;
        a.target="_tab";
        a.click();
    }

    #openExport() {
        if(!this.exportdata){
            return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(this.exportdata.blob);;
        a.target="_blank";
        a.click();
    }


    #exportAsIframe() {
    }

    #generateTitleString(): string {
        const titles: {station: string, altitude: number}[] = [];
        for (const lineachart of this.lineaPlot.lineacharts){
            const station = lineachart.station;
            const altitude = lineachart.altitude;
            titles.push({station, altitude});
        }
        let title = "";
        titles.forEach((t, i) => {
            title += t.station + " (" + t.altitude + "m)"
            if(! (titles.length == (i+1))){
                title += " — ";
            }
        });
        return title;
    }

    /**
     * Exports all shown LineaChart into a single png file.
     * The rendering uses the already drawn HTMLCanvasElement from each plot and redraws them on a new Canvas.
     * This leads to the effect, that the rendered png is as width as the shown plots in the browser.
     * @todo make the png export with adjustable width so there are no problem on mobile phones
     * 
     * The plot title is set automatically set to a string with <stationname> (<altitude>m)[ — <stationname> (<altitude>m)]... using an emdash.
     * The legend is build autmatically from the shown series.
     */
    #exportAllPlotsToPNG(title: string = this.#generateTitleString()) {
        const canvases: HTMLCanvasElement[] = [];
        const series: uPlot.Series[] = [];
        const legendItems = {};

        for (const lineachart of this.lineaPlot.lineacharts){
            const plots: uPlot[] = lineachart.plots;
            plots.map(p => p.root.querySelector("canvas")!).forEach( (c) => {
                canvases.push(c);
            });
            const station = lineachart.station;
            const altitude = lineachart.altitude;
            plots.map(p => series.push(...p.series.slice(1)));
            plots.map(p => p.series.slice(1).map((s, i) => {
            const label = s.label ?? `Series ${i + 1}`;
            let color = "#000000";
            if (typeof s.stroke === "string") {
                color = s.stroke;
            } else {
                const c = s.stroke(p, i + 1);
                if (typeof c === "string") color = c;
            }
            legendItems[label] = color;
            }));
        }
        
        //build png
        const titleHeight = title ? 40 : 0;
        const legendItemHeight = 22;
        const legendPadding = 20;

        const width = canvases[0].width;
        const chartsHeight = canvases.reduce((sum, c) => sum + c.height, 0);
        const totalHeight = titleHeight + chartsHeight + (width <= 550 ? 110 : 90);

        const outCanvas = document.createElement("canvas");
        outCanvas.width = width;
        outCanvas.height = totalHeight;

        //fill background
        const ctx = outCanvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = "high";

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

        if(title){
            ctx.fillStyle = "#000";
            ctx.font = "24px Arial";
            ctx.textAlign = "center";
            const titlewidth = ctx.measureText(title).width;
            if(width < titlewidth){
                ctx.font = "18px Arial";
            }
            ctx.fillText(title, outCanvas.width / 2, 40);
        }

        let y = titleHeight;
        for (const c of canvases) {
            ctx.drawImage(c, 0, y);
            y += c.height;
        }

        if (Object.keys(legendItems).length > 0) {
            const swatchSize = 18;
            const xStart = legendPadding*2;
            let legendY = y + legendPadding + legendItemHeight / 2;

            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.font = "14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

            let x = xStart;
            for (const [label, color] of Object.entries(legendItems)){
                const textwidth = ctx.measureText(label).width;
                if(x + swatchSize + 8 + textwidth > outCanvas.width){
                    x = xStart;
                    legendY += legendItemHeight;
                }

                // colored square
                ctx.fillStyle = color;
                ctx.fillRect(x, legendY - swatchSize / 2, swatchSize, swatchSize);

                // label
                ctx.fillStyle = "#000";
                ctx.fillText(label, x + swatchSize + 8, legendY);
                x = x + swatchSize + 8 + textwidth + 10;
            }
        }
        outCanvas.toBlob( (blobdata) => {
            this.exportdata = {blob: blobdata, data:outCanvas.toDataURL(), filename: "linea-chart.png", type: "image/png"};
            console.log("Exported PNG blob:", this.exportdata);
        });
        document.getElementById('exportCode').innerHTML = `<img src="${outCanvas.toDataURL()}" alt="Chart Preview" style="max-width: 100%; border: 1px solid #333; border-radius: 4px;"/>`;
        document.getElementById('exportResult').style.display = 'block';
    }

    #getExportSettings() {
        const widthInput = document.getElementById("exportWidth") as HTMLInputElement;
        const heightInput = document.getElementById("exportHeight") as HTMLInputElement;
        const titleInput = document.getElementById("exportTitle") as HTMLInputElement;
        return {
            width: parseInt(widthInput.value),
            height: parseInt(heightInput.value),
            title: titleInput.value
        };
    }
}