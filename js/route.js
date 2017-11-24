var directionsService = new google.maps.DirectionsService();
var minDist = 20;

var start = document.getElementById('startLocation');
var end = document.getElementById('endLocation');
if (start) startAutocomplete = new google.maps.places.Autocomplete(start);
if (end) endAutocomplete = new google.maps.places.Autocomplete(end);

var us = { lat: 39.50, lng: -98.35 };
var mapElem = document.getElementById('map');
if (mapElem) {
    var map = new google.maps.Map(mapElem, {
        zoom: 4,
        center: us
    });
}

var markers = new Array();

function customRoute() {
    if (start.value && start.value.length > 0 && end.value && end.value.length > 0) {
        var request = {
            origin: start.value,
            destination: end.value,
            travelMode: 'DRIVING' // May or may not have luck with street view this way
        };

        getRoute(request);
    }
}

function defaultRoute() {
    var request = {
        origin: "22 E Dayton St, Madison WI",
        destination: "424 W Mifflin St, Madison WI",
        travelMode: 'DRIVING' // May or may not have luck with street view this way
    };

    getRoute(request);
}

function getRoute(request) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers.length = 0;

    directionsService.route(request, function (result, status) {
        if (assert(status == 'OK', { "message": "no routes found", "start": request.origin, "end": request.destination })) {
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
            if (typeof init === "function") {
                // default behavior in vr mode
                init();
            } else {
                // Show map
                var bounds = new google.maps.LatLngBounds();
                for (var i = 0; i < road.length; i++) {
                    var marker = new google.maps.Marker({
                        position: road[i],
                        map: map
                    });
                    markers.push(marker);

                    bounds.extend(marker.position);
                }

                // Fir bounds to all of the markers
                map.fitBounds(bounds);
            }

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
}