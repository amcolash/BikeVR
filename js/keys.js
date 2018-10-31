//var tmpVec = new THREE.Vector3();

// clever idea from: https://stackoverflow.com/questions/1828613/check-if-a-key-is-down
var keysDown = {};
window.onkeyup = function (e) { keysDown[e.keyCode] = false; checkKey(e); }
window.onkeydown = function (e) { keysDown[e.keyCode] = true; }

function checkKey(e) {
    e = e || window.event;

    var speed = 2;

    if (e.keyCode == '82') {
        // 'R'
        resetCamera();
    } else if (e.keyCode == '90') {
        // Z
        changeSphere(-1);
    } else if (e.keyCode == '88') {
        // X
        changeSphere(1);
    } else if (e.keyCode == '32') {
        var playToggle = document.getElementById("playToggle");
        autoMove = !autoMove;
        playToggle.textContent = autoMove ? "||" : ">";
    }
}

function changeSphere(increment) {
    var index = currentSphere + increment;
    if (index < 0) {
        index = Object.keys(panoramas).length - 1;
    } else {
        index = index % Object.keys(panoramas).length;
    }

    progress = 0;
    for (var i = 0; i < index; i++) {
        progress += measure(road[i], road[i + 1]);
    }

    checkSphere(index);
}