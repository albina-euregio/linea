export class OptsHelper {

    UpdateAxisLabels(
        ctx: CanvasRenderingContext2D, 
        labely1: string, 
        labely2:string, 
        boxLeft: number, boxwidth: number,
        canvasHeight: number,
        fillStyle1: string | CanvasGradient | CanvasPattern, fillStyle2: string | CanvasGradient | CanvasPattern
    ) : CanvasRenderingContext2D {
        const labelOffset = labely1.length*3; // additional offset for label position
        const xPosY = boxLeft +labelOffset;
        const yPos = canvasHeight * 0.05;
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = fillStyle1;
        ctx.fillText( 
            labely1,
                xPosY, 
                yPos
                );
        ctx.restore();
        const width1 = ctx.measureText(labely1).width;
        const endX1 = xPosY + width1/2;

        if (labely2=="")
            return ctx;
        // Right Y-axis label
        const label2Offset = labely2.length*3; // additional offset for label position
        const xPosY2 = boxLeft + boxwidth - label2Offset;
        let minFontSize = ctx.font ? parseInt(ctx.font.split(' ')[0]) : 12;
        const width2 = ctx.measureText(labely2).width;
        const startx2 = xPosY2 - width2/2;
        if ( endX1 < startx2) // check if overlapping text
            minFontSize = 0; //don't adjust for large screens
        const yPos2 = yPos + minFontSize;//*3;
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = fillStyle2;
        ctx.fillText(
            labely2,
                xPosY2, 
                yPos2
                );
        ctx.restore();
        return ctx;
    }

    getTextWidth(text: string, fontSize: number, fontFamily: string = "sans-serif"): number {
    // Create a canvas element (off-screen)
    const canvas = document.createElement("canvas");
    const style = document.createElement("style");
    const context = canvas.getContext("2d");
    if (!context) return 0;

    // Set the font style
    context.font = `${fontSize}px ${fontFamily}`;

    // Measure the text
    const metrics = context.measureText(text);
    return metrics.width;
}
}
