var container;
var scene, camera, renderer;

var material;

var _panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 2 });
var hq = false;

var _depthLoader = new GSVPANO.PanoDepthLoader();
var canvas = document.createElement("canvas");

var roadIndex = 0;

var road = [
    {
        "latitude": -35.2784167,
        "longitude": 149.1294692
    },
    {
        "latitude": -35.280321693840129,
        "longitude": 149.12908274880189
    },
    {
        "latitude": -35.2803415,
        "longitude": 149.1290788
    },
    {
        "latitude": -35.2803415,
        "longitude": 149.1290788
    },
    {
        "latitude": -35.280451499999991,
        "longitude": 149.1290784
    },
    {
        "latitude": -35.2805167,
        "longitude": 149.1290879
    },
    {
        "latitude": -35.2805901,
        "longitude": 149.1291104
    },
    {
        "latitude": -35.2805901,
        "longitude": 149.1291104
    },
    {
        "latitude": -35.280734599999995,
        "longitude": 149.1291517
    },
    {
        "latitude": -35.2807852,
        "longitude": 149.1291716
    },
    {
        "latitude": -35.2808499,
        "longitude": 149.1292099
    },
    {
        "latitude": -35.280960897210818,
        "longitude": 149.1293250692261
    },
    {
        "latitude": -35.284728724835304,
        "longitude": 149.12835061713685
    }
];

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

function hasVR() {
    return ('getVRDisplays' in navigator);
}

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(120, window.innerWidth / window.innerHeight, 0.01, 100);
    
    var light = new THREE.AmbientLight(0xffffff); // soft white light
    scene.add(light);
    
    material = new THREE.MeshPhongMaterial();
    material.side = THREE.DoubleSide;

    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10, 20, 20),
        material
    );

    scene.add(sphere);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.vr.enabled = true;

    container.appendChild(renderer.domElement);

    document.body.appendChild(WEBVR.createButton(renderer));

    initPano();

    window.addEventListener('resize', onWindowResize, false);
    document.onkeydown = checkKey;

    loadIndex(0);
}

function initPano() {

    _panoLoader.onPanoramaLoad = function () {
        _depthLoader.load(this.panoId);

        // Connect the image to the Texture
        var texture = new THREE.Texture();

        var image = new Image();
        image.onload = function () {

            texture.image = image;
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;

            material.map = texture;
            material.needsUpdate = true;
            material.map.needsUpdate = true;

            console.log("loading pano complete");
        };

        image.src = this.canvas.toDataURL();
    };


    _depthLoader.onDepthLoad = function () {
        var x, y, context, image, w, h, c;

        context = canvas.getContext('2d');

        w = this.depthMap.width;
        h = this.depthMap.height;

        canvas.setAttribute('width', w);
        canvas.setAttribute('height', h);

        image = context.getImageData(0, 0, w, h);

        for (y = 0; y < h; ++y) {
            for (x = 0; x < w; ++x) {
                c = this.depthMap.depthMap[y * w + x] / 50 * 255;
                image.data[4 * (y * w + x)] = c;
                image.data[4 * (y * w + x) + 1] = c;
                image.data[4 * (y * w + x) + 2] = c;
                image.data[4 * (y * w + x) + 3] = 255;
            }
        }

        // Connect the image to the Texture
        var texture = new THREE.Texture();
        texture.image = image;
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        // material.map = texture;

        material.displacementMap = texture;
        material.displacementScale = -1;

        material.needsUpdate = true;
        material.map.needsUpdate = true;

        console.log("loading depth complete");

        document.getElementById("loading").style.display = "none";

        // material.wireframe = true;
        // material.wireframeLinewidth = 5;
    };
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
    renderer.render(scene, camera);
}

function loadIndex(i) {
    var lat = road[i].latitude;
    var long = road[i].longitude;

    console.log("get (lat: " + lat + ", long: " + long + ")");
    _panoLoader.load(new google.maps.LatLng(lat, long));
}

function increment(positive) {
    if (positive) {
        roadIndex++;
    } else {
        roadIndex--;
        if (roadIndex < 0) roadIndex += road.length;
    }

    roadIndex = roadIndex % road.length;

    loadIndex(roadIndex);
}

function checkKey(e) {
    e = e || window.event;

    if (e.keyCode == '37') {
        // Left Arrow
        camera.rotation.y += 0.1;
    } else if (e.keyCode == '38') {
        // Up Arrow
        // increment(true);
        camera.translateZ(-1);
    } else if (e.keyCode == '39') {
        // Right Arrow
        camera.rotation.y -= 0.1;
    } else if (e.keyCode == '40') {
        // Down Arrow
        // increment(false);
        camera.translateZ(1);
    }

    // var maxRadius = 8;
    // var len = Math.len
    // var maxX = Math.cos(camera.rotation.y) * max;
    // var maxZ = Math.sin(camera.rotation.y) * max;

    // camera.position.x = clamp(camera.position.x, -maxX, maxX);
    // camera.position.z = clamp(camera.position.z, -maxZ, maxZ);

    camera.position.clampLength(-8, 8);

    camera.updateProjectionMatrix();

    // console.log(camera.position);
}


init();
animate();