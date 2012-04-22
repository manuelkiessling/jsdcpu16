"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['../lib/Memory', '../lib/Cpu'], function(Memory, Cpu) {

  var memory;
  var setupCpu = function(instructions) {
    var wordsize = 0xFFFF;
    var numberOfWords = 0x10000;

    memory = new Memory(numberOfWords, wordsize, {
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
        0x0071
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

    it('correctly resolves [register]', function() {
      var cpu = setupCpu([
        0x7c01,   // SET A, 0x8000
        0x8000,
        0x7c81,   // SET [A], 0x0001
        0x0001
      ]);
      cpu.step();
      cpu.step();
      expect(memory.read(0x8000)).toEqual(0x0001);
    });

    it('correctly handles SET [register], [register]', function() {
      var cpu = setupCpu([
        0x7c01,  // SET A, 0x1000
        0x1000,
        0x7c11,  // SET B, 0x2000
        0x2000,
        0x91e1,  // SET [0x1000], 4
        0x1000,
        0x85e1,  // SET [0x2000], 1
        0x2000,
        0x2481   // SET [A], [B]
      ]);
      for (var i = 0; i < 5; i++) {
        cpu.step();
      }
      expect(memory.read(0x1000)).toEqual(0x0001);
    });

    it('correctly resolves "next word + register" in target', function() {
      var cpu = setupCpu([
        0x9401,   // SET A, 5
        0x9d01,   // SET [0x2000+A], 7
        0x2000
      ]);
      cpu.step();
      cpu.step();
      expect(memory.read(0x2005)).toEqual(0x0007);
    });

    it('correctly resolves "next word + register" in source', function() {
      var cpu = setupCpu([
        0x9001,   // SET A, 4
        0x95e1,   // SET [0x1004], 5
        0x1004,
        0x4011,   // SET B, [0x1000+A]
        0x1000
      ]);
      cpu.step();
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x01]).toEqual(0x0005);
    });

    it('correctly resolves [<hex-address>]', function() {
      var cpu = setupCpu([
        0x91e1,   // SET [0x5000], 4
        0x5000,
        0x7801,   // SET A, [0x5000]
        0x5000
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0004);
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


  describe('MUL', function() {
    it('works with small values', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x9404    // MUL A, 5
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x000f);
    });

    it('sets O if an overflow occurs', function() {
      var cpu = setupCpu([
        0x8c01,   // SET A, 3
        0x7c04,   // MUL A, 65535
        0xffff
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0xfffd);
      expect(cpu.registers[0x1d]).toEqual(0x0002);
    });
  });


  describe('DIV', function() {
    it('works common values', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0x8805    // DIV A, 2
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0003);
      expect(cpu.registers[0x1d]).toEqual(0x0000);
    });

    it('floors and sets O if division yields a modulo, a>b', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0x9405    // DIV A, 5
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0001);
      expect(cpu.registers[0x1d]).toEqual(0x3333);
    });

    it('floors and sets O if division yields a modulo, b>a', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0xac05    // DIV A, 11
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0000);
      expect(cpu.registers[0x1d]).toEqual(0x8ba2);
    });

    it('sets target and O to 0 if source is zero', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0x8805,   // DIV A, 2
        0x8005    // DIV A, 0
      ]);
      cpu.step();
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0000);
      expect(cpu.registers[0x1d]).toEqual(0x0000);
    });
  });


  describe('MOD', function() {
    it('works with common values, remainder', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0x9406    // MOD A, 5
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0001);
    });

    it('works with common values, no remainder', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0x8c06    // MOD A, 3
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0000);
    });

    it('sets target to 0 if source is 0', function() {
      var cpu = setupCpu([
        0x9801,   // SET A, 6
        0x8006    // MOD A, 0
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x00]).toEqual(0x0000);
    });
  });

  describe('SHL', function() {
    it('handles overflow correctly', function() {
      var cpu = setupCpu([
        0x7c21,  // SET C 0xffff
        0xffff,
        0xa027   // SHL C 2
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x02]).toEqual(0xff00);
      expect(cpu.registers[0x1d]).toEqual(0x00ff);
    });
  });

  describe('SHR', function() {
    it('handles overflow correctly', function() {
      var cpu = setupCpu([
        0x7c21,  // SET C, 0xffff
        0xffff,
        0x7c28,   // SHR C, 0xffff
        0xffff
      ]);
      cpu.step();
      cpu.step();
      expect(cpu.registers[0x02]).toEqual(0x0000);
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


  describe('Stack pointer', function() {
    it('works as expected', function() {
      var cpu = setupCpu([
        0xa9a1,   // SET PUSH, 10
        0xa5a1,   // SET PUSH, 9
        0xa1a1,   // SET PUSH, 8
        0x6001,   // SET A, POP
        0x6411,   // SET B, PEEK
        0x6411    // SET B, PEEK
      ]);
      for (var i = 0; i < 6; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0008);
      expect(cpu.registers[0x01]).toEqual(0x0009);
      expect(cpu.registers[0x1b]).toEqual(0xfffe); // SP is 0x0000 - 2 (3 pushes - 1 pop)
    });

    it('works as expected, also around the memory border', function() {
      var cpu = setupCpu([
        0xa9a1,   // SET PUSH, 10
        0xa5a1,   // SET PUSH, 9
        0x6001,   // SET A, POP
        0x6011    // SET B, POP
      ]);
      for (var i = 0; i < 6; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0009);
      expect(cpu.registers[0x01]).toEqual(0x000a);
      expect(cpu.registers[0x1b]).toEqual(0x0000); // (2 pushes - 2 pops)
    });

    it('works when PUSHing a POP', function() {
      var cpu = setupCpu([
        0xa9a1,   // SET PUSH, 10
        0xa5a1,   // SET PUSH, 9
        0x61a1,   // SET PUSH, POP
        0x6011    // SET B, POP
      ]);
      for (var i = 0; i < 6; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x01]).toEqual(0x0009);
      expect(cpu.registers[0x1b]).toEqual(0xffff); // (3 pushes - 1 pops)
    });

    it('works when POPing a PUSH', function() {
      var cpu = setupCpu([
        0xa9a1,   // SET PUSH, 10
        0xa5a1,   // SET PUSH, 9
        0x6981,   // SET POP, PUSH
        0x6011    // SET B, POP
      ]);
      for (var i = 0; i < 6; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x01]).toEqual(0x0000);
      expect(cpu.registers[0x1b]).toEqual(0xffff); // (3 pushes - 1 pops)
    });
  });


  describe('JSR', function() {
    it('pushes the address of the next instruction to the stack, then sets PC to a', function() {
      var cpu = setupCpu([
        0x7c10,   // JSR testsub
        0x0005,   
        0x9401,   // SET A, 5
        0x7dc1,   // SET PC, end
        0x0007,
        0x9011,   // :testsub SET B, 4
        0x61c1,   // SET PC, POP
        0x8c21    // :end SET C, 3
      ]);
      for (var i = 0; i < 8; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x0005);
      expect(cpu.registers[0x01]).toEqual(0x0004);
      expect(cpu.registers[0x02]).toEqual(0x0003);
      expect(cpu.registers[0x1b]).toEqual(0x0000); // SP
      expect(memory.read(0xffff)).toEqual(0x0002); // Top of stack
    });
  });


  describe('the offical sample application', function() {
    it('ends with X == 0x40 after 48 cycles', function() {
      var cpu = setupCpu([
        0x7c01,   // SET A 0x30
        0x0030,
        0x7de1,   // SET [0x1000] 0x20
        0x1000,
        0x0020,
        0x7803,   // SUB A [0x1000]
        0x1000,
        0xc00d,   // IFN A 0x10
        0x7dc1,   // SET PC crash
        0x001a,
        0xa861,   // SET I 10
        0x7c01,   // SET A 0x2000
        0x2000,
        0x2161,   // :loop SET [0x2000+I] [A]
        0x2000,
        0x8463,   // SUB I 1
        0x806d,   // IFN I 0
        0x7dc1,   // SET PC loop
        0x000d,
        0x9031,   // SET X 0x4
        0x7c10,   // JSR testsub
        0x0018,
        0x7dc1,   // SET PC crash
        0x001a,
        0x9037,   // :testsub SHL X 4
        0x61c1,   // SET PC POP
        0x7dc1,   // :crash SET PC crash
        0x001a
      ]);
      for (var i = 0; i < 50; i++) {
        cpu.step();
      }
      expect(cpu.registers[0x00]).toEqual(0x2000);
      expect(cpu.registers[0x03]).toEqual(0x0040);
      expect(cpu.memory.read(0x1000)).toEqual(0x0020);
      expect(cpu.memory.read(0xffff)).toEqual(0x0016);
    });
  });

});
