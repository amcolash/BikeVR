var container;
var scene, camera, renderer, controls, stats, raycaster;
var sphere, mesh, origin, material;

var clock = new THREE.Clock();

var radius = 270;

var hq = false;
var _panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 1 });
var _depthLoader = new GSVPANO.PanoDepthLoader();

var drawPoints = false;
var autoMove = false;

var depthFactor = 4;

const WIDTH = 512 / depthFactor;
const HEIGHT = 256 / depthFactor;

var panoramas = {};
var depthMaps = {};
var info = {};

var markers = [];

var currentLoaded = 0;
var currentSphere = 0;

var position = new THREE.Vector3();

defaultRoute();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);

    controls = new THREE.FirstPersonControls(camera);
    controls.lookSpeed = 1.5;
    controls.movementSpeed = 10;
    controls.noFly = true;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 1.0;
    controls.verticalMax = 2.0;
    
    // controls = new THREE.PointerLockControls(camera);
    // scene.add(controls.getObject());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    
    stats = new Stats();
    container.appendChild(stats.dom);
    
    raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0));

    // Hardcoded width/height since we always get the same sized depth map, assert in updating geo
    // Using a place since it is easy to make and has the UVs I am looking for
    sphere = new THREE.PlaneGeometry(50, 50, WIDTH - 1, HEIGHT - 1);
    material = new THREE.MeshPhongMaterial({ side: THREE.DoubleSide });

    mesh = new THREE.Mesh(
        sphere,
        material
    );
    
    // Rotate the mesh (since I don't math)
    mesh.rotation.x = (Math.PI / 2);
    scene.add(mesh);
    
    var light = new THREE.AmbientLight(0xffffff);
    scene.add(light);
    
    origin = new THREE.Mesh(
        new THREE.SphereGeometry(5, 20, 20),
        // new THREE.MeshBasicMaterial({ color: 0x555555 })
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    scene.add(origin);
    
    if (hasVR()) {
        document.body.appendChild(WEBVR.createButton(renderer));
        renderer.vr.enabled = true;
    }
    
    // controls.enabled = true;
    container.addEventListener('click', function (event) {
        // Ask the browser to lock the pointer
        document.body.requestPointerLock();
    }, false);
    
    window.addEventListener('resize', onWindowResize, false);
    document.onkeydown = checkKey;
    
    initListeners();

    loadIndex(currentLoaded);
}

function resetCamera() {
    // if (intersects.length > 0) {
    //     camera.position.y = (radius * 0.7) + intersects[0].point.y;
    // } else {
    //     camera.position.set(0, 0, 0);
    // }

    camera.position.set(0, 0, -1);
    camera.rotation.set(0, 0, 0);
}

function initListeners() {

    _panoLoader.onPanoramaLoad = function () {
        // Start loading depth map immediately
        _depthLoader.load(this.panoId);

        // cache the lat/long
        info[this.panoId] = {
            "lat": this.lat,
            "lng": this.lng,
            "rot": this.rotation
        };

        makeTexture(this.panoId, this.canvas.toDataURL());
    };


    _depthLoader.onDepthLoad = function () {
        // cache the depth map
        depthMaps[this.depthMap.panoId] = this.depthMap;

        // update progress bar
        document.getElementById("progress").style.width = ((currentLoaded / (road.length - 2)) * 100) + "%";

        if (currentLoaded < road.length - 1) {
            if (currentLoaded == 0) {
                // Start rendering
                animate();

                // show 1st sphere
                updateSphere(getId(currentSphere));

                // hide the loading message
                document.getElementById("loading").style.display = "none";
            }

            // load the next pano/depth map
            currentLoaded++;
            loadIndex(currentLoaded);
        } else {
            if (!assert(Object.keys(panoramas).length == Object.keys(depthMaps).length, { "message": "panoramas and depthMaps have different lengths",
                "panoramas.length": Object.keys(panoramas).length, "depthMaps.length": Object.keys(depthMaps).length })) return;
            
            // update markers after everything has loaded
            updateMarkers();

            // Hide loading message
            document.getElementById("progress").style.display = "none";
        }
    };
}

function makeTexture(panoId, data) {
    // Connect the image to the Texture
    var texture = new THREE.Texture();

    // cache the texture
    panoramas[panoId] = texture;

    var image = new Image();
    image.onload = function () {
        texture.image = image;
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
    };

    image.src = data;
}

