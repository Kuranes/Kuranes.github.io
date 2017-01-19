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
            
            us[2] = pixels[yo] & 0x1FFF;

            // Extract triangular indices.
            var temp = gsB2 - 8*us[2];
            us[1] = Math.floor(0.5*(gsB - Math.sqrt(Math.abs(temp))));
            us[0] = us[2] - ((us[1]*(255 - us[1])) >> 1);

            // Build approximate normal.
            out[yp + 0] = us[0]*gsInvFactor;
            out[yp + 1] = us[1]*gsInvFactor;
            temp = 1.0 - x*x - y*y;
            out[yp + 2] = Math.sqrt(Math.abs(temp));

            // Determine octant.
            if (pixels[yo] & 0x8000)
            {
                out[yp + 0] = -out[yp + 0];
            }
            if (pixels[yo] & 0x4000)
            {
                out[yp + 1] = -out[yp + 1];
            }
            if (pixels[yo] & 0x2000)
            {
                out[yp + 2] = -out[yp + 2];
            }
                   
            
            out[yp + 3] = 256;
            
            yo++;
            yi = yp + 4;
        }
    }

    postMessage(out);
}