var GSVPANO = GSVPANO || {};
GSVPANO.PanoLoader = function (parameters) {

	'use strict';

	var _parameters = parameters || {},
		_zoom,
		_panoId,
		_count = 0,
		_total = 0,
		_canvas1 = new OffscreenCanvas(1, 1),
		_ctx1 = _canvas1.getContext("2d"),
		_canvas2 = new OffscreenCanvas(1, 1),
		_ctx2 = _canvas2.getContext("2d"),
		panoId = '',
		cacheBust = false,
		rotation = 0,
		copyright = '',
		onSizeChange = null,
		onPanoramaLoad = null;

	this.setProgress = function (p) {
		if (this.onProgress) {
			this.onProgress(p);
		}
	};

	this.throwError = function (message) {
		if (this.onError) {
			this.onError(message);
		} else {
			console.error(message);
		}
	};

	this.adaptTextureToZoom = function () {
		var w1 = 416 * Math.pow(2, _zoom),
			h1 = (416 * Math.pow(2, _zoom - 1));
		_canvas1.width = w1;
		_canvas1.height = h1;
		_ctx1.translate(_canvas1.width, 0);
		_ctx1.scale(-1, 1);

		var w2 = 512 * Math.pow(2, _zoom),
			h2 = (512 * Math.pow(2, _zoom - 1));
		_canvas2.width = w2;
		_canvas2.height = h2;
		_ctx2.translate(_canvas2.width, 0);
		_ctx2.scale(-1, 1);
	};

	this.composeFromTile = function (x, y, texture) {
		_ctx1.drawImage(texture, x * 512, y * 512);
		_ctx2.drawImage(texture, x * 512, y * 512);
		_count++;
		
		var p = Math.round(_count * 100 / _total);
		this.setProgress(p);
		
		if (_count === _total) {
			// Decide if there is missing stuff... (416x416 or 512x512)
			// It is a bit hacky but gets the job done. Grab the bottom
			// left corner and check for black - if so it is too small
			var h = Math.pow(2, _zoom - 1);
			var data = _ctx2.getImageData(0, (h * 512) - 1, 5, 1).data;
			
			this.canvas = _canvas2;
			if (data.toString() === "0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255") {
				this.dimensions = 416;
				_ctx2.resetTransform();
				_ctx2.drawImage(_canvas1, 0, 0, _canvas2.width, _canvas2.height);
			} else {
				this.dimensions = 512;
			}

			if (_zoom > 1) {
				this.canvas = new OffscreenCanvas(_canvas2.width / 2, _canvas2.height / 2);
				var ctx = this.canvas.getContext("2d");
				ctx.drawImage(_canvas2, 0, 0, _canvas2.width, _canvas2.height, 0, 0, this.canvas.width, this.canvas.height);
			}

			if (this.onPanoramaLoad) {
				this.onPanoramaLoad();
			}
		}
	};

	this.composePanorama = function () {
		this.setProgress(0);
		// console.log('Loading panorama for zoom ' + _zoom + '...');
		
		var w = Math.pow(2, _zoom),
			h = Math.pow(2, _zoom - 1),
			self = this,
			url,
			x,
			y;
			
		_count = 0;
		_total = w * h;

		for( y = 0; y < h; y++) {
			for( x = 0; x < w; x++) {
				url = 'https://maps.google.com/cbk?output=tile&panoid=' + self.panoId + '&zoom=' + _zoom + '&x=' + x + '&y=' + y;
				if (this.cacheBust) url += '&' + Date.now();

				(function (x, y, url) {
					fetch(url, {"credentials":"omit","headers":{"sec-metadata":"destination=\"\", site=cross-site"},"referrerPolicy":"no-referrer-when-downgrade","body":null,"method":"GET","mode":"cors"})
					// fetch(url)
						.then(response => {
							// TODO
							if (response.status === "200") {
								// A-OK
							} else {
								// GOT A 400 and need to change dimensions
							}
							return response.blob();
						})
						.then(blob => createImageBitmap(blob))
						.then(image => {
							self.composeFromTile(x, y, image);
						}, err => {
							console.error(err);
						});
				})(x, y, url);
			}
		}
	};
	
	this.load = function (result, index) {
		var self = this;
		if (result) {
			if( self.onPanoramaData ) self.onPanoramaData( result );
			self.rotation = result.rotation;
			self.copyright = result.copyright;
			self._panoId = result.panoId;
			self.panoId = result.panoId;
			self.lat = result.lat;
			self.lng = result.lng;
			self.index = index;
			self.composePanorama();
		} else {
			if( self.onNoPanoramaData ) self.onNoPanoramaData( status );
			self.throwError('Could not retrieve panorama for the following reason: ' + status);
		}
	};
	
	this.setZoom = function( z ) {
		_zoom = z;
		this.adaptTextureToZoom();
	};

	this.setZoom( _parameters.zoom || 1 );
};