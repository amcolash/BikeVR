importScripts("/js/lib/GSVPano.js");

const hq = true;
const panoLoader = new GSVPANO.PanoLoader();

onmessage = function(e) {
    if (e.data.canvas) {
        panoLoader.initCanvas(e.data.canvas);
        panoLoader.setZoom(hq ? 3 : 1 );
        panoLoader.onPanoramaLoad = onPanoramaLoad;
        return;
    }

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

function onDepthLoad(depthMap, canvas) {
    var x, y, context, image, c;

    var w = depthMap.width;
    var h = depthMap.height;

    canvas.width = w;
    canvas.height = h;
    context = canvas.getContext('2d');

    image = context.getImageData(0, 0, w, h);

    for (y = 0; y < h; ++y) {
        for (x = 0; x < w; ++x) {
            c = depthMap.depthMap[y * w + x] / 50 * 255;
            image.data[4 * (y * w + x)] = c;
            image.data[4 * (y * w + x) + 1] = c;
            image.data[4 * (y * w + x) + 2] = c;
            image.data[4 * (y * w + x) + 3] = 255;
        }
    }

    context.putImageData(image, 0, 0);
    postMessage({panoId: depthMap.panoId});
}