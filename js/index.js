var container;
var scene, sceneHUD, camera, cameraHUD, mesh1, mesh2, wireframeMesh, textureHUD, contextHUD, renderer, controls, stats, rendererStats;

const hq = false;
const perf = false;

const clock = new THREE.Clock();

// Those shaders aren't going anywhere!
const vertexShader = document.getElementById("vertexShader").text;
const fragmentShader = document.getElementById("fragmentShader").text;

// Draw points
const drawPoints = false;

// Draw wireframes
const wireframe = false;

// Sphere setup
const sphereRadius = 100;
const verticalSphereSegments = 70;
const horizontalSphereSegments = 50;

// Movement offset
const movementSpeed = 40;

const alphaBlend = 0.05;

var panoramas = {};
var depthMaps = {};
var info = {};

var hudInfo = {};

var markers = [];

var currentLoaded = 0;
var currentSphere = 0;

var tmpVec2 = new THREE.Vector2();

window.onload = function() {
    if (perf) console.time("fully loaded");
    var params = decodeParameters(window.location.search);
    if (params.startLat && params.startLng && params.endLat && params.endLng) {
        var start = params.startLat + ", " + params.startLng;
        var end = params.endLat + ", " + params.endLng;
        customRoute(start, end);
    } else {
        defaultRoute();
    }
}

// Called after we have gotten a route with g-maps
function init() {
    if (perf) console.time("init");

    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    sceneHUD = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20000);

    controls = new THREE.FirstPersonControls(camera);
    controls.lookSpeed = 1.25;
    controls.movementSpeed = 300;
    controls.lookVertical = true;
    // controls.constrainVertical = true;
    controls.verticalMin = 1.0;
    controls.verticalMax = 2.0;
    controls.autoSpeedFactor = 0.5;

    // Make main geo
    var geo = new THREE.SphereBufferGeometry(sphereRadius, horizontalSphereSegments, verticalSphereSegments);
    var mat1 = createMaterial(false);
    mesh1 = new THREE.Mesh(geo, mat1);
    mesh1.frustumCulled = false;
    scene.add(mesh1);

    var mat2 = createMaterial(false);
    mesh2 = new THREE.Mesh(geo, mat2);
    mesh2.frustumCulled = false;
    scene.add(mesh2);

    if (wireframe) {
        // Make wireframe mesh
        var geo1 = new THREE.SphereBufferGeometry(sphereRadius - 2, horizontalSphereSegments, verticalSphereSegments);
        var mat3 = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        wireframeMesh = new THREE.Mesh(geo1, mat3);
        wireframeMesh.frustumCulled = false;

        // I am doing this to keep the fragment
        // and only modify the vertex shader
        wireframeMesh.material = createMaterial(true);
        scene.add(wireframeMesh);
    }

    initInfo();

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.autoClear = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    stats = new Stats();
    container.appendChild(stats.dom);

    rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.top = '48px';
    document.body.appendChild(rendererStats.domElement);
    
    var mapElem = document.getElementById('map');
    var playToggle = document.getElementById('playToggle');
    var mapToggle = document.getElementById('mapToggle');

    if (hasVR()) {
        document.body.appendChild(WEBVR.createButton(renderer));
        renderer.vr.enabled = true;

        // Hide map on mobile by default
        mapElem.classList = "hidden";
        mapToggle.innerText = "+";
    }

    // controls.enabled = true;
    container.addEventListener('click', function (event) {
        // Ask the browser to lock the pointer
        document.body.requestPointerLock();
    }, false);

    var playToggle = document.getElementById("playToggle");
    playToggle.innerText = autoMove ? "||" : ">";
    playToggle.addEventListener('click', function (event) {
        autoMove = !autoMove;
        velocity = autoMove ? 17 : 0;
        playToggle.innerText = autoMove ? "||" : ">";
    });

    var mapToggle = document.getElementById("mapToggle");
    mapToggle.addEventListener('click', function (event) {
        if (mapToggle.innerText === "+") {
            // show
            mapElem.classList = "";
            mapToggle.innerText = "-";
        } else {
            // hide
            mapElem.classList = "hidden";
            mapToggle.innerText = "+";
        }
    });

    window.addEventListener('resize', onWindowResize, false);

    if (perf) console.timeEnd("init");

    for (var i = 0; i < road.length; i++) {
        loadIndex(i);
    }
}

