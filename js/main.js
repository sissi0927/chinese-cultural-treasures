import * as THREE from 'three';
import { GLTFLoader }      from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

const modelData = {
  fan: {
    name: "Chinese Round Fan",
    shortName: "Fan",
    path: "model/Chinese Fan/fan.glb",
    theme: "Decorative Heritage",
    material: "Wood, patterned surface, tassel detail",
    style: "Elegant Chinese aesthetics",
    description:
      "The Chinese round fan is presented here as a symbol of elegance, refinement, and decorative heritage. Within the exhibition, it represents the grace and restraint often associated with Chinese classical aesthetics.",
    context:
      "In Chinese visual culture, the fan carries both practical and symbolic meaning. It is linked with poise, cultivated taste, and gentle expression, and frequently appears in painting, costume, and decorative imagery.",
    concept:
      "This object was selected for its balance, symmetry, and visual delicacy. Its circular silhouette and ornamental surface make it an effective emblem of traditional Chinese design language."
  },
  panda: {
    name: "Symbolic Panda",
    shortName: "Panda",
    path: "model/Panda/panda.glb",
    theme: "National Symbol",
    material: "Smooth matte surface, black-and-white contrast",
    style: "Soft and simplified form",
    description:
      "The panda is presented as a symbol of warmth, familiarity, and cultural identity. Within the exhibition, it offers a gentler and more approachable dimension of Chinese representation.",
    context:
      "Although simpler in form than the fan or hairpin, the panda holds strong cultural meaning. It connects the exhibition to Chinese natural imagery, national symbolism, and international recognition.",
    concept:
      "This object was chosen to balance the more ornate pieces with softness, friendliness, and emotional accessibility, making the collection feel more open and human."
  },
  hairpin: {
    name: "Classical Hairpin",
    shortName: "Hairpin",
    path: "model/Pin/pin.glb",
    theme: "Classical Ornament",
    material: "Gold-toned metal, jade-like accent",
    style: "Refined ornamental design",
    description:
      "The hairpin is presented as an example of traditional Chinese adornment and decorative craftsmanship. In the exhibition, it represents intricacy, ceremonial beauty, and the richness of historical ornament.",
    context:
      "Hair ornaments in Chinese tradition often suggest refinement, identity, artistry, and social elegance. This object reflects those associations through its ornamental structure and precious material language.",
    concept:
      "This object was selected as the most intricate piece in the collection. It adds detail, delicacy, and a stronger sense of classical ceremonial beauty to the exhibition."
  }
};

const container      = document.getElementById("model-container");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText    = document.getElementById("loading-text");

const nameEl              = document.getElementById("current-model-name");
const descEl              = document.getElementById("model-description");
const contextEl           = document.getElementById("model-context");
const conceptEl           = document.getElementById("model-concept");
const themeEl             = document.getElementById("meta-theme");
const materialEl          = document.getElementById("meta-material");
const styleEl             = document.getElementById("meta-style");
const selectedModelStatus = document.getElementById("selected-model-status");
const wireframeStatus     = document.getElementById("wireframe-status");
const lightStatus         = document.getElementById("light-status");
const cameraStatus        = document.getElementById("camera-status");
const audioStatus         = document.getElementById("audio-status");

const modelButtons = document.querySelectorAll(".model-btn");
const zoneCards    = document.querySelectorAll(".zone-card");

const initW = container.clientWidth  || 600;
const initH = container.clientHeight || 420;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(initW, initH);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f1e6);

const camera = new THREE.PerspectiveCamera(45, initW / initH, 0.01, 1000);
camera.position.set(0, 0, 4);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const roomEnv    = new RoomEnvironment();
const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
scene.environment = envTexture;
roomEnv.dispose();
pmremGenerator.dispose();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
controls.minDistance    = 0.5;
controls.maxDistance    = 20;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff4e0, 3.5);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.visible = false;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd0e8ff, 2.0);
fillLight.position.set(-4, 2, -3);
fillLight.visible = false;
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffe8c0, 1.2);
rimLight.position.set(0, -3, -5);
rimLight.visible = false;
scene.add(rimLight);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(initW, initH),
  0.40,
  0.50,
  0.90
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const bloomPresets = {
  hairpin: { strength: 0.40, radius: 0.50, threshold: 0.90 },
  fan:     { strength: 0.08, radius: 0.30, threshold: 0.98 },
  panda:   { strength: 0.08, radius: 0.30, threshold: 0.98 }
};

function applyBloomPreset(key) {
  const p = bloomPresets[key] || bloomPresets.fan;
  bloomPass.strength  = p.strength;
  bloomPass.radius    = p.radius;
  bloomPass.threshold = p.threshold;
}

let currentModelKey  = "fan";
let wireframeOn      = false;
let mainLightOn      = false;
let isRotating       = false;
let isFloating       = false;
let floatClock       = new THREE.Clock();
let loadedModels     = {};
let activeModelGroup = null;

function normaliseModel(gltfScene) {
  const box1   = new THREE.Box3().setFromObject(gltfScene);
  const size1  = box1.getSize(new THREE.Vector3());
  const maxDim = Math.max(size1.x, size1.y, size1.z);
  const scale  = 2.0 / (maxDim || 1);
  gltfScene.scale.setScalar(scale);

  const pivot = new THREE.Group();
  pivot.add(gltfScene);

  const box2    = new THREE.Box3().setFromObject(pivot);
  const centre2 = box2.getCenter(new THREE.Vector3());
  gltfScene.position.sub(centre2);

  return pivot;
}

const loader = new GLTFLoader();

function showOverlay(text) {
  loadingText.textContent = text;
  loadingOverlay.classList.remove("hidden");
}

