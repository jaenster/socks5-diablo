/**
 * @description The class that gets init once a new socket comes
 * @author Jaenster
 */

const enums = {
	NO_AUTH: 0x00,
	AUTH: 0x02,
};

const preferredAuthMethods = [enums.AUTH, enums.NO_AUTH];
const ProxyClient = require('./ProxyClient');

const BufferHelper = require('./BufferHelper');
const net = require('net');

class client {
	constructor(socket) {
		this.up = false;
		this.status = 0;
		this.socket = socket;

		let cb;
		socket.once('data', cb = data => {
			try {
				let size = 0;
				switch (this.status) {
					case 0: {
						const version = data.readUInt8(0);
						if (version !== 5) {
							// Throw error, unsupported version
							throw new Error('Unsupported version');
						}
						const typesSupported = data.readUInt8(1);

						// build suported types
						let auths = [];
						for (let i = 0; i < typesSupported; i++) auths.push(data.readUInt8(i + 2));

						// Filter out those we dont support. Currently hardcoded
						auths = auths.filter(type => type === enums.AUTH || type === enums.NO_AUTH);

						if (!auths.length) {
							// Throw error, unsupported
							throw new Error('Unsupported auth');
						}

						// The lowest of preferredAuthMethod's come first
						auths.sort((a, b) => preferredAuthMethods.indexOf(a) - preferredAuthMethods.indexOf(b));

						// What we want to auth with, comes first
						const auth = auths[0];

						const buffer = Buffer.alloc(2);
						buffer.writeUInt8(0x05, size++); // version
						buffer.writeUInt8(auth, size++); // Auth type

						// Send response
						// Reset is zero'd out
						this.socket.write(buffer);
						this.status++; // Next1
					}
						socket.once('data', cb);
						break;
					case 1: { // Waiting for username/password
						size = 0;
						let failed = 0x00; // didnt fail
						const type = data.readUInt8(size++);
						switch (type) {
							case 0x01: // password / username

								const usernameLength = data.readUInt8(size++); // ulength
								size += usernameLength;
								const passwordLength = data.readUInt8(size++); // ulength


								const uname = BufferHelper.getString(data, usernameLength, 2);
								const pass = BufferHelper.getString(data, passwordLength, size);

								// ToDo; some check for username/password
								// For now, we just accept
								failed = 0x00; // we didnt
								break;
							default:
								throw new Error('unsupported auth method');
						}
						const buffer = Buffer.alloc(2);
						buffer.writeUInt8(type, 0); // username/password response
						buffer.writeUInt8(failed, 1);

						// ToDo; if failed, close connection
						this.socket.write(buffer);
						this.status++;
						socket.once('data', cb);
					}
						break;
					case 2: { // receiving ip/port
						const command = data.readUInt8(++size);
						size += 2; // we dont care for the reverse byte
						const hostType = data.readUInt8(size++);

						let ipAddr;
						switch (hostType) {
							case 0x01: // ip address
								ipAddr = [size++, size++, size++, size++].map(offset => data.readUInt8(offset).toString()).join('.');
								break;
							case 0x03: // domain name
							case 0x04: // IPV6
						}
						if (!ipAddr) {
							throw new Error('Failed to get ip address');
						}

						const port = data.readUInt16BE(size);
						if (!port) {
							throw new Error('Failed to get port');
						}

						this.connect(ipAddr, port,data);
					}
				}
			} catch (e) {
				console.log(e.message);
				console.log(e.stack)
			}

		});

		client.instances.push(this);
	}

	connect(ipAddr,port,connectBuffer) {
		//ToDo; deal with failure's
		const remote = net.connect(port, ipAddr, () => {
			// Assuming always for now it is an success
			connectBuffer.writeUInt8(0x00,1); // Success code
			this.socket.write(connectBuffer);

			new ProxyClient(this.socket, remote)
		});
	}

	static instances = [];


}


module.exports = client;