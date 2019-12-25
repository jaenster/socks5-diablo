/** @type {BitReader} */
const BitReader = require('./BitReader');
const {changeEndianness} = require('./Util');
const {ItemFlags, ItemContainer, EquipmentLocation, ItemActionType, ItemType, ItemQuality, ItemDestination, ItemCategory, ItemAffixType, ItemNames, MagicSuffixType, MagicPrefixType, StatType} = require('./Enums');
const {BaseItem, BaseStat} = require('./BaseTables');
const {ReanimateStat, ElementalSkillsBonusStat, ClassSkillsBonusStat, AuraStat, SkillBonusStat, ChargedSkillStat, SkillOnEventStat, SkillTabBonusStat, PerLevelStat, DamageRangeStat, ColdDamageStat, PoisonDamageStat, ReplenishStat, SignedStat, UnsignedStat,} = require('./StatTypes');

/**
 *
 * @param br
 * @param item
 * @returns {null|*}
 */
function readStat(br, item) {
	let self = {};
	Object.defineProperties(self, shortHandBr(br));
	let statID = self.bits(9);
	if (statID === 0x1FF) {
		return null;
	}
	let baseStat = BaseStat.get(statID);
	if (!baseStat) {
		return null;
	}
	const pushStat = (what) => (typeof item.stats[baseStat.Stat] === "undefined" && (item.stats[baseStat.Stat] = [what]) || item.stats[baseStat.Stat].push(what)) && true || what;
	if (baseStat.SaveParamBits !== -1) {
		let val;
		switch (baseStat.Index) {
			case StatType.Reanimate:
				let monster = self.bits(baseStat.SaveParamBits);
				val = self.bits(baseStat.SaveBits);
				return pushStat(new ReanimateStat(monster, val));

			case StatType.ElementalSkillBonus:
				let element = self.bits(baseStat.SaveParamBits);
				val = self.bits(baseStat.SaveBits);
				return pushStat(new ElementalSkillsBonusStat(baseStat, element, val));

			case StatType.ClassSkillsBonus:
				let charClass = self.bits(baseStat.SaveParamBits);
				val = self.bits(baseStat.SaveBits);
				return pushStat(new ClassSkillsBonusStat(baseStat, charClass, val));

			case StatType.Aura:
				let aura = self.bits(baseStat.SaveParamBits);
				val = self.bits(baseStat.SaveBits);
				return pushStat(new AuraStat(baseStat, aura, val));

			case StatType.SingleSkill:
			case StatType.NonClassSkill:
				let skill = self.bits(baseStat.SaveParamBits);
				val = self.bits(baseStat.SaveBits);
				return pushStat(new SkillBonusStat(baseStat, skill, val));

			case StatType.ChargedSkill: { // Block to dont redeclare skill variable
				let level = self.bits(6);
				let skill = self.bits(10);
				let charges = self.bits(8);
				let maxCharges = self.bits(8);
				return pushStat(new ChargedSkillStat(baseStat, level, skill, charges, maxCharges));
			}

			case StatType.SkillOnAttack:
			case StatType.SkillOnKill:
			case StatType.SkillOnDeath:
			case StatType.SkillOnStriking:
			case StatType.SkillOnLevelUp:
			case StatType.SkillOnGetHit: {// Block to dont redeclare skill variable
				let level = self.bits(6);
				let skill = self.bits(10);
				let chance = self.bits(baseStat.SaveBits);

				return pushStat(new SkillOnEventStat(baseStat, level, skill, chance));
			}
			case StatType.SkillTabBonus: { // Block to dont redeclare charClass
				let tab = self.bits(3);
				let charClass = self.bits(3);
				let unknown = self.bits(10);

				val = self.bits(baseStat.SaveBits);
				return pushStat(new SkillTabBonusStat(baseStat, tab, charClass, unknown, val));
			}
			default:
				throw new Error('Shouldnt be here');
		}
	}

	if (baseStat.OpBase === StatType.Level) {
		return pushStat(new PerLevelStat(baseStat, self.bits(baseStat.SaveBits)));
	}

	switch (baseStat.Type) {
		case StatType.MinDamagePercent: {
			let min = self.bits(baseStat.SaveBits);
			let max = self.bits(baseStat.SaveBits);
			return pushStat(new DamageRangeStat(baseStat, min, max));
		}
		case StatType.FireMinDamage:
		case StatType.LightMinDamage:
		case StatType.MagicMinDamage: {
			let min = self.bits(baseStat.SaveBits);
			let max = self.bits(BaseStat.get(baseStat.Index + 1).SaveBits);
			return pushStat(new DamageRangeStat(baseStat, min, max));
		}
		case StatType.ColdMinDamage: {
			let min = self.bits(baseStat.SaveBits);
			let max = self.bits(BaseStat.get(StatType.ColdMaxDamage).SaveBits);
			let frames = self.bits(BaseStat.get(StatType.ColdLength).SaveBits);

			return pushStat(new ColdDamageStat(baseStat, min, max, frames));
		}
		case StatType.PoisonMinDamage: {
			let min = self.bits(baseStat.SaveBits);
			let max = self.bits(BaseStat.get(StatType.PoisonMaxDamage).SaveBits);
			let frames = self.bits(BaseStat.get(StatType.PoisonLength).SaveBits);

			return pushStat(new PoisonDamageStat(baseStat, min, max, frames));
		}

		// Single param stats:
		case StatType.ReplenishDurability:
		case StatType.ReplenishQuantity: {
			let val = self.bits(baseStat.SaveBits);

			return pushStat(new ReplenishStat(baseStat, val));
		}
		default: {
			if (baseStat.Signed) {
				let val = self.bits(baseStat.SaveBits); //ToDo; Make sure its signed here
				if (baseStat.SaveAdd > 0)
					val -= baseStat.SaveAdd;
				return pushStat(new SignedStat(baseStat, val));
			} else {
				let val = self.bits(baseStat.SaveBits); //ToDo; Make sure its unsigned here
				if (baseStat.SaveAdd > 0)
					val -= baseStat.SaveAdd;
				return pushStat(new UnsignedStat(baseStat, val));
			}
		}
	}
	return false;
}

