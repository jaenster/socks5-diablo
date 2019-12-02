/**
 * @description Just a wrapper around createServer with some settings
 * @author Jaenster
 */


const net = require('net');
const client = require('./client');

const {users = [], options = {allowNoAuth: false, listen: 0x50C4}} = require('./config.js');
net.createServer(socket => new client(socket, {users, options})).listen(options.listen); // sock in hex