function loadIndex(i) {
    let panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 1 });
    let depthLoader = new GSVPANO.PanoDepthLoader();
    initListeners(panoLoader, depthLoader);

    panoLoader.load(road[i], i);
}

function createMaterial(wireframe) {
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
        fragmentShader: wireframe ? undefined : fragmentShader,
        side: THREE.DoubleSide,
        wireframe: wireframe,
        blending: THREE.NormalBlending,
        depthTest: false,
        transparent: true
    });
    mat.needsUpdate = true;
    return mat;
}

function resetCamera() {
    camera.position.set(0, -80, 0);
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
}

function initListeners(panoLoader, depthLoader) {
    panoLoader.onPanoramaLoad = function () {
        // cache the lat/long
        info[this.panoId] = {
            lat: this.lat,
            lng: this.lng,
            rot: this.rotation,
            index: this.index
        };

        // Keep track of this texture
        makeTexture(this.panoId, this.canvas);

        // Load the next depth map
        depthLoader.load(this.panoId);
    };

    depthLoader.onDepthLoad = function () {
        // cache the depth map
        depthMaps[this.depthMap.panoId] = createDepthMapTexture(this.depthMap);

        // update progress bar
        document.getElementById("progress").style.width = ((currentLoaded / (road.length - 2)) * 100) + "%";

        if (currentLoaded < road.length - 1) {
            // if (currentLoaded === 0) {
            //     // Start rendering
            //     renderer.animate(render);

            //     // show 1st sphere
            //     updateSphere(getId(currentSphere));

            //     // hide the loading message
            //     document.getElementById("loading").style.display = "none";
            // }

            // load the next pano/depth map
            currentLoaded++;
            console.log(currentLoaded + "/" + (road.length - 1));
            // loadIndex(currentLoaded);
        } else {
            if (!assert(Object.keys(panoramas).length == Object.keys(depthMaps).length, { "message": "panoramas and depthMaps have different lengths",
                "panoramas.length": Object.keys(panoramas).length, "depthMaps.length": Object.keys(depthMaps).length })) {
                document.getElementById("progress").style.backgroundColor = "red";
                return;
            }

            // hide the loading messages
            document.getElementById("loading").style.display = "none";
            document.getElementById("progress").style.display = "none";

            // show 1st sphere
            updateSphere(getId(currentSphere), getId(currentSphere - 1), getId(currentSphere + 1));

            // update markers after everything has loaded
            updateMarkers();

            var panoId = getId(0);
            var depthMap = depthMaps[panoId];
            var texture = panoramas[panoId];

            // Assign new textures
            mesh1.material.uniforms.displace.value = depthMap;
            mesh1.material.uniforms.texture.value = texture;

            if (perf) console.timeEnd("fully loaded");

            // Start the clock ticking
            clock.getDelta();

            // start rendering
            renderer.animate(render);
        }
    };
}

function createDepthMapTexture(depthMap) {
    if (perf) console.time("createDepthMap");
    var x, y, canvas, context, image, w, h, c;

    canvas = document.createElement("canvas");
    context = canvas.getContext('2d');

    w = depthMap.width;
    h = depthMap.height;

    canvas.setAttribute('width', w);
    canvas.setAttribute('height', h);

    image = context.getImageData(0, 0, w, h);

    for (y = 0; y < h; ++y) {
        for (x = 0; x < w; ++x) {
            c = depthMap.depthMap[y * w + x] / 50 * 255;
            image.data[4 * (y * w + x)] = c;
            image.data[4 * (y * w + x) + 1] = c;
            image.data[4 * (y * w + x) + 2] = c;
            image.data[4 * (y * w + x) + 3] = 255;
        }
    }

    context.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    if (perf) console.timeEnd("createDepthMap");
    return texture;
}

