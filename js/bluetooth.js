var startButton = document.getElementById("start");
var stopButton = document.getElementById("stop");

startButton.addEventListener('click', onStartButtonClick);
stopButton.addEventListener('click', onStopButtonClick);

var myCharacteristic;

function onStartButtonClick() {
    let serviceUuid = "cycling_speed_and_cadence";
    let characteristicUuid = "csc_measurement";

    // TODO: At some point look into auto-reconnect
    // https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect.html

    log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
        .then(device => {
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
        .then(characteristic => {
            myCharacteristic = characteristic;
            return myCharacteristic.startNotifications().then(_ => {
                log('> Notifications started');
                myCharacteristic.addEventListener('characteristicvaluechanged',
                    handleNotifications);
            });
        })
        .catch(error => {
            log('Argh! ' + error);
        });
}

function onStopButtonClick() {
    if (myCharacteristic) {
        myCharacteristic.stopNotifications()
            .then(_ => {
                log('> Notifications stopped');
                myCharacteristic.removeEventListener('characteristicvaluechanged',
                    handleNotifications);
            })
            .catch(error => {
                log('Argh! ' + error);
            });
    }
}

function handleNotifications(event) {
    let value = event.target.value;
    
    // Convert raw data bytes to hex values just for the sake of showing something.
    // In the "real" world, you'd use data.getUint8, data.getUint16 or even
    // TextDecoder to process raw data bytes.
    // let a = [];
    // for (let i = 0; i < value.byteLength; i++) {
    //     a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
    // }
    // log('> ' + a.join(' '));
    
    var data = "Flags: " + value.getUint8(0, true) + ", ";
    data += "Wheel Rev: " + value.getUint32(1, true) + ", ";
    data += "Wheel Time: " + value.getUint16(5, true) + ", ";
    data += "Crank Rev: " + value.getUint16(7, true) + ", ";
    data += "Crank Time: " + value.getUint16(9, true);
    log(data);
}

function log(message) {
    if (message && message.length > 0) {
        console.log(message);
        var e = document.getElementById("log");
        e.innerText += "\n" + message;
    }
}