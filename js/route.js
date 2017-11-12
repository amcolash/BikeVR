var start = "22 E Dayton, Madison WI";
var end = "424 W Mifflin, Madison WI";

var url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + start + "&destination=" + end + "&avoid=tolls|highways|ferries&key=" + apikey;

var settings = {
    "async": true,
    "crossDomain": true,
    "url": url,
    "method": "GET",
    "headers": {
        "cache-control": "no-cache"
    }
}

$.ajax(settings).done(function(response) {
    console.log(response);
});

// google.maps.geometry.encoding.decodePath(