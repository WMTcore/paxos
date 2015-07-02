"use strict";

var coroutine = require('coroutine');
var db = require('db')
var fs = require("fs");
var rpc = require('rpc');
var net = require('net');
var io = require('io');
var mq = require('mq');
var util = require('util');
var Leader;



function checkLeader() {
	var sidPort = readDNS();
	for (var o in sidPort) {
		var data = connect("isLeader")(sidPort[o]["port"]);
		if (data["Leader"] != "-1") {
			if (connect("isLeader")(sidPort[data["Leader"]]["port"], data["Leader"])["connect"] == true) {
				Leader = sidPort[data["Leader"]]["port"];
				return true;
			}
		}
	}
	return checkLeader();
}

write();

function write() {
	checkLeader();
	var sql = "INSERT into data(value,createtime,key) values('hello'," + new Date().getTime() + ",'key')";
	connect("write")(Leader, sql);
}



function readDNS() {
	var dns = fs.openTextStream("DNS.txt", "r+")
	var dnsData = dns.readLines();
	var allServer = dnsData[0].split(',');
	dns.dispose();
	var sidPort = {};
	allServer.forEach(function(o) {
		sidPort[o.split(':')[1]] = {
			"sid": o.split(':')[1],
			"port": o.split(':')[0]
		}
	});
	return sidPort;
}



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
		return JSON.parse(conn.readPacket()).result;
	}
}