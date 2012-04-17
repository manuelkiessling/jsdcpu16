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

  return { pad: pad };

});
