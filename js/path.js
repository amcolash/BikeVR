const tailPoints = 7;

// Testing page state
var pathSphere = 0;
var pathCanvas;
var pathContext;

// Only run when on testing page
if (!document.getElementById("vr")) {
    if (navigator.onLine) {
        customRoute("22 E Dayton St, Madison, WI", "424 W Mifflin St, Madison, WI", initPath);
    } else {
        var tmpRoad = [{"lat":43.076393342559456,"lng":-89.3858602995258},{"lat":43.076236685118914,"lng":-89.38608059905152},{"lat":43.076082481337835,"lng":-89.3863040770907},{"lat":43.07592647936076,"lng":-89.38652524445058},{"lat":43.075770477383685,"lng":-89.38674641181046},{"lat":43.0756144754066,"lng":-89.3869675791704},{"lat":43.07545847342953,"lng":-89.38718874653034},{"lat":43.07530364323432,"lng":-89.38741143960397},{"lat":43.075149999102116,"lng":-89.38763567698612},{"lat":43.07499546167986,"lng":-89.38785869212592},{"lat":43.0748126965797,"lng":-89.38802865171016},{"lat":43.07459935377945,"lng":-89.38796935377945},{"lat":43.07443408556438,"lng":-89.38776152718731},{"lat":43.074270738564806,"lng":-89.3875505373129},{"lat":43.07410739156523,"lng":-89.38733954743844},{"lat":43.0739463981688,"lng":-89.38753480244162},{"lat":43.07378937490682,"lng":-89.38775457893604},{"lat":43.07363310905696,"lng":-89.38797538937604},{"lat":43.073476843207104,"lng":-89.3881961998161},{"lat":43.07332171551206,"lng":-89.38841850515206},{"lat":43.07316672531388,"lng":-89.38864099108167},{"lat":43.07301173511571,"lng":-89.38886347701134},{"lat":43.072856744917544,"lng":-89.38908596294095},{"lat":43.07270175471937,"lng":-89.38930844887057},{"lat":43.0725467645212,"lng":-89.38953093480023},{"lat":43.07239177432303,"lng":-89.38975342072985},{"lat":43.07223678412486,"lng":-89.38997590665952},{"lat":43.07207999323036,"lng":-89.3901960094775},{"lat":43.07192298365436,"lng":-89.39041582288388}];
        road = [];
        for (var i = 0; i < tmpRoad.length; i++) {
            road.push(new google.maps.LatLng(tmpRoad[i]));
        }
        initPath();
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clean up and transform canvas
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, -height / 2);

    ctx.fillStyle = '#111515';
    ctx.fillRect(-width/2, height/2, width, height);

    // Start with the path
    ctx.beginPath();
    ctx.lineWidth = width / 35;
    ctx.strokeStyle = 'darkSlateGray';

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
        ctx.fillStyle = isCurrent ? 'white' : 'darkSlateGray';
        ctx.fill();
    }
}
