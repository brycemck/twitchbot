<template>
  <main>
    <a :href="grant_url">
      <button>Login to Twitch</button>
    </a>
  </main>
</template>

<script>
import Cookies from 'universal-cookie';

const base_url = 'https://id.twitch.tv/oauth2/authorize'
const client_id = import.meta.env.VITE_TWITCH_CLIENT_ID
const redirect_uri = 'http://localhost:3000/login?response=true'
const scope = 'chat%3Aread+chat%3Aedit+channel%3Aread%3Asubscriptions+channel%3Aread%3Aredemptions+channel%3Aread%3Apolls+channel%3Aread%3Apredictions+channel%3Aread%3Agoals+moderator%3Aread%3Ashoutouts'

export default {
  name: 'Login',
  setup() {
    const cookies = new Cookies()
    return {
      cookies
    }
  },
  data() {
    return {
      grant_url: `${base_url}?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`,
    }
  },
  methods: {
    // getTwitchUserInfo(accessToken) {
      // const twitchUserAPI = 'https://api.twitch.tv/helix/users';
      // const twitchUserName = encodeURIComponent(import.meta.env.VITE_TWITCH_CHANNEL)

      // const userFetch = fetch(twitchUserAPI + `?login=${twitchUserName}`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`,
      //     'Client-Id': `${import.meta.env.VITE_TWITCH_CLIENT_ID}`
      //   }
      // })
      //   .then((res) => res.json())
      //   .catch((error) => {
      //     console.log(`Error when receiving Twitch user information`, error);
      //   })
      
      // userFetch.then(data => {
      //   // this.authStore.updateTwitchInfo(data);
      //   // this.authStore.login();
      // })
    // }
  },
  created: function() {
    if (this.cookies.get('access_token')) {
      this.$router.push('/')
    }
    if (this.$route.query.code) { // code received in url params, save it and redirect
      let hash = this.$route.query.code;
      this.cookies.set('access_token', hash)
      console.log('setting access_token cookie')
      this.$router.push('/')

      // this.getTwitchUserInfo(hash.get('access_token'));
    }
  }
}
</script>