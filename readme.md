highly advanced voice recognition software powered by the googles and written with Java scripts

requires `sox` so you have to `brew install sox` first

also requires `say` so you have to have a mac

for funtimes:

    npm install stenographer -g
    stenographer hello yes this is dog
    
here is some example input and output:

    input: I was seated by the shore of a small pond, about a mile and a half south of the village of Concord and somewhat higher than it
    
    output: I was heated by the shore the small pond about a mile and a half south of the villages Concord and somewhat tired and it

you can also pipe in raw audio (use -t to specify input format):

    cat hello.wav | stenographer -t wav

if the audio you pipe in is longer than 10 seconds it will automatically get chunked and processed 10 seconds at a time. googles servers return errors if you upload large files but 5-10 second clips work okay

you can control the chunk size and beginning offset using environment variables:

    cat longaudio.wav | TRIMSTART=50 CHUNKSIZE=10 stenographer -t wav

if you get errors regarding input format try converting your input file to a wav first: `sox input.mp3 output.wav`

BSD LICENSED (EAST BAY REPRESENT!)