<template>
  <main>
    <ChatWidget></ChatWidget>
    <!-- <StreamAlerts></StreamAlerts> -->
  </main>
</template>

<script>
import Cookies from 'universal-cookie';

import ChatWidget from '../components/ChatWidget.vue'
import StreamAlerts from '../components/StreamAlerts.vue'

export default {
  name: 'Home',
  setup() {
    const cookies = new Cookies()
    return {
      cookies
    }
  },
  components: { ChatWidget, StreamAlerts },
  data() {
    return {
      messagesToDisplay: []
    }
  },
  methods: {
  }
}
</script>