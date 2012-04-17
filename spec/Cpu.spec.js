"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['../lib/Memory', '../lib/Cpu'], function(Memory, Cpu) {
  describe('SET', function() {

    it('correctly sets a register', function() {
      var wordsize = 0xFFFF;
      var numberOfWords = 0x3;

      var memory = new Memory(numberOfWords, wordsize, {
        read: function() {},
        write: function() {}
      });

      memory.write(0x0000, 0x9401); // SET A, 5

      var cpu = new Cpu(memory, {
        step: function() {}
      });

      cpu.step();

      expect(cpu.registers[0x00]).toEqual(0x0005);
    });

    it('correctly sets a register to the value of another register', function() {
      var wordsize = 0xFFFF;
      var numberOfWords = 0x3;

      var memory = new Memory(numberOfWords, wordsize, {
        read: function() {},
        write: function() {}
      });

      memory.write(0x0000, 0x9401); // SET A, 5
      memory.write(0x0001, 0x0011); // SET B, A

      var cpu = new Cpu(memory, {
        step: function() {}
      });

      cpu.step();
      cpu.step();

      expect(cpu.registers[0x01]).toEqual(0x0005);
    });

  });
});
