// Init service worker immediately
if (navigator.serviceWorker) {
    navigator.serviceWorker.register('service_worker.js')
    .then(function(registration) {
        console.log('Service worker registration successful, scope is:', registration.scope);
    })
    .catch(function(error) {
        console.log('Service worker registration failed, error:', error);
    });
}

var container;
var scene, camera, renderer, controls, rendererStats;
var statsHUD, infoHUD, pathHUD, pathCanvas, pathContext;
var mesh1, mesh2, cameraRig, bikeRig, pedalRig, cube1, cube2;

const perf = false;
const hq = true;

const manager = new THREE.LoadingManager();
const loader = new THREE.GLTFLoader(manager);
const clock = new THREE.Clock();

const streetViewService = new google.maps.StreetViewService();
const panoWorker = new Worker("/js/workers/pano_worker.js");
const depthWorker = new Worker("/js/workers/depth_worker.js");

var defaultDepthmap;

// Draw wireframes
const wireframe = false;

// Sphere setup
const sphereRadius = 100;
const verticalSphereSegments = 70;
const horizontalSphereSegments = 100;

const bluetoothSlowdown = 0.75;
const movementSpeed = 40;
const alphaBlend = 0.05;

var panoramas = {};
var depthMaps = {};
var info = {};

var hudInfo = {};
var markers = [];

var startingSphere, currentSphere;

// If this is set to +1 or -1, update sphere after loading accordingly. This helps going backwards
var sphereAfterLoad = 0;

var tmpVec2 = new THREE.Vector2();

// Load things up
window.onload = initRoute;

function initRoute() {
    var params = decodeParameters(window.location.search);
    
    // Setup start spehere
    startingSphere = Number.parseInt(params.startingSphere || 0);
    progress = startingSphere * 25;
    currentSphere = startingSphere;

    if (params.startLat && params.startLng && params.endLat && params.endLng) {
        var start = params.startLat + ", " + params.startLng;
        var end = params.endLat + ", " + params.endLng;
        customRoute(start, end, initRenderer);
    } else {
        defaultRoute(initRenderer);
    }
}


// Init renderer and create vr button (if needed), then call init
function initRenderer() {
    container = document.createElement('div');
    // container.style.display = "none";
    document.body.appendChild(container);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.autoClear = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    document.body.appendChild(WEBVR.createButton(renderer, { callback: init, frameOfReferenceType: 'eye-level' }));
}

// Called after we have gotten a route with g-maps
function init() {
    if (perf) console.time("init");
    
    // Start scene
    initScene();
    loadBike();
    initInfo();
    initDefaultDepthMap();

    // Setup dom
    initDOM();
    initListeners();

    // Start load
    loadIndex(startingSphere);
    
    if (perf) console.timeEnd("init");
}

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);

    // Add in a rig so that the base rotation of the camera can be set in vr
    cameraRig = new THREE.Object3D();
    cameraRig.position.set(0, -200, 0);
    cameraRig.rotation.set(0, -Math.PI / 2, 0);
    if (WEBVR.hasVR) {
        renderer.vr.enabled = true;
        cameraRig.add(camera);
    } else {
        camera.position.copy(cameraRig.position);

        controls = new THREE.FirstPersonControls(camera);
        controls.lookSpeed = 1.25;
        controls.movementSpeed = 300;
        controls.lookVertical = true;
        controls.constrainVertical = false;
        controls.verticalMin = 3.0;
        controls.verticalMax = 0.0;
        controls.autoSpeedFactor = 0.5;
    }
    scene.add(cameraRig);

    // Make main geo
    var geo = new THREE.SphereBufferGeometry(sphereRadius, horizontalSphereSegments, verticalSphereSegments);
    var mat1 = createMaterial();
    mesh1 = new THREE.Mesh(geo, mat1);
    mesh1.frustumCulled = false;
    scene.add(mesh1);

    var mat2 = createMaterial();
    mesh2 = new THREE.Mesh(geo, mat2);
    mesh2.frustumCulled = false;
    scene.add(mesh2);

    // Add in upcoming sphere marker
    var geo2 = new THREE.BoxBufferGeometry(25, 25, 25, 10, 10);
    var mat3 = new THREE.MeshLambertMaterial( {color: 0x555555} );
    cube1 = new THREE.Mesh(geo2, mat3);
    scene.add(cube1);

    cube2 = new THREE.Mesh(geo2, mat3);
    scene.add(cube2);

    // Add a light for the cube
    var light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(light);

    // White directional light at half intensity shining from the top.
    // var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    // directionalLight.target = cube;
    // scene.add( directionalLight );

    var light1 = new THREE.AmbientLight(0x505050); // soft white light
    scene.add(light1);
}

