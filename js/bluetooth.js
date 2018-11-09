var startButton = document.getElementById("start");
var stopButton = document.getElementById("stop");
var info = document.getElementById("info");
var stats = document.getElementById("stats");

startButton.addEventListener('click', onStartButtonClick);
stopButton.addEventListener('click', onStopButtonClick);

const UINT16_MAX = 65536;  // 2^16
const UINT32_MAX = 4294967296;  // 2^32
const wheelSize = 2111; // in mm, this is 700x25 (my tire)

var characteristic, previousSample, currentSample, hasWheel, hasCrank;

function onStartButtonClick() {
    let serviceUuid = "cycling_speed_and_cadence";
    let characteristicUuid = "csc_measurement";

    // TODO: At some point look into auto-reconnect
    // https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect.html

    log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
        .then(device => {
            info.style.display = "block";
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
            });
        })
        .catch(error => {
            log('Argh! ' + error);
        });
}

function onStopButtonClick() {
    if (characteristic) {
        characteristic.stopNotifications()
            .then(_ => {
                log('Notifications stopped');
                characteristic.removeEventListener('characteristicvaluechanged',
                    handleNotifications);
            })
            .catch(error => {
                log('Argh! ' + error);
            });
    }
}

function log(message) {
    if (message && message.length > 0) {
        console.log(message);
        var e = document.getElementById("log");
        if (e.innerText.length > 0) e.innerText += "\n";
        e.innerText += message;
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
    // var data = "Wheel Rev: " + currentSample.wheel + "\n";
    // data += "Last Wheel Time: " + currentSample.wheelTime + "\n";
    // data += "Crank Rev: " + currentSample.crank + "\n";
    // data += "Last Crank Time: " + currentSample.crankTime;
    // console.log(data);
    
    var currentStats = calculateStats();

    if (currentStats) {
        var data = "Cadence (rpm): " + currentStats.cadenceinRPM.toFixed(1) + "\n";
        data += "Distance (km): " + currentStats.distanceinKM.toFixed(2) + "\n";
        data += "Speed (km/hr): " + currentStats.speedInKMPerHour.toFixed(1);
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
    if (!previousSample) return undefined;

    var cadence, distance, speed;

    if (hasWheel) {
        let wheelTimeDiff = diffForSample(currentSample.wheelTime, previousSample.wheelTime, UINT16_MAX);
        wheelTimeDiff /= 1024; // Convert from fractional seconds (roughly ms) -> full seconds
        let wheelDiff = diffForSample(currentSample.wheel, previousSample.wheel, UINT32_MAX);

        var sampleDistance = wheelDiff * wheelSize / 1000; // distance in meters
        speed = (wheelTimeDiff == 0) ? 0 : sampleDistance / wheelTimeDiff; // m/s
        speed *= 3.6; // convert to km/hr

        distance = currentSample.wheel * wheelSize / 1000 / 1000; // km
    }

    if (hasCrank) {
        let crankTimeDiff = diffForSample(currentSample.crankTime, previousSample.crankTime, UINT16_MAX);
        crankTimeDiff /= 1024; // Convert from fractional seconds (roughly ms) -> full seconds
        let crankDiff = diffForSample(currentSample.crank, previousSample.crank, UINT16_MAX);

        cadence = (crankTimeDiff == 0) ? 0 : (60 * crankDiff / crankTimeDiff); // RPM
    }

    return {
        cadenceinRPM: cadence,
        distanceinKM: distance,
        speedInKMPerHour: speed
    };
}