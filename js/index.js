var container;
var scene, camera, renderer, controls;

var material;

var radius = 270;

var hq = false;
var _panoLoader = new GSVPANO.PanoLoader({ zoom: hq ? 3 : 1 });

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
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, radius * 3);
    
    if (!hasVR()) {
        controls = new THREE.PointerLockControls(camera);
        scene.add(controls.getObject());
        controls.enabled = true;

        document.addEventListener('click', function (event) {
            // Ask the browser to lock the pointer
            document.body.requestPointerLock();
        }, false);
    }

    var light = new THREE.AmbientLight(0xffffff); // soft white light
    scene.add(light);
    
    material = new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.75 });

    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 33),
        material
    );
    scene.add(sphere);

    var origin = new THREE.Mesh(
        new THREE.SphereGeometry(10, 20, 20),
        new THREE.MeshBasicMaterial()
    );
    scene.add(origin);

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
        console.log(this);

        _depthLoader.load(this.panoId);

        // Connect the image to the Texture
        var texture = new THREE.Texture();

        var image = new Image();
        image.onload = function () {

            texture.image = image;
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;

            // material.map = texture;
            // material.needsUpdate = true;
            // material.map.needsUpdate = true;

            console.log("loading pano complete");
        };

        image.src = this.canvas.toDataURL();
    };


    _depthLoader.onDepthLoad = function () {
        var x, y, context, image, w, h, c;

        context = canvas.getContext('2d');

        console.log(this.depthMap);

        w = this.depthMap.width;
        h = this.depthMap.height;

        canvas.setAttribute('width', w);
        canvas.setAttribute('height', h);

        image = context.getImageData(0, 0, w, h);

        var geometry = new THREE.BufferGeometry();

        var verts = new Float32Array(w * h * 3);
        var colors = new Float32Array(w * h * 3);
        var vec3verts = [];

        for (y = 0; y < h; ++y) {
            for (x = 0; x < w; ++x) {
                c = this.depthMap.depthMap[y * w + x] / 50 * 255;
                c = clamp(c, 0, 256);
                
                image.data[4 * (y * w + x)] = c;
                image.data[4 * (y * w + x) + 1] = c;
                image.data[4 * (y * w + x) + 2] = c;
                image.data[4 * (y * w + x) + 3] = 255;

                var xnormalize = (w - x - 1) / (w - 1);
                var ynormalize = (h - y - 1) / (h - 1);
                var theta = xnormalize * (2 * Math.PI) + (Math.PI / 2);
                var phi = ynormalize * Math.PI;

                var tmpX = c * Math.sin(phi) * Math.cos(theta);
                var tmpY = c * Math.sin(phi) * Math.sin(theta);
                var tmpZ = c * Math.cos(phi);

                var vector = new THREE.Vector3(tmpX, tmpY, tmpZ);
                vector.clampLength(-radius, radius);

                verts[3 * (y * w + x) + 0] = tmpX;
                verts[3 * (y * w + x) + 1] = tmpY;
                verts[3 * (y * w + x) + 2] = tmpZ;

                colors[3 * (y * w + x) + 0] = c / 255;
                colors[3 * (y * w + x) + 1] = c / 255;
                colors[3 * (y * w + x) + 2] = c / 255;

                vec3verts.push(vector);
            }
        }

        geometry.addAttribute('position', new THREE.BufferAttribute(verts, 3));
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingBox();

        // var mesh = new THREE.Mesh(
        //     new THREE.ConvexGeometry(vec3verts),
        //     new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, color: 0xff0000} )
        // );

        // TODO: MESH

        var mesh = new THREE.Points(
            geometry,
            new THREE.PointsMaterial({ vertexColors: THREE.VertexColors })
        );

        // Rotate the mesh (since I don't math)
        mesh.rotation.x = (Math.PI / 2);
        scene.add(mesh);

        // Connect the image to the Texture
        var texture = new THREE.Texture();
        texture.image = image;
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        // material.map = texture;

        // material.displacementMap = texture;
        // material.displacementScale = -1;

        // material.needsUpdate = true;
        // material.map.needsUpdate = true;

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

    var delta = 1/60;
    var velocity = 30;

    // controls.getObject().translateX(velocity * delta);
    // controls.getObject().translateY(velocity * delta);
    // controls.getObject().translateZ(velocity * delta);
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

function increment() {
    roadIndex = (roadIndex + 1) % road.length;
    loadIndex(roadIndex);
}

function checkKey(e) {
    e = e || window.event;

    var speed = 5;

    if (e.keyCode == '37') {
        // Left Arrow
        camera.rotation.y += 0.1;
    } else if (e.keyCode == '38') {
        // Up Arrow
        // camera.translateZ(-1);
        camera.rotation.x += 0.1;
    } else if (e.keyCode == '39') {
        // Right Arrow
        camera.rotation.y -= 0.1;
    } else if (e.keyCode == '40') {
        // Down Arrow
        // camera.translateZ(1);
        camera.rotation.x -= 0.1;
    } else if (e.keyCode == '82') {
        // 'R'
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
    } else if (e.keyCode == '87') {
        // W
        camera.translateZ(-speed);
    } else if (e.keyCode == '65') {
        // A
        camera.translateX(-speed);
    } else if (e.keyCode == '83') {
        // S
        camera.translateZ(speed);
    } else if (e.keyCode == '68') {
        // D
        camera.translateX(speed);
    }

    camera.position.clampLength(-radius * 0.9, radius * 0.9);
    camera.updateProjectionMatrix();
}


init();
animate();