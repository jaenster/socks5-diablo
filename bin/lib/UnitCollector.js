const BitReader = require('./BitReader');
const Unit = require('./Unit');

class UnitCollector extends require('events'){
	constructor(game) {
		super();
		this.game = game;
		this.collection = [];
	}

	destroy() {
		Object.keys(this).forEach(key => delete this[key]);
	}

	fromPacket(buffer) {
		let br = new BitReader(buffer);
		br.pos = 8; // The first byte is the packet identifyer
		let self = {};
		Object.defineProperties(self, BitReader.shortHandBr(br));

		//0xAC [DWORD Unit Id] [WORD Unit Code] [WORD X] [WORD Y] [BYTE Unit Life] [BYTE Packet Length] [VOID State Info]
		const unit = {
			UnitId: self.dword,
			UnitType: 1, // Npc's are always monsters
			UnitCode: self.word,
			x: self.word,
			y: self.word,
			life: self.byte,
		};
		const length = self.byte;
		let newUnit = new Unit(...Object.keys(unit).map(key=>unit[key]));
		this.collection.push(newUnit);
		this.emit('new', newUnit);
	}
	createMe(){
		const me = new Unit();
		me.isMe = true;
		this.collection.push(me);
		this.game.gameServer.once(0x59,({packetData}) => me.uid = packetData.UnitId);
		return me;
	}
}

module.exports = UnitCollector;