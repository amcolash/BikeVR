importScripts("/js/lib/GSVPanoDepth.js", "/js/lib/pako_inflate.min.js");

const depthLoader = new GSVPANO.PanoDepthLoader();

onmessage = function(e) {
    depthLoader.load(e.data.panoId);

    depthLoader.onDepthLoad = function() {
        onDepthLoad(this.depthMap, e.data.canvas);
    };
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