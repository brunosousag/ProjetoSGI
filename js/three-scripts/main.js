import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ===============================
// TEXTURAS OAK VENEER (POLY HAVEN)
// ===============================

const texLoader = new THREE.TextureLoader();
const exrLoader = new EXRLoader();



// ... (existing texture loads) ...

// ===============================
// CENA / RENDERER / CÂMARA
// ===============================

const cena = new THREE.Scene();
cena.background = new THREE.Color(0xeeeeee);
let misturador = new THREE.AnimationMixer(cena);
let acaoDustCoverOpenClose
let acaoRotateDisk
let acaoPickupInOut
let dustCoverOpenClose = false
let pickUpOpen = false
let pickRotateDisk = 0

const threeCanvas = document.getElementById('three-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas: threeCanvas,
  antialias: true
});
renderer.outputColorSpace = THREE.SRGBColorSpace; // Makes colors accurate and brighter
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Prevents blown out highlights
renderer.toneMappingExposure = 1.2; // Increase exposure for brightness

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


const pmremGenerator = new THREE.PMREMGenerator(renderer);
cena.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
camera.position.set(0.739, 0.356, -0.038);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Iluminação - Balanced for brightness
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Reduced ambient slightly to let Hemisphere take over
cena.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5); // High intensity Hemisphere Light
hemiLight.position.set(0, 20, 0);
cena.add(hemiLight);

// ===============================
// POST-PROCESS
// ===============================

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(cena, camera);
composer.addPass(renderPass);

const size = new THREE.Vector2();
renderer.getSize(size);

const outlinePass = new OutlinePass(size, cena, camera);
outlinePass.edgeStrength = 5.0;
outlinePass.edgeGlow = 1.5;
outlinePass.edgeThickness = 2.0;
outlinePass.visibleEdgeColor.set('#1E90FF');
outlinePass.hiddenEdgeColor.set('#1E90FF');
outlinePass.overlay = true;
composer.addPass(outlinePass);

const effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(effectFXAA);

// ===============================
// OBJETOS INTERATIVOS / BASE
// ===============================

let objsCena = [];
let vinylBaseMesh = null;
let vinylBaseOriginalMaterial = null;

let vinylRecordMesh = null;
let vinylRecordOriginalMaterial = null;

// ===============================
// AUDIO PLAYER
// ===============================

const vinylTracks = {
  'yellow': 'musics/LOFIN - scars [NCS Release].mp3',
  'blue': 'musics/KREZUS, Surreal_dvd - Fireflies [NCS Release].mp3',
  'green': 'musics/SRY, Toxic Joy - Walk Away [NCS Release].mp3',
  'original': 'musics/Jazz Music.mp3'
};

let currentAudio = new Audio();
let isPlaying = false;
let currentVinylOption = 'original'; // Track active selection

function setupMusicControl() {
  const volSlider = document.getElementById('volume-slider');

  // Set default audio track
  currentAudio.src = vinylTracks['original'];
  currentAudio.volume = 0.3; // Default loudness

  if (volSlider) {
    volSlider.value = 0.3; // Sync UI
    volSlider.addEventListener('input', (e) => {
      currentAudio.volume = e.target.value;
    });
  }
}


