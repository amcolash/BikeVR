var directionsService = new google.maps.DirectionsService();
var minDist = 20;

var markers = new Array();
var currPano;
var currPos;

var dist;

var start = document.getElementById('startLocation');
var end = document.getElementById('endLocation');
if (start) startAutocomplete = new google.maps.places.Autocomplete(start);
if (end) endAutocomplete = new google.maps.places.Autocomplete(end);

var mapElem = document.getElementById('map');
if (mapElem) {
    var map = new google.maps.Map(mapElem, {
        zoom: 17,
        center: { lat: 39.50, lng: -98.35 } // center of us
    });

    var progress = 0; // in meters traveled
    var velocity = 17; // km/hr (about 10mph)
    var mps = velocity * 1000 / 3600; // m/s

    var delta = 100; // milliseconds

    if (start && end) {
        setInterval(function () {
            if (currPano && currPos && road && road.length > 0) {
                progress = (progress + (delta / 1000) * mps) % dist;

                currPos.setCenter(getPosition());
            }
        }, delta);
    }
}

function getPosition() {
    var pos;
    if (road) {
        var tmpDst = 0;
        var prevDst = 0;
        for (var i = 0; i < road.length - 1; i++) {
            prevDst = tmpDst;
            tmpDst += measure(road[i], road[i + 1]);

            if (progress > tmpDst) continue;

            // otherwise we are done
            break;
        }
        
        var delta = progress - prevDst;
        var currDist = measure(road[i], road[i + 1]);
        
        if (delta < currDist / 2) {
            currPano.setCenter(road[i]);
            currPano.setRadius(currDist / 2);

            checkSphere(i);
        } else {
            currPano.setCenter(road[i + 1]);

            if (i < road.length - 2) {
                currPano.setRadius(measure(road[i+1], road[i+2]) / 2);
            }

            checkSphere(i+1);
        }

        pos = lerpGeo(road[i], road[i + 1], delta / currDist);
    }

    return pos;
}

function checkSphere(index) {
    // Only update when on vr
    if (!start && !end) {
        if (currentSphere != index) {
            currentSphere = index;
            updateSphere(getId(currentSphere));
        }
    }
}

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
        markers[i] = null;
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
                var dst = measure(p1, p2);

                newPath.push(p1);
                if (dst > minDist) {
                    var extraPoints = dst / minDist;
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
                if (measure(last, p1) >= minDist) {
                    newPath.push(p1);
                    last = p1;
                }
            }
            newPath.push(path[path.length - 1]);
            path = newPath;

            road = path;

            // measure after everything, just to keep it simple
            dist = 0;
            for (var i = 0; i < road.length - 1; i++) {
                dist += measure(road[i], road[i + 1]);
            }

            // start things up (for the rendering/strret view side) after we have loaded the path
            if (typeof init === "function") {
                // default behavior in vr mode
                init();
            }
            
            // Show map
            if (currPano) currPano.setMap(null);
            if (currPos) currPos.setMap(null);

            currPano = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
                map: map,
                center: road[0],
                radius: minDist / 2
            });

            currPos = new google.maps.Circle({
                strokeColor: '#0000FF',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#0000FF',
                fillOpacity: 0.35,
                map: map,
                center: road[0],
                radius: minDist / 4
            });

            var bounds = new google.maps.LatLngBounds();
            for (var i = 0; i < road.length; i++) {
                var marker = new google.maps.Marker({
                    position: road[i],
                    map: map
                });
                markers.push(marker);

                bounds.extend(marker.position);
            }

            // Fir bounds to all of the markers (only when in the route view, not in vr view)
            if (start && end) {
                map.fitBounds(bounds);
            } else {
                map.setCenter(road[0]);
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