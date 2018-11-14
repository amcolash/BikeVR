var GSVPANO = GSVPANO || {};
GSVPANO.PanoLoader = function (parameters) {

	'use strict';

	var _parameters = parameters || {},
		_location,
		_zoom,
		_panoId,
		_panoClient = new google.maps.StreetViewService(),
		_count = 0,
		_total = 0,
		_canvas1 = document.createElement('canvas'),
		_ctx1 = _canvas1.getContext('2d'),
		_canvas2 = document.createElement('canvas'),
		_ctx2 = _canvas2.getContext('2d'),
		_canvas3 = document.createElement('canvas'),
		_ctx3 = _canvas3.getContext('2d'),
		_canvas4 = document.createElement('canvas'),
		_ctx4 = _canvas4.getContext('2d'),
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
		_ctx1.translate( _canvas1.width, 0);
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
			
			if (data.toString() === "0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255") {
				this.canvas = _canvas1;
				this.dimensions = 416;
			} else {
				this.canvas = _canvas2;
				this.dimensions = 512;
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
		
		var failed = window.localStorage.getItem('failedImages');
		failed = failed ? JSON.parse(failed) : [];

		for( y = 0; y < h; y++) {
			for( x = 0; x < w; x++) {
				url = 'https://maps.google.com/cbk?output=tile&panoid=' + _panoId + '&zoom=' + _zoom + '&x=' + x + '&y=' + y;
				if (this.cacheBust) url += '&' + Date.now();

				if (!failed.includes(url)) {
					(function (x, y, url) { 
						var img = new Image();
						img.addEventListener('load', function () {
							// Check if image "failed" but got into here
							_canvas3.width = 512;
							_canvas3.height = 512;
							_ctx3.drawImage(this, 0, 0);
							var data = _ctx3.getImageData(20, 20, 5, 1).data;

							if (data.toString() === "0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255") {
								var failedImages = window.localStorage.getItem('failedImages');
								failedImages = failedImages ? JSON.parse(failedImages) : [];
								failedImages.push(url);
								window.localStorage.setItem('failedImages', JSON.stringify(failedImages));
							}

							self.composeFromTile(x, y, this);
						});
						img.crossOrigin = '';
						img.src = url;
					})(x, y, url);
				} else {
					_canvas4.width = 512;
					_canvas4.height = 512;
					_ctx4.fillStyle = "black";
					_ctx4.fillRect(0, 0, 512, 512);
					self.composeFromTile(x, y, _canvas4);
				}
			}
		}
	};
	
	this.load = function (location, index) {
		// console.log('Load for', JSON.stringify(location));
		var self = this;
		_panoClient.getPanorama({location: location, radius: 50, source: 'outdoor'}, function (result, status) {
			if (status === google.maps.StreetViewStatus.OK) {
				if( self.onPanoramaData ) self.onPanoramaData( result );
				var h = google.maps.geometry.spherical.computeHeading(location, result.location.latLng);
				rotation = (result.tiles.centerHeading - h) * Math.PI / 180.0;
				self.rotation = result.tiles.centerHeading * Math.PI / 180.0;
				copyright = result.copyright;
				self.copyright = copyright;
				_panoId = result.location.pano;
				self.panoId = _panoId;
				self.location = location;
				self.lat = location.lat();
				self.lng = location.lng();
				self.index = index;
				self.composePanorama();
			} else {
				if( self.onNoPanoramaData ) self.onNoPanoramaData( status );
				self.throwError('Could not retrieve panorama for the following reason: ' + status);
			}
		});
	};
	
	this.setZoom = function( z ) {
		_zoom = z;
		this.adaptTextureToZoom();
	};

	this.setZoom( _parameters.zoom || 1 );
};