const shortHandBr = (br) => ({
	bit: {get: () => br.bit()},
	bits: {get: () => bits => br.bit(bits)},
	byte: {get: () => br.bit(8)}, // 8
	word: {get: () => br.readUInt16LE()}, // 16
	dword: {get: () => br.readUInt32LE()}, // 32
	string: {get: () => (...args) => br.readString.apply(br, args)},
	boolean: {get: () => !!br.bit()},
});

/**
 * @param buffer
 */
function itemParser(buffer) {
	const br = new BitReader(buffer), item = {raw: buffer};
	br.pos = 8; // The first byte is the packet identifyer
	Object.defineProperties(this, shortHandBr(br));

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
		item.stats.Quantity = this.bits(this.bit ? 32 : 12);
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
				item.prefix = new ItemAffix(ItemAffixType.InferiorPrefix, this.bits(3));
				break;

			case ItemQuality.Superior:
				item.prefix = 0;
				item.superiorType = new ItemAffix(ItemAffixType.SuperiorPrefix, this.bits(3));
				break;

			case ItemQuality.Magic:
				item.prefix = new ItemAffix(ItemAffixType.MagicPrefix, this.bits(11));
				item.suffix = new ItemAffix(ItemAffixType.MagicSuffix, this.bits(11));
				break;

			case ItemQuality.Rare:
			case ItemQuality.Crafted:
				item.prefix = new ItemAffix(ItemAffixType.RarePrefix, this.bits(8));
				item.suffix = new ItemAffix(ItemAffixType.RareSuffix, this.bits(8));
				break;

			case ItemQuality.Set:
				item.setItem = this.bits(12); // ToDo; get set item
				break;

			case ItemQuality.Unique:
				if (!["std", "hdm", "te1", "te2", "te3", "te4"].includes(item.baseItem.code)) {
					item.uniqueItem = this.bits(12);
				}
				break;
		}
	}
	item.magicPrefixes = [];
	item.magicSuffixes = [];

	if (item.quality === ItemQuality.Rare || item.quality === ItemQuality.Crafted) {
		for (let i = 0; i < 3; i++) {
			if (this.boolean) {
				item.magicPrefixes.push(MagicPrefixType[this.bits(11)]);
			}
			if (this.boolean) {
				item.magicSuffixes.push(MagicSuffixType[this.bits(11)]);
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
		br.pos -= 2;
		item.runewordParam = this.word;
		item.runewordID = val;
		item.runeword = val;
	}

	// Personalized Name : 7 * (NULLSTRING Length)
	if ((flags & ItemFlags.Personalized) === ItemFlags.Personalized)
		item.name = br.readString(16, 7);

	if (item.baseItem.isArmor()) {
		let baseStat = BaseStat.get(StatType.ArmorClass);
		item.stats[baseStat.stat] = (this.bits(baseStat.SaveBits));
	}

	if (item.baseItem.isArmor() || item.baseItem.isWeapon()) {
		let baseStat = BaseStat.get(StatType.MaxDurability);
		item.stats[baseStat.stat] = this.bits(baseStat.SaveBits);
	}

	if ((flags & ItemFlags.Socketed) === ItemFlags.Socketed) {
		let baseStat = BaseStat.get(StatType.Sockets);
		item.stats[baseStat.name] = br.bit(baseStat.SaveBits);
	}

	if (item.baseItem.stackable) {
		if (item.baseItem.useable) item.use = this.bits(5);
		let baseStat = BaseStat.get(StatType.Quantity);
		item.stats[baseStat.name] = this.bits(9);
	}

	if ((flags & ItemFlags.Identified) !== ItemFlags.Identified)
		return item;

	// Set Bonus Stats
	let setMods = item.quality === ItemQuality.Set ? br.bit(5) : 0;

	let stat;
	if (!["std", "hdm", "te1", "te2", "te3", "te4"].includes(item.baseItem.code)) {
		while (readStat(br, item)) ;
		if ((flags & ItemFlags.Runeword) === ItemFlags.Runeword) while (readStat(br, item)) ;

		if (setMods) for (let i = 0; i < 5; i++) if ((setMods & (1 << i)) !== 0) while (readStat(br, item)) ;
	}

	return item;
}


module.exports = itemParser;

class ItemAffix {
	constructor(type, index) {
		this.index = index;
		this.type = type;
		if (this.type < 3) {
			throw new Error('Invalid type for item affix');
		}

		if ((this.type & 3) === 0) {
			switch (this.type) {
				case ItemAffixType.Inferior:
				case ItemAffixType.Superior:
					this.type |= ItemAffixType.Prefix;
					break;
				case ItemAffixType.Magic:
					throw new Error('Impossible type');
				case ItemAffixType.Rare:
					this.type |= ItemAffixType[this.index < ItemNames.RarePrefixOffset ? 'Suffix' : 'Prefix'];
					break;
				default:
					throw new Error('Impossible type');
			}
		}

		switch (true) {
			case (this.type & ItemAffixType.Superior) === ItemAffixType.Superior:
				this.name = ItemNames.SuperiorPrefix;
				break;
			case (this.type & ItemAffixType.Superior) === ItemAffixType.Inferior:
				this.name = ItemNames.InferiorPrefix[this.index];
				break;
			case (this.type & ItemAffixType.Superior) === ItemAffixType.Magic:
				if (this.index === 0) {
					this.index = '';
					break;
				}

				this.name = ((this.type & ItemAffixType.Prefix) === ItemAffixType.Prefix ? MagicSuffixType : MagicPrefixType)[this.index];
				break;
			case (this.type & ItemAffixType.Superior) === ItemAffixType.Rare:
				this.name = ItemNames.RareAffix[this.index];
				break;
		}
	}
}

/*
 {"action":6,"packetLength":50,"category":1,"uid":354823774,"ownerType":0,"ownerUID":3999140846,"flags":{"None":true,"Equipped":true,"InSocket":false,"Identified":true,"x20":false,"SwitchedIn":false,"SwitchedOut":false,"Broken":false,"Duplicate":false,"Socketed":true,"OnPet":false,"x2000":false,"NotInSocket":false,"Ear":false,"StartItem":false,"Compact":false,"Ethereal":false,"Any":true,"Personalized":false,"Gamble":false,"Runeword":true,"x8000000":true},"unknown1":1,"destination":4,"location":10,"x":-1,"y":-1,"container":0,"baseItemId":1618019685,"baseItem":{},"stats":{},"usedSockets":3,"level":12,"quality":10,"graphic":2,"color":1536,"magicPrefixes":[],"magicSuffixes":[],"runewordID":-1,"runewordParam":12408,"runeword":-1}
server->5.42.181.40:4000

0000	9d 06 32 01 5e 2e 26 15    00 ee 0b 5e ee 11 08 80     ..2.^.&.    ...^....
0010	0c 65 64 06 50 57 16 06    32 ab 80 03 05 1e 0c 0c     .ed.PW..    2.......
0020	f3 ff 43 c4 ac 38 c0 04    c3 d8 08 fe 88 9b 01 0f     ..C..8..    ........
0030	f9 0f
 */

let testItem = {
	"raw": {
		"type": "Buffer",
		"data": [156, 4, 54, 16, 6, 142, 119, 58, 16, 0, 128, 8, 101, 0, 0, 50, 214, 38, 3, 130, 241, 5, 200, 0, 64, 19, 128, 38, 128, 54, 128, 118, 194, 40, 133, 209, 10, 163, 22, 70, 83, 176, 44, 108, 76, 41, 166, 192, 204, 243, 65, 65, 225, 63]
	},
	"action": 4,
	"packetLength": 54,
	"category": 16,
	"uid": 980913670,
	"ownerType": 6,
	"ownerUID": 0,
	"flags": {
		"None": true,
		"Equipped": false,
		"InSocket": false,
		"Identified": true,
		"x20": false,
		"SwitchedIn": false,
		"SwitchedOut": false,
		"Broken": false,
		"Duplicate": false,
		"Socketed": false,
		"OnPet": false,
		"x2000": false,
		"NotInSocket": false,
		"Ear": false,
		"StartItem": false,
		"Compact": false,
		"Ethereal": false,
		"Any": true,
		"Personalized": false,
		"Gamble": false,
		"Runeword": false,
		"x8000000": true
	},
	"version": 101,
	"unknown1": 0,
	"destination": 0,
	"location": 0,
	"x": 0,
	"y": 0,
	"container": 2,
	"baseItemId": 540175715,
	"baseItem": {
		"id": 540175715,
		"type": 96,
		"index": 96,
		"tableIndex": 96,
		"baseType2": null,
		"code": "cm2",
		"name": "Large Charm",
		"Name2": "Charm Medium",
		"SzFlavorText": -1,
		"compactSave": 0,
		"version": 100,
		"level": 14,
		"levelReq": 0,
		"rarity": 8,
		"spawnable": 1,
		"speed": 0,
		"noDurability": 1,
		"cost": 1000,
		"gambleCost": 38000,
		"autoPrefix": -1,
		"alternateGfx": "rda",
		"nameString": "cm2",
		"component": 16,
		"invWidth": 1,
		"invHeight": 2,
		"hasInv": 0,
		"gemSockets": 0,
		"gemApplyType": 0,
		"flippyFile": "flpchm2",
		"invFile": "invwnd",
		"uniqueInvFile": "",
		"Special": "",
		"Transmogrify": 0,
		"TMogType": "xxx",
		"TMogMin": -1,
		"TMogMax": -1,
		"useable": 0,
		"Throwable": 0,
		"dropSound": "item_charm",
		"dropSfxFrame": 12,
		"useSound": "item_charm",
		"unique": 0,
		"transparent": 0,
		"transTbl": 5,
		"lightRadius": 0,
		"belt": 0,
		"AutoBelt": 0,
		"stackable": 0,
		"minStack": 0,
		"maxStack": 0,
		"SpawnStack": 0,
		"quest": -1,
		"QuestDiffCheck": -1,
		"missileType": 0,
		"SpellIcon": -1,
		"pSpell": -1,
		"State": -1,
		"CState1": -1,
		"CState2": -1,
		"Len": -1,
		"Stat1": -1,
		"Calc1": -1,
		"Stat2": -1,
		"Calc2": -1,
		"Stat3": -1,
		"Calc3": -1,
		"SpellDesc": -1,
		"SpellDescStr": "",
		"SpellDescCalc": -1,
		"durabilityWarning": 0,
		"quantityWarning": 0,
		"gemOffset": 0,
		"BetterGem": -1,
		"bitField1": 0,
		"charsiMin": -1,
		"charsiMax": -1,
		"charsiMagicMin": -1,
		"charsiMagicMax": -1,
		"charsiMagicLvl": 255,
		"gheedMin": -1,
		"gheedMax": -1,
		"gheedMagicMin": -1,
		"gheedMagicMax": -1,
		"gheedMagicLvl": 255,
		"akaraMin": -1,
		"akaraMax": -1,
		"akaraMagicMin": -1,
		"akaraMagicMax": -1,
		"akaraMagicLvl": 255,
		"faraMin": -1,
		"faraMax": -1,
		"faraMagicMin": -1,
		"faraMagicMax": -1,
		"faraMagicLvl": 255,
		"lysanderMin": -1,
		"lysanderMax": -1,
		"lysanderMagicMin": -1,
		"lysanderMagicMax": -1,
		"lysanderMagicLvl": 255,
		"drognanMin": -1,
		"drognanMax": -1,
		"drognanMagicMin": -1,
		"drognanMagicMax": -1,
		"drognanMagicLvl": 255,
		"hraltiMin": -1,
		"hraltiMax": -1,
		"hraltiMagicMin": -1,
		"hraltiMagicMax": -1,
		"hraltiMagicLvl": 255,
		"alkorMin": -1,
		"alkorMax": -1,
		"alkorMagicMin": -1,
		"alkorMagicMax": -1,
		"alkorMagicLvl": 255,
		"ormusMin": -1,
		"ormusMax": -1,
		"ormusMagicMin": -1,
		"ormusMagicMax": -1,
		"ormusMagicLvl": 255,
		"elzixMin": -1,
		"elzixMax": -1,
		"elzixMagicMin": -1,
		"elzixMagicMax": -1,
		"elzixMagicLvl": 255,
		"ashearaMin": -1,
		"ashearaMax": -1,
		"ashearaMagicMin": -1,
		"ashearaMagicMax": -1,
		"ashearaMagicLvl": 255,
		"cainMin": -1,
		"cainMax": -1,
		"cainMagicMin": -1,
		"cainMagicMax": -1,
		"cainMagicLvl": 255,
		"halbuMin": -1,
		"halbuMax": -1,
		"halbuMagicMin": -1,
		"halbuMagicMax": -1,
		"halbuMagicLvl": 255,
		"jamellaMin": -1,
		"jamellaMax": -1,
		"jamellaMagicMin": -1,
		"jamellaMagicMax": -1,
		"jamellaMagicLvl": 255,
		"larzukMin": -1,
		"larzukMax": -1,
		"larzukMagicMin": -1,
		"larzukMagicMax": -1,
		"larzukMagicLvl": 255,
		"malahMin": -1,
		"malahMax": -1,
		"malahMagicMin": -1,
		"malahMagicMax": -1,
		"malahMagicLvl": 255,
		"drehyaMin": -1,
		"drehyaMax": -1,
		"drehyaMagicMin": -1,
		"drehyaMagicMax": -1,
		"drehyaMagicLvl": 255,
		"sourceArt": -1,
		"gameArt": -1,
		"transform": 0,
		"invTrans": 0,
		"skipName": 0,
		"minDamage": -1,
		"maxDamage": -1,
		"PermStoreItem": -1,
		"MultiBuy": -1,
		"nameable": -1
	},
	"stats": {
		"strength": [{}],
		"energy": [{}],
		"dexterity": [{}],
		"vitality": [{}],
		"fireresist": [{}],
		"lightresist": [{}],
		"coldresist": [{}],
		"poisonresist": [{}],
		"item_addclassskills": [{}],
		"item_lightradius": [{}],
		"item_skillonhit": [{}],
		"item_charged_skill": [{}]
	},
	"usedSockets": 0,
	"level": 99,
	"quality": 7,
	"graphic": 0,
	"uniqueItem": 400,
	"magicPrefixes": [],
	"magicSuffixes": []
}
