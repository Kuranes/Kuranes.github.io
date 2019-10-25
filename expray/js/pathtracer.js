let renderer;
let controls;
let scene;

const camera = new THREE.LensCamera();
camera.position.set(64, 32, 16);
camera.fov = 65;
camera.aperture = 0.2;

const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = "absolute";
stats.domElement.style.left = "0px";
stats.domElement.style.top = "0px";
document.body.appendChild(stats.domElement);

init();

window.addEventListener("resize", resize);

var model;
var uiCallbacks;
var envmap;
var envMapLDR;

function switchWebGL() {
  if (!model) return;
  initWebGL(envMapLDR, model);
}
function switchRaytrace() {
  if (!model) return;
  initRayTracing(envMap, model);
}

uiCallbacks = {
  WebGL: function() {
    switchWebGL();
  },
  RayTracing: function() {
    switchRaytrace();
  }
};

let container;
container = document.getElementById("viewer");
//let canvas;

function changeZoom() {
  if (!renderer) return;

  const width = renderer.domElement.parentElement.clientWidth;
  const height = renderer.domElement.parentElement.clientHeight;

  var object = model;

  object.updateMatrixWorld();
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());

  controls.reset();

  object.position.x += object.position.x + center.x;
  object.position.y += object.position.y + center.y;
  object.position.z += object.position.z + center.z;

  controls.maxDistance = size * 10;
  camera.near = size / 100;
  camera.far = size * 100;
  camera.updateProjectionMatrix();

  camera.position.copy(center);
  camera.position.x += size; // 5.0;
  camera.position.y += size; //  5.0;
  camera.position.z += size; //  5.0;
  camera.lookAt(center);

  controls.saveState();
}

function centerModel() {
  if (!renderer) return;

  const width = renderer.domElement.parentElement.clientWidth;
  const height = renderer.domElement.parentElement.clientHeight;

  var mX = (event.clientX / width) * 2 - 1;
  var mY = -(event.clientY / height) * 2 + 1;
  var vector = new THREE.Vector3(mX, mY, 1);
  vector.unproject(camera);
  vector.sub(camera.position);
  camera.position.addVectors(camera.position, vector.setLength(factor));
  controls.target.addVectors(controls.target, vector.setLength(factor));
}

async function init() {
  //canvas = document.createElement("canvas");

  const [envMapa, envMapLDRa] = await Promise.all([
    load(THREE.RGBELoader, "textures/envmap.hdr"),
    load(THREE.TextureLoader, "textures/envmap.jpg")
    //load(THREE.GLTFLoader, 'scene.gltf'),
  ]);
  envMap = envMapa;
  envMapLDR = envMapLDRa;
  scene = new THREE.Scene();

  const gui = new dat.GUI();
  gui.add(uiCallbacks, "WebGL");
  gui.add(uiCallbacks, "RayTracing");

  resize();

  // THREE.DefaultLoadingManager.onLoad = tick;
  tick();
}

function loadGtlfModel(modelPaths, scene) {
  let modelPath = modelPaths[scene];
  //const [gltf] = await Promise.all([load(THREE.GLTFLoader, modelPath)]);
  gltf = new THREE.GLTFLoader();
  gltf.load(modelPath, function(gltf) {
    //Normalize scene scale
    var TARGET_SIZE = 20;
    var bbox = new THREE.Box3().setFromObject(gltf.scene);
    var maxSide = Math.max(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.min.z
    );
    var ratio = TARGET_SIZE / maxSide;
    gltf.scene.scale.set(ratio, ratio, ratio);

    //Center scene
    var centerX =
      bbox.min.x * ratio * -1 - ((bbox.max.x - bbox.min.x) / 2) * ratio;
    var centerY = bbox.min.y * ratio * -1;
    var centerZ =
      bbox.min.z * ratio * -1 - ((bbox.max.z - bbox.min.z) / 2) * ratio;
    gltf.scene.translateX(centerX);
    gltf.scene.translateY(centerY);
    gltf.scene.translateZ(centerZ);

    //model.scale.set(0.5, 0.5, 0.5);
    //model.rotateY(Math.PI / 2);

    model = gltf.scene;

    changeZoom();

    model.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // only necessary for WebGLRenderer
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.material && child.material.name == "LensesMat") {
        child.material.transparent = true;
      }
    });

    uiCallbacks = {
      WebGL: () => initWebGL(envMapLDR, model),
      RayTracing: () => initRayTracing(envMap, model)
    };

    uiCallbacks.RayTracing();
    // uiCallbacks.WebGL();
    tick();
  });

  //document.querySelector("#loading").remove();
}

function resize() {
  if (renderer && renderer.domElement.parentElement) {
    const width = renderer.domElement.parentElement.clientWidth;
    const height = renderer.domElement.parentElement.clientHeight;
    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function tick() {
  if (!controls) return requestAnimationFrame(tick);
  controls.update();
  camera.focus = controls.target.distanceTo(camera.position);
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(tick);
}

function initWebGL(envMapLDR, model) {
  unloadRenderer(renderer);
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  initRenderer(renderer);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.add(model);

  const dirLight = new THREE.DirectionalLight(0xff3300, 0.3);
  dirLight.target.position = controls.target;
  scene.add(dirLight.target);
  dirLight.target.position.set(0, 20, 0);
  dirLight.castShadow = true;
  dirLight.position.setFromSphericalCoords(100, -1.31, 4.08);
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambLight);

  // const helper = new THREE.CameraHelper(dirLight.shadow.camera);
  // scene.add(helper);

  const equiToCube = new THREE.EquirectangularToCubeGenerator(envMapLDR);
  const cubeMap = equiToCube.renderTarget;
  const cubeMapTexture = equiToCube.update(renderer);

  scene.traverse(child => {
    if (child.material) {
      child.material.envMap = cubeMapTexture;
    }
  });

  scene.background = cubeMap;
}

function initRayTracing(envMap, model) {
  unloadRenderer(renderer);
  renderer = new THREE.RayTracingRenderer();
  initRenderer(renderer);

  scene = new THREE.Scene();

  scene.add(model);

  const envLight = new THREE.EnvironmentLight(envMap);
  scene.add(envLight);
}

function initRenderer(renderer) {
  container.appendChild(renderer.domElement);
  resize();

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0, 20, 0);

  renderer.gammaOutput = true;
  renderer.gammaFactor = 2.2;
  renderer.setPixelRatio(1.0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.renderWhenOffFocus = false;
}

function unloadRenderer(renderer) {
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
  if (controls) {
    controls.dispose();
  }
}

function load(loader, url) {
  return new Promise(resolve => {
    const l = new loader();
    l.load(url, resolve, undefined, exception => {
      throw exception;
    });
  });
}
