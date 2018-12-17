// Helper for console.assert which returns if the condition passed
function assert(cond, text) {
    if (!cond) {
        console.assert(cond, text);
        return false;
    }

    return true;
}

function decodeParameters(querystring) {
    // remove any preceding url and split
    querystring = querystring.substring(querystring.indexOf('?') + 1).split('&');
    var params = {}, pair, d = decodeURIComponent;
    // march and parse
    for (var i = querystring.length - 1; i >= 0; i--) {
        pair = querystring[i].split('=');
        params[d(pair[0])] = d(pair[1] || '');
    }

    return params;
}

// ---------------------------------- Math functions ----------------------------------
Number.prototype.toRad = function () {
    return this * Math.PI / 180;
}

Number.prototype.toDeg = function () {
    return this * 180 / Math.PI;
}

Number.prototype.powerOfTwo = function() {
    return (this != 0) && ((this & (this - 1)) == 0);
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

// ---------------------------------- Canvas Functions --------------------------------

// Shamelessly stolen from: https://codepen.io/ashblue/pen/fGkma
function wrapCanvasText(text, fontSize, width) {
    var lines = [];
    var line = '';
    var lineTest = '';
    var words = text.split(' ');

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = fontSize + 'px Arial';

    for (var i = 0, len = words.length; i < len; i++) {
        lineTest = line + words[i] + ' ';

        // Check total width of line or last word
        if (ctx.measureText(lineTest).width > width) {
            // Record and reset the current line
            lines.push(line);
            line = words[i] + ' ';
        } else {
            line = lineTest;
        }
    }

    // Catch last line in-case something is left over
    if (line.length > 0) {
        lines.push(line.trim());
    }

    return lines;
}