<template>
  <main>
    <ChatWidget></ChatWidget>
    <StreamAlerts></StreamAlerts>
  </main>
</template>

<script>
import ChatWidget from '../components/ChatWidget.vue'
import StreamAlerts from '../components/StreamAlerts.vue'

export default {
  name: 'Home',
  components: { ChatWidget, StreamAlerts },
  data() {
    return {
      messagesToDisplay: []
    }
  },
  created: function() {
    // if no access_token cookie is present, redirect to login
    if (!this.$cookies.get('access_token')) {
      this.$router.push('/login')
    }
  }
}
</script>