"use strict";

define([], function() {

  var Terminal = function(element, startAdress, numRows, numCols) {
    this.element = element;
    this.startAdress = startAdress;
    this.content = '';
    this.numCols = numCols;

    for (var row = 0; row < numRows; row++) {
      for (var col = 0; col < numCols; col++) {
        this.content += ' ';
      }
      this.content += '\n';
    }
  };

  Terminal.prototype.draw = function(address, value) {
    var position = address - this.startAdress;
    var row = Math.floor(position / this.numCols);
    position = position + row; // every row adds one \n character
    this.content = this.content.substr(0, position + 2) +
                   String.fromCharCode(value) +
                   this.content.substr(position + 3);
    this.element.html(this.content);
  };

  return Terminal;

});
