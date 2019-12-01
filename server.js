/**
 *
 *
 */


const net = require('net');
const client = require('./client');


net.createServer(function(socket) {
	new client(socket);
}).listen(0x50C4); // sock in hex