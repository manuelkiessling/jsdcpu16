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
    this.index = 0;
    var that = this;
    element.on('keypress', function(e) {
      memory.write(0x9000 + that.index, e.which);
      that.index = increaseIndex(that.index);
    });
  };

  Keyboard.prototype.reset = function() {
    this.index = 0;
  };

  return Keyboard;

});
