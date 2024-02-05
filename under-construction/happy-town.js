import * as THREE from "https://esm.sh/three@0.161.0";
import * as THREE_STDLIB from "https://esm.sh/three-stdlib@2.29.4?deps=three@0.161.0";

// setup scene
const scene = new THREE.Scene();
scene.background = new THREE.Color("yellow");

// setup camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-10, 10, 10);

// setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// setup light
// const light = new THREE.PointLight(
//   new THREE.Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear(),
//   80,
//   200
// );
// light.position.set(10, 20, 10);
// light.castShadow = true;
// light.castShadow = true;
// light.shadow.mapSize.width = 512;
// light.shadow.mapSize.height = 512;
// light.shadow.camera.near = 0.5;
// light.shadow.camera.far = 500;
// scene.add(light);

// White directional light at half intensity shining from the top.
var light = new THREE.DirectionalLight(0xffffff, 1.25);
light.position.set(320, 400, 425);
light.target.position.set(0, 10, 0);
light.castShadow = true;
scene.add(light);

// ambient light
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

// const ambientLight = new THREE.AmbientLight(new THREE.Color("white"), 0.8); // soft white light
// scene.add(ambientLight);

const controls = new THREE_STDLIB.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;
controls.enableZoom = true;
controls.enablePan = true;

// // add hexagon
// let hexagon = new THREE.Mesh(
//   getHexagon(0, 0),
//   new THREE.MeshPhongMaterial({ color: "skyblue" })
// );

// camera.lookAt(hexagon.position);

// getNeighborCoordinates(0, 0).forEach(([x, y]) => {
//   let neighbor = new THREE.Mesh(
//     getHexagon(x, y),
//     new THREE.MeshPhongMaterial({ color: "gray" })
//   );
//   scene.add(neighbor);
// });

// hexagon.receiveShadow = true;
// hexagon.castShadow = true;

// scene.add(hexagon);

/**
 * @typedef {Record<string, string>} GameState
 */

/** @type {GameState} */
let data = {
  "0_0": "skyblue",
  "0_2": "green",
};

for (const [key, color] of Object.entries(data)) {
  scene.add(
    new THREE.Mesh(
      getHexagon(...keyToCoord(key)),
      new THREE.MeshPhongMaterial({ color })
    )
  );
}

for (const [x, y] of getClickableCoordinates(data)) {
  let outline = new THREE.Line(getHexagon(x, y));
  scene.add(outline);
}

controls.update();

// https://codesandbox.io/p/sandbox/hexagon-map-threejs-2croo?file=%2FHex.js
// https://codesandbox.io/p/sandbox/hexagon-map-threejs-2croo?

controls.addEventListener("change", () => {
  renderer.render(scene, camera);
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

function getHexagon(x, y) {
  const height = 0.25;
  let pos = getHexPosition(x, y);
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
  geo.translate(pos.x, height, pos.y);
  return geo;
}

function getHexagonOutline(x, y) {
  const height = 0.25;
  let pos = getHexPosition(x, y);
  let geo = new THREE.RingGeometry(0.8, 1, 6, 6);
  geo.translate(pos.x, height, pos.y);
  return geo;
}

function coordToKey(x, y) {
  return `${x}_${y}`;
}

/**
 * @returns [number, number]
 */
function keyToCoord(str) {
  let parts = str.split("_");
  if (parts.length !== 2) {
    throw new Error("oops");
  }
  return parts.map((p) => parseInt(p));
}

/**
 *
 * @param {GameState} state
 */
function getClickableCoordinates(state) {
  let clickable = new Set();
  let occupied = new Set(Object.keys(state));

  for (const key of occupied) {
    let neighbors = getNeighborKeys(key);
    for (const neighbor of neighbors) {
      if (!occupied.has(neighbor)) {
        clickable.add(neighbor);
      }
    }
  }

  return Array.from(clickable).map(keyToCoord);
}

function getNeighborKeys(key) {
  let [x, y] = keyToCoord(key);
  return getNeighborCoordinates(x, y).map(([x1, y1]) => coordToKey(x1, y1));
}

function getNeighborCoordinates(x, y) {
  if (y % 2 === 0) {
    return [
      [x - 1, y],
      [x, y + 1],
      [x + 1, y],
      [x + 1, y - 1],
      [x, y - 1],
      [x - 1, y + 1],
    ];
  } else {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x + 1, y + 1],
    ];
  }
}

function getHexPosition(x, y) {
  return new THREE.Vector2((x + (y % 2) * 0.5) * 1.77, y * 1.535);
}
