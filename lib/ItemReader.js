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
    br.bitoffset = 8; // The first byte is the packet identifyer
    Object.defineProperties(this, {
        bit: {get: () => br.readOneBit()},
        bits: {get: () => bits => br.readBits(bits)},
        byte: {get: () => br.readBits(8)}, // 8
        // word: {get: () => changeEndianness(br.readBits(16), 2)}, // 16
        // dword: {get: () => changeEndianness(br.readBits(32), 4)}, // 32
        word: {get: () => br.readMultipleBytes(2)}, // 16
        dword: {get: () => br.readMultipleBytes(4)}, // 32
        string: {get: () => br.readNullString},
        boolean: {get: () => !!br.readOneBit()},
    });


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
    item.flags = {};
    const flags = this.dword;
    item.flags.valueOf = () => flags;

    item.flags.None = (flags & ItemFlags.None) === ItemFlags.None;
    item.flags.Equipped = (flags & ItemFlags.Equipped) === ItemFlags.Equipped;
    item.flags.InSocket = (flags & ItemFlags.InSocket) === ItemFlags.InSocket;
    item.flags.Identified = (flags & ItemFlags.Identified) === ItemFlags.Identified;
    item.flags.x20 = (flags & ItemFlags.x20) === ItemFlags.x20;
    item.flags.SwitchedIn = (flags & ItemFlags.SwitchedIn) === ItemFlags.SwitchedIn;
    item.flags.SwitchedOut = (flags & ItemFlags.SwitchedOut) === ItemFlags.SwitchedOut;
    item.flags.Broken = (flags & ItemFlags.Broken) === ItemFlags.Broken;
    item.flags.Duplicate = (flags & ItemFlags.Duplicate) === ItemFlags.Duplicate;
    item.flags.Socketed = (flags & ItemFlags.Socketed) === ItemFlags.Socketed;
    item.flags.OnPet = (flags & ItemFlags.OnPet) === ItemFlags.OnPet;
    item.flags.x2000 = (flags & ItemFlags.x2000) === ItemFlags.x2000;
    item.flags.NotInSocket = (flags & ItemFlags.NotInSocket) === ItemFlags.NotInSocket;
    item.flags.Ear = (flags & ItemFlags.Ear) === ItemFlags.Ear;
    item.flags.StartItem = (flags & ItemFlags.StartItem) === ItemFlags.StartItem;
    item.flags.Compact = (flags & ItemFlags.Compact) === ItemFlags.Compact;
    item.flags.Ethereal = (flags & ItemFlags.Ethereal) === ItemFlags.Ethereal;
    item.flags.Any = (flags & ItemFlags.Any) === ItemFlags.Any;
    item.flags.Personalized = (flags & ItemFlags.Personalized) === ItemFlags.Personalized;
    item.flags.Gamble = (flags & ItemFlags.Gamble) === ItemFlags.Gamble;
    item.flags.Runeword = (flags & ItemFlags.Runeword) === ItemFlags.Runeword;
    item.flags.x8000000 = (flags & ItemFlags.x8000000) === ItemFlags.x8000000;

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


    item.baseItem = BaseItem.getByID(item.category, this.dword);
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
    if ((flags & (ItemFlags.Compact | ItemFlags.Gamble)) !== 0) return item;

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