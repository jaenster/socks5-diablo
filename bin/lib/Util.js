
const changeEndianness = (int, size) => {
    const tmpbuff = Buffer.alloc(size);

    try {
        if (int < 0) {
            // Write it down as BE
            tmpbuff['writeInt' + (size * 8) + 'LE'](int);
        } else {
            // Write it down as BE
            tmpbuff['writeUInt' + (size * 8) + 'LE'](int);
        }


        // Read it as little endian
        return tmpbuff['readUInt' + (size * 8) + 'BE']();
    } catch(e) {
        console.log(e);
    }
};

module.exports.changeEndianness = changeEndianness;
