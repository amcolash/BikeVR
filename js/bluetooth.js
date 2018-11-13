var connectButton = document.getElementById("connect");
var bluetoothInfo = document.getElementById("bluetoothInfo");
var stats = document.getElementById("stats");
var logElement = document.getElementById("log");

connectButton.addEventListener('click', handleButton);

const UINT16_MAX = 65536;  // 2^16
const UINT32_MAX = 4294967296;  // 2^32
const updateRatio = 0.85; // Percent ratio between old/new stats

var characteristic, previousSample, currentSample, bluetoothStats, hasWheel, hasCrank, startDistance;
var wheelSize = 2111;

window.onload = updateWheel;

function updateWheel() {
    var rimElement = document.getElementById("rim");
    var tireElement = document.getElementById("tire");
    var mmElement = document.getElementById("mm");

    var r = parseFloat(rimElement.value);
    var t = parseFloat(tireElement.value);
    if (r > 0 && t > 0) {
        wheelSize = 3.1415 * (2 * t + r);
        mmElement.value = Math.round(wheelSize);
    } else {
        mmElement.value = '';
    }
}

function handleButton() {
    if (!characteristic) {
        onStartButtonClick();
    } else {
        onStopButtonClick();
    }
}

function onStartButtonClick() {
    let serviceUuid = "cycling_speed_and_cadence";
    let characteristicUuid = "csc_measurement";

    // TODO: At some point look into auto-reconnect
    // https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect.html

    log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
        .then(device => {
            if (bluetoothInfo) bluetoothInfo.style.display = "block";
            log('Connecting to GATT Server...');
            return device.gatt.connect();
        })
        .then(server => {
            log('Getting Service...');
            return server.getPrimaryService(serviceUuid);
        })
        .then(service => {
            log('Getting Characteristic...');
            return service.getCharacteristic(characteristicUuid);
        })
        .then(c => {
            characteristic = c;
            return characteristic.startNotifications().then(_ => {
                log('Notifications started');
                characteristic.addEventListener('characteristicvaluechanged',
                    handleNotifications);
                connectButton.innerText = "Disconnect";
            });
        })
        .catch(error => {
            log('Argh! ' + error);
        });
}

function onStopButtonClick() {
    if (characteristic) {
        characteristic.stopNotifications()
            .then(() => {
                log('Notifications stopped');
                characteristic.removeEventListener('characteristicvaluechanged',
                    handleNotifications);
                characteristic = undefined;
                bluetoothStats = undefined;
                connectButton.innerText = "Connect";
            })
            .catch(error => {
                log('Argh! ' + error);
            });
    }
}

function log(message) {
    console.log(message);
    if (message && message.length > 0 && logElement) {
        if (logElement.innerText.length > 0) logElement.innerText += "\n";
        logElement.innerText += message;
    }
}

function handleNotifications(event) {
    let value = event.target.value;

    let flags = value.getUint8(0, true);
    hasWheel = flags === 1 || flags === 3;
    hasCrank = flags === 2 || flags === 3;

    previousSample = currentSample;
    currentSample = {
        wheel: value.getUint32(1, true),
        wheelTime: value.getUint16(5, true),
        crank: value.getUint16(7, true),
        crankTime: value.getUint16(9, true),
    };

    // console.log(previousSample, currentSample);
    // var bluetoothStats = "Wheel Rev: " + currentSample.wheel + "\n";
    // bluetoothStats += "Last Wheel Time: " + currentSample.wheelTime + "\n";
    // bluetoothStats += "Crank Rev: " + currentSample.crank + "\n";
    // bluetoothStats += "Last Crank Time: " + currentSample.crankTime;
    // console.log(bluetoothStats);
    
    calculateStats();

    if (bluetoothStats) {
        var data = "Cadence (rpm): " + bluetoothStats.cadence.toFixed(1) + "\n";
        data += "Distance (km): " + bluetoothStats.distance.toFixed(2) + "\n";
        data += "Speed (km/hr): " + bluetoothStats.speed.toFixed(1);
        stats.innerText = data;
    }
}

function diffForSample(current, previous, max) {
    if (current >= previous) {
        return current - previous;
    } else {
        return (max - previous) + current;
    }
}

function calculateStats() {
    if (!previousSample) {
        startDistance = currentSample.wheel * wheelSize / 1000 / 1000; // km
        return;
    }

    var distance, cadence, speed;
    if (hasWheel) {
        let wheelTimeDiff = diffForSample(currentSample.wheelTime, previousSample.wheelTime, UINT16_MAX);
        wheelTimeDiff /= 1024; // Convert from fractional seconds (roughly ms) -> full seconds
        let wheelDiff = diffForSample(currentSample.wheel, previousSample.wheel, UINT32_MAX);

        var sampleDistance = wheelDiff * wheelSize / 1000; // distance in meters
        speed = (wheelTimeDiff == 0) ? 0 : sampleDistance / wheelTimeDiff * 3.6; // km/hr

        distance = currentSample.wheel * wheelSize / 1000 / 1000; // km
        distance -= startDistance;
    }

    if (hasCrank) {
        let crankTimeDiff = diffForSample(currentSample.crankTime, previousSample.crankTime, UINT16_MAX);
        crankTimeDiff /= 1024; // Convert from fractional seconds (roughly ms) -> full seconds
        let crankDiff = diffForSample(currentSample.crank, previousSample.crank, UINT16_MAX);

        cadence = (crankTimeDiff == 0) ? 0 : (60 * crankDiff / crankTimeDiff); // RPM
    }

    if (bluetoothStats) {
        bluetoothStats = {
            cadence: bluetoothStats.cadence * (1 - updateRatio) + cadence * updateRatio,
            distance: distance,
            speed: bluetoothStats.speed * (1 - updateRatio) + speed * updateRatio
        };
    } else {
        bluetoothStats = {
            cadence: cadence,
            distance: distance,
            speed: speed
        };
    }
}