function makeTexture(panoId, canvas) {
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
    panoramas[panoId] = texture;

    if (perf) console.timeEnd("makeTexture");
}

// TODO: Actually query based on current city
// Info: https://en.wikipedia.org/w/api.php?action=help&modules=query%2Bextracts
// Endpoint: https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exsentences=5&exintro&explaintext&titles=Seattle
function initInfo() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    cameraHUD = new THREE.OrthographicCamera(
        -width / 2, width / 2,
        height / 2, -height / 2,
        0, 30
    );

    hudInfo.canvas = document.createElement("canvas");
    contextHUD = hudInfo.canvas.getContext('2d');

    hudInfo.canvas.width = 2048;
    hudInfo.canvas.height = 2048;

    var geometry = new THREE.PlaneGeometry(width, height);
    textureHUD = new THREE.CanvasTexture(hudInfo.canvas, { minFilter: THREE.LinearFilter });
    var material = new THREE.MeshBasicMaterial({ map: textureHUD, transparent: true });

    sceneHUD.add(new THREE.Mesh(geometry, material));

    hudInfo.infoWidth = 700;
    hudInfo.infoHeight = 550;
    hudInfo.fontSize = 50;
    hudInfo.updateSpeed = 3;
    hudInfo.fps = 60;
    hudInfo.frame = 16;

    contextHUD.fillStyle = "rgba(255, 255, 255, 0.75)";
    contextHUD.font = hudInfo.fontSize + 'px sans';
    contextHUD.textBaseline = 'top';
    const text = "Seattle ( ( listen) see-AT-\u0259l) is a seaport city on the west coast of the United States. It  is the seat of King County, Washington. With an estimated 730,000 residents as of  2018, Seattle is the largest city in both the state of Washington and the Pacific Northwest region of North America. According to U.S. Census data released in 2018, the Seattle metropolitan area\u2019s population stands at 3.87 million, and ranks as the 15th largest in the United States. In July 2013, it was the fastest-growing major city in the United States and remained in the Top 5 in May 2015 with an annual growth rate of 2.1%.";
    hudInfo.lines = wrapCanvasText(text, hudInfo.fontSize, hudInfo.infoWidth, contextHUD);
}

function updateInfo(index, counter, delta) {
    // if (perf) console.time("updateInfo");
    contextHUD.clearRect(hudInfo.fontSize, hudInfo.canvas.height - hudInfo.infoHeight - hudInfo.fontSize, hudInfo.infoWidth, hudInfo.infoHeight + hudInfo.fontSize);
    for (var i = index, len = hudInfo.lines.length; i < len; i++) {
        if ((i - index) * hudInfo.fontSize < (hudInfo.infoHeight - hudInfo.fontSize)) {
            var yValue = hudInfo.canvas.height - hudInfo.infoHeight + ((i - index) * hudInfo.fontSize) + -counter * hudInfo.fontSize;
            contextHUD.fillText(hudInfo.lines[i], hudInfo.fontSize, yValue);
        }
    }

    // Average over past 30 samples
    var samples = 15;

    hudInfo.fps -= (hudInfo.fps / samples);
    hudInfo.fps += ((1 / delta) / samples);
    
    hudInfo.frame -= (hudInfo.frame / samples);
    hudInfo.frame += ((delta * 1000) / samples);

    var offset = 250;
    contextHUD.clearRect(hudInfo.canvas.width - offset, hudInfo.fontSize, offset, hudInfo.fontSize * 6);

    contextHUD.fillText((hudInfo.fps).toFixed(0) + " fps", hudInfo.canvas.width - offset, hudInfo.fontSize);
    contextHUD.fillText((hudInfo.frame).toFixed(0) + " ms", hudInfo.canvas.width - offset, hudInfo.fontSize * 2);
    contextHUD.fillText(velocity.toFixed(1) + " km/hr", hudInfo.canvas.width - offset, hudInfo.fontSize * 4);

    if (bluetoothStats) {
        contextHUD.fillText(bluetoothStats.cadence.toFixed(1) + " rpm", hudInfo.canvas.width - offset, hudInfo.fontSize * 5);
        contextHUD.fillText(bluetoothStats.distance.toFixed(1) + " km", hudInfo.canvas.width - offset, hudInfo.fontSize * 6);
    }

    if (textureHUD) textureHUD.needsUpdate = true;
    // if (perf) console.timeEnd("updateInfo");
}

