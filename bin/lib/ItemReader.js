/**
 * @description Reads an item from the packet
 *
 * @Author Jaenster
 * @credits Awesom-O source code helped me allot.
 */

/** @type {BitReader} */
const BitReader = require('./BitReader');
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
	Object.defineProperties(self, BitReader.shortHandBr(br));
	let statID = self.bits(9);
	if (statID === 0x1FF) {
		return null;
	}
	let baseStat = BaseStat.get(statID);
	if (!baseStat) {
		return null;
	}
	const pushStat = (what) => {
		if (!Array.isArray(item.stats[baseStat.Stat])) item.stats[baseStat.Stat] = [];
		item.stats[baseStat.Stat].push(what);
		return what;
	};
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

/**
 * @param buffer
 * @param {Game} game
 */
function itemParser(buffer, game) {
	const br = new BitReader(buffer), item = {};
	br.pos = 8; // The first byte is the packet identifyer
	Object.defineProperties(this, BitReader.shortHandBr(br));

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
		item.ownerType = 0; // Its an private item, aka on us. We are an player
		item.ownerUID = game.me.uid;
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

	if (item.quality === ItemQuality.Rare || item.quality === ItemQuality.Crafted) {
		item.magicPrefixes = [];
		item.magicSuffixes = [];
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
		item.stats[baseStat.Stat] = (this.bits(baseStat.SaveBits));
	}

	if (item.baseItem.isArmor() || item.baseItem.isWeapon()) {
		let baseStat = BaseStat.get(StatType.MaxDurability);
		item.stats[baseStat.Stat] = this.bits(baseStat.SaveBits);
	}

	if ((flags & ItemFlags.Socketed) === ItemFlags.Socketed) {
		let baseStat = BaseStat.get(StatType.Sockets);
		item.stats[baseStat.Stat] = br.bit(baseStat.SaveBits);
	}

	if (item.baseItem.stackable) {
		if (item.baseItem.useable) item.use = this.bits(5);
		let baseStat = BaseStat.get(StatType.Quantity);
		item.stats[baseStat.Stat] = this.bits(9);
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

