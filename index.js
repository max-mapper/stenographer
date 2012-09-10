#!/usr/bin/env node
var request = require('request')
var os = require('os')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn;
var words = process.argv.slice(2,process.argv.length)
var tmpfile = path.join(os.tmpDir(), 'pizza.aiff')
var aiffWriter = spawn('say', words.concat(['-o', tmpfile]), {stdio: [0]})
aiffWriter.on('close', function() {
  var flacStream = spawn('sox', [tmpfile, '-t', 'flac', '-'])
  var totallyOpenVoiceEncodingAPI = "https://www.google.com/speech-api/v1/recognize?xjerr=1&client=chromium&lang=en-US"
  var upload = request.post({'url': totallyOpenVoiceEncodingAPI, "headers": {"content-type": "audio/x-flac; rate=16000"}})
  flacStream.stdout.pipe(upload).pipe(process.stdout)
})
