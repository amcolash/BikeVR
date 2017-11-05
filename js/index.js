var container;
var camera, scene, ray, raycaster, renderer;
var material;

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


function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10);
    material = new THREE.MeshBasicMaterial();

    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10, 20, 20),
        material
    );

    sphere.scale.x = -1;
    scene.add(sphere);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.vr.enabled = true;
    container.appendChild(renderer.domElement);

    document.body.appendChild(WEBVR.createButton(renderer));

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

    window.addEventListener('resize', onWindowResize, false);
    document.onkeydown = checkKey;

    loadIndex(0);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
    renderer.animate(render);
}

function render() {
    // gamepad.update();
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


init();
animate();