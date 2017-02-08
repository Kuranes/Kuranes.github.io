( function () {
    'use strict';

    window.OSG.globalify();

    var osg = window.osg;
    var osgUtil = window.osgUtil;
    var osgShader = window.osgShader;

    // the update callback gets near/far
    var CullCallback = function ( target ) {
        this._target = target;
        this.cull = function ( node, nv ) {

            // see ShadowTechnique CameraCullCallback
            node.traverse( nv );


            if ( nv.getComputeNearFar() === true && nv.getComputedFar() >= nv.getComputedNear() ) {
                this._target._nearFar[ 0 ] = nv.getComputedNear();
                this._target._nearFar[ 0 ] = this._target._nearFar[ 0 ] < 0.0001 ? 0.0001 : this._target._nearFar[ 0 ];
                this._target._nearFar[ 1 ] = nv.getComputedFar();

                this._target._nearFarUnif.set( this._target._nearFar );
            }
            return true;
        };
    };


    var ShadowEffect = {

        name: 'Shadow',

        getInputTexture: function () {
            return this._inputs;
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

            // update near far for depth buffer reconstruction
            this._nearFarUnif.set( this._nearFar );
            //
            this._projectionMatrix = this._cameraRTT.getProjectionMatrix();
                        
            osg.Matrix.transformVec4(this._projectionMatrix, this._lightDir, this._lightViewDir );   
            
            this._sceneProjectionMatrixUnif.set(this._projectionMatrix);
            this._lightViewDirUnif.set(this._lightViewDir);
        },

        updateCamera: function ( projection, view ) {

            osg.Matrix.copy( projection, this._cameraRTT.getProjectionMatrix() );
            osg.Matrix.copy( view, this._cameraRTT.getViewMatrix() );
            
            
            
        },
        updateTransNode: function ( x ) {
            osg.Matrix.makeRotate( x, 0, 0, 1, this._transNode.getMatrix() );
            osg.Matrix.makeRotate( x, 0, 0, 1, this._transNode1.getMatrix() );
        },

        createScene: function () {

            /// DEPTH
            var result = this._helper.commonScene( this._helper._rttSize, osg.Camera.PRE_RENDER, this._helper._model, false );
            this._commonNode = result[ 0 ];
            this._sceneTexture = result[ 1 ];
            this._cameraRTT = result[ 2 ];
            this._transNode = result[ 3 ];

            this._cameraRTT.setCullCallback( new CullCallback( this ) );

            this._cameraRTT.removeChild( this._helper.backGround );
            this._cameraRTT.setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );

            // MODEL ONLY, NORMAL RENDER
            var result1 = this._helper.commonScene( this._helper._rttSize, osg.Camera.PRE_RENDER, this._helper._model, false );
            this._commonNode1 = result1[ 0 ];
            this._sceneTexture1 = result1[ 1 ];
            this._cameraRTT1 = result1[ 2 ];
            this._transNode1 = result1[ 3 ];



            this._inputs = [ this._sceneTexture, this._sceneTexture1 ];
        },

        createFinalTexture: function () {

            this._finalTexture = new osg.Texture();
            this._finalTexture.setTextureSize( this._helper._rttSize[ 0 ], this._helper._rttSize[ 1 ] );

            this._finalTexture.setMinFilter( 'NEAREST' );
            this._finalTexture.setMagFilter( 'NEAREST' );

        },

        buildComposer: function ( helper ) {
            this._helper = helper;
            this.createScene();

            this._nearFar = [ 0.0001, 200.0 ];
            
            this._nearFarUnif = osg.Uniform.createFloat2( this._nearFar, 'NearFar' );
            
            this._lightDir =  [ 0.0, 1.0, 0.0, 0.0]; 
            this._lightViewDir =   [ 0.0, 1.0, 0.0, 0.0];            
            this._lightViewDirUnif = osg.Uniform.createFloat4( this._lightViewDir, 'LightViewDir' );
            
            this._sceneProjectionMatrix = new Array(16);
            this._sceneProjectionMatrixUnif = osg.Uniform.createMatrix4( this._sceneProjectionMatrix, 'SceneProjectionMatrix' );

            this._projectionMatrix = this._cameraRTT.getProjectionMatrix();


            var st;

            this._cameraRTT.removeChild( this._helper.backGround );
            this._cameraRTT.setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );

            st = this._cameraRTT.getOrCreateStateSet();
            var program = this._helper.getShaderProgram( 'depthVert', 'depthFrag', [], false );
            st.setAttributeAndModes( program );
            st.addUniform( this._nearFarUnif );

            
            var shadowFilter = new osgUtil.Composer.Filter.Custom(
                osgShader.ShaderProcessor.instance.getShader( 'ssshadow.frag' ), 
                {
                    'Texture3': this._sceneTexture,
                    'Texture4': this._sceneTexture1
                }
            );
        
            this.createFinalTexture();

            this._composer = new osgUtil.Composer();
            this._composer.addPass( shadowFilter, this._finalTexture );
            this._composer.build();

            st = this._composer.getChildren()[0].getStateSet();
            st.addUniform( this._nearFarUnif );
            st.addUniform(this._sceneProjectionMatrixUnif);
            st.addUniform(this._lightViewDirUnif);
            
            //alphaBlendFilter.camera.setRenderOrder( osg.Camera.NESTED_RENDER, 0 );

            this._effectRoot = new osg.Node();
            this._effectRoot.addChild( this._commonNode );
            this._effectRoot.addChild( this._commonNode1 );
            this._effectRoot.addChild( this._composer );
            
        },

        buildGui: function ( mainGui ) {

            var folder = mainGui.addFolder( this.name );
            folder.open();

        }
    };


    window.postScenes.push( ShadowEffect );
} )();
