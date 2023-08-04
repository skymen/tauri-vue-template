<script setup></script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="slide-y" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style scoped>
.slide-y-enter-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-y-enter-from,
.slide-y-leave-to {
  transform: translateY(15px);
  opacity: 0;
}
.slide-y-enter-to,
.slide-y-leave-from {
  transform: translateY(0);
  opacity: 1;
}

#app {
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
}

body {
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
}

html {
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
}
</style>
