const tailPoints = 7;

// Testing page state
var pathSphere = 0;
var pathCanvas;
var pathContext;

// Only run when on testing page
if (!document.getElementById("vr")) {
    // Init service worker immediately
    if (navigator.serviceWorker) {
        navigator.serviceWorker.register('service_worker.js')
        .then(function(registration) {
            console.log('Service worker registration successful, scope is:', registration.scope);

            // Init route after we are all set
            customRoute("22 E Dayton St, Madison, WI", "424 W Mifflin St, Madison, WI", initPath);
        })
        .catch(function(error) {
            console.log('Service worker registration failed, error:', error);
        });
    }
}

function initPath(size) {
    // Init canvas
    pathCanvas = document.createElement("canvas");
    pathContext = pathCanvas.getContext("2d");
    pathCanvas.style.border = "1px solid black";
    document.body.appendChild(pathCanvas);

    pathCanvas.width = size || 256;
    pathCanvas.height = size || 256;

    // Set up key handler
    window.onkeyup = function (e) { checkKey(e); }

    // Draw current state
    update();
}

function checkKey(e) {
    e = e || window.event;

    if (e.keyCode == '90') { // Z
        pathSphere = clamp(pathSphere - 1, 0, road.length - 1);
        update();
    } else if (e.keyCode == '88') { // X
        pathSphere = clamp(pathSphere + 1, 0, road.length - 1);
        update();
    }
}

function update() {
    drawPath(pathContext, pathSphere);
}

function drawPath(ctx, sphere) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Get the current portion of the route to look at
    const section = road.slice(Math.max(0, sphere - tailPoints), sphere + tailPoints + 1);
    const current = road[sphere];

    // Magic number based on real life testing, this is the zoom factor
    const maxBounds = tailPoints / 4000;

    // Clear previous transform
    ctx.resetTransform();

    // Clean up and transform canvas
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);

    // Rotate to always point north
    for (var i = 0; i < section.length; i++) {
        let isCurrent = section[i].lat() === current.lat() && section[i].lng() === current.lng();
        if (isCurrent) {
            var p1, p2;
            if (i < section.length - 1) {
                p1 = section[i];
                p2 = section[i + 1];
            } else {
                p1 = section[i - 1];
                p2 = section[i];
            }

            var dX = p2.lng() - p1.lng();
            var dY = p2.lat() - p1.lat();

            // Done this way since my map is not actually an acurate projection ;)
            // If that gets fixed, change to maps.google.geometry.spherical.computeHeading(p1, p2);
            var rotation = Math.atan2(dY, dX) - Math.PI / 2;

            ctx.rotate(rotation);
            break;
        }
    }

    ctx.fillStyle = '#111515';
    ctx.fillRect(-width, -height, width * 2, height * 2);

    // Start with the path
    ctx.beginPath();
    ctx.lineWidth = width / 35;
    ctx.strokeStyle = 'darkSlateGray';

    // A bit of duplicated code between this and below, consider refactor someday
    for (i = 0; i < section.length; i++) {
        let subtracted = subtractGeo(current, section[i]);
        let x = (subtracted.lng() / maxBounds) * width;
        let y = (1 - (subtracted.lat() / maxBounds)) * height - height;

        if (i === 0) ctx.moveTo(x, y);
        ctx.lineTo(x, y);
    }

    // Actually render
    ctx.stroke();

    // Draw waypoint circles
    for (i = 0; i < section.length; i++) {
        let isCurrent = section[i].lat() === current.lat() && section[i].lng() === current.lng();
        let subtracted = subtractGeo(current, section[i]);
        let x = (subtracted.lng() / maxBounds) * width;
        let y = (1 - (subtracted.lat() / maxBounds)) * height - height;

        ctx.beginPath();
        ctx.arc(x, y, width / 35, 0, 2 * Math.PI, false);
        ctx.fillStyle = isCurrent ? 'white' : 'darkSlateGray';
        ctx.fill();
    }

    // Clear previous transform
    ctx.resetTransform();
    ctx.translate(width / 2, height / 2);
    
    // Draw facing triangle
    var triangleScale = width / 32;
    var triangle = [
        [-triangleScale, 0],
        [0, triangleScale * 1.5],
        [triangleScale, 0]
    ];

    ctx.fillStyle = 'white';
    ctx.beginPath();

    for (i = 0; i < triangle.length; i++) {
        var x = triangle[i][0];
        var y = triangle[i][1];

        var angle = Math.PI;
        var newX = x * Math.cos(angle) - y * Math.sin(angle);
        var newY = y * Math.cos(angle) + x * Math.sin(angle);
        
        if (i === 0) ctx.moveTo(newX, newY);
        ctx.lineTo(newX, newY);
    }

    ctx.fill();
}
