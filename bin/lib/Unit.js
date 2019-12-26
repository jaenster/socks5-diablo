class Unit {
	constructor(UnitId, UnitType, UnitCode, x, y, life) {
		this.uid = UnitId;
		this.type = UnitType;
		this.classid = UnitCode;
		this.x = x;
		this.y = y;
		this.life = life;
		this.isMe = false;
		this.items = [];
	}
}


module.exports = Unit;