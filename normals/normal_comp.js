onmessage = function(event) {
    normal(event.data);
};


function normal(imageData) {
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;
    

    var gsN = 127;  // N(N+1)/2 = 8128 < 2^{13}
    var gsB = 2*gsN + 1;
    var gsB2 = gsB*gsB;
    var gsFactor = (gsN - 1)*Math.sqrt(0.5);
    var gsInvFactor = 1.0/gsFactor;

    var us = new Uint16Array(3);

    var out = new Uint8ClampedArray(width * height * 4);
    yi = 0; 
    yo = 0;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            yp = yi;
            var x0 = (pixels[yp] / 127.5 )- 1.0;
            var y0 = (pixels[yp+1] /  127.5) - 1.0;
            var z0 = (pixels[yp+2] /  127.5) - 1.0;
            
               // assert:  x*x + y*y + z*z = 1

            // Determine octant.
            index = 0;
            if (x0 < 0.0)
            {
                index |= 0x8000;
                x0 = -x0;
            }
            if (y0 < 0.0)
            {
                index |= 0x4000;
                y0 = -y0;
            }
            if (z0 < 0.0)
            {
                index |= 0x2000;
                z0 = -z0;
            }

            // Determine mantissa.
            us[0] = Math.floor(gsFactor*x0);
            us[1] = Math.floor(gsFactor*y0);
            us[2] = us[0] + ((us[1] *(255-us[1] )) >> 1);
            
            out[yp + 0] |= us[2];    
            out[yp + 1] = out[yp + 0];
            out[yp + 2] = out[yp + 0];
            
            out[yp + 3] = 256;

            yi = yp + 4;
        }
    }

    postMessage(out);
}