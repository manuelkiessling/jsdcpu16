"use strict";

define([], function() {

  var draw = function(element, memory, startAddress) {
    var content = '';
    for (var row = 0; row < 16; row++) {
      for (var col = 0; col < 32; col++) {
        content += String.fromCharCode(memory.read(startAddress + (row * 16) + col));
      }
      content += '\n';
    }
    element.html(content);
  };

  return { draw: draw };

});
