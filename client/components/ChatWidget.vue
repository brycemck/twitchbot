<!-- TODO -->
<!--
  - add support for 7TV and BTTV
  - test what happens when mod removes a message or clears chat
  - theme support? (black vs white text color)
-->

<template>
  <aside>
    <p v-for="(message, x) in messagesToDisplay" :key="x">
      <span v-if="message.tags.badgesList" class="badges">
        <span v-for="badge in message.tags.badgesList" :key="badge" class="badge" :class="badge+'-badge'"></span>
      </span>
      <span class="chatter-name" :style="'color: '+ message.tags.color +';'">{{ message.tags['display-name'] }}</span>
      <span class="chat-content" v-html="message.parameters"></span>
    </p>
  </aside>
</template>

<style scoped>
aside {
  width: 400px;
  padding: 15px;
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  overflow-x: hidden;
}
p {
  margin: 3px 0;
}
.badges {
  display: inline-block;
  height: 16px;
}
.badge {
  position: relative;
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 3px;
  top: 3px;
  background-repeat: no-repeat;
  background-size: cover;
}
.badge:last-child {
  margin-right: 5px;
}
.chatter-name {
  position: relative;
  font-weight: 900;
  padding-right: 7px;
  font-size: 17px;
  top: 1px;
}
.chat-content {
  position: relative;
  top: -1px;
}
</style>

