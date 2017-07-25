//----------------------------------------------------------------------------
//Copyright (c) 2005 Zope Foundation and Contributors.

//This software is subject to the provisions of the Zope Public License,
//Version 2.1 (ZPL).  A copy of the ZPL should accompany this distribution.
//THIS SOFTWARE IS PROVIDED "AS IS" AND ANY AND ALL EXPRESS OR IMPLIED
//WARRANTIES ARE DISCLAIMED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//WARRANTIES OF TITLE, MERCHANTABILITY, AGAINST INFRINGEMENT, AND FITNESS
//FOR A PARTICULAR PURPOSE.


//TestRecorder - a javascript library to support browser test recording. It
//is designed to be as cross-browser compatible as possible and to promote 
//loose coupling with the user interface, making it easier to evolve the UI
//and experiment with alternative interfaces.

//caveats: popup windows undefined, cant handle framesets

//todo:
//- capture submit (w/lookback for doctest)
//- cleanup strings


//Contact Brian Lloyd (brian@zope.com) with questions or comments.
//---------------------------------------------------------------------------


if (typeof (TestRecorder) == "undefined") {
    TestRecorder = {};
}

//---------------------------------------------------------------------------
//Browser -- a singleton that provides a cross-browser API for managing event 
//handlers and miscellaneous browser functions.

//Methods:

//captureEvent(window, name, handler) -- capture the named event occurring
//in the given window, setting the function handler as the event handler.
//The event name should be of the form "click", "blur", "change", etc. 

//releaseEvent(window, name, handler) -- release the named event occurring
//in the given window. The event name should be of the form "click", "blur",
//"change", etc. 

//getSelection(window) -- return the text currently selected, or the empty
//string if no text is currently selected in the browser.

//---------------------------------------------------------------------------

if (typeof (TestRecorder.Browser) == "undefined") {
    TestRecorder.Browser = {};
}

TestRecorder.Browser.captureEvent = function (wnd, name, func) {
    var lname = name.toLowerCase();
    var doc = wnd.document;
    wnd.captureEvents(Event[name.toUpperCase()]);
    wnd["on" + lname] = func;
}

TestRecorder.Browser.releaseEvent = function (wnd, name, func) {
    var lname = name.toLowerCase();
    var doc = wnd.document;
    wnd.releaseEvents(Event[name.toUpperCase()]);
    wnd["on" + lname] = null;
}

TestRecorder.Browser.getSelection = function (wnd) {
    var doc = wnd.document;
    if (wnd.getSelection) {
        return wnd.getSelection() + "";
    }
    else if (doc.getSelection) {
        return doc.getSelection() + "";
    }
    else if (doc.selection && doc.selection.createRange) {
        return doc.selection.createRange().text + "";
    }
    return "";
}

TestRecorder.Browser.windowHeight = function (wnd) {
    var doc = wnd.document;
    if (wnd.innerHeight) {
        return wnd.innerHeight;
    }
    else if (doc.documentElement && doc.documentElement.clientHeight) {
        return doc.documentElement.clientHeight;
    }
    else if (document.body) {
        return document.body.clientHeight;
    }
    return -1;
}

TestRecorder.Browser.windowWidth = function (wnd) {
    var doc = wnd.document;
    if (wnd.innerWidth) {
        return wnd.innerWidth;
    }
    else if (doc.documentElement && doc.documentElement.clientWidth) {
        return doc.documentElement.clientWidth;
    }
    else if (document.body) {
        return document.body.clientWidth;
    }
    return -1;
}


//---------------------------------------------------------------------------
//Event -- a class that provides a cross-browser API dealing with most of the
//interesting information about events.

//Methods:

//type() -- returns the string type of the event (e.g. "click")

//target() -- returns the target of the event

//button() -- returns the mouse button pressed during the event. Because
//it is not possible to reliably detect a middle button press, this method 
//only recognized the left and right mouse buttons. Returns one of the  
//constants Event.LeftButton, Event.RightButton or Event.UnknownButton for 
//a left click, right click, or indeterminate (or no mouse click).

//keycode() -- returns the index code of the key pressed. Note that this 
//value may differ across browsers because of character set differences. 
//Whenever possible, it is suggested to use keychar() instead.

//keychar() -- returns the char version of the key pressed rather than a 
//raw numeric code. The resulting value is subject to all of the vagaries 
//of browsers, character encodings in use, etc.

//shiftkey() -- returns true if the shift key was pressed.

