"use strict";

define(['../lib/utility', '../lib/Memory', '../lib/Cpu', './console'], function(utility, Memory, Cpu, terminal) {

  var cpu;
  var memory;
  var wordsize;
  var numberOfWords;
  var accessedMemoryBlocks = [];

  var handleMemoryRead = function(address, value) {
    accessedMemoryBlocks[address] = value;
  };

  var handleMemoryWrite = function(address, value) {
    accessedMemoryBlocks[address] = value;
    if (address >= 0x8000 && address <= 0x8180) {
      terminal.draw($('#consoleoutput'), memory, 0x8000);
    }
  };

  var handleCpuStep = function() {
    var text = '';
    var value;
    cpu.registers.forEach(function(registerValue, registerNumber) {
      text += utility.fillString(cpu.registerNames[registerNumber] + ': ', 6, ' ') + utility.pad(registerValue.toString(16), 4) + ' (0b' + utility.pad(registerValue.toString(2), 16) + ', d' + registerValue.toString(10) + ')' + '\n';
    });
    $("#registervalues").html(text);

    text = '';
    var memoryBlockAccessed = false;
    for (var j = 0; j < numberOfWords / 8; j++) {
      for (var i = 0; i < 8; i++) {
        if (accessedMemoryBlocks[(j * 8) + i] !== undefined) {
          memoryBlockAccessed = true;
        }
      }
      if (memoryBlockAccessed) {
        text += '<b>' + utility.pad((j * 8).toString(16), 4) + ': </b>';
        for (var i = 0; i < 8; i++) {
          value = memory.read((j * 8) + i);
          if (cpu.registers[0x1c] === ((j * 8) + i)) {
            text += '<span class="currentinstruction">';
          }
          if (value > 0) {
            text += '<b title="' + '0b' + utility.pad(value.toString(2), 16) + ', d' + value.toString(10) + '">';
          }
          text += utility.pad(value.toString(16), 4);
          if (memory.read((j * 8) + i) > 0) {
            text += '</b>';
          }
          if (cpu.registers[0x1c] === ((j * 8) + i)) {
            text += '</span>';
          }
          text += ' ';
        }
        text += '\n';
      }
      memoryBlockAccessed = false;
    }
    $("#memoryvalues").html(text);
  };

  wordsize = 0xFFFF;
  numberOfWords = 0x10000;

  memory = new Memory(numberOfWords, wordsize, {
    read: handleMemoryRead,
    write: handleMemoryWrite
  });

  var getInstructions = function(element) {
    var text = element.val();
    var lines = text.split('\n');
    var instruction;
    var instructions = [];
    lines.forEach(function(line) {
      line = line.trim();
      instruction = line.substring(0, 6);
      instruction = instruction.toLowerCase();
      if (instruction.substring(2, 1) !== 'x') {
        instruction = instruction.substring(0, 4);
      }
      if (instruction !== '') {
        instructions.push(parseInt(line, 16));
      }
    });
    return instructions;
  };

  var load = function(memory, instructions) {
    var address = 0x0;
    instructions.forEach(function(instruction) {
      memory.write(address, instruction);
      address++;
    });
  };

  var reset = function() {
    if (cpu !== undefined) {
      cpu.stop();
    }
    memory.reset();
    terminal.draw($('#consoleoutput'), memory, 0x8000);
    accessedMemoryBlocks = [];
    $("#registervalues").html('');
    $("#memoryvalues").html('');
    load(memory, getInstructions($('#hexinstructions')));
    cpu = new Cpu(memory, {
      step: handleCpuStep
    });
    handleCpuStep();
  };

  $('#reset').click(function() {
    reset();
  });

  $('#step').click(function() {
    cpu.step();
  });

  $('#run').click(function() {
    cpu.run();
  });

  $('#stop').click(function() {
    if (cpu !== undefined) {
      cpu.stop();
    }
  });

  reset();

});
