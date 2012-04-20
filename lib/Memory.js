"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([], function() {

  var Memory = function(numberOfWords, wordsize, callbacks) {
    this.numberOfWords = numberOfWords;
    this.wordsize = wordsize;
    this.callbacks = callbacks;
    this.words = [];
    this.reset();
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
      throw "Value is larger than wordsize: " + value + " " + value.toString(16);
    }
    if (address > this.words.length) {
      throw "Address is out of range";
    }
    this.words[address] = value;
    this.callbacks.write(address, value);
  };

  Memory.prototype.reset = function() {
    for (var i = 0; i < this.numberOfWords; i++) {
      this.words[i] = 0x0000;
    }
  };

  return Memory;

});
