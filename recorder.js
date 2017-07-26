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

        /* Get events from already started sessions */
        chrome.runtime.sendMessage({
            action: "get_events"
        }, (response) => {
            this.events = response.events;
            if (this.events) {
                this.started = true;
                this.listen();
            }
        });
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
        if (!e.target.matches(this.clickables)) {
            return;
        }
        this.addEvent({
            type: "doClick",
            target: UTILS.cssPath(e.target)
        });
    }

    doInput(e) {
        if (this.events[this.events.length - 1] && this.events[this.events.length - 1].target === UTILS.cssPath(e.target)) {
            this.events.pop();
        }
        this.addEvent({
            type: "doInput",
            target: UTILS.cssPath(e.target),
            value: e.target.value
        });
    }

    checkText(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkText",
            target: UTILS.cssPath(element),
            value: request.text
        });
    }

    checkElement(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkElement",
            target: UTILS.cssPath(element)
        });
    }

    checkValue(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkElementValue",
            target: UTILS.cssPath(element),
            value: element.value,
            text: element.textContent
        });
    }

    checkImage(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkImage",
            target: UTILS.cssPath(element),
            value: element.getAttribute('src')
        });
    }

    checkLink(request, element = this.contextMenuElement) {
        this.addEvent({
            type: "checkLink",
            target: UTILS.cssPath(element),
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
        window.addEventListener('click', this.doClick.bind(this));
        window.addEventListener('input', this.doInput.bind(this));

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
                    rendered.push(`casper.start('${event.value}');`);
                    break;
                case 'doClick':
                    rendered.push(`casper.then(function () {casper.click('${event.target}');});`);
                    break;
                case 'doInput':
                    rendered.push(`casper.then(function () {casper.sendKeys('${event.target}', '${event.value}');});`);
                    break;
                case 'checkText':
                    rendered.push(`casper.then(function () {test.assertSelectorHasText('${event.target}', '${event.value}');});`);
                    break;
                case 'checkElement':
                    rendered.push(`casper.then(function () {test.assertExists('${event.target}');});`);
                    break;
                case 'checkImage':
                    rendered.push(`casper.then(function () {test.assertExists('${event.target}[src="${event.value}"]');});`);
                    break;
                case 'checkLink':
                    rendered.push(`casper.then(function () {test.assertExists('${event.target}[href="${event.value}"]');});`);
                    break;
                case 'takeScreenshot':
                    rendered.push(`casper.then(function () {casper.captureSelector("screenshot${i}.png", "html");});`);
                    break;
                case 'addComment':
                    rendered.push(`casper.then(function () {test.comment('${event.value}');});`);
                    break;
            }
        });
        return `
casper.options.viewportSize = {width: 1280, height: 720};
casper.test.begin('Placeholder', function(test) {
${rendered.join('\n')}
casper.run(function () {test.done();});
});
`;
    }
}

const recorderInstance = new Recorder();
