const fs = require('fs');
const Bitreader = require('./BitReader');

class DT1 {
	static fromFile(file) {
		const model = new DT1();
		model.filename = file;
		const bitReader = Bitreader.from(fs.readFileSync(__dirname + '\\..\\data\\' + file.replace(/\//g, '\\')));
		const br = Object.defineProperties({}, Bitreader.shortHandBr(bitReader));
		model.version1 = br.dword;
		model.version2 = br.dword;
		if (model.version1 !== 7 || model.version2 !== 6) return model;

		bitReader.pos += 260 * 8;

		// Read titles
		const tileCount = br.dword;
		bitReader.pos += 4 * 8;

		model.titles = [];
		// Fill the array
		for (let i = 0; i < tileCount; i++) model.titles[i] = Tile.fromBuffer(bitReader, br);

		// model.titles
		// 	.filter(tile => tile.width+tile.height > 0)
		// 	.forEach(tile => {
		// 		if ((tile.orientation === 0 || tile.orientation === 15) && tile.height !== 0) tile.height = -79 // floor or roof
		//
		// 		br.pos = tile.blockHeaderPointer * 8;
		// 		for(let block = 0; block < tile.blockCount; block++) {
		//
		// 		}
		// 	})

	}
}

class Tile {
	static fromBuffer(bitReader, br) {
		const self = new this;
		self.direction = br.dword;
		self.roofHeight = br.word;
		self.soundIndex = br.byte;
		self.animated = br.byte;
		self.height = br.dword;
		self.width = br.dword;
		let zeros = br.dword; // zeros;
		self.orientation = br.dword;
		self.mainIndex = br.dword;
		self.subIndex = br.dword;
		self.rarity = br.dword;
		self.unknown = br.dword; // unknown;

		self.flags = bitReader.slice(25); // Left to Right, and Bottom to Up
		bitReader.slice(7); // unused
		bitReader.pos += 7 * 8;

		self.blockHeaderPointer = br.dword;
		self.blockDatasLength = br.dword;
		self.blockCount = br.dword;
		bitReader.pos += 12 * 8;
		self.index = Tile.Index(self.mainIndex, self.subIndex, self.orientation)
		return this;
	}

	static Index(mainIndex, subIndex, orientation) {
		return (((mainIndex << 6) + subIndex) << 5) + orientation
	}
}

class Sampler {
	constructor() {

	}

	add() {

	}
}


module.exports.Sampler = Sampler;
module.exports.DT1 = DT1;
module.exports.Tile = Tile;
