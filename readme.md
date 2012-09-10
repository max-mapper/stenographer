highly advanced voice recognition software powered by the googles and written with Java scripts

requires `sox` so you have to `brew install sox` first

also requires `say` so you have to have a mac

for funtimes:

    npm install stenographer -g
    stenographer hello yes this is dog
    
you fill find this out after playing with it but it works awesomely:

    input: I was seated by the shore of a small pond, about a mile and a half south
    of the village of Concord and somewhat higher than it

    output: sure porn porn Baltimore we are strong enough to prune trees call someone porn

you can also pipe in raw audio (use -t to specify input format):

    cat hello.mp3 | stenographer -t mp3

BSD LICENSED (EAST BAY REPRESENT!)