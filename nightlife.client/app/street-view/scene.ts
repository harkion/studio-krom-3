import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { supabase } from "@/lib/supabase";
import { wrapStreetZ, streetArea, WORLD_LENGTH } from "./loop-path";

export type StoryData = {
  id: string | number;
  x: number;
  z: number;
  title: string;
  audio: string | null;
  // Optional narration metadata lets the interface label generated recordings.
  audio_status?: string | null;
  voice_id?: string | null;
  color: number;
  age: number | null;
  gender: string | null;
};

export function mountStreet(
  host: HTMLDivElement,
  storiesData: StoryData[],
  options: { preview?: boolean; onLoopComplete?: () => void; isSurveyOpen?: () => boolean } = {},
) {
  let disposed = false;
  let introTimer = 0;
  let fadeTimer = 0;
  const removers: (() => void)[] = [];
  function on(target: EventTarget, event: string, handler: EventListener) {
    target.addEventListener(event, handler);
    removers.push(() => target.removeEventListener(event, handler));
  }
  function element(id: string) {
    return host.querySelector<HTMLElement>(`#${id}`)!;
  }
  type Station = {
    id: string | number;
    x: number;
    z: number;
    title: string;
    audio: string | null;
    audio_status?: string | null;
    voice_id?: string | null;
    color: number;
    age: number | null;
    gender: string | null;
    mesh: THREE.Mesh;
    baseY: number;
    sound: THREE.PositionalAudio;
  };
  let started = false;
  const WALK_SPEED = 4.5;
  const TURN_SPEED = 1.5;
  const CHOICE_RANGE = 3.5;
  const FULL_VOLUME_DISTANCE = 2; // closer than this (metres): full volume
  const SILENT_DISTANCE = 8; // further than this (metres): no sound
  const scene = new THREE.Scene();

  const NIGHT = 0x7a6a85; // dusky warm purple
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.FogExp2(NIGHT, 0.025);

  const camera = new THREE.PerspectiveCamera(
    70,
    host.clientWidth / host.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 1.6, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.prepend(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xe0c8c0, 1.2));
  scene.add(new THREE.HemisphereLight(0xffe2c4, 0x5a4a50, 0.7));

  const placeholder = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, WORLD_LENGTH * 3 + 20),
    new THREE.MeshStandardMaterial({ color: 0x5a4f55 }), // warmer cobble tone
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -WORLD_LENGTH / 2;
  placeholder.add(floor);

  // =====================================================================
  // ENVIRONMENT: Station (0-80 m), Bar Street (80-160 m), Alley (160-240 m).
  // Areas come from streetArea() in loop-path.ts. Everything is built ONCE,
  // then merged per material with three copies of the loop (-L, 0, +L), so the
  // wrap has no visible seam and the whole scenery is only a few draw calls.
  // =====================================================================
  const WARM = 0xffc870;   // main window / lantern light
  const CREAM = 0xf0e0c8;  // window frames, trim
  const WOOD = 0x6a4a34;
  const IRON = 0x24242c;

  // ---- Materials ----
  const materialCache = new Map<string, THREE.Material>();
  const textures: THREE.Texture[] = [];
  function cached(key: string, make: () => THREE.Material) {
    if (!materialCache.has(key)) materialCache.set(key, make());
    return materialCache.get(key)!;
  }
  const solid = (color: number) =>
    cached(`s${color}`, () => new THREE.MeshStandardMaterial({ color }));
  // Two-sided: for thin curved shells (roofs, awnings) that are seen from below.
  const solid2 = (color: number) =>
    cached(`d${color}`, () => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
  // Glow = lit windows, neon, lamps. Basic materials ignore the scene lights.
  const glow = (color: number) =>
    cached(`g${color}`, () => new THREE.MeshBasicMaterial({ color }));
  // Soft see-through glow: light pools on the ground, halos around neon.
  const softGlow = (color: number, opacity: number) =>
    cached(`p${color}-${opacity}`, () => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
    }));
  const glass = () =>
    cached("glass", () => new THREE.MeshStandardMaterial({
      color: 0xbcd8e8, transparent: true, opacity: 0.28, depthWrite: false,
    }));
  const dim = (color: number, factor: number) =>
    new THREE.Color(color).multiplyScalar(factor).getHex();

  // Painted shop / neon sign (canvas texture). `vertical` stacks the letters.
  function signMaterial(text: string, fg: string, bg: string, vertical = false) {
    return cached(`t${text}${fg}${bg}${vertical}`, () => {
      const canvas = document.createElement("canvas");
      const W = vertical ? 128 : 512;
      const H = vertical ? 512 : 128;
      canvas.width = W;
      canvas.height = H;
      const g = canvas.getContext("2d")!;
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = fg;
      g.lineWidth = 4;
      g.strokeRect(8, 8, W - 16, H - 16);
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = fg;
      g.shadowBlur = 14;
      if (vertical) {
        const chars = [...text];
        const step = (H - 40) / chars.length;
        g.font = `bold ${Math.min(84, step * 0.8)}px sans-serif`;
        chars.forEach((ch, k) => g.fillText(ch, W / 2, 20 + step * (k + 0.5)));
      } else {
        let size = 90;
        g.font = `bold ${size}px sans-serif`;
        while (size > 16 && g.measureText(text).width > W - 50) {
          size -= 4;
          g.font = `bold ${size}px sans-serif`;
        }
        g.fillText(text, W / 2, H / 2 + 4);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return new THREE.MeshBasicMaterial({ map: texture });
    });
  }

  // ---- Geometry collection: everything is merged per material at the end ----
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function put(geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    ));
    if (!parts.has(material)) parts.set(material, []);
    parts.get(material)!.push(geometry);
  }
  function box(x: number, y: number, z: number, width: number,
    height: number, depth: number, material: THREE.Material) {
    put(new THREE.BoxGeometry(width, height, depth), material, x, y, z);
  }

  // x for a part stuck on the street-facing wall (the wall face is at |x| = 4).
  // `thickness` is how far it sticks out toward the street.
  const faceX = (side: number, thickness: number) => side * (4 - thickness / 2);

  // ---- Curved shapes ----
  // Cylinder lying along an axis (pipes, wheels, clock faces, round windows).
  function rod(axis: "x" | "y" | "z", x: number, y: number, z: number, radius: number,
    length: number, material: THREE.Material, segments = 10) {
    put(new THREE.CylinderGeometry(radius, radius, length, segments), material, x, y, z,
      axis === "z" ? Math.PI / 2 : 0, 0, axis === "x" ? Math.PI / 2 : 0);
  }
  // Vertical cone / pyramid / tapered cylinder.
  function taper(x: number, y: number, z: number, rTop: number, rBottom: number,
    height: number, material: THREE.Material, segments = 12, rotY = 0) {
    put(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material, x, y, z, 0, rotY, 0);
  }
  // Half of a vertical cylinder/cone bulging toward the street (bay windows, columns).
  function half(side: number, y: number, z: number, rTop: number, rBottom: number,
    height: number, material: THREE.Material) {
    put(new THREE.CylinderGeometry(rTop, rBottom, height, 14, 1, false,
      side > 0 ? Math.PI : 0, Math.PI), material, side * 4, y, z);
  }
  // Barrel vault running along the street: a curved roof (train roofs, canopies).
  function vaultZ(x: number, baseY: number, z: number, width: number, rise: number,
    depth: number, material: THREE.Material, segments = 16) {
    const R = (width * width / 4 + rise * rise) / (2 * rise);
    const halfAngle = Math.asin(Math.min(1, width / (2 * R)));
    put(new THREE.CylinderGeometry(R, R, depth, segments, 1, true, -halfAngle, halfAngle * 2),
      material, x, baseY + rise - R, z, -Math.PI / 2, 0, 0);
  }
  // Flat half-disc on a wall: the rounded top of a door or window.
  function archDisc(side: number, y: number, z: number, width: number,
    thickness: number, material: THREE.Material) {
    put(new THREE.CylinderGeometry(width / 2, width / 2, thickness, 18, 1, false, 0, Math.PI),
      material, faceX(side, thickness), y, z, 0, 0, Math.PI / 2);
  }
  // Curved (quarter-round) awning over a door or window.
  function awning(side: number, yTop: number, z: number, length: number,
    r: number, material: THREE.Material) {
    put(new THREE.CylinderGeometry(r, r, length, 10, 1, true,
      side > 0 ? -Math.PI / 2 : 0, Math.PI / 2), material, side * 4, yTop - r, z, -Math.PI / 2, 0, 0);
  }
  // Triangular gable roof, ridge running along the street (z).
  function roof(x: number, baseY: number, z: number, width: number,
    height: number, depth: number, material: THREE.Material) {
    const r = width / Math.sqrt(3);
    const geometry = new THREE.CylinderGeometry(r, r, depth, 3);
    geometry.scale(1, 1, height / (1.5 * r));
    put(geometry, material, x, baseY + height / 3, z, -Math.PI / 2, 0, 0);
  }
  // Neon ring or half ring (arch) on a wall, with a soft halo.
  function neonRing(side: number, y: number, z: number, radius: number,
    color: number, arc = Math.PI * 2) {
    const x = faceX(side, 0.1);
    put(new THREE.TorusGeometry(radius, 0.13, 6, 24, arc), softGlow(color, 0.2), x, y, z, 0, Math.PI / 2, 0);
    put(new THREE.TorusGeometry(radius, 0.04, 6, 24, arc), glow(color), x, y, z, 0, Math.PI / 2, 0);
  }
  // Flat picture (sign texture) facing the street, `wallX` is the |x| it sits at.
  function plane(side: number, wallX: number, y: number, z: number, width: number,
    height: number, material: THREE.Material) {
    put(new THREE.PlaneGeometry(width, height), material, side * wallX, y, z, 0, -side * Math.PI / 2, 0);
  }

  // ---- Shared pieces ----
  // Window: frame, glass, cross bars, and (optionally) stone sill and lintel.
  function windowAt(side: number, y: number, z: number, width: number, height: number,
    light: number | null, frame: number, trimmed = true) {
    const f = solid(frame);
    box(faceX(side, 0.1), y, z, 0.1, height + 0.2, width + 0.2, f);
    box(faceX(side, 0.15), y, z, 0.15, height, width, light === null ? solid(0x5a4048) : glow(light));
    box(faceX(side, 0.2), y, z, 0.2, height, 0.06, f);
    box(faceX(side, 0.2), y, z, 0.2, 0.06, width, f);
    if (trimmed) {
      box(faceX(side, 0.28), y - height / 2 - 0.14, z, 0.28, 0.07, width + 0.4, f);
      box(faceX(side, 0.18), y + height / 2 + 0.16, z, 0.18, 0.1, width + 0.35, f);
    }
  }
  // Window with a rounded top. `bottom` is the sill height.
  function archWindow(side: number, bottom: number, z: number, width: number, height: number,
    light: number | null, frame: number) {
    const r = width / 2;
    const spring = bottom + height - r;
    const rectH = spring - bottom;
    const f = solid(frame);
    const pane = light === null ? solid(0x5a4048) : glow(light);
    box(faceX(side, 0.1), bottom + rectH / 2 - 0.05, z, 0.1, rectH + 0.1, width + 0.2, f);
    archDisc(side, spring, z, width + 0.2, 0.1, f);
    box(faceX(side, 0.15), bottom + rectH / 2, z, 0.15, rectH, width, pane);
    archDisc(side, spring, z, width, 0.15, pane);
    box(faceX(side, 0.2), bottom + height / 2, z, 0.2, height, 0.06, f);
    box(faceX(side, 0.2), spring, z, 0.2, 0.06, width, f);
    box(faceX(side, 0.28), bottom - 0.08, z, 0.28, 0.08, width + 0.4, f);
    box(faceX(side, 0.22), spring + r + 0.1, z, 0.22, 0.14, 0.24, f);        // keystone
  }
  // Warm glow on the ground, e.g. under a door lantern.
  function pool(x: number, z: number, width: number, depth: number, color: number, opacity = 0.18) {
    box(x, 0.02, z, width, 0.01, depth, softGlow(color, opacity));
  }
  // Paving strips along both sides of the street.
  function sidewalk(z: number, color: number) {
    for (const s of [-1, 1]) {
      box(s * 3.3, 0.005, z, 1.4, 0.01, 6, solid(color));
      box(s * 2.62, 0.012, z, 0.08, 0.014, 6, solid(0xb0a090));              // kerb stone
    }
  }
  // String lights across the street, from wall to wall.
  function stringLights(z: number, y: number, color: number) {
    box(0, y, z, 8, 0.03, 0.03, solid(0x2a1a10));
    for (let k = -3; k <= 3; k++) {
      box(k * 1.1, y - 0.12, z, 0.12, 0.12, 0.12, glow(color));
      box(k * 1.1, y - 0.12, z, 0.4, 0.4, 0.4, softGlow(color, 0.1));
    }
  }
  // Old-fashioned street lamp with a glowing lantern.
  function lampPost(x: number, z: number, color: number) {
    const iron = solid(IRON);
    rod("y", x, 0.15, z, 0.11, 0.3, iron, 8);
    rod("y", x, 1.7, z, 0.045, 3.4, iron, 8);
    box(x, 3.55, z, 0.34, 0.1, 0.34, iron);
    box(x, 3.8, z, 0.26, 0.4, 0.26, glow(color));
    box(x, 3.8, z, 0.6, 0.6, 0.6, softGlow(color, 0.12));
    taper(x, 4.1, z, 0, 0.28, 0.25, iron, 4, Math.PI / 4);
    pool(x * 0.85, z, 2.2, 2.4, color, 0.12);
  }
  // Potted plant beside a door.
  function plant(side: number, z: number) {
    rod("y", faceX(side, 0.4), 0.25, z, 0.2, 0.5, solid(0xb0603a), 10);
    box(faceX(side, 0.45), 0.72, z, 0.45, 0.42, 0.45, solid(0x5a8a4a));
  }

  const FLOWER_COLORS = [0xff6b8a, 0xffc94a, 0xffffff, 0xff9a4a];

  const SEGMENTS = WORLD_LENGTH / 6; // 40 segments of 6 m
  let stationCount = 0;
  for (let i = 0; i < SEGMENTS; i++) if (streetArea(-i * 6) === "Station") stationCount++;

  // =====================================================================
  // ALLEY: a low-poly brick row. Salmon brick tenements with cream arched
  // windows and dentil cornices, black fire escapes, striped shop awnings,
  // rooftop water tanks, AC units, hydrants, mailboxes, dumpsters and
  // curved street lamps with pigeons.
  // =====================================================================
  const BRICK = [0xc4604a, 0xb85a4c, 0xd0705a, 0xa85a4c, 0xcc7a5c];
  const DOOR_COLORS = [0x9a2f2a, 0x2a6a6a, 0x3a5a8a, 0xc08a2a];
  const SHOPS: [string, string, string][] = [
    ["BOOKS & CO", "#f6e6d0", "#4a3426"],
    ["COFFEE", "#fff0c8", "#2a5a4a"],
    ["BAKERY", "#fff0d8", "#8a3a2a"],
    ["SHOP", "#e8f4ff", "#2a4a7a"],
  ];
  const BLADES = ["COFFEE", "BAKERY", "SHOP"];

  // Sign sticking out from the wall, readable from both directions.
  function bladeSign(side: number, y: number, z: number, width: number, height: number, mat: THREE.Material) {
    const x = side * 3.7;
    box(x, y, z, width, height, 0.06, solid(0x1c1a20));
    put(new THREE.PlaneGeometry(width - 0.08, height - 0.08), mat, x, y, z + 0.032, 0, 0, 0);
    put(new THREE.PlaneGeometry(width - 0.08, height - 0.08), mat, x, y, z - 0.032, 0, Math.PI, 0);
    box(side * 3.88, y + height / 2 - 0.1, z, 0.26, 0.04, 0.04, solid(IRON));
  }
  // Tall lamp with a curved arm over the street and two pigeons.
  function curvedLamp(side: number, z: number, color: number) {
    const x = side * 3.75;
    const iron = solid(0x4a2a34);
    rod("y", x, 0.15, z, 0.11, 0.3, iron, 8);
    rod("y", x, 2.2, z, 0.05, 4.4, iron, 8);
    taper(x, 4.55, z, 0, 0.09, 0.3, iron, 6);
    put(new THREE.BoxGeometry(1.4, 0.06, 0.06), iron, side * 3.1, 4.4, z, 0, 0, -side * 0.22);
    box(side * 2.45, 4.46, z, 0.5, 0.1, 0.34, glow(color));
    box(side * 2.45, 4.46, z, 0.8, 0.4, 0.6, softGlow(color, 0.12));
    box(side * 2.45, 4.6, z, 0.4, 0.06, 0.3, iron);
    for (const bz of [-0.15, 0.15]) {
      box(side * 3.15, 4.5, z + bz, 0.14, 0.1, 0.1, solid(0xf4f0ec));
      box(side * 3.12, 4.58, z + bz, 0.07, 0.07, 0.07, solid(0xf4f0ec));
    }
    pool(side * 2.6, z, 2.4, 2.4, color, 0.14);
  }
  // Black fire escape: two landings joined by a diagonal stair.
  function fireEscape(side: number, z: number, y1: number, y2: number) {
    const iron = solid(0x1c1a20);
    const x = side * 3.65;
    const rail = side * 3.3;
    [[y1, -1.7], [y2, 1.7]].forEach(([y, dz]) => {
      box(x, y, z + dz, 0.7, 0.06, 1.2, iron);
      box(rail, y + 0.9, z + dz, 0.05, 0.05, 1.2, iron);
      for (let m = 0; m < 4; m++) box(rail, y + 0.45, z + dz - 0.5 + m * 0.33, 0.03, 0.9, 0.03, iron);
      box(x, y + 0.9, z + dz + (dz < 0 ? -0.6 : 0.6), 0.7, 0.04, 0.04, iron);
    });
    const run = 2.2;
    const angle = Math.atan2(y2 - y1, run);
    const len = Math.hypot(run, y2 - y1);
    const ym = (y1 + y2) / 2;
    put(new THREE.BoxGeometry(0.6, 0.05, len), iron, x, ym, z, -angle, 0, 0);
    put(new THREE.BoxGeometry(0.04, 0.04, len), iron, rail, ym + 0.9, z, -angle, 0, 0);
    for (let m = 1; m < 6; m++) {                                               // steps
      const t = m / 6;
      box(x, y1 + (y2 - y1) * t + 0.03, z - run / 2 + run * t, 0.6, 0.03, 0.06, iron);
    }
    for (const lz of [-2.2, -1.9]) box(x, y1 - 0.8, z + lz, 0.04, 1.6, 0.04, iron); // hanging ladder
    for (let m = 0; m < 4; m++) box(x, y1 - 0.2 - m * 0.4, z - 2.05, 0.04, 0.04, 0.34, iron);
  }
  function hydrant(x: number, z: number) {
    const red = solid(0xb03a2e);
    rod("y", x, 0.3, z, 0.14, 0.6, red, 10);
    taper(x, 0.68, z, 0, 0.15, 0.16, red, 10);
    rod("x", x, 0.42, z, 0.06, 0.42, red, 8);
    rod("z", x, 0.3, z, 0.05, 0.36, red, 8);
  }
  function mailbox(x: number, z: number) {
    const blue = solid(0x3a5aa8);
    box(x, 0.35, z, 0.1, 0.7, 0.1, solid(0x2a3a6a));
    box(x, 0.95, z, 0.5, 0.5, 0.4, blue);
    rod("z", x, 1.2, z, 0.25, 0.4, blue, 12);
    box(x, 0.98, z + 0.21, 0.3, 0.05, 0.02, solid(0x15151c));
  }
  function trashCan(x: number, z: number) {
    rod("y", x, 0.35, z, 0.2, 0.7, solid(0x6a7078), 12);
    rod("y", x, 0.73, z, 0.22, 0.06, solid(0x5a6068), 12);
  }
  function dumpster(x: number, z: number) {
    box(x, 0.55, z, 0.95, 0.7, 1.7, solid(0x3a6aa8));
    put(new THREE.BoxGeometry(1.0, 0.06, 1.75), solid(0x2a4a7a), x, 0.93, z, 0, 0, 0.1);
    for (const wz of [-0.65, 0.65]) rod("x", x, 0.12, z + wz, 0.12, 0.08, solid(0x15151c), 8);
    put(new THREE.SphereGeometry(0.22, 8, 6), solid(0x15151a), x + 0.05, 1.05, z - 0.3);
    put(new THREE.SphereGeometry(0.2, 8, 6), solid(0x15151a), x - 0.1, 1.0, z + 0.4);
  }
  function crates(x: number, z: number) {
    const card = solid(0xc8a070);
    box(x, 0.25, z, 0.6, 0.5, 0.6, card);
    box(x + 0.05, 0.7, z + 0.05, 0.5, 0.4, 0.5, solid(0xd8b080));
    box(x, 0.25, z + 0.7, 0.5, 0.5, 0.5, solid(0xb89060));
  }

  function alleyHouse(side: number, i: number, z: number) {
    const n = i * 2 + (side > 0 ? 1 : 0);
    const h = 8.0 + (n % 3) * 0.6;
    const wallColor = BRICK[n % BRICK.length];
    const wall = solid(wallColor);
    const stone = solid(0x8a7a70);
    const trim = solid(CREAM);
    const dark = solid(0x2a2228);
    const iron = solid(0x1c1a20);
    const doorColor = DOOR_COLORS[n % DOOR_COLORS.length];
    const shop = n % 2 === 0;
    sidewalk(z, 0x6a5d68);

    // body, plinth, mortar courses and a few lighter / darker brick patches
    box(side * 5, h / 2, z, 2, h, 5, wall);
    box(faceX(side, 0.12), 0.45, z, 0.12, 0.9, 5.04, solid(0x5a4a52));
    for (let y = 1.2; y < h - 0.5; y += 0.8)
      box(faceX(side, 0.02), y, z, 0.02, 0.03, 5, solid(dim(wallColor, 0.7)));
    for (let k = 0; k < 9; k++) {
      const by = 1.3 + ((k * 37 + n * 11) % 60) / 10;
      const bz = z + (((k * 53 + n * 7) % 40) / 10 - 2);
      box(faceX(side, 0.03), by, bz, 0.03, 0.22, 0.5, solid(dim(wallColor, k % 2 ? 0.82 : 1.12)));
    }

    // dentil cornice, parapet with cream cap, tar roof
    box(faceX(side, 0.3), h - 0.12, z, 0.3, 0.24, 5.2, trim);
    for (let k = 0; k < 10; k++) box(faceX(side, 0.2), h - 0.42, z - 2.25 + k * 0.5, 0.2, 0.18, 0.22, trim);
    box(faceX(side, 0.25), h + 0.3, z, 0.25, 0.6, 5.2, wall);
    box(faceX(side, 0.35), h + 0.62, z, 0.35, 0.06, 5.3, trim);
    box(side * 5.9, h + 0.3, z, 0.2, 0.6, 5.2, wall);
    for (const dz of [-2.5, 2.5]) box(side * 5, h + 0.3, z + dz, 2, 0.6, 0.2, wall);
    box(side * 5, h + 0.02, z, 1.8, 0.04, 4.8, solid(0x3a3238));

    // rooftop: water tank / stair box with antenna / AC units
    const ry = h + 0.05;
    if (n % 3 === 0) {
      const tz = z - 0.8;
      for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]])
        rod("y", side * 5 + dx, ry + 0.6, tz + dz, 0.04, 1.2, iron, 6);
      rod("y", side * 5, ry + 2.0, tz, 0.8, 1.6, solid(0x9aa8bc), 16);
      rod("y", side * 5, ry + 1.6, tz, 0.82, 0.06, iron, 16);
      rod("y", side * 5, ry + 2.4, tz, 0.82, 0.06, iron, 16);
      taper(side * 5, ry + 3.25, tz, 0, 0.95, 0.9, solid(0x8a5a9a), 16);
      rod("y", side * 3.9, h / 2, z - 2.45, 0.05, h, solid(0x2a3a8a), 8);       // blue pipe
    } else if (n % 3 === 1) {
      box(side * 5.2, ry + 0.6, z + 0.3, 1.0, 1.2, 1.4, wall);
      roof(side * 5.2, ry + 1.2, z + 0.3, 1.1, 0.35, 1.5, solid(0x5a3a36));
      box(side * 4.68, ry + 0.55, z + 0.3, 0.05, 0.95, 0.5, solid(0x9aa0a8));
      box(side * 4.65, ry + 0.55, z + 0.5, 0.05, 0.08, 0.05, glow(0xffb02d));
      rod("y", side * 5.4, ry + 2.0, z + 0.3, 0.02, 1.2, iron, 6);               // antenna
      for (let k = 0; k < 3; k++) box(side * 5.4, ry + 1.8 + k * 0.22, z + 0.3, 0.02, 0.02, 0.9 - k * 0.2, iron);
    } else {
      box(side * 5, ry + 0.25, z + 1, 0.9, 0.5, 0.8, solid(0x9a9ea8));
      rod("y", side * 5, ry + 0.52, z + 1, 0.3, 0.04, iron, 12);
      box(side * 5.3, ry + 0.25, z - 1, 0.7, 0.5, 0.7, solid(0x7a7a84));
      rod("y", side * 5.5, ry + 0.8, z + 0.2, 0.09, 1.2, solid(0x7a7a84), 8);
    }

    // ground floor: shop with striped awning and painted sign, or a stoop house
    const dz = z + 1.7;
    const wz = z - 0.7;
    const lit = n % 7 === 0 ? null : WARM;
    if (shop) {
      const [text, fg, bg] = SHOPS[(n >> 1) % SHOPS.length];
      box(faceX(side, 0.1), 1.15, dz, 0.1, 2.3, 1.2, trim);
      box(faceX(side, 0.18), 1.05, dz, 0.18, 2.1, 0.95, solid(doorColor));
      box(faceX(side, 0.22), 1.55, dz, 0.22, 0.7, 0.5, glow(WARM));
      box(faceX(side, 0.26), 1.0, dz + 0.35, 0.26, 0.08, 0.08, solid(0xc8a038));
      box(faceX(side, 0.2), 2.6, dz, 0.2, 0.25, 0.2, glow(WARM));
      windowAt(side, 1.5, wz, 1.7, 1.3, lit, CREAM, false);
      for (let k = 0; k < 6; k++)
        awning(side, 2.9, wz - 0.79 + k * 0.317, 0.317, 0.5, solid2(k % 2 ? CREAM : 0xd04a4a));
      box(faceX(side, 0.1), 3.2, wz, 0.1, 0.5, 2.3, dark);
      plane(side, 3.89, 3.2, wz, 2.2, 0.42, signMaterial(text, fg, bg));
    } else {
      box(faceX(side, 0.1), 1.0, dz, 0.1, 2.0, 1.4, stone);
      archDisc(side, 2.0, dz, 1.4, 0.1, stone);
      box(faceX(side, 0.18), 0.95, dz, 0.18, 1.9, 1.0, solid(doorColor));
      archDisc(side, 1.9, dz, 1.0, 0.18, solid(doorColor));
      archDisc(side, 1.95, dz, 0.6, 0.22, glow(WARM));
      box(faceX(side, 0.22), 1.45, dz, 0.22, 0.5, 0.5, glow(WARM));
      box(faceX(side, 0.26), 1.0, dz + 0.35, 0.26, 0.08, 0.08, solid(0xc8a038));
      box(faceX(side, 0.5), 0.05, dz, 0.5, 0.1, 1.5, stone);
      box(faceX(side, 0.3), 0.1, dz, 0.3, 0.2, 1.4, stone);
      plant(side, dz + 1.0);
      windowAt(side, 1.6, z - 0.9, 1.1, 1.2, lit, CREAM);
      box(faceX(side, 0.3), 0.92, z - 0.9, 0.3, 0.2, 1.2, solid(WOOD));
      for (let m = 0; m < 3; m++)
        box(faceX(side, 0.25), 1.08, z - 0.9 + (m - 1) * 0.35, 0.15, 0.15, 0.15,
          solid(FLOWER_COLORS[(n + m) % FLOWER_COLORS.length]));
    }
    box(faceX(side, 0.08), 3.3, z, 0.08, 0.14, 5.02, trim);                      // string course

    // upper floors: arched cream windows, some with AC units
    [3.9, 5.9].forEach((bottom, f) => {
      [-1.05, 1.05].forEach((uz, k) => {
        const lt = (n + f * 3 + k) % 5 === 0 ? null : WARM;
        archWindow(side, bottom, z + uz, 0.9, 1.5, lt, CREAM);
        if ((n + f + k) % 3 === 0) {
          box(faceX(side, 0.55), bottom - 0.35, z + uz, 0.55, 0.45, 0.65, solid(0xe8e4dc));
          box(faceX(side, 0.58), bottom - 0.35, z + uz, 0.58, 0.3, 0.5, solid(0x8a8a92));
        }
      });
    });
    if (n % 3 !== 1) fireEscape(side, z, 3.75, 5.75);

    // blade sign
    if (n % 4 === 1)
      bladeSign(side, 3.0, z + 0.3, 0.6, 1.5, signMaterial(BLADES[(n >> 2) % BLADES.length], "#fff4dc", "#2a1a2a", true));

    // wall lantern and light on the pavement
    box(faceX(side, 0.2), 2.6, z - 2.0, 0.2, 0.28, 0.2, glow(WARM));
    box(faceX(side, 0.3), 2.6, z - 2.0, 0.3, 0.45, 0.35, softGlow(WARM, 0.12));
    pool(side * 3.0, z + 0.3, 2, 4, WARM);

    // street furniture
    if (n % 5 === 2) hydrant(side * 2.85, z + 2.0);
    if (n % 7 === 3) mailbox(side * 2.95, z - 1.8);
    if (n % 3 === 1) { trashCan(side * 3.7, z - 2.1); trashCan(side * 3.45, z - 1.85); }
    if (n % 6 === 5) dumpster(side * 3.4, z - 1.2);
    if (n % 4 === 3) crates(side * 3.6, z + 2.0);

    // the narrow gap to the next house: back wall and a curved street lamp
    box(side * 6.1, h / 2, z - 3, 0.3, h, 1.1, solid(0x4a3a40));
    if (i % 2 === 0) curvedLamp(side, z - 3, WARM);
  }

  // =====================================================================
  // BAR STREET: Miami neon at night. Concrete hotel towers with a vertical
  // neon sign, brick bars with a lit roof terrace and teal / pink neon
  // strips, low lounges with striped awnings, vending machines,
  // and metal barriers.
  // =====================================================================
  const NEON = [0xff2d95, 0x2de2ff, 0xa24bff, 0x3a7bff, 0x39ff88, 0xff7a2d, 0xff3a4a];
  const PINK = 0xff4fb0;
  const TEAL = 0x2de2c8;
  const BAR_WALLS = [0x1c1620, 0x161a24, 0x221a1c, 0x1a1a22, 0x201820];
  const BAR_TRIM = 0x3a3044;
  const DARK = 0x0a0a10;

  // Neon tube lying on a wall at |x| = wallX, with a soft halo (fake bloom).
  function tubeAt(side: number, wallX: number, y: number, z: number, height: number, length: number, color: number) {
    box(side * (wallX - 0.035), y, z, 0.07, height + 0.35, length + 0.35, softGlow(color, 0.22));
    box(side * (wallX - 0.07), y, z, 0.14, height, length, glow(color));
  }
  const tube = (side: number, y: number, z: number, height: number, length: number, color: number) =>
    tubeAt(side, 4, y, z, height, length, color);
  function neonFrame(side: number, y: number, z: number, width: number, height: number, color: number) {
    tube(side, y + height / 2, z, 0.08, width, color);
    tube(side, y - height / 2, z, 0.08, width, color);
    tube(side, y, z - width / 2, height, 0.08, color);
    tube(side, y, z + width / 2, height, 0.08, color);
  }
  // Cocktail-glass blade sign sticking out over the street.
  function cocktailSign(side: number, y: number, z: number, color: number) {
    const x = side * 3.775;
    box(x, y, z, 0.5, 1.3, 0.08, solid(DARK));
    box(x, y + 0.5, z, 0.45, 0.1, 0.12, glow(color));
    box(x, y + 0.35, z, 0.32, 0.1, 0.12, glow(color));
    box(x, y + 0.2, z, 0.18, 0.1, 0.12, glow(color));
    box(x, y - 0.05, z, 0.05, 0.4, 0.12, glow(color));
    box(x, y - 0.3, z, 0.28, 0.06, 0.12, glow(color));
  }
  // Round cafe table with three metal chairs.
  function terraceSet(side: number, tx: number, y0: number, tz: number) {
    const metal = solid(0xc8c8d0);
    rod("y", tx, y0 + 0.55, tz, 0.38, 0.04, solid(0xe8e4e0), 14);
    rod("y", tx, y0 + 0.27, tz, 0.03, 0.54, solid(0x9a9aa2), 6);
    rod("y", tx, y0 + 0.02, tz, 0.16, 0.04, solid(0x9a9aa2), 10);
    box(tx + 0.08, y0 + 0.62, tz + 0.05, 0.06, 0.1, 0.06, glow(0xff9a4a));         // drinks
    ([[0, -0.62, 0, -1], [0, 0.62, 0, 1], [side * 0.62, 0, side, 0]] as number[][]).forEach(([dx, dz, bx, bz]) => {
      const cx = tx + dx;
      const cz = tz + dz;
      box(cx, y0 + 0.45, cz, 0.34, 0.04, 0.34, metal);
      for (const lx of [-0.14, 0.14]) for (const lz of [-0.14, 0.14]) box(cx + lx, y0 + 0.22, cz + lz, 0.025, 0.44, 0.025, metal);
      if (bx !== 0) box(cx + bx * 0.17, y0 + 0.7, cz, 0.03, 0.4, 0.34, metal);
      else box(cx, y0 + 0.7, cz + bz * 0.17, 0.34, 0.4, 0.03, metal);
    });
  }
  function barrier(x: number, z: number, length: number) {
    const metal = solid(0x9a9aa6);
    box(x, 0.9, z, 0.03, 0.03, length, metal);
    box(x, 0.25, z, 0.03, 0.03, length, metal);
    for (let k = 0; k <= 6; k++) box(x, 0.58, z - length / 2 + (k / 6) * length, 0.02, 0.9, 0.02, metal);
    for (const fz of [-length / 2, length / 2]) box(x, 0.02, z + fz, 0.5, 0.04, 0.05, metal);
  }
  function vending(side: number, z: number) {
    box(faceX(side, 0.5), 0.9, z, 0.5, 1.8, 0.85, solid(0x2a2a34));
    box(side * 3.73, 1.1, z, 0.04, 1.1, 0.6, glow(0x9ad8ff));
    for (let k = 0; k < 4; k++) box(side * 3.71, 0.75 + k * 0.27, z, 0.03, 0.05, 0.55, solid(0x4a6a8a));
    box(side * 3.73, 0.3, z, 0.04, 0.2, 0.5, solid(0x15151c));
    pool(side * 3.1, z, 1.6, 1.6, 0x5a8aff, 0.2);
  }
  // Round pale-pink-lit pipe cluster, AC unit and duct on a roof.
  function roofAC(x: number, y: number, z: number) {
    box(x, y + 0.45, z, 1.1, 0.9, 1.3, solid(0x7a625a));
    rod("y", x, y + 0.92, z, 0.4, 0.04, solid(0x15151a), 14);
    rod("z", x + 0.1, y + 0.5, z - 1.5, 0.22, 1.8, solid(0x5a5a64), 12);
  }

  // ---- Hotel: grey concrete tower with a vertical neon sign ----
  function hotelTower(side: number, n: number, z: number, c1: number) {
    const h = 11;
    const concrete = solid(0x55525c);
    const seam = solid(0x3a3840);
    const dark = solid(DARK);
    box(side * 5, h / 2, z, 2, h, 5, concrete);
    box(faceX(side, 0.1), 0.35, z, 0.1, 0.7, 5.04, solid(0x2a2830));
    for (let k = 0; k < 7; k++) box(faceX(side, 0.03), 1.5 + k * 1.5, z, 0.03, 0.04, 5, seam);
    for (const sz of [-1.6, 0.4, 1.6]) box(faceX(side, 0.03), h / 2, z + sz, 0.03, h, 0.04, seam);
    box(faceX(side, 0.3), h - 0.15, z, 0.3, 0.3, 5.2, solid(0x3a3840));
    box(side * 5, h + 0.2, z, 2.1, 0.4, 5.1, solid(0x2e2c34));

    // ground floor: vending machine, lobby door, window, pink-edged canopy
    vending(side, z - 1.5);
    box(faceX(side, 0.1), 1.15, z - 0.3, 0.1, 2.3, 1.2, dark);
    box(faceX(side, 0.18), 1.05, z - 0.3, 0.18, 2.1, 0.95, glow(0xffd08a));
    box(faceX(side, 0.24), 1.05, z - 0.3, 0.24, 2.1, 0.05, dark);
    windowAt(side, 1.5, z + 1.4, 1.8, 1.4, 0xffc890, 0x2a2a30, false);
    box(side * 3.55, 3.0, z, 0.9, 0.1, 4.2, solid(0x2a2630));
    box(side * 3.1, 2.95, z, 0.04, 0.06, 4.2, glow(c1));
    box(side * 3.1, 2.95, z, 0.2, 0.3, 4.4, softGlow(c1, 0.12));

    // vertical HOTEL sign with a glowing halo
    box(faceX(side, 0.2), 6.0, z - 1.6, 0.2, 4.6, 1.5, softGlow(PINK, 0.2));
    box(faceX(side, 0.3), 6.0, z - 1.6, 0.3, 4.2, 1.1, solid(0x1a0a14));
    plane(side, 3.69, 6.0, z - 1.6, 0.95, 4.0, signMaterial("HOTEL", "#ff7ac0", "#1a0a14", true));

    // windows: mostly yellow, a few dark, one boarded-up and broken
    [4.4, 6.2, 8.0, 9.8].forEach((wy, r) => {
      [z + 0.3, z + 1.7].forEach((wz, c) => {
        if (n % 2 === 0 && r === 0 && c === 0) {
          box(faceX(side, 0.14), wy, wz, 0.14, 1.1, 0.9, solid(0x120e10));
          for (let k = 0; k < 3; k++) box(faceX(side, 0.18), wy - 0.35 + k * 0.35, wz, 0.18, 0.2, 1.0, solid(0x7a5a3a));
          return;
        }
        windowAt(side, wy, wz, 0.9, 1.1, (n + r * 2 + c) % 3 === 1 ? null : 0xffd860, 0x2a2a30, true);
      });
    });

    // ladder, drain pipes and conduits
    for (const lz of [2.28, 2.42]) box(faceX(side, 0.1), (6.0 + h) / 2, z + lz, 0.1, h - 6.0, 0.03, solid(0x15151a));
    for (let y = 6.2; y < h; y += 0.35) box(faceX(side, 0.1), y, z + 2.35, 0.1, 0.03, 0.2, solid(0x15151a));
    rod("y", faceX(side, 0.14), h / 2, z - 2.4, 0.06, h, solid(0x2a262e), 8);
    box(faceX(side, 0.1), 9.3, z - 1.2, 0.1, 0.08, 2.4, solid(0x2a262e));
    roofAC(side * 5.2, h + 0.4, z + 1);
    pool(side * 3.0, z, 2, 4, c1, 0.16);
  }

  // ---- Bar with a lit roof terrace, brick walls and teal / pink neon strips ----
  function terraceBar(side: number, n: number, z: number, c2: number, c3: number) {
    const h1 = 3.6;
    const top = 7.0;
    const f = solid(0x1a1016);
    box(side * 5, h1 / 2, z, 2, h1, 5, solid(0x2a1c22));
    for (let k = 0; k < 8; k++) box(faceX(side, 0.02), 0.5 + k * 0.4, z, 0.02, 0.03, 5, solid(0x180f14));
    for (let k = 0; k < 7; k++) box(faceX(side, 0.03), 0.8 + (k * 0.43) % 2.2, z + ((k * 37) % 40) / 10 - 2, 0.03, 0.2, 0.45, solid(0x3a2a30));
    box(faceX(side, 0.1), 0.2, z, 0.1, 0.4, 5.04, solid(0x15101a));

    // terrace deck, parapet, back wall with warm windows and a pink-outlined door
    box(side * 4.65, h1 + 0.02, z, 1.3, 0.04, 5, solid(0x6a5a52));
    box(faceX(side, 0.18), h1 + 0.35, z, 0.18, 0.7, 5.05, solid(0x3a2a30));
    box(faceX(side, 0.28), h1 + 0.72, z, 0.28, 0.06, 5.1, solid(0x4a4048));
    for (const dz of [-2.5, 2.5]) box(side * 4.65, h1 + 0.35, z + dz, 1.3, 0.7, 0.15, solid(0x3a2a30));
    box(side * 5.65, (h1 + top) / 2, z, 0.7, top - h1, 5, solid(0x5a3a36));
    for (let y = 3.9; y < top - 0.1; y += 0.35) box(side * 5.29, y, z, 0.02, 0.03, 5, solid(0x3a2220));
    box(side * 5.65, top + 0.1, z, 0.9, 0.2, 5.1, solid(0x1a1418));
    for (const wz of [-1.7, 1.7]) {
      box(side * 5.26, 5.0, wz + z, 0.08, 1.5, 1.1, solid(0x2a1a16));
      box(side * 5.24, 5.0, wz + z, 0.08, 1.3, 0.9, glow(0xfff0e0));
      box(side * 5.22, 5.0, wz + z, 0.06, 1.3, 0.05, solid(0x2a1a16));
      box(side * 5.22, 5.0, wz + z, 0.06, 0.05, 0.9, solid(0x2a1a16));
    }
    box(side * 5.26, h1 + 1.1, z + 0.1, 0.06, 2.2, 1.0, solid(0xc8c4d0));
    box(side * 5.2, h1 + 1.1, z + 0.45, 0.06, 0.08, 0.06, solid(0x15151a));
    tubeAt(side, 5.3, h1 + 1.1, z - 0.45, 2.2, 0.06, PINK);
    tubeAt(side, 5.3, h1 + 1.1, z + 0.65, 2.2, 0.06, PINK);
    tubeAt(side, 5.3, h1 + 2.25, z + 0.1, 0.06, 1.2, PINK);
    box(side * 4.7, h1 + 0.05, z + 0.1, 1.2, 0.01, 1.6, softGlow(PINK, 0.25));
    terraceSet(side, side * 4.65, h1 + 0.04, z - 1.3);
    terraceSet(side, side * 4.65, h1 + 0.04, z + 1.4);
    roofAC(side * 5.7, top + 0.2, z + 1.2);
    rod("y", side * 5.95, top - 1.5, z - 2.35, 0.06, 3.0, solid(0x2a2630), 8);

    // teal over pink neon strips under the terrace lip
    tube(side, h1 - 0.35, z, 0.1, 5.0, PINK);
    tube(side, h1 - 0.12, z, 0.1, 5.0, TEAL);

    // ground floor: gridded pink windows, red door, BAR sign, posters
    windowAt(side, 1.6, z - 1.4, 1.0, 1.3, 0xff9ac0, 0x1a1016, false);
    for (const dz of [-0.25, 0.25]) box(faceX(side, 0.2), 1.6, z - 1.4 + dz, 0.2, 1.3, 0.04, f);
    for (const dy of [-0.33, 0.33]) box(faceX(side, 0.2), 1.6 + dy, z - 1.4, 0.2, 0.04, 1.0, f);
    windowAt(side, 1.5, z + 1.7, 0.9, 1.3, 0xff9ac0, 0x1a1016, false);
    for (const dz of [-0.22, 0.22]) box(faceX(side, 0.2), 1.5, z + 1.7 + dz, 0.2, 1.3, 0.04, f);
    box(faceX(side, 0.1), 1.15, z + 0.2, 0.1, 2.3, 1.15, solid(DARK));
    box(faceX(side, 0.18), 1.05, z + 0.2, 0.18, 2.1, 0.95, solid(0xb02a30));
    for (let k = 0; k < 4; k++) box(faceX(side, 0.22), 1.55 + k * 0.08, z + 0.2, 0.22, 0.03, 0.4, solid(0xe0d8d8));
    box(faceX(side, 0.24), 1.0, z + 0.55, 0.24, 0.1, 0.06, solid(0xc8c8d0));
    box(faceX(side, 0.12), 2.8, z + 0.2, 0.12, 0.6, 1.3, solid(DARK));
    box(faceX(side, 0.16), 2.8, z + 0.2, 0.16, 0.4, 1.1, glow(dim(PINK, 0.8)));
    neonFrame(side, 2.8, z + 0.2, 1.35, 0.62, c2);
    box(faceX(side, 0.05), 1.7, z - 0.62, 0.05, 0.7, 0.32, glow(dim(c2, 0.5)));
    box(faceX(side, 0.05), 1.7, z + 1.0, 0.05, 0.7, 0.25, glow(dim(c3, 0.5)));
    trashBin(side * 3.5, z + 2.25);
    if (n % 2 === 1) barrier(side * 3.15, z - 1.3, 1.6);
    pool(side * 3.0, z, 2, 4, PINK, 0.2);
    box(side * 3.2, 0.03, z, 1, 0.01, 3, softGlow(TEAL, 0.14));
  }
  function trashBin(x: number, z: number) {
    rod("y", x, 0.5, z, 0.2, 1.0, solid(0x7a6a78), 12);
    taper(x, 1.08, z, 0.05, 0.21, 0.16, solid(0x6a5a68), 12);
  }

  // ---- Low neon lounge: big window, striped awning, rooftop sign ----
  function loungeBar(side: number, n: number, z: number, c1: number, c2: number, c3: number) {
    const h = 5.6;
    box(side * 5, h / 2, z, 2, h, 5, solid(BAR_WALLS[n % BAR_WALLS.length]));
    box(faceX(side, 0.1), 0.35, z, 0.1, 0.7, 5.04, solid(0x2a2430));
    box(faceX(side, 0.3), h - 0.15, z, 0.3, 0.3, 5.2, solid(BAR_TRIM));
    box(side * 5, h + 0.15, z, 2.2, 0.3, 5.2, solid(BAR_TRIM));
    for (let k = 0; k < 5; k++) box(faceX(side, 0.03), 0.9 + k * 0.4, z, 0.03, 0.03, 4.6, solid(0x0e0c14));
    tube(side, 3.0, z, 0.1, 5.0, PINK);
    tube(side, 3.25, z, 0.1, 5.0, TEAL);

    // big window with neon frame under a striped awning, door with neon arch
    windowAt(side, 1.7, z - 0.9, 2.6, 1.5, dim(c2, 0.55), 0x120c18, false);
    neonFrame(side, 1.7, z - 0.9, 2.8, 1.7, c1);
    for (let k = 0; k < 4; k++)
      awning(side, 2.7, z - 1.75 + k * 0.9, 0.9, 0.45, solid2(k % 2 ? 0x2a1a30 : 0xff4fb0));
    box(faceX(side, 0.22), 1.1, z + 1.8, 0.22, 2.2, 1.1, solid(DARK));
    archDisc(side, 2.2, z + 1.8, 1.1, 0.22, solid(DARK));
    neonRing(side, 2.2, z + 1.8, 0.7, c3, Math.PI);
    tube(side, 1.1, z + 1.1, 2.2, 0.08, c3);
    tube(side, 1.1, z + 2.5, 2.2, 0.08, c3);
    box(faceX(side, 0.28), 1.7, z + 1.8, 0.28, 0.5, 0.5, glow(0xffc060));
    box(faceX(side, 0.3), 1.1, z + 1.4, 0.3, 0.1, 0.05, glow(0xffd890));

    // upper windows, cocktail sign, rooftop name sign
    for (const wz of [-1.5, 0, 1.5])
      windowAt(side, 4.5, z + wz, 0.8, 0.8, (n + wz * 2) % 3 === 0 ? null : dim(c1, 0.6), BAR_TRIM, true);
    cocktailSign(side, 4.1, z - 2.2, c3);
    box(faceX(side, 0.3), h + 0.9, z, 0.3, 1.0, 3.6, solid(DARK));
    box(faceX(side, 0.15), h + 0.9, z, 0.15, 1.3, 3.9, softGlow(c1, 0.2));
    tube(side, h + 0.9, z, 0.08, 3.2, c1);
    tube(side, h + 0.65, z, 0.08, 2.4, c2);
    tube(side, h + 1.15, z, 0.08, 2.4, c3);
    for (const sz of [-1.8, 1.8]) box(side * 5, h + 0.55, z + sz, 0.06, 0.8, 0.06, solid(DARK));
    if (n % 4 === 2) rod("y", side * 5.2, h + 1.0, z - 1, 0.5, 1.2, solid(0x4a3a30), 14);
    pool(side * 3.0, z, 2, 4, c1, 0.2);
    box(side * 3.2, 0.03, z, 1, 0.01, 3, softGlow(c2, 0.16));
  }

  function barBuilding(side: number, i: number, z: number) {
    const n = i * 2 + (side > 0 ? 1 : 0);
    const kind = n % 3; // 0 hotel, 1 terrace bar, 2 lounge
    const c1 = NEON[n % NEON.length];
    const c2 = NEON[(n + 2) % NEON.length];
    const c3 = NEON[(n + 4) % NEON.length];
    const bh = kind === 0 ? 11 : kind === 1 ? 7 : 5.6;
    sidewalk(z, 0x2a2630);

    if (kind === 0) hotelTower(side, n, z, c1);
    else if (kind === 1) terraceBar(side, n, z, c2, c3);
    else loungeBar(side, n, z, c1, c2, c3);

    // gap to the next building: back wall, lamps and overhead lights
    box(side * 6.1, bh / 2, z - 3, 0.3, bh, 1.1, solid(0x15121a));
    if (i % 3 === 1) lampPost(side * 3.75, z - 3, c3);
    if (side === -1 && i % 2 === 1) stringLights(z, 3.7, i % 4 === 1 ? 0xff5ab0 : 0x5ae6ff);
    if (side === -1 && i % 4 === 0) {
      const cross = NEON[i % NEON.length];
      box(0, 5.3, z, 8, 0.07, 0.07, glow(cross));
      box(0, 5.3, z, 8, 0.4, 0.3, softGlow(cross, 0.14));
    }
  }

  // =====================================================================
  // STATION: left = train, rails and a curved-roof platform; right = buses,
  // shelters, a brick station hall with a clock tower, and a kiosk
  // =====================================================================
  const BUS_COLORS = [0xe07a4a, 0xe0b040, 0x5a9a8a];

  // A bus lying along the street, centred on z0 (10.5 m long).
  function bus(z0: number, color: number) {
    const x = 5.1;
    const dark = solid(0x15151a);
    box(x, 1.9, z0, 2.2, 3.0, 10.5, solid(color));
    box(faceX(1, 0.04), 0.72, z0, 0.04, 0.5, 10.5, dark);                    // skirt
    box(faceX(1, 0.04), 1.2, z0, 0.04, 0.2, 10.5, solid(CREAM));             // cream stripe
    vaultZ(x, 3.4, z0, 2.2, 0.25, 10.5, solid2(0xe8e0d0));                   // curved roof
    for (let k = 0; k < 5; k++)
      windowAt(1, 2.5, z0 - 2.8 + k * 1.65, 1.2, 0.9, 0xffe0a8, 0x2a2630, false);
    box(faceX(1, 0.08), 1.65, z0 - 4.3, 0.08, 2.6, 1.1, dark);               // front door
    box(faceX(1, 0.1), 1.7, z0 - 4.3, 0.1, 2.4, 0.9, glow(0xffe0a8));
    for (const wz of [-3.3, 3.3]) {                                           // wheels
      rod("x", 3.93, 0.5, z0 + wz, 0.5, 0.22, solid(0x15151a), 14);
      rod("x", 3.82, 0.5, z0 + wz, 0.25, 0.05, solid(0x9a9aa2), 12);
    }
    // rounded front and back, windscreen, destination board, lights
    for (const dir of [-1, 1]) {
      const cap = new THREE.CylinderGeometry(1.1, 1.1, 3.0, 18, 1, false,
        dir > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI);
      cap.scale(1, 1, 0.35);
      put(cap, solid(color), x, 1.9, z0 + dir * 5.25);
    }
    box(x, 2.5, z0 - 5.6, 1.3, 1.2, 0.04, solid(0x1a1c26));
    box(x, 3.05, z0 - 5.6, 1.0, 0.3, 0.05, glow(0xffb02d));
    for (const lx of [-0.7, 0.7]) {
      rod("z", x + lx, 0.85, z0 - 5.58, 0.12, 0.05, glow(0xfff0c0), 10);
      box(x + lx, 0.85, z0 + 5.55, 0.2, 0.12, 0.05, glow(0xff3a3a));
    }
  }

  function busShelter(z: number) {
    vaultZ(4.75, 2.7, z, 1.5, 0.3, 3.4, solid2(0x6a5a4a));                   // curved roof
    for (const pz of [-1.6, 1.6]) rod("y", 4.05, 1.4, z + pz, 0.05, 2.8, solid(IRON), 8);
    box(5.4, 1.4, z, 0.05, 2.6, 3.2, glass());
    for (const sz of [-1.6, 1.6]) box(4.75, 1.4, z + sz, 1.4, 2.6, 0.05, glass());
    for (let k = 0; k < 3; k++) box(4.95 + k * 0.14, 0.46, z, 0.12, 0.05, 1.8, solid(0x8a6a4a)); // slatted bench
    box(5.38, 1.6, z, 0.04, 0.9, 0.7, glow(0xfff0d0));                       // timetable
    box(4.75, 2.55, z, 0.4, 0.06, 0.3, glow(0xffd890));                      // ceiling lamp
    rod("y", 3.85, 1.3, z + 2.2, 0.04, 2.6, solid(IRON), 8);                 // stop pole + round sign
    rod("z", 3.85, 2.7, z + 2.2, 0.28, 0.05, glow(0x3aa0ff), 18);
    box(3.85, 2.7, z + 2.2, 0.35, 0.08, 0.07, glow(0xffffff));
    rod("y", 3.8, 0.38, z - 2.2, 0.18, 0.76, solid(0x2f5a3a), 12);           // bin
    pool(3.6, z, 1.6, 3.4, WARM, 0.16);
  }

  function kiosk(z: number) {
    box(5, 1.3, z, 2, 2.6, 3.2, solid(0x2f5a4a));
    box(faceX(1, 0.1), 0.15, z, 0.1, 0.3, 3.24, solid(0x1e3a30));
    vaultZ(5, 2.6, z, 2.4, 0.5, 3.4, solid2(0x8a4a3a));
    windowAt(1, 1.5, z, 2.0, 0.9, 0xffe0a8, WOOD, false);
    box(faceX(1, 0.3), 0.95, z, 0.3, 0.08, 2.4, solid(WOOD));
    for (let k = 0; k < 4; k++) awning(1, 2.55, z - 0.9 + k * 0.6, 0.6, 0.45, solid2(k % 2 ? CREAM : 0xcf3a3a));
    box(faceX(1, 0.1), 2.95, z, 0.1, 0.3, 1.8, glow(0xff6b8a));
    for (const bz of [-1.2, 1.2]) {                                           // flower buckets
      rod("y", 3.78, 0.25, z + bz, 0.17, 0.5, solid(0x8a8a90), 10);
      box(3.78, 0.6, z + bz, 0.3, 0.2, 0.3, solid(FLOWER_COLORS[(bz > 0 ? 1 : 0) + 1]));
    }
    pool(3.4, z, 1.6, 3.4, WARM, 0.18);
  }

  // One 6 m piece of the brick station hall (arched windows, clock tower in the middle).
  function hallSegment(j: number, z: number, mid: number, hallFrom: number, hallTo: number) {
    const isMid = j === mid;
    const h = isMid ? 8.6 : 6.6;
    const stone = solid(0xd8c8b0);
    box(5, h / 2, z, 2, h, 6.02, solid(isMid ? 0xb0705a : 0xa0604a));
    box(faceX(1, 0.14), 0.5, z, 0.14, 1.0, 6.04, solid(0x5a4a42));
    box(faceX(1, 0.28), h - 0.15, z, 0.28, 0.3, 6.06, stone);
    box(faceX(1, 0.1), 3.4, z, 0.1, 0.16, 6.04, stone);
    for (const pz of [-2.95, 2.95]) box(faceX(1, 0.22), h / 2, z + pz, 0.22, h, 0.3, stone);
    vaultZ(5, h, z, 2.2, 0.8, 6.02, solid2(0x4a5a58));                       // curved zinc roof
    box(5, 0.005, z, 0.1, 0.01, 0.1, stone);

    if (!isMid) {
      if (j === hallFrom + 1 || j === hallTo - 1) {                          // ticket windows
        windowAt(1, 1.7, z, 3.4, 1.0, 0xffe0a8, 0x3a2a20);
        box(faceX(1, 0.2), 1.1, z, 0.2, 0.12, 3.6, solid(WOOD));
        box(faceX(1, 0.14), 3.0, z, 0.14, 0.4, 2.6, glow(0x3aa0ff));
        for (const dz of [-0.6, 0, 0.6]) box(faceX(1, 0.18), 1.7, z + dz, 0.18, 1, 0.05, solid(0x3a2a20));
      } else if (j === hallFrom || j === hallTo) {                           // advert posters
        for (const pz of [-1.3, 1.3]) {
          box(faceX(1, 0.1), 2.0, z + pz, 0.1, 2.4, 1.4, solid(0x2a1a10));
          box(faceX(1, 0.14), 2.0, z + pz, 0.14, 2.2, 1.2, glow(dim(pz < 0 ? 0xff8a5a : 0x5ab0e0, 0.8)));
        }
      } else {
        archWindow(1, 0.9, z, 1.7, 3.8, WARM, CREAM);
      }
      rod("x", faceX(1, 0.08), 5.5, z, 0.5, 0.08, stone, 18);                // round window
      rod("x", faceX(1, 0.12), 5.5, z, 0.4, 0.12, glow(0xffe0a8), 18);
      if (j % 2 === 1) lampPost(3.78, z + 2.5, WARM);
    } else {
      // grand arched entrance, round columns, curved pediment, canopy, steps
      archWindow(1, 0.0, z, 3.4, 5.0, 0xffe0a8, 0x4a3020);
      for (const sz of [-0.45, 0.45]) {
        box(faceX(1, 0.28), 1.2, z + sz, 0.28, 2.4, 0.85, solid(0x3a2418));
        box(faceX(1, 0.32), 1.7, z + sz, 0.32, 0.9, 0.5, glow(0xffd890));
      }
      for (const cz of [-2.35, 2.35]) half(1, 2.6, z + cz, 0.26, 0.26, 5.2, stone);
      archDisc(1, 5.4, z, 4.2, 0.22, stone);
      archDisc(1, 5.4, z, 3.2, 0.26, glow(WARM));
      awning(1, 3.7, z, 3.6, 0.45, solid2(0x3a2a22));
      box(3.55, 3.25, z, 0.04, 0.05, 3.6, glow(WARM));
      box(faceX(1, 0.45), 0.05, z, 0.45, 0.1, 3.4, stone);
      box(faceX(1, 0.25), 0.1, z, 0.25, 0.2, 3.2, stone);
      pool(3.2, z, 2.4, 5, WARM, 0.2);

      // clock tower with a round clock, pyramid roof and spire
      const cy = h + 1.6;
      box(5, cy, z, 1.8, 3.2, 3.2, solid(0xb0705a));
      box(4.07, h + 3.0, z, 0.06, 0.2, 3.3, stone);
      rod("x", 4.06, cy, z, 0.85, 0.08, solid(0x2a1a10), 24);
      rod("x", 4.05, cy, z, 0.75, 0.1, glow(0xfff4dc), 24);
      const ink = solid(0x2a1a10);
      box(3.97, cy + 0.6, z, 0.04, 0.12, 0.05, ink);
      box(3.97, cy - 0.6, z, 0.04, 0.12, 0.05, ink);
      box(3.97, cy, z + 0.6, 0.04, 0.05, 0.12, ink);
      box(3.97, cy, z - 0.6, 0.04, 0.05, 0.12, ink);
      box(3.96, cy + 0.2, z, 0.04, 0.42, 0.07, ink);                          // hour hand
      box(3.96, cy, z + 0.3, 0.04, 0.07, 0.6, ink);                           // minute hand
      taper(5, h + 3.2 + 0.9, z, 0, 1.3, 1.8, solid(0x3a4a48), 4, Math.PI / 4);
      rod("y", 5, h + 3.2 + 2.1, z, 0.04, 0.9, solid(IRON), 6);
    }
  }

  function clockZ(x: number, y: number, z: number) {                         // double-sided clock
    rod("z", x, y, z, 0.34, 0.22, solid(0x2a1a10), 20);
    for (const s of [-1, 1]) {
      rod("z", x, y, z + s * 0.13, 0.3, 0.05, glow(0xfff0d0), 20);
      box(x, y + 0.08, z + s * 0.17, 0.03, 0.16, 0.02, solid(0x2a1a10));
      box(x + 0.06, y, z + s * 0.17, 0.12, 0.03, 0.02, solid(0x2a1a10));
    }
  }

  function stationSegment(j: number, z: number) {
    const count = stationCount;
    const first = j === 0;
    const last = j === count - 1;
    const hallFrom = 3;
    const hallTo = count - 5;
    const mid = Math.floor((hallFrom + hallTo) / 2);
    const iron = solid(IRON);

    // ===== LEFT: rails, train, platform =====
    box(-5.2, 0.03, z, 2.6, 0.06, 6, solid(0x3a3636));                        // ballast
    for (const rx of [-4.55, -5.85]) box(rx, 0.1, z, 0.08, 0.08, 6, solid(0x7a7a82));
    for (let k = -2; k <= 2; k++) box(-5.2, 0.08, z + k * 1.2, 2.2, 0.05, 0.22, solid(0x4a3a30));
    box(-3.0, 0.005, z, 1.7, 0.01, 6, solid(0x7a6f76));                       // platform paving
    box(-3.7, 0.02, z, 0.12, 0.03, 6, glow(0xf0c040));                        // safety line
    box(-3.9, 0.02, z, 0.16, 0.03, 6, solid(0x9a8a60));                       // tactile strip
    box(3.3, 0.005, z, 1.4, 0.01, 6, solid(0x4e4650));                        // road on the bus side

    if (j % 4 === 3) {
      // flexible connector between carriages, plus a flower planter on the platform
      box(-5.2, 1.9, z, 2.1, 2.7, 6, solid(0x2a2630));
      for (let k = -2; k <= 2; k++) box(-4.12, 1.9, z + k * 1.0, 0.06, 2.7, 0.12, solid(0x15131a));
      box(-3.8, 0.3, z, 0.5, 0.6, 1.4, solid(0x8a5a3a));
      box(-3.8, 0.72, z, 0.44, 0.3, 1.3, solid(0x5a8a4a));
      box(-3.8, 0.92, z - 0.4, 0.14, 0.14, 0.14, solid(0xff6b8a));
      box(-3.8, 0.92, z + 0.4, 0.14, 0.14, 0.14, solid(0xffc94a));
    } else {
      const len = first || last ? 4.8 : 6;
      const cz = first ? z - 0.6 : last ? z + 0.6 : z;
      box(-5.2, 2.0, cz, 2.4, 3.1, len, solid(0xe6dcc8));
      box(faceX(-1, 0.05), 0.72, cz, 0.05, 0.54, len, solid(0x2e2a34));       // dark skirt
      box(faceX(-1, 0.05), 1.3, cz, 0.05, 0.28, len, solid(0xc4603a));        // terracotta stripe
      vaultZ(-5.2, 3.55, cz, 2.4, 0.45, len, solid2(0xcfc6b4));               // rounded roof
      if (j % 3 === 0) box(-5.2, 4.2, cz, 1.2, 0.3, 2, solid(0x9a9eaa));      // roof AC unit
      for (const wz of [-1.6, 1.6].filter((d) => (first ? d < 0 : last ? d > 0 : true)))
        windowAt(-1, 2.5, z + wz, 1.7, 0.9, 0xffe0b0, 0x2a2630, false);
      if (j % 2 === 0) {                                                       // sliding doors
        box(faceX(-1, 0.08), 1.75, z, 0.08, 2.5, 1.3, solid(0x7a2e2a));
        box(faceX(-1, 0.12), 2.2, z, 0.12, 1.2, 0.9, glow(0xffe0b0));
        box(faceX(-1, 0.14), 1.75, z, 0.14, 2.5, 0.05, solid(0x2a1a1a));
      }
      for (const bz of [-1.7, 1.7]) {                                          // bogies and wheels
        box(faceX(-1, 0.1), 0.6, cz + bz, 0.1, 0.35, 1.5, solid(0x1c1a20));
        for (const wz of [-0.55, 0.55]) {
          rod("x", -3.95, 0.38, cz + bz + wz, 0.38, 0.12, solid(0x24222a), 14);
          rod("x", -3.89, 0.38, cz + bz + wz, 0.16, 0.05, solid(0x8a8a92), 10);
        }
      }
      if (first || last) {                                                     // rounded train ends
        const dir = first ? 1 : -1;
        const capZ = first ? z + 1.8 : z - 1.8;
        put(new THREE.CylinderGeometry(1.2, 1.2, 3.1, 20, 1, false,
          dir > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), solid(0xe6dcc8), -5.2, 2.0, capZ);
        put(new THREE.CylinderGeometry(1.215, 1.215, 0.9, 16, 1, false,
          dir > 0 ? -0.9 : Math.PI - 0.9, 1.8), solid(0x1a1c26), -5.2, 2.6, capZ);   // curved windscreen
        for (const lx of [-0.68, 0.68]) box(-5.2 + lx, 1.0, capZ + dir * 1.0, 0.18, 0.14, 0.08, glow(first ? 0xff3a3a : 0xfff0c0));
        box(-5.2, 3.3, capZ + dir * 1.13, 0.8, 0.2, 0.05, glow(0xffb02d));
      }
    }

    // curved platform roof: green shell with cream ribs, steel columns, pendant lamps
    vaultZ(-4.5, 4.4, z, 3.6, 0.9, 6, solid2(0x4f5f58));
    vaultZ(-4.5, 4.38, z + 3, 3.7, 0.95, 0.14, solid2(0xe8dcc0));
    if (j % 2 === 0) {
      rod("y", -3.7, 2.55, z, 0.1, 5.1, solid(0x3a3a46), 12);
      box(-3.7, 0.12, z, 0.34, 0.24, 0.34, solid(0x2a2a34));
      rod("y", -3.7, 0.9, z, 0.14, 0.08, solid(0x2a2a34), 12);
    }
    rod("y", -3.75, 4.85, z + 1.5, 0.02, 0.6, iron, 6);
    rod("y", -3.75, 4.45, z + 1.5, 0.15, 0.2, glow(WARM), 10);
    box(-3.75, 4.45, z + 1.5, 0.55, 0.4, 0.55, softGlow(WARM, 0.12));
    pool(-3.0, z, 1.6, 4.2, WARM, 0.14);

    // platform furniture, repeating every 4 segments
    const slot = j % 4;
    if (slot === 0) {
      clockZ(-3.7, 3.7, z);
      rod("y", -3.8, 0.38, z + 2.2, 0.18, 0.76, solid(0x2f5a3a), 12);
      rod("y", -3.8, 0.8, z + 2.2, 0.2, 0.06, solid(0x244a2e), 12);
    } else if (slot === 1) {
      box(-3.7, 3.7, z, 1.5, 0.7, 0.1, solid(0x15151c));                       // departure board
      for (const s of [-1, 1])
        for (let r = 0; r < 3; r++)
          box(-3.7, 3.88 - r * 0.2, z + s * 0.055, r === 1 ? 0.85 : 1.2, 0.08, 0.02, glow(r === 0 ? 0xffb02d : 0xffe0a8));
      for (const rx of [-4.2, -3.2]) rod("y", rx, 4.55, z, 0.015, 1.0, iron, 6);
    } else if (slot === 2) {
      box(-3.7, 4.0, z, 1.1, 0.5, 0.08, glow(0xffc030));                       // platform number sign
      box(-3.7, 4.0, z + 0.05, 0.08, 0.32, 0.02, solid(0x15151c));
      box(-3.7, 4.0, z - 0.05, 0.08, 0.32, 0.02, solid(0x15151c));
      for (const rx of [-4.1, -3.3]) rod("y", rx, 4.5, z, 0.015, 0.75, iron, 6);
      for (let k = 0; k < 3; k++) box(-3.9 + k * 0.14, 0.46, z, 0.12, 0.05, 1.6, solid(0x8a6a4a)); // slatted bench
      for (let k = 0; k < 3; k++) box(-3.97, 0.68 + k * 0.16, z, 0.05, 0.1, 1.6, solid(0x8a6a4a));
      box(-3.8, 0.22, z - 0.7, 0.4, 0.44, 0.06, iron);
      box(-3.8, 0.22, z + 0.7, 0.4, 0.44, 0.06, iron);
    } else {
      box(-3.85, 0.9, z + 2, 0.4, 1.8, 0.9, solid(0x8a2a30));                  // vending machine
      box(-3.63, 1.1, z + 2, 0.04, 1.1, 0.6, glow(0xcfe8ff));
      box(-3.63, 0.45, z + 2, 0.04, 0.2, 0.5, solid(0x15151c));
    }

    // ===== RIGHT: bus bays, shelters, station hall, kiosk =====
    if (j === 0 || j === count - 3) bus(z - 3, BUS_COLORS[j % BUS_COLORS.length]);
    else if (j === 2 || j === count - 4) busShelter(z);
    else if (j >= hallFrom && j <= hallTo) hallSegment(j, z, mid, hallFrom, hallTo);
    else if (j === count - 1) kiosk(z);
    // the segment right after each bus is covered by that bus
  }

  // ---- Build the loop once ----
  for (let i = 0; i < SEGMENTS; i++) {
    const z = -i * 6;
    const area = streetArea(z); // same function that drives the on-screen label
    if (area === "Station") stationSegment(i, z);
    else if (area === "Bar Street") for (const side of [-1, 1]) barBuilding(side, i, z);
    else for (const side of [-1, 1]) alleyHouse(side, i, z);
  }

  // Merge every part into one mesh per material, with three copies of the loop
  // (-L, 0, +L) so the camera wrap has no seam. Few draw calls, fast on phones.
  const offsets = [-WORLD_LENGTH, 0, WORLD_LENGTH];
  parts.forEach((geometries, material) => {
    const copies = geometries.flatMap((geometry) =>
      offsets.map((offset) => geometry.clone().translate(0, 0, offset)));
    const merged = mergeGeometries(copies, false);
    geometries.forEach((geometry) => geometry.dispose());
    copies.forEach((geometry) => geometry.dispose());
    if (merged) placeholder.add(new THREE.Mesh(merged, material));
  });
  scene.add(placeholder);

  // The homepage renders the street scenery without story bubbles, controls or audio.
  // Keep the homepage preview absolutely positioned behind its text.
  if (options.preview) {
    const draw = () => {
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    draw();
    return () => {
      observer.disconnect();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }

  const listener = new THREE.AudioListener();
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();
  let audioPaused = false; // true while the person pressed Pause
  let muted = false; // true while the person pressed Mute
  // Browsers keep sound off until the person presses a key or clicks.
  // This turns the sound on at the first key press or click,
  // unless the person pressed Pause.
  for (const eventName of ["keydown", "pointerdown", "pointerup"])
    on(window, eventName, () => {
      if (!audioPaused) listener.context.resume();
    });
  const installations: Station[] = storiesData.map(function (definition) {
    const inst = { ...definition } as Station;

    inst.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 32),
      new THREE.MeshBasicMaterial({ color: inst.color }),
    );
    inst.baseY = 1.8;
    inst.mesh.position.set(inst.x, inst.baseY, inst.z);
    scene.add(inst.mesh);

    const light = new THREE.PointLight(inst.color, 2, 8);
    inst.mesh.add(light);

    inst.sound = new THREE.PositionalAudio(listener);
    // Full volume up close, then falling in a straight line to silence far away
    inst.sound.setDistanceModel("linear");
    inst.sound.setRefDistance(FULL_VOLUME_DISTANCE);
    inst.sound.setMaxDistance(SILENT_DISTANCE);
    inst.sound.setRolloffFactor(1);

    inst.sound.setLoop(true);
    inst.mesh.add(inst.sound);

    if (inst.audio)
      audioLoader.load(
        inst.audio,
        function (buffer) {
          if (disposed) return;
          inst.sound.setBuffer(buffer);
          // Loading a story never starts playback.
        },
        undefined,
        function () {
          if (!disposed)
            element("audio-status").textContent =
              "Story audio could not load. You can continue exploring.";
        },
      );
    return inst;
  });
  function beginExperience() {
    if (disposed || started) return;
    started = true;
    const intro = element("intro-screen");
    intro.classList.add("leaving");
    fadeTimer = window.setTimeout(() => intro.classList.add("hidden"), 650);
    host.tabIndex = -1;
    host.focus();
  }
  introTimer = window.setTimeout(beginExperience, 2500);

  const keys = { forward: false, back: false, left: false, right: false };
  let paused = false;
  const joystick = { x: 0, y: 0 };
  let joystickPointer: number | null = null;
  const lookPointers = new Map<number, { x: number; y: number }>();
  const joystickElement = element("joystick");
  const joystickKnob = joystickElement.firstElementChild as HTMLElement;

  function setKey(event: KeyboardEvent, value: boolean) {
    if (event.key === "ArrowUp" || event.key === "w") keys.forward = value;
    if (event.key === "ArrowDown" || event.key === "s") keys.back = value;
    if (event.key === "ArrowLeft" || event.key === "a") keys.left = value;
    if (event.key === "ArrowRight" || event.key === "d") keys.right = value;
  }
  on(window, "keydown", ((e: KeyboardEvent) => {
    if (
      !started ||
      /INPUT|TEXTAREA|SELECT|BUTTON/.test((e.target as HTMLElement)?.tagName)
    )
      return;
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
      ].includes(e.key)
    ) {
      e.preventDefault();
      setKey(e, true);
    }
  }) as EventListener);
  on(window, "keyup", ((e: KeyboardEvent) =>
    setKey(e, false)) as EventListener);
  on(window, "blur", () => {
    keys.forward = keys.back = keys.left = keys.right = false;
    joystick.x = joystick.y = 0;
    joystickPointer = null;
    lookPointers.clear();
    joystickElement.classList.add("hidden");
  });

  const canvas = renderer.domElement;
  const JOYSTICK_RADIUS = 42;
  on(canvas, "pointerdown", ((event: PointerEvent) => {
    if (!started || paused || event.pointerType !== "touch") return;
    const bounds = host.getBoundingClientRect();
    const y = event.clientY - bounds.top;

    if (joystickPointer === null && y > bounds.height * 0.45) {
      const x = event.clientX - bounds.left;
      joystickPointer = event.pointerId;
      joystickElement.style.left = `${x}px`;
      joystickElement.style.top = `${y}px`;
      joystickElement.classList.remove("hidden");
      joystickKnob.style.transform = "translate(-50%, -50%)";
    } else {
      lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }) as EventListener);

  on(canvas, "pointermove", ((event: PointerEvent) => {
    if (event.pointerId === joystickPointer) {
      const bounds = host.getBoundingClientRect();
      const centerX = bounds.left + Number.parseFloat(joystickElement.style.left);
      const centerY = bounds.top + Number.parseFloat(joystickElement.style.top);
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const scale = distance > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / distance : 1;
      const offsetX = deltaX * scale;
      const offsetY = deltaY * scale;

      joystick.x = offsetX / JOYSTICK_RADIUS;
      joystick.y = offsetY / JOYSTICK_RADIUS;
      joystickKnob.style.transform =
        `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
      event.preventDefault();
      return;
    }

    const previous = lookPointers.get(event.pointerId);
    if (!previous) return;
    camera.rotation.y -= (event.clientX - previous.x) * 0.005;
    camera.rotation.x = THREE.MathUtils.clamp(
      camera.rotation.x - (event.clientY - previous.y) * 0.005,
      -Math.PI / 2 + 0.01,
      Math.PI / 2 - 0.01,
    );
    previous.x = event.clientX;
    previous.y = event.clientY;
    event.preventDefault();
  }) as EventListener);

  function finishTouch(event: PointerEvent) {
    if (event.pointerId === joystickPointer) {
      joystickPointer = null;
      joystick.x = joystick.y = 0;
      joystickElement.classList.add("hidden");
    }
    lookPointers.delete(event.pointerId);
  }
  on(canvas, "pointerup", ((event: PointerEvent) => finishTouch(event)) as EventListener);
  on(canvas, "pointercancel", ((event: PointerEvent) => finishTouch(event)) as EventListener);

  let distanceZ = 0;
  let lowestZ = 0;
  let highestZ = 0;
  let completed = false;

  function updateWalking(delta: number) {
    // Pause walking while feedback is open and release held keyboard/touch input.
    if (options.isSurveyOpen?.()) {
      keys.forward = keys.back = keys.left = keys.right = false;
      joystick.x = joystick.y = 0;
      return;
    }
    if (!started || paused) return;

    if (keys.left) camera.rotation.y += TURN_SPEED * delta;
    if (keys.right) camera.rotation.y -= TURN_SPEED * delta;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const side = direction.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const forwardAmount = Number(keys.forward) - Number(keys.back) - joystick.y;
    const sideAmount = joystick.x;
    const movement = direction
      .multiplyScalar(forwardAmount)
      .addScaledVector(side, sideAmount);
    if (movement.lengthSq() > 1) movement.normalize();
    camera.position.addScaledVector(movement, WALK_SPEED * delta);

    camera.position.x = Math.max(-3.5, Math.min(3.5, camera.position.x));
    // Measure the stretch of road covered before the camera wraps.
    distanceZ += movement.z * WALK_SPEED * delta;
    lowestZ = Math.min(lowestZ, distanceZ);
    highestZ = Math.max(highestZ, distanceZ);
    if (!completed && highestZ - lowestZ >= WORLD_LENGTH) {
      completed = true;
      // Tell the parent React page to open feedback once after completing the loop.
      options.onLoopComplete?.();
    }
    camera.position.z = wrapStreetZ(camera.position.z);
    const label = element("area-name");
    const area = streetArea(camera.position.z);
    if (label.textContent !== area) label.textContent = area;
  }

  const choiceBox = element("choice-box");
  const choiceText = element("choice-text");
  const listenBtn = element("listen-btn");
  const passBtn = element("pass-btn");

  let current: Station | null = null;
  let listening = false;
  const passed: Station[] = [];
  const heard: Station[] = []; // stories you pressed Listen on
  const listenLabel = listenBtn.textContent; // the normal text of the Listen button

  function checkNearbyInstallations() {
    if (!started) return;

    // A story only plays when you are close to it (SILENT_DISTANCE).
    // While the "listen or keep walking" box is open, only that story is heard.
    for (const inst of installations) {
      // Keep each story and its attached audio on the closest copy of the street.
      inst.mesh.position.z = inst.z + WORLD_LENGTH * Math.round((camera.position.z - inst.z) / WORLD_LENGTH);

      const distance = camera.position.distanceTo(inst.mesh.position);
      if (distance > SILENT_DISTANCE && passed.includes(inst)) passed.splice(passed.indexOf(inst), 1);
      if (!inst.sound.buffer) continue;
      const isClose = distance < SILENT_DISTANCE && !passed.includes(inst);

      if (isClose && !inst.sound.isPlaying) inst.sound.play();
      if (!isClose && inst.sound.isPlaying) inst.sound.stop();

      const boxIsOpen = current !== null;
      inst.sound.setVolume(boxIsOpen && inst !== current ? 0 : 1);
    }
    // Keep your existing choice box logic if you still want the popup when very close (e.g., within 3.5 meters)
    if (listening) return;
    let nearest: Station | null = null;
    let nearestDistance = 999;

        for (const inst of installations) {
          if (passed.includes(inst)) continue;
            const distance = camera.position.distanceTo(inst.mesh.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = inst;
            }
        }
if (nearest && nearestDistance < CHOICE_RANGE) {
            current = nearest;
            (listenBtn as HTMLButtonElement).disabled = !nearest.sound.buffer;
            
            // Format demographics text if available
            const demographics = [
                nearest.age ? `Age ${nearest.age}` : null,
                nearest.gender ? nearest.gender : null
            ].filter(Boolean).join(", ");

            // Display demographics above the title
            choiceText.textContent = demographics 
                ? `${demographics} — "${nearest.title}"` 
                : nearest.title;
            // Tell visitors this recording uses an AI narrator; playback stays unchanged.
            if (nearest.audio_status === "ready" && nearest.voice_id) choiceText.textContent += " — AI-narrated";

      listenBtn.textContent = heard.includes(nearest) ? "Listen again" : listenLabel;
      choiceBox.classList.remove("hidden");
    } else {
      current = null;
      choiceBox.classList.add("hidden");
    }
  }

  let playbackRequest = 0;
  const loggedListens = new Set<string | number>();
  on(listenBtn, "click", function () {
    const selected = current;
    if (!selected?.sound.buffer) return;

        if (!loggedListens.has(selected.id)) {
            loggedListens.add(selected.id);
            void supabase
                .from("story_listens")
                .insert({ story_id: selected.id })
                .then(({ error }) => {
                    if (error) {
                        console.error("Failed to log story listen:", error.message);
                        loggedListens.delete(selected.id);
                    }
                });
        }


    if (!heard.includes(selected)) heard.push(selected);
    setAudioPaused(false); // pressing Listen always turns the sound back on
    const request = ++playbackRequest;
    listening = true;
    paused = true;
    keys.forward = keys.back = keys.left = keys.right = false;
    joystick.x = joystick.y = 0;
    choiceText.textContent = "Starting story…";
    listenBtn.classList.add("hidden");
    passBtn.textContent = "Continue walking";
    void listener.context.resume().then(() => {
      if (disposed || request !== playbackRequest || current !== selected) return;
      if (selected.sound.isPlaying) selected.sound.stop();
      selected.sound.setVolume(1);
      selected.sound.play();
      choiceText.textContent = selected.audio_status === "ready" && selected.voice_id ? "Listening — AI-narrated story…" : "Listening…";
    }).catch(() => {
      if (disposed || request !== playbackRequest) return;
      listening = false;
      paused = false;
      listenBtn.classList.remove("hidden");
      element("audio-status").textContent = "Audio could not start. Try again or continue walking.";
    });
  });

  on(passBtn, "click", function () {
    if (!current) return;

    playbackRequest++;
    if (current.sound.isPlaying) current.sound.stop();
    passed.push(current);
    current = null;
    listening = false;
    paused = false;
    host.focus();

    listenBtn.classList.remove("hidden");
    passBtn.textContent = "Keep walking";
    choiceBox.classList.add("hidden");
  });
  // ---- Sound controls: pause, mute, exit ----
  const controls = document.createElement("div");
  controls.className = "sv-controls";
  element("street-toolbar").appendChild(controls);

  function makeButton(label: string, onClick: (button: HTMLButtonElement) => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = label;
    button.className = "sv-control-button";
    on(button, "click", () => {
      onClick(button);
      host.focus(); // so the walking keys keep working after a click
    });
    controls.appendChild(button);
    return button;
  }

  // Pause / Play: freezes all sound, and carries on from the same place.
  function setAudioPaused(value: boolean): void {
    audioPaused = value;
    if (value) void listener.context.suspend();
    else void listener.context.resume();
    pauseButton.textContent = value ? "▶ Play" : "⏸ Pause";
  }
  const pauseButton = makeButton("⏸ Pause", () => setAudioPaused(!audioPaused));

  // Mute / Unmute: the sound keeps running but you hear nothing.
  makeButton("Mute", (button) => {
    muted = !muted;
    listener.setMasterVolume(muted ? 0 : 1);
    button.textContent = muted ? "Unmute" : "Mute";
  });

  // Exit: stop every story and go back to the map.
  makeButton("✕ Exit", () => {
    installations.forEach((inst) => {
      if (inst.sound.isPlaying) inst.sound.stop();
    });
    window.location.href = "/map";
  });


  const clock = new THREE.Clock();

  renderer.setAnimationLoop(function () {
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    updateWalking(delta);
    checkNearbyInstallations();

    installations.forEach(function (inst, i) {
      inst.mesh.position.y = inst.baseY + Math.sin(time + i) * 0.2;
    });

    renderer.render(scene, camera);
  });

  const resize = new ResizeObserver(() => {
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  });
  resize.observe(host);
  return () => {
    disposed = true;
    window.clearTimeout(introTimer);
    window.clearTimeout(fadeTimer);
    controls.remove();
    renderer.setAnimationLoop(null);
    resize.disconnect();
    removers.forEach((remove) => remove());
    installations.forEach((inst) => {
      if (inst.sound.isPlaying) inst.sound.stop();
      inst.sound.disconnect();
    });
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}
