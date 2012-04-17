"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['../lib/Memory', '../lib/Cpu'], function(Memory, Cpu) {

  var setupCpu = function(instructions) {
    var wordsize = 0xFFFF;
    var numberOfWords = 0x10000;

    var memory = new Memory(numberOfWords, wordsize, {
      read: function() {},
      write: function() {}
    });

    instructions.forEach(function(instruction, index) {
      memory.write(index, instruction);
    });

    var cpu = new Cpu(memory, {
      step: function() {}
    });

    return cpu;
  }

  describe('SET', function() {
    it('correctly sets a register to a small value', function() {
      var cpu = setupCpu([0x9401]); // SET A, 5
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0005);
    });

    it('correctly sets a register to a large value', function() {
      var cpu = setupCpu([
        0x7c01,   // SET A, 113
        0x0071    //
      ]);
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0071);
    });

    it('correctly sets a register to the value of another register', function() {
      var cpu = setupCpu([
        0x9401,   // SET A, 5
        0x0011    // SET B, A
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x01]).toEqual(0x0005);
    });

    it('loops when setting the PC', function() {
      var cpu = setupCpu([
        0x8402,   // :loop ADD A, 1
        0x0011,   // SET B, A
        0x7dc1,   // SET PC, loop
        0x0000
      ]);
      for (var i = 0; i < 10; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0004);
      expect(cpu.registers[0x01]).toEqual(0x0003);
      expect(cpu.registers[0x1c]).toEqual(0x0001);
    });
  });


  describe('ADD', function() {
    it('correctly adds the value of a register to the value of another register', function() {
      var cpu = setupCpu([
        0x9401,   // SET A, 5
        0x0011,   // SET B, A
        0x0402    // ADD A, B
      ]);
      cpu.step();
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x000a); // A must be 10
    });

    it('sets O if an overflow occurs', function() {
      var cpu = setupCpu([
        0x7c01,   // SET A, 0xfffe
        0xfffe,   //
        0x9402    // ADD A, 5
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0003);
      expect(cpu.registers[0x1d]).toEqual(0x0001);
    });
  });


  describe('SUB', function() {
    it('correctly substracts the value of a register from the value of another register', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x9411,   // SET B, 5
        0x0013    // SUB B, A
      ]);
      cpu.step();
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x01]).toEqual(0x0002);
    });

    it('sets O if an underflow occurs', function() {
      var cpu = setupCpu([
        0x9401,   // SET A, 5
        0x8c11,   // SET B, 3
        0x0013    // SUB B, A
      ]);
      cpu.step();
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x01]).toEqual(0xfffe);
      expect(cpu.registers[0x1d]).toEqual(0xffff);
    });
  });


  describe('IFE', function() {
    it('skips the next instruction if values are not equal', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x9011,   // SET B, 4
        0x040c,   // IFE A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0004);
    });

    it('executes the next instruction if values are equal', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x8c11,   // SET B, 3
        0x040c,   // IFE A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0007);
    });
  });

  describe('IFN', function() {
    it('skips the next instruction if values are equal', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x8c11,   // SET B, 3
        0x040d,   // IFN A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0003);
    });

    it('executes the next instruction if values are not equal', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x9011,   // SET B, 4
        0x040d,   // IFN A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0007);
    });
  });


  describe('IFG', function() {
    it('skips the next instruction if a<=b', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x8c11,   // SET B, 3
        0x040e,   // IFG A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0003);
    });

    it('executes the next instruction if a>b', function() {
      var cpu = setupCpu([
        0x9401,   // SET A, 5
        0x9011,   // SET B, 4
        0x040e,   // IFG A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0007);
    });
  });


  describe('IFB', function() {
    it('skips the next instruction if (a&b)==0', function() {
      var cpu = setupCpu([
        0x8001,   // SET A, 0
        0x8c11,   // SET B, 3
        0x040f,   // IFB A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0003);
    });

    it('executes the next instruction if (a&b)!=0', function() {
      var cpu = setupCpu([
        0x9401,   // SET A, 5
        0x9011,   // SET B, 4
        0x040f,   // IFB A, B
        0x9c11,   // SET B, 7
        0xa401    // SET A, 9
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x0007);
    });
  });

});
