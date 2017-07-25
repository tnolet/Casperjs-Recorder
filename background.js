var testcase_items = [];
var active = false;
var empty = true;
var tab_id = null;
var contextItems;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action == "append") {
    testcase_items[testcase_items.length] = request.obj;
    empty = false;
    sendResponse({});
  }
  if (request.action == "poke") {
    testcase_items[testcase_items.length - 1] = request.obj;
    sendResponse({});
  }
  if (request.action == "get_status") {
    sendResponse({ 'active': active, 'empty': empty });
  }
  if (request.action == "get_items") {
    sendResponse({ 'items': testcase_items });
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

    checkPageTitle: chrome.contextMenus.create({
      "title": "Check page title",
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkPageTitle" });
        });
      }
    }),

    checkPageLocation: chrome.contextMenus.create({
      "title": "Check page location",
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkPageLocation" });
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
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkText" });
        });
      }
    }),

    checkTextPresent: chrome.contextMenus.create({
      "title": "Check selection exists",
      "contexts": ["selection"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkTextPresent", 'text': e.selectionText });
        });
      }
    }),

    checkSelectOptions: chrome.contextMenus.create({
      "title": "Check select options",
      "contexts": ["editable"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkSelectOptions" });
        });
      }
    }),

    checkSelectValue: chrome.contextMenus.create({
      "title": "Check select options",
      "contexts": ["editable"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkSelectValue" });
        });
      }
    }),

    checkImgSrc: chrome.contextMenus.create({
      "title": "Check image src",
      "contexts": ["image"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkImgSrc" });
        });
      }
    }),

    checkHref: chrome.contextMenus.create({
      "title": "Check link href",
      "contexts": ["link"],
      "onclick": function (e) {
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendMessage(tab.id, { action: "checkHref" });
        });
      }
    })
  }
}

var record = chrome.contextMenus.create({
  title: "Start recording",
  onclick: function (info, tab) {
    if (!active) {
      chrome.contextMenus.update(record, {title: "Stop recording"});
      active = true;
      empty = true;
      testcase_items = [];
      contextItems = createContextItems();
      chrome.tabs.update(tab.id, { url: tab.url }, function (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "open", 'url': tab.url });
      });
    } else {
      chrome.contextMenus.update(record, {title: "Start recording"});
      active = false;
      Object.values(contextItems).forEach(function(name){
        chrome.contextMenus.remove(name);
      });
      chrome.tabs.sendMessage(tab.id, { action: "stop" });
      chrome.tabs.create({ url: "./casper.html" });
    }
  }
});
