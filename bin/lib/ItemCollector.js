const Item = require('./Item');

class ItemCollector {
	/** @param {Game} game */
	constructor(game) {
		this.game = game;
		this.items = [];
	}

	newItem(item) {
		this.items.push(item);
		this.game.unitCollector.collection.push(item); // Add it to the unit collector obv, as

		// An item i own, add directly
		if (item.ownerType === 0 && item.ownerUID === this.game.me.uid) {
			this.game.me.items.push(item);
		}

		// Is this item socketed in another item?
		if (item.ownerType === 4) {
			// Lets find the owner
			item.parent = this.items.find(element => element.uid === item.ownerUID);

			// If parent is found, add it to its list of items
			if (item.parent) item.parent.items.push(item);
		}
	}

	destroy() {
		this.items.splice(0, this.items.length);
		this.game = null;
	}

}


module.exports = ItemCollector;