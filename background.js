var events = [];
var active = false;
var contextItems;
chrome.runtime.onMessage.addListener(function (request, sender, response) {
  if (request.action == "get_events") {
    response({ 'events': events });
  }
  if (request.events) {
    events = request.events;
  }
});

function createContextItems() {
  return {
    comment: chrome.contextMenus.create({
      "title": "Add comment",
      "onclick": function () {
        chrome.tabs.getSelected(null, function (tab) {
          var text = window.prompt("Type your comment:");
          chrome.tabs.sendMessage(tab.id, { action: "addComment", 'text': text });
        });
      }
    }),

    screenshot: chrome.contextMenus.create({
      "title": "Take screenshot",
      "onclick": function () {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "takeScreenshot" });
        });
      }
    }),

    checkValue: chrome.contextMenus.create({
      "title": "Check value",
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkValue" });
        });
      }
    }),

    checkText: chrome.contextMenus.create({
      "title": "Check text",
      "contexts": ["selection"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkText", text: e.selectionText });
        });
      }
    }),

    checkImage: chrome.contextMenus.create({
      "title": "Check image",
      "contexts": ["image"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkImage" });
        });
      }
    }),

    checkLink: chrome.contextMenus.create({
      "title": "Check link",
      "contexts": ["link"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkLink" });
        });
      }
    })
  }
}

var record = chrome.contextMenus.create({
  title: "Start recording",
  onclick: function (info, tab) {
    if (!active) {
      chrome.contextMenus.update(record, { title: "Stop recording" });
      active = true;
      events = [];
      contextItems = createContextItems();
      chrome.tabs.update(tab.id, { url: tab.url }, function (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "start", 'url': tab.url });
      });
    } else {
      chrome.contextMenus.update(record, { title: "Start recording" });
      Object.values(contextItems).forEach(function (name) {
        chrome.contextMenus.remove(name);
      });
      chrome.tabs.sendMessage(tab.id, { action: "stop" });
      active = false;
    }
  }
});


