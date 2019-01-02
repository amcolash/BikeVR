(function (global, factory) {

    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global.StatsVR = factory());

}(this, (function () {
    'use strict';

    /**
     * @author Sean Bradley /
     * https://www.youtube.com/user/seanwasere
     * https://github.com/Sean-Bradley
     * https://seanwasere.com/
     */

    var StatsVR = (function (anchor, planeWidth, planeHeight, x, y, z, canvasWidth, canvasHeight) {
        var canvas = document.createElement('canvas');
        // document.body.appendChild(canvas);
        canvas.width = canvasWidth || 128;
        canvas.height = canvasHeight || 128;
        canvas.style.paddingLeft = "100px";
        var ctx = canvas.getContext('2d');

        const fontLarge = "18px Calibri";
        const fontSmall = "14px Calibri";

        var texture = new THREE.Texture(canvas);
        var material = new THREE.MeshBasicMaterial({ map: texture, depthTest: false, transparent: true });
        var geometry = new THREE.PlaneGeometry(planeWidth || 1, planeHeight || 1, 1, 1);
        var statsPlane = new THREE.Mesh(geometry, material);

        statsPlane.position.x = x || 0;
        statsPlane.position.y = y || 1.5;
        statsPlane.position.z = z || -5;
        statsPlane.renderOrder = 9999;

        anchor.add(statsPlane);
        
        var timer = (performance || Date);
        var statsDisplayRefreshDelay  = 100;

        var fpsLastTime = 0;
        var fpsFrames = 0;
        var fpsGraphData = new Array(32).fill(0);

        var msActive = false;
        var msStart = timer.now();
        var msEnd = timer.now();
        var msGraphData = new Array(32).fill(0);
        var ms = 0;

        var custom1 = null;
        var custom2 = null;
        var custom3 = null;
        var custom4 = null;

        return {
            setX: function (val) {
                statsPlane.position.x = val;
            },
            setY: function (val) {
                statsPlane.position.y = val;
            },
            setZ: function (val) {
                statsPlane.position.z = val;
            },
            setXRotation: function(val) {
                statsPlane.rotation.x = val;
            },
            setYRotation: function(val) {
                statsPlane.rotation.y = val;
            },
            setZRotation: function(val) {
                statsPlane.rotation.z = val;
            },
            setWidth: function (width) {
                canvas.width = width;
            },
            setHeight: function (height) {
                canvas.height = height;
            },
            setRenderOrder: function (renderOrder) {
                statsPlane.renderOrder = renderOrder;
            },
            setCustom1: function (val) {
                custom1 = val;
            },
            setCustom2: function (val) {
                custom2 = val;
            },
            setCustom3: function (val) {
                custom3 = val;
            },
            setCustom4: function (val) {
                custom4 = val;
            },

            msStart: function (val) {
                msActive = true;
                msStart = timer.now();
            },
            msEnd: function (val) {
                msEnd = timer.now();
                ms = (((msEnd - msStart) * 100) / 100);
            },

            add: function (object3d) {
                camera.add(object3d);
            },
            setEnabled: function(enabled) {
                statsPlane.visible = enabled;
            },
            
            update: function () {
                var now = timer.now();
                var dt = now - fpsLastTime;
                fpsFrames++;
                
                if (now > fpsLastTime + statsDisplayRefreshDelay) {
                    texture.needsUpdate = true;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.font = fontLarge;
                    ctx.lineWidth = 2;

                    ctx.fillStyle = "#333";
                    ctx.fillRect(0, 0, 128, 32);

                    //FPS
                    fpsLastTime = now;
                    var FPS = ((((fpsFrames * 1000) / dt) * 100) / 100);
                    fpsFrames = 0;

                    fpsGraphData.push(FPS);
                    if (fpsGraphData.length >= 32) {
                        fpsGraphData.shift();
                    }
                    var ratio = Math.max.apply(null, fpsGraphData);

                    ctx.strokeStyle = '#035363';
                    for (var i = 0; i < 32; i++) {
                        ctx.beginPath();
                        ctx.moveTo(i * 2, 32);
                        ctx.lineTo(i * 2, (32 - (fpsGraphData[i] / ratio) * 32));
                        ctx.stroke();
                    }

                    ctx.fillStyle = "#00cc00";
                    ctx.fillText(FPS.toFixed(1), 2, 26);

                    // Min/max
                    ctx.font = fontSmall;
                    ctx.fillText(Math.max(...fpsGraphData).toFixed(0), 45, 12);
                    ctx.fillText(Math.min(...fpsGraphData).toFixed(0), 45, 26);
                    ctx.font = fontLarge;

                    //MS
                    if (msActive) {
                        msGraphData.push(ms);
                        if (msGraphData.length >= 32) {
                            msGraphData.shift();
                        }
                        ratio = Math.max.apply(null, msGraphData);
                        ctx.strokeStyle = '#f35363';
                        for (var i = 0; i < 32; i++) {
                            ctx.beginPath();
                            ctx.moveTo(i * 2 + 64, 32);
                            ctx.lineTo(i * 2 + 64, (32 - (msGraphData[i] / ratio) * 32));
                            ctx.stroke();
                        }
                        ctx.fillStyle = "#ffffff";
                        ctx.fillText(ms.toFixed(1), 66, 26);

                        // Min/max
                        ctx.font = fontSmall;
                        ctx.fillText(Math.max(...msGraphData).toFixed(1), 105, 12);
                        ctx.fillText(Math.min(...msGraphData).toFixed(1), 105, 26);
                        ctx.font = fontLarge;
                    }

                    //Custom
                    ctx.fillStyle = "#ffffff";
                    if (custom1) {
                        ctx.fillText(custom1, 0, 60);
                    }
                    if (custom2) {
                        ctx.fillText(custom2, 0, 78);
                    }
                    if (custom3) {
                        ctx.fillText(custom3, 0, 97);
                    }
                    if (custom4) {
                        ctx.fillText(custom4, 0, 115);
                    }
                }
            },

            multilineText: function(text, offset) {
                var now = timer.now();
                if (now > fpsLastTime + statsDisplayRefreshDelay) {
                    texture.needsUpdate = true;
                    fpsLastTime = now;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.font = fontLarge;
                    ctx.fillStyle = "#ffffff";

                    var lines = text.length ? text : text.split("\n");
                    if (offset) lines = lines.slice(offset);

                    for (var i = 0; i < lines.length; i++) {
                        ctx.fillText(lines[i], 2, (i + 1) * 16);
                    }
                }
            },

            updateImage: function(newCanvas) {
                var now = timer.now();
                if (now > fpsLastTime + statsDisplayRefreshDelay) {
                    texture.needsUpdate = true;
                    fpsLastTime = now;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(newCanvas, 0, 0);
                }
            }
        };
    });

    return StatsVR;
})));