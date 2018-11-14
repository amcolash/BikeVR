var directionsService = new google.maps.DirectionsService();
var minDist = 25;

var autoMove = false;

var markers = [];
var currPano;
var currPos;

var progress = 0; // in meters traveled
var velocity = 17; // km/hr (about 10mph)

var currentSign = 1;
var dist;
var sphereProgress;

var start = document.getElementById('startLocation');
var end = document.getElementById('endLocation');
var playToggle = document.getElementById('playToggle');
var mapToggle = document.getElementById('mapToggle');
var routeLength = document.getElementById('routeLength');
var directionsButton = document.getElementById('directions');
var startButton = document.getElementById('forward');
var backButton = document.getElementById('back');

if (directionsButton) directionsButton.addEventListener('click', () => customRoute());
if (startButton) startButton.addEventListener('click', () => startRoute());
if (backButton) backButton.addEventListener('click', () => window.location.href = '/route.html');

if (start) startAutocomplete = new google.maps.places.Autocomplete(start);
if (end) endAutocomplete = new google.maps.places.Autocomplete(end);
if (start && end && playToggle) {
    playToggle.textContent = autoMove ? "Autoplay: True" : "Autoplay: False";
    playToggle.addEventListener('click', function (event) {
        autoMove = !autoMove;
        velocity = autoMove ? 17 : 0;
        playToggle.textContent = autoMove ? "Autoplay: True" : "Autoplay: False";
    });
}

var mapElem = document.getElementById('map');
if (mapElem) {
    var map = new google.maps.Map(mapElem, {
        zoom: 4,
        center: { lat: 39.50, lng: -98.35 } // center of us
    });

    var delta = 100; // milliseconds

    if (start && end) {
        setInterval(function () {
            if (autoMove && currPano && currPos && road && road.length > 0) {
                var mps = velocity * 1000 / 3600;
                progress = (progress + (delta / 1000) * mps) % dist;

                currPos.setCenter(getPosition());
            }
        }, delta);
    }
}


function customRoute(customStart, customEnd) {
    if ((customStart && customEnd) || (start.value && start.value.length > 0 && end.value && end.value.length > 0)) {
        var request = {
            origin: customStart || start.value,
            destination: customEnd || end.value,
            travelMode: 'DRIVING' // May or may not have luck with street view this way
        };

        getRoute(request);
    }
}

function defaultRoute() {
    var request = {
        origin: "40 E Dayton St, Madison, WI",
        destination: "1 W Dayton St, Madison WI",
        travelMode: 'DRIVING' // May or may not have luck with street view this way
    };

    getRoute(request);
}

function startRoute() {
    var startLocation = road[0];
    var endLocation = road[road.length - 1];
    var startString = 'startLat=' + startLocation.lat() + '&startLng=' + startLocation.lng();
    var endString = 'endLat=' + endLocation.lat() + '&endLng=' + endLocation.lng();
    window.location.href = '/?' + startString + '&' + endString;
}

function getPosition() {
    var pos;
    if (road) {
        var tmpDst = 0;
        var prevDst = 0;

        // TODO: Optimization? - Pre-compute these measurements
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
            currentSign = 1;
        } else {
            currPano.setCenter(road[i + 1]);
            
            if (i < road.length - 2) {
                currPano.setRadius(measure(road[i+1], road[i+2]) / 2);
            }
            
            checkSphere(i+1);
            currentSign = -1;
        }
        
        pos = lerpGeo(road[i], road[i + 1], delta / currDist);
        sphereProgress = (delta / currDist) + (0.5 * currentSign);
    }

    return pos;
}

function checkSphere(index) {
    // Only update when on vr
    if (!start && !end) {
        if (currentSphere != index) {
            currentSphere = index;
            updateSphere(getId(currentSphere), getId(currentSphere - 1), getId(currentSphere + 1));

            currPos.setCenter(getPosition());
            if (map) map.setCenter(currPos.getCenter());
        }
    }
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

            var polyline = new google.maps.Polyline( {path: path} );
            road = polyline.GetPointsAtDistance(minDist);

            // measure after everything, just to keep it simple
            dist = 0;
            for (var i = 0; i < road.length - 1; i++) {
                dist += measure(road[i], road[i + 1]);
            }

            var km = (dist / 1000).toFixed(2);
            var miles = ((dist / 1000) * 0.621371).toFixed(2);
            var time = (miles / 10 * 60).toFixed(0);

            if (routeLength) {
                routeLength.innerHTML = "Route Length: " + road.length + " stops, " + time + " minutes, " + miles + " miles, " + km + " km";
            }

            if (startButton) startButton.disabled = false;

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

            currPos.setCenter(getPosition());

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
            if (map) {
                if (start && end) {
                    map.fitBounds(bounds);
                } else {
                    map.setZoom(17);
                    map.setCenter(road[0]);
                }
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