var scene;
var camera;
var renderer;
var controls;
var gamepad;

var material;

var _panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 1 });
var hq = false;

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

function init3() {
    scene = new THREE.Scene();

    var width = window.innerWidth;
    var height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
    camera.position.x = 0.1;
    camera.fov = 100;
    camera.updateProjectionMatrix();

    renderer = new THREE.WebGLRenderer( { antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.vr.enabled = true;

    document.body.appendChild(WEBVR.createButton(renderer));

    // controls = new THREE.OrbitControls(camera);
    // controls.enablePan = false;
    // controls.enableZoom = false;
    // controls.autoRotate = false;
    // controls.autoRotateSpeed = 0.5;

    material = new THREE.MeshBasicMaterial();

    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(100, 20, 20),
        material
    );

    sphere.scale.x = -1;
    scene.add(sphere);

    gamepad = new THREE.DaydreamController();
    gamepad.position.set(0.1, 0, 0);
    scene.add(gamepad);
    
    var gamepadHelper = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ linewidth: 4 }));
    gamepadHelper.geometry.addAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 10], 3));
    gamepad.add(gamepadHelper);

    document.body.appendChild(renderer.domElement);

    loadIndex(0);

    animate();
}

function init() {
    init3();

    _panoLoader.onPanoramaLoad = function () {

        // Connect the image to the Texture
        var texture = new THREE.Texture();

        var image = new Image();
        image.onload = function () {
            
            texture.image = image;
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            
            material.needsUpdate = true;
            material.map = texture;
            material.map.needsUpdate = true;

            console.log("loading complete");

            document.getElementById("loading").style.display = "none";
        };

        image.src = this.canvas.toDataURL();
    };
}

function animate() {
    requestAnimationFrame(animate);
    gamepad.update();
    // controls.update();
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
    
    if (e.keyCode == '38') {
        // Up Arrow
        increment(true);
    } else if (e.keyCode == '40') {
        // Down Arrow
        increment(false);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize, false);
document.onkeydown = checkKey;
window.onload = init;