function loadBike() {
    // Load bike model
    loader.load('/res/bike.glb', (gltf) => {
        // Make a rig for the bike, offset a bit below the camera
        bikeRig = new THREE.Group();

        // The funny part is that this bike just looks like the right size since it is up close to the camera
        const scale = 95;
        bikeRig.scale.set(scale, scale, scale);
        bikeRig.position.set(0, -130, 30);
        cameraRig.add(bikeRig);

        // Add meshes to the rig, make new material
        const material = new THREE.MeshBasicMaterial({
            color: "#339933",
            depthTest: false,
            transparent: true,
            opacity: 0.4
        });
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                const clone = child.clone();
                clone.material = material;
                bikeRig.add(clone);
            }
        });
    }, undefined, (error) => {
        console.error(error);
    });
}

function initDOM() {
    var playToggle = document.getElementById('playToggle');
    var saveButton = document.getElementById("save");
    var loadButton = document.getElementById("load");

    saveButton.addEventListener('click', function(event) {
        var params = decodeParameters(window.location.search);
        if (currentSphere > 0) params.startingSphere = currentSphere;

        window.localStorage.setItem("params", encodeParameters(params));
    });

    loadButton.addEventListener('click', function(event) {
        const params = window.localStorage.getItem("params");
        if (params) window.location.search = params;
    });

    container.addEventListener('click', function (event) {
        // Ask the browser to lock the pointer
        document.body.requestPointerLock();
    }, false);

    var playToggle = document.getElementById("playToggle");
    playToggle.innerText = autoMove ? "||" : ">";
    playToggle.addEventListener('click', function (event) {
        autoMove = !autoMove;
        velocity = autoMove ? defaultSpeed : 0;
        playToggle.innerText = autoMove ? "||" : ">";
    });

    window.addEventListener('resize', onWindowResize, false);

    rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '20px';
    rendererStats.domElement.style.top = '140px';
    document.body.appendChild(rendererStats.domElement);
}

function initListeners() {
    panoWorker.onmessage = function (e) {
        // cache the lat/long
        info[e.data.panoId] = e.data.info;

        // Keep track of this texture
        makeTexture(e.data.panoId, e.data.imageBitmap, false);

        // Get the depth bitmap
        depthWorker.postMessage({panoId: e.data.panoId});
        depthWorker.onmessage = function(e) {
            const panoId = e.data.panoId;
            makeTexture(panoId, e.data.imageBitmap, true);

            if (!assert(Object.keys(panoramas).length == Object.keys(depthMaps).length, { "message": "panoramas and depthMaps have different lengths",
                "panoramas.length": Object.keys(panoramas).length, "depthMaps.length": Object.keys(depthMaps).length })) {
                return;
            }

            if (sphereAfterLoad === 0) {
                if (getIndex(panoId) === startingSphere) {
                    loadIndex(startingSphere + 1);
                    return;
                }

                // Init after loading first sphere
                if (getIndex(panoId) === startingSphere + 1) {
                    // show 1st sphere
                    updateSphere(getId(currentSphere), getId(currentSphere - 1), getId(currentSphere + 1));

                    // Draw first section of the path
                    updatePath();

                    // Start the clock ticking
                    clock.getDelta();

                    // start rendering
                    renderer.setAnimationLoop(render);

                    // wipe starting sphere after inital load so that things are ok
                    startingSphere = 0;
                }
            }

            if (getId(currentSphere + 1) === panoId) updateNextPano(panoId);
            handleAfterLoad();
        }
    };
}

function loadIndex(i) {
    if (!getId(i)) {
        var location = road[i];
        streetViewService.getPanorama({location: location, radius: 50, source: 'outdoor'}, function (result, status) {
            if (status === google.maps.StreetViewStatus.OK) {
                // var h = google.maps.geometry.spherical.computeHeading(location, result.location.latLng);
                var data = {
                    rotation: result.tiles.centerHeading * Math.PI / 180.0,
                    copyright: result.copyright,
                    panoId: result.location.pano,
                    lat: location.lat(),
                    lng: location.lng()
                };

                panoWorker.postMessage({result: data, index: i, hq: hq});
            } else {
                panoWorker.postMessage({result: undefined, index: i, hq: hq});
            }
        });

    } else {
        handleAfterLoad();
    }
}

