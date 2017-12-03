// Helper for console.assert which returns if the condition passed
function assert(cond, text) {
    if (!cond) {
        console.assert(cond, text);
        return false;
    }

    return true;
}

function hasVR() {
    return ('getVRDisplays' in navigator);
}

// ---------------------------------- Math functions ----------------------------------
Number.prototype.toRad = function () {
    return this * Math.PI / 180;
}

Number.prototype.toDeg = function () {
    return this * 180 / Math.PI;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function lerp(v0, v1, t) {
    return v0 * (1 - t) + v1 * t
}

// ---------------------------------- Geo Functions -----------------------------------

function lerpGeo(p1, p2, value) {
    return new google.maps.LatLng(lerp(p1.lat(), p2.lat(), value), lerp(p1.lng(), p2.lng(), value));
}

function measure(p1, p2) {
    return measureGeo(p1.lat(), p1.lng(), p2.lat(), p2.lng());
}

// generally used geo measurement function
function measureGeo(lat1, lon1, lat2, lon2) {
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2.toRad() - lat1.toRad();
    var dLon = lon2.toRad() - lon1.toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000; // meters
}