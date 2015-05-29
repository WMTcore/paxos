"use strict";

var io = require('io');
var net = require('net');

function connect(method) {
	return function() {
		var conn = new io.BufferedStream(net.connect("127.0.0.1", arguments[0]));
		var jss = [];
		jss.push('{"method":"');
		jss.push(method);
		jss.push('","params":');
		jss.push(JSON.stringify(Array.prototype.slice.call(arguments, 1)));
		jss.push("}");
		var ps = new Buffer(jss.join(""));
		conn.writePacket(ps);
		var result = JSON.parse(conn.readPacket()).result;
		conn.close();
		return result;
	}
}

module.exports = {
	connect: connect
}