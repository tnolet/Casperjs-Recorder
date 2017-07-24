//-----------------------------------------------
// Proxy to access current tab recorder instance
// ----------------------------------------------
function RecorderProxy() {
    this.active = null;
}

RecorderProxy.prototype.start = function (url) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.runtime.sendMessage({ action: "start", recorded_tab: tab.id, start_url: url });
    });
}

RecorderProxy.prototype.stop = function () {
    chrome.runtime.sendMessage({ action: "stop" });
}

RecorderProxy.prototype.open = function (url, callback) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "open", 'url': url }, callback);
    });
}

RecorderProxy.prototype.addComment = function (text, callback) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "addComment", 'text': text }, callback);
    });
}

RecorderProxy.prototype.takeScreenshot = function () {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "takeScreenshot" });
    });
}

//-----------------------------------------------
// UI
//----------------------------------------------
function RecorderUI() {
    this.recorder = new RecorderProxy();
    chrome.runtime.sendMessage({ action: "get_status" }, function (response) {
        if (response.active) {
            ui.set_started();
        } else {
            if (!response.empty) {
                ui.set_stopped();
            }
            chrome.tabs.getSelected(null, function (tab) {
                document.forms[0].elements["url"].value = tab.url;
            });
        }
    });

}

RecorderUI.prototype.start = function () {
    var url = document.forms[0].elements["url"].value;
    ui.set_started()
    ui.recorder.start(url);

    return false;
}

RecorderUI.prototype.set_started = function () {
    var e = document.getElementById("bstop");
    e.style.display = '';
    e.onclick = ui.stop;
    e.value = "Stop Recording";
    e = document.getElementById("bgo");
    e.style.display = 'none';
    e = document.getElementById("bcomment");
    e.style.display = '';
    e = document.getElementById("bscreen");
    e.style.display = '';
    e = document.getElementById("bexport");
    e.style.display = 'none';
}

RecorderUI.prototype.stop = function () {
    ui.set_stopped();
    ui.recorder.stop();
    return false;
}

RecorderUI.prototype.set_stopped = function () {
    var e = document.getElementById("bstop");
    e.style.display = 'none';
    e = document.getElementById("bgo");
    e.style.display = '';
    e = document.getElementById("bcomment");
    e.style.display = 'none';
    e = document.getElementById("bscreen");
    e.style.display = 'none';
    e = document.getElementById("bexport");
    e.style.display = '';
}

RecorderUI.prototype.showcomment = function () {
    var e = document.getElementById("bcomment");
    e.style.display = 'none';
    e = document.getElementById("comment");
    e.style.display = '';
    e = document.getElementById("bscreen");
    e.style.display = 'none';
    e = document.getElementById("ctext");
    e.focus();
    return false;
}

RecorderUI.prototype.hidecomment = function (bsave) {
    var e = document.getElementById("bcomment");
    e.style.display = '';
    e = document.getElementById("bscreen");
    e.style.display = '';
    e = document.getElementById("comment");
    e.style.display = 'none';
    e = document.getElementById("ctext");
    if (bsave) {
        var txt = e.value;
        if (txt && txt.length > 0) {
            this.recorder.addComment(e.value, null);
        }
    }
    e.value = "";
    return false;
}


RecorderUI.prototype.takescreen = function () {
    this.recorder.takeScreenshot();
}

RecorderUI.prototype.export = function (options) {
    chrome.tabs.create({ url: "./casper.html" });
}

var ui;

// bind events to ui elements
window.onload = function () {
    document.querySelector('#bgo').onclick = function () { ui.start(); return false; };
    document.querySelector('#bstop').onclick = function () { ui.stop(); return false; };
    document.querySelector('#bcomment').onclick = function () { ui.showcomment(); return false; };
    document.querySelector('#bexport').onclick = function () { ui.export(); return false; };
    document.querySelector('#bsavecomment').onclick = function () { ui.hidecomment(true); return false; };
    document.querySelector('#bscreen').onclick = function () { ui.takescreen(); return false; };
    document.querySelector('#bcancelcomment').onclick = function () { ui.hidecomment(false); return false; };
    ui = new RecorderUI();
}
