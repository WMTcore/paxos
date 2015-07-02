"use strict";

var coroutine = require('coroutine');
var db = require('db')
var fs = require("fs");
var rpc = require('rpc');
var net = require('net');
var io = require('io');
var mq = require('mq');
var util = require('util');
var dblog = db.open("sqlite:log1.db");
var dbconn = db.open("sqlite:data1.db");
// var connect = require("connect");
var fib = {};
var keepSid = [];
var uuid = "";
var flag = 0;
var isconfirmLeader = 0;
var lock = new coroutine.Semaphore(1);

fib.choseResult = {};
var hdlr = rpc.json({
	isLeader: function(v) {
		if (!util.isEmpty(v.params)) {
			var LeaderID = v.params[0];
			if (fib.status == "Leader" && fib.sid == Number(LeaderID))
				return {
					"connect": true
				}
		}
		if (fib.status == "follower" || fib.status == "Leader")
			return {
				"Leader": fib.Leader
			}
		return {
			"Leader": -1
		}
	},
	choseLeader: function(v) {
		var sid = v.params[0];
		var clock = v.params[1];
		switch (fib.status) {
			case "Looking":
				if (clock > fib.clock) {
					fib.clock = clock;
					fib.choseLeader = fib.sid;
					choseLeader.start(sid);
					return {
						"clock": fib.clock,
						"choseLeader": sid
					}
				} else if (clock == fib.clock) {
					if (fib.choseLeader <= sid) {
						return {
							"clock": fib.clock,
							"choseLeader": fib.sid
						}
					}
					fib.choseLeader = sid;
					console.error("shit")
					choseLeader.start(sid)
					return {
						"clock": fib.clock,
						"choseLeader": sid
					}
				} else if (clock < sid.clock) {
					return {
						"clock": fib.clock,
						"choseLeader": fib.sid
					}
				}
				break;
			case "Leader":
				if (clock > fib.clock)
					fib.clock = clock;
				return {
					"clock": fib.clock,
					"Leader": fib.sid
				};
				break;
			case "follower":
				if (clock > fib.clock)
					fib.clock = clock;
				return {
					"clock": fib.clock,
					"Leader": fib.Leader
				};
				break;
		}
	},
	readData: function(v) {
		var sql = v.params[0];
		return dbconn.execute(sql);
	},
	write: function(v) {
		return writePermit(v.params[0]);
	},
	writePermit: function(v) {
		var sid = v.params[0],
			maxid = v.params[1];
		uuid = v.params[2];
		if (sid == fib.Leader && maxid > dblog.execute("SELECT * FROM log"))
			return "accept";
		return "reject";
	},
	execute: function(v) {
		var maxid = v.params[0],
			sql = v.params[2];
		if (uuid != v.params[1])
			return false;
		synclog(maxid);
		dbconn.execute(sql);
		dblog.execute("insert into log(sid,sql,createtime) values(?,?,?)", fib.sid, sql, new Date().getTime());
		console.notice("数据写入成功！");
		return true;
	},
	synclog: function(v) {
		var beginId = v.params[0],
			endId = v.params[1];
		return dblog.execute("SELECT sql FROM log WHERE lid>? AND lid <?", beginId, endId);
	}
});

var hdlrkeepAlive = rpc.json({
	keepAlive: function(v) {
		var sid = v.params[0];
		if (fib.status == "Leader" && util.isNumber(sid)) {
			keepSid.push(sid);
			coroutine.sleep(10000);
			keepSid.splice(keepSid.indexOf(sid), 1);
			return "keeping";
		}
		return "error";
	}
});


setting();

function synclog(maxid) {
	var sqls = connect("synclog")(fib.LeaderPort, dblog.execute("SELECT max(lid) FROM log"), maxid)

	sqls.forEach(function(o) {
		dbconn.execute(o);
	})
	console.notice("同步日志成功！");
}

function writePermit(sql, maxid) {
	uuid = require('uuid').random().toString();
	var maxid = maxid || dblog.execute("SELECT max(lid) FROM log"),
		sidPort = readDNS(),
		acceptServer = [];

	for (var sid in sidPort) {
		if (sid == fib.sid)
			continue;
		if (connect("writePermit")(sidPort[sid]["port"], fib.sid, maxid + 1, uuid) == "accept")
			acceptServer.push(sid);
	}
	acceptServer = util.unique(acceptServer);
	if (acceptServer.length >= util.keys(sidPort).length / 2) {
		console.log("sql", sql);
		dbconn.execute(sql);
		dblog.execute("insert into log(sid,sql,createtime) values(?,?,?)", fib.sid, sql, new Date().getTime());
		for (var sid in sidPort) {
			if (sid == fib.sid)
				continue;
			connect("execute")(sidPort[sid]["port"], maxid + 1, uuid, sql)
		}
		console.notice("数据写入成功");
		return true;
	} else {
		if (CheckAlive())
			writePermit(sql, maxid + 1);
		return false;
	}
}

function setting() {
	var dns = fs.openTextStream("DNS.txt", "a+")
	var dnsData = dns.readLines();
	if (!util.isUndefined(dnsData[0])) {
		var allServer = dnsData[0].split(',');
		console.log("当前服务器分配情况：", allServer);
	}
	var sid = Number(console.readLine("请输入服务器ID:"));
	var port = console.readLine("请输入服务器端口:");
	fib.sid = sid;
	fib.port = port;
	fib.clock = 0;

	var rpc = new net.TcpServer("127.0.0.1", port, new mq.PacketHandler(hdlr));
	var rpckeepAlive = new net.TcpServer("127.0.0.1", Number(port + "1"), new mq.PacketHandler(hdlrkeepAlive));
	if (!util.isUndefined(dnsData[0]))
		dns.writeText("," + port + ":" + sid)
	else dns.writeText("" + port + ":" + sid)
	console.notice('系统已正常启动...')
	init.start(++fib.clock);
	rpckeepAlive.asyncRun();
	rpc.run();

}

