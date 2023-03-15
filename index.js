require('dotenv').config()
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');

const express = require('express');
const app = express();
const host = 'http://localhost';
const port = 3000;

const logsPath = path.join(__dirname, '.', 'logs');

// logger function
// pretty console.log output depending on type code (0 is debug, 1 is error) and logging to a txt file as well
const Logger = function(msg, type) {
  type = type ? type : 0; // default to 0 if not specified
  let timestamp = new Date();
  let timedatestring = `${timestamp.toDateString()} ${timestamp.toTimeString().split(' ')[0]} ${timestamp.toTimeString().split(' ')[1]}`
  let daystring = `${timestamp.getFullYear()}${timestamp.getMonth()}${timestamp.getDate()}`

  fs.writeFile(`${logsPath}/${daystring}.txt`, `\n${type == 0 ? '[DEBUG]' : '[ERROR]'} ${timedatestring}: ${msg}`, { flag: 'a' }, function (err) {
    if (err) throw err;
  });

  switch (type) {
    default:
    case 0:
      console.log(chalk.gray(timedatestring) + ': ' + chalk.green(msg))
      break;
    case 1:
      console.error(chalk.gray(timedatestring) + ': ' + chalk.red(msg))
      break;
  }
}

// serve up the dist dir
app.use(express.static('dist'));

app.listen(port, () => {
  Logger(`App listening on ${host}:${port}`, 0)
});

class TwitchBot {
  constructor(twitchNick) {
    this.soundsPath = 'sounds'
    this.commandsPath = 'commands'
    this.ChatCommands = new Map()
    this.twitchNick = twitchNick;
  }
  loadSounds = () => {
    let SoundsDir = path.join(__dirname, '.', this.soundsPath);
    fs.readdir(SoundsDir, (err, files) => {
      if (err) Logger(err, 1);
      else
      files.forEach(async (file) => {
        let cmd = {};
        cmd.name = file.split('.')[0].toLowerCase()
        cmd.run = async () => {
          let child = spawn('mplayer', [ SoundsDir + '/' + file, '-volume 40', '-really-quiet' ], {
            cwd: __dirname,
            shell: true
          });
          child.stdout.pipe(process.stdout);
          child.stderr.pipe(process.stderr);
          child.stdin.end();
      
          child.on('exit', (code) => {
            if (code == 0) {
              return;
            } else {
              return `There was an error playing that sound (common celery L).`
            }
          })
        }
        this.ChatCommands.set(file.split('.')[0].toLowerCase(), cmd);
        Logger('Sound loaded: ' + file.split('.')[0], 0);
      });
    });
  }
  loadCommands = () => {
    let CommandsDir = path.join(__dirname, '.', this.commandsPath);
    fs.readdir(CommandsDir, (err, files) => {
      if (err) Logger(err, 1);
      else
      files.forEach(async (file) => {
        let cmd = require(CommandsDir + '/' + file);
        if (!cmd.name || !cmd.description || !cmd.run)
        return Logger(
          'Unable to load command: ' + file.split('.')[0] + '. Reason: file is missing run / name / description properties.'
        , 1);
        this.ChatCommands.set(file.split('.')[0].toLowerCase(), cmd);
        Logger('Command loaded: ' + file.split('.')[0], 0);
      });
    });
  }
  initialize() {
    this.loadSounds();
    this.loadCommands();
  }
}
// build methods that connect to websocket, listen to the channel we want and parse the websocket messages
// extends TwitchBot with twitchNick and ChatCommands passed through