function hideOverlay() {
  loadingOverlay.classList.add("hidden");
}

function loadModel(key, onReady) {
  if (loadedModels[key]) { onReady(loadedModels[key]); return; }

  showOverlay("Loading model…");
  loader.load(
    modelData[key].path,
    (gltf) => {
      const pivot = normaliseModel(gltf.scene);
      pivot.visible = false;
      scene.add(pivot);
      loadedModels[key] = pivot;
      onReady(pivot);
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        loadingText.textContent = `Loading… ${Math.round(xhr.loaded / xhr.total * 100)}%`;
      }
    },
    (err) => {
      console.error(`Failed to load ${modelData[key].path}:`, err);
      loadingText.textContent = "Failed to load model.";
    }
  );
}

function switchToModel(key) {
  if (activeModelGroup) activeModelGroup.visible = false;
  isRotating = false;
  isFloating = false;
  currentModelKey = key;

  loadModel(key, (pivot) => {
    applyWireframe(pivot, wireframeOn);
    applyBloomPreset(key);
    pivot.visible    = true;
    activeModelGroup = pivot;
    setCameraPreset("Front");
    hideOverlay();
    updateUI(key);
  });
}

function applyWireframe(group, state) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => { m.wireframe = state; });
  });
}

const cameraPresets = {
  Front: new THREE.Vector3(0, 0, 4),
  Side:  new THREE.Vector3(4, 0, 0),
  Top:   new THREE.Vector3(0, 4, 0)
};

function setCameraPreset(name) {
  const pos = cameraPresets[name];
  if (!pos) return;
  camera.position.copy(pos);
  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();
  cameraStatus.textContent = name;
}

function updateUI(key) {
  const data = modelData[key];
  if (!data) return;
  nameEl.textContent              = data.name;
  descEl.textContent              = data.description;
  contextEl.textContent           = data.context;
  conceptEl.textContent           = data.concept;
  themeEl.textContent             = data.theme;
  materialEl.textContent          = data.material;
  styleEl.textContent             = data.style;
  selectedModelStatus.textContent = data.shortName;

  modelButtons.forEach(btn =>
    btn.classList.toggle("active-btn", btn.dataset.model === key)
  );
  zoneCards.forEach(card =>
    card.classList.toggle("active-zone", card.dataset.model === key)
  );
}

function setLights(on) {
  mainLightOn = on;
  if (on) {
    ambientLight.intensity = 1.2;
    keyLight.visible       = true;
    fillLight.visible      = true;
    rimLight.visible       = true;
  } else {
    ambientLight.intensity = 2.0;
    keyLight.visible       = false;
    fillLight.visible      = false;
    rimLight.visible       = false;
  }
  lightStatus.textContent = on ? "On" : "Off";
}

modelButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.model && btn.dataset.model !== currentModelKey) {
      switchToModel(btn.dataset.model);
    }
  });
});

zoneCards.forEach(card => {
  card.addEventListener("click", () => {
    if (card.dataset.model && card.dataset.model !== currentModelKey) {
      switchToModel(card.dataset.model);
    }
  });
});

document.getElementById("rotateBtn")?.addEventListener("click", () => {
  isRotating = true;
  isFloating = false;
});

document.getElementById("floatBtn")?.addEventListener("click", () => {
  isFloating = true;
  isRotating = false;
  floatClock = new THREE.Clock();
});

document.getElementById("stopBtn")?.addEventListener("click", () => {
  isRotating = false;
  isFloating = false;
});

document.getElementById("resetBtn")?.addEventListener("click", () => {
  isRotating = false;
  isFloating = false;
  if (activeModelGroup) {
    activeModelGroup.rotation.set(0, 0, 0);
    activeModelGroup.position.set(0, 0, 0);
    wireframeOn = false;
    applyWireframe(activeModelGroup, false);
    wireframeStatus.textContent = "Off";
  }
  setLights(false);
  setCameraPreset("Front");
});

document.getElementById("wireframeBtn")?.addEventListener("click", () => {
  wireframeOn = !wireframeOn;
  if (activeModelGroup) applyWireframe(activeModelGroup, wireframeOn);
  wireframeStatus.textContent = wireframeOn ? "On" : "Off";
});

document.getElementById("lightBtn")?.addEventListener("click", () => {
  setLights(!mainLightOn);
});

document.getElementById("frontViewBtn")?.addEventListener("click", () => setCameraPreset("Front"));
document.getElementById("sideViewBtn")?.addEventListener("click",  () => setCameraPreset("Side"));
document.getElementById("topViewBtn")?.addEventListener("click",   () => setCameraPreset("Top"));

const bgm = document.getElementById("bgm");
let audioOn = false;

document.getElementById("audioBtn")?.addEventListener("click", () => {
  if (!bgm) return;
  if (audioOn) {
    bgm.pause();
    audioOn = false;
    audioStatus.textContent = "Off";
  } else {
    bgm.volume = 0.4;
    bgm.play().catch(() => {});
    audioOn = true;
    audioStatus.textContent = "On";
  }
});

new ResizeObserver(() => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
}).observe(container);

function animate() {
  requestAnimationFrame(animate);

  if (activeModelGroup) {
    if (isRotating) {
      activeModelGroup.rotation.y += 0.008;
    }
    if (isFloating) {
      const t = floatClock.getElapsedTime();
      activeModelGroup.position.y  = Math.sin(t * 1.2) * 0.12;
      activeModelGroup.rotation.y += 0.004;
      activeModelGroup.rotation.z  = Math.sin(t * 0.7) * 0.04;
    }
  }

  controls.update();
  composer.render();
}

animate();
switchToModel("fan");