//posX() -- return the X coordinate of the mouse relative to the document.

//posY() -- return the y coordinate of the mouse relative to the document.

//stopPropagation() -- stop event propagation (if supported)

//preventDefault() -- prevent the default action (if supported)

//---------------------------------------------------------------------------

TestRecorder.Event = function (e) {
    this.event = (e) ? e : window.event;
}

TestRecorder.Event.LeftButton = 0;
TestRecorder.Event.MiddleButton = 1;
TestRecorder.Event.RightButton = 2;
TestRecorder.Event.UnknownButton = 3;

TestRecorder.Event.prototype.stopPropagation = function () {
    if (this.event.stopPropagation)
        this.event.stopPropagation();
}

TestRecorder.Event.prototype.preventDefault = function () {
    if (this.event.preventDefault)
        this.event.preventDefault();
}

TestRecorder.Event.prototype.type = function () {
    return this.event.type;
}

TestRecorder.Event.prototype.button = function () {
    if (this.event.button) {
        if (this.event.button == 2) {
            return TestRecorder.Event.RightButton;
        }
        return TestRecorder.Event.LeftButton;
    }
    else if (this.event.which) {
        if (this.event.which > 1) {
            return TestRecorder.Event.RightButton;
        }
        return TestRecorder.Event.LeftButton;
    }
    return TestRecorder.Event.UnknownButton;
}

TestRecorder.Event.prototype.target = function () {
    var t = (this.event.target) ? this.event.target : this.event.srcElement;
    if (t && t.nodeType == 3) // safari bug
        return t.parentNode;
    return t;
}

TestRecorder.Event.prototype.keycode = function () {
    return (this.event.keyCode) ? this.event.keyCode : this.event.which;
}

TestRecorder.Event.prototype.keychar = function () {
    return String.fromCharCode(this.keycode());
}

TestRecorder.Event.prototype.shiftkey = function () {
    if (this.event.shiftKey)
        return true;
    return false;
}

TestRecorder.Event.prototype.posX = function () {
    if (this.event.pageX)
        return this.event.pageX;
    else if (this.event.clientX) {
        return this.event.clientX + document.body.scrollLeft;
    }
    return 0;
}

TestRecorder.Event.prototype.posY = function () {
    if (this.event.pageY)
        return this.event.pageY;
    else if (this.event.clientY) {
        return this.event.clientY + document.body.scrollTop;
    }
    return 0;
}



//---------------------------------------------------------------------------
//TestCase -- this class contains the interesting events that happen in 
//the course of a test recording and provides some testcase metadata.

//Attributes:

//title -- the title of the test case.

//items -- an array of objects representing test actions and checks


//---------------------------------------------------------------------------

TestRecorder.TestCase = function () {
    this.title = "Test Case";
    // maybe some items are already stored in the background
    // but we do not need them here anyway
    this.items = new Array();
}

TestRecorder.TestCase.prototype.append = function (o) {
    this.items[this.items.length] = o;
    chrome.runtime.sendMessage({ action: "append", obj: o }, function(){});
}

TestRecorder.TestCase.prototype.peek = function () {
    return this.items[this.items.length - 1];
}

TestRecorder.TestCase.prototype.poke = function (o) {
    this.items[this.items.length - 1] = o;
    chrome.runtime.sendMessage({ action: "poke", obj: o }, function(){});
}


//---------------------------------------------------------------------------
//Event types -- whenever an interesting event happens (an action or a check)
//it is recorded as one of the object types defined below. All events have a
//'type' attribute that marks the type of the event (one of the values in the
//EventTypes enumeration) and different attributes to capture the pertinent 
//information at the time of the event.
//---------------------------------------------------------------------------

if (typeof (TestRecorder.EventTypes) == "undefined") {
    TestRecorder.EventTypes = {};
}

