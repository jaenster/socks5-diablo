const DiabloClient = require('../DiabloClient');

const readableChars = [];
for (let i = 32; i < 128; i++) readableChars.push(i);

['server', 'client'].forEach(type =>
	DiabloClient.hooks[type].push(
		/** @type Buffer */
		async function (buffer) {
			let arr = [];
			for (let i = 0; i < buffer.length; i++) arr.push(buffer.readUInt8(i));

			// Add leading zeroes
			arr = arr.map(byte => ('0' + byte.toString(16)).substr(-2));

			let print = type + '->' + this.ip + ':' + this.port + '\r\n', stripped, counter = 0;
			while (arr.length) {
				let bytes = arr.splice(0, stripped = arr.length < 16 && arr.length || 16), tmp = [0, 0];
				print += ('0000' + counter.toString(16)).substr(-4) + '\t';
				let tmpprint = [0, 0].map((x, i) => (tmp[i] = bytes.splice(0, 8)).join(' ')).join('    ');
				print += (tmpprint + ' '.repeat(50)).substr(0,50)
					+ '     '
					+ (tmp.map(arr => arr.map(x => parseInt(x, 16)).map(x => readableChars.includes(x) && String.fromCharCode(x) || '.').join('')).join('    '))
					+ '\r\n';
				counter += stripped;

			}

			console.log(print);

		}
	)
);