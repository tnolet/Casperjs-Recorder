/* Recorder class */
class Recorder {
    constructor() {
        this.events = [];
        this.started = false;
        this.clickables = 'a, button, [type="submit"], [type="button"]';

        /* Allow background.js to call methods on Recorder */
        chrome.runtime.onMessage.addListener((request) => {
            this[request.action](request);
        });

        /* We need to start to listen early so that we get autofill fields */
        this.listen();

        /* Get events from already started sessions */
        chrome.runtime.sendMessage({
            action: "get_events"
        }, (response) => {
            this.events = response.events;
            if (this.events) {
                this.started = true;
            }
        });

        /* Override disabled text selection */
        if (document.body) {
            const styleElem = document.createElement('style');
            styleElem.innerHTML = '* {user-select: text !important;}';
            document.body.appendChild(styleElem);
        }
    }

    findParentByName(el, tag) {
        while (el.parentNode) {
            el = el.parentNode;
            if (el.tagName === tag.toUpperCase())
                return el;
        }
        return null;
    }


    findParentByUniquePath(el) {
        while (el.parentNode.tagName) {
            el = el.parentNode;
            var sel = this.getPath(el, true);
            if (sel && document.querySelectorAll(sel).length === 1) {
                return sel;
            }
        }
        return null;
    }

    getPath(el, shallow) {
        // First option: If we have a name and a form parent use them with either the name or action of the form
        var form = this.findParentByName(el, 'form');
        var name = el.getAttribute('name');

        if (name && form && form.getAttribute('id')) {
            return `[#${form.getAttribute('id')} [name="${name}"]`;
        }

        if (name && form && form.getAttribute('action')) {
            return `[action="${form.getAttribute('action')}"] [name="${name}"]`;
        }

        // Second option: If we have a id it should be unique
        if (el.getAttribute('id')) {
            return `#${el.getAttribute('id')}`;
        }

        // Third option: If we have a href we check if it is unique before using
        var selByHref = `[href="${el.getAttribute('href')}"]`;
        if (el.getAttribute('href') && document.querySelectorAll(selByHref).length === 1) {
            return selByHref;
        }

        // Forth option: Loop over all attributes, adding them to the selector until it is unique
        if (el.attributes.length) {
            var sel = Array.prototype.reduce.call(el.attributes, (sel, attr) => {
                if (attr.name.indexOf('aria-') !== -1 || attr.name.indexOf('data-') !== -1 || !attr.value || sel && document.querySelectorAll(sel).length === 1) {
                    return sel;
                }
                return sel + `[${attr.name}="${attr.value}"]`;
            }, "");
            if (sel && document.querySelectorAll(sel).length === 1) {
                return sel;
            }
        }

        // Fifth option: Find a unique parent and try to use that in combination with the current elements tagname
        var parentPath = this.findParentByUniquePath(el);
        var selByParentPath = `${parentPath} ${el.tagName.toLowerCase()}`;
        if (!shallow && document.querySelectorAll(selByParentPath).length === 1) {
            return selByParentPath;
        }

        // Sixth option: Fall back to using UTILS.cssPath, which will chain selectors up to an id/html element
        if (!shallow){
            return UTILS.cssPath(el);
        }
    }

    addEvent(e) {
        if (!this.started) {
            return;
        }
        this.events.push(e);
        chrome.runtime.sendMessage({
            events: this.events
        });
    }
    
    doClick(e) {
        const parentTarget = this.findParentByName(e.target, 'a') || this.findParentByName(e.target, 'button');
        if (!e.target.matches(this.clickables) && !parentTarget) {
            return;
        }
        this.addEvent({
            type: "doClick",
            target: this.getPath(parentTarget || e.target)
        });
    }

    doInput(e) {
        if (e.target.nodeName === "SELECT") {
            return;
        }
        if (this.events[this.events.length - 1] && this.events[this.events.length - 1].target === this.getPath(e.target)) {
            this.events.pop();
        }
        this.addEvent({
            type: "doInput",
            target: this.getPath(e.target),
            value: e.target.value
        });
    }

    doSelectChange(e) {
        if (e.target.nodeName !== "SELECT") {
            return;
        }
        this.addEvent({
            type: "doSelectChange",
            target: this.getPath(e.target),
            value: e.target.value
        });
    }

