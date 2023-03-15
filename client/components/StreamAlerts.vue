<template>
  <div class='streamAlert'>
    
  </div>
</template>

<script>
// build notification class and queue
class Notification {
  action = ''
  user = ''
  constructor(messageData) {
    this.messageData = messageData
    this.createMessage()
  }
  static channelEvents = [
    {
      'type': 'channel.follow',
      'version': '1',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      },
      'message': 'Thank you %USER% for the follow!'
    },
    {
      'type': 'channel.update',
      'version': '1',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    {
      'type': 'channel.raid',
      'version': '1',
      'condition': {
        'to_broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    {
      'type': 'channel.goal.begin',
      'version': '1',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    {
      'type': 'channel.goal.progress',
      'version': '1',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    {
      'type': 'channel.goal.end',
      'version': '1',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    {
      'type': 'channel.shoutout.create',
      'version': 'beta',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`,
        'moderator_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    {
      'type': 'stream.online',
      'version': '1',
      'condition': {
        'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
      }
    },
    // the below only matters if i get affiliate... KEKW
    // {
    //   'type': 'channel.poll.begin',
    //   'version': '1',
    //   'condition': {
    //     'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //   }
    // },
    // {
    //   'type': 'channel.poll.progress',
    //   'version': '1',
    //   'condition': {
    //     'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //   }
    // },
    // {
    //   'type': 'channel.poll.end',
    //   'version': '1',
    //   'condition': {
    //     'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //   }
    // },
    // {
    //   'type': 'channel.prediction.begin',
    //   'version': '1',
    //   'condition': {
    //     'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //   }
    // },
    // {
    //   'type': 'channel.prediction.progress',
    //   'version': '1',
    //   'condition': {
    //     'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //   }
    // },
    // {
    //   'type': 'channel.prediction.end',
    //   'version': '1',
    //   'condition': {
    //     'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //   }
    // },
    // {
    //   'type': 'channel.channel_points_custom_reward.add',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
    // {
    //   'type': 'channel.channel_points_custom_reward.update',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
    // {
    //   'type': 'channel.channel_points_custom_reward.remove',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
    // {
    //   'type': 'channel.channel_points_custom_reward_redemption.add',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
    // {
    //   'type': 'channel.subscribe',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
    // {
    //   'type': 'channel.subscription.gift',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
    // {
    //   'type': 'channel.subscription.message',
    //   'version': '1',
    //   'condition': {
    //      'broadcaster_user_id': `${import.meta.env.VITE_TWITCH_USER_ID}`
    //    }
    // },
  ]
  static createMessage() {
    console.log(this.messageData)
    const templateTags = [
      { tag: '%USER%', replacement: `<span class='notification-username'>${this.user}</span>` }
    ]
    let message = ''
    console.log(this.channelEvents)
    this.channelEvents.forEach(channelEvent => {
      if (this.messageData.metadata.subscription_type == channelEvent.type) {
        message = channelEvent.message;
        // templateTags.forEach(templateTag => {
        //   message = message.replace(templateTag.tag, templateTag.replacement)
        // })
      }
    })
    return message;
  }
}

export default {
  name: 'StreamAlerts',
  data() {
    return {
      alertQueue: [],
      channelEvents: Notification.channelEvents
    }
  },
  methods: {
    subscribeToEvents: function(sessionId) {
      const that = this;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${that.accessToken}`,
        'Client-Id': `${import.meta.env.VITE_TWITCH_CLIENT_ID}`
      }
      that.channelEvents.forEach(eventType => {
        const bodyData = {
          'type': eventType.type,
          'version': eventType.version,
          'condition': eventType.condition,
          'transport': {
            'method': 'websocket',
            'session_id': sessionId
          }
        }
        fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(bodyData)
        })
        .catch((error) => {
          console.error(`error subscribing to ${eventType.type}`, error)
        })
      })
    },
    handleEventsubNotification: function(messageData) {
      const notification = new Notification(messageData)
      console.log(notification.createMessage())
      // console.log(messageData)
    },
    handleEventsubReconnection: function(messageData) {
      console.log(`must reconnect using ${messageData}`)
      this.eventConnection.close();
      this.eventConnection = new WebSocket(messageData.payload.session.reconnect_url)
    }
  },
  created: function() {
    const that = this;

    // save access_token cookie
    this.accessToken = this.$cookies.get('access_token')

    this.eventConnection = new WebSocket('wss://eventsub-beta.wss.twitch.tv/ws');
    this.eventConnection.onopen = function(event) {
      console.log('Successfully connected to the EventSub websocket server...');
    }
    this.eventConnection.onmessage = function(event) {
      let messageData = JSON.parse(event.data)

      switch (messageData.metadata.message_type) {
        case 'session_welcome':
          that.subscribeToEvents(messageData.payload.session.id);
          break;
        case 'notification':
          that.handleEventsubNotification(messageData)
          break;
        case 'session_reconnect':
          that.handleEventsubReconnection(messageData)
          break;
        default:
          ;
      }
      // console.log(messageData)
    }
  }
}
</script>