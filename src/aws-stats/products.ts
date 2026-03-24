import { AbstractChart } from "./abstract-chart";

export class ProductsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
    this.exportModal.legend = false;
  }

  render() {
    if (this.plot) {
      this.plot.destroy();
      this.plot = null;
    }
    if (this.container) {
      this.container.remove();
    }

    if (this.bulletins.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No bulletin data available";
      empty.style.padding = "16px";
      this.appendChild(empty);
      return;
    }
  }
}

customElements.define("aws-products", ProductsChart);
