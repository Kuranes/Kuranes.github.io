function prepare_normals(p, w, h, q) {
     var pi, qi;
    pi = 0;
   /* 
   for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, pi += 4) {
            
            p[pi + 0] = 2.0*(p[pi + 0] / 256) - 1.0;
            p[pi + 1] = 2.0*(p[pi + 1] / 256) - 1.0;
            p[pi + 2] = 2.0*(p[pi + 2] / 256) - 1.0;
            
        }
    }
    */
    pi = 0;
    qi = 0;
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, pi += 4, qi += 2) {
           var z = Math.abs(p[pi + 2]) < 1e-6 ? 1e-6 : p[pi + 2];
           q[qi + 0] = p[pi + 0] / z;
           q[qi + 1] = - p[pi + 1] / z;
            
        }
    }
}

function telescoping_sum(n, x, y, w, h){
           
    var hi = x + y * w ;
    var qi = hi * 2;
    
    var h0 = h[hi++];
    for (; x < w - 1; ++x ) {
        var qk = qi;
        var sum = 0.0;
        for (var k = 0; k < x; ++k, qk += 2) {
            sum += n[qk];
        }
        h[hi] = h0 + sum;
        hi++;
    }
    /*
    for (; x > 0; ++x ) {
        var qk = (x - 1 + (y +1)* w) * 2;
        var sum = 0.0;
        for (var k = x; k > 0; --k, qk -= 2) {
            sum += n[qk];
        }
        h[hi] =  h[hi] + h0 + sum;
        hi++;
    }*/
    h[hi] = h0;
}
// http://www.geometrictools.com/Documentation/ReconstructHeightFromNormals.pdf
function reconstruct_height_map1(normal, width, height, iterations, result) {

    var n = new Array(2 * width * height);
    var h = result;
    prepare_normals(normal, width, height, n);
    
    var i = 0;
    for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; ++x) {
           h[i++] = 0.0;
        }
    }
    
    h[0] = 0.0;
    var x = 0;
    for (y = 0; y < height; y++) {
        
        telescoping_sum(n, x, y, width, h);
        
        h[(y+1)*width] = n[y*width + 1];
    }

}

function n2h(imageData) {
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;



    var out = new Array(width * height);
    reconstruct_height_map1(pixels, width, height, 50000, out);
    var out2 = new Uint8ClampedArray(width * height * 4);

    var min = 100000.0;
    var max = -100000.0;
    for (var i = 0; i < out.length; i++) {
        max = Math.max(out[i], max);
        min = Math.min(out[i], min);
    }
    console.log(min, max, max - min);
    var iRGB = 0;
    var scale;
    
    scale = 256.0 / (max - min);
    //scale = 256.0 / (max);    
    var c;
    c = 0.0;
    for (i = 0; i < out.length; i++) {
        iRGB = i * 4;
        var lum = out[i];
        lum = lum - min;
        //lum = ((lum ) / (max - min));
        //lum = lum  / max;
        //lum = lum  + min / max;
        lum *= scale;
        lum += c;
        out2[iRGB + 0] = lum;
        out2[iRGB + 1] = lum;
        out2[iRGB + 2] = lum;
        out2[iRGB + 3] = 256;
    }
    postMessage(out2);
}

onmessage = function(event) {
    n2h(event.data);
};