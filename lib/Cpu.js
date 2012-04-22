"use strict";
if (typeof define !== 'function') { var define = require('amdefine')(module) }

/*
An instruction looks like this:
"0x8811" for SET B, 0x0002

thus the full binary instruction is

               SET
  0x0002*      0x1
  ------      ----
0b1000100000010001
        ------
          0x01
             B

* = Take care! Literal values between 0x00-0x1f (0-31) need to be offset and are thus represented with
    values between 0x20-0x3f (32-63). Why? Because the values 0x00-0x1f already represent other
    stuff, e.g. 0x02 is register C - if you use this value, the CPU cannot distinguish if you mean
    "SET B, C" or rather "SET B, 0x0002"
    Thus, the literal values that would collide are offset by 32, and the CPU calculates them down
    to their real literal value

We can read each part by shifting the values from
the right using >>, like this:

instruction >> 4  == 100010000001 (only the leftmost 12 bits)
instruction >> 10 == 100010       (only the leftmost 6 bits)

and applying a bit filter like this:
(instruction >> 4) & parseInt('111111', 2)

This applies 000000111111 to
             100010000001 and leaves
             000000000001, giving us the value of bits 6-12 (in this case, the register id)

The shift is not needed for the lower (rightmost) bits, a filter is sufficent

instruction & parseInt('1111', 2)

applies 0000000000001111 to
        1000100000010001 and leaves
        0000000000000001 == 0x1 == opcode for SET

What if we want to set e.g. register B to a value larger than 31? 31 plus the literal value offset
explained above results in hex 0x3f, which is 0b111111, thus all 6 bits are used up.

In this case, our instruction grows from 1 to 2 words: The first 6 bits of the first word are set to
0x1f (= 0b011111), which means "the literal value is not here, it's in the next word". The literal value,
without any offset, is then on the second word.

Example:

SET B, 40 ("Set register B to decimal 40")

results in two words:

   next word
    literal       SET
     ------      ----
1: 0b0111110000010001
           ------
          register B

2: 0b0000000000101000
               ------
                 0x28

Another case is when the target is a number larger than 0x3f? Again, the value is actually in the next word:

 SET [0x2000], 4

 results in

          next word
           address
           ------
1: 0b1001000111100001
     ------      ----
      36            SET

2: 0b10000000000000
     --------------
    [0x2000] == 8192

(remember, it's 36 because of the 0x20 offset (4+32))

Some arithmetic operation will result in values that are larger than 65535 (0xffff), that is,
they do not fit into a word. These values need to be '& 0xffff' in order to avoid overflow.
Register O takes care of the overflow.

*/

