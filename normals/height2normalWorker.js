function prepare_normals(p, w, h, q) {
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, p += 3, q += 2) {
            q[0] = p[0] / p[2];
            q[1] = p[1] / p[2];
        }
    }
}

function downscale(p, w, h, w2, h2, q) {
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
                    nx += p[2 * (w * y + x)];
                    ny += p[2 * (w * y + x) + 1];
                }
            }
            q[2 * (w2 * y2 + x2)] = nx / (ey - by);
            q[2 * (w2 * y2 + x2) + 1] = ny / (ex - bx);
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
            var v = p[w * y + x];
            for (var y2 = by; y2 < ey; ++y2) {
                for (var x2 = bx; x2 < ex; ++x2) {
                    q[w2 * y2 + x2] = v;
                }
            }
        }
    }
}

function project(n, w, h, b) {
    for (var y = 0, px = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, ++px) {
            b[px] = (n[2 * (w * y + (x + w - 1) % w)] - n[2 * px]) + (n[2 * (w * ((y + h - 1) % h) + x) + 1] - n[2 * px + 1]);
        }
    }
}

function iterate(b, w, h, last_mean, f) {
    var sum = 0,
        row_sum;
    for (var y = 0, px = 0; row_sum = 0, y < h; sum += row_sum, ++y) {
        for (var x = 0; x < w; ++x, ++px) {
            f[px] = (b[px] + (f[w * y + (x + w - 1) % w] + f[w * ((y + h - 1) % h) + x]) + (f[w * y + (x + 1) % w] + f[w * ((y + 1) % h) + x])) / 4 - last_mean;
            row_sum += f[px];
        }
    }
    return sum / (w * h);
}

function solve(n, w, h, iterations, f) {
    console.assert(w >= 1 && h >= 1);

    var L = new Array();

    var total = 0;
    L.push_back({
        w: w,
        h: h
    });

    for (var ww = w, hh = h; ww > 1 || hh > 1; total += ww * hh) {
        ww = Math.max(ww / 2, 1);
        hh = Math.max(hh / 2, 1);
        L.push_back({
            w: ww,
            h: hh
        });
    }

    var sn = new Array(2 * total);
    var b = new Array(w * h);
    var f2 = new Array(L.size() > 1 ? L[1].w * L[1].h : 1);

    var fs = f.concat(f2);


    L[0].n = n;
    f[0] = 0;

    for (var i = 1, s = 0; i < L.size(); ++i) {
        L[i].n = sn[2 * s];
        downscale(L[i - 1].n, L[i - 1].w, L[i - 1].h, L[i].w, L[i].h, sn[2 * s]);
        s += L[i].w * L[i].h;
    }

    for (var i = L.size() - 1; i-- > 0;) {
        upscale(fs[(i + 1) % 2], L[i + 1].w, L[i + 1].h, L[i].w, L[i].h, fs[i % 2]);
        project(L[i].n, L[i].w, L[i].h, b[0]);
        var sum = 0;
        for (var j = 0; j < iterations; ++j) {
            sum = iterate(b[0], L[i].w, L[i].h, sum, fs[i % 2]);
        }
    }
}

function subsample(p, w, h, dx, dy, q) {
    var ww = 2 * w,
        hh = 2 * h;
    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x, q += 2) {
            var yy = 2 * y + dy,
                xx = 2 * x + dx;
            q[0] = p[2 * (ww * yy + (xx + 1) % ww)];
            q[1] = p[2 * (ww * ((yy + 1) % hh) + xx) + 1];
        }
    }
}

function copy_subsampled(p, w, h, q) {
    for (var y = 0; y < h; ++y, q += 4 * w, p += w) {
        for (var x = 0; x < w; ++x) {
            q[2 * x] = p[x];
        }
    }
}

function reconstruct_height_map1(normal, width, height, iterations, result) {

    n = new Array(2 * width * height);
    prepare_normals(normal, width, height, n);
    solve(n, width, height, iterations, result);

}

function reconstruct_height_map2(normal, width, height, iterations, result) {

    console.assert(width % 2 == 0 && height % 2 == 0);
    var w = width / 2,
        h = height / 2;

    var n = new Array(2 * width * height);
    var sn = new Array(2 * w * h);
    var f = new Array(w * h);
    prepare_normals(normal, width, height, n);

    for (var dy = 0; dy < 2; ++dy) {
        for (var dx = 0; dx < 2; ++dx) {
            subsample(n, w, h, dx, dy, sn);
            solve(sn, w, h, iterations, f);
            copy_subsampled(f, w, h, result + width * dy + dx);
        }
    }
}

function n2h(imageData) {
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;


    var out = new Uint8ClampedArray(width * height * 4);
    reconstruct_height_map2(pixlels, width, height, out);

    postMessage(out);
}

onmessage = function(event) {
    n2h(event.data);
};