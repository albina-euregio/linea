import uPlot from "uplot";
export abstract class AbstractLineaChart extends HTMLElement{
    
    plots: uPlot[] = [];
    resizeObserver = new ResizeObserver(() => this.resizePlots(this.clientWidth, this.style));
    #m_style: any;
    
    resizePlots(clientWidth: number, style: CSSStyleDeclaration) {
        this.plots.forEach((p) =>
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
    }

    addSeries(plot: uPlot, series: uPlot.Series, data: number[]) {
        if (!this.plots.includes(plot)) {
            this.plots.push(plot);
        }        
        if (!data) {
            console.warn("addSeries called with undefined data", series.label);
            data = [] as number[];
        }
        plot.addSeries({ ...series, show: !!data?.length });
        plot.data.push(data);
    }

    GetScale(clientWidth: number): number {
        const baseWidth = 360;
        const minScale = 0.6;
        return Math.max(minScale, Math.min(1, clientWidth / baseWidth));
    }
    
    GetStyle(document: Document, css: string): HTMLStyleElement{
        if(!this.#m_style){
            this.#CreateStyle(document, css);
        }
        return this.#m_style;
    }

    //#region Private Methods
    #CreateStyle(document: Document, css: string): HTMLStyleElement {
        const style = document.createElement("style");
        style.textContent = css;
        style.textContent += `
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