"use strict";

// Ring buffer runs from 0×9000 to 0x900f

define([], function() {

  var increaseIndex = function(index) {
    index++;
    if (index > 15) {
      index = 0;
    }
    return index;
  };

  var Keyboard = function(element, memory) {
    var index = 0;
    element.on('keypress', function(e) {
      memory.write(0x9000 + index, e.which);
      index = increaseIndex(index);
    });
  };

  return Keyboard;

});
