var container;
var scene, camera, renderer, controls, stats;
var sphere, mesh, material;

var radius = 270;

var hq = false;
var _panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 1 });
var _depthLoader = new GSVPANO.PanoDepthLoader();

var drawPoints = false;

// need to unload these with renderer.deallocateTexture(texture);
var panoramas = [];
var depthMaps = [];

var currentLoaded = 0;
var currentSphere = 0;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

assert = function (cond, text) {
    console.assert(cond, text);
    return cond;
};

function hasVR() {
    return ('getVRDisplays' in navigator);
}

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, radius * 3);
    
    controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    
    stats = new Stats();
    container.appendChild(stats.dom);
    
    // Hardcoded width/height since we always get the same sized depth map, assert in updating geo
    // Using a place since it is easy to make and has the UVs I am looking for
    sphere = new THREE.PlaneGeometry(50, 50, 512 - 1, 256 - 1);
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
    
    var origin = new THREE.Mesh(
        new THREE.SphereGeometry(5, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0x555555 })
    );
    scene.add(origin);
    
    if (hasVR()) {
        document.body.appendChild(WEBVR.createButton(renderer));
        renderer.vr.enabled = true;
    }
    
    controls.enabled = true;
    document.addEventListener('click', function (event) {
        // Ask the browser to lock the pointer
        document.body.requestPointerLock();
    }, false);
    
    window.addEventListener('resize', onWindowResize, false);
    document.onkeydown = checkKey;
    
    initListeners();

    loadIndex(currentLoaded);
}

function initListeners() {

    _panoLoader.onPanoramaLoad = function () {
        // Start loading depth map immediately
        _depthLoader.load(this.panoId);

        // Connect the image to the Texture
        var texture = new THREE.Texture();

        // cache the texture
        panoramas[this.panoId] = texture;

        var image = new Image();
        image.onload = function () {
            texture.image = image;
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
        };

        image.src = this.canvas.toDataURL();
    };


    _depthLoader.onDepthLoad = function () {
        // cache the depth map
        depthMaps[this.depthMap.panoId] = this.depthMap;

        if (currentLoaded < road.length - 1) {
            if (currentLoaded == 0) {
                // Start rendering
                animate();

                // show 1st sphere
                updateSphere(getId(currentSphere));

                // hide the loading message
                document.getElementById("loading").style.display = "none";
            }

            currentLoaded++;
            document.getElementById("progress").style.width = ((currentLoaded / (road.length - 1)) * 100) + "%";
            loadIndex(currentLoaded);
        } else {
            if (!assert(Object.keys(panoramas).length == Object.keys(depthMaps).length, { "message": "panoramas and depthMaps have different lengths",
                "panoramas.length": Object.keys(panoramas).length, "depthMaps.length": Object.keys(depthMaps).length })) return;

            // Hide loading message
            document.getElementById("progress").style.display = "none";
        }
    };
}

function getId(index) {
    if (!assert(index < Object.keys(panoramas).length, { "message": "index greater than panoramas.length", "index": index,
        "panoramas.length": Object.keys(panoramas).length })) return;
    if (!assert(index < Object.keys(depthMaps).length, { "message": "index greater than deptMaths.length", "index": index,
        "depthMaps.length": Object.keys(depthMaps).length })) return;
        
    return Object.keys(depthMaps)[index];
}

function updateSphere(panoId) {
    if (!assert(panoramas[panoId] !== undefined, { "message": "panorama not defined for given panoId", "panoId": panoId })) return;
    if (!assert(depthMaps[panoId] !== undefined, { "message": "depth map not defined for given panoId", "panoId": panoId })) return;

    this.depthMap = depthMaps[panoId];

    var w = this.depthMap.width;
    var h = this.depthMap.height;
    
    if (!assert(w === 512, { "message": "width not equal 512", "w": w })) return;
    if (!assert(h === 256, { "message": "height not eqaul 256", "w": w })) return;

    for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
            c = this.depthMap.depthMap[y * w + x] / 50 * 255;
            c = clamp(c, 0, 256);

            var xnormalize = (w - x - 1) / (w - 1);
            var ynormalize = (h - y - 1) / (h - 1);
            var theta = xnormalize * (2 * Math.PI);
            var phi = ynormalize * Math.PI;

            var tmpX = c * Math.sin(phi) * Math.cos(theta);
            var tmpY = c * Math.sin(phi) * Math.sin(theta);
            var tmpZ = c * Math.cos(phi);

            sphere.vertices[y * w + x].set(tmpX, tmpY, tmpZ);
        }
    }

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

    // material.wireframe = true;
    // material.wireframeLinewidth = 5;
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
    renderer.render(scene, camera);
}

function loadIndex(i) {
    var lat = road[i].latitude;
    var long = road[i].longitude;

    _panoLoader.load(new google.maps.LatLng(lat, long));
}


init();