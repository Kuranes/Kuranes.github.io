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
    yw = width ;
    yi = (width + 1) ;
    for (y = 1; y < height - 1; y++) {
        for (x = 1; x < width - 1; x++) {

            yp = yi;
            
            pxl = pixels[yi];

            yi = yp - 1;
            pxlL = pixels[yi] ;

            yi = yp + 1;
            pxlR = pixels[yi];

            yi = yp - yw;
            pxlT = pixels[yi];

            yi = yp + yw;
            pxlB = pixels[yi];
            //pxlB /= 256.0;

            //dx = -((pxlL - pxl) + (pxl - pxlR)) * 0.125;
            //dy = ((pxlT - pxl) + (pxl - pxlB)) * 0.125;

            dx = (pxlR - pxlL) ;
            dy = (pxlT - pxlB) ;
            dz = 1.0;
			//dz = 1.0;

            var l = Math.sqrt(dx * dx + dy * dy + dz * dz);
            out[yp*4 + 0] = ((dx / l) + 1.0 ) * 127.5;
            out[yp*4 + 1] = ((dy / l) + 1.0 ) * 127.5;
            out[yp*4 + 2] = ((dz / l) + 1.0 ) * 127.5;
            out[yp*4 + 3] = 256;


            yi = yp + 1;
        }
        yi += 2;
    }
    postMessage(out);    
    
}