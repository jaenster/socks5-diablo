/**
 * @description Simply hook 2 clients against eachother
 *
 */

const fs = require('fs');

/** @param {string} dirPath
 * @param {string} relative
 */
const addDirectory = function (dirPath, relative) {
	const checkItem = item => {

		// Get stats of the file
		fs.stat(dirPath + '/' + item, (err, stats) => {
			if (!err) {
				if (stats.isDirectory()) {
					// If it is a directory, do this recursively
					return addDirectory(dirPath + '/' + item, relative + '/' + item);
				} else if (item.endsWith('.js')) {
					// if its just a file?
					loadPlugin('./' + relative + '/' + item);
				}
			}
		})
	};

	// get async a list of all files in the directory
	fs.readdir(dirPath, (err, items) => {
		// For all the files found in this directory
		items.forEach(checkItem);
	});
};

const loadPlugin = what => {
	require(what);
};

addDirectory(__dirname + '\\plugins', 'plugins');
const {serverSplice, clientSplice} = require('./lib/splicePacket');

class Client {
	/**
	 * @param {Socket} client
	 * @param {Socket} server
	 * @param ip
	 * @param port
	 */
	constructor(client, server, ip, port) {
		const dataHandler = (from, to, hooks, splicer) => buffer => {
		    // Need to predict better what kind of server is what.
			if (port === 4000) { // D2GS
				const spliced = splicer(buffer);
				spliced && spliced.forEach(packet => {
					if (!hooks.map(client => client.call(this, packet) === Client.BLOCK).some(_ => _)) {
						// block this packet (do something)
					}
				});
			} else if (port === 6112) { // Realm
			    // ToDo; something?
            }
			to.write(buffer);
		};

		client.on('data', dataHandler(client, server, Client.hooks.client, clientSplice));
		server.on('data', dataHandler(server, client, Client.hooks.server, serverSplice));

		this.ip = ip;
		this.port = port;
		this.scfile = __dirname + '\\log\\s-c-' + ip + '-' + port + '-' + Date.now() + '.log';
		this.csfile = __dirname + '\\log\\c-s-' + ip + '-' + port + '-' + Date.now() + '.log';
		this.initizialed = true;

		Client.instances.push(this);
	}

	static instances = [];
	static hooks = {
		client: [],
		server: [],
	};
	static BLOCK = Symbol('block');
}


module.exports = Client;