var directionsService = new google.maps.DirectionsService();

var request = {
    origin: "22 E Dayton St, Madison WI",
    destination: "424 W Mifflin St, Madison WI",
    // destination: "Madison Sourdough, Madison WI",
    travelMode: 'DRIVING' // May or may not have luck with street view this way
};

var minDist = 20;

directionsService.route(request, function (result, status) {
    if (assert(status == 'OK', { "message": "no routes found" })) {
        if (!assert(result.routes.length > 0, { "message": "no routes found!" })) return;

        var path = [];

        // push all points to an array
        var route = result.routes[0];
        for (var l = 0; l < route.legs.length; l++) {
            var leg = route.legs[l];
            for (var s = 0; s < leg.steps.length; s++) {
                var step = leg.steps[s];
                var line = step.polyline.points;

                var geo = google.maps.geometry.encoding.decodePath(line);
                for (var g = 0; g < geo.length; g++) {
                    path.push(geo[g]);
                }
            }
        }

        // subdivide the path so that each piece has a point at least within minDist
        newPath = [];
        for (var i = 0; i < path.length - 1; i++) {
            var p1 = path[i];
            var p2 = path[i + 1];
            var dist = measure(p1.lat(), p1.lng(), p2.lat(), p2.lng());

            newPath.push(p1);
            if (dist > minDist) {
                var extraPoints = dist / minDist;
                for (var j = 1; j < extraPoints; j++) {
                    newPath.push(lerpGeo(p1, p2, (1 / extraPoints) * j));
                }
            }
        }
        path = newPath;

        // clean up the path (with nearby points)
        var newPath = [];
        newPath.push(path[0]);
        var last = path[0];
        for (var i = 1; i < path.length - 1; i++) {
            var p1 = path[i];
            if (measure(last.lat(), last.lng(), p1.lat(), p1.lng()) >= minDist) {
                newPath.push(p1);
                last = p1;
            }
        }
        newPath.push(path[path.length - 1]);
        path = newPath;

        road = path;

        // start things up (for the rendering/strret view side) after we have loaded the path
        init();

        // console.log("path length: " + path.length);

        // output for map coords
        // var s = "";
        // for (var i = 0; i < path.length; i++) {
        //     s += path[i].lat() + ", " + path[i].lng() + "\n"
        // }
        // console.log(s);

        // // output for plotting on graph
        // s = "";
        // for (var i = 0; i < path.length; i++) {
        //     s += "(" + path[i].lng() + ", " + path[i].lat() + "),"
        // }
        // s = s.substring(0, s.length - 1);
        // console.log(s);
    }
});
