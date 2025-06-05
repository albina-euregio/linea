export class LineaPlot extends HTMLElement {
  connectedCallback() {
    this.prepend(document.createTextNode("Hello world!"));
  }
}

customElements.define("linea-plot", LineaPlot);
