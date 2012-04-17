"use strict";

define(['../lib/utility', '../lib/Memory', '../lib/Cpu'], function(utility, Memory, Cpu) {

  var cpu;
  var memory;
  var wordsize;
  var numberOfWords;

  var handleMemoryRead = function(address, value) {};

  var writtenMemoryBlocks = [];
  var handleMemoryWrite = function(address, value) {
    writtenMemoryBlocks[address] = value;
  };

  var handleCpuStep = function() {
    var text = '';
    var value;
    cpu.registers.forEach(function(registerValue, registerNumber) {
      text += cpu.registerNames[registerNumber] + ': ' + utility.pad(registerValue.toString(16), 4) + ' (0b' + utility.pad(registerValue.toString(2), 16) + ', d' + registerValue.toString(10) + ')' + '\n';
    });
    $("#registervalues").html(text);

    text = '';
    var memoryBlockWritten = false;
    for (var j = 0; j < numberOfWords / 8; j++) {
      for (var i = 0; i < 8; i++) {
        if (writtenMemoryBlocks[(j * 8) + i] > 0) {
          memoryBlockWritten = true;
        }
      }
      if (memoryBlockWritten) {
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
      memoryBlockWritten = false;
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
    var instructions = [];
    lines.forEach(function(line) {
      line = line.trim();
      instructions.push(parseInt(line, 16));
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
    memory.reset();
    writtenMemoryBlocks = [];
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

  reset();

});
