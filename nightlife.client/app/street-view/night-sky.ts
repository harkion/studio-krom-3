import * as THREE from "three";

// Night sky for the street view: a colour-gradient sky, twinkling stars,
// a full moon with a soft glow, and fog that hides the end of the street.
//
// Use it from street.ts like this:
//   const sky = addNightSky(scene);       // once, after the scene is made
//   sky.update(camera, time);             // every frame, before rendering
//   sky.dispose();                        // when the page closes

export type NightSkyOptions = {
  skyTopColor?: number; // colour straight above you
  horizonColor?: number; // colour of the haze at the end of the street (also the fog colour)
  fogDensity?: number; // higher = thicker fog, the street end disappears sooner
  starCount?: number;
  moonDirection?: THREE.Vector3; // where the moon hangs; -z is straight down the street
  moonSize?: number;
  moonLight?: boolean; // a soft blue light from the moon onto the buildings
};

// ---- Easy settings to play with ----
const DEFAULTS = {
  skyTopColor: 0x14102a, // deep violet night
  horizonColor: 0x6a5a78, // dusky warm purple haze (matches the street palette)
  fogDensity: 0.045, // was 0.025; at 0.045 nothing past ~45 m is visible
  starCount: 1200,
  // Almost straight down the street, about 33° up, so it clears the tall hotels and clock tower.
  moonDirection: new THREE.Vector3(0.08, 0.55, -0.83),
  moonSize: 16,
  moonLight: true,
};

// Everything in the sky sits at this distance; it must stay below the camera's far value (100).
const SKY_RADIUS = 90;
const STAR_RADIUS = 85;
const MOON_DISTANCE = 80;

export function addNightSky(scene: THREE.Scene, options: NightSkyOptions = {}) {
  const settings = { ...DEFAULTS, ...options };
  const moonDir = settings.moonDirection.clone().normalize();

  // ---- Fog ----
  // The fog fades the buildings and floor into the horizon colour, and the sky's
  // lowest part has that same colour, so the street seems to dissolve into haze.
  scene.background = new THREE.Color(settings.horizonColor);
  scene.fog = new THREE.FogExp2(settings.horizonColor, settings.fogDensity);

  // The whole sky moves with the camera, so you can never walk out of it
  // (and nothing jumps when the street wraps around).
  const sky = new THREE.Group();
  scene.add(sky);

  // ---- Sky dome: a big ball around the camera, painted from the inside ----
  const domeMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(settings.skyTopColor) },
      horizonColor: { value: new THREE.Color(settings.horizonColor) },
      moonGlowColor: { value: new THREE.Color(0x8890c0) },
      moonDir: { value: moonDir },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 moonGlowColor;
      uniform vec3 moonDir;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float height = clamp(dir.y, 0.0, 1.0);
        // Haze near the horizon, darkening towards the top.
        vec3 color = mix(horizonColor, topColor, smoothstep(0.0, 1.0, pow(height, 0.45)));
        // A faint halo in the sky around the moon.
        color += moonGlowColor * pow(max(dot(dir, moonDir), 0.0), 24.0) * 0.35;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), domeMaterial);
  dome.renderOrder = -1; // draw the sky first, everything else on top
  sky.add(dome);

  // ---- Stars ----
  const positions = new Float32Array(settings.starCount * 3);
  const sizes = new Float32Array(settings.starCount);
  const phases = new Float32Array(settings.starCount);
  for (let i = 0; i < settings.starCount; i++) {
    // A random point on the upper half of a sphere.
    const y = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(angle) * ring * STAR_RADIUS;
    positions[i * 3 + 1] = y * STAR_RADIUS;
    positions[i * 3 + 2] = Math.sin(angle) * ring * STAR_RADIUS;
    // Mostly small stars, with a few brighter ones.
    sizes[i] = Math.random() < 0.06 ? 3 + Math.random() * 2 : 1 + Math.random() * 1.6;
    phases[i] = Math.random(); // so they don't all twinkle together
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  starGeometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

  const starMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      color: { value: new THREE.Color(0xf2f0ff) },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float phase;
      uniform float time;
      uniform float pixelRatio;
      varying float vAlpha;
      void main() {
        vec3 dir = normalize(position);
        float twinkle = 0.65 + 0.35 * sin(time * (1.0 + phase * 2.0) + phase * 6.2831);
        float horizonFade = smoothstep(0.08, 0.35, dir.y); // stars vanish into the haze
        vAlpha = twinkle * horizonFade;
        gl_PointSize = size * pixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        float distanceFromCentre = length(gl_PointCoord - 0.5);
        float alpha = (1.0 - smoothstep(0.0, 0.5, distanceFromCentre)) * vAlpha;
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  sky.add(stars);

  // ---- Full moon: a picture drawn once on a small canvas ----
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const c = 128;
  const discRadius = 64;
  // soft glow around the moon
  const glow = ctx.createRadialGradient(c, c, discRadius * 0.9, c, c, 128);
  glow.addColorStop(0, "rgba(215, 220, 255, 0.35)");
  glow.addColorStop(1, "rgba(215, 220, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  // the moon itself
  const disc = ctx.createRadialGradient(c - 18, c - 18, 8, c, c, discRadius);
  disc.addColorStop(0, "#fbf8ee");
  disc.addColorStop(1, "#d8d5ca");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(c, c, discRadius, 0, Math.PI * 2);
  ctx.fill();
  // a few soft grey patches
  ctx.fillStyle = "rgba(140, 140, 155, 0.18)";
  for (const [x, y, r] of [[-20, -14, 16], [18, 8, 22], [-8, 26, 10], [26, -24, 8], [-30, 14, 7]]) {
    ctx.beginPath();
    ctx.arc(c + x, c + y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const moonTexture = new THREE.CanvasTexture(canvas);
  moonTexture.colorSpace = THREE.SRGBColorSpace;
  const moonMaterial = new THREE.SpriteMaterial({
    map: moonTexture,
    transparent: true,
    depthWrite: false,
    fog: false, // the moon stays clear, the fog is only for the street
  });
  const moon = new THREE.Sprite(moonMaterial);
  moon.scale.set(settings.moonSize, settings.moonSize, 1);
  moon.position.copy(moonDir).multiplyScalar(MOON_DISTANCE);
  sky.add(moon);

  // ---- Moonlight: a faint cool light from the moon's direction ----
  let moonLight: THREE.DirectionalLight | null = null;
  if (settings.moonLight) {
    moonLight = new THREE.DirectionalLight(0xc8d0ff, 0.35);
    moonLight.position.copy(moonDir).multiplyScalar(50);
    scene.add(moonLight);
  }

  return {
    // Call every frame: keeps the sky around the camera and makes the stars twinkle.
    update(camera: THREE.Camera, time: number) {
      sky.position.copy(camera.position);
      starMaterial.uniforms.time.value = time;
    },
    dispose() {
      scene.remove(sky);
      if (moonLight) scene.remove(moonLight);
      dome.geometry.dispose();
      domeMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      moonTexture.dispose();
      moonMaterial.dispose();
    },
  };
}
