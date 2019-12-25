/**
 * String based bit data extractor
 *
 * I ended up using a binary string because:
 *   It's simpler
 *   It's more accurate
 *   We're probably parsing an item or two at a time, so it won't use much memory.
 *
 * Can read from:
 *   ArrayBuffers
 *   TypedArrays (like Uint8Array, etc)
 *   Regular arrays if the data is uint8
 *   A big endian binary string
 *
 *   @author Nishimura-Katsuo
 */

class BitReader {
	reset(pos = 0) {
		this.pos = pos;
	}

	assign(data) {
		if (data instanceof this.constructor) {
			data = data.data.slice();
		}

		if (data.buffer) {
			data = data.buffer;
		}

		if (data instanceof ArrayBuffer) {
			data = Array.from(new Uint8Array(data));
		}

		if (Array.isArray(data)) {
			data = data.map(v => v.toString(2).padStart(8, '0')).reverse().join('');
		}

		if (typeof data === 'string') {
			this.data = data;
			this.reset();
		} else {
			throw new Error("I don't know how to read this data!");
		}
	}

	bit(length = 1) {
		let start = this.data.length - this.pos - length, end = this.data.length - this.pos;
		this.pos += length;
		return parseInt(this.data.slice(start, end), 2) | 0;
	}

	bitAt(pos, length) {
		this.reset(pos);
		return this.bit(length);
	}

	constructor(data) {
		this.assign(data);
	}

	readString(size, charLength = 8, terminator = '\0') {
		// Convert terminator to its int value
		if (typeof terminator === 'string') terminator = terminator[0].charCodeAt(0);

		let ret = '';
		for (let i = 0, tmp; // Set values
			// Only continue if we dont exceed
			 i < size && (tmp = this.bit(charLength)) !== terminator;
			// add the tmp value to the return value
			 i++, ret += String.fromCharCode(tmp)
		) ;

		return ret;
	}

	static from(data) {
		return new this(data);
	}
}
