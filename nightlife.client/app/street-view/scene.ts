import * as THREE from "three";
import { wrapStreetZ, streetArea, WORLD_LENGTH } from "./loop-path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type StoryData = {
    x: number;
    z: number;
    title: string;
    audio: string | null;
    audio_status?: string | null;
    voice_id?: string | null;
    color: number;
    age: number | null;
    gender: string | null;
};

type Station = {
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

type HouseModel = {
    url: string;
    length?: number;
    height?: number;
    lift?: number;
    turn?: number;
    zoom?: number;
    inspect?: boolean;
    part?: string;
};

type Area = {
    name: string;
    startZ: number;
    endZ: number;
    models: HouseModel[];
    slotStep: number;
};

const STATION_MODELS: HouseModel[] = [
    { url: "/street-view/models/outdated_soviet_bus_stop.glb" },
    { url: "/street-view/models/street_light_pack.glb" },
];

const BAR_MODELS: HouseModel[] = [
    { url: "/street-view/models/cotton_club.glb", height: 12 },
];

const ALLEY_MODELS: HouseModel[] = [
    { url: "/street-view/models/cafe_house.glb" },
    { url: "/street-view/models/alley3.glb" },
    { url: "/street-view/models/alley4.glb" },
];

const AREAS: Area[] = [
    { name: "Station", startZ: 0, endZ: -80, models: STATION_MODELS, slotStep: 2 },
    { name: "Bar Street", startZ: -80, endZ: -160, models: BAR_MODELS, slotStep: 2 },
    { name: "Alley", startZ: -160, endZ: -240, models: ALLEY_MODELS, slotStep: 2 },
];

const HOUSE_LENGTH = 10;
const HOUSE_SIDE_X = 4 + HOUSE_LENGTH / 2;
const STREET_SLOT_LENGTH = 6;

const ROAD_URL = "/street-view/models/road.glb";
const ROAD_WIDTH = 8;
const ROAD_PIECE_LENGTH = 12;

function isInArea(localZ: number, area: Area) {
    return localZ <= area.startZ && localZ > area.endZ;
}

export function mountStreet(
    host: HTMLDivElement,
    storiesData: StoryData[],
    options: { preview?: boolean; onLoopComplete?: () => void } = {},
) {
    let disposed = false;
    let introTimer = 0;
    let fadeTimer = 0;
    let surveyTriggerBtn: HTMLButtonElement | null = null;
    const removers: (() => void)[] = [];

    function on(target: EventTarget, event: string, handler: EventListener) {
        target.addEventListener(event, handler);
        removers.push(() => target.removeEventListener(event, handler));
    }

    function element(id: string) {
        return host.querySelector<HTMLElement>(`#${id}`)!;
    }

    let started = false;
    const WALK_SPEED = 4.5;
    const TURN_SPEED = 1.5;
    const CHOICE_RANGE = 3.5;
    const FULL_VOLUME_DISTANCE = 2;
    const SILENT_DISTANCE = 8;
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
        new THREE.PlaneGeometry(40, WORLD_LENGTH * 3 + 20),
        new THREE.MeshStandardMaterial({ color: 0x616063 }),
    );

    if (!options.preview) {
        surveyTriggerBtn = document.createElement("button");
        surveyTriggerBtn.textContent = "End Loop & Feedback";
        surveyTriggerBtn.className = "absolute bottom-6 right-6 px-4 py-2 bg-slate-800/90 hover:bg-slate-700 backdrop-blur border border-slate-600 rounded-full text-xs text-white shadow-lg transition z-30 font-sans pointer-events-auto cursor-pointer";

        surveyTriggerBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
        surveyTriggerBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            host.dispatchEvent(new CustomEvent("open-survey"));
        });

        host.style.position = "relative";
        host.appendChild(surveyTriggerBtn);
    }

    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -WORLD_LENGTH / 2;
    placeholder.add(floor);
    scene.add(placeholder);

    let onSceneChanged = () => { };

    function describeParts(root: THREE.Object3D, url: string) {
        root.updateWorldMatrix(true, true);
        const lines: string[] = [];
        const walk = (node: THREE.Object3D, depth: number) => {
            if (depth > 3 || lines.length >= 40) return;
            const size = new THREE.Box3()
                .setFromObject(node, true)
                .getSize(new THREE.Vector3());
            lines.push(
                `${"  ".repeat(depth)}${node.name || node.type}: ` +
                `${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}`,
            );
            node.children.forEach((child) => walk(child, depth + 1));
        };
        walk(root, 0);
        console.info(`[street] parts of ${url}\n${lines.join("\n")}`);
    }

    function preparePart(root: THREE.Object3D, settings: HouseModel) {
        if (settings.inspect) describeParts(root, settings.url);
        if (!settings.part) return root;
        const found = root.getObjectByName(settings.part);
        if (!found) {
            console.warn(`[street] no part named "${settings.part}" in ${settings.url}`);
            return root;
        }
        root.updateWorldMatrix(true, true);
        const copy = found.clone(true);
        found.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
        const holder = new THREE.Group();
        holder.add(copy);
        return holder;
    }

    function prepareTemplate(source: THREE.Object3D, settings: HouseModel) {
        source.rotation.y = settings.turn ?? 0;
        const size = new THREE.Box3()
            .setFromObject(source, true)
            .getSize(new THREE.Vector3());
        source.scale.setScalar(
            (settings.height !== undefined
                ? settings.height / size.y
                : (settings.length ?? HOUSE_LENGTH) / Math.max(size.x, size.z)) *
            (settings.zoom ?? 1),
        );
        const bounds = new THREE.Box3().setFromObject(source, true);
        const centre = bounds.getCenter(new THREE.Vector3());
        source.position.set(-centre.x, -bounds.min.y + (settings.lift ?? 0), -centre.z);
        const template = new THREE.Group();
        template.add(source);
        return template;
    }

    const gltfLoader = new GLTFLoader();
    for (const area of AREAS) {
        area.models.forEach((model, modelIndex) => {
            gltfLoader.load(
                model.url,
                (result) => {
                    if (disposed) return;
                    const template = prepareTemplate(
                        preparePart(result.scene, model),
                        model,
                    );
                    const modelCount = area.models.length;

                    for (const offset of [-WORLD_LENGTH, 0, WORLD_LENGTH]) {
                        for (
                            let i = 0;
                            i < WORLD_LENGTH / STREET_SLOT_LENGTH;
                            i += area.slotStep
                        ) {
                            const localZ = -i * STREET_SLOT_LENGTH;
                            if (!isInArea(localZ, area)) continue;
                            const z = localZ + offset;
                            const slot = i / area.slotStep;

                            if (slot % modelCount === modelIndex) {
                                const left = template.clone(true);
                                left.position.set(-HOUSE_SIDE_X, 0, z);
                                left.rotation.y = Math.PI / 2;
                                placeholder.add(left);
                            }

                            if ((slot + 1) % modelCount === modelIndex) {
                                const right = template.clone(true);
                                right.position.set(HOUSE_SIDE_X, 0, z);
                                right.rotation.y = -Math.PI / 2;
                                placeholder.add(right);
                            }
                        }
                    }
                    onSceneChanged();
                },
                undefined,
                (error) => {
                    console.error(`Could not load ${model.url}:`, error);
                },
            );
        });
    }

    gltfLoader.load(
        ROAD_URL,
        (result) => {
            if (disposed) return;
            const source = result.scene;
            const rawSize = new THREE.Box3().setFromObject(source, true).getSize(new THREE.Vector3());
            const turned = new THREE.Group();
            turned.rotation.y = rawSize.x > rawSize.z ? Math.PI / 2 : 0;
            turned.add(source);

            const scaled = new THREE.Group();
            scaled.add(turned);
            const size = new THREE.Box3().setFromObject(scaled, true).getSize(new THREE.Vector3());
            const scaleX = ROAD_WIDTH / size.x;
            const scaleZ = ROAD_PIECE_LENGTH / size.z;
            scaled.scale.set(scaleX, Math.min(scaleX, scaleZ), scaleZ);

            const bounds = new THREE.Box3().setFromObject(scaled, true);
            const centre = bounds.getCenter(new THREE.Vector3());
            scaled.position.set(-centre.x, -bounds.min.y + 0.02, -centre.z);

            const tile = new THREE.Group();
            tile.add(scaled);

            const pieces = (WORLD_LENGTH * 3) / ROAD_PIECE_LENGTH;
            for (let n = 0; n < pieces; n++) {
                const piece = tile.clone(true);
                piece.position.set(
                    0,
                    0,
                    WORLD_LENGTH - ROAD_PIECE_LENGTH / 2 - n * ROAD_PIECE_LENGTH,
                );
                placeholder.add(piece);
            }
            onSceneChanged();
        },
        undefined,
        (error) => console.error(`Could not load ${ROAD_URL}:`, error),
    );

    function disposeScene() {
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                materials.forEach((material) => {
                    for (const value of Object.values(material)) {
                        if (value instanceof THREE.Texture) value.dispose();
                    }
                    material.dispose();
                });
            }
        });
    }

    if (options.preview) {
        const draw = () => {
            if (disposed) return;
            camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
            camera.updateProjectionMatrix();
            renderer.setSize(host.clientWidth, host.clientHeight);
            renderer.render(scene, camera);
        };
        onSceneChanged = draw;
        const observer = new ResizeObserver(draw);
        observer.observe(host);
        draw();
        return () => {
            disposed = true;
            observer.disconnect();
            disposeScene();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }

    const listener = new THREE.AudioListener();
    camera.add(listener);
    const audioLoader = new THREE.AudioLoader();
    let audioPaused = false;
    let muted = false;

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

    on(window, "keyup", ((e: KeyboardEvent) => setKey(e, false)) as EventListener);
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
            joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
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

        distanceZ += movement.z * WALK_SPEED * delta;
        lowestZ = Math.min(lowestZ, distanceZ);
        highestZ = Math.max(highestZ, distanceZ);
        if (!completed && highestZ - lowestZ >= WORLD_LENGTH) {
            completed = true;
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
    const heard: Station[] = [];
    const listenLabel = listenBtn.textContent;

    function checkNearbyInstallations() {
        if (!started) return;

        for (const inst of installations) {
            inst.mesh.position.z = inst.z + WORLD_LENGTH * Math.round((camera.position.z - inst.z) / WORLD_LENGTH);

            if (!inst.sound.buffer) continue;

            const distance = camera.position.distanceTo(inst.mesh.position);
            if (distance > SILENT_DISTANCE && passed.includes(inst))
                passed.splice(passed.indexOf(inst), 1);
            const isClose = distance < SILENT_DISTANCE && !passed.includes(inst);

            if (isClose && !inst.sound.isPlaying) inst.sound.play();
            if (!isClose && inst.sound.isPlaying) inst.sound.stop();

            const boxIsOpen = current !== null;
            inst.sound.setVolume(boxIsOpen && inst !== current ? 0 : 1);
        }

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

            const demographics = [
                nearest.age ? `Age ${nearest.age}` : null,
                nearest.gender ? nearest.gender : null,
            ]
                .filter(Boolean)
                .join(", ");

            choiceText.textContent = demographics
                ? `${demographics} — "${nearest.title}"`
                : nearest.title;
            if (nearest.audio_status === "ready" && nearest.voice_id)
                choiceText.textContent += " — AI-narrated";

            listenBtn.textContent = heard.includes(nearest)
                ? "Listen again"
                : listenLabel;
            choiceBox.classList.remove("hidden");
        } else {
            current = null;
            choiceBox.classList.add("hidden");
        }
    }

    let playbackRequest = 0;
    on(listenBtn, "click", function () {
        const selected = current;
        if (!selected?.sound.buffer) return;
        if (!heard.includes(selected)) heard.push(selected);
        setAudioPaused(false);
        const request = ++playbackRequest;
        listening = true;
        paused = true;
        keys.forward = keys.back = keys.left = keys.right = false;
        joystick.x = joystick.y = 0;
        choiceText.textContent = "Starting story…";
        listenBtn.classList.add("hidden");
        passBtn.textContent = "Continue walking";
        void listener.context
            .resume()
            .then(() => {
                if (disposed || request !== playbackRequest || current !== selected)
                    return;
                if (selected.sound.isPlaying) selected.sound.stop();
                selected.sound.setVolume(1);
                selected.sound.play();
                choiceText.textContent =
                    selected.audio_status === "ready" && selected.voice_id
                        ? "Listening — AI-narrated story…"
                        : "Listening…";
            })
            .catch(() => {
                if (disposed || request !== playbackRequest) return;
                listening = false;
                paused = false;
                listenBtn.classList.remove("hidden");
                element("audio-status").textContent =
                    "Audio could not start. Try again or continue walking.";
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

    const controls = document.createElement("div");
    controls.style.cssText =
        "position:absolute;top:16px;right:16px;display:flex;gap:8px;z-index:20;";
    host.appendChild(controls);

    function makeButton(label: string, onClick: (button: HTMLButtonElement) => void): HTMLButtonElement {
        const button = document.createElement("button");
        button.textContent = label;
        button.style.cssText =
            "padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.4);" +
            "background:rgba(20,20,40,0.7);color:white;font-size:14px;cursor:pointer;";
        on(button, "click", () => {
            onClick(button);
            host.focus();
        });
        controls.appendChild(button);
        return button;
    }

    function setAudioPaused(value: boolean): void {
        audioPaused = value;
        if (value) void listener.context.suspend();
        else void listener.context.resume();
        pauseButton.textContent = value ? "▶ Play" : "⏸ Pause";
    }
    const pauseButton = makeButton("⏸ Pause", () => setAudioPaused(!audioPaused));

    makeButton("Mute", (button) => {
        muted = !muted;
        listener.setMasterVolume(muted ? 0 : 1);
        button.textContent = muted ? "Unmute" : "Mute";
    });

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
        surveyTriggerBtn?.remove();
        renderer.setAnimationLoop(null);
        resize.disconnect();
        removers.forEach((remove) => remove());
        installations.forEach((inst) => {
            if (inst.sound.isPlaying) inst.sound.stop();
            inst.sound.disconnect();
        });
        disposeScene();
        renderer.dispose();
        renderer.domElement.remove();
    };
}