new GLTFLoader().load(
  new URL('../../models/RecordPlayer.gltf', import.meta.url).href,
  (gltf) => {
    const model = gltf.scene;
    // Rodar o modelo para ficar de frente para a câmara (ajuste de -90 graus)
    // Se estava virado para trás com PI/2, vamos rodar para o outro lado
    model.rotation.y = -Math.PI / 2;
    cena.add(gltf.scene);

    let DustCoverOpenClose = THREE.AnimationClip.findByName(gltf.animations, "DustCoverOpenClose")
    acaoDustCoverOpenClose = misturador.clipAction(DustCoverOpenClose)



    let RotateDisk = THREE.AnimationClip.findByName(gltf.animations, "RotateDisk")
    acaoRotateDisk = misturador.clipAction(RotateDisk)
    acaoRotateDisk.play()
    acaoRotateDisk.paused = true


    let PickupInOut = THREE.AnimationClip.findByName(gltf.animations, "PickupInOut")
    acaoPickupInOut = misturador.clipAction(PickupInOut)

    model.traverse((obj) => {

      // Debug: Log naming to find the chassis
      console.log("Object found:", obj.name, "| Type:", obj.type);

      if (["Pickup", "DustCover", "VinylBase"].includes(obj.name)) {
        objsCena.push(obj);
      }

      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        if (obj.name === "Base") {
          vinylBaseMesh = obj;
          // guarda o material original para opção "Original"
          vinylBaseOriginalMaterial = obj.material.clone();
        }

        if (obj.name === "VinylDisk") {
          vinylRecordMesh = obj;
          vinylRecordOriginalMaterial = obj.material.clone();

          // Fix rendering artifact with cover
          if (obj.material) {
            obj.material.transparent = false;
            obj.material.alphaTest = 0.5;
            obj.material.depthWrite = true;
            obj.material.needsUpdate = true;
          }
        }

        if (obj.material && obj.name !== "VinylDisk") { // Skip VinylDisk here to preserve manual settings
          if (obj.material.opacity < 1 || obj.material.transparent || obj.material.transmission > 0) {
            obj.material.transparent = true;
            // FIX: depthWrite needs to be false for glass-like objects so we can see through them properly
            // especially when looking from behind.
            obj.material.depthWrite = false;

          }
          obj.material.needsUpdate = true;
        }
      }
    });

    // CENTRALIZAR CENA
    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    const sizeBox = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeBox.x, sizeBox.y, sizeBox.z);

    model.position.sub(center);

    // Offset model upwards to avoid being covered by bottom controls
    model.position.y += maxDim * 0.15;

    // VISTA DE CIMA (45-60 graus) para ver o vinil "de frente"
    camera.position.set(0, maxDim * 0.8, maxDim * 1.2);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    console.log("Modelo carregado.");

    // Add finished event listener to mixer for auto-play
    misturador.addEventListener('finished', (e) => {
      if (e.action === acaoPickupInOut) {
        // If the pickup moved onto the record (timeScale was 1)
        if (acaoPickupInOut.timeScale > 0) {
          if (currentAudio.src && currentAudio.src !== window.location.href && !isPlaying) {
            currentAudio.play().catch(err => console.error("Error playing:", err));
            isPlaying = true;
          }
        }
      }
    });

    setupTextureDropdown();
    setupVinylDropdown();
    setupMusicControl();
  },
  undefined,
  (error) => {
    console.error('Erro ao carregar GLB:', error);
  }
);

// ===============================
// DROPDOWN DE TEXTURAS
// ===============================

function setupTextureDropdown() {
  if (!vinylBaseMesh) {
    console.warn("VinylBase não encontrado no modelo.");
    return;
  }

  const links = document.querySelectorAll('#base-dropdown a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const option = link.dataset.texture;
      applyTextureOption(option);
    });
  });
}

function setupVinylDropdown() {
  if (!vinylRecordMesh) {
    console.warn("VinylRecord não encontrado no modelo.");
    return;
  }

  const links = document.querySelectorAll('#vinyl-dropdown a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const option = link.dataset.vinyl;
      applyVinylOption(option);
    });
  });
}

function applyTextureOption(option) {
  if (!vinylBaseMesh) return;

  switch (option) {
    case 'wood-light': {
      const tex = texLoader.load('images/textures/wood_light.jpg', () => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        vinylBaseMesh.material = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.6,
          metalness: 0.05,
          side: THREE.DoubleSide,
          transparent: false,
          depthWrite: true
        });
        vinylBaseMesh.material.needsUpdate = true;
      });
      break;
    }

    case 'marble': {
      const tex = texLoader.load('images/textures/marble.jpg', () => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        vinylBaseMesh.material = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.3,
          metalness: 0.2,
          side: THREE.DoubleSide,
          transparent: false,
          depthWrite: true
        });
        vinylBaseMesh.material.needsUpdate = true;
      });
      break;
    }

    case 'original':
    default:
      if (vinylBaseOriginalMaterial) {
        vinylBaseMesh.material = vinylBaseOriginalMaterial;
        vinylBaseMesh.material.needsUpdate = true;
      }
      break;
  }
}

