// ---------------------------------------------------------------------------
// CasperRenderer -- a class to render recorded tests to a CasperJS
// test format.
// ---------------------------------------------------------------------------

if (typeof (EventTypes) == "undefined") {
  EventTypes = {};
}

EventTypes.OpenUrl = 0;
EventTypes.Click = 1;
EventTypes.Change = 2;
EventTypes.Comment = 3;
EventTypes.Submit = 4;
EventTypes.CheckPageTitle = 5;
EventTypes.CheckPageLocation = 6;
EventTypes.CheckTextPresent = 7;
EventTypes.CheckValue = 8;
EventTypes.CheckValueContains = 9;
EventTypes.CheckText = 10;
EventTypes.CheckHref = 11;
EventTypes.CheckEnabled = 12;
EventTypes.CheckDisabled = 13;
EventTypes.CheckSelectValue = 14;
EventTypes.CheckImageSrc = 16;
EventTypes.PageLoad = 17;
EventTypes.ScreenShot = 18;
EventTypes.MouseDown = 19;
EventTypes.MouseUp = 20;
EventTypes.MouseDrop = 22;
EventTypes.KeyPress = 23;

var d = {};
d[EventTypes.OpenUrl] = "openUrl";
d[EventTypes.Click] = "click";
d[EventTypes.Comment] = "comment";
d[EventTypes.Submit] = "submit";
d[EventTypes.CheckPageTitle] = "checkPageTitle";
d[EventTypes.CheckPageLocation] = "checkPageLocation";
d[EventTypes.CheckTextPresent] = "checkTextPresent";
d[EventTypes.CheckValue] = "checkValue";
d[EventTypes.CheckText] = "checkText";
d[EventTypes.CheckHref] = "checkHref";
d[EventTypes.CheckEnabled] = "checkEnabled";
d[EventTypes.CheckDisabled] = "checkDisabled";
d[EventTypes.CheckSelectValue] = "checkSelectValue";
d[EventTypes.CheckImageSrc] = "checkImageSrc";
d[EventTypes.PageLoad] = "pageLoad";
d[EventTypes.ScreenShot] = "screenShot";
d[EventTypes.KeyPress] = "keypress";


class CasperRenderer {
  constructor(document) {
    this.dispatch = d;
    this.document = document;
    this.title = "Testcase";
    this.items = null;
    this.history = new Array();
    this.last_events = new Array();
    this.screen_id = 1;
    this.unamed_element_id = 1;
  }

  text(txt) {
    this.document.writeln(txt);
  }
  
  pyout(text) {
    this.document.writeln("    " + text);
  }

