// some great code from: https://stereologics.wordpress.com/2015/04/02/about-page-visibility-api-hidden-visibilitychange-visibilitystate/

var browserPrefixes = ['moz', 'ms', 'o', 'webkit'],
    isVisible = true; // internal flag, defaults to true

// get the correct attribute name
function getHiddenPropertyName(prefix) {
    return (prefix ? prefix + 'Hidden' : 'hidden');
}

// get the correct event name
function getVisibilityEvent(prefix) {
    return (prefix ? prefix : '') + 'visibilitychange';
}

// get current browser vendor prefix
function getBrowserPrefix() {
    for (var i = 0; i < browserPrefixes.length; i++) {
        if (getHiddenPropertyName(browserPrefixes[i]) in document) {
            // return vendor prefix
            return browserPrefixes[i];
        }
    }

    // no vendor prefix needed
    return null;
}

// bind and handle events
var browserPrefix = getBrowserPrefix(),
    hiddenPropertyName = getHiddenPropertyName(browserPrefix),
    visibilityEventName = getVisibilityEvent(browserPrefix);

function onVisible() {
    // prevent double execution
    if (isVisible) {
        return;
    }

    // change flag value
    isVisible = true;
    // console.log('visible');
}

function onHidden() {
    // prevent double execution
    if (!isVisible) {
        return;
    }

    // change flag value
    isVisible = false;
    // console.log('hidden');
}

function handleVisibilityChange(forcedFlag) {
    // forcedFlag is a boolean when this event handler is triggered by a
    // focus or blur eventotherwise it's an Event object
    if (typeof forcedFlag === "boolean") {
        if (forcedFlag) {
            return onVisible();
        }

        return onHidden();
    }

    if (document[hiddenPropertyName]) {
        return onHidden();
    }

    return onVisible();
}

document.addEventListener(visibilityEventName, handleVisibilityChange, false);

// extra event listeners for better behaviour
document.addEventListener('focus', function () {
    handleVisibilityChange(true);
}, false);

document.addEventListener('blur', function () {
    handleVisibilityChange(false);
}, false);

window.addEventListener('focus', function () {
    handleVisibilityChange(true);
}, false);

window.addEventListener('blur', function () {
    handleVisibilityChange(false);
}, false);