function handleAfterLoad() {
    if (sphereAfterLoad !== 0) {
        var tmpValue = sphereAfterLoad;
        sphereAfterLoad = 0;
        changeSphere(tmpValue);
    }
}

function initDefaultDepthMap() {
    var img = document.getElementById("defaultDepthmap");

    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = img.width;
    newCanvas.height = img.height;

    //apply the old canvas to the new one
    context.drawImage(img, 0, 0);

    // Connect the image to the Texture
    const texture = new THREE.CanvasTexture(newCanvas);
    texture.minFilter = THREE.LinearFilter;

    // cache the texture
    defaultDepthmap = texture;
}

function makeTexture(panoId, canvas, depthMap) {
    if (perf) console.time("makeTexture");

    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    //apply the old canvas to the new one
    context.drawImage(canvas, 0, 0);

    // Connect the image to the Texture
    const texture = new THREE.CanvasTexture(newCanvas);
    texture.minFilter = THREE.LinearFilter;

    // cache the texture
    if (depthMap) {
        depthMaps[panoId] = texture;
    } else {
        panoramas[panoId] = texture;
    }

    if (perf) console.timeEnd("makeTexture");
}

function createMaterial() {
    var mat = new THREE.ShaderMaterial({
        uniforms: {
            texture: {
                type: "t",
                value: undefined,
            },
            displace: {
                type: "t",
                value: undefined,
            },
            nextBlend: {
                type: "f",
                value: 0
            }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide,
        wireframe: wireframe,
        blending: THREE.NormalBlending,
        depthTest: true,
        transparent: false
    });
    mat.needsUpdate = true;
    return mat;
}

function resetCamera() {
    if (WEBVR.hasVR) {
        camera.position.set(0, 0, 0);
    } else {
        camera.position.copy(cameraRig.position);
    }

    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
}

// TODO: Actually query based on current city
// Info: https://en.wikipedia.org/w/api.php?action=help&modules=query%2Bextracts
// Endpoint: https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exsentences=5&exintro&explaintext&titles=Seattle
function initInfo() {
    hudInfo.infoWidth = 256;
    hudInfo.infoHeight = 64;
    hudInfo.fontSize = 18;
    hudInfo.updateSpeed = 2;
    hudInfo.enabled = WEBVR.hasVR;

    pathCanvas = document.createElement("canvas");
    pathContext = pathCanvas.getContext("2d");
    pathCanvas.width = 128;
    pathCanvas.height = 128;

    if (WEBVR.hasVR) {
        statsHUD = new StatsVR(cameraRig, 8, 8, 0, 13, -20);
        statsHUD.setXRotation(0.5);
        infoHUD = new StatsVR(cameraRig, 30, 7.5, 40, 0, -20.1, hudInfo.infoWidth, hudInfo.infoHeight);
        infoHUD.setYRotation(-1.2);
        pathHUD = new StatsVR(cameraRig, 9, 9, -25, 0, -20.2, pathCanvas.width, pathCanvas.height);
        pathHUD.setYRotation(0.95);

        // Rotate reminder HUD
        var rotateHUD = new StatsVR(cameraRig, 4, 4, 0, -6, 20, 128, 128);
        statsHUD.setXRotation(-0.35);
        rotateHUD.setYRotation(Math.PI);
        var rotateCanvas = document.createElement("canvas");
        var rotateContext = rotateCanvas.getContext("2d");
        rotateCanvas.width = 128;
        rotateCanvas.height = 128;
    
        var rotateImg = document.getElementById("rotateImage");
        rotateContext.drawImage(rotateImg, 0, 0, 256, 256, 0, 0, 128, 128);
        rotateHUD.updateImage(rotateCanvas);
    } else {
        statsHUD = new StatsVR(cameraRig, 4, 4, -13.75, 11.8, -20);
        infoHUD = new StatsVR(cameraRig, 15, 3.75, -8, -11.5, -20.1, hudInfo.infoWidth, hudInfo.infoHeight);
        pathHUD = new StatsVR(cameraRig, 4, 4, -13.5, -11.5, -20.2, pathCanvas.width, pathCanvas.height);
    }

    const text = "Seattle ( ( listen) see-AT-\u0259l) is a seaport city on the west coast of the United States. It  is the seat of King County, Washington. With an estimated 730,000 residents as of  2018, Seattle is the largest city in both the state of Washington and the Pacific Northwest region of North America. According to U.S. Census data released in 2018, the Seattle metropolitan area\u2019s population stands at 3.87 million, and ranks as the 15th largest in the United States. In July 2013, it was the fastest-growing major city in the United States and remained in the Top 5 in May 2015 with an annual growth rate of 2.1%.";
    setHUDInfo(text);
}

function setHUDInfo(text) {
    hudInfo.lines = wrapCanvasText(text, hudInfo.fontSize, hudInfo.infoWidth);
}

function getId(index) {
    return Object.keys(info).filter(function(id) {
        if (info[id]) return info[id].index === index;
        return false;
    })[0];
}

function getIndex(panoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "this panoId could not be found in panoramas", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "this panoId could not be found in depthMaps", "panoId": panoId })) return;
    if (!assert(info[panoId] !== undefined, { "message": "this panoId could not be found in info", "panoId": panoId })) return;

    return info[panoId].index;
}

