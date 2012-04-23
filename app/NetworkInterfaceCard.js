"use strict";

/* Incoming data must be written ring-buffer style between 0x6000 and 0x607f (128 words)
   Every second word is the hubId of the sender, every other word is the data:

   0x6000: 0x0003 0x000a 0x0000 0x0000 0x0000 0x0000 0x0000 0x0000

   -> Hub client #3 sent data '10'

*/

/* Data between 0x6080 and 0x60ff (128 words) is send outgoing and zero'ed when written

   Every second word is the hubId of the receiver, every other word is the data:

   0x6080: 0x000e 0x0003

   -> Send '3' to Hub client #14

*/

define(['http://localhost:8080/socket.io/socket.io.js'], function() {

  var increaseIndex = function(index) {
    index = index + 2;
    if (index > 127) {
      index = 0;
    }
    return index;
  };

  var NetworkInterfaceCard = function(hubId, memory) {
    if (hubId > 0xffff) {
      console.log('hubId ' + hubId + ' is out of range');
      return;
    }
    this.hubId = hubId;
    this.memory = memory;
    this.socket = io.connect('http://localhost:8080/');
    this.index = 0;
    this.registered = false;

    var that = this;
    this.socket.emit('register', hubId, function(success) {
      that.registered = success;
      if (success) {
        console.log('Registered at network hub with id '+ hubId);
      } else {
        console.log('Could not register with '+ hubId);
      }
    });

    this.socket.on('fromHub', function (packet) {
      if (packet.senderHubId > 0xffff || packet.senderHubId <= 0) {
        console.log('senderHubId ' + packet.senderHubId + ' is out of range');
        return;
      }
      if (packet.data > 0xffff || packet.data < 0) {
        console.log('data ' + packet.data + ' is out of range');
        return;
      }
      that.memory.write(0x6000 + that.index, packet.senderHubId);
      that.memory.write(0x6000 + that.index + 1, packet.data);
      that.index = increaseIndex(that.index);
      console.log('Received ' + packet.data + ' from ' + packet.senderHubId + ', wrote data to 0x' + (0x6000 + that.index + 1).toString(16));
    });
  };

  NetworkInterfaceCard.prototype.handleOutgoing = function(address) {
    if (!this.registered) {
      console.log('Not yet registered, not sending');
      return;
    }
    if (address % 2 === 1) { // data field was written, and it wasn't nulled
      var receiverHubId = this.memory.read(address - 1); // receiver hub id is in the previous word
      if (receiverHubId === 0) {
        return; // We probably just wrote 0 here ourselves
      }
      var data = this.memory.read(address);
      console.log('Sending ' + data + ' to hub id #' + receiverHubId);
      this.socket.emit('toHub', {
        receiverHubId: receiverHubId,
        data: data
      });
      this.memory.write(address - 1, 0);
      this.memory.write(address, 0);
    }
  }

  return NetworkInterfaceCard;

});
