var db = require("db");
var process = require("process");
var conn1 = db.open("sqlite:log1.db");
conn1.execute("DROP TABLE IF EXISTS 'log'");
conn1.execute("CREATE TABLE log (lid INTEGER PRIMARY KEY, sid INT,sql varchar(100), createtime INT);");

var conn2 = db.open("sqlite:log2.db");
conn2.execute("DROP TABLE IF EXISTS 'log'");
conn2.execute("CREATE TABLE log (lid INTEGER PRIMARY KEY, sid INT,sql varchar(100), createtime INT);");

var conn3 = db.open("sqlite:log3.db");
conn3.execute("DROP TABLE IF EXISTS 'log'");
conn3.execute("CREATE TABLE log (lid INTEGER PRIMARY KEY, sid INT,sql varchar(100), createtime INT);");

var conndata1 = db.open("sqlite:data1.db");
conndata1.execute("DROP TABLE IF EXISTS 'data'");
conndata1.execute("CREATE TABLE data (id INTEGER PRIMARY KEY, value varchar(100), createtime INT,key varchar(10));");

var conndata2 = db.open("sqlite:data2.db");
conndata2.execute("DROP TABLE IF EXISTS 'data'");
conndata2.execute("CREATE TABLE data (id INTEGER PRIMARY KEY, value varchar(100), createtime INT,key varchar(10));");

var conndata3 = db.open("sqlite:data3.db");
conndata3.execute("DROP TABLE IF EXISTS 'data'");
conndata3.execute("CREATE TABLE data (id INTEGER PRIMARY KEY, value varchar(100), createtime INT,key varchar(10));");



// var coroutine = require('coroutine');
// var fs = require("fs");
// var net = require('net');
// var io = require('io');
// var mq = require('mq');
// // var dbconn = db.open("sqlite:log.db");


// // var dns = fs.open("DNS.txt", "r+");
// var dns = fs.openTextStream("DNS.txt", "r+")
// var dnsdata = dns.readLines();
// dnsdata.push("8003:3");
// fs.unlink("DNS.txt");
// dns = fs.openTextStream("DNS.txt", "w+");


// dns.writeText(dnsdata);
// console.error(dns.readLines())