function updateSphere(panoId, prevPanoId, nextPanoId) {
    var index = getIndex(panoId);
    if (typeof index === "undefined" || index < 0 || index >= road.length) return;

    var rotation = info[panoId] ? -info[panoId].rot : 0;
    if ((index + 1) < road.length) {
        rotation += google.maps.geometry.spherical.computeHeading(road[index], road[index + 1]).toRad();
    } else {
        rotation += google.maps.geometry.spherical.computeHeading(road[index - 1], road[index]).toRad();
    }
    mesh1.rotation.set(0, rotation, 0);

    var depthMap = depthMaps[panoId] || defaultDepthmap;
    var texture = panoramas[panoId];

    // // Assign new textures
    mesh1.material.uniforms.displace.value = depthMap;
    mesh1.material.uniforms.texture.value = texture;

    // Update next pano (most of the time will actually happen after load outside of here)
    updateNextPano(nextPanoId);

    // Unload previous texture. Seems to be ok even on "reload" of texture...
    if (depthMaps[prevPanoId]) depthMaps[prevPanoId].dispose();
    if (panoramas[prevPanoId]) panoramas[prevPanoId].dispose();

    // Wipe from memory best we can, this could get messy
    // There are tons of issues, so ejecting even older
    var oldId = getId(index - 2);
    if (index - 2 >= 0 && oldId) {
        depthMaps[oldId] = undefined;
        panoramas[oldId] = undefined;
        info[oldId] = undefined;
    }

    updatePath();
    resetCamera();

    // Preload next sphere if needed
    if ((index + 1) < road.length) loadIndex(index + 1);
}

function updatePath() {
    if (pathCanvas && pathContext) {
        drawPath(pathContext, currentSphere);
        pathHUD.updateImage(pathCanvas);
    }
}