function getId(index) {
    if (!assert(typeof index == "number", { "message": "index provided is not a number", "index": index })) return;
    if (!assert(index < Object.keys(panoramas).length, {
        "message": "index greater than panoramas.length",
        "index": index,
        "panoramas.length": Object.keys(panoramas).length
    })) { console.trace(); return };
    if (!assert(index < Object.keys(depthMaps).length, {
        "message": "index greater than depthMaths.length",
        "index": index,
        "depthMaps.length": Object.keys(depthMaps).length
    })) { console.trace(); return };
    if (!assert(index < Object.keys(info).length, {
        "message": "index greater than info.length",
        "index": index,
        "info.length": Object.keys(info).length
    })) { console.trace(); return };

    return Object.keys(info).filter(function(id) {
        return info[id].index === index;
    })[0];
}

function getIndex(panoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "this panoId could not be found in panoramas", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "this panoId could not be found in depthMaps", "panoId": panoId })) return;
    if (!assert(info[panoId] !== undefined, { "message": "this panoId could not be found in info", "panoId": panoId })) return;

    return info[panoId].index;
}

function updateSphere(panoId, prevPanoId, nextPanoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "panorama not defined for given panoId", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "depth map not defined for given panoId", "panoId": panoId })) return;
    if (!assert(info[panoId] !== undefined, { "message": "info not defined for given panoId", "panoId": panoId })) return;

    var index = getIndex(panoId);
    var rotation = -info[panoId].rot;
    if ((index + 1) < road.length) {
        rotation += google.maps.geometry.spherical.computeHeading(road[index], road[index + 1]).toRad();
    } else {
        rotation += google.maps.geometry.spherical.computeHeading(road[index - 1], road[index]).toRad();
    }
    mesh1.rotation.set(0, rotation, 0);

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
        mesh2.rotation.set(0, rotation, 0);
    }

    var depthMap = depthMaps[panoId];
    var texture = panoramas[panoId];

    // // Assign new textures
    mesh1.material.uniforms.displace.value = depthMap;
    mesh1.material.uniforms.texture.value = texture;

    mesh2.material.uniforms.displace.value = depthMaps[nextPanoId];
    mesh2.material.uniforms.texture.value = panoramas[nextPanoId];

    // Unload previous texture (only in prod?) Seems to be ok in dev even on "reload" of texture...
    if (depthMaps[prevPanoId]) depthMaps[prevPanoId].dispose();
    if (panoramas[prevPanoId]) panoramas[prevPanoId].dispose();

    if (wireframe) {
        wireframeMesh.material.uniforms.displace.value = depthMap;
        wireframeMesh.material.uniforms.texture.value = texture;
    }

    resetCamera();

    // update markers
    updateMarkers();
}

