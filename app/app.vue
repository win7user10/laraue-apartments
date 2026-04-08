<script setup lang="ts">
  import LaImgSlider from "~/components/LaImgSlider.vue";

  const filter = reactive<Filter>(new Filter())
  const advertisements = ref<Advertisement[]>([])
  const route = useRoute()

  import { useInfiniteScroll } from '@vueuse/core'
  const { loadApartments } = useApartmentsApi();
  const { t } = useI18n();

  const lastLoadedOffset = ref<null | number>(null)
  const lastPageLoaded = ref(false)

  const resetAdvertisements = () => {
    advertisements.value = [];
    lastPageLoaded.value = false;
    lastLoadedOffset.value = null;
  }

  const loadAdvertisements = async () => {
    resetAdvertisements();
    await appendNextPagesBatch();
  }

  const appendNextPagesBatch = async () => {
    try {
      isLoading.value = true;
      hasError.value = null;
      const perPage = 21;
      const nextOffset = lastLoadedOffset.value === null ? 0 : lastLoadedOffset.value + 1;
      console.log("Load offset", nextOffset);
      const nextBatchAdvertisements = await loadApartments(filter, nextOffset, perPage);
      advertisements.value.push(...nextBatchAdvertisements);
      lastLoadedOffset.value = nextOffset;
      if (nextBatchAdvertisements.length < perPage)
        lastPageLoaded.value = true;
      hasError.value = false;
    }
    catch (error) {
      hasError.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  const isLoading = ref(false)

  const load = async () => {
    if (!lastPageLoaded.value && !isLoading.value)
      await appendNextPagesBatch();
  }

  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  const formatDate = (date: string) => {
    const result = new Date(Date.parse(date));
    return result.toLocaleDateString()
  }

  const hasError = ref<boolean | null>(false) // null - loading, false - no, true - yes

  // First initialization
  const query = route.query;
  if (query.minPrice)
    filter.minPrice = Number.parseInt(query.minPrice as string);
  if (query.maxPrice)
    filter.maxPrice = Number.parseInt(query.maxPrice as string);
  if (query.minRenovationRating)
    filter.minRenovationRating = Number.parseInt(query.minRenovationRating as string);
  if (query.maxRenovationRating)
    filter.maxRenovationRating = Number.parseInt(query.maxRenovationRating as string);

  await loadAdvertisements();
  watch(() => filter, async () => {
    await loadAdvertisements();
  }, { deep: true });

  const isPriceInMarket = (item: Advertisement) => item.totalPrice < item.predictedMarketPrice;
  const getAddressString = (item: Advertisement) => {
    const parts = [item.cityName, item.address, item.houseNumber];
    return parts.filter(i => i && i.length > 0).join(', ');
  }

  const renoColor = (r: number) => {
    if (r >= 8) return '#5a9e6f';
    if (r >= 7) return '#c9c040';
    if (r >= 6) return '#c9a040';
    return '#c05a5a';
  }

  const opened = reactive(new Set<string>());
  const toggleToggle = (card: Advertisement) => {
    if (isOpened(card))
      opened.delete(getCardKey(card));
    else
      opened.add(getCardKey(card));
  }

  const isOpened = (card: Advertisement) => {
    return opened.has(getCardKey(card));
  }

  const getCardKey = (item: Advertisement) => {
    return item.sourceType + ' ' + item.sourceId
  }

  const orderings = [
    {
      value: 0,
      title: 'Date'
    },
    {
      value: 1,
      title: 'RUB/m2'
    },
    {
      value: 2,
      title: 'm2'
    },
    {
      value: 3,
      title: 'Price'
    },
    {
      value: 4,
      title: 'Renovation'
    },
    {
      value: 5,
      title: 'Rooms'
    }
  ]

  const roomsOptions = [
    {
      value: 0,
      title: 'Studio'
    },
    {
      value: 1,
      title: '1 room'
    },
    {
      value: 2,
      title: '2 rooms'
    },
    {
      value: 3,
      title: '3 rooms'
    },
    {
      value: 4,
      title: '4+ rooms'
    }
  ]

  const ratingOptions = [
    {
      value: null,
      title: 'Any'
    },
    {
      value: 6,
      title: '6+'
    },
    {
      value: 7,
      title: '7+'
    },
    {
      value: 8,
      title: '8+'
    }
  ]

  const toggleRoomsCount = (roomsCount: number) => {
    if (filter.roomsCount.includes(roomsCount)) {
      const index = filter.roomsCount.indexOf(roomsCount);
      filter.roomsCount.splice(index, 1);
    }
    else
      filter.roomsCount.push(roomsCount);
  }

  const toggleSortOrder = (ordering: number) => {
    if (filter.sortBy === ordering)
      filter.sortOrder = filter.sortOrder === 0 ? 1 : 0;
    else {
      filter.sortBy = ordering;
      filter.sortOrder = 0;
    }
  }

  const sentinel  = ref(null)

  onMounted(() => {
    useInfiniteScroll(
        sentinel.value,
        load,
        { distance: 50 })
  })

  useSeoMeta({
    title: computed(() => 'AI-Ranked SPB Apartments'),
    description: computed(() => 'The Cian and Avito advertisements aggregator that automatically rank renovations'),
  })
</script>

<template>
  <div id="filter-bar">
    <div class="filter-bar-inner">
      <div class="filter-top">
        <span class="filter-title">SPB Apartments</span>
        <span class="result-count" id="result-count"></span>
      </div>

      <input v-model="filter.searchString" id="search-input" type="search" placeholder="Search address or description…">

      <div class="filter-row-label">Rooms</div>
      <div class="filter-scroll">
        <span
            v-for="option in roomsOptions"
            class="pill"
            :class="{active: filter.roomsCount.includes(option.value)}"
            @click="toggleRoomsCount(option.value)">
          {{ option.title }}
        </span>
      </div>

      <div class="filter-row-label" style="margin-top:8px">Renovation rating</div>
      <div class="filter-scroll" id="reno-filter">
        <span
          v-for="option in ratingOptions"
          class="pill"
          :class="{active: filter.minRenovationRating === option.value}"
          @click="filter.minRenovationRating = option.value">
          {{ option.title }}
        </span>
      </div>

      <div class="range-row">
        <span class="range-label">Price&nbsp;M₽</span>
        <input v-model="filter.minPrice" class="range-input" id="price-min" type="number" placeholder="Min" min="0">
        <span class="range-sep">–</span>
        <input v-model="filter.maxPrice" class="range-input" id="price-max" type="number" placeholder="Max" min="0">
      </div>

      <div class="sort-row" id="sort-bar">
        <span
          v-for="ordering in orderings"
          class="sort-pill"
          @click="toggleSortOrder(ordering.value)"
          :class="{ active: filter.sortBy === ordering.value }">
          {{ ordering.title }} {{ filter.sortBy === ordering.value && filter.sortOrder === 0 ? '↑' : '↓' }}
        </span>
      </div>
    </div>
  </div>

  <div id="listings" ref="scrollContainer">
    <p class="no-results" v-if="isLoading"><span>⏳</span>Loading…</p>
    <p class="no-results" v-if="!isLoading && advertisements.length === 0">No results</p>

    <!--Card -->
    <div class="card" v-for="card in advertisements" :key="getCardKey(card)">

      <!-- Images -->
      <LaImgSlider :images="card.images">
        <span v-if="card.updatedAt === card.crawledAt" class="badge badge-new">New</span>
        <span v-else class="badge badge-updated">Updated</span>
        <span class="badge badge-source">{{ card.sourceType === 0 ? 'Cian' : 'Avito' }}</span>
      </LaImgSlider>

      <div class="card-body">
        <div class="card-price">{{ moneyFormatter.format(card.totalPrice) }}</div>
        <a :href="card.link" target="_blank" rel="nofollow" class="card-title">
          #{{ card.sourceId }}
        </a>
        <div class="card-address">📍 {{ getAddressString(card) }}</div>
        <div class="metro-row" v-if="card.metroStations.length > 0">
          <div class="metro-dot" :style="{ background: card.metroStations[0]!.color }"></div>
          <span>
            {{ card.metroStations[0]!.name }} · {{ card.metroStations[0]!.distanceInMinutes }}
            min {{ card.metroStations[0]!.distanceType == 0 ? '🚶' : '🚗' }}
          </span>
        </div>
        <div class="card-stats">
          <span class="stat"><span class="stat-icon">⬛</span>{{ card.square }} m²</span>
          <span class="stat">
            <span class="stat-icon">🛏</span>
              {{ card.roomsCount > 0 ? card.roomsCount + ' rooms' : 'studio' }}
            </span>
          <span class="stat"><span class="stat-icon">🏢</span>{{ card.floorNumber }}/{{ card.totalFloorsNumber }}</span>
          <span class="stat"><span class="stat-icon">₽</span>{{ moneyFormatter.format(card.squareMeterPrice) }} / m²</span>
        </div>
        <div class="reno-row">
          <div class="reno-label">
            <span>Renovation</span>
            <span class="reno-val" style="color:#c9a040">{{ card.renovationRating }}/10</span>
          </div>
          <div class="reno-bar">
            <div class="reno-fill" :style="{
              width: `${card.renovationRating*10}%`,
              background: renoColor(card.renovationRating)
            }"></div>
          </div>
        </div>

      </div>

      <button class="detail-toggle" :class="{open: isOpened(card)}" @click="toggleToggle(card)">
        <span>AI Analysis</span>
        <span class="chevron">▼</span>
      </button>
      <div class="detail-body" v-if="isOpened(card)">
        <div class="pros-cons">
          <div class="pros">
            <div class="pros-label">Pros</div>
            <ul>
              <li v-for="feature in card.advantages">{{ feature }}</li>
            </ul>
          </div>
          <div class="cons">
            <div class="cons-label">Cons</div>
            <ul>
              <li v-for="feature in card.problems">{{ feature }}</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span>Updated {{ formatDate(card.updatedAt) }}</span>
      </div>
    </div>
    <!-- Card -->

    <!-- sentinel that triggers infinite scroll -->
    <div ref="sentinel" class="sentinel"></div>

  </div>
</template>

<style scoped>
/* ── FILTER BAR ─────────────────────────────────────── */
#filter-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15,14,11,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 10px 16px;
}

