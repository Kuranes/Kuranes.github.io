( function () {
    'use strict';


    // globals
    var P = window.P;
    var $ = window.$;

    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var osgUtil = OSG.osgUtil;


    // inherits for the ExampleOSGJS prototype
    var Example = function () {

        ExampleOSGJS.call( this );

        this._textures = [];

        this._textureNames = [
            'lightfield/dragon.jpg',
            'lightfield/head.jpg',
            'lightfield/toys.jpg',
            'seamless/bricks1.jpg'
        ];
        this._lightfieldInfo = {

            dragon: {
                index: 0,
                uvScale: [ -8, 8 ],
                texSize: [ 2048, 2048 ]
            },
            head: {
                index: 1,
                uvScale: [ 17, 17 ],
                texSize: [ 6800, 6800 ]
            },
            toys: {
                index: 2,
                uvScale: [ -9, 9 ],
                texSize: [ 3600, 3600 ]
            },
            bricks: {
                index: 3,
                uvScale: [ 1, 1 ],
                texSize: [ 512, 512 ]
            }
        };
        this._lightfieldChoices = [ 'dragon', 'head', 'toy', 'bricks' ];

        this._algorithmChoices = [ 'uvTrick', 'Apterture', 'FocusView', 'Plenoptic' ],

            this._config = {
                lightfield: this._lightfieldChoices[ 0 ],
                algorithm: this._algorithmChoices[ 0 ]
            };

        this._shaderNames = [
            'basic_vertex.glsl',
            'uv_encode.glsl',
            'lightfield.glsl',
        ];
        this._filterCheck = osg.Texture.NEAREST;
        //_filterCheck = osg.Texture.LINEAR,

    };

    Example.prototype = osg.objectInherit( ExampleOSGJS.prototype, {

        createTextureRTT: function ( name, filter, type ) {
            var texture = new osg.Texture();
            texture.setInternalFormatType( type );
            texture.setTextureSize( this._canvas.width, this._canvas.height );

            texture.setInternalFormat( osg.Texture.RGBA );
            texture.setMinFilter( filter );
            texture.setMagFilter( filter );
            texture.setName( name );
            return texture;
        },

        createCameraRTT: function ( texture, is3D ) {
            var camera = new osg.Camera();
            camera.setName( is3D ? 'MainCamera' : 'composer2D' );
            camera.setViewport( new osg.Viewport( 0, 0, this._canvas.width, this._canvas.height ) );

            camera.setRenderOrder( osg.Camera.PRE_RENDER, 0 );
            camera.attachTexture( osg.FrameBufferObject.COLOR_ATTACHMENT0, texture, 0 );

            //
            //camera.setReferenceFrame( osg.Transform.ABSOLUTE_RF );

            if ( is3D ) {
                camera.attachRenderBuffer( osg.FrameBufferObject.DEPTH_ATTACHMENT, osg.FrameBufferObject.DEPTH_COMPONENT16 );
                camera.setClearColor( osg.Vec4.create( [ 0.0, 0.0, 0.1, 1.0 ] ) );
            } else {

                camera.setClearMask( 0 );

            }
            return camera;
        },

        createScene: function () {

            var group = new osg.MatrixTransform();
            group.setName( 'group' );

            var fragmentShader = this._shaderProcessor.getShader( 'uv_encode.glsl' );
            var vertexShader = this._shaderProcessor.getShader( 'basic_vertex.glsl' );

            var program = new osg.Program(
                new osg.Shader( 'VERTEX_SHADER', vertexShader ),
                new osg.Shader( 'FRAGMENT_SHADER', fragmentShader ) );

            program.trackAttributes = {};
            program.trackAttributes.attributeKeys = [];


            var size = 10;
            this._model = osg.createTexturedQuadGeometry( -size / 2, 0, -size / 2,
                size, 0, 0,
                0, 0, size );

            this._model.getOrCreateStateSet().setAttributeAndModes( program );
            this._model.getOrCreateStateSet().setAttributeAndModes( new osg.CullFace( 'DISABLE' ) );
            group.addChild( this._model );

            this.setLightfield( this._config[ 'lighfield' ] );
            return group;

        },

        setLightfield: function ( lighfieldName ) {
            if ( this._lightFieldStateSet ) {

                var lf = this._lightfieldInfo[ lighfieldName ];
                if ( lf && this._images.length > lf.index ) {

                    if ( !this._textures[ lf.index ] ) {

                        // ond demand texture load.
                        this._textures[ lf.index ] = osg.Texture.createFromImage( this._images[ lf.index ] );

                    }

                    var tex = this._textures[ lf.index ];
                    tex.setMinFilter( 'NEAREST' );
                    tex.setMagFilter( 'NEAREST' );

                    this._lightFieldStateSet.setTextureAttributeAndModes( 1, tex, osg.StateAttribute.ON );
                    this._uvScale.set( lf.uvScale );
                    this._texSize.set( lf.texSize );

                }
            }
        },

        createComposer: function ( sceneRTT ) {
            var composer = new osgUtil.Composer();
            composer.setName( 'lightfield composer' );

            var fragmentShader = this._shaderProcessor.getShader( 'lightfield.glsl' );

            this._uvScale = osg.Uniform.createFloat2(  [ 8.0, 8.0 ],'uvScale' );
            this._texSize = osg.Uniform.createFloat2( [ 1024, 1024 ], 'texSize' );
            this._uniforms = {
                'uvScale': this._uvScale,
                'texSize': this._texSize
            };
            this._lightFieldFilter = new osgUtil.Composer.Filter.Custom( fragmentShader, this._uniforms );


            this._lightFieldFilter.getOrCreateStateSet().setTextureAttributeAndModes( 0, sceneRTT );

            this._lightFieldFilter = composer.addPass( this._lightFieldFilter );
            this._lightFieldFilter.setFragmentName( 'LightField' );

            composer.renderToScreen( this._canvas.width, this._canvas.height );
            composer.build();

            // add input current Scene RTT
            this._lightFieldStateSet = this._lightFieldFilter.getStateSet();

            this._lightFieldStateSet.setTextureAttributeAndModes( 0, sceneRTT );
            this._lightFieldStateSet.setTextureAttributeAndModes( 1, sceneRTT );
            
            
                this._lightFieldStateSet.addUniform(  osg.Uniform.createInt1( 0, "Texture0" ));                
            this._lightFieldStateSet.addUniform(      osg.Uniform.createInt1( 1, "Texture1" ));
                
            this._lightFieldStateSet.addUniform( this._uvScale );
            this._lightFieldStateSet.addUniform( this._texSize );
            // get result
            //this._rttFinal = composer.getResultTexture();

            return composer;
        },

        initDatGUI: function () {
            var controller;

            this._gui = new window.dat.GUI();

            // add callbacks
            var self = this;

            this._config[ 'algorithmChoice' ] = function () {
                // 

            };
            this._config[ 'lightfieldChoice' ] = function ( choice ) {

                self.setLightfield( choice );

            };

            var gui = this._gui;

            controller = gui.add( this._config, 'lightfield', this._lightfieldChoices );
            controller.onChange( this._config.lightfieldChoice.bind( this._config ) );
            controller = gui.add( this._config, 'algorithm', this._algorithmChoices );
            controller.onChange( this._config.algorithmChoice.bind( this._config ) );
        },

        run: function () {
            this.setConfigFromOptionsURL();
            this._canvas = document.getElementById( 'View' );

            var manipulator;

            this._viewer = new osgViewer.Viewer( this._canvas, {

                antialias: false

            } );
            this._viewer.init();


            if ( manipulator ) this._viewer.setupManipulator( manipulator );
            else this._viewer.setupManipulator();

            this._viewer.setLightingMode( osgViewer.View.LightingMode.NO_LIGHT );

            this._root = new osg.MatrixTransform();

            // rotating cube  scene
            this._rttScene = this.createTextureRTT( 'sceneRTT',
                this._filterCheck,
                osg.Texture.UNSIGNED_BYTE );
            this._renderTextures.push( this._rttScene );


            var cameraScene = this.createCameraRTT( this._rttScene, true );
            //        cameraScene.setComputeNearFar( false );
            //var m = cameraScene.getViewMatrix();
            //osg.Matrix.makeRotate( -90, 0.0, 1.0, 0.0, m );

            cameraScene.setViewMatrix( [ 0.9713379748520664, -0.019981271743722256, 0.2368613252301647, 0, 0.2377026264269841, 0.08165062507829626, -0.9679001171681079, 0, -0, 0.9964606987753342, 0.08405995358179169, 0, 4.440892098500626e-16, -1.1102230246251565e-16, -11.443524880162046, 1 ] );

            var self = this;
            this.readTextures().then( function ( images ) {

                self._images = images;
                for ( var i = 0, l = images.length; i < l; i++ ) {
                    self._textures.push();
                }
                self.setLightfield( self._config[ 'lightfield' ] );

            } );

            this.readShaders().then( function () {

                var scene = self.createScene();
                cameraScene.addChild( scene );

                var composer;

                composer = self.createComposer( self._rttScene );

                var nodeCompo = new osg.Node();
                nodeCompo.addChild( composer );

                // add in correct order !
                self._root.addChild( cameraScene );
                self._root.addChild( nodeCompo );


                self._viewer.getCamera().setClearColor( [ 0.0, 0.0, 0.0, 0.0 ] );
                //self._viewer.getCamera().setClearMask( 0 );

                //self._viewer.setSceneData( nodeCompo );
                self._viewer.setSceneData( self._root );
                //                self._viewer.setSceneData( scene );

                self.initDatGUI();

                var camera = self._viewer.getCamera();
                camera.setName( 'scene' );

                camera.setComputeNearFar( false );

                manipulator = self._viewer.getManipulator();
                manipulator.computeHomePosition();

                // manipulate inside the RTT
                //manipulator.setNode( scene );
                //manipulator.setCamera( cameraScene );
                //manipulator.computeHomePosition();
                //manipulator.updateLookAt( .0 );
                // manipulator.setNode( self._quad );

                self._viewer.run();
            } );

        }

    } );





    window.addEventListener( 'load', function () {
        var example = new Example();
        example.run();
    }, true );

} )();
