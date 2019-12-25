const Player = require('./Player');
const GameServer = require('./GameServer');

class Game {
	constructor(diabloProxy) {
		// ToDo: Hook myself upon the realm server proxy
		this.diabloProxy = diabloProxy;
		this.gameServer = new GameServer(this);
		this.players = [];
		this.me = new Player(this); // Hooks itself to us
		this.items = [];
	}

}

module.exports = Game;