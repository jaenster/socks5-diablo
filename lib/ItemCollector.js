const Item = require('./Item');
class ItemCollector {
	/** @param {Game} game */
	constructor(game) {
		this.game = game;
		this.items = [];
	}
	newItem(item) {
		const unit = new Item();
		Object.keys(item).forEach(key=>unit[key]=item[key]);

		this.items.push(unit);
		// An item i own
		if (item.ownerType === 0 && item.ownerUID === this.game.me.uid) {
			this.game.me.items.push(item);
		}

		// Is this item socketed in another item?
		if (item.ownerType === 4) {
			// Lets find the owner
			let parent = this.items.find(element=> element.uid === item.ownerUID);
			if (parent) {
				parent.items.push(unit);
			}
		}
	}
}


module.exports = ItemCollector;