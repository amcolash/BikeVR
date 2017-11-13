var directionsService = new google.maps.DirectionsService();

var start = "22 E Dayton, Madison WI";
var end = "424 W Mifflin, Madison WI";
// var url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + start + "&destination=" + end + "&avoid=tolls|highways|ferries&key=" + apikey;

var request = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
};

var minDist = 20;

directionsService.route(request, function (result, status) {
    if (status == 'OK') {
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

        // subdivide if needed
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

        // start things up after we have loaded the path
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