function applyVinylOption(option) {
  if (!vinylRecordMesh) return;

  // Don't restart if already selected
  if (option === currentVinylOption) return;

  // Stop everything when changing vinyl ONLY IF pickup is closed (preparing for auto-play)
  // If pickup is OPEN, we keep rotation but update the track immediately
  if (!pickUpOpen) {
    acaoRotateDisk.paused = true;
    currentAudio.pause();
    isPlaying = false;
  }

  currentVinylOption = option;

  // Check if we are reverting to original
  if (option === 'original') {
    if (vinylRecordOriginalMaterial) {
      vinylRecordMesh.material = vinylRecordOriginalMaterial.clone();
    }
    updateMusicForVinyl('original');

    // If needle is already on the record, play the new track automatically
    if (pickUpOpen && !isPlaying) {
      currentAudio.play().catch(err => console.error("Error playing original track:", err));
      isPlaying = true;
    }
    return;
  }

  updateMusicForVinyl(option);

  // Define texture path based on option
  let texturePath = '';
  switch (option) {
    case 'blue':
      texturePath = 'images/vinis/vinil-azul.png';
      break;
    case 'green':
      texturePath = 'images/vinis/vinil-verde.png';
      break;
    case 'yellow':
      texturePath = 'images/vinis/vinil-amarelo.png';
      break;
    default:
      return;
  }

  // Load new texture
  texLoader.load(texturePath, (tex) => {
    // Process texture to make it round (clip to circle)
    const roundTexture = clipToCircle(tex.image);
    roundTexture.colorSpace = THREE.SRGBColorSpace;
    roundTexture.flipY = false;

    // Link texture transforms to original to ensure centering matches
    if (vinylRecordOriginalMaterial && vinylRecordOriginalMaterial.map) {
      roundTexture.flipY = vinylRecordOriginalMaterial.map.flipY;
      roundTexture.offset.copy(vinylRecordOriginalMaterial.map.offset);
      roundTexture.repeat.copy(vinylRecordOriginalMaterial.map.repeat);
      roundTexture.center.copy(vinylRecordOriginalMaterial.map.center);
      roundTexture.rotation = vinylRecordOriginalMaterial.map.rotation;
    }

    const newMat = new THREE.MeshStandardMaterial({
      map: roundTexture,
      transparent: false, // Changed to false to avoid sorting issues
      alphaTest: 0.5,     // Use alphaTest for cutout
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1
    });

    // NOTE: Removed alphaMap logic as it was causing the "gray/invisible" issue.
    // Transparency is formatted by roundTexture now.

    vinylRecordMesh.material = newMat;
    vinylRecordMesh.material.needsUpdate = true;

    // If needle is already on the record, play the new track automatically
    if (pickUpOpen && !isPlaying) {
      currentAudio.play().catch(err => console.error("Error playing new track:", err));
      isPlaying = true;
    }
  });
}

function updateMusicForVinyl(option) {
  const track = vinylTracks[option];

  // Stop current music
  currentAudio.pause();
  currentAudio.currentTime = 0;
  isPlaying = false;

  if (track) {
    currentAudio.src = track;
  } else {
    currentAudio.src = "";
  }
}



// ===============================
// RAYCAST + OUTLINE
// ===============================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersected = raycaster.intersectObjects(objsCena, true);

  if (intersected.length > 0) {
    let selectedObj = intersected[0].object;

    while (selectedObj.parent && !objsCena.includes(selectedObj)) {
      selectedObj = selectedObj.parent;
    }

    outlinePass.selectedObjects = objsCena.includes(selectedObj) ? [selectedObj] : [];
  } else {
    outlinePass.selectedObjects = [];
  }
});