function init() {
	if (flag == 1) {
		coroutine.sleep(1000);
		return init();
	}
	fib.status = "Looking";
	fib.Leader = -1;
	fib.LeaderPort = -1;
	fib.choseResult = {};
	fib.choseLeader = fib.sid;
	analyzeData(fib.sid, fib.sid);
	choseLeader(fib.sid);
	while (isconfirmLeader == 1)
		coroutine.sleep(1000);
	if (fib.status == "Leader")
		leader();
	else if (fib.status == "follower")
		follower();
	else init();
}

function choseLeader(sid) {
	if (fib.status == "Leader" || fib.status == "follower") {
		flag = 0;
		return;
	}
	if (flag == 1) {
		coroutine.sleep("1000");
		return choseLeader(fib.choseLeader);
	}
	flag = 1;
	var sidPort = readDNS();
	var dns = fs.openTextStream("DNS.txt", "r+")
	var dnsData = dns.readLines();
	var allServer = dnsData[0].split(',');
	dns.dispose();
	if (util.keys(sidPort).length == 1) {
		coroutine.sleep("1000");
		flag = 0;
		return choseLeader(fib.choseLeader);
	}
	console.notice('正在选举...')
	for (var o in sidPort) {
		if (o == fib.sid)
			continue;

		var data = {};
		data = connect("choseLeader")(sidPort[o]["port"], sid, fib.clock);
		if (!util.isObject(data)) {
			flag = 0;
			return;
		}
		if (data["clock"] > fib.clock) {
			fib.clock = data["clock"];
			if (!util.isUndefined(data["Leader"])) {
				fib.Leader = data["Leader"];
				fib.status = "follower";
				flag = 0;
				return true;
			}
			fib.choseResult = {};

		} else if (data["clock"] == fib.clock) {
			if (!util.isUndefined(data["Leader"]))
				data["choseLeader"] = data["Leader"];
			if (data["choseLeader"] < fib.choseLeader) {
				fib.choseLeader = data["choseLeader"];
				analyzeData(fib.choseLeader, fib.sid);
			}
			analyzeData(data["choseLeader"], Number(sidPort[o]["sid"]));
			confirmLeader.start(++isconfirmLeader);
			if (fib.status == "Leader" || fib.status == "follower") {
				flag = 0;
				return true;
			}
		}
	}
	flag = 0;
}

function analyzeData(choseLeader, sid) {
	fib.choseResult[choseLeader] = fib.choseResult[choseLeader] || [];
	fib.choseResult[choseLeader].push(sid);
	fib.choseResult[choseLeader] = util.unique(fib.choseResult[choseLeader]);
	for (var id in fib.choseResult) {
		if (id != choseLeader) {
			fib.choseResult[id] = util.without(fib.choseResult[id], sid);
		}
	}
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


function confirmLeader() {
	var sidPort = readDNS();
	for (var sid in fib.choseResult) {
		var vote = fib.choseResult[sid].length;
		if (vote > util.keys(sidPort).length / 2) {
			coroutine.sleep(1000); //等待一段时间观察是否有变化
			vote = fib.choseResult[sid].length;
			if (vote > util.keys(sidPort).length / 2) {
				if (fib.sid == sid) {
					fib.status = "Leader";
					fib.Leader = sid;
					fib.LeaderPort = sidPort[sid]["port"];
					return isconfirmLeader--;
				} else {
					fib.status = "follower";
					fib.Leader = sid;
					fib.LeaderPort = sidPort[sid]["port"];
					return isconfirmLeader--;
				}
			}
		}
	}
	return isconfirmLeader--;
}


function KeepAlive() {
	console.notice('心跳连接中......')
	var conn = new io.BufferedStream(net.connect("127.0.0.1", Number(fib.LeaderPort + "1")));
	var jss = [];
	jss.push('{"method":"');
	jss.push("keepAlive");
	jss.push('","params":');
	jss.push(JSON.stringify([fib.sid]));
	jss.push("}");
	var ps = new Buffer(jss.join(""));
	conn.writePacket(ps);
	var keepAliveResult = JSON.parse(conn.readPacket()).result;
	conn.close();
	if (keepAliveResult == "keeping") {
		KeepAlive.start();
		return true;
	}
	console.error("连接失败！！")
	return init.start(++fib.clock);
}

function leader() {
	console.notice('当前状态为Leader')
	CheckAlive.start();
}

function follower() {
	console.notice('当前状态为follower')
	coroutine.sleep(5000);
	KeepAlive.start();
}

function CheckAlive() {
	console.notice("心跳连接检查......")
	var dnsSid = util.keys(readDNS());
	var sinSid = util.difference(dnsSid, [fib.sid]);
	var sids = util.difference(sinSid, keepSid);
	if (!util.isEmpty(sids)) {
		coroutine.sleep(5000);
		sids = util.difference(sinSid, keepSid);
		//console.error("sids--->", sids);
		if (sids.length >= dnsSid.length / 2) {
			console.error("init--->", sids);
			init.start(++fib.clock);
			return false;
		}
		if (sids == util.difference(sinSid, keepSid))
			console.error(sids)
	}
	console.notice("当前连接数:", keepSid.length);
	coroutine.sleep(10000);
	CheckAlive.start();
	return true;
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
		var result = JSON.parse(conn.readPacket()).result;
		conn.close();
		return result;
	}
}