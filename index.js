#!/usr/bin/env node

var request = require('request')
var os = require('os')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn;
var concat = require('concat-stream')
var BufferedStream = require('morestreams').BufferedStream;

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

function getSampleRate(audioStream, cb) {
  var sampleStream = spawn('soxi', ['-r', '-'])
  audioStream.stdout.pipe(sampleStream.stdin)
  sampleStream.stdout.pipe(concat(cb))
}

function flacConvertStream(args, stream) {
  var flacStream = spawn('sox', args.concat(['-', '-t', 'flac', '-']))
  process.stdin.pipe(flacStream.stdin)
  return flacStream
}

function stenographify(flacStream) {
  var bufferedStream = new BufferedStream()
  bufferedStream.pause()
  flacStream.stdout.pipe(bufferedStream)
  getSampleRate(flacStream, function(err, sampleRate) {
    var totallyOpenVoiceEncodingAPI = "https://www.google.com/speech-api/v1/recognize?xjerr=1&client=chromium&lang=en-US"
    var upload = request.post({'url': totallyOpenVoiceEncodingAPI, "headers": {"content-type": "audio/x-flac; rate=" + sampleRate.toString().split('\n')[0]}})
    bufferedStream.pipe(upload).pipe(concat(function(err, resp) {
      console.log(JSON.parse(resp).hypotheses[0].utterance)
    }))    
    bufferedStream.resume()
  })
}
