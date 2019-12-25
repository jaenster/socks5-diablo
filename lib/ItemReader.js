/** @type {BitReader} */
const BitReader = require('./BitReader');
const {changeEndianness} = require('./Util');
const {ItemFlags, ItemContainer, EquipmentLocation, ItemActionType, ItemType, ItemQuality, ItemDestination, ItemCategory} = require('./Enums');
const {BaseItem} = require('./BaseItem');


/**
 * @param buffer
 */
function itemParser(buffer) {
	const br = new BitReader(buffer), item = {raw: buffer};
	br.pos = 8; // The first byte is the packet identifyer
	Object.defineProperties(this, {
		bit: {get: () => br.bit()},
		bits: {get: () => bits => br.bit(bits)},
		byte: {get: () => br.bit(8)}, // 8
		word: {get: () => br.readUInt16LE()}, // 16
		dword: {get: () => br.readUInt32LE()}, // 32
		string: {get: () => (...args) => br.readString.apply(br,args)},
		boolean: {get: () => !!br.bit()},
	});
	function readUInt16LE(offset = 0) {
		validateNumber(offset, 'offset');
		const first = this[offset];
		const last = this[offset + 1];
		if (first === undefined || last === undefined)
			boundsError(offset, this.length - 2);

		return first + last * 2 ** 8;
	}

	item.action = this.byte;
	item.packetLength = this.byte;
	item.category = this.byte;
	item.uid = this.dword;

	if (buffer[0] === 0x9d) {
		item.ownerType = this.byte;
		item.ownerUID = this.dword;
	} else {
		item.ownerType = 6; // invalid y
		item.ownerUID = 0;
	}
	const flags = this.dword;
    item.flags = {
            None: (flags & ItemFlags.None) === ItemFlags.None,
            Equipped: (flags & ItemFlags.Equipped) === ItemFlags.Equipped,
            InSocket: (flags & ItemFlags.InSocket) === ItemFlags.InSocket,
            Identified: (flags & ItemFlags.Identified) === ItemFlags.Identified,
            x20: (flags & ItemFlags.x20) === ItemFlags.x20,
            SwitchedIn: (flags & ItemFlags.SwitchedIn) === ItemFlags.SwitchedIn,
            SwitchedOut: (flags & ItemFlags.SwitchedOut) === ItemFlags.SwitchedOut,
            Broken: (flags & ItemFlags.Broken) === ItemFlags.Broken,
            Duplicate: (flags & ItemFlags.Duplicate) === ItemFlags.Duplicate,
            Socketed: (flags & ItemFlags.Socketed) === ItemFlags.Socketed,
            OnPet: (flags & ItemFlags.OnPet) === ItemFlags.OnPet,
            x2000: (flags & ItemFlags.x2000) === ItemFlags.x2000,
            NotInSocket: (flags & ItemFlags.NotInSocket) === ItemFlags.NotInSocket,
            Ear: (flags & ItemFlags.Ear) === ItemFlags.Ear,
            StartItem: (flags & ItemFlags.StartItem) === ItemFlags.StartItem,
            Compact: (flags & ItemFlags.Compact) === ItemFlags.Compact,
            Ethereal: (flags & ItemFlags.Ethereal) === ItemFlags.Ethereal,
            Any: (flags & ItemFlags.Any) === ItemFlags.Any,
            Personalized: (flags & ItemFlags.Personalized) === ItemFlags.Personalized,
            Gamble: (flags & ItemFlags.Gamble) === ItemFlags.Gamble,
            Runeword: (flags & ItemFlags.Runeword) === ItemFlags.Runeword,
            x8000000: (flags & ItemFlags.x8000000) === ItemFlags.x8000000,
        };
	item.flags.valueOf = () => flags;
	item.version = this.byte;

	item.unknown1 = this.bits(2);
	item.destination = this.bits(3);

	/////////////////////////////
	// Location of an item
	////////////////////////////
	if (item.destination === ItemDestination.Ground) {
		item.x = this.word;
		item.y = this.word;
	} else {
		item.location = this.bits(4);
		item.x = this.bits(4);
		item.y = this.bits(3);
		item.container = this.bits(4);
	}

	if (item.action === ItemActionType.AddToShop || item.action === ItemActionType.RemoveFromShop) {
		let buff = item.container | 0x80;
		if ((buff & 1) === 1) {
			buff--;
			item.y += 8;
		}
		item.container = buff;
	} else if (item.container === ItemContainer.Unspecified) {
		if (item.location === EquipmentLocation.NotApplicable) {
			if ((flags & ItemFlags.InSocket) === ItemFlags.InSocket) {
				item.container = ItemContainer.Item;
				item.y = -1;
			} else if (item.action === ItemActionType.PutInBelt || item.action === ItemActionType.RemoveFromBelt) {
				item.container = ItemContainer.Belt;
				item.y = item.x / 4;
				item.x = item.x % 4;
			}
		} else {
			item.x = -1;
			item.y = -1;
		}
	}

	/////////////////////////////
	// Generic types
	////////////////////////////

	if ((flags & ItemType.Ear) === ItemType.Ear) {
		item.charClass = this.bits(3);
		item.level = this.bits(7);
		item.name = this.string();

		item.baseItem = BaseItem.get(ItemType.Ear);
		return item;
	}


    item.baseItem = BaseItem.getByID(item.category, item.baseItemId = this.dword);
    item.stats = {};

	// Big Pile : 1 bits
	// Quantity : Big Pile ? 32 bits : 12 bits
	if (item.baseItem.type === ItemType.Gold) {
		item.stats.push({
			Quantity: this.readBits(this.bit ? 32 : 12),
		});
		return item;
	}

	// Used Sockets : 3 bits
	item.usedSockets = this.bits(3);

	// Ends here if SimpleItem or Gamble
	if ((flags & (ItemFlags.Compact | ItemFlags.Gamble)) !== 0)
		return item;

	// ILevel : 7
	item.level = this.bits(7);

	// Quality : 4
	item.quality = this.bits(4);

	// Graphic : 1 : 3+1
	if (this.boolean) item.graphic = this.bits(3);

	// Color : 1 : 11+1
	if (this.boolean) item.color = this.bits(11);

	// Identified?
	// Quality specific information
	if ((flags & ItemFlags.Identified) === ItemFlags.Identified) {
		switch (item.quality) {
			case ItemQuality.Inferior:
				item.prefix = this.bits(3);
				break;

			case ItemQuality.Superior:
				item.prefix = 0;
				item.superiorType = this.bits(3);
				break;

			case ItemQuality.Magic:
				item.prefix = this.bits(11);
				item.suffix = this.bits(11);
				break;

			case ItemQuality.Rare:
			case ItemQuality.Crafted:
				item.prefix = this.bits(8);
				item.suffix = this.bits(8);
				break;

			case ItemQuality.Set:
				item.setItem = this.bits(12);
				break;

			case ItemQuality.Unique:
				//if (!["std", "hdm", "te1", "te2", "te3", "te4"].includes(item.baseItem.code)) {
				item.uniqueItem = this.bits(12);
				//}
				break;
		}
	}
	item.magicPrefixes = [];
	item.magicSuffixes = [];

	if (item.quality === ItemQuality.Rare || item.quality === ItemQuality.Crafted) {
		for (let i = 0; i < 3; i++) {
			if (this.boolean) {
				item.magicPrefixes.push(this.bits(11));
			}
			if (this.boolean) {
				item.magicSuffixes.push(this.bits(11));
			}
		}
	}

	// Runeword Info : 16
	if ((flags & ItemFlags.Runeword) === ItemFlags.Runeword) {
		//HACK: this is probably very wrong, but works for all the runewords I tested so far...
		//TODO: remove these fields once testing is done
		item.runewordID = this.bits(12);
		item.runewordParam = this.bits(4);

		let val = -1;
		if (item.runewordParam === 5) //TODO: Test cases where ID is around 100...
		{
			val = item.runewordID - item.runewordParam * 5;
			if (val < 100) val--;
		} else if (item.runewordParam === 2) //TODO: Test other runewords than Delirium...
		{
			val = ((item.runewordID & 0x3FF) >> 5) + 2;
		}

		//TODO: Test other runewords, find real shift / add params...
		br.byteOffset -= 2;
		item.runewordParam = this.word;
		item.runewordID = val;
		item.runeword = val;
	}

	// Personalized Name : 7 * (NULLSTRING Length)
	if ((flags & ItemFlags.Personalized) === ItemFlags.Personalized)
		item.name = this.string();

	return item;
}


