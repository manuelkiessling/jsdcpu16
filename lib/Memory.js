"use strict";

var Memory = function(numberOfWords, wordsize, callbacks) {

  this.wordsize = wordsize;
  this.callbacks = callbacks;

  this.words = [];
  for (var i = 0; i < numberOfWords; i++) {
    this.words.push(0x0000);
  }

};

Memory.prototype.read = function(address) {
  if (address > this.words.length) {
    throw "Address is out of range";
  }
  this.callbacks.read(address, this.words[address]);
  return this.words[address];
};

Memory.prototype.write = function(address, value) {
  if (value > this.wordsize) {
    throw "Value is larger than wordsize";
  }
  if (address > this.words.length) {
    throw "Address is out of range";
  }
  this.callbacks.write(address, value);
  this.words[address] = value;
};
