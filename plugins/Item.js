const DiabloClient = require('../DiabloClient');
const BufferHelper = require('../BufferHelper');

DiabloClient.hooks.client.push(/**@param {Buffer} buffer
 @param {DiabloClient} client*/function (buffer, client) {
 	const buffHelper = new BufferHelper(buffer);
	let offset = 0;
	// noinspection FallThroughInSwitchStatementJS
	switch (buffer.readUInt8(offset++)) {
		case 0x9D: // An item in the world

			// No Break;
		case 0x9C: // An item from me

	}
});