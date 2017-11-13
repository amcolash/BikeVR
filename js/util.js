function hasVR() {
    return ('getVRDisplays' in navigator);
};

function assert(cond, text) {
    console.assert(cond, text);
    return cond;
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

function lerp(v0, v1, t) {
    return v0 * (1 - t) + v1 * t
}

function lerpGeo(p1, p2, value) {
    return new google.maps.LatLng(lerp(p1.lat(), p2.lat(), value), lerp(p1.lng(), p2.lng(), value));
}

function measure(lat1, lon1, lat2, lon2) {  // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000; // meters
};