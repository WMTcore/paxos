"use strict";
// var net = require('net');
// var io = require('io');
// var coroutine = require('coroutine');
// var re = ""

// function conn(method) {
// 	return function() {
// 		var conn = new io.BufferedStream(net.connect("127.0.0.1", 20011));

// 		var jss = [];
// 		jss.push('{"method":"');
// 		jss.push("keepAlive");
// 		jss.push('","params":');
// 		jss.push(JSON.stringify([1]));

// 		jss.push("}");
// 		//{"method":"test2","params":["1","2","3"]}
// 		var ps = new Buffer(jss.join(""));
// 		conn.writePacket(ps);
// 		coroutine.sleep(1000);
// 		// console.error("111")
// 		re = JSON.parse(conn.readPacket()).result
// 			// console.error("222")
// 		return re;
// 	}
// }


// conn("test")();
// console.error("re", re);



// var coroutine = require('coroutine');
// var util = require('util');


// // while (1) {
// // 	a.start();
// // 	console.error("b");
// // 	coroutine.sleep(5000);
// // }

// // function a() {
// // 	coroutine.sleep(1000);
// // 	console.error("a");
// // }
var a = [1, 2, 3, 4, 5];
// var x = [1, 2, 3, 4, 5];
// b();
// //function b() {

// //	a.forEach(function(o) {
// //			if (o == 3)
// //				return;
// //			console.error(o)

// //})
for (var o in a) {
	if (o == 3)
		break;
	console.error(o)
}



// // function b() {
// // 	var a = [1, 2, 3];
// // 	a.some(function(o) {
// // 		if (o == 2)
// // 			return;
// // 		console.error(o)
// // 	})
// // }
// // function b() {
// // 	var a = [1, 2, 3];
// // 	var b = a.map(function(o) {
// // 		if (o != 2)
// // 			return o;
// // 	})
// // 	console.error(b)
// // }

// function b() {
// 	var xs = util.difference(a, x);
// 	console.error(util.isEmpty(xs))
// }