import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import {
  opts_TA,
  opts_TA_TD_TSS,
  opts_TD,
  opts_TSS,
  opts_SurfaceHoar,
  showSurfaceHoar,
} from "./opts_TA_TD_TSS";
import {
  opts_DW,
  opts_VW,
  opts_VW_MAX,
  opts_VW_VWG_DW,
} from "./opts_VW_VWG_DW";
import { opts_HS, opts_HS_PSUM, opts_PSUM } from "./opts_HS_PSUM";
import { opts_ISWR, opts_RH, opts_RH_GR } from "./opts_RH_GR";
import { dewPoint } from "./dewPoint";
import { Values } from "../smet-data";
import { Temporal } from "temporal-polyfill";
import { i18n } from "../i18n";

export class LineaChart {

    #plots: uPlot[] = [];
    #resizeObserver = new ResizeObserver(() => this.#resizePlots(this.chart.clientWidth, this.chart.style));
    
    chart: HTMLDivElement;
    #m_style: any;

    constructor(
        private timestamps: Uint32Array,
        private values: Values,
        private station: string,
        private altitude: number,
        private showTitle: boolean,
        private showSurfaceHoarSeries: boolean
    ) {
        this.chart = document.createElement("span") as HTMLDivElement;
        this.createPlots().catch((e) => console.error(e));
    }

