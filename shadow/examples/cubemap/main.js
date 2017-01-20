( function () {
    'use strict';

    
    // TODO align camera and mesh "center"
    // multiple cubemap + parallax correction
    
    var ExampleOSGJS = window.ExampleOSGJS;
    var P = window.P;
    var OSG = window.OSG;
    var osg = OSG.osg;
    var osgViewer = OSG.osgViewer;
    var osgDB = OSG.osgDB;

    // inherits for the ExampleOSGJS prototype
    var Example = function () {

        ExampleOSGJS.call( this );

        this._config = {
            live: false,
            env: false,
            reflection: true,
            refraction: false,
            anim: true
        };

        this._shaderNames = [
            'basicVS.glsl',
            'reflection.glsl',
            'cubemap.glsl'
        ];
        this._renderTextures = [];
        this._filterCheck = osg.Texture.NEAREST;

        this._movingModels = [];

        this._cameras = [];

        this._time = 0;

        this._sceneRoot = undefined;
        
        // Three Scenes
        // scene is normal scene with cubemap
        /*
          scene-----------------------|--------|-
          |                           |        |
          cubemap-camera-absolute     |        |
          |                           |        |
          mt                      spheres   model
          |
          background
        */
        this._scene = undefined;

        // relfectedScene is what is reflected on the centered model (cubemap + rotating spheres
        /*
          reflScene-----------------------|
          |                           |        
          |        
          |                           |        
          mt                      spheres   
          |
          background
        */
        this._reflectedScene = undefined;
        
        // envScene is showing the reflectionScene rendered as a cubemap
        /*
          envScene
          |                       
          |                                   
          mt                         
          |
          background
        */
        this._envScene = undefined;
        
        // useful for adding/removing the 6 cameras of the cubemap rendertarget at once
        this._cameras360Node = undefined;
        
    };

    Example.prototype = osg.objectInherit( ExampleOSGJS.prototype, {

        getReflectionShader: function () {
            
            var defines = [];
            
            if ( this._config[ 'live' ] )  defines.push('#define LIVE 1');
            if ( this._config[ 'reflection' ] )  defines.push('#define REFLECTIONS 1');
            if ( this._config[ 'refraction' ] )  defines.push('#define REFRACTIONS 1');
            
            return this.createShader( 'basicVS.glsl', [], 'reflection.glsl', defines );
            

        },
        getShaderBackground: function () {
            
            return this.createShader( 'basicVS.glsl', [], 'cubemap.glsl', [] );

        },
        getShaderLiveBackground: function () {

            var defines = [];            
            defines.push('#define LIVE 1');
            return this.createShader( 'basicVS.glsl', [], 'cubemap.glsl', defines );

        },

        getModel: function () {

            var node = new osg.MatrixTransform();
            node.setMatrix( osg.mat4.fromRotation( osg.mat4.create(), 0, [ 1, 0, 0 ] ) );

            osgDB.readNodeURL( '../media/models/material-test/file.osgjs' ).then( function ( model ) {
                node.addChild( model );
                this._viewer.getManipulator().computeHomePosition();
            }.bind( this ) );

            return node;

        },


        // Creates a scenegraph taht display a cubemap around the viewer camera
        // + Box
        // + cullcallback updating the box position, cubemaptrasform for shader
        // + updatecallback updating the view and projection matrix for the cubemap camera
        getCubeMap: function ( size, scene ) {

            // create the environment box
            var geom = osg.createTexturedBoxGeometry( 0, 0, 0,
                size, size, size );
            geom.getOrCreateStateSet().setAttributeAndModes( new osg.CullFace( 'DISABLE' ) );

            var cubemapTransform = osg.Uniform.createMatrix4( osg.mat4.create(), 'CubeMapTransform' );

            var mt = new osg.MatrixTransform();
            mt.setMatrix( osg.mat4.fromRotation( osg.mat4.create(), -Math.PI / 2.0, [ 1, 0, 0 ] ) );
            mt.addChild( geom );

            var CullCallback = function () {

                this.cull = function ( node, nv ) {

                    // overwrite matrix, remove translate so environment is always at camera origin
                    osg.mat4.setTranslation( nv.getCurrentModelViewMatrix(), [ 0, 0, 0 ] );
                    var m = nv.getCurrentModelViewMatrix();
                    osg.mat4.copy( cubemapTransform.getInternalArray(), m );
                    return true;

                };

            };
            mt.setCullCallback( new CullCallback() );
            scene.getOrCreateStateSet().addUniform( cubemapTransform );


            var cam = new osg.Camera();

            cam.setReferenceFrame( osg.Transform.ABSOLUTE_RF );
            cam.addChild( mt );

            // the update callback get exactly the same view of the camera
            // but configure the projection matrix to always be in a short znear/zfar range to not vary depend on the scene size
            var UpdateCallback = function ( viewer ) {

                this.update = function ( /*node, nv*/) {

                    var rootCam = viewer.getCamera();
                    var info = {};
                    osg.mat4.getPerspective( info, rootCam.getProjectionMatrix() );
                    var proj = [];
                    osg.mat4.perspective( proj, Math.PI / 180 * info.fovy, info.aspectRatio, 1.0, 100.0 );

                    cam.setProjectionMatrix( proj );
                    cam.setViewMatrix( rootCam.getViewMatrix() );

                    return true;

                };

            };

            cam.addUpdateCallback( new UpdateCallback( this._viewer ) );

            scene.addChild( cam );

            return geom;

        },

        // add 6 cameras + renderTarget around the camera
        // rendring into each cubemap face
        sceneTo360: function ( scene, position, sizeX, sizeY ) {

            var cubeTexture = new osg.TextureCubeMap( true );

            var aspectRatio = sizeX / sizeY;
            var fovY = 90 * Math.PI / 180;


            cubeTexture.setTextureSize( sizeX, sizeY );
            cubeTexture.setMinFilter( 'LINEAR' );
            cubeTexture.setMagFilter( 'LINEAR' );

            cubeTexture.setWrapS( osg.Texture.CLAMP_TO_EDGE );
            cubeTexture.setWrapT( osg.Texture.CLAMP_TO_EDGE );

            var viewport = new osg.Viewport( 0, 0, sizeX, sizeY );

            
            var camerasEyeDir = [
                [ 1, 0, 0 ],
                [ -1, 0, 0 ],

                [ 0, 1, 0 ],
                [ 0, -1, 0 ],

                [ 0, 0, 1 ],
                [ 0, 0, -1 ]
            ];

            var camerasEyeUp = [
                [ 0, -1, 0 ],
                [ 0, -1, 0 ],

                [ 0, 0, 1 ],
                [ 0, 0, -1 ],

                [ 0, -1, 0 ],
                [ 0, -1, 0 ]
            ];

            for ( var i = 0; i < 6; i++ ) {

                var cam = new osg.Camera();

                cam.addChild( scene );
                cam.setRenderOrder( osg.Camera.PRE_RENDER, 0 );
                cam.setReferenceFrame( osg.Transform.ABSOLUTE_RF );

                // view , eyePos, EyeDir, up
                cam.setViewMatrixAsLookAt( position, camerasEyeDir[ i ], camerasEyeUp[ i ] );

                osg.mat4.perspective( cam.getProjectionMatrix(), fovY, aspectRatio, 1.0, 1000.0 );

                cam.setViewport( viewport );
                cam.setClearColor( osg.vec4.fromValues( 1.0, 0, 0, 1.0 ) );

                this._cameras.push( cam );

                cam.attachTexture( osg.FrameBufferObject.COLOR_ATTACHMENT0, cubeTexture, osg.Texture.TEXTURE_CUBE_MAP_POSITIVE_X + i );

                // TODO: share/reuse between faces ? How ? ( Need a reference to the renderbufferobject to share )
                cam.attachRenderBuffer( osg.FrameBufferObject.DEPTH_ATTACHMENT, osg.FrameBufferObject.DEPTH_COMPONENT16 );
            }

            return cubeTexture;

        },
        
        enableLiveCubemap: function () {

            if (this._config['env']){
                this.enable360();
            }
            
            this._config[ 'live' ] = this._config[ 'live' ] ? false : true;            
            this._model.getOrCreateStateSet().setAttributeAndModes( this.getReflectionShader() );
                
            if ( this._config[ 'live' ] ) {

                this._model.getOrCreateStateSet().setTextureAttributeAndModes( 0, this._dynamicTextureCubeMap );
                this._sceneRoot.addChild( this._cameras360Node );


            } else {

                this._model.getOrCreateStateSet().setTextureAttributeAndModes( 0, this._textureCubeMap );
                this._sceneRoot.removeChild( this._cameras360Node );

            }


        },
        enableRefractions: function () {

            if (this._config['env']){
                this.enable360();
            }
            
            this._config[ 'refraction' ] = this._config[ 'refraction' ] ? false : true;   
            this._model.getOrCreateStateSet().setAttributeAndModes( this.getReflectionShader() );


        },
        enableReflections: function () {

            if (this._config['env']){
                this.enable360();
            }
            
            this._config[ 'reflection' ] = this._config[ 'reflection' ] ? false : true;   
            this._model.getOrCreateStateSet().setAttributeAndModes( this.getReflectionShader() );


        },

        enable360: function () {

            this._config[ 'env' ] = this._config[ 'env' ] ? false : true;

            if ( this._config[ 'env' ] ) {

                this._sceneRoot.removeChild( this._scene );
                this._sceneRoot.addChild( this._envScene );

                if (!this._config[ 'live']) {
                    this._sceneRoot.addChild( this._cameras360Node );
                }

            } else {

                this._sceneRoot.addChild( this._scene );
                this._sceneRoot.removeChild( this._envScene );

                if (!this._config[ 'live']) {
                    this._sceneRoot.removeChild( this._cameras360Node );
                }
            }


        },

        initDatGUI: function () {

            var gui = new window.dat.GUI();

            // ui
            gui.add( this, 'enableLiveCubemap' );
            gui.add( this, 'enableReflections' );
            gui.add( this, 'enableRefractions' );
            gui.add( this, 'enable360' );
            gui.add( this._config, 'anim' );

        },

        update: function ( /*node, nv*/) {

            if (!this._config['anim']) return true;
            
            this._time = ( this._time + 1 ) % 360;
            var rotRad = ( this._time * 0.0174533 ) * 0.001;
            
            var rotate = osg.mat4.fromRotation( osg.mat4.create(), -Math.PI * rotRad, [ 0, 0, 1 ] );
            osg.mat4.mul( this._spheres.getMatrix(), rotate, this._spheres.getMatrix() );
            
            return true;

        },

        createScene: function () {

            this.readShaders().then( this.createScenes.bind (this));
        },
        
        createScenes: function () {

            var sceneRoot = new osg.Node();
            this._sceneRoot = sceneRoot;
            this._root.addChild( sceneRoot );

            var scene = new osg.Node();
            this._scene = scene;
            var size = 250;

            var background = this.getCubeMap( size, scene );
            background.getOrCreateStateSet().setAttributeAndModes( new osg.CullFace( 'DISABLE' ) );
            background.getOrCreateStateSet().setAttributeAndModes( this.getShaderBackground() );


            var sphere = osg.createTexturedSphere( 1.0, 8, 6, 0, Math.PI * 2, 0, Math.PI );

            var sphereNode;
            var spheres = new osg.MatrixTransform();
            this._spheres = spheres;
            
            var scale = 60;
            for ( var i = 0; i < 25; i++ ) {

                sphereNode = new osg.MatrixTransform();
                sphereNode.setMatrix( osg.mat4.fromTranslation( osg.mat4.create(), 
                    [ -scale * Math.random() + scale * 0.5, 
                    -scale * Math.random() + scale * 0.5, 
                    -scale * Math.random() + scale * 0.5 ] ) );

                var material = new osg.Material();
                material.setDiffuse( [ Math.random(), Math.random(), Math.random(), 1.0 ] );
                sphereNode.getOrCreateStateSet().setAttributeAndModes( material );

                sphereNode.addChild( sphere );
                this._movingModels.push( sphereNode );

                spheres.addChild( sphereNode );

            }

            sceneRoot.addUpdateCallback( this );

            var model = this.getModel();
            var ss = model.getOrCreateStateSet()
            ss.setAttributeAndModes( this.getReflectionShader() );             
            ss.setRenderingHint( 'TRANSPARENT_BIN' );
            ss.setAttributeAndModes( new osg.BlendFunc( 'ONE', 'ONE_MINUS_SRC_ALPHA' ) );
            this._model = model;

            P.all( [

                osgDB.readImage( 'textures/posx.jpg' ),
                osgDB.readImage( 'textures/negx.jpg' ),

                osgDB.readImage( 'textures/posy.jpg' ),
                osgDB.readImage( 'textures/negy.jpg' ),

                osgDB.readImage( 'textures/posz.jpg' ),
                osgDB.readImage( 'textures/negz.jpg' )

            ] ).then( function ( images ) {

                var textureCubeMap = new osg.TextureCubeMap();
                this._textureCubeMap = textureCubeMap;


                textureCubeMap.setImage( 'TEXTURE_CUBE_MAP_POSITIVE_X', images[ 0 ] );
                textureCubeMap.setImage( 'TEXTURE_CUBE_MAP_NEGATIVE_X', images[ 1 ] );

                textureCubeMap.setImage( 'TEXTURE_CUBE_MAP_POSITIVE_Y', images[ 2 ] );
                textureCubeMap.setImage( 'TEXTURE_CUBE_MAP_NEGATIVE_Y', images[ 3 ] );

                textureCubeMap.setImage( 'TEXTURE_CUBE_MAP_POSITIVE_Z', images[ 4 ] );
                textureCubeMap.setImage( 'TEXTURE_CUBE_MAP_NEGATIVE_Z', images[ 5 ] );

                textureCubeMap.setMinFilter( 'LINEAR_MIPMAP_LINEAR' );

                background.getOrCreateStateSet().setTextureAttributeAndModes( 0, textureCubeMap );
                background.getOrCreateStateSet().addUniform( osg.Uniform.createInt1( 0, 'Texture0' ) );

                var reflScene = new osg.MatrixTransform();

                osg.mat4.fromRotation( reflScene.getMatrix(), -Math.PI / 2.0, [ 1.0, 0.0, 0.0 ] );

                var bgNode = new osg.MatrixTransform();
                bgNode.setMatrix( osg.mat4.fromRotation( osg.mat4.create(), -Math.PI / 2.0, [ 1, 0, 0 ] ) );

                bgNode.addChild( background );

                reflScene.addChild( bgNode );
                reflScene.addChild( spheres );

                var dynamicTextureCubeMap = this.sceneTo360( reflScene, osg.vec3.fromValues( 0.0, 0.0, 0.0 ), 1024, 1024 );

                var cameras360Node = new osg.Node();
                for ( var i = 0; i < 6; i++ ) {
                    cameras360Node.addChild( this._cameras[ i ] );
                }
                this._cameras360Node = cameras360Node;
                this._dynamicTextureCubeMap = dynamicTextureCubeMap;


                model.getOrCreateStateSet().addUniform( osg.Uniform.createInt1( 0, 'Texture0' ) );
                model.getOrCreateStateSet().setAttributeAndModes( this.getReflectionShader() );
                
                if ( this._config[ 'live' ] ) {                    
                    model.getOrCreateStateSet().setTextureAttributeAndModes( 0, dynamicTextureCubeMap );
                } else {
                    model.getOrCreateStateSet().setTextureAttributeAndModes( 0, textureCubeMap );
                }

                this.reflectedScene = reflScene;
                var envScene = new osg.MatrixTransform();
                var envNode = new osg.MatrixTransform();
                envNode.setMatrix( osg.mat4.fromRotation( osg.mat4.create(), -Math.PI / 2.0, [ 1, 0, 0 ] ) );
                envNode.addChild( background );
                envNode.getOrCreateStateSet().setTextureAttributeAndModes( 0, dynamicTextureCubeMap, osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED );
                envNode.getOrCreateStateSet().addUniform( osg.Uniform.createInt1( 0, 'Texture0' ) );
                envNode.getOrCreateStateSet().setAttributeAndModes( this.getShaderLiveBackground(), osg.StateAttribute.ON | osg.StateAttribute.OVERRIDE | osg.StateAttribute.PROTECTED );
                envScene.addChild( envNode );

                this._envScene = envScene;

                scene.addChild( model );
                scene.addChild( spheres );

                if ( this._config[ 'env' ] ) {

                    sceneRoot.addChild( envScene );

                } else {

                    sceneRoot.addChild( scene );

                }
                
                this._viewer.getManipulator().computeHomePosition();

            }.bind( this ) );



        }
    } );

    window.addEventListener( 'load', function () {

        var example = new Example();
        example.run();

    }, true );

} )();
