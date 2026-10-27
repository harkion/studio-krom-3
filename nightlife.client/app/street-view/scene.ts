import * as THREE from "three";

export type StoryData = {
    x: number;
    z: number;
    title: string;
    audio: string | null;
    color: number;
};
export function mountStreet(host: HTMLDivElement, storiesData: StoryData[]) {
  let disposed = false;
  const removers: (() => void)[] = [];
  function on(target: EventTarget, event: string, handler: EventListener) {
    target.addEventListener(event, handler);
    removers.push(() => target.removeEventListener(event, handler));
  }
  function element(id: string) {
    return host.querySelector<HTMLElement>(`#${id}`)!;
  }
  type Station = {
    x: number;
    z: number;
    title: string;
    audio: string | null;
    color: number;
    mesh: THREE.Mesh;
    baseY: number;
    sound: THREE.PositionalAudio;
  };
  let started = false;
  const STREET_LENGTH = 40;
  const WALK_SPEED = 2.5;
  const TURN_SPEED = 1.5;
  const CHOICE_RANGE = 3.5;
/*
  const definitions = [
    {
      x: 2,
      z: -12,
      title: "Who's watching over you?",
      audio: null,
      color: 0xff6b9d,
    },
    {
      x: -2,
      z: -28,
      title: "A story from the platform",
      audio: "/street-view/audio/station1.mp3",
      color: 0x6bd5ff,
    },
  ];
*/
  const scene = new THREE.Scene();

  const NIGHT = 0x6b6b8a;
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

  scene.add(new THREE.AmbientLight(0xb0b0d0, 1.2));
  scene.add(new THREE.HemisphereLight(0xd0d0ee, 0x4a4a5a, 0.6));

  const placeholder = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, STREET_LENGTH + 20),
    new THREE.MeshStandardMaterial({ color: 0x4a4a58 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -STREET_LENGTH / 2;
  placeholder.add(floor);

  for (let z = 0; z > -STREET_LENGTH - 10; z -= 6) {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x5c5c70 });

    const left = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 5), wallMaterial);
    left.position.set(-5, 3, z);

    const right = new THREE.Mesh(
      new THREE.BoxGeometry(2, 6 + Math.random() * 3, 5),
      wallMaterial,
    );
    right.position.set(5, 3, z);

    placeholder.add(left, right);
  }
  scene.add(placeholder);

  const listener = new THREE.AudioListener();
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();

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
    inst.sound.setRefDistance(3);
    inst.sound.setRolloffFactor(2);
    inst.sound.setLoop(true);
    inst.mesh.add(inst.sound);

    if (inst.audio)
      audioLoader.load(
        inst.audio,
        function (buffer) {
          if (disposed) return;
          inst.sound.setBuffer(buffer);
          if (started) inst.sound.play();
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
  on(element("start-btn"), "click", function () {
    started = true;
    void listener.context.resume().catch(() => {
      element("audio-status").textContent =
        "Audio could not start. You can still explore the street.";
    });
    installations.forEach(function (inst) {
      if (inst.sound.buffer && !inst.sound.isPlaying) inst.sound.play();
    });
    element("start-screen").classList.add("hidden");
    host.tabIndex = -1;
    host.focus();
  });

  const keys = { forward: false, back: false, left: false, right: false };
  let paused = false;

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
  });

  function holdButton(id: string, name: keyof typeof keys) {
    const btn = element(id);
    on(btn, "pointerdown", function () {
      keys[name] = true;
    });
    on(btn, "pointerup", function () {
      keys[name] = false;
    });
    on(btn, "pointercancel", () => {
      keys[name] = false;
    });
    on(btn, "pointerleave", function () {
      keys[name] = false;
    });
  }
  holdButton("btn-forward", "forward");
  holdButton("btn-back", "back");
  holdButton("btn-left", "left");
  holdButton("btn-right", "right");

  function updateWalking(delta: number) {
    if (!started || paused) return;

    if (keys.left) camera.rotation.y += TURN_SPEED * delta;
    if (keys.right) camera.rotation.y -= TURN_SPEED * delta;

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    if (keys.forward)
      camera.position.addScaledVector(direction, WALK_SPEED * delta);
    if (keys.back)
      camera.position.addScaledVector(direction, -WALK_SPEED * delta);

    camera.position.x = Math.max(-3.5, Math.min(3.5, camera.position.x));
    camera.position.z = Math.max(
      -STREET_LENGTH,
      Math.min(2, camera.position.z),
    );
  }

  const choiceBox = element("choice-box");
  const choiceText = element("choice-text");
  const listenBtn = element("listen-btn");
  const passBtn = element("pass-btn");

  let current: Station | null = null;
  let listening = false;
  const passed: Station[] = [];

  function checkNearbyInstallations() {
    if (!started || listening) return;

    let nearest: Station | null = null;
    let nearestDistance = 999;

    for (const inst of installations) {
      if (passed.indexOf(inst) !== -1) continue;
      const distance = camera.position.distanceTo(inst.mesh.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = inst;
      }
    }

    if (nearest && nearestDistance < CHOICE_RANGE) {
      current = nearest;
      choiceText.textContent = nearest.title;
      (listenBtn as HTMLButtonElement).disabled = !nearest.sound.buffer;
      listenBtn.textContent = !nearest.audio
        ? "Audio not supplied"
        : !nearest.sound.buffer
          ? "Audio loading"
          : "Stop and listen";
      choiceBox.classList.remove("hidden");
    } else {
      current = null;
      choiceBox.classList.add("hidden");
    }
  }

  on(listenBtn, "click", function () {
    if (!current?.sound.buffer) return;
    listening = true;
    paused = true;

    if (current.sound.buffer) {
      if (current.sound.isPlaying) current.sound.stop();
      current.sound.setVolume(1);
      current.sound.play();
    }

    choiceText.textContent = "Listening...";
    listenBtn.classList.add("hidden");
    passBtn.textContent = "Continue walking";
  });

  on(passBtn, "click", function () {
    if (!current) return;

    current.sound.setVolume(1);
    passed.push(current);
    current = null;
    listening = false;
    paused = false;
    host.focus();

    listenBtn.classList.remove("hidden");
    passBtn.textContent = "Keep walking";
    choiceBox.classList.add("hidden");
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
    renderer.dispose();
    renderer.domElement.remove();
  };
}
