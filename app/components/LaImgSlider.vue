<script setup lang="ts">
const props = defineProps<{
  images: Image[],
}>()

interface Image {
  url: string
}

const active = ref(0);
const next = () => {
  if (props.images.length > active.value + 1)
    active.value += 1;
  else
    active.value = 0;
}

const previous = () => {
  if (active.value - 1 >= 0)
    active.value -= 1;
  else
    active.value = props.images.length - 1;
}

</script>

<template>
  <div class="img-slider">
    <img v-for="(image, i) in images" :src="image.url" alt="" :class="{ active: i === active }" loading="lazy">
    <div class="img-nav">
      <span v-for="(image, i) in images" class="img-dot" :class="{ active: i === active }" ></span>
    </div>
    <button class="img-btn prev" @click="previous">‹</button>
    <button class="img-btn next" @click="next">›</button>
    <div class="img-badges">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* Image slider */
.img-slider {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: #111;
}
.img-slider img {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.img-slider img.active { opacity: 1; }

.img-nav {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 4px;
  z-index: 2;
}
.img-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255,255,255,0.35);
  cursor: pointer;
  transition: background 0.2s;
}
.img-dot.active { background: rgba(255,255,255,0.9); }

.img-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.45);
  color: #fff;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.img-slider:hover .img-btn { opacity: 1; }
.img-btn.prev { left: 8px; }
.img-btn.next { right: 8px; }

/* Badges on image */
.img-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
  z-index: 2;
}
</style>