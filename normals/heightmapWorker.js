onmessage = function(event) {
    heightmap(event.data);
};


function heightmap(imageData) {
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

    yw = yi = 0;

    var pxl, pxlL, pxlR, pxlT, pxlB;
    var dx, dy, dz;
    var out = new Uint8ClampedArray(width * height * 4);

    yi = (width + 1) * 4;
    for (y = 1; y < height; y++) {
        for (x = 1; x < width; x++) {

            yp = yi;
            pxl = pixels[yi] + pixels[yi + 1] + pixels[yi + 2];
            pxl /= 3.0;
            out[yp + 0] = pxl;
            out[yp + 1] = pxl;
            out[yp + 2] = pxl;
            out[yp + 3] = 256;


            yi = yp + 4;
        }
        yi += 4;
    }

    postMessage(out);
}