    checkText(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkText",
            target: this.getPath(element),
            value: request.text
        });
    }

    checkElement(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkElement",
            target: this.getPath(element)
        });
    }

    checkElementValue(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkElementValue",
            target: this.getPath(element),
            value: element.value,
            text: element.textContent
        });
    }

    checkImage(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkImage",
            target: this.getPath(element),
            value: element.getAttribute('src')
        });
    }

    checkLink(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkLink",
            target: this.getPath(element),
            value: element.getAttribute('href')
        });
    }

    takeScreenshot() {
        this.addEvent({
            type: "takeScreenshot"
        });
    }

    addComment() {
        this.addEvent({
            type: "addComment",
            value: window.prompt("Type your comment:")
        });
    }

    start(request) {
        /* Clear events */
        this.events = [];
        this.started = true;
        this.listen();

        /* Send start event */
        this.addEvent({
            type: "start",
            value: request.url
        });
    }

    listen() {
        /* Listen for clicks and inputs */
        window.addEventListener('click', this.doClick.bind(this), true);
        window.addEventListener('input', this.doInput.bind(this), true);
        window.addEventListener('change', this.doSelectChange.bind(this), true);

        /* Keep track of which element the contextmenu refers to */
        this.contextMenuElement = document.body;
        window.addEventListener("contextmenu", (e) => {
            this.contextMenuElement = e.srcElement;
        });
        window.addEventListener("click", (e) => {
            this.contextMenuElement = document.body;
        });
    }

    stop(request) {
        const rendered = this.render();
        /* Copy result to clipboard */
        document.oncopy = (event) => {
            event.clipboardData.setData("Text", rendered);
            event.preventDefault();
        };
        document.execCommand("Copy");
        document.oncopy = undefined;

        /* Clear events */
        this.started = false;
        this.events = [];
    }

    render() {
        const rendered = [];
        this.events.forEach((event, i) => {
            switch (event.type) {
                case 'start':
                    rendered.push(`
    casper.start('${event.value}');`);
                    break;
                case 'doClick':
                    rendered.push(`
    casper.then(function () {
        casper.click('${event.target}');
    });`);
                    break;
                case 'doInput':
                    rendered.push(`
    casper.then(function () {
        casper.sendKeys('${event.target}', '${event.value}');
    });`);
                    break;
                case 'doSelectChange':
                    rendered.push(`
    casper.then(function () {
        casper.evaluate(function() {
            document.querySelector('${event.target}').value = '${event.value}';
            document.querySelector('${event.target}').onchange();
        });
    });`);
                    break;
                case 'checkText':
                    rendered.push(`
    casper.then(function () {
        test.assertSelectorHasText('${event.target}', '${event.value}');
    });`);
                    break;
                case 'checkElement':
                    rendered.push(`
    casper.then(function () {
        test.assertExists('${event.target}');
    });`);
                    break;
                case 'checkElementValue':
                    rendered.push(`
    casper.then(function () {
        test.assertField({type: 'css', path: '${event.target}'}, '${event.value || event.text}');
    });`);
                    break;
                case 'checkImage':
                    rendered.push(`
    casper.then(function () {
        test.assertExists('${event.target}[src="${event.value}"]');
    });`);
                    break;
                case 'checkLink':
                    rendered.push(`
    casper.then(function () {
        test.assertExists('${event.target}[href="${event.value}"]');
    });`);
                    break;
                case 'takeScreenshot':
                    rendered.push(`
    casper.then(function () {
        casper.captureSelector("screenshot${i}.png", "html");
    });`);
                    break;
                case 'addComment':
                    rendered.push(`
    casper.then(function () {
        test.comment('${event.value}');
    });`);
                    break;
            }
        });
        return `
casper.on('step.error', function(err) {
    casper.page.evaluate(function() {
        document.body.bgColor = 'white';
    });
    casper.captureSelector("error.png", "html");
    this.die("Step failed: " + err + " See error.png for more info");
});
casper.options.viewportSize = {width: 1280, height: 720};
casper.test.begin('${window.prompt("Name your test:")}', function(test) {
    ${rendered.join('\n')}
    casper.run(function() {test.done();});
});
`;
    }
}

const recorderInstance = new Recorder();
