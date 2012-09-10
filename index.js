#!/usr/bin/env node

var request = require('request')
var os = require('os')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn;
var concat = require('concat-stream')

var trimStart = process.env['TRIMSTART'] || 0
var chunkSize = process.env['CHUNKSIZE'] || 10
chunkSize = +chunkSize
trimStart = +trimStart
var trimEnd = trimStart + chunkSize

var args = process.argv.slice(2, process.argv.length)
if (process.stdin.isTTY) {
  synthesizeAudio(args, function(err, flacStream) {
    var sampleRate = 22500 // default for mac osx `say` command
    stenographify(flacStream, sampleRate, logResults)
  })
} else {
  var concatStream = concat(processAudio)
  concatStream.on('error', function(err) {
    console.log('concatstream err', err)
  })
  process.stdout.on('error', logResults)
  process.stdin.on('error', logResults)
  process.on('error', logResults)
  process.stdin.pipe(concatStream)
}

function processAudio(err, audio) {
  var sampleRate
  var duration
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
    var flacStream = flacConvertStream(args, trimStart, trimEnd)
    stenographify(flacStream, audio, sampleRate, function(err, output) {
      if (err) process.stderr.write(err)
      else process.stdout.write(output + " ")
      if (trimEnd < duration) {
        trimStart += chunkSize
        trimEnd += chunkSize
        convert()
      }
    })
  }
}

function logResults(err, output) {
  if (err) return console.log(err)
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
  durationStream.stdin.on('error', function(err) { return })
  durationStream.stdin.write(audio)
  durationStream.stderr.pipe(process.stdout)
  durationStream.stdout.pipe(concat(function(err, duration) {
    if (err) return cb(err)
    cb(false, Math.floor(parseFloat(duration.toString())) + 1)
  }))
}

function getSampleRate(audio, cb) {
  var sampleStream = spawn('soxi', ['-r', '-'])
  sampleStream.stdin.on('error', function(err) { return })
  sampleStream.stdin.write(audio)
  sampleStream.stderr.pipe(process.stdout)
  sampleStream.stdout.pipe(concat(function(err, sampleRate) {
    if (err) return cb(err)
    return cb(false, parseFloat(sampleRate.toString()))
  }))
}

function flacConvertStream(args, start, end) {
  var flacStream = spawn('sox', args.concat(['-', '-t', 'flac', '-', 'trim', start, end - start]))
  flacStream.stdin.on('error', function(err) { return })
  flacStream.stdout.on('error', function(err) { return })
  // flacStream.stdout.pipe(fs.createWriteStream(start + '-' + end + '.flac'))  
  return flacStream
}

function stenographify(flacStream, audio, sampleRate, cb) {
  var totallyOpenVoiceEncodingAPI = "https://www.google.com/speech-api/v1/recognize?xjerr=1&client=chromium&lang=en-US"
  var opts = {'url': totallyOpenVoiceEncodingAPI, "headers": {"content-type": "audio/x-flac; rate=" + sampleRate.toString().split('\n')[0]}}
  var upload = request.post(opts)
  upload.on('error', function(err) { return })
  flacStream.stdout.pipe(upload).pipe(concat(function(err, resp) {
    if (err) return cb(err)
    resp = resp.toString()
    try {
      var output = JSON.parse(resp)
    } catch(e) {
      var output = resp
    }
    if ( output.hypotheses ) {
      if ( output.hypotheses.length === 0 ) return cb(false, "")
      output = output.hypotheses[0].utterance
      return cb(false, output)
    }
    cb(output.toString())
  }))
  flacStream.stdin.write(audio)
}
