"use strict";

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

*/

var Cpu = function(memory) {
  this.memory = memory;

  this.opcodes = {};
  this.opcodes['SET'] = 0x01;
  this.opcodes['ADD'] = 0x02;

  this.registerNames = [];
  this.registerNames[0x00] = 'A';
  this.registerNames[0x01] = 'B';
  this.registerNames[0x02] = 'C';
  this.registerNames[0x03] = 'X';
  this.registerNames[0x04] = 'Y';
  this.registerNames[0x05] = 'Z';
  this.registerNames[0x06] = 'I';
  this.registerNames[0x07] = 'J';

  this.registers = [];
  this.registers[0x00] = 0x0;
  this.registers[0x01] = 0x0;
  this.registers[0x02] = 0x0;
  this.registers[0x03] = 0x0;
  this.registers[0x04] = 0x0;
  this.registers[0x05] = 0x0;
  this.registers[0x06] = 0x0;
  this.registers[0x07] = 0x0;

  this.PC = 0x0000;

  this.running = false;
}

Cpu.prototype.run = function(cb) {
  this.running = true;
  while (this.running) {
    var instruction = this.memory[this.PC]; // read from current memory address (word block #)

    if (instruction === 0x0) {
      this.running = false;
    }

    var opcode = instruction & parseInt('1111', 2);

    switch(opcode) {
      case this.opcodes['SET']:
        var target = (instruction >> 4) & parseInt('111111', 2);
        var source = (instruction >> 10) & parseInt('111111', 2);

        if (target >= 0x00 && target <= 0x07) {
          if (source >= 0x00 && source <= 0x07) { // Register
            this.registers[target] = this.registers[source];
          }
          if (source >= 0x20 && source <= 0x3f) { // Literal dec 0-31
            this.registers[target] = source - 0x20; // substract literal offset
          }
          if (source === 0x1f) { // next word (literal)
            this.registers[target] = this.memory[++this.PC];
          }
        }
        this.PC++;
        break;
    }
    cb('step');
  }
};
