/**
 * RTSP Streaming's server.js
 * --------------------------
 *  This script runs a server that fetchs stale images from a ffmpeg
 *  output and sends it with Socket.IO to a client in a volatile-manner.
 *
 *  Requires: Node.js, Socket.IO and FFmpeg, but compiled with libmjpeg 
 *  support and the last version from git-master tree.
 *
 * Created on: December 02, 2011.
 * Copyright © 2011, Jose Luis Rivas. All Rights Reserved.
 **/

/**
 * Variables for Socket.IO and HTTP server
 **/
var	http = require('http').createServer(handler),
		basedir = __dirname + '/../',
		io = require('socket.io').listen(http),
		fs = require('fs');

// It will listen on port 8081 avoiding other HTTP server on the same IP
http.listen(8081);

/**
 * Configuring Socket.IO
 **/
io.configure('prod', function(){
	io.enable('browser client minification');
	io.enable('browser client etag');
	io.enable('browser client gzip');
  io.set('log level', 1);

  io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
  ]);
});

io.configure('dev', function(){
  io.set('transports', ['websocket']);
});

/**
 * @name handler
 * @desc Handler of HTTP requests (HTTP server)
 * @params
 * req: the request made by the browser.
 * res: the response sent by the function to the browser.
 **/
function handler (req, res) {
	// It will read the HTML file for clients
  fs.readFile(basedir + '/client/index.html',
  function (err, data) {
    if (err) { // If something bad happens, then do:
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
		// Send data to the client
    res.writeHead(200,{'Content-Type':'text/html'});
    res.write(data,'utf8');
		res.end();
  });
}

/**
 * Variables for FFmpeg
 **/
var util = require('util'),
		exec = require('child_process').exec,
		child001, child002,
		input001 = 'rtsp://admin:admin@192.168.1.217:554/0', // Input file or stream
		input002 = '/home/ghostbar/shell-20110908-1.webm', // Local input file
		rate = 4, // Video FPS rate.
		quality = 'vga', // Quality of the image
		imgdir = 'img/', // Where JPGs are going to be stored
		extraparams = '-b:v 32k',
		suffixout = 'camaraip', // Suffix for the JPEG output of FFmpeg
		prefixout001 = '001', prefixout002 = '002',
		outextension = 'jpg';

/**
 * Call to FFmpeg
 **/
child001 = exec('ffmpeg -i ' + input001 + ' -r ' + rate + ' -s ' + quality + ' ' + extraparams + ' -f image2 -updatefirst 1 ' + basedir + imgdir + prefixout001 + '_' + suffixout + '.' + outextension,
	function (error, stdout, stderr) {
    if (error !== null) {
      console.error('FFmpeg\'s 001 exec error: ' + error);
    }
});

/**
 * Call to FFmpeg
 **/
child002 = exec('ffmpeg -i ' + input002 + ' -r ' + rate + ' -s ' + quality + ' ' + extraparams + ' -f image2 -updatefirst 1 ' + basedir + imgdir + prefixout002 + '_' + suffixout + '.' + outextension,
	function (error, stdout, stderr) {
    if (error !== null) {
      console.error('FFmpeg\'s 002 exec error: ' + error);
    }
});


io.of('/001').on('connection', function (client) {
	/**
	 * @name imageWatcher
	 * @desc Watchdog for any change on image files
	 * @params complete file path
	 **/
	var imgcount = 0;
	console.log( basedir + imgdir);
	setInterval( function() {
		fs.readFile( basedir + imgdir + prefixout001 + '_' + suffixout + '.' + outextension,
			function(err, content) {
				if (err) {
					throw err;
				} else {
					++imgcount;
					console.log( 'Transformation #' + imgcount);
					client.volatile.emit('message', {
						data: content.toString('base64')
					});
				}
			});
	}, 1000/rate);
});

io.of('/002').on('connection', function (client) {
	/**
	 * @name imageWatcher
	 * @desc Watchdog for any change on image files
	 * @params complete file path
	 **/
	var imgcount = 0;
	console.log( basedir + imgdir);
	setInterval( function() {
		fs.readFile( basedir + imgdir + prefixout002 + '_' + suffixout + '.' + outextension,
			function(err, content) {
				if (err) {
					throw err;
				} else {
					++imgcount;
					console.log( 'Transformation #' + imgcount);
					client.volatile.emit('message', {
						data: content.toString('base64')
					});
				}
			});
	}, 1000/rate);
});