TestRecorder.EventTypes.OpenUrl = 0;
TestRecorder.EventTypes.Click = 1;
TestRecorder.EventTypes.Change = 2;
TestRecorder.EventTypes.Comment = 3;
TestRecorder.EventTypes.Submit = 4;
TestRecorder.EventTypes.CheckPageTitle = 5;
TestRecorder.EventTypes.CheckPageLocation = 6;
TestRecorder.EventTypes.CheckTextPresent = 7;
TestRecorder.EventTypes.CheckValue = 8;
TestRecorder.EventTypes.CheckValueContains = 9;
TestRecorder.EventTypes.CheckText = 10;
TestRecorder.EventTypes.CheckHref = 11;
TestRecorder.EventTypes.CheckEnabled = 12;
TestRecorder.EventTypes.CheckDisabled = 13;
TestRecorder.EventTypes.CheckSelectValue = 14;
TestRecorder.EventTypes.CheckSelectOptions = 15;
TestRecorder.EventTypes.CheckImageSrc = 16;
TestRecorder.EventTypes.PageLoad = 17;
TestRecorder.EventTypes.ScreenShot = 18;
TestRecorder.EventTypes.MouseDown = 19;
TestRecorder.EventTypes.MouseUp = 20;
TestRecorder.EventTypes.MouseDrag = 21;
TestRecorder.EventTypes.MouseDrop = 22;
TestRecorder.EventTypes.KeyPress = 23;

TestRecorder.ElementInfo = function (element) {
    this.action = element.action;
    this.method = element.method;
    this.href = element.href;
    this.tagName = element.tagName;
    this.selector = this.getCleanCSSSelector(element);
    this.value = element.value;
    this.checked = element.checked;
    this.name = element.name;
    this.type = element.type;
    if (this.type)
        this.type = this.type.toLowerCase();
    if (element.form)
        this.form = { id: element.form.id, name: element.form.name };
    this.src = element.src;
    this.id = element.id;
    this.title = element.title;
    this.options = [];
    if (element.selectedIndex) {
        for (var i = 0; i < element.options.length; i++) {
            var o = element.options[i];
            this.options[i] = { text: o.text, value: o.value };
        }
    }
    this.label = this.findLabelText(element);
}

TestRecorder.ElementInfo.prototype.findLabelText = function (element) {
    var label = this.findContainingLabel(element)
    var text;
    if (!label) {
        label = this.findReferencingLabel(element);
    }
    if (label) {
        text = label.innerHTML;
        // remove newlines
        text = text.replace('\n', ' ');
        // remove tags
        text = text.replace(/<[^>]*>/g, ' ');
        // remove non-alphanumeric prefixes or suffixes
        text = text.replace(/^\W*/mg, '')
        text = text.replace(/\W*$/mg, '')
        // remove extra whitespace
        text = text.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
    }

    return text;
}

TestRecorder.ElementInfo.prototype.findReferencingLabel = function (element) {
    var labels = window.document.getElementsByTagName('label')
    for (var i = 0; i < labels.length; i++) {
        if (labels[i].attributes['for'] &&
            labels[i].attributes['for'].value == element.id)
            return labels[i]
    }
}

TestRecorder.ElementInfo.prototype.findContainingLabel = function (element) {
    var parent = element.parentNode;
    if (!parent)
        return undefined;
    if (parent.tagName && parent.tagName.toLowerCase() == 'label')
        return parent;
    else
        return this.findContainingLabel(parent);
}

TestRecorder.ElementInfo.prototype.getCleanCSSSelector = function (element) {
    if (!element) return;
    var selector = element.tagName ? element.tagName.toLowerCase() : '';
    if (selector == '' || selector == 'html') return '';

    var tmp_selector = '';
    var accuracy = document.querySelectorAll(selector).length;
    if (element.id) {
        selector = "#" + element.id.replace(/\./g, '\\.');
        accuracy = document.querySelectorAll(selector).length
        if (accuracy == 1) return selector;
    }
    if (element.className) {
        tmp_selector = '.' + element.className.trim().replace(/ /g, ".");
        if (document.querySelectorAll(tmp_selector).length < accuracy) {
            selector = tmp_selector;
            accuracy = document.querySelectorAll(selector).length
            if (accuracy == 1) return selector;
        }
    }
    var parent = element.parentNode;
    var parent_selector = this.getCleanCSSSelector(parent);

    if (parent_selector) {

        // resolve sibling ambiguity
        var matching_sibling = 0;
        var matching_nodes = document.querySelectorAll(parent_selector + ' > ' + selector);
        for (var i = 0; i < matching_nodes.length; i++) {
            if (matching_nodes[i].parentNode == parent) matching_sibling++;
        }
        if (matching_sibling > 1) {
            var index = 1;
            for (var sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) index++;
            selector = selector + ':nth-child(' + index + ')';
        }

        // remove useless intermediary parent
        selector_array = parent_selector.split(' ');
        if (selector_array.length > 1) {
            for (var i = 1; i < selector_array.length; i++) {
                tmp_selector = selector_array.slice(0, i).join(' ') + ' ' + selector;
                if (document.querySelectorAll(tmp_selector).length == 1) {
                    selector = tmp_selector;
                    break;
                }
            }
        }

        // improve accuracy if still not correct
        accuracy = document.querySelectorAll(selector).length
        if (accuracy > 1) {
            tmp_selector = parent_selector + " " + selector;
            if (document.querySelectorAll(tmp_selector).length == 1) {
                selector = tmp_selector;
            } else {
                selector = parent_selector + " > " + selector;
            }
        }
    }

    return selector;
}