module.exports = itemParser;

/*
 {"action":6,"packetLength":50,"category":1,"uid":354823774,"ownerType":0,"ownerUID":3999140846,"flags":{"None":true,"Equipped":true,"InSocket":false,"Identified":true,"x20":false,"SwitchedIn":false,"SwitchedOut":false,"Broken":false,"Duplicate":false,"Socketed":true,"OnPet":false,"x2000":false,"NotInSocket":false,"Ear":false,"StartItem":false,"Compact":false,"Ethereal":false,"Any":true,"Personalized":false,"Gamble":false,"Runeword":true,"x8000000":true},"unknown1":1,"destination":4,"location":10,"x":-1,"y":-1,"container":0,"baseItemId":1618019685,"baseItem":{},"stats":{},"usedSockets":3,"level":12,"quality":10,"graphic":2,"color":1536,"magicPrefixes":[],"magicSuffixes":[],"runewordID":-1,"runewordParam":12408,"runeword":-1}
server->5.42.181.40:4000

0000	9d 06 32 01 5e 2e 26 15    00 ee 0b 5e ee 11 08 80     ..2.^.&.    ...^....
0010	0c 65 64 06 50 57 16 06    32 ab 80 03 05 1e 0c 0c     .ed.PW..    2.......
0020	f3 ff 43 c4 ac 38 c0 04    c3 d8 08 fe 88 9b 01 0f     ..C..8..    ........
0030	f9 0f
 */