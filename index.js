#!/usr/bin/env node

var request = require('request')
var os = require('os')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn;

var args = process.argv.slice(2, process.argv.length)
if (process.stdin.isTTY) {
  synthesizeAudio(args, function(err, flacStream) {
    stenographify(flacStream)
  })
} else {
  stenographify(flacConvertStream(args))
}

function synthesizeAudio(words, cb) {
  var tmpfile = path.join(os.tmpDir(), 'pizza.aiff')
  var aiffWriter = spawn('say', words.concat(['-o', tmpfile]), {stdio: [0]})
  aiffWriter.on('close', function() {
    var flacStream = spawn('sox', [tmpfile, '-t', 'flac', '-'])
    cb(false, flacStream)
  })
}

function flacConvertStream(args, stream) {
  var flacStream = spawn('sox', args.concat(['-', '-t', 'flac', '-']))
  process.stdin.pipe(flacStream.stdin)
  return flacStream
}

function stenographify(flacStream) {
  var totallyOpenVoiceEncodingAPI = "https://www.google.com/speech-api/v1/recognize?xjerr=1&client=chromium&lang=en-US"
  var upload = request.post({'url': totallyOpenVoiceEncodingAPI, "headers": {"content-type": "audio/x-flac; rate=16000"}})
  flacStream.stdout.pipe(upload).pipe(process.stdout)
}