class BitReader {
	constructor(buffer) {
		this.buffer = buffer;
		this.bitoffset = 0;
	}

	readOneBit() {
		let offset = Math.floor(this.bitoffset / 8),
			shift = 7 - this.bitoffset % 8;
		this.bitoffset += 1;
		return (this.buffer[offset] >> shift) & 1;
	}

	readBits(n) {
		let i, value = 0;
		for (i = 0; i < n; i += 1) {
			value = value << 1 | this.readOneBit();
		}
		return value;
	}

	readMultipleBytes(size) {
		const buff = Buffer.alloc(size);
		for (let i = 0; i < size; i++) buff.writeUInt8(this.readBits(8),i)

        let ret =  buff['readUInt'+(size*8)+'LE'](0);
		return ret;
	}

	readNullString(bits = 7, t = '\0', max = 16) {
		let value = '';
		for (let i = 0; i < max; i++) {
			let orc = this.readBits(bits), chr = String.fromCharCode(orc);

			// Terminated?
			if (orc === 0 || chr === t) {
				break;
			}

			value += chr;
		}
		return value;

	}

	isEnd() {
		return Math.floor(this.bitoffset / 8) >= this.buffer.length;
	}

}

module.exports = BitReader;