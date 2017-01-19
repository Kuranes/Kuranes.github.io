var canvasA = document.createElement( 'canvas' );
document.body.appendChild( canvasA );
var contextA = canvasA.getContext( '2d' );
var dataA;

var canvasB = document.createElement( 'canvas' );
document.body.appendChild( canvasB );
var contextB = canvasB.getContext( '2d' );
var dataB;

var canvasC = document.createElement( 'canvas' );
document.body.appendChild( canvasC );
var contextC = canvasC.getContext( '2d' );
var dataC;


var canvasD = document.createElement( 'canvas' );
document.body.appendChild( canvasD );
var contextD = canvasD.getContext( '2d' );
var dataD;


var canvasE = document.createElement( 'canvas' );
document.body.appendChild( canvasE );
var contextE = canvasE.getContext( '2d' );
var dataE;


var canvasF = document.createElement( 'canvas' );
document.body.appendChild( canvasF );
var contextF = canvasF.getContext( '2d' );
var dataF;


var canvasG = document.createElement( 'canvas' );
document.body.appendChild( canvasG );
var canvasG = canvasF.getContext( '2d' );

var dataF;
var floatData;
var aSave;

//TODO: Dither
// https://github.com/sole/node-dithering/blob/master/index.js
// https://spitzak.github.io/conversion/index.html


function stopWorker() {
    worker.terminate();
}

function clickSaveFile( url, name ) {
    aSave.href = url;
    aSave.download = name;
    aSave.click();
}

function blobSave( blob, name, type ) {
    var f = new FileReader();
    f.onload = function ( a ) {
        clickSaveFile( f.result, name );
    };
    f.readAsDataURL( blob );
}

function fileSave( data, name, type ) {
    var d = new Blob( [ data ], {
        type: type
    } );
    blobSave( d, name, type );
}


function convert8bits( floatBuff, ucharBuff ) {

    var min = 100000.0;
    var max = -100000.0;
    for ( var i = 0; i < floatBuff.length; i++ ) {
        max = Math.max( floatBuff[ i ], max );
        min = Math.min( floatBuff[ i ], min );
    }

    console.log( min, max, max - min );

    var iRGB = 0;
    var scale;

    scale = 256.0 / ( max - min );
    //scale = 256.0 / (max);
    var c;
    c = 0.0;
    for ( i = 0; i < floatBuff.length; i++ ) {

        var lum = floatBuff[ i ];

        lum = lum - min;
        //lum = ((lum ) / (max - min));
        //lum = lum  / max;
        //lum = lum  + min / max;
        lum *= scale;
        lum += c;

        ucharBuff[ iRGB + 0 ] = lum;
        ucharBuff[ iRGB + 1 ] = lum;
        ucharBuff[ iRGB + 2 ] = lum;
        ucharBuff[ iRGB + 3 ] = 256;

        iRGB += 4;
    }

}

function messageHandlerA( e ) {
    dataB = contextB.getImageData( 0, 0, canvasB.width, canvasB.height );
    var out = e.data;
    floatData = out;
    fileSave( out, 'heightmap_export' + canvasB.width + '_' + canvasB.height + '.bin', 'application/octet-stream' );

    var out2 = new Uint8ClampedArray( canvasB.width * canvasB.height * 4 );


    convert8bits( out, out2 );

    var pngFileName = 'heightmap_export' + canvasB.width + '_' + canvasB.height + '.png';

    dataB.data.set( out2 );
    contextB.putImageData( dataB, 0, 0 );

    clickSaveFile( canvasB.toDataURL( "image/png" ).replace( "image/png", "image/octet-stream" ), pngFileName );

    //worker.terminate();

    worker2.postMessage( {
        data: e.data,
        width: canvasB.width,
        height: canvasB.height
    } );
}

function messageHandlerB( e ) {
    dataC = contextC.getImageData( 0, 0, canvasB.width, canvasB.height );
    dataC.data.set( e.data );
    contextC.putImageData( dataC, 0, 0 );
    //worker2.terminate();
    worker3.postMessage( {
        a: dataA.data,
        b: dataC.data,
        length: canvasB.width * canvasB.height
    } );
}

function messageHandlerC( e ) {
    dataD = contextD.getImageData( 0, 0, canvasB.width, canvasB.height );
    dataD.data.set( e.data );
    contextD.putImageData( dataD, 0, 0 );

    worker4.postMessage( {
        data: floatData,
        width: canvasB.width,
        height: canvasB.height
    } );
    //worker3.terminate();
}

function messageHandlerD( e ) {
    dataE = contextE.getImageData( 0, 0, canvasB.width, canvasB.height );
    dataE.data.set( e.data );
    contextE.putImageData( dataE, 0, 0 );
    //worker4.terminate();
    worker5.postMessage( {
        data: dataE.data,
        width: canvasB.width,
        height: canvasB.height
    } );
}

function messageHandlerE( e ) {
    dataF = contextF.getImageData( 0, 0, canvasB.width, canvasB.height );
    dataF.data.set( e.data );
    contextF.putImageData( dataF, 0, 0 );

    //worker5.terminate();
}

function errorHandler( e ) {
    console.warn( e.message, e );
}

var worker = new Worker( "n2h_float.js" );
worker.addEventListener( "message", messageHandlerA, true );
worker.addEventListener( "error", errorHandler, true );


var worker2 = new Worker( "normalWorkerFloat.js" );
worker2.addEventListener( "message", messageHandlerB, true );
worker2.addEventListener( "error", errorHandler, true );


var worker3 = new Worker( "diff.js" );
worker3.addEventListener( "message", messageHandlerC, true );
worker3.addEventListener( "error", errorHandler, true );

var worker4 = new Worker( "ditherFloatTo8bits.js" );
worker4.addEventListener( "message", messageHandlerD, true );
worker4.addEventListener( "error", errorHandler, true );

var worker5 = new Worker( "normalWorker.js" );
worker5.addEventListener( "message", messageHandlerE, true );
worker5.addEventListener( "error", errorHandler, true );

// load image from data url
var imageObj = new Image();
imageObj.onchange = imageObj.onload = function () {

    var w = this.width;
    var h = this.height;

    canvasA.width = w;
    canvasA.height = h;

    canvasB.width = w;
    canvasB.height = h;

    canvasC.width = w;
    canvasC.height = h;

    canvasD.width = w;
    canvasD.height = h;

    canvasE.width = w;
    canvasE.height = h;

    canvasF.width = w;
    canvasF.height = h;


    contextA.drawImage( this, 0, 0 );
    dataA = contextA.getImageData( 0, 0, w, h );
    worker.postMessage( dataA );

};


function handleFiles( files ) {
    for ( var i = 0; i < files.length; i++ ) {
        var file = files[ i ];
        var imageType = /^image\//;

        if ( !imageType.test( file.type ) ) {
            continue;
        }

        var reader = new FileReader();
        reader.onload = ( function ( aImg ) {
            return function ( e ) {
                imageObj.src = e.target.result;
            };
        } )( imageObj );
        reader.readAsDataURL( file );
    }
}

function main( imageInput ) {


    aSave = document.createElement( "a" );
    document.body.appendChild( aSave );
    aSave.style = "display: none";

    imageObj.src = imageInput;
}