const mouseDown = new THREE.Vector2();

window.addEventListener('mousedown', (event) => {
  mouseDown.x = event.clientX;
  mouseDown.y = event.clientY;
});

window.addEventListener('click', interacaoLeitor)

function interacaoLeitor(event) {
  // Check distance moved
  const dist = Math.sqrt(
    Math.pow(event.clientX - mouseDown.x, 2) +
    Math.pow(event.clientY - mouseDown.y, 2)
  );

  // If moved more than 5 pixels, consider it a drag/orbit and ignore click
  if (dist > 5) return; // Drag threshold

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersected = raycaster.intersectObjects(objsCena, true);

  if (intersected.length > 0) {

    let selectedObj = intersected[0].object;

    while (selectedObj.parent && !objsCena.includes(selectedObj)) {
      selectedObj = selectedObj.parent;
    }

    if (selectedObj.name === "DustCover") {

      acaoDustCoverOpenClose.clampWhenFinished = true
      acaoDustCoverOpenClose.setLoop(THREE.LoopOnce)

      if (!dustCoverOpenClose) {
        acaoDustCoverOpenClose.timeScale = 1
        acaoDustCoverOpenClose.paused = false
        acaoDustCoverOpenClose.play()
      } else {
        acaoDustCoverOpenClose.timeScale = -1
        acaoDustCoverOpenClose.paused = false
        acaoDustCoverOpenClose.play()
      }

      dustCoverOpenClose = !dustCoverOpenClose
    }


    if (selectedObj.name == "Pickup") {

      acaoPickupInOut.clampWhenFinished = true
      acaoPickupInOut.setLoop(THREE.LoopOnce)

      if (!pickUpOpen) {
        acaoPickupInOut.timeScale = 1
        acaoPickupInOut.paused = false
        acaoPickupInOut.play()

        if (!pickRotateDisk) {
          acaoRotateDisk.reset()
          acaoRotateDisk.setLoop(THREE.LoopRepeat)
          pickRotateDisk++
        } else {
          acaoRotateDisk.paused = false
        }

        acaoRotateDisk.startAt(misturador.time + 2.5)


      } else {
        acaoRotateDisk.paused = true;

        // Stop music immediately when removing pickup
        if (isPlaying) {
          currentAudio.pause();
          isPlaying = false;
        }

        acaoPickupInOut.timeScale = -1
        acaoPickupInOut.paused = false
        acaoPickupInOut.play()
      }

      pickUpOpen = !pickUpOpen

    }

    if (selectedObj.name == "VinylBase") {

      if (!pickUpOpen) {
        acaoRotateDisk.paused = !acaoRotateDisk.paused
        acaoRotateDisk.setLoop(THREE.LoopOnce)
        acaoRotateDisk.reset()
        pickRotateDisk = 0
      }



    }

  }

}



// ===============================
// RESIZE
// ===============================

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
  outlinePass.setSize(width, height);

  if (effectFXAA) {
    effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
  }
});

// ===============================
// LOOP
// ===============================

let delta = 0
let latencia_minima = 1 / 60
const clock = new THREE.Clock();

function animar() {
  requestAnimationFrame(animar);
  delta += clock.getDelta()

  if (delta < latencia_minima) {
    return
  }

  const excedente = delta % latencia_minima
  const latenciaDiscreta = delta - excedente
  //misturador.update(Math.floor(delta/latencia_minima)*latencia_minima)
  misturador.update(latenciaDiscreta)
  controls.update();
  composer.render(latenciaDiscreta);

  delta = delta % latencia_minima
}

animar();

function clipToCircle(image) {
  const canvas = document.createElement('canvas');
  const size = Math.min(image.width, image.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Calculate center and radius
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;

  // Draw circular clipping path
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Draw image inside the circle
  ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// Listen for overlay close event from product.html
window.addEventListener('vinyl-overlay-closed', () => {
  if (currentAudio && isPlaying) {
    currentAudio.pause();
    isPlaying = false;
  }
});
