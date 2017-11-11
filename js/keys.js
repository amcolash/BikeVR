function checkKey(e) {
    e = e || window.event;

    var speed = 5;

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
        camera.position.set(0, 0, 0);
        camera.rotation.set(0, 0, 0);
    } else if (e.keyCode == '87') {
        // W
        camera.translateZ(-speed);
    } else if (e.keyCode == '65') {
        // A
        camera.translateX(-speed);
    } else if (e.keyCode == '83') {
        // S
        camera.translateZ(speed);
    } else if (e.keyCode == '68') {
        // D
        camera.translateX(speed);
    } else if (e.keyCode == '90') {
        // Z
        currentSphere--;
        if (currentSphere < 0) currentSphere = Object.keys(panoramas).length - 1;
        updateSphere(getId(currentSphere));
    } else if (e.keyCode == '88') {
        // X
        currentSphere = (currentSphere + 1) % Object.keys(panoramas).length;
        updateSphere(getId(currentSphere));
    }

    camera.position.clampLength(-radius * 0.9, radius * 0.9);
    camera.updateProjectionMatrix();
}