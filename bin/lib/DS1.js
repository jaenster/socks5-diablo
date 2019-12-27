const fs = require('fs');
const Bitreader = require('./BitReader');
const {DT1, Sampler, Tile} = require('./DT1');

/**
 * @description Reads an DS1 file
 *
 * @author
 */
class DS1 {
	constructor(props) {


	}

	static fromFile(filename) {
		const {D2Objects: objs} = require('./BaseTables');
		const obj = {};
		const readCells = (cells) => {
			// Array has an length yet it is empty
			for (let id = 0; id < cells.length; id++) {
				if (!Array.isArray(cells[id])) cells[id] = [];
				['prop1', 'prop2', 'prop3', 'prop4'].map(prop => cells[id][prop] = br.byte);
			}
		}
		const readOrientations = (cells) => cells.map(cell => ['orientation'].map(prop => cell[prop] = br.byte));

		let bitReader = Bitreader.from(fs.readFileSync(__dirname + '\\..\\data\\tiles\\' + filename.replace(/\//g, '\\')));
		const br = Object.defineProperties({}, Bitreader.shortHandBr(bitReader));

		obj.version = br.dword;
		obj.width = br.dword;
		obj.height = br.dword;
		obj.act = 0;
		if (obj.version >= 8) obj.act = br.dword;
		if (obj.version >= 10) obj.tagType = br.dword;
		if (obj.version >= 3) {
			obj.dt1Files = [];
			obj.sampler = new Sampler();
			const count = br.dword;

			for (let i = 0; i < count; i++) obj.dt1Files.push(br.string(100, 8).toLowerCase());

			obj.dt1Files.forEach(file => {
				const dt1 = DT1.fromFile(file.replace(/\\d2\\data\\global/g, '').replace('tg1', 'dt1'));
				obj.sampler.add(dt1.titles)
			})
		}

		if (obj.version >= 9 && obj.version <= 13) br.pos += 8 * 8;

		{ // Read layers
			let wallLayerCount = 1;
			let floorLayerCount = 1;
			let shadowLayerCount = 1;
			let tagLayerCount = 0;
			if (obj.version >= 4) {
				wallLayerCount = br.dword;
				if (obj.version >= 16) floorLayerCount = br.dword;
			} else {
				tagLayerCount = 1
			}
			if (obj.tagType === 1 || obj.tagType === 2) {
				tagLayerCount = 1
			}
			obj.floors = new Array(floorLayerCount);
			for (let i = 0; i < floorLayerCount; ++i) obj.floors[i] = new Array(obj.width * obj.height);

			obj.walls = new Array(wallLayerCount);
			for (let i = 0; i < wallLayerCount; ++i) obj.walls[i] = new Array(obj.width * obj.height);

			if (obj.version < 4) {
				readCells(obj.walls[0]);
				readCells(obj.floors[0]);
				readOrientations(obj.walls[0]);
				bitReader.pos += (4 * obj.width * obj.height) * 8 * 2; // tag / shadow
			} else {
				for (let i = 0; i < wallLayerCount; i++) {
					readCells(obj.walls[i]);
					readOrientations(obj.walls[i])
				}
				for (let i = 0; i < floorLayerCount; i++) readCells(obj.floors[i]);

				if (shadowLayerCount !== 0) bitReader.pos += (4 * obj.width * obj.height) * 8; // shadow
				if (tagLayerCount !== 0) bitReader.pos += 4 * obj.width * obj.height // tag
			}
			for (let w = 0; w < wallLayerCount; w++) {
				const cells = obj.walls[w];
				let i = 0;
				for (let y = 0; y < obj.height; y++) {
					for (let x = 0; x < obj.width; x++, i++) {
						const cell = cells[i];
						if (cell === undefined || cell.prop1 === 0) continue;

						if (obj.version < 7) cell.orientation = [0x00, 0x01, 0x02, 0x01, 0x02, 0x03, 0x03, 0x05, 0x05, 0x06, 0x06, 0x07, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x14][cell.orientation];


						cell.mainIndex = (cell.prop3 >> 4) + ((cell.prop4 & 0x03) << 4);
						cell.subIndex = cell.prop2;
						cell.tileIndex = Tile.Index(cell.mainIndex, cell.subIndex, cell.orientation);

						cells[i] = cell
					}
				}
			}

			for (let f = 0; f < floorLayerCount; f++) {
				const cells = obj.floors[f];
				for (let i = 0; i < cells.Length; i++) {
					const cell = cells[i];

					if (cell.prop1 === 0) {
						continue
					}

					cell.mainIndex = (cell.prop3 >> 4) + ((cell.prop4 & 0x03) << 4);
					cell.subIndex = cell.prop2;
					cell.orientation = 0;
					cell.tileIndex = Tile.Index(cell.mainIndex, cell.subIndex, cell.orientation);

					cells[i] = cell
				}
			}
		}
		if (obj.version >= 2) {// Read objects
			const objectCount = br.dword;
			obj.objects = new Array(objectCount);

			for (let i = 0; i < objectCount; i++) {
				const info = {};
				const type = br.dword; // type
				const id = br.dword;
				info.x = br.dword;
				info.y = br.dword;

				if (obj.version > 5) {
					let flags = br.dword // flags
				}

				info.preset = {};
				info.preset = objs.find(el => el.Act === obj.act && el.Id === obj.id); /* && j['SizeX'].includes(info.x) && j['SizeY'].includes(info.y) */
				// console.log(info.preset)
				ds1.objects[i] = info
			}
		}
		{ // Read Groups
			const hasGroups = obj.version >= 12 && (obj.tagType === 1 || obj.tagType === 2);
			if (hasGroups) {
				if (obj.version >= 18) bitReader.pos += 4 * 8;

				const groupCount = br.dword;
				obj.groups = new Array(groupCount);

				for (let i = 0; i < groupCount; i++) {
					const group = {};
					group.x = br.dword;
					group.y = br.dword;
					group.width = br.dword;
					group.height = br.dword;
					if (obj.version >= 13) bitReader.pos += 4 * 8;
					obj.groups.push(group)
				}
			}
		}

		return obj;
	}
}

module.exports = DS1;