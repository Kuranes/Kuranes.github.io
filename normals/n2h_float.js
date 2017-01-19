'use strict';


//http://stannum.co.il/blog/1/reconstructing-height-map-from-normal-map
function reconstruct_height_map1( options ) {

    function prepare_normals( p, w, h, q ) {

        var pi = 0 | 0;
        var qi = 0 | 0;
        for ( var y = 0 | 0; y < h; ++y ) {
            for ( var x = 0 | 0; x < w; ++x, pi += 4, qi += 2 ) {
                var z = Math.abs( p[ pi + 2 ] ) < 1e-6 ? 1e-6 : p[ pi + 2 ];
                q[ qi + 0 ] = p[ pi + 0 ] / z;
                q[ qi + 1 ] = -p[ pi + 1 ] / z;

            }
        }
    }

    function downscale( p, pi, w, h, w2, h2, q, qi ) {


        for ( var y2 = 0 | 0; y2 < h2; ++y2 ) {
            for ( var x2 = 0 | 0; x2 < w2; ++x2 ) {
                var bx = 2 * x2 | 0,
                    ex = bx + 2 + ( ( x2 + 1 >= w2 ) & w & 1 ) | 0;
                var by = 2 * y2 | 0,
                    ey = by + 2 + ( ( y2 + 1 >= h2 ) & h & 1 ) | 0;
                var nx = 0 | 0,
                    ny = 0 | 0;

                for ( var y = by | 0; y < ey; ++y ) {
                    for ( var x = bx | 0; x < ex; ++x ) {
                        nx += p[ pi + 2 * ( w * y + x ) ];
                        ny += p[ pi + 2 * ( w * y + x ) + 1 ];
                    }
                }
                q[ qi + 2 * ( w2 * y2 + x2 ) ] = nx / ( ey - by );
                q[ qi + 2 * ( w2 * y2 + x2 ) + 1 ] = ny / ( ex - bx );
            }
        }
    }

    function upscale( p, w, h, w2, h2, q ) {



        for ( var y = 0 | 0; y < h; ++y ) {
            for ( var x = 0 | 0; x < w; ++x ) {
                var bx = 2 * x | 0,
                    ex = bx + 2 + ( ( x + 1 >= w ) & w2 & 1 ) | 0;
                var by = 2 * y | 0,
                    ey = by + 2 + ( ( y + 1 >= h ) & h2 & 1 ) | 0;
                var v = p[ ( w * y + x ) ];
                for ( var y2 = by | 0; y2 < ey; ++y2 ) {
                    for ( var x2 = bx | 0; x2 < ex; ++x2 ) {
                        q[ ( w2 * y2 + x2 ) ] = v;
                    }
                }
            }
        }
    }

    function project( n, i, w, h, b ) {


        for ( var y = 0 | 0, px = 0; y < h; ++y ) {
            for ( var x = 0 | 0; x < w; ++x, ++px ) {
                b[ px ] = ( n[ i + 2 * ( w * y + ( x + w - 1 ) % w ) ] - n[ i + 2 * px ] ) + ( n[ i + 2 * ( w * ( ( y + h - 1 ) % h ) + x ) + 1 ] - n[ i + 2 * px + 1 ] );
            }
        }
    }

    function iterate( b, w, h, last_mean, f ) {


        var sum = 0,
            row_sum;
        for ( var y = 0 | 0, px = 0 | 0; row_sum = 0, y < h; sum += row_sum, ++y ) {
            for ( var x = 0 | 0; x < w; ++x, ++px ) {
                f[ px ] = ( b[ px ] + ( f[ ( w * y + ( x + w - 1 ) % w ) | 0 ] + f[ ( w * ( ( y + h - 1 ) % h ) + x ) | 0 ] ) + ( f[ ( w * y + ( x + 1 ) % w ) | 0 ] + f[ ( w * ( ( y + 1 ) % h ) + x ) | 0 ] ) ) / 4 - last_mean;
                row_sum += f[ px ];
            }
        }
        return sum / ( w * h );
    }

    function solve( n, w, h, iterations, f ) {



        var L = [ {
            w: w | 0,
            h: h | 0,
            n: n,
            idx: 0 | 0,
            idx: 0 | 0
        } ];

        var total = 0 | 0;

        for ( var ww = w | 0, hh = h | 0; ww > 1 || hh > 1; total += ww * hh ) {
            ww = Math.max( ( ww / 2 ) | 0, 1 | 0 ) | 0;
            hh = Math.max( ( hh / 2 ) | 0, 1 | 0 ) | 0;
            L.push( {
                w: ww | 0,
                h: hh | 0,
                n: undefined,
                idx: 0 | 0
            } );
        }

        var sn = new Float32Array( 2 * total );
        var b = new Float32Array( w * h );
        var f2 = new Float32Array( L.length > 1 ? L[ 1 ].w * L[ 1 ].h : 1 );

        var fs = [ f, f2 ];

        L[ 0 ].n = n;
        f[ 0 ] = 0;
        var i, s;
        for ( i = 1 | 0, s = 0 | 0; i < L.length; ++i ) {

            L[ i ].n = sn;
            L[ i ].idx = ( 2 * s ) | 0;

            downscale( L[ i - 1 ].n, L[ i - 1 ].idx | 0, L[ i - 1 ].w | 0, L[ i - 1 ].h | 0, L[ i ].w | 0, L[ i ].h | 0, L[ i ].n, L[ i ].idx );

            s += ( L[ i ].w * L[ i ].h ) | 0;
        }

        for ( i = L.length - 1; i-- > 0; ) {

            upscale( fs[ ( i + 1 ) % 2 ], L[ i + 1 ].w | 0, L[ i + 1 ].h | 0, L[ i ].w | 0, L[ i ].h | 0, fs[ i % 2 ] );

            project( L[ i ].n, L[ i ].idx | 0, L[ i ].w | 0, L[ i ].h | 0, b, 0 );

            var sum = 0;
            for ( var j = 0; j < iterations; ++j ) {
                sum = iterate( b, L[ i ].w | 0, L[ i ].h | 0, sum, fs[ i % 2 ] );
            }
        }
    }


    var normal = options.normals;
    var width = options.width | 0;
    var height = options.height | 0;
    var iterations = options.iterations | 0;
    var results = options.result;

    var n = new Float32Array( 2 * width * height );
    prepare_normals( normal, width, height, n );
    solve( n, width, height, iterations, results );

}

function n2h( imageData ) {

    var out = new Float32Array( imageData.width * imageData.height );

    var options = {
        normals: imageData.data,
        width: imageData.width,
        height: imageData.height,
        iterations: 1000,
        result: out
    };

    reconstruct_height_map1( options );

    postMessage( out );
}

onmessage = function ( event ) {
    n2h( event.data );
};