.filter-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.filter-title {
  font-family: 'Spectral', serif;
  font-style: italic;
  font-size: 17px;
  font-weight: 300;
  color: var(--accent);
  white-space: nowrap;
  flex: 1;
}

.result-count {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

#search-input {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  color: var(--text);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  margin-bottom: 8px;
}
#search-input:focus { border-color: var(--accent-dim); }
#search-input::placeholder { color: var(--text-muted); }

/* Scrollable pill rows */
.filter-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.filter-scroll::-webkit-scrollbar { display: none; }

.pill {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--pill-bg);
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  user-select: none;
}
.pill:active { transform: scale(0.96); }
.pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #0f0e0b;
}

.filter-row-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
  margin-top: 6px;
}

/* Sort row */
.sort-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-top: 6px;
}
.sort-row::-webkit-scrollbar { display: none; }

.sort-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--pill-bg);
  color: var(--text-dim);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.sort-pill.active {
  background: var(--surface);
  border-color: var(--border-hover);
  color: var(--text);
}
.sort-pill .arrow { font-size: 10px; opacity: 0.7; }

/* Price range row */
.range-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}
.range-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  color: var(--text);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
  min-width: 0;
}
.range-input:focus { border-color: var(--accent-dim); }
.range-input::placeholder { color: var(--text-muted); }
.range-sep {
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
}
.range-label {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── LISTINGS ────────────────────────────────────────── */
#listings {
  padding: 12px 12px 80px;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 14px;
}
.no-results span {
  display: block;
  font-size: 32px;
  margin-bottom: 12px;
}

