'use strict';

var helpers ={};


helpers.fill= function(page, action, cb) {

  helpers.waitFor(function () {
    // Check in the page if a specific element is now visible
    return helpers.evaluate(page, function (target) {
      return $(target).is(":visible");
    }, action.target);
  }, function () {

    action.ready = Date.now()-action.variant.film_start;
    action.dimensions = helpers.evaluate(page, function (target) {
      var dimensions = $(target).offset();
      dimensions.width = $(target).width();
      dimensions.height = $(target).height();
      return dimensions;
    }, action.target);

    helpers.evaluate(page, function (target, value) {
      return $(target).val(value);
    }, action.target, action.value);

    cb(  );
  });

};

helpers.click = function(page,action, cb) {
  helpers.waitFor(function () {
    // Check in the page if a specific element is now visible
    return helpers.evaluate(page, function (target) {
      return $(target).is(":visible");
    }, action.target);
  }, function () {

    action.ready = Date.now()-action.variant.film_start;

    var d = action.dimensions = helpers.evaluate(page, function (target) {
      var dimensions = $(target).offset();
      dimensions.width = $(target).width();
      dimensions.height = $(target).height();
      return dimensions;
    }, action.target);

    setTimeout(function () {
      page.sendEvent('mousemove', d.left + d.width / 2, d.top + d.height / 2);
      action.hover = Date.now()-action.variant.film_start;

      setTimeout(function () {
        page.sendEvent('click', d.left + d.width / 2, d.top + d.height / 2);
        action.click = Date.now()-action.variant.film_start;

        cb();
      },action.delay_before_click ||  1500)
    }, action.delay_before_hover || 1500)
  });
};

// from https://code.google.com/p/phantomjs/issues/detail?id=132
helpers.evaluate = function(page, func) {
  var args = [].slice.call(arguments, 2);
  var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
  return page.evaluate(fn);
};


//from https://github.com/ariya/phantomjs/blob/master/examples/waitfor.js
helpers.waitFor= function(testFx, onReady, timeOutMillis) {
  var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 15000, //< Default Max Timout is 3s
    start = new Date().getTime(),
    condition = false,
    interval = setInterval(function () {
      if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
        // If not time-out yet and condition not yet fulfilled
        condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
      } else {
        if (!condition) {
          // If condition still not fulfilled (timeout but condition is 'false')
          console.log("'waitFor()' timeout");
          phantom.exit(1);
        } else {
          // Condition fulfilled (timeout and/or condition is 'true')
          typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
          clearInterval(interval); //< Stop this interval
        }
      }
    }, 100); //< repeat check every 250ms
};


module.exports = helpers;