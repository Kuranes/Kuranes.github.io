onmessage = function(event) {
    normal(event.data);
};

function normal(imageData) {
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;

    var rsum, gsum, bsum, asum, x, y, i, p, p1, p2, yp, yi, yw;
    var wm = width - 1;
    var hm = height - 1;

    var r = [];
    var g = [];
    var b = [];
    var a = [];

    var vmin = [];
    var vmax = [];

    yw = width * 4;
    yi = 0;

    var pxl, pxlL, pxlR, pxlT, pxlB;
    var dx, dy, dz;
    var out = new Uint8ClampedArray(width * height * 4);
    yi = 0;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            yp = yi;

            out[yp + 0] = 128;
            out[yp + 1] = 256;
            out[yp + 2] = 128;
            out[yp + 3] = 256;

            yi = yp + 4;
        }
    }
    yi = (width + 1) * 4;
    for (y = 1; y < height - 1; y++) {
        for (x = 1; x < width - 1; x++) {

            yp = yi;
            pxl = pixels[yi] + pixels[yi + 1] + pixels[yi + 2];
            pxl /= 3.0;
           // pxl /= 256.0;

            yi = yp - 4;
            pxlL = pixels[yi] + pixels[yi + 1] + pixels[yi + 2];
            pxlL /= 3.0;
            //pxlL /= 256.0;

            yi = yp + 4;
            pxlR = pixels[yi] + pixels[yi + 1] + pixels[yi + 2];
            pxlR /= 3.0;
           // pxlR /= 256.0;

            yi = yp - yw;
            pxlT = pixels[yi] + pixels[yi + 1] + pixels[yi + 2];
            pxlT /= 3.0;
            //pxlT /= 256.0;

            yi = yp + yw;
            pxlB = pixels[yi] + pixels[yi + 1] + pixels[yi + 2];
            pxlB /= 3.0;
            //pxlB /= 256.0;

            //dx = -((pxlL - pxl) + (pxl - pxlR)) * 0.125;
            //dy = ((pxlT - pxl) + (pxl - pxlB)) * 0.125;

            dx = (pxlR - pxlL) / 8.0;
            dy = (pxlT - pxlB) / 8.0;
            dz = 1.0;
			//dz = 1.0;

            var l = Math.sqrt(dx * dx + dy * dy + dz * dz);
            out[yp + 0] = ((dx / l) + 1.0 ) * 127.5;
            out[yp + 1] = ((dy / l) + 1.0 ) * 127.5;
            out[yp + 2] = ((dz / l) + 1.0 ) * 127.5;
            out[yp + 3] = 256;


            yi = yp + 4;
        }
        yi += 8;
    }

    postMessage(out);
}