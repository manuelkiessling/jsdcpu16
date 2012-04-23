"use strict";

define([], function() {

  var Terminal = function(element, startAdress, numRows, numCols) {
    element.html('');
    this.element = element;
    this.startAdress = startAdress;
    this.numRows = numRows;
    this.numCols = numCols;

    for (var rowNumber = 0; rowNumber < numRows; rowNumber++) {
      for (var colNumber = 0; colNumber < numCols; colNumber++) {
        element.append('<span id="r' + rowNumber + 'c' + colNumber + '"> </span>');
      }
      element.append('<span>\n</span>');
    }
  };

  Terminal.prototype.draw = function(address, value) {
    $('#r' + this.calculateRow(address) + 'c' + this.calculateCol(address)).text(String.fromCharCode(value));
  };

  Terminal.prototype.calculateRow = function(address) {
    var position = address - this.startAdress;
    return Math.floor(position / this.numCols);
  };

  Terminal.prototype.calculateCol = function(address) {
    var position = address - this.startAdress;
    return position % this.numCols;
  };

  return Terminal;

});
