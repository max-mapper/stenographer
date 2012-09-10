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
    var sampleRate = 22500 // default for mac osx `say` command
    stenographify(flacStream, sampleRate, logResults)
  })
} else {
  process.stdin.pipe(concat(function(err, audio) {
    var sampleRate
    var duration
    var trimStart = process.env['TRIMSTART'] || 0
    var chunkSize = process.env['CHUNKSIZE'] || 10
    chunkSize = +chunkSize
    trimStart = +trimStart
    var trimEnd = trimStart + chunkSize
    getDuration(audio, function(err, _duration) {
      if (err) console.error(err)
      duration = _duration
      if (sampleRate) convert()
    })
    getSampleRate(audio, function(err, _sampleRate) {
      if (err) console.error(err)
      sampleRate = _sampleRate
      if (duration) convert()
    })
    function convert() {
      var flacStream = flacConvertStream(args, audio, trimStart, trimEnd)
      stenographify(flacStream, sampleRate, function(err, output) {
        if (err) return console.log(err)
        if (trimEnd < duration) {
          trimStart += chunkSize
          trimEnd += chunkSize
          convert()
        }
      })
    }
  }))
}

function logResults(err, output) {
  if (err) return console.error(err)
  console.log(output)
}

function synthesizeAudio(words, cb) {
  var tmpfile = path.join(os.tmpDir(), 'pizza.aiff')
  var aiffWriter = spawn('say', words.concat(['-o', tmpfile]), {stdio: [0]})
  aiffWriter.on('close', function() {
    var flacStream = spawn('sox', [tmpfile, '-t', 'flac', '-'])
    cb(false, flacStream)
  })
}

function getDuration(audio, cb) {
  var durationStream = spawn('soxi', ['-D', '-'])
  durationStream.stdin.write(audio)
  durationStream.stderr.pipe(process.stdout)
  durationStream.stdout.pipe(concat(function(err, duration) {
    if (err) return cb(err)
    cb(false, Math.floor(parseFloat(duration.toString())) + 1)
  }))
}

function getSampleRate(audio, cb) {
  var sampleStream = spawn('soxi', ['-r', '-'])
  sampleStream.stdin.write(audio)
  sampleStream.stderr.pipe(process.stdout)
  sampleStream.stdout.pipe(concat(function(err, sampleRate) {
    if (err) return cb(err)
    return cb(false, parseFloat(sampleRate.toString()))
  }))
}

function flacConvertStream(args, audio, start, end) {
  var flacStream = spawn('sox', args.concat(['-', '-t', 'flac', '-', 'trim', start || '0', end || '10']))
  flacStream.stdin.write(audio)
  return flacStream
}

function stenographify(flacStream, sampleRate, cb) {
  var totallyOpenVoiceEncodingAPI = "https://www.google.com/speech-api/v1/recognize?xjerr=1&client=chromium&lang=en-US"
  var upload = request.post({'url': totallyOpenVoiceEncodingAPI, "headers": {"content-type": "audio/x-flac; rate=" + sampleRate.toString().split('\n')[0]}})
  flacStream.stdout.pipe(upload).pipe(concat(function(err, resp) {
    var output = JSON.parse(resp)
    if (output.hypotheses && output.hypotheses.length > 0 && output.hypotheses[0].utterance) output = output.hypotheses[0].utterance
    cb(false, output)
  }))    
}
