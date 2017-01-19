function prepare_normals(p, w, h, q) {
     var pi, qi;
     /*
    pi = 0;
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, pi += 4) {
            
            p[pi + 0] = (p[pi + 0] / 127.5) - 1.0;
            p[pi + 1] = (p[pi + 1] / 127.5) - 1.0;
            p[pi + 2] = (p[pi + 2] / 127.5) - 1.0;
            
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

function lerp(a, ai, b, bi, t, res) {
    ai = Math.max(0, ai);
    bi = Math.max(0, bi);
    res[0] = a[ai*2] + t * b[bi*2];
    res[1] = a[ai*2 + 1] + t * b[bi*2 + 1];    
}
//http://developer.download.nvidia.com/assets/gamedev/docs/nmap2displacement.pdf
//https://github.com/kmkolasinski/AwesomeBump/blob/master/Sources/resources/filters.frag#L873
//http://www.klayge.org/trac/browser/KlayGE/Tools/src/Normal2Height/Normal2Height.cpp
function AccumulateDDM(height_map, ddm, width, height, directions, rings){

    var length = height*width;

    var  step = 2 * Math.PI / directions;
    var dxdy = new Array(directions);
    for (var i = 0; i < directions; i++)
    {
        dxdy[i*2] =  Math.cos(-i * step);
        dxdy[i*2 + 1] = Math.sin(-i * step);
    }

    var tmp_hm = new Array(2);
    tmp_hm[0] = new Array(length*2);
    tmp_hm[1] = new Array(length*2);
    for (i = 0; i < length; i++)
    {
        tmp_hm[0][i*2] =  0.0;
        tmp_hm[0][i*2 + 1] =  0.0;
        
        tmp_hm[1][i*2] =  0.0;
        tmp_hm[1][i*2 + 1] =  0.0;
    }
    
    var hl0  = new Array(2);
    var hl1  = new Array(2);
    var h    = new Array(2);
    var ddl0 = new Array(2);
    var ddl1 = new Array(2);
    var dd   = new Array(2);
        
    var active = 0;
    for (i = 1; i < rings; i++)
    {
        for (var j = 0; j < length; j++)
        {
            var y = Math.floor(j / width);
            var x = Math.floor(j - y*width);

            for (var k = 0; k < directions; k++)
            {
                var deltaX = dxdy[k*2] * i;
                var deltaY = dxdy[k*2 + 1] * i;
                
                var sample_x = x + deltaX;
                var sample_y = y + deltaY;
                
                var sample_x0 = Math.floor((sample_x));
                var sample_y0 = Math.floor((sample_y));
                
                var sample_x1 = sample_x0 + 1;
                var sample_y1 = sample_y0 + 1;
                
                var weight_x = sample_x - sample_x0;
                var weight_y = sample_y - sample_y0;

                /*sample_x0 = Math.max(0, sample_x0 % width);
                sample_y0 = Math.max(0, sample_y0 % height);
                sample_x1 = Math.max(0, sample_x1 % width);
                sample_y1 = Math.max(0, sample_y1 % height);
*/
                sample_x0 = (sample_x0 % width);
                sample_y0 = (sample_y0 % height);
                sample_x1 = (sample_x1 % width);
                sample_y1 = (sample_y1 % height);

                
                var inactive = active % 2;

                lerp(tmp_hm[active], sample_y0 * width + sample_x0, tmp_hm[active], sample_y0 * width + sample_x1, weight_x, hl0);
                lerp(tmp_hm[active], sample_y1 * width + sample_x0, tmp_hm[active], sample_y1 * width + sample_x1, weight_x, hl1);
                lerp(hl0, 0, hl1, 0, weight_y, h);
                
                lerp(ddm, sample_y0 * width + sample_x0, ddm, sample_y0 * width + sample_x1, weight_x, ddl0);
                lerp(ddm, sample_y1 * width + sample_x0, ddm, sample_y1 * width + sample_x1, weight_x, ddl1);
                lerp(ddl0, 0, ddl1, 0, weight_y, dd);                   
                
                tmp_hm[inactive][j*2] += h[0] + dd[0] * deltaX;
                tmp_hm[inactive][j*2 + 1] += h[1] + dd[1] * deltaY;
            }
        }

        active = (active +1) % 2;
    }

    var scale = 0.5 / (directions * rings);

    for (i = 0; i < length; i++)
    {
        var h = tmp_hm[active][i*2] + tmp_hm[active][i*2+1];
        height_map[i] = h * scale;
    }
}

function reconstruct_height_map1(normal, width, height, iterations, result) {

    var n = new Array(2 * width * height);
    var h = result;
    prepare_normals(normal, width, height, n);
  
    AccumulateDDM(h, n, width, height, 4, 9);

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