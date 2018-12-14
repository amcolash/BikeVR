importScripts("/js/lib/GSVPano.js");

const hq = true;
const panoLoader = new GSVPANO.PanoLoader();
panoLoader.setZoom(hq ? 3 : 1 );
panoLoader.onPanoramaLoad = onPanoramaLoad;

onmessage = function(e) {
    panoLoader.load(e.data.result, e.data.index);
}

function onPanoramaLoad() {
    var info = {
        lat: this.lat,
        lng: this.lng,
        rot: this.rotation,
        index: this.index
    };

    postMessage({info: info, panoId: this.panoId, dimensions: this.dimensions, imageBitmap: this.canvas.transferToImageBitmap()});
}