TestRecorder.DocumentEvent = function (type, target) {
    this.type = type;
    this.url = target.URL;
    this.title = target.title;
}

TestRecorder.ElementEvent = function (type, target, text) {
    this.type = type;
    this.info = new TestRecorder.ElementInfo(target);
    this.text = text ? text : recorder.strip(rightclicked_item.textContent);
}

TestRecorder.CommentEvent = function (text) {
    this.type = TestRecorder.EventTypes.Comment;
    this.text = text;
}

TestRecorder.KeyEvent = function (target, text) {
    this.type = TestRecorder.EventTypes.KeyPress;
    this.info = new TestRecorder.ElementInfo(target);
    this.text = text;
}

TestRecorder.MouseEvent = function (type, target, x, y) {
    this.type = type;
    this.info = new TestRecorder.ElementInfo(target);
    this.x = x;
    this.y = y;
    this.text = recorder.strip(target.textContent);
}

TestRecorder.ScreenShotEvent = function () {
    this.type = TestRecorder.EventTypes.ScreenShot;
}

TestRecorder.OpenURLEvent = function (url) {
    this.type = TestRecorder.EventTypes.OpenUrl;
    this.url = url;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
}

TestRecorder.PageLoadEvent = function (url) {
    this.type = TestRecorder.EventTypes.OpenUrl;
    this.url = url;
    this.viaBack = back
}

//---------------------------------------------------------------------------
//Recorder -- a controller class that manages the recording of web browser
//activities to produce a test case.

//Instance Methods:

//start() -- start recording browser events.

//stop() -- stop recording browser events.

//reset() -- reset the recorder and initialize a new test case.

//---------------------------------------------------------------------------

TestRecorder.Recorder = function () {
    this.testcase = new TestRecorder.TestCase();
    this.logfunc = null;
    this.window = null;
    this.active = false;
}

//The recorder is a singleton -- there is no real reason to have more than
//one instance, and many of its methods are event handlers which need a
//stable reference to the instance.

recorder = new TestRecorder.Recorder();
recorder.logfunc = function (msg) {};

TestRecorder.Recorder.prototype.start = function () {
    this.window = window;
    this.captureEvents();

    // OVERRIDE stopPropagation
    var actualCode = '(' + function () {
        var overloadStopPropagation = Event.prototype.stopPropagation;
        Event.prototype.stopPropagation = function () {
            overloadStopPropagation.apply(this, arguments);
        };
    } + ')();';
    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);

    this.active = true;
    this.log("recorder started");
}

TestRecorder.Recorder.prototype.stop = function () {
    this.releaseEvents();
    this.active = false;
    this.log("recorder stopped");
    return;
}

TestRecorder.Recorder.prototype.open = function (url) {
    var e = new TestRecorder.OpenURLEvent(url);
    this.testcase.append(e);
    this.log("open url: " + url);
}

TestRecorder.Recorder.prototype.pageLoad = function () {
    var doc = recorder.window.document;
    var et = TestRecorder.EventTypes;
    var e = new TestRecorder.DocumentEvent(et.PageLoad, doc);
    this.testcase.append(e);
    this.log("page loaded url: " + e.url);
}

TestRecorder.Recorder.prototype.captureEvents = function () {
    var wnd = this.window;
    TestRecorder.Browser.captureEvent(wnd, "drag", this.ondrag);
    TestRecorder.Browser.captureEvent(wnd, "mousedown", this.onmousedown);
    TestRecorder.Browser.captureEvent(wnd, "mouseup", this.onmouseup);
    TestRecorder.Browser.captureEvent(wnd, "click", this.onclick);
    TestRecorder.Browser.captureEvent(wnd, "change", this.onchange);
    TestRecorder.Browser.captureEvent(wnd, "keypress", this.onkeypress);
    TestRecorder.Browser.captureEvent(wnd, "select", this.onselect);
    TestRecorder.Browser.captureEvent(wnd, "submit", this.onsubmit);
}

