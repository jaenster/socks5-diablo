const serverPacketSizes = [
    1, // 1
    8,  // 2
    1,  //3
    12,  // 4
    1,  // 5
    1,  // 6
    1, // 7
    6, // 8
    6, // 9
    11, // 10
    6, // 11
    6, // 12
    9,  // 13
    13, //14
    12, // 15
    16, // 16
    16, // 17
    8, // 18
    26, // 19
    14, 18, 11, -1, -1, 15, 2, 2, 3, 5, 3, 4, 6, 10, 12, 12, 13, 90, 90, -1, 40, 103, 97, 15, -1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 34, 8, 13, -1, 6, -1, -1, 13, -1, 11, 11, -1, -1, -1, 16, 17, 7, 1, 15, 14, 42, 10, 3, -1, -1, 14, 7, 26, 40, -1, 5, 6, 38, 5, 7, 2, 7, 21, -1, 7, 7, 16, 21, 12, 12, 16, 16, 10, 1, 1, 1, 1, 1, 32, 10, 13, 6, 2, 21, 6, 13, 8, 6, 18, 5, 10, 4, 20, 29, -1, -1, -1, -1, -1, -1, 2, 6, 6, 11, 7, 10, 33, 13, 26, 6, 8, -1, 13, 9, 1, 7, 16, 17, 7, -1, -1, 7, 8, 10, 7, 8, 24, 3, 8, -1, 7, -1, 7, -1, 7, -1, -1, -1, 2, 1];

const ClientPacketSizes = [-1, 5, 9, 5, 9, 5, 9, 9, 5, 9, 9, 1, 5, 9, 9, 5, 9, 9, 1, 9, -1, -1, 13, 5, 17, 5, 9, 9, 3, 9, 9, 17, 13, 9, 5, 9, 5, 9, 13, 9, 9, 9, 9, -1, -1, 1, 3, 9, 9, 9, 17, 17, 5, 17, 9, 5, 13, 5, 3, 3, 9, 5, 5, 3, 1, 1, 1, 1, 17, 9, 13, 13, 1, 9, -1, 9, 5, 3, -1, 7, 9, 9, 5, 1, 1, -1, -1, -1, 3, 17, -1, -1, -1, 7, 6, 5, 1, 3, 5, 5, 9, 17, -1, -1, 37, 1, 1, 1, 1, 13, -1, 1];


/**
 *
 * @param {Buffer} bytes
 * @param size
 * @returns {number}
 */
const getPacketSizeServer = (bytes, size) => {
    const packetId = bytes[0];
    const inHex = packetId.toString(16);
    switch (packetId) {
        case 0x26: // Chat msg
            return getChatPacketSize(data, size);

        case 0x5b: // Player in game
            return bytes.readUInt16LE(1);

        case 0x94:
            if (size >= 2) {
                return bytes[1] * 3 + 6;
            }
            break;

        case 0xa8: // Set state
            if (size >= 7) {
                return bytes[6];
            }
            break;

        case 0xaa: // Add unit
            if (size >= 7) {
                return bytes[6];
            }
            break;

        case 0xac: // Assign NPC
            if (size >= 13) {
                return bytes[12];
            }
            break;

        case 0xae: // Warden request
            if (size >= 3) {
                return bytes.readUInt16LE(1) + 1;
            }
            break;
        case 0x3e: // 62 Item change
            return bytes[1];

        case 0x9c: // Item (in the world)
        case 0x9d: // Item (from unit)
            if (size >= 3) {
                return bytes[2];
            }
            break;
        case 0xBA: // Unknown
            return 1; // Best estimation so far
        case 0x17:
            return 12;
        case 0xFF:
            return 12;
        default:
            if (packetId < serverPacketSizes.length) {
                return serverPacketSizes[packetId];
            }
            break;
    }
    return -1;
};

const getChatPacketSize = (bytes, size) => {
    if (size >= 12) {
        // ToDo; make
    }

    return -1;
};
const {ServerToClient} = require('./Packets');
const readableChars = [];
const ItemReader = require('./ItemReader');

for (let i = 32; i < 128; i++) readableChars.push(i);
const serverSplice = (buffer) => {
    let offset = 0;
    const packets = [];

    while (true) {
        if (offset === buffer.length) { // Done parsing packets
            break;
        }
        const checkBuffer = Buffer.alloc(Math.min(buffer.length - offset, 255));
        for (let i = 0; i < Math.min(buffer.length - offset, 255); i++) checkBuffer.writeUInt8(buffer.readUInt8(i + offset), i);

        const size = getPacketSizeServer(checkBuffer, buffer.length - offset);
        if (size === -1 || buffer.length - offset - size < 0) {
            // Buffer to readable log
            const checkBuffer = Buffer.alloc(buffer.length - offset);
            for (let i = 0; i < buffer.length - offset; i++) checkBuffer.writeUInt8(buffer.readUInt8(i + offset), i);
            let arr = [];
            for (let i = 0; i < checkBuffer.length; i++) arr.push(checkBuffer.readUInt8(i));

            // Add leading zeroes
            arr = arr.map(byte => ('0' + byte.toString(16)).substr(-2));

            let print = 'server' + '->' +'\r\n', stripped, counter = 0;
            while (arr.length) {
                let bytes = arr.splice(0, stripped = arr.length < 16 && arr.length || 16), tmp = [0, 0];
                print += ('0000' + counter.toString(16)).substr(-4) + '\t';
                let tmpprint = [0, 0].map((x, i) => (tmp[i] = bytes.splice(0, 8)).join(' ')).join('    ');
                print += (tmpprint + ' '.repeat(50)).substr(0, 50)
                    + '     '
                    + (tmp.map(arr => arr.map(x => parseInt(x, 16)).map(x => readableChars.includes(x) && String.fromCharCode(x) || '.').join('')).join('    '))
                    + '\r\n';
                counter += stripped;
            }
            console.error('Mallformed packet -> \r\n' + print);
            require('fs').writeFileSync(__dirname+'\\..\\log\\errors.log','Mallformed packet -> \r\n' + print+'\r\n',{flag: 'a'});
            break;
        }


        const tmpbuff = Buffer.alloc(size);
        for (let i = 0; i < size; i++) tmpbuff.writeUInt8(buffer.readUInt8(i + offset), i);
        offset += size;

        let type;
        switch(tmpbuff[0]) {
            case 0x9C:
            case 0x9D:
                type = new ItemReader(tmpbuff);
                break;
            default:
                // Create the packets
                type = ServerToClient[tmpbuff[0]];
                type = type && type.hasOwnProperty('fromBuffer') ? type.fromBuffer(tmpbuff) : {PacketId: tmpbuff[0]};
                type.raw = tmpbuff;
                type.packetIdHex = type.PacketId.toString(16);
        }
        packets.push(type);
    }

    return packets;
};

const clientSplice = (buffer) => {

};


module.exports = {serverSplice, clientSplice};