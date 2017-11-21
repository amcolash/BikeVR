var tmpVec = new THREE.Vector3();

function checkKey(e) {
    e = e || window.event;

    var speed = 2;

    if (e.keyCode == '37') {
        // Left Arrow
        camera.rotation.y += 0.1;
    } else if (e.keyCode == '38') {
        // Up Arrow
        // camera.translateZ(-1);
        camera.rotation.x += 0.1;
    } else if (e.keyCode == '39') {
        // Right Arrow
        camera.rotation.y -= 0.1;
    } else if (e.keyCode == '40') {
        // Down Arrow
        // camera.translateZ(1);
        camera.rotation.x -= 0.1;
    } else if (e.keyCode == '82') {
        // 'R'
        resetCamera();
    } else if (e.keyCode == '87') {
        // W
        // camera.getWorldDirection(tmpVec);
        // position.add(tmpVec.multiplyScalar(speed));
        camera.translateZ(-speed);
    } else if (e.keyCode == '65') {
        // A
        camera.translateX(-speed);
    } else if (e.keyCode == '83') {
        // S
        // camera.getWorldDirection(tmpVec);
        // position.add(tmpVec.multiplyScalar(-speed));
        camera.translateZ(speed);
    } else if (e.keyCode == '68') {
        // D
        camera.translateX(speed);
    } else if (e.keyCode == '90') {
        // Z
        prevSphere();
    } else if (e.keyCode == '88') {
        // X
        nextSphere();
    }

    position.y = -256;

    // if (camera.position.length() > 70 && currentLoaded > currentSphere) {
    //     camera.getWorldDirection(tmpVec);
    //     theta = Math.atan2(tmpVec.x, tmpVec.z);

    //     if (theta > Math.PI / 2) {
    //         nextSphere();
    //     } else {
    //         prevSphere();
    //     }
    // }

    // camera.position.clampLength(-radius * 0.9, radius * 0.9);
    camera.updateProjectionMatrix();
}

function nextSphere() {
    currentSphere = (currentSphere + 1) % Object.keys(panoramas).length;
    updateSphere(getId(currentSphere));
}

function prevSphere() {
    currentSphere--;
    if (currentSphere < 0) currentSphere = Object.keys(panoramas).length - 1;
    updateSphere(getId(currentSphere));
}