# Twitch bot

yeah so basically this is a backend version of what i'm already trying to build, but this is focusing on command responses on the backend level with audio playback, command responses etc. eventually want to add twitch api stuff to have commands be able to control elements of the stream

you'll have to make a `.env` file with the below variables filled out:
```
# lowercase name of twitch username you want to know about
TWITCH_NICK=
# oauth access token you get from making a twitch dev app, and then use the oauth request url with some scopes to get the access token
TWITCH_ACCESS_TOKEN=
```

also `npm install` silly

`npm run start` builds and serves front end, `npm run dev` starts nodemon process `:)`

any file you add to the sounds directory will be read and loaded in as a command, using `![filename]` as the command. i haven't tested putting anything other than an mp3 in there but it uses mplayer to play the audio file so make sure u have that silly