class TwitchChatConnector extends TwitchBot {
  constructor(twitchNick, ChatCommands) {
    super(twitchNick, ChatCommands)
    const that = this;
    this.ready = false;
    this.twitchWS = new WebSocket('ws://irc-ws.chat.twitch.tv:80');
    this.twitchWS.onopen = function (event) { that.wsOnOpen(event) }
    this.twitchWS.onmessage = function (message) { that.wsOnMessage(message); }
  }
  wsOnOpen = (event) => {
    this.twitchWS.send('CAP REQ : twitch.tv/tags twitch.tv/commands ')
    this.twitchWS.send(`PASS oauth:${process.env.TWITCH_ACCESS_TOKEN}`);
    this.twitchWS.send(`NICK ${this.twitchNick}`);
  }
  wsOnMessage = (event) => {
    let messages = event.data.trimEnd().split('\r\n');
    messages.forEach(message => {
      let parsedMessage = this.parseMessage(message);
      if(parsedMessage) {
        // switch the different kinds of twitch IRC messages
        switch (parsedMessage.command.command) {
          case 'PRIVMSG': // message sent in channel
            this.handleChatMessage(parsedMessage)
            break;
          case 'PING': // send PONG response to PING to verify active connection
            this.twitchWS.send('PONG ' + message.parameters);
            break;
          case '001': // IRC code for successful login
            Logger('Login successful, joining channel.', 0)
            this.twitchWS.send(`JOIN #${this.twitchNick}`);
            this.initialize();

            break;
          case 'PART':
            Logger('The channel must have banned the bot.', 1);
            this.twitchWS.close()
            break;
          default:
            ;
        }
      }
    })
  }
  parseTags = (tags) => {
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
  }
  parseCommand = (rawCommandComponent) => {
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
      Logger('The Twitch IRC server is about to terminate the connection for maintenance.', 0)
      parsedCommand = {
        command: commandParts[0]
      }
      break;
      case '421':
      Logger(`Unsupported IRC command: ${commandParts[2]}`, 0)
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
      Logger(`\nUnexpected command: ${commandParts[0]}\n`, 1);
      return null;
    }
    return parsedCommand;
  }
  parseSource = (rawSourceComponent) => {
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
  }
  parseParameters = (rawParametersComponent, command) => {
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
  }
  parseMessage = (message) => {
  
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
  
    parsedMessage.command = this.parseCommand(rawCommandComponent);
  
    // Only parse the rest of the components if it's a command
    // we care about; we ignore some messages.
  
    if (null == parsedMessage.command) {  // Is null if it's a message we don't care about.
      return null; 
    }
    else {
      if (null != rawTagsComponent) {  // The IRC message contains tags.
      parsedMessage.tags = this.parseTags(rawTagsComponent);
      }
  
      parsedMessage.source = this.parseSource(rawSourceComponent);
  
      parsedMessage.parameters = rawParametersComponent;
      if (rawParametersComponent && rawParametersComponent[0] === '!') {  
      // The user entered a bot command in the chat window.            
      parsedMessage.command = this.parseParameters(rawParametersComponent, parsedMessage.command);
      }
    }
  
    return parsedMessage;
  }
  handleChatMessage = (messageData) => {
    if (messageData.parameters.startsWith('!')) {
      // Split commands and arguments from message so they can be passed to functions
      const args = messageData.parameters.slice(1).split(/ +/);
      const commandName = args.shift().toLowerCase();
  
      // If the command isn't in the command folder, move on
      const command = this.ChatCommands.get(commandName)
        || this.ChatCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      if(!command) return;
  
      if (command.args && !args.length) {
        let reply = 'That command requires more details!';
    
        // If we have details on how to use the args, provide them
        if (command.usage) {
          reply += `\nThe proper usage would be: \`!${command.name} ${command.usage}\``;
        }
    
        // Send a reply from the bot about any error encountered
        return this.sendChatMessage(reply);
      }
  
      try {
        // Run the command
        command.run()
        .then(message => {
          if (message) this.sendChatMessage(message);
        });
      } catch(error) {
        this.sendChatMessage('There was an error running that! (common celery L)');
        return console.error(error);
      }
    }
  }
  sendChatMessage = (message) => {
    this.twitchWS.send(`PRIVMSG #${process.env.TWITCH_NICK} :${message}`)
  }
}

const TwitchChatConnection = new TwitchChatConnector(process.env.TWITCH_NICK)