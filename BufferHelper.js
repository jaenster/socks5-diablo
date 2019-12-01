class BufferHelper {
	static getString(buffer, size, offset = 0, encoding = 'utf8') {
		const tmpbuff = Buffer.alloc(size);
		for (let i = 0; i < size; i++) tmpbuff.writeUInt8(buffer.readUInt8(i + offset), i);

		return tmpbuff.toString(encoding);
	}

}

module.exports = BufferHelper;