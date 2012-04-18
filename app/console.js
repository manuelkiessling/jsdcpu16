"use strict";

define([], function() {

  var draw = function(element, memory, startAddress) {
    var content = '';
    var string;
    for (var row = 0; row < 12; row++) {
      for (var col = 0; col < 32; col++) {
        string = String.fromCharCode(memory.read(startAddress + (row * 32) + col));
        if (string == String.fromCharCode(0)) {
          string = ' ';
        }
        content += string;
      }
      content += '\n';
    }
    element.html(content);
  };

  return { draw: draw };

});
