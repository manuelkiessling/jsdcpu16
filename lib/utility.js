"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([], function() {

  var pad = function(number, length) {
    var str = '' + number;
    while (str.length < length) {
      str = '0' + str;
    }
    return str;
  };

  var fillString = function(string, length, char) {
    while (string.length < length) {
      string = string + char;
    }
    return string;
  };

  var getUrlParameter = function(name, url) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(url);
    if (!results)
    {
      return null;
    }
    return results[1] || null;
  }

  return {
    pad: pad,
    fillString: fillString,
    getUrlParameter: getUrlParameter
  };

});