    setData(timestamps: Uint32Array, values: Values){
        this.timestamps = timestamps;
        this.values = values;
        if(this.showSurfaceHoarSeries && this.values.TD && this.values.TSS){
            this.#updateData(this.#plots[0], [this.values.TA, this.values.TD ?? (this.values.TA && this.values.RH
                    ? this.values.TA.map((temp, i) => dewPoint(temp, this.values.RH[i]))
                    : undefined), this.values.TSS, this.values.TD.map((td, i) => {
                    return (td < 0 && this.values.TSS[i] < td) ? 1000 : -100;
                    })]);
        } else {
            this.#updateData(this.#plots[0], [this.values.TA, this.values.TD ?? (this.values.TA && this.values.RH
                    ? this.values.TA.map((temp, i) => dewPoint(temp, this.values.RH[i]))
                    : undefined), this.values.TSS]);
        }
        this.#updateData(this.#plots[1], [this.values.VW, this.values.VW_MAX, this.values.DW]);
        this.#updateData(this.#plots[2], [this.values.HS, this.values.PSUM]);
        this.#updateData(this.#plots[3], [this.values.RH, this.values.ISWR]);
        this.#resizePlots(this.chart.clientWidth, this.chart.style);
    }

    #updateData(plot: uPlot, values: (number|null)[][]){
        let data = [this.timestamps];
        for (const element of values) {
            data.push(element?? this.#createNullArray());
        }
        plot.setData(data);
        plot.redraw();
    }

    #createNullArray(){
        let nulls: number|null[] = [];
        this.timestamps.forEach(() => nulls.push(null));
        return nulls;
    }

    async createPlots() {
        this.#resizeObserver.unobserve(this.chart);
        const style = document.createElement("style");
        style.textContent = css;
        const plot_TA_TD_TSS = document.createElement("div");
        const plot_VW_VWG_DW = document.createElement("div");
        const plot_HS_PSUM = document.createElement("div");
        const plot_RH_GR = document.createElement("div");
        this.chart.replaceChildren(
            style,
            plot_TA_TD_TSS,
            plot_VW_VWG_DW,
            plot_HS_PSUM,
            plot_RH_GR
        );
        const scale = this.#GetScale(this.chart.clientWidth);

        if (this.values.TA) {
            const TD =
            this.values.TD ??
            (this.values.TA && this.values.RH
                ? this.values.TA.map((temp, i) => dewPoint(temp, this.values.RH[i]))
                : undefined);
            const p = new uPlot(
            {
                ...opts_TA_TD_TSS,
                ...(this.showTitle
                ? {
                    title: `${this.station} (${i18n.number(this.altitude, { maximumFractionDigits: 0 })}m)`,
                    }
                : {}),
            },
            [this.timestamps],
            plot_TA_TD_TSS
            );
            this.#addSeries( p, opts_TA, this.values.TA);
            this.#addSeries( p, opts_TD, TD);
            
            // show snow surface temperature and therefore surface hoar only if available
            if(this.values.TSS) {
                this.#addSeries( p, opts_TSS, this.values.TSS);
                if(this.showSurfaceHoarSeries){
                    const surfacehoar = this.values.TD.map((td, i) => {
                    const tss = this.values.TSS[i];
                    return (td < 0 && tss < td) ? 1000 : -100;
                    });
                    this.#addSeries( p, opts_SurfaceHoar, surfacehoar)
                }
            } else {
                this.#addSeries( p, opts_TSS, []);
            }
        }

        if (this.values.VW || this.values.VW_MAX || this.values.DW) {
            const p = new uPlot({...opts_VW_VWG_DW}, [this.timestamps], plot_VW_VWG_DW);           
            this.#addSeries( p, opts_VW, this.values.VW);
            this.#addSeries( p, opts_VW_MAX, this.values.VW_MAX);
            this.#addSeries(p, opts_DW, this.values.DW);
        }

        if (this.values.HS || this.values.PSUM) {
            const p = new uPlot({...opts_HS_PSUM}, [this.timestamps], plot_HS_PSUM);
            this.#addSeries( p, opts_HS, this.values.HS);
            this.#addSeries( p, opts_PSUM, this.values.PSUM);
        }

        if (this.values.RH || this.values.ISWR) {
            const p = new uPlot({...opts_RH_GR}, [this.timestamps], plot_RH_GR);
            this.#addSeries( p, opts_RH, this.values.RH);
            this.#addSeries( p, opts_ISWR, this.values.ISWR);
        }

        this.#resizePlots(this.chart.clientWidth, this.chart.style);
        this.#resizeObserver.observe(this.chart);
    }

    disconnectedCallback() {
        this.#resizeObserver.unobserve(this.chart);
    }

    #resizePlots(clientWidth: number, style: CSSStyleDeclaration) {
        this.#plots.forEach((p) =>
        p.setSize({
            width: clientWidth,
            height: p.height,
        }));
        // compute a scale factor based on element width so text shrinks on narrow layouts
        const baseWidth = 360; // width at which scale == 1
        const minScale = 0.6; // don't shrink below this
        const scale =  Math.max(minScale, Math.min(1, clientWidth / baseWidth));
        //this.style.setProperty("--plot-scale", String(scale));
        if(style){
        style.fontSize =`${12 * scale}px`;
        style.padding =`${6 * scale}px ${10 * scale}px`;
        }
        this.#plots.forEach((p) =>
        p.setSize({
            width: clientWidth,
            height: p.height,
        })
        );
    }

    #addSeries(plot: uPlot, series: uPlot.Series, data: number[]) {
        if (!this.#plots.includes(plot)) {
        this.#plots.push(plot);
        }        
        if (!data) {
        console.warn("addSeries called with undefined data", series.label);
        data = [] as number[];
        }
        plot.addSeries({ ...series, show: !!data?.length });
        plot.data.push(data);
    }

    #GetScale(clientWidth: number): number {
        const baseWidth = 360;
        const minScale = 0.6;
        return Math.max(minScale, Math.min(1, clientWidth / baseWidth));
    }
    
    #GetStyle(document: Document, css: string): HTMLStyleElement{
        if(!this.#m_style){
        this.#CreateStyle(document, css);
        }
        return this.#m_style;
    }

    //#region Private Methods
    #CreateStyle(document: Document, css: string): HTMLStyleElement {
        const style = document.createElement("style");
        style.textContent = css;
        style.textContent = `
        .vw-max-plot .u-axis-label {
            transform-origin: left top;
            white-space: nowrap;
        }

        .hs-year-plot .u-axis-label {
            transform-origin: left top;
            white-space: nowrap;
        }
        `;
        document.head.appendChild(style);
        this.#m_style = style;
        return style;
    }

}