define([], function() {

  var Cpu = function(memory, callbacks) {
    this.memory = memory;
    this.callbacks = callbacks;
    this.stepNumber = 0;

    this.pcWasSetByInstruction = false;
    this.skipNext = false;

    this.opcodes = {};
    this.opcodes['NONBASIC'] = 0x0;
    this.opcodes['SET'] = 0x1;
    this.opcodes['ADD'] = 0x2;
    this.opcodes['SUB'] = 0x3;
    this.opcodes['MUL'] = 0x4;
    this.opcodes['DIV'] = 0x5;
    this.opcodes['MOD'] = 0x6;
    this.opcodes['SHL'] = 0x7;
    this.opcodes['SHR'] = 0x8;
    this.opcodes['AND'] = 0x9;
    this.opcodes['BOR'] = 0xa;
    this.opcodes['XOR'] = 0xb;
    this.opcodes['IFE'] = 0xc;
    this.opcodes['IFN'] = 0xd;
    this.opcodes['IFG'] = 0xe;
    this.opcodes['IFB'] = 0xf;

    this.nbopcodes = {};
    this.nbopcodes['reserved'] = 0x00;
    this.nbopcodes['JSR'] = 0x01;

    this.registerNames = [];
    this.registerNames[0x00] = 'A';
    this.registerNames[0x01] = 'B';
    this.registerNames[0x02] = 'C';
    this.registerNames[0x03] = 'X';
    this.registerNames[0x04] = 'Y';
    this.registerNames[0x05] = 'Z';
    this.registerNames[0x06] = 'I';
    this.registerNames[0x07] = 'J';
    this.registerNames[0x18] = 'POP';
    this.registerNames[0x19] = 'PEEK';
    this.registerNames[0x1a] = 'PUSH';
    this.registerNames[0x1b] = 'SP';
    this.registerNames[0x1c] = 'PC';
    this.registerNames[0x1d] = 'O';

    this.registers = [];
    this.registers[0x00] = 0x0;
    this.registers[0x01] = 0x0;
    this.registers[0x02] = 0x0;
    this.registers[0x03] = 0x0;
    this.registers[0x04] = 0x0;
    this.registers[0x05] = 0x0;
    this.registers[0x06] = 0x0;
    this.registers[0x07] = 0x0;
    this.registers[0x18] = 0x0;
    this.registers[0x19] = 0x0;
    this.registers[0x1a] = 0x0;
    this.registers[0x1b] = 0x0;
    this.registers[0x1c] = 0x0;
    this.registers[0x1d] = 0x0;

    this.runloop = null;
  }

  Cpu.prototype.isRegister = function(value) {
    return ((value >= 0x00 && value <= 0x07) || value === 0x1c);
  };

  Cpu.prototype.isAddressPointerInRegister = function(value) {
    return (value >= 0x08 && value <= 0x0f);
  };

  Cpu.prototype.isNextWordPlusRegister = function(value) {
    return (value >= 0x10 && value <= 0x17);
  };

  Cpu.prototype.isStackOperation = function(value) {
    return (value >= 0x18 && value <= 0x1a);
  };

  Cpu.prototype.isSmallLiteral = function(value) {
    return (value >= 0x20 && value <= 0x3f);
  };

  Cpu.prototype.pointsToNextWordLiteral = function(value) {
    return (value === 0x1f);
  };

  Cpu.prototype.pointsToNextWordAddress = function(value) {
    return (value === 0x1e);
  };

  Cpu.prototype.correctOffset = function(value) {
    return value - 0x20;
  };

  Cpu.prototype.resolve = function(data) {
    var resolved = {
      originalValue: data,
      address: data,
      value: data,
      increasesInstructionLength: false
    };
    if (this.isRegister(data)) {
      resolved.value = this.registers[data];
      return resolved;
    }
    if (this.isAddressPointerInRegister(data)) {
      resolved.address = this.registers[data - 0x08];
      resolved.value = this.memory.read(resolved.address);
      return resolved;
    }
    if (this.isNextWordPlusRegister(data)) {
      resolved.address = this.memory.read(this.registers[0x1c] + this.currentInstructionLength) + this.registers[data - 0x10];
      resolved.value = this.memory.read(resolved.address);
      resolved.increasesInstructionLength = true;
      return resolved;
    }
    if (this.isStackOperation(data)) {
      if (data === 0x18) { // POP [SP++]
        resolved.address = this.registers[0x1b];
        resolved.value = this.memory.read(resolved.address);
        return resolved;
      }
      if (data === 0x19) { // PEEK [SP]
        resolved.address = this.registers[0x1b];
        resolved.value = this.memory.read(resolved.address);
        return resolved;
      }
      if (data === 0x1a) { // PUSH [--SP]
        if (this.registers[0x1b] - 1 < 0x0000) {
          resolved.address = (0xffff + 1) + (this.registers[0x1b] - 1);
        } else {
          resolved.address = this.registers[0x1b] - 1;
        }
        resolved.value = this.memory.read(resolved.address);
        return resolved;
      }
    }
    if (this.pointsToNextWordAddress(data)) {
      resolved.address = this.memory.read(this.registers[0x1c] + this.currentInstructionLength);
      resolved.value = this.memory.read(resolved.address);
      resolved.increasesInstructionLength = true;
      return resolved;
    }
    if (this.pointsToNextWordLiteral(data)) {
      resolved.address = null;
      resolved.value = this.memory.read(this.registers[0x1c] + this.currentInstructionLength);
      resolved.increasesInstructionLength = true;
      return resolved;
    }
    if (this.isSmallLiteral(data)) {
      resolved.address = null;
      resolved.value = this.correctOffset(data);
      return resolved;
    }
    console.log('Should this be reached?' + data);
    return resolved;
  };

  Cpu.prototype.operateStack = function(operation) {
    if (operation === 0x18) { // POP [SP++]
      if (this.registers[0x1b] + 1 > 0xffff) {
        this.registers[0x1b] = (this.registers[0x1b] + 1) - (0xffff + 1);
      } else {
        this.registers[0x1b]++;
      }
      return;
    }
    if (operation === 0x1a) { // PUSH [--SP]
      if (this.registers[0x1b] - 1 < 0x0000) {
        this.registers[0x1b] = (0xffff + 1) + (this.registers[0x1b] - 1);
      } else {
        this.registers[0x1b]--;
      }
      return;
    }
  }

  Cpu.prototype.write = function(target, value) {
    if (this.isRegister(target)) {
      this.registers[target] = value;
      if (target === 0x1c) {
        this.pcWasSetByInstruction = true;
      }
    } else {
      this.memory.write(target, value);
    }
  };

  Cpu.prototype.stop = function() {
    clearInterval(this.runloop);
  };

  Cpu.prototype.run = function() {
    this.stop();
    this.cycleFinished = true;
    var cpu = this;
    this.runloop = setInterval(function() {
      if (cpu.cycleFinished) {
        cpu.cycleFinished = false;
        for (var i = 0; i < 1000; i++) {
          cpu.step();
        }
        cpu.cycleFinished = true;
      }
    }, 10);
  };

  Cpu.prototype.step = function() {
    var instruction;

    this.pcWasSetByInstruction = false;
    this.currentInstructionLength = 1;

    instruction = this.memory.read(this.registers[0x1c]);

    if ((instruction & parseInt('1111', 2)) === this.opcodes['NONBASIC']) {
      this.handleNonbasicInstruction(instruction);
    } else {
      this.handleBasicInstruction(instruction);
    }

    if (!this.pcWasSetByInstruction) {
      this.write(0x1c, this.registers[0x1c] + this.currentInstructionLength);
    }

    this.stepNumber++;
    this.callbacks.step();
  };

  Cpu.prototype.handleBasicInstruction = function(instruction) {
    var opcode, target, source;

    opcode = instruction & parseInt('1111', 2);
    target = this.resolve((instruction >> 4) & parseInt('111111', 2));
    this.currentInstructionLength += target.increasesInstructionLength;
    source = this.resolve((instruction >> 10) & parseInt('111111', 2));
    this.currentInstructionLength += source.increasesInstructionLength;
    if (!this.skipNext) {
      this.executeBasicInstruction(opcode, target, source);
    } else {
      this.skipNext = false;
    }
  };

  Cpu.prototype.handleNonbasicInstruction = function(instruction) {
    var opcode, source;

    opcode = (instruction >> 4) & parseInt('111111', 2);
    source = this.resolve((instruction >> 10) & parseInt('111111', 2));
    this.currentInstructionLength += source.increasesInstructionLength;
    if (!this.skipNext) {
      this.executeNonbasicInstruction(opcode, source);
    } else {
      this.skipNext = false;
    }
  };

  Cpu.prototype.executeBasicInstruction = function(opcode, target, source) {
    if (this.isStackOperation(target.originalValue)) {
      this.operateStack(target.originalValue);
    }
    if (this.isStackOperation(source.originalValue)) {
      this.operateStack(source.originalValue);
    }

    switch(opcode) {
      case this.opcodes['SET']:
        this.write(target.address, source.value);
        break;

      case this.opcodes['ADD']:
        if (target.value + source.value > 0xffff) {
          this.registers[0x1d] = 0x0001;
          this.write(target.address, (target.value + source.value) - (0xffff + 1));
        } else {
          this.write(target.address, target.value + source.value);
        }
        break;

      case this.opcodes['SUB']:
        if (target.value - source.value < 0) {
          this.registers[0x1d] = 0xffff;
          this.write(target.address, (0xffff + 1) + (target.value - source.value));
        } else {
          this.write(target.address, target.value - source.value);
        }
        break;

      case this.opcodes['MUL']:
        this.write(target.address, (target.value * source.value) & 0xffff);
        this.registers[0x1d] = ((target.value * source.value) >> 16) & 0xffff;
        break;

      case this.opcodes['DIV']:
        if (source.value === 0) {
          this.write(target.address, 0);
          this.registers[0x1d] = 0;
        } else {
          this.write(target.address, Math.floor(target.value / source.value));
          this.registers[0x1d] = ((target.value << 16) / source.value) & 0xffff;
        }
        break;

      case this.opcodes['MOD']:
        if (source.value === 0) {
          this.write(target.address, 0);
        } else {
          this.write(target.address, target.value % source.value);
        }
        break;

      case this.opcodes['SHL']:
        this.write(target.address, (target.value << source.value) & 0xffff);
        this.registers[0x1d] = (((target.value << source.value) >> 16) & 0xffff);
        break;

      case this.opcodes['SHR']:
        this.write(target.address, (target.value >> source.value) & 0xffff);
        this.registers[0x1d] = (((target.value << 16) >> source.value) & 0xffff);
        break;

      case this.opcodes['AND']:
        this.write(target.address, target.value & source.value);
        break;

      case this.opcodes['BOR']:
        this.write(target.address, target.value | source.value);
        break;

      case this.opcodes['XOR']:
        this.write(target.address, target.value ^ source.value);
        break;

      case this.opcodes['IFE']:
        if (target.value !== source.value) {
          this.skipNext = true;
        }
        break;

      case this.opcodes['IFN']:
        if (target.value === source.value) {
          this.skipNext = true;
        }
        break;

      case this.opcodes['IFG']:
        if (target.value <= source.value) {
          this.skipNext = true;
        }
        break;

      case this.opcodes['IFB']:
        if ((target.value & source.value) === 0) {
          this.skipNext = true;
        }
        break;
    }
  };

  Cpu.prototype.executeNonbasicInstruction = function(opcode, source) {
    if (this.isStackOperation(source)) {
      this.operateStack(source);
    }
    switch (opcode) {
      case this.nbopcodes['JSR']:
        this.operateStack(0x1a); // resolve PUSH in order to change SP correctly
        this.write(this.registers[0x1b], this.registers[0x1c] + this.currentInstructionLength);
        this.write(0x1c, source.value);
        break;
    }
  };

  return Cpu;

});