<script>
export default {
  name: 'ChatWidget',
  data() {
    return {
      messageLimit: 15,
      messagesToDisplay: [],
      bttvEmotes: null,
      sevenTvEmotes: [],
      sevenTvEmoteSets: null
    }
  },
  methods: {
    sendMessage: function(msg) {
      this.chatConnection.send(msg);
    },
    parseTags: function(tags) {
      // badge-info=;badges=broadcaster/1;color=#0000FF;...
      const tagsToIgnore = {  // List of tags to ignore.
        'client-nonce': null,
        'flags': null
      };

      let dictParsedTags = {};  // Holds the parsed list of tags.
                    // The key is the tag's name (e.g., color).
      let parsedTags = tags.split(';'); 

      parsedTags.forEach(tag => {
        let parsedTag = tag.split('=');  // Tags are key/value pairs.
        let tagValue = (parsedTag[1] === '') ? null : parsedTag[1];

        switch (parsedTag[0]) {  // Switch on tag name
          case 'badges':
          case 'badge-info':
            // badges=staff/1,broadcaster/1,turbo/1;

            if (tagValue) {
              let dict = {};  // Holds the list of badge objects.
                      // The key is the badge's name (e.g., subscriber).
              let badges = tagValue.split(','); 
              badges.forEach(pair => {
                let badgeParts = pair.split('/');
                dict[badgeParts[0]] = badgeParts[1];
              })
              dictParsedTags[parsedTag[0]] = dict;
            }
            else {
              dictParsedTags[parsedTag[0]] = null;
            }
            break;
          case 'emotes':
            // emotes=25:0-4,12-16/1902:6-10

            if (tagValue) {
              let dictEmotes = {};  // Holds a list of emote objects.
                          // The key is the emote's ID.
              let emotes = tagValue.split('/');
              emotes.forEach(emote => {
                let emoteParts = emote.split(':');

                let textPositions = [];  // The list of position objects that identify
                            // the location of the emote in the chat message.
                let positions = emoteParts[1].split(',');
                positions.forEach(position => {
                  let positionParts = position.split('-');
                  textPositions.push({
                    startPosition: positionParts[0],
                    endPosition: positionParts[1]    
                  })
                });

                dictEmotes[emoteParts[0]] = textPositions;
              })

              dictParsedTags[parsedTag[0]] = dictEmotes;
            }
            else {
              dictParsedTags[parsedTag[0]] = null;
            }

            break;
          case 'emote-sets':
            // emote-sets=0,33,50,237

            let emoteSetIds = tagValue.split(',');  // Array of emote set IDs.
            dictParsedTags[parsedTag[0]] = emoteSetIds;
            break;
          default:
            // If the tag is in the list of tags to ignore, ignore
            // it; otherwise, add it.

            if (tagsToIgnore.hasOwnProperty(parsedTag[0])) { 
              ;
            }
            else {
              dictParsedTags[parsedTag[0]] = tagValue;
            }
        } 
      });
      return dictParsedTags;
    },
    parseCommand: function(rawCommandComponent) {
      let parsedCommand = null;
      let commandParts = rawCommandComponent.split(' ');

      switch (commandParts[0]) {
        case 'JOIN':
        case 'PART':
        case 'NOTICE':
        case 'CLEARCHAT':
        case 'HOSTTARGET':
        case 'PRIVMSG':
          parsedCommand = {
            command: commandParts[0],
            channel: commandParts[1]
          }
          break;
        case 'PING':
          parsedCommand = {
            command: commandParts[0]
          }
          break;
        case 'CAP':
          parsedCommand = {
            command: commandParts[0],
            isCapRequestEnabled: (commandParts[2] === 'ACK') ? true : false,
            // The parameters part of the messages contains the 
            // enabled capabilities.
          }
          break;
        case 'GLOBALUSERSTATE':  // Included only if you request the /commands capability.
                      // But it has no meaning without also including the /tags capability.
          parsedCommand = {
            command: commandParts[0]
          }
          break;               
        case 'USERSTATE':   // Included only if you request the /commands capability.
        case 'ROOMSTATE':   // But it has no meaning without also including the /tags capabilities.
          parsedCommand = {
            command: commandParts[0],
            channel: commandParts[1]
          }
          break;
        case 'RECONNECT':  
          console.log('The Twitch IRC server is about to terminate the connection for maintenance.')
          parsedCommand = {
            command: commandParts[0]
          }
          break;
        case '421':
          console.log(`Unsupported IRC command: ${commandParts[2]}`)
          return null;
        case '001':  // Logged in (successfully authenticated). 
          parsedCommand = {
            command: commandParts[0],
            channel: commandParts[1]
          }
          break;
        case '002':  // Ignoring all other numeric messages.
        case '003':
        case '004':
        case '353':  // Tells you who else is in the chat room you're joining.
        case '366':
        case '372':
        case '375':
        case '376':
          // console.log(`numeric message: ${commandParts[0]}`)
          return null;
        default:
          console.log(`\nUnexpected command: ${commandParts[0]}\n`);
          return null;
      }
      return parsedCommand;
    },
    parseSource: function(rawSourceComponent) {
      if (null == rawSourceComponent) {  // Not all messages contain a source
        return null;
      }
      else {
        let sourceParts = rawSourceComponent.split('!');
        return {
          nick: (sourceParts.length == 2) ? sourceParts[0] : null,
          host: (sourceParts.length == 2) ? sourceParts[1] : sourceParts[0]
        }
      }
    },
    parseParameters: function(rawParametersComponent, command) {
      let idx = 0
      let commandParts = rawParametersComponent.slice(idx + 1).trim(); 
      let paramsIdx = commandParts.indexOf(' ');

      if (-1 == paramsIdx) { // no parameters
        command.botCommand = commandParts.slice(0); 
      }
      else {
        command.botCommand = commandParts.slice(0, paramsIdx); 
        command.botCommandParams = commandParts.slice(paramsIdx).trim();
        // TODO: remove extra spaces in parameters string
      }

      return command;
    },
    parseMessage: function(message) {
      const that = this;
      let parsedMessage = {  // Contains the component parts.
        tags: null,
        source: null,
        command: null,
        parameters: null
      };

      // The start index. Increments as we parse the IRC message.

      let idx = 0; 

      // The raw components of the IRC message.

      let rawTagsComponent = null;
      let rawSourceComponent = null; 
      let rawCommandComponent = null;
      let rawParametersComponent = null;

      // If the message includes tags, get the tags component of the IRC message.

      if (message[idx] === '@') {  // The message includes tags.
        let endIdx = message.indexOf(' ');
        rawTagsComponent = message.slice(1, endIdx);
        idx = endIdx + 1; // Should now point to source colon (:).
      }

      // Get the source component (nick and host) of the IRC message.
      // The idx should point to the source part; otherwise, it's a PING command.

      if (message[idx] === ':') {
        idx += 1;
        let endIdx = message.indexOf(' ', idx);
        rawSourceComponent = message.slice(idx, endIdx);
        idx = endIdx + 1;  // Should point to the command part of the message.
      }

      // Get the command component of the IRC message.

      let endIdx = message.indexOf(':', idx);  // Looking for the parameters part of the message.
      if (-1 == endIdx) {                      // But not all messages include the parameters part.
        endIdx = message.length;                 
      }

      rawCommandComponent = message.slice(idx, endIdx).trim();

      // Get the parameters component of the IRC message.

      if (endIdx != message.length) {  // Check if the IRC message contains a parameters component.
        idx = endIdx + 1;            // Should point to the parameters part of the message.
        rawParametersComponent = message.slice(idx);
      }

      // Parse the command component of the IRC message.

      parsedMessage.command = that.parseCommand(rawCommandComponent);

      // Only parse the rest of the components if it's a command
      // we care about; we ignore some messages.

      if (null == parsedMessage.command) {  // Is null if it's a message we don't care about.
        return null; 
      }
      else {
        if (null != rawTagsComponent) {  // The IRC message contains tags.
          parsedMessage.tags = that.parseTags(rawTagsComponent);
        }

        parsedMessage.source = that.parseSource(rawSourceComponent);

        parsedMessage.parameters = rawParametersComponent;
        if (rawParametersComponent && rawParametersComponent[0] === '!') {  
          // The user entered a bot command in the chat window.            
          parsedMessage.command = that.parseParameters(rawParametersComponent, parsedMessage.command);
        }
      }

      return parsedMessage;
    },
    getBTTVEmotes: function(providerId) {
      this.bttvEmotes = fetch(`https://api.betterttv.net/3/cached/users/twitch/${providerId}`)
        .then((response) => response.json())
        .then((data) => {
          return data
        })
        .catch((error) => {
          console.error(error)
        })
    },
    getSevenTvEmoteSets: function(userId) {
      const that = this;
      this.sevenTvEmoteSets = fetch(`https://7tv.io/v3/users/${userId}`)
        .then((response) => response.json())
        .then((data) => {
          let emoteSets = []

          data.emote_sets.forEach(emoteSet => {
            emoteSets.push(emoteSet)
          })

          that.sevenTvEmoteSets = emoteSets;
          that.getSevenTvEmotes();
          return data
        })
        .catch((error) => {
          console.error(error)
        })
    },
    getSevenTvEmotes: function() {
      const that = this;
      this.sevenTvEmoteSets.forEach(emoteSet => {
        const emoteSetFetch = fetch(`https://7tv.io/v3/emote-sets/${emoteSet.id}`)
          .then((response) => response.json())
          .then((data) => {
            return data
          })
          .catch((error) => {
            console.error(error)
          })
        
        emoteSetFetch.then((result) => {
          let emotes = []
          result.emotes.forEach(emote => {
            emotes.push(emote);
          })
          that.sevenTvEmotes.push(emotes)
        })
      })
    },
    newMessage: function(message) {
      // parse badges
      if (message.tags.badges) {
        message.tags.badgesList = []
        for (let key in message.tags.badges) {
          let keyName = '';
          // some keys need to be reworded to fit icon names and class names
          switch (key) {
            case 'moderator':
              keyName = 'moderator';
              break;
            case 'broadcaster':
              keyName = 'broadcaster';
              break;
            case 'turbo':
              keyName = 'turbo';
              break;
            case 'verified':
              keyName = 'verified';
              break;
            case 'vip':
              keyName = 'vip';
              break;
            case 'no_audio':
              keyName = 'no_audio';
              break;
            case 'no_video':
              keyName = 'no_video';
              break;
            case 'premium':
              keyName = 'prime';
              break;
            case 'artist-badge':
              keyName = 'artist'
              break;
            default:
              break;
          }
          message.tags.badgesList.push(keyName)
        }
      }
      // parse global emotes
      if (message.tags.emotes) {
        console.log(message.tags.emotes)

        // save original message
        const originalMessage = message.parameters;
        let newMessage = originalMessage;

        for (const emote in message.tags.emotes) { // for each different emote
          // get the first instance of this emote's start and end position, extract the text used to call the emote,
          // and replace every instance of that string with the url
          const emoteText = originalMessage.substring(message.tags.emotes[emote][0].startPosition, parseInt(message.tags.emotes[emote][0].endPosition)+1) + ' ';
          const emoteImg = `<img src='https://static-cdn.jtvnw.net/emoticons/v2/${emote}/default/light/1.0' class='chat-emote' alt='${emoteText}' /> `;
          
          newMessage = newMessage.replaceAll(emoteText, emoteImg);
        }

        // replace message content with new message in message object
        message.parameters = newMessage;
      }
      
      // BTTV checks
      if (import.meta.env.VITE_BTTV_PROVIDER_ID) {
        this.bttvEmotes.then((result) => {
          const originalMessage = message.parameters;
          let newMessage = originalMessage;
          let emotesArray = [];

          result.channelEmotes.forEach(emote => {
            emotesArray.push(emote)
          });
          result.sharedEmotes.forEach(emote => {
            emotesArray.push(emote)
          });
          emotesArray.forEach(emote => {
            newMessage = newMessage.replaceAll(emote.code, `<img src='https://cdn.betterttv.net/emote/${emote.id}/1x' class='chat-emote' alt='${emote.code}' />`);
          });

        if (newMessage === originalMessage) return;
        
        console.log('contained BTTV emote!')
        message.parameters = newMessage;
      });

      // 7TV checks
      if (import.meta.env.VITE_7TV_PROVIDER_ID) {
        this.sevenTvEmotes[0].forEach(emote => {
          const originalMessage = message.parameters;
          let newMessage = originalMessage;

          newMessage = newMessage.replaceAll(emote.data.name, `<img src='https:${emote.data.host.url}/1x' class='chat-emote' alt='${emote.data.name}' />`)
          message.parameters = newMessage;
        });
      }

      // limit messages that can be displayed at once, remove the first message in the array of messages if at the limit
      if (this.messagesToDisplay.length == this.messageLimit) this.messagesToDisplay.shift();
      this.messagesToDisplay.push(message);
    }
    },
  },
  created: function() {
    const that = this;
    
    // save access_token cookie
    this.accessToken = this.$cookies.get('access_token')

    // BTTV fetch
    if (import.meta.env.VITE_BTTV_PROVIDER_ID) this.getBTTVEmotes(import.meta.env.VITE_BTTV_PROVIDER_ID);
    
    // 7TV fetch
    if (import.meta.env.VITE_7TV_USER_ID) this.getSevenTvEmoteSets(import.meta.env.VITE_7TV_USER_ID);

    this.chatConnection = new WebSocket('ws://irc-ws.chat.twitch.tv:80')
    this.chatConnection.onopen = function(event) {
      console.log("Successfully connected to the echo websocket server...")

      // request chat capabilities, provide password (oauth access token) and nickname for user logging into channel
      that.sendMessage('CAP REQ : twitch.tv/tags twitch.tv/commands ')
      that.sendMessage(`PASS oauth:${that.accessToken}`);
      that.sendMessage(`NICK ${import.meta.env.VITE_TWITCH_NICK}`);
    }
    this.chatConnection.onmessage = function(event) {
      // might be multiple twitch messages in one WS message, so separate them out and loop through
      let messages = event.data.trimEnd().split('\r\n');
      messages.forEach(message => {
        let parsedMessage = that.parseMessage(message);
        if(parsedMessage) {
          // switch the different kinds of twitch IRC messages
          switch (parsedMessage.command.command) {
            case 'PRIVMSG': // message sent in channel
              // send message to child ChatWidget
              console.log(parsedMessage)
              that.newMessage(parsedMessage);
              break;
            case 'PING': // send PONG response to PING to verify active connection
              that.sendMessage('PONG ' + message.parameters);
              break;
            case '001': // IRC code for successful login
              console.log('Login successful, joining channel.')
              that.sendMessage(`JOIN #${import.meta.env.VITE_TWITCH_CHANNEL}`);
              break;
            case 'PART':
              console.error('The channel must have banned the bot.');
              this.chatConnection.close()
              break;
            default:
              ;
          }
        }
      })
    }
  },
  destroyed: function() {

  }
}
</script>