const tailPoints = 7;

// Testing page state
var pathSphere = 0;
var pathCanvas;
var pathContext;

// Only run when on testing page
if (!document.getElementById("vr")) {
    customRoute("22 E Dayton St, Madison, WI", "424 W Mifflin St, Madison, WI", initPath);
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clean up and transform canvas
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, -height / 2);

    ctx.fillStyle = "darkSlateGray";
    ctx.fillRect(-width/2, height/2, width, height);

    // Start with the path
    ctx.beginPath();
    ctx.lineWidth = width / 35;
    ctx.strokeStyle = "gray";

    // A bit of duplicated code between this and below, consider refactor someday
    for (i = 0; i < section.length; i++) {
        let subtracted = subtractGeo(current, section[i]);
        let x = (subtracted.lng() / maxBounds) * width;
        let y = (1 - (subtracted.lat() / maxBounds)) * height;

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
        let y = (1 - (subtracted.lat() / maxBounds)) * height;

        ctx.beginPath();
        ctx.arc(x, y, width / 35, 0, 2 * Math.PI, false);
        ctx.fillStyle = isCurrent ? 'white' : 'gray';
        ctx.fill();
    }
}
