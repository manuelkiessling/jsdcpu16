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
    cpu.registers.forEach(function(registerValue, registerNumber) {
      text += cpu.registerNames[registerNumber] + ': ' + utility.pad(registerValue.toString(16), 4) + ' (0b' + utility.pad(registerValue.toString(2), 16) + ', d' + registerValue.toString(10) + ')' + '\n';
    });
    $("#registervalues").html(text);

    text = '';
    var memoryBlockWritten = false;
    for (var j = 0; j < numberOfWords / 8; j = j + 8) {
      for (var i = 0; i < 8; i++) {
        if (writtenMemoryBlocks[j + i] > 0) {
          memoryBlockWritten = true;
        }
      }
      if (memoryBlockWritten) {
        text += '<b>' + utility.pad(j.toString(16), 4) + ': </b>';
        for (var i = 0; i < 8; i++) {
          if (cpu.registers[0x1c] === (j + i)) {
            text += '<span class="currentinstruction">';
          }
          if (memory.read(j + i) > 0) {
            text += '<b title="' + '0b' + utility.pad(memory.read(j + i).toString(2), 16) + ', d' + memory.read(j + i).toString(10) + '">';
          }
          text += utility.pad(memory.read(j + i).toString(16), 4);
          if (memory.read(j + i) > 0) {
            text += '</b>';
          }
          if (cpu.registers[0x1c] === (j + i)) {
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

  $('#reset').click(function() {
    memory.reset();
    writtenMemoryBlocks = [];
    $("#registervalues").html('');
    $("#memoryvalues").html('');
    load(memory, getInstructions($('#hexinstructions')));
    cpu = new Cpu(memory, {
      step: handleCpuStep
    });
  });

  $('#step').click(function() {
    cpu.step();
  });

  $('#run').click(function() {
    cpu.run();
  });

});