function updateNextPano(nextPanoId) {
    if (nextPanoId) {
        var nextIndex = getIndex(nextPanoId);
        var nextRotation = -info[nextPanoId].rot;
        if ((nextIndex + 1) < road.length) {
            nextRotation += google.maps.geometry.spherical.computeHeading(road[nextIndex], road[nextIndex + 1]).toRad();
        } else {
            nextRotation += google.maps.geometry.spherical.computeHeading(road[nextIndex - 1], road[nextIndex]).toRad();
        }
        mesh2.rotation.set(0, nextRotation, 0);
    } else {
        mesh2.rotation.set(0, mesh1.rotation.y, 0);
    }

    mesh2.material.uniforms.displace.value = depthMaps[nextPanoId] || defaultDepthmap;
    mesh2.material.uniforms.texture.value = panoramas[nextPanoId];
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

var counter = 0;
var index = 0;
var buttonDebounce = 0;
var bikeWobbleDir = 1;
var bikeWobbleMax = 0.007;

function update(delta) {
    // Get gamepad state
    var gamepads = navigator.getGamepads();
    if (gamepads && gamepads[0] && gamepads[0].buttons) {
        var touched = gamepads[0].buttons[0].touched;
        var pressed = gamepads[0].buttons[0].pressed;
    }

    // Figure out velocity
    if (bluetoothStats) {
        velocity = bluetoothStats.speed * bluetoothSlowdown;
    } else {
        if (keysDown["75"]) {
            velocity = Math.max(0, velocity - 0.5); // key K
        } else if (keysDown["76"]) {
            velocity += 0.5; // key L
        } else if (keysDown["78"]) {
            velocity = -defaultSpeed; // key N
        } else if (keysDown["77"]) {
            velocity = defaultSpeed; // key M
        } else if (!autoMove) {
            velocity = 0;
        }
    }

    // Disable hud if needed
    var now = Date.now();
    if (pressed && now > (buttonDebounce + 500)) {
        autoMove = !autoMove;
        velocity = autoMove ? defaultSpeed : 0;
        buttonDebounce = now;
    }

    // Move the spheres
    if (velocity !== 0 || true) {
        var mps = velocity * 1000 / 3600;
        progress = clamp(progress + delta * mps, 0, dist);

        currPos.setCenter(getPosition());
        if (map) map.setCenter(currPos.getCenter());

        var movement = clamp(measure(currPos.getCenter(), currPano.getCenter()) * 2.5, -sphereRadius * 0.75, sphereRadius * 0.75) * movementSpeed;
        
        // This way we don't need angles to figure things out and things blend ok
        movement *= -currentSign * 0.9;

        const blend = 2250;
        mesh1.position.set(movement, -1, 0);
        mesh2.position.set(movement + blend, -1, 0);
    }

    // Update mouse controls
    if (controls) controls.update(delta);

    if (sphereProgress > 1 - alphaBlend) {
        mesh1.material.uniforms.nextBlend.value = (1 - sphereProgress) * (1 / alphaBlend);
        mesh2.material.uniforms.nextBlend.value = 1 - ((1 - sphereProgress) * (1 / alphaBlend));
        mesh2.visible = true;

        mesh1.material.depthTest = false;
        mesh2.material.depthTest = false;
        mesh1.material.transparent = true;
        mesh2.material.transparent = true;
    } else {
        mesh1.material.uniforms.nextBlend.value = 1;
        mesh2.material.uniforms.nextBlend.value = 0;
        mesh2.visible = false;

        mesh1.material.depthTest = true;
        mesh2.material.depthTest = true;
        mesh1.material.transparent = false;
        mesh2.material.transparent = false;
    }

    mesh1.visible = false;
    mesh2.visible = false;

    // Update HUDs
    statsHUD.setCustom1(velocity.toFixed(1) + " km/hr");
    statsHUD.setCustom4("Sphere: " + currentSphere);
    if (bluetoothStats) {
        statsHUD.setCustom2(bluetoothStats.cadence.toFixed(1) + " rpm");
        statsHUD.setCustom3(bluetoothStats.distance.toFixed(1) + " km");
    } else {
        statsHUD.setCustom2(((50 / defaultSpeed) * velocity).toFixed(0) + " rpm");
        statsHUD.setCustom3((progress / 1000).toFixed(1) + " km");
    }

    statsHUD.update();

    // Check if we need to update hud
    infoHUD.setEnabled(hudInfo.enabled);
    if (hudInfo.enabled) {
        counter += delta;
        if (counter > hudInfo.updateSpeed) {
            counter = 0;
            index = (index + 1) % hudInfo.lines.length;
        }
        infoHUD.multilineText(hudInfo.lines, index);
    }
    
    // assume 50rpm at 17km/h if no bluetooth, multiply by two to make it act like rpm
    var cadence = bluetoothStats ? bluetoothStats.cadence : (50 / defaultSpeed) * velocity;
    var pedalSpeed = (cadence / 60) * delta * (Math.PI * 2);

    // Spin both pedals
    bikeRig.traverse(child => {
        // console.log(child)
        if (child.name === "pedal-left" || child.name === "pedal-right") {
            child.rotation.set((child.rotation.x - pedalSpeed) % (Math.PI * 2), 0, 0);
        }
    });

    // A little bit of back and forth wobble to make things look even nicer ;)
    bikeRig.rotation.set(0, 0, bikeRig.rotation.z + pedalSpeed * 0.005 * bikeWobbleDir);

    if (bikeRig.rotation.z > bikeWobbleMax) {
        bikeRig.rotation.set(0, 0, bikeWobbleMax)
        bikeWobbleDir = -1;
    } else if (bikeRig.rotation.z < -bikeWobbleMax) {
        bikeRig.rotation.set(0, 0, -bikeWobbleMax)
        bikeWobbleDir = 1;
    }

    cube1.rotation.y = (cube1.rotation.y + 0.012) % Math.PI;
    cube1.position.x = mesh1.position.x + 1400;
    cube1.position.y = Math.sin(cube1.rotation.y * 4) * 20 + 200;

    cube2.position.x = mesh1.position.x - 875;
    cube2.rotation.y = (cube2.rotation.y + 0.012) % Math.PI;
    cube2.position.y = Math.sin(cube2.rotation.y * 4) * 20 + 200;
}

function render() {
    var delta = clock.getDelta();
    statsHUD.msStart();

    update(delta);
    renderer.render(scene, camera);

    rendererStats.update(renderer);
    statsHUD.msEnd();
}
