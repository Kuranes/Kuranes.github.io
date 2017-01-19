function prepare_normals(p, w, h, q) {
    var pi, qi;
   /*
   pi = 0;
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
function downscale(p, pi, w, h, w2, h2, q, qi) {

    for (var y2 = 0; y2 < h2; ++y2) {
        for (var x2 = 0; x2 < w2; ++x2) {
            var bx = 2 * x2,
                ex = bx + 2 + ((x2 + 1 >= w2) & w & 1);
            var by = 2 * y2,
                ey = by + 2 + ((y2 + 1 >= h2) & h & 1);
            var nx = 0,
                ny = 0;
            for (var y = by; y < ey; ++y) {
                for (var x = bx; x < ex; ++x) {
                    nx += p[pi + 2 * (w * y + x)];
                    ny += p[pi + 2 * (w * y + x) + 1];
                }
            }
            q[qi + 2 * (w2 * y2 + x2)] = nx / (ey - by);
            q[qi + 2 * (w2 * y2 + x2) + 1] = ny / (ex - bx);
        }
    }
}

function upscale(p, w, h, w2, h2, q) {

    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            var bx = 2 * x,
                ex = bx + 2 + ((x + 1 >= w) & w2 & 1);
            var by = 2 * y,
                ey = by + 2 + ((y + 1 >= h) & h2 & 1);
            var v = p[(w * y + x)];
            for (var y2 = by; y2 < ey; ++y2) {
                for (var x2 = bx; x2 < ex; ++x2) {
                    q[(w2 * y2 + x2)] = v;
                }
            }
        }
    }
}

function project(n, i, w, h, b) {
    for (var y = 0, px = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, ++px) {
            b[px] = (n[i + 2 * (w * y + (x + w - 1) % w)] - n[i + 2 * px]) + (n[i + 2 * (w * ((y + h - 1) % h) + x) + 1] - n[i + 2 * px + 1]);
        }
    }
}

function iterate(b, w, h, last_mean, f) {
    var sum = 0,
        row_sum;
    for (var y = 0, px = 0; row_sum = 0, y < h; sum += row_sum, ++y) {
        for (var x = 0; x < w; ++x, ++px) {
            f[px] = (b[px] + (f[(w * y + (x + w - 1) % w)] + f[(w * ((y + h - 1) % h) + x)]) + (f[(w * y + (x + 1) % w)] + f[(w * ((y + 1) % h) + x)])) / 4 - last_mean;
            row_sum += f[px];
        }
    }
    return sum / (w * h);
}

function solve(n, w, h, iterations, f) {

    var L = [{
        w: w,
        h: h,
        n: n,
        idx: 0
    }];

    var total = 0;

    for (var ww = w, hh = h; ww > 1 || hh > 1; total += ww * hh) {
        ww = Math.max(ww / 2, 1);
        hh = Math.max(hh / 2, 1);
        L.push({
            w: ww,
            h: hh,
            n: undefined,
            idx: 0
        });
    }

    var sn = new Array(2 * total);
    var b = new Array(w * h);
    var f2 = new Array(L.length > 1 ? L[1].w * L[1].h : 1);

    var fs = [f, f2];

    L[0].n = n;
    f[0] = 0;
    var i;
    for (i = 1, s = 0; i < L.length; ++i) {

        L[i].n = sn;
        L[i].idx = 2 * s;

        downscale(L[i - 1].n, L[i - 1].idx, L[i - 1].w, L[i - 1].h,
            L[i].w, L[i].h, L[i].n, L[i].idx);

        s += L[i].w * L[i].h;
    }

    for (i = L.length - 1; i-- > 0;) {

        upscale(fs[(i + 1) % 2], L[i + 1].w, L[i + 1].h,
            L[i].w, L[i].h, fs[i % 2]);

        project(L[i].n, L[i].idx, L[i].w, L[i].h, b, 0);

        var sum = 0;
        for (var j = 0; j < iterations; ++j) {
            sum = iterate(b, L[i].w, L[i].h, sum, fs[i % 2]);
        }
    }
}

function reconstruct_height_map1(normal, width, height, iterations, result) {

    n = new Array(2 * width * height);
    prepare_normals(normal, width, height, n);
    solve(n, width, height, iterations, result);

}

function n2h(imageData) {
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;

    var out = new Array(width * height);
    reconstruct_height_map1(pixels, width, height, 5000, out);
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