/* ── CARD ───────────────────────────────────────────── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 12px;
  transition: border-color 0.2s, transform 0.15s;
}
.card:active { transform: scale(0.995); }
.card:hover { border-color: var(--border-hover); }
.badge {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.badge-new { background: var(--green); color: #fff; }
.badge-updated { background: #2e5c45; color: #7ecfa1; }
.badge-source { background: rgba(0,0,0,0.55); color: var(--text-dim); backdrop-filter: blur(4px); }

/* Card body */
.card-body {
  padding: 12px 14px;
}

.card-price {
  font-family: 'Spectral', serif;
  font-size: 22px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.card-title {
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: 0.02em;
}
.card-title:hover { color: var(--text); }

.card-address {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 6px;
  line-height: 1.4;
}

.card-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-dim);
  background: var(--surface);
  padding: 3px 8px;
  border-radius: 5px;
}
.stat-icon { opacity: 0.65; font-size: 10px; }

.metro-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-dim);
}
.metro-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Rating bar */
.reno-row {
  margin-top: 10px;
}
.reno-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.reno-val { color: var(--text-dim); font-weight: 600; }
.reno-bar {
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}
.reno-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }

/* Market price */
.market-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
}
.market-cheap { background: rgba(90,158,111,0.15); color: #7ecfa1; }
.market-exp { background: rgba(192,90,90,0.15); color: #e8908a; }

/* Pros/cons toggle */
.detail-toggle {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  padding: 10px 14px;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  letter-spacing: 0.03em;
  transition: color 0.2s;
}
.detail-toggle:hover { color: var(--text-dim); }
.detail-toggle .chevron { font-size: 10px; transition: transform 0.2s; }
.detail-toggle.open .chevron { transform: rotate(180deg); }

.detail-body {
  display: block;
  padding: 0 14px 14px;
}

.pros-cons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 2px;
}
.pros, .cons {
  border-radius: var(--radius-sm);
  padding: 8px;
}
.pros { background: rgba(90,158,111,0.08); }
.cons { background: rgba(192,90,90,0.08); }
.pros-label, .cons-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.pros-label { color: var(--green); }
.cons-label { color: var(--red); }
.pros ul, .cons ul {
  list-style: none;
  padding: 0;
}
.pros li, .cons li {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-dim);
  padding: 2px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.pros li:last-child, .cons li:last-child { border-bottom: none; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-top: 1px solid var(--border);
  font-size: 10px;
  color: var(--text-muted);
}

.sentinel {
  height: 1px;
  margin-top: 10px;
}

/* ── GRID for wider screens ─────────────────────────── */
@media (min-width: 640px) {
  #listings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 16px;
  }
  .card { margin-bottom: 0; }
  .no-results { grid-column: 1 / -1; }
  .filter-bar-inner { max-width: 900px; margin: 0 auto; }
}

@media (min-width: 1024px) {
  #listings { grid-template-columns: 1fr 1fr 1fr; max-width: 1200px; margin: 0 auto; }
  #filter-bar { padding: 12px 24px; }
}
</style>