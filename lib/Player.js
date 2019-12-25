class Player {
	/**
	 *
	 * @param {Game} game
	 * @param uid
	 */
	constructor(game,uid) {
		this.game = game; // Game im hook'd on.
		this.isMe = this.game.players.push() === 0; // First player of the game is us
		this.uid = uid; // not setup yet.

		// If this is the me player, we get an assigned unit id later on.
		if (this.isMe) 	this.game.gameServer.once(0x59,({packetData}) => this.uid = packetData.UnitId);

	}
}

module.exports = Player;