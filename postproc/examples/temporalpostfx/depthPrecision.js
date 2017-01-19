( function () {
    'use strict';

    window.OSG.globalify();

    var osg = window.osg;
    var osgUtil = window.osgUtil;
    var osgShader = window.osgShader;

    


    var DepthEffect = {

        name: 'DepthPrecision',

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
			
			this.errorScale = 1e10;

            var DepthPrecisionFilter = new osgUtil.Composer.Filter.Custom(
                osgShader.ShaderProcessor.instance.getShader( 'depthDecodeTest' ), {
					'errorScale': this.errorScale					
				},
                osgShader.ShaderProcessor.instance.getShader( 'depthVertPrecision' )
            );
			
            this.createFinalTexture();

			
            this._composer = new osgUtil.Composer();
            this._composer.addPass( DepthEncodeFilter,this._helper._rttSize[ 0 ], this._helper._rttSize[ 1 ] );
            this._composer.addPass( DepthPrecisionFilter, this._finalTexture );
            this._composer.build();
			
            this._errorScaleUnif = DepthPrecisionFilter._stateSet.getUniformList().errorScale.getUniform();

            this._sceneTexture = this._composer.children[0]._attachments[Object.keys(this._composer.children[0]._attachments)[0]].texture;
            this._cameraRTT = this._composer.children[0];
            this._cameraRTT.setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );

            this._effectRoot = new osg.Node();
            this._effectRoot.addChild( this._composer );
        },

        buildGui: function ( mainGui ) {

            var folder = mainGui.addFolder( this.name );
            folder.open();
			   folder.add( this, 'errorScale', [1.0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15, 1e16, 1e17, 1e18] ).onChange( function ( value ) {
                console.log(value);
				this._errorScaleUnif.set(Number(value));
            }.bind(this) );

        }
    };


    window.postScenes.push( DepthEffect );
} )();
