var container;
var scene, camera, mesh1, mesh2, wireframeMesh, renderer, controls, stats, rendererStats;

const hq = true;
const perf = false;

const clock = new THREE.Clock();
const _panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 1 });
const _depthLoader = new GSVPANO.PanoDepthLoader();

// Those shaders aren't going anywhere!
const vertexShader = document.getElementById("vertexShader").text;
const fragmentShader = document.getElementById("fragmentShader").text;

// Draw points
const drawPoints = false;

// Draw wireframes
const wireframe = false;

// Sphere setup
const sphereRadius = 100;
const verticalSphereSegments = 80;
const horizontalSphereSegments = 60;

// Movement offset
const movementSpeed = 30;

var panoramas = {};
var depthMaps = {};
var info = {};

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
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 20000);

    controls = new THREE.FirstPersonControls(camera);
    controls.lookSpeed = 1.25;
    controls.movementSpeed = 300;
    controls.lookVertical = true;
    // controls.constrainVertical = true;
    controls.verticalMin = 1.0;
    controls.verticalMax = 2.0;
    controls.autoSpeedFactor = 0.5;

    // Make main geo
    var geo = new THREE.SphereGeometry(sphereRadius, horizontalSphereSegments, verticalSphereSegments);
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
        var geo1 = new THREE.SphereGeometry(sphereRadius - 2, horizontalSphereSegments, verticalSphereSegments);
        var mat3 = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        wireframeMesh = new THREE.Mesh(geo1, mat3);
        wireframeMesh.frustumCulled = false;

        // I am doing this to keep the fragment
        // and only modify the vertex shader
        wireframeMesh.material = createMaterial(true);
        scene.add(wireframeMesh);
    }

    renderer = new THREE.WebGLRenderer({ antialias: false });
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
    
    initListeners();

    if (perf) console.timeEnd("init");
    loadIndex(currentLoaded);
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
        depthWrite: false,
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

function initListeners() {
    _panoLoader.onPanoramaLoad = function () {
        // cache the lat/long
        info[this.panoId] = {
            "lat": this.lat,
            "lng": this.lng,
            "rot": this.rotation
        };

        // Keep track of this texture
        makeTexture(this.panoId, this.canvas);

        // Load the next depth map
        _depthLoader.load(this.panoId);
    };

    _depthLoader.onDepthLoad = function () {
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
            loadIndex(currentLoaded);
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
    texture.needsUpdate = true;

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
    texture.needsUpdate = true;

    // cache the texture
    panoramas[panoId] = texture;

    if (perf) console.timeEnd("makeTexture");
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

    return Object.keys(panoramas)[index];
}

function getIndex(panoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "this panoId could not be found in depthMaps", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "this panoId could not be found in depthMaps", "panoId": panoId })) return;
    if (!assert(info[panoId] !== undefined, { "message": "this panoId could not be found in info", "panoId": panoId })) return;

    return Object.keys(panoramas).indexOf(panoId);
}

function updateSphere(panoId, prevPanoId, nextPanoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "panorama not defined for given panoId", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "depth map not defined for given panoId", "panoId": panoId })) return;
    if (!assert(info[panoId] !== undefined, { "message": "info not defined for given panoId", "panoId": panoId })) return;

    var rotation = info[panoId].rot;
    var index = getIndex(panoId);

    if (index > 0 && index < road.length) {
        var extra = google.maps.geometry.spherical.computeHeading(road[index - 1], road[index]).toRad();
        if (index > 1) {
            extra -= google.maps.geometry.spherical.computeHeading(road[index - 2], road[index - 1]).toRad();
        } else {
            extra -= google.maps.geometry.spherical.computeHeading(road[index - 1], road[index]).toRad();
        }
        rotation -= extra;
    }

    // mesh1.rotation.set(0, rotation, 0);
    // console.log(rotation)

    var depthMap = depthMaps[panoId];
    var texture = panoramas[panoId];

    // // Assign new textures
    mesh1.material.uniforms.displace.value = depthMap;
    mesh1.material.uniforms.texture.value = texture;

    mesh2.material.uniforms.displace.value = depthMaps[nextPanoId];
    mesh2.material.uniforms.texture.value = panoramas[nextPanoId];

    // Unload previous texture (only in prod?) Seems to be ok in dev even on "reload" of texture...
    // if (depthMaps[prevPanoId]) depthMaps[prevPanoId].dispose();
    // if (panoramas[prevPanoId]) panoramas[prevPanoId].dispose();

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

function render() {
    var delta = clock.getDelta();

    stats.update();
    rendererStats.update(renderer);
    
    // Only update once things are loaded up
    if (currentLoaded == road.length - 1) {

        // M to go forward, N to go back
        var moveDir = (autoMove || keysDown["77"]) ? 1 : (keysDown["78"] ? -1 : 0);
        if (moveDir !== 0) {
            progress = (progress + delta * mps * moveDir) % dist;
        }

        // console.log(sphereProgress, mesh.material.uniforms.prevBlend.value, mesh.material.uniforms.nextBlend.value);

        currPos.setCenter(getPosition());
        map.setCenter(currPos.getCenter());

        tmpVec2.set(currPos.getCenter().lat() - currPano.getCenter().lat(), currPos.getCenter().lng() - currPano.getCenter().lng());
        var angle = tmpVec2.angle();
        var movement = clamp(measure(currPos.getCenter(), currPano.getCenter()) * 4.5, -sphereRadius * 0.75, sphereRadius * 0.75) * movementSpeed;

        mesh1.position.set(Math.cos(angle) * movement, -1, 0 * Math.cos(angle) * movement);
        mesh2.position.set(mesh1.position.x - Math.cos(angle) * sphereRadius * 35, -1, mesh1.position.z - Math.cos(angle) * sphereRadius * 35);

        var alphaBlend = 0.03;
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

    controls.update(delta);
    renderer.render(scene, camera);
}

function loadIndex(i) {
    _panoLoader.load(road[i]);
}