function updateMarkers() {
    return;

    if (markers.length === 0 || markers.length !== Object.keys(info).length) {
        for (var i = 0; i < markers.length; i++) {
            renderer.dispose(markers[i]);
        }

        markers = [];

        var size = 8;
        var marker = new THREE.BoxGeometry(size, size, size);
        var material = new THREE.MeshPhongMaterial({ side: THREE.DoubleSide });

        for (var i = 0; i < Object.keys(info).length; i++) {
            var mesh = new THREE.Mesh(marker, material);
            markers[i] = mesh;
            scene.add(mesh);
        }
    }

    var baseLat = info[getId(currentSphere)].lat;
    var baseLng = info[getId(currentSphere)].lng;
    for (var i = 0; i < markers.length; i++) {
        var markerLat = info[getId(i)].lat;
        var markerLng = info[getId(i)].lng;

        var length = measure(baseLat, baseLng, markerLat, markerLng);

        var diffLat = baseLat - markerLat;
        var diffLng = baseLng - markerLng;

        tmpVec.set(diffLng, diffLat, 0).normalize();

        console.log("measure: " + length);

        markers[i].position.x = length * tmpVec.x;
        markers[i].position.z = length * tmpVec.y;

        console.log("x: " + markers[i].position.x + ", z: " + markers[i].position.z);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

var counter = 0;
var index = 0;
function render() {
    var delta = clock.getDelta();

    counter += delta;
    if (counter > hudInfo.updateSpeed) {
        counter = 0;
        index = (index + 1) % hudInfo.lines.length;
    }
    
    // Only update once things are loaded up
    if (currentLoaded == road.length - 1) {
        // figure out velocity each frame
        if (!typeof bluetoothStats) {
            velocity = bluetoothStats.speed;
        } else {
            if (keysDown["75"]) {
                velocity -= 0.5; // key K
            } else if (keysDown["76"]) {
                velocity += 0.5; // key L
            } else if (keysDown["78"]) {
                velocity = -17; // key N
            } else if (keysDown["77"]) {
                velocity = 17; // key M
            } else if (!autoMove) {
                velocity = 0;
            }
        }

        if (velocity !== 0) {
            var mps = velocity * 1000 / 3600;
            progress = (progress + delta * mps) % dist;


            // console.log(sphereProgress, mesh.material.uniforms.prevBlend.value, mesh.material.uniforms.nextBlend.value);

            currPos.setCenter(getPosition());
            map.setCenter(currPos.getCenter());

            tmpVec2.set(currPos.getCenter().lat() - currPano.getCenter().lat(), currPos.getCenter().lng() - currPano.getCenter().lng());
            var angle = tmpVec2.angle();
            var movement = clamp(measure(currPos.getCenter(), currPano.getCenter()) * 3.5, -sphereRadius * 0.75, sphereRadius * 0.75) * movementSpeed;

            mesh1.position.set(Math.cos(angle) * movement, -1, 0);
            mesh2.position.set(mesh1.position.x - Math.cos(angle) * sphereRadius * 35, -1, 0);
        }

        // if (sphereProgress < alphaBlend) {
        //     mesh1.material.uniforms.prevBlend.value = 1 - (sphereProgress * (1 / alphaBlend));
        //     mesh1.material.uniforms.nextBlend.value = 0;
        //     mesh2.visible = true;
        if (sphereProgress > 1 - alphaBlend) {
            mesh1.material.uniforms.nextBlend.value = (1 - sphereProgress) * (1 / alphaBlend);
            mesh2.material.uniforms.nextBlend.value = 1 - ((1 - sphereProgress) * (1 / alphaBlend));
            mesh2.visible = true;
        } else {
            mesh1.material.uniforms.nextBlend.value = 1;
            mesh2.material.uniforms.nextBlend.value = 0;
            mesh2.visible = false;
        }
    }

    // Update hud
    updateInfo(index, counter / hudInfo.updateSpeed, delta);

    controls.update(delta);

    renderer.render(scene, camera);

    // Update stats here to profile the scene render, not the hud render
    stats.update();	
    rendererStats.update(renderer);

    renderer.render(sceneHUD, cameraHUD);
}