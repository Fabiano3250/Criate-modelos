import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';

const box = document.getElementById('dente3d');
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) { box.classList.add('sem3d'); throw e; }

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
box.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
cam.position.set(0, 0.05, 9.4);
cam.lookAt(0, -0.2, 0);

// luzes quentes, como no estúdio da referência
const key = new THREE.DirectionalLight(0xfff1e0, 2.2); key.position.set(-3, 4, 4); scene.add(key);
const rim = new THREE.DirectionalLight(0xff9a4d, 3.2); rim.position.set(4, 1.5, -3); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffd2a8, 0.9); fill.position.set(2, -2, 3); scene.add(fill);
scene.add(new THREE.HemisphereLight(0xfff6ec, 0xf08a3c, 0.6));

const grupo = new THREE.Group(); scene.add(grupo);

/* ---------- coroa (molar) ---------- */
const perfil = [
  [0.00, 0.40], [0.25, 0.43], [0.48, 0.50], [0.66, 0.56], [0.82, 0.52], [0.94, 0.40],
  [1.01, 0.22], [1.02, 0.02], [0.97, -0.20], [0.87, -0.42], [0.75, -0.60], [0.65, -0.72], [0.60, -0.76]
].map(([r, y]) => new THREE.Vector2(r, y));
const coroaGeo = new THREE.LatheGeometry(new THREE.SplineCurve(perfil).getPoints(90), 220);
{
  const p = coroaGeo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = Math.hypot(v.x, v.z), th = Math.atan2(v.z, v.x);
    const lobo = Math.cos(4 * th);            // 4 cúspides
    const topo = THREE.MathUtils.smoothstep(v.y, 0.05, 0.5); // só em cima
    // lobos laterais suaves
    const k = 1 + 0.05 * lobo * THREE.MathUtils.smoothstep(v.y, -0.5, 0.3);
    v.x *= k * 1.06; v.z *= k * 0.96;
    // cúspides altas e sulco no meio
    v.y += topo * (0.11 * lobo * THREE.MathUtils.smoothstep(r, 0.35, 0.85) - 0.07 * Math.exp(-r * r * 6));
    // cintura levemente estreita
    p.setXYZ(i, v.x, v.y, v.z);
  }
  coroaGeo.computeVertexNormals();
}
const esmalte = new THREE.MeshPhysicalMaterial({
  color: 0xfbf8f4, roughness: 0.16, metalness: 0,
  clearcoat: 1, clearcoatRoughness: 0.06,
  sheen: 0.6, sheenColor: new THREE.Color(0xffe6d0), sheenRoughness: 0.5,
  specularIntensity: 0.9, ior: 1.6
});
const coroa = new THREE.Mesh(coroaGeo, esmalte);
coroa.position.y = 0.66; coroa.scale.set(1.08, 1.12, 1.08);
grupo.add(coroa);

/* ---------- colar dourado (pilar) ---------- */
const ouro = new THREE.MeshPhysicalMaterial({ color: 0xd99868, metalness: 1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.15 });
const colarPerfil = [[0.0, 0.0], [0.62, 0.0], [0.64, 0.03], [0.64, 0.33], [0.6, 0.36], [0.56, 0.38], [0.0, 0.38]].map(([r, y]) => new THREE.Vector2(r, y));
const colar = new THREE.Mesh(new THREE.LatheGeometry(colarPerfil, 160), ouro);
colar.position.y = -0.52; grupo.add(colar);
const friso = new THREE.Mesh(new THREE.TorusGeometry(0.645, 0.012, 16, 160), new THREE.MeshPhysicalMaterial({ color: 0xffd9b0, metalness: 1, roughness: 0.12 }));
friso.rotation.x = Math.PI / 2; friso.position.y = -0.3; grupo.add(friso);

/* ---------- parafuso de vidro ---------- */
const vidro = new THREE.MeshPhysicalMaterial({
  color: 0xffe6cf, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.35, ior: 1.45,
  attenuationColor: new THREE.Color(0xf7b27a), attenuationDistance: 2.4, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true
});
const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.27, 0.98, 96, 1, true), vidro);
nucleo.position.y = -1.08; grupo.add(nucleo);
const tampa = new THREE.Mesh(new THREE.CircleGeometry(0.3, 64), vidro); tampa.rotation.x = Math.PI / 2; tampa.position.y = -1.605; grupo.add(tampa);
// rosca: hélice em volta do cone
class Helice extends THREE.Curve {
  getPoint(t, alvo = new THREE.Vector3()) {
    const voltas = 7, y = 0.46 - t * 0.92, r = 0.39 - t * 0.1, a = t * voltas * Math.PI * 2;
    return alvo.set(Math.cos(a) * r, y, Math.sin(a) * r);
  }
}
const rosca = new THREE.Mesh(new THREE.TubeGeometry(new Helice(), 700, 0.034, 16, false), vidro);
rosca.position.y = -1.08; grupo.add(rosca);

grupo.position.y = 0.15;
grupo.rotation.set(-0.06, -0.5, 0.05);

/* ---------- tamanho, movimento ---------- */
function ajustar() {
  const w = box.clientWidth, h = box.clientHeight;
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.position.z = w < 560 ? 12 : 9.4; cam.updateProjectionMatrix();
}
new ResizeObserver(ajustar).observe(box); ajustar();

let alvoX = 0, alvoY = 0;
addEventListener('pointermove', e => { alvoX = (e.clientX / innerWidth - 0.5); alvoY = (e.clientY / innerHeight - 0.5); }, { passive: true });

let visivel = true;
new IntersectionObserver(es => { visivel = es[0].isIntersecting; }).observe(box);

const t0 = performance.now();
function quadro(now) {
  requestAnimationFrame(quadro);
  if (!visivel) return;
  const t = (now - t0) / 1000;
  if (!reduz) {
    grupo.position.y = 0.15 + Math.sin(t * 1.1) * 0.08;
    grupo.rotation.y += ((-0.5 + Math.sin(t * 0.35) * 0.45 + alvoX * 0.5) - grupo.rotation.y) * 0.04;
    grupo.rotation.x += ((-0.06 + alvoY * 0.15) - grupo.rotation.x) * 0.04;
  }
  renderer.render(scene, cam);
}
requestAnimationFrame(quadro);
box.classList.add('pronto');
