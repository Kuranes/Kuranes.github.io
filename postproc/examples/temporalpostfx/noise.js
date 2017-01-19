( function () {
    'use strict';

    window.OSG.globalify();

    var osg = window.osg;
    var osgUtil = window.osgUtil;
    var osgShader = window.osgShader;

    


    var NoiseEffect = {

        name: 'Noise',

        getInputTexture: function () {
            return this._sceneTexture;
        },
        getOutputTexture: function () {
            return this._finalTexture;
        },
        getRootNode: function () {
            return this._effectRoot;
        },
        getCamera: function () {
            return this._cameraRTT;
        },

        update: function () {
        },



        createFinalTexture: function () {

            this._finalTexture = new osg.Texture();
            this._finalTexture.setTextureSize( this._helper._rttSize[ 0 ], this._helper._rttSize[ 1 ] );

            this._finalTexture.setMinFilter( 'NEAREST' );
            this._finalTexture.setMagFilter( 'NEAREST' );

        },

        buildComposer: function ( helper ) {
			
            this._helper = helper;

            var DepthEncodeFilter = new osgUtil.Composer.Filter.Custom(
                osgShader.ShaderProcessor.instance.getShader( 'depthFragPrecision' ), {},
                osgShader.ShaderProcessor.instance.getShader( 'depthVertPrecision' )
            );
			

            var DepthPrecisionFilter = new osgUtil.Composer.Filter.Custom(
                osgShader.ShaderProcessor.instance.getShader( 'noiseTest' ),{},
                osgShader.ShaderProcessor.instance.getShader( 'depthVertPrecision' )
            );
			
            this.createFinalTexture();

			
            this._composer = new osgUtil.Composer();
            this._composer.addPass( DepthEncodeFilter,this._helper._rttSize[ 0 ], this._helper._rttSize[ 1 ] );
            this._composer.addPass( DepthPrecisionFilter, this._finalTexture );
            this._composer.build();
			
            
            this._sceneTexture = this._composer.children[0]._attachments[Object.keys(this._composer.children[0]._attachments)[0]].texture;
            this._cameraRTT = this._composer.children[0];
            this._cameraRTT.setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );

            this._effectRoot = new osg.Node();
            this._effectRoot.addChild( this._composer );
        },

        buildGui: function ( mainGui ) {

            var folder = mainGui.addFolder( this.name );

        }
    };


    window.postScenes.push( NoiseEffect );
} )();