TestRecorder.Recorder.prototype.releaseEvents = function () {
    var wnd = this.window;
    TestRecorder.Browser.releaseEvent(wnd, "drag", this.ondrag);
    TestRecorder.Browser.releaseEvent(wnd, "mousedown", this.onmousedown);
    TestRecorder.Browser.releaseEvent(wnd, "mouseup", this.onmouseup);
    TestRecorder.Browser.releaseEvent(wnd, "click", this.onclick);
    TestRecorder.Browser.releaseEvent(wnd, "change", this.onchange);
    TestRecorder.Browser.releaseEvent(wnd, "keypress", this.onkeypress);
    TestRecorder.Browser.releaseEvent(wnd, "select", this.onselect);
    TestRecorder.Browser.releaseEvent(wnd, "submit", this.onsubmit);
}



TestRecorder.Recorder.prototype.clickaction = function (e) {
    // This method is called by our low-level event handler when the mouse 
    // is clicked in normal mode. Its job is decide whether the click is
    // something we care about. If so, we record the event in the test case.
    //
    // If the context menu is visible, then the click is either over the 
    // menu (selecting a check) or out of the menu (cancelling it) so we 
    // always discard clicks that happen when the menu is visible.
    var et = TestRecorder.EventTypes;
    var t = e.target();
    if (t.href || (t.type && t.type == "submit") ||
        (t.type && t.type == "submit")) {
        this.testcase.append(new TestRecorder.ElementEvent(et.Click, e.target()));
    } else {
        recorder.testcase.append(
            new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.Click, e.target(), e.posX(), e.posY()
            ));
    }
}

TestRecorder.Recorder.prototype.addComment = function (text) {
    this.testcase.append(new TestRecorder.CommentEvent(text));
}

TestRecorder.Recorder.prototype.check = function (e) {
    // This method is called by our low-level event handler when the mouse 
    // is clicked in check mode. Its job is decide whether the click is
    // something we care about. If so, we record the check in the test case.
    var target = e.target();
    if (target.type) {
        var type = target.type.toLowerCase();
        if (type == "submit" || type == "button" || type == "image") {
            recorder.log('check button == "' + target.value + '"');
        }
    }
    else if (target.href) {
        if (target.textContent) {
            var text = recorder.strip(target.textContent);
            recorder.log('check link == "' + target.textContent + '"');
        }
    }
}

TestRecorder.Recorder.prototype.onpageload = function () {
    if (this.active) {
        // This must be called each time a new document is fully loaded into the
        // testing target frame to ensure that events are captured for the page.
        recorder.captureEvents();

        // if a new page has loaded, but there doesn't seem to be a reason why, 
        // then we need to record the fact or the information will be lost
        if (this.testcase.peek()) {
            var last_event_type = this.testcase.peek().type;
            if (last_event_type != TestRecorder.EventTypes.OpenUrl &&
                last_event_type != TestRecorder.EventTypes.Click &&
                last_event_type != TestRecorder.EventTypes.Submit) {
                this.open(this.window.location.toString());
            }
        }

        // record the fact that a page load happened
        if (this.window)
            this.pageLoad();
    }
}

TestRecorder.Recorder.prototype.onchange = function (e) {
    var e = new TestRecorder.Event(e);
    var et = TestRecorder.EventTypes;
    var v = new TestRecorder.ElementEvent(et.Change, e.target());
    recorder.testcase.append(v);
    recorder.log("value changed: " + e.target().value);
}

TestRecorder.Recorder.prototype.onselect = function (e) {
    var e = new TestRecorder.Event(e);
    recorder.log("select: " + e.target());
}

TestRecorder.Recorder.prototype.onsubmit = function (e) {
    var e = new TestRecorder.Event(e);
    var et = TestRecorder.EventTypes;
    // We want to save the form element as the event target
    var t = e.target();
    while (t.parentNode && t.tagName != "FORM") {
        t = t.parentNode;
    }
    var v = new TestRecorder.ElementEvent(et.Submit, t);
    recorder.testcase.append(v);
    recorder.log("submit: " + e.target());
}