  pyrepr(text, escape) {
    // todo: handle non--strings & quoting
    // There should a more eloquent way of doing this but by  doing the escaping before adding the string quotes prevents the string quotes from accidentally getting escaped creating a syntax error in the output code.
    var s = text;
    if (escape) s = s.replace(/(['"])/g, "\\$1");
    var s = "'" + s + "'";
    return s;
  }

  regexp_escape(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s\/]/g, "\\$&");
  };

  cleanStringForXpath(str, escape) {
    var parts = str.match(/[^'"]+|['"]/g);
    parts = parts.map((part) => {
      if (part === "'") {
        return '"\'"'; // output "'"
      }

      if (part === '"') {
        return "'\"'"; // output '"'
      }
      return "'" + part + "'";
    });
    var xpath = '';
    if (parts.length > 1) {
      xpath = "concat(" + parts.join(",") + ")";
    } else {
      xpath = parts[0];
    }
    if (escape) xpath = xpath.replace(/(["])/g, "\\$1");
    return xpath;
  }

  render() {
    var etypes = EventTypes;
    this.document.open();
    this.document.write("<" + "pre" + ">");
    this.writeHeader();
    var last_down = null;
    var forget_click = false;

    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if(i==0) {
        this.startUrl(item);
        continue;
      }

      // we do not want click due to user checking actions
      if (i > 0 && item.type == etypes.Click &&
        ((this.items[i - 1].type >= etypes.CheckPageTitle && this.items[i - 1].type <= etypes.CheckImageSrc) || this.items[i - 1].type == etypes.ScreenShot)) {
        continue;
      }

      if (this.dispatch[item.type]) {
        this[this.dispatch[item.type]](item);
      }
    }
    this.writeFooter();
    this.document.write("<" + "/" + "pre" + ">");
    this.document.close();
  }

  writeHeader() {
    this.text("var x = require('casper').selectXPath;");
  }

  writeFooter() {
    this.text(
`
 casper.run(function () {test.done();});
});`
    );
  }

  shortUrl(url) {
    return url.substr(url.indexOf('/', 10));
  }

  startUrl(item) {
    this.text("casper.options.viewportSize = {width: 1280, height: 720};", 0);
    this.text("casper.test.begin('Resurrectio test', function(test) {");
    this.text(`  casper.start(${this.pyrepr(item.url)});`);
  }

  openUrl(item) {
    this.text(`  casper.thenOpen(${this.pyrepr(item.url)});`);
  }

  pageLoad(item) {
    this.history.push(this.pyrepr(item.url));
  }

  normalizeWhitespace(s) {
    return s.replace(/^\s*/, '').replace(/\s*$/, '').replace(/\s+/g, ' ');
  }

  getControl(item) {
    var type = item.info.type;
    var tag = item.info.tagName.toLowerCase();
    var selector;
    if ((type == "submit" || type == "button") && item.info.value)
      selector = tag + '[type=' + type + '][value=' + this.pyrepr(this.normalizeWhitespace(item.info.value)) + ']';
    else if (item.info.name)
      selector = tag + '[name=' + this.pyrepr(item.info.name) + ']';
    else if (item.info.id)
      selector = tag + '#' + item.info.id;
    else
      selector = item.info.selector;

    return selector;
  }

  getControlXPath(item) {
    var type = item.info.type;
    var way;
    if ((type == "submit" || type == "button") && item.info.value)
      way = '@value=' + this.pyrepr(this.normalizeWhitespace(item.info.value));
    else if (item.info.name)
      way = '@name=' + this.pyrepr(item.info.name);
    else if (item.info.id)
      way = '@id=' + this.pyrepr(item.info.id);
    else
      way = 'TODO';

    return way;
  }

  getLinkXPath(item) {
    var way;
    if (item.text)
      way = 'normalize-space(text())=' + this.cleanStringForXpath(this.normalizeWhitespace(item.text), true);
    else if (item.info.id)
      way = '@id=' + this.pyrepr(item.info.id);
    else if (item.info.href)
      way = '@href=' + this.pyrepr(this.shortUrl(item.info.href));
    else if (item.info.title)
      way = 'title=' + this.pyrepr(this.normalizeWhitespace(item.info.title));

    return way;
  }


  getFormSelector(item) {
    var info = item.info;
    if (!info.form) {
      return '';
    }
    if (info.form.name) {
      return "form[name=" + info.form.name + "] ";
    } else if (info.form.id) {
      return "form#" + info.form.id + " ";
    } else {
      return "form ";
    }
  }

  click(item) {
    var tag = item.info.tagName.toLowerCase();
    var selector;
    if (tag == 'a') {
      var xpath_selector = this.getLinkXPath(item);
      if (xpath_selector) {
        selector = 'x("//a[' + xpath_selector + ']")';
      } else {
        selector = item.info.selector;
      }
    } else if (tag == 'input' || tag == 'button') {
      selector = this.getFormSelector(item) + this.getControl(item);
      selector = `"${selector}"`;
    } else {
      selector = '"' + item.info.selector + '"';
    }
    this.text(
`
  casper.waitForSelector(${selector}, function () {
    test.assertExists(${selector});
    this.click(${selector});
  });`
    );
  }

  keypress(item) {
    var text = item.text.replace('\n', '').replace('\r', '\\r');
    this.text(
`
  casper.waitForSelector("${this.getControl(item)}", function () {
    this.sendKeys("${this.getControl(item)}", "${text}");
  });`
    );
  }

  submit(item) {
    // the submit has been called somehow (user, or script)
    // so no need to trigger it.
    this.text("  /* submit form */");
  }

  screenShot(item) {
    // wait 1 second is not the ideal solution, but will be enough most
    // part of time. For slow pages, an assert before capture will make
    // sure evrything is properly loaded before screenshot.
    this.text(
`
  casper.wait(1000);
  casper.then(function () {
    this.captureSelector("screenshot${this.screen_id}.png", "html");
  });`
    );
    this.screen_id = this.screen_id + 1;
  }

  comment(item) {
    var lines = item.text.split('\n');
    this.text('  casper.then(function() {');
    for (var i = 0; i < lines.length; i++) {
      this.text('    test.comment("' + lines[i] + '");');
    }
    this.text('  });');
  }

  checkPageTitle(item) {
    var title = this.pyrepr(item.title, true);
    this.text(
`
  casper.then(function () {
    test.assertTitle(${title});
  });`
    );
  }

  checkPageLocation(item) {
    this.text(
`
  casper.then(function () {
    test.assertUrlMatch(/^${this.regexp_escape(item.url)}'$/);
  });`
    );
  }

  checkTextPresent(item) {
    this.waitAndTestSelector(`x("//*[contains(text(), ${this.pyrepr(item.text, true)})]")`);
  }

  checkValue(item) {
    var type = item.info.type;
    var way = this.getControlXPath(item);
    var selector = '';
    if (type == 'checkbox' || type == 'radio') {
      var selected;
      if (item.info.checked)
        selected = '@checked'
      else
        selected = 'not(@checked)'
      selector = 'x("//input[' + way + ' and ' + selected + ']")';
    }
    else {
      var value = this.pyrepr(item.info.value)
      var tag = item.info.tagName.toLowerCase();
      selector = 'x("//' + tag + '[' + way + ' and @value=' + value + ']")';
    }
    this.waitAndTestSelector(selector);
  }

  checkText(item) {
    var selector = '';
    if ((item.info.type == "submit") || (item.info.type == "button")) {
      selector = 'x("//input[@value=' + this.pyrepr(item.text, true) + ']")';
    } else {
      selector = 'x("//*[normalize-space(text())=' + this.cleanStringForXpath(item.text, true) + ']")';
    }
    this.waitAndTestSelector(selector);
  }

  checkHref(item) {
    var href = this.pyrepr(this.shortUrl(item.info.href));
    var xpath_selector = this.getLinkXPath(item);
    if (xpath_selector) {
      selector = 'x("//a[' + xpath_selector + ' and @href=' + href + ']")';
    } else {
      selector = item.info.selector + '[href=' + href + ']';
    }
    this.text(
`
  casper.then(function () {
    test.assertExists(${selector});
  });`
    );
  }

  checkEnabled(item) {
    var way = this.getControlXPath(item);
    var tag = item.info.tagName.toLowerCase();
    this.waitAndTestSelector('x("//' + tag + '[' + way + ' and not(@disabled)]")');
  }

  checkDisabled(item) {
    var way = this.getControlXPath(item);
    var tag = item.info.tagName.toLowerCase();
    this.waitAndTestSelector('x("//' + tag + '[' + way + ' and @disabled]")');
  }

  checkSelectValue(item) {
    var value = this.pyrepr(item.info.value);
    var way = this.getControlXPath(item);
    this.waitAndTestSelector('x("//select[' + way + ']/option[@selected and @value=' + value + ']")');
  }

  checkImageSrc(item) {
    var src = this.pyrepr(this.shortUrl(item.info.src));
    this.waitAndTestSelector('x("//img[@src=' + src + ']")');
  }

  waitAndTestSelector(selector) {
    this.text(
`
  casper.waitForSelector(${selector}, function () {
    test.assertExists(${selector});
  });`
    );
  }
}

var dt = new CasperRenderer(document);
window.addEventListener('load', function () {
  chrome.runtime.sendMessage({ action: "get_items" }, (response) => {
    dt.items = response.items;
    dt.render();
  });
});
