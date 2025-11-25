export class OptsHelper {

    UpdateAxisLabels(
        ctx: CanvasRenderingContext2D, 
        labely1: string, 
        labely2:string, 
        boxLeft: number, boxwidth: number,
        canvasWidth: number, canvasHeight: number,
        screenwidth: number, fillStyle1: string | CanvasGradient | CanvasPattern, fillStyle2: string | CanvasGradient | CanvasPattern
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

        // Right Y-axis label
        const label2Offset = labely2.length*3; // additional offset for label position
        const xPosY2 = boxLeft + boxwidth - label2Offset;
        let minFontSize = 12; // minimum font size for small screens
        if ( canvasWidth>=1040 || screenwidth>=1040 )
            minFontSize = 0; //don't adjust for large screens
        const yPos2 = yPos + minFontSize*3;
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
}
