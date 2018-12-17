var currentSphere = 12;
var canvas;
var context;
var width;
var height;

customRoute("22 E Dayton St, Madison, WI", "424 W Mifflin St, Madison, WI", initPath);

function initPath(size) {
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d");
    canvas.style.border = "1px solid black";
    document.body.appendChild(canvas);

    width = size || 256;
    height = size || 256;
    canvas.width = width;
    canvas.height = height;

    drawPath(context);
}

window.onkeyup = function (e) { checkKey(e); }

function checkKey(e) {
    e = e || window.event;

    if (e.keyCode == '90') { // Z
        currentSphere = clamp(currentSphere - 1, 0, road.length - 1);
        drawPath(context);
    } else if (e.keyCode == '88') { // X
        currentSphere = clamp(currentSphere + 1, 0, road.length - 1);
        drawPath(context);
    }
}

function drawPath(ctx) {
    let bounds = new google.maps.LatLngBounds();
    let section = road.slice(Math.max(0, currentSphere - 11), currentSphere + 12);
    for (let i = 0; i < section.length; i++) {
        bounds.extend(section[i]);
    }

    const current = road[currentSphere];
    
    // const northEast = bounds.getNorthEast();
    // const southWest = bounds.getSouthWest();

    // const center = bounds.getCenter();

    // const pathWidth = Math.abs(northEast.lng() - southWest.lng()) + 0.0002;
    // const pathHeight = Math.abs(southWest.lat() - northEast.lat()) + 0.0002;
    // const maxBounds = Math.max(pathWidth, pathHeight);

    // Magic number based on real life testing, basically a zoom 
    const maxBounds = 0.003;

    // Clear previous transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, -height / 2);

    ctx.beginPath();
    ctx.lineWidth = width / 100;
    ctx.strokeStyle = "green";

    for (i = 0; i < section.length; i++) {
        let subtracted = subtractGeo(current, section[i]);
        let x = (subtracted.lng() / maxBounds) * width;
        let y = (1 - (subtracted.lat() / maxBounds)) * height;

        if (i === 0) ctx.moveTo(x, y);
        ctx.lineTo(x, y);
    }

    ctx.stroke();

    for (i = 0; i < section.length; i++) {
        let isCurrent = section[i].lat() === current.lat() && section[i].lng() === current.lng();
        let subtracted = subtractGeo(current, section[i]);
        let x = (subtracted.lng() / maxBounds) * width;
        let y = (1 - (subtracted.lat() / maxBounds)) * height;

        ctx.beginPath();
        ctx.arc(x, y, width / 73, 0, 2 * Math.PI, false);
        ctx.fillStyle = isCurrent ? 'blue' : 'green';
        ctx.fill();
    }
}
