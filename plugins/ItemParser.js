const DiabloClient = require('../DiabloClient');

['server', 'client'].forEach(type =>
	DiabloClient.hooks[type].push(function (buffer) {
	})
);