TestRecorder.Recorder.prototype.ondrag = function (e) {
    var e = new TestRecorder.Event(e);
    recorder.testcase.append(
        new TestRecorder.MouseEvent(
            TestRecorder.EventTypes.MouseDrag, e.target(), e.posX(), e.posY()
        ));
}
TestRecorder.Recorder.prototype.onmousedown = function (e) {
    var e = new TestRecorder.Event(e);
    if (e.button() == TestRecorder.Event.LeftButton) {
        recorder.testcase.append(
            new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.MouseDown, e.target(), e.posX(), e.posY()
            ));
    }
}
TestRecorder.Recorder.prototype.onmouseup = function (e) {
    var e = new TestRecorder.Event(e);
    if (e.button() == TestRecorder.Event.LeftButton) {
        recorder.testcase.append(
            new TestRecorder.MouseEvent(
                TestRecorder.EventTypes.MouseUp, e.target(), e.posX(), e.posY()
            ));
    }
}
//The dance here between onclick and oncontextmenu requires a bit of 
//explanation. IE and Moz/Firefox have wildly different behaviors when 
//a right-click occurs. IE6 fires only an oncontextmenu event; Firefox 
//gets an onclick event first followed by an oncontextment event. So 
//to do the right thing here, we need to silently consume oncontextmenu
//on Firefox, and reroute oncontextmenu to look like a click event for 
//IE. In both cases, we need to prevent the default action for cmenu.

TestRecorder.Recorder.prototype.onclick = function (e) {
    var e = new TestRecorder.Event(e);

    if (e.shiftkey()) {
        recorder.check(e);
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    if (e.button() == TestRecorder.Event.RightButton) {
        recorder.check(e);
        return true;
    } else if (e.button() == TestRecorder.Event.LeftButton) {
        recorder.clickaction(e);
        return true;
    }
    e.stopPropagation();
    e.preventDefault();
    return false;
}


TestRecorder.Recorder.prototype.onkeypress = function (e) {
    var e = new TestRecorder.Event(e);
    if (e.shiftkey() && (e.keychar() == 'S')) {
        recorder.testcase.append(new TestRecorder.ScreenShotEvent());
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    var last = recorder.testcase.peek();
    if (last.type == TestRecorder.EventTypes.KeyPress) {
        last.text = last.text + e.keychar();
        recorder.testcase.poke(last);
    } else {
        recorder.testcase.append(
            new TestRecorder.KeyEvent(e.target(), e.keychar())
        );
    }
    return true;
}

TestRecorder.Recorder.prototype.strip = function (s) {
    return s.replace('\n', ' ').replace(/^\s*/, "").replace(/\s*$/, "");
}

TestRecorder.Recorder.prototype.log = function (text) {
    if (this.logfunc) {
        this.logfunc(text);
    }
}


var rightclicked_item = null;
document.querySelector("body").addEventListener("contextmenu", function(e) {
  rightclicked_item = e.srcElement;
});
document.querySelector("body").addEventListener("click", function() {
  rightclicked_item = null;
});

chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.action == "start") {
        recorder.start();
    }

    if (request.action == "stop") {
        recorder.stop();
    }

    if (request.action == "open") {
        recorder.open(request.url);
    }

    if (request.action == "addComment") {
        recorder.addComment(request.text);
    }

    if (request.action == "takeScreenshot") {
        this.recorder.testcase.append(new TestRecorder.ScreenShotEvent());
    }

    if (request.action === "checkPageTitle") {
        var doc = recorder.window.document;
        var e = new TestRecorder.DocumentEvent(TestRecorder.EventTypes.CheckPageTitle, doc);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkPageLocation") {
        var doc = recorder.window.document;
        var e = new TestRecorder.DocumentEvent(TestRecorder.EventTypes.CheckPageLocation, doc);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkValue") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckValue, t);
        recorder.testcase.append(e);
    }

    if (request.action === "checkText") {
        var t = rightclicked_item;
        var s = "";
        if (t.type == "button" || t.type == "submit") {
            s = t.value;
        }
        else {
            s = t.textContent;
        }
        s = recorder.strip(s);
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckText, t, s);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkTextPresent") {
        var t = document.querySelector('body');
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckTextPresent, t, request.text);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkHref") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckHref, t);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkEnabled") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckEnabled, t);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkDisabled") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckDisabled, t);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkSelectValue") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckSelectValue, t);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkSelectOptions") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckSelectOptions, t);
        recorder.testcase.append(e);
    }
    
    if (request.action === "checkImgSrc") {
        var t = rightclicked_item;
        var e = new TestRecorder.ElementEvent(TestRecorder.EventTypes.CheckImageSrc, t);
        recorder.testcase.append(e);
    }
});

//get current status from background
chrome.runtime.sendMessage({ action: "get_status" }, function (response) {
    if (response && response.active) {
        recorder.start();
    }
});