function getId(index) {
    if (!assert(typeof index == "number", { "message": "index provided is not a number", "index": index })) return;
    if (!assert(index < Object.keys(panoramas).length, { "message": "index greater than panoramas.length", "index": index,
        "panoramas.length": Object.keys(panoramas).length })) return;
    if (!assert(index < Object.keys(depthMaps).length, { "message": "index greater than depthMaths.length", "index": index,
        "depthMaps.length": Object.keys(depthMaps).length })) return;
    if (!assert(index < Object.keys(info).length, { "message": "index greater than info.length", "index": index,
        "info.length": Object.keys(info).length })) return;
        
    return Object.keys(panoramas)[index];
}

function getIndex(panoId) {
    if (!assert(panoramas[panoId] != undefined, { "message": "this panoId could not be found in depthMaps", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] != undefined, { "message": "this panoId could not be found in depthMaps", "panoId": panoId })) return;
    if (!assert(info[panoId] != undefined, { "message": "this panoId could not be found in info", "panoId": panoId })) return;

    return Object.keys(panoramas).indexOf(panoId);
}

function updateSphere(panoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "panorama not defined for given panoId", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "depth map not defined for given panoId", "panoId": panoId })) return;
    if (!assert(info[panoId] !== undefined, { "message": "info not defined for given panoId", "panoId": panoId })) return;

    var depthMap = depthMaps[panoId];

    var w = depthMap.width / depthFactor;
    var h = depthMap.height / depthFactor;
    
    // if (!assert(w === WIDTH, { "message": "width not equal " + WIDTH, "w": w })) return;
    // if (!assert(h === HEIGHT, { "message": "height not eqaul " + HEIGHT, "h": h })) return;

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

    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            c = depthMap.depthMap[y * depthFactor * w * depthFactor + x * depthFactor] / 50 * 255;

            c = clamp(c, 0, 256);

            var xnormalize = (w - x - 1) / (w - 1);
            var ynormalize = (h - y - 1) / (h - 1);
            var theta = xnormalize * (2 * Math.PI) + rotation;
            var phi = ynormalize * Math.PI;

            var tmpX = c * Math.sin(phi) * Math.cos(theta);
            var tmpY = c * Math.sin(phi) * Math.sin(theta);
            var tmpZ = c * Math.cos(phi);

            sphere.vertices[y * w + x].set(tmpX, tmpY, tmpZ);
        }
    }

    sphere.isDirty = true;
    
    mesh.geometry.verticesNeedUpdate = true;

    material.map = panoramas[panoId];
    material.needsUpdate = true;
    material.map.needsUpdate = true;

    // careful since this one is made every time this is called
    if (drawPoints) {
        var points = new THREE.Points(
            sphere,
            new THREE.PointsMaterial()
        );

        // Rotate the mesh (since I don't math)
        points.rotation.x = (Math.PI / 2);
        scene.add(points);
    }

    // See if the ray from the camera into the world hits one of our meshes
    var intersects = raycaster.intersectObject(mesh);
    // Toggle rotation bool for meshes that we clicked
    // if (intersects.length > 0) {
    //     // slightly above ground
    //     camera.position.y = (radius * 0.7) + intersects[0].point.y;

    //     // Go to the opposite side from where we came from
    //     camera.x *= -1;
    //     camera.z *= -1;

    //     camera.updateProjectionMatrix();
    // }
    // camera.position.set(0, 0, 0);
    // camera.updateProjectionMatrix();
    resetCamera();

    // update markers
    updateMarkers();

    // material.wireframe = true;
    // material.wireframeLinewidth = 5;
}

function updateMarkers() {
    return;

    if (markers.length == 0 || markers.length != Object.keys(info).length) {
        for (var i = 0; i < markers.length; i++) {
            renderer.dispose(markers[i]);
        }

        markers = [];

        var size = 8;
        var marker = new THREE.BoxGeometry(size, size, size);
        var material = new THREE.MeshPhongMaterial( {side: THREE.DoubleSide} );

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

function animate() {
    renderer.animate(render);
}

function render() {
    stats.update();

    // Only update once things are loaded up
    if (currentLoaded == road.length - 1) {
        var delta = clock.getDelta();
        controls.update(delta);
        camera.position.y = -1;

        if (autoMove) {
            progress = (progress + delta * mps) % dist;
            currPos.setCenter(getPosition());
            map.setCenter(currPos.getCenter());
        }
    }

    // Only render when things have changed in the scene
    if (isVisible && (controls.cameraDirty || sphere.isDirty)) {
        sphere.isDirty = false; // need to reset this one here
        // console.log("rendering, isVisible:" + isVisible + ", controls.cameraDirty: " + controls.cameraDirty + ", sphere.isDirty:" + sphere.isDirty);

        renderer.render(scene, camera);
        return;
    }

    // console.log("skipping, isVisible:" + isVisible + ", controls.cameraDirty: " + controls.cameraDirty + ", sphere.isDirty:" + sphere.isDirty);
}

function loadIndex(i) {
    _panoLoader.load(road[i]);
}
