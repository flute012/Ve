// 指定category的排序順序
const categoryOrder = [
  '課前暖身',
  '課文學習',
  '字彙學習',
  '聽力練習'
];

// 指定每個category下mainTitle的排序順序
const mainTitleOrder = {
  '課文學習': [
    '課文動畫',
    '課文朗讀',
    '課文Edpuzzle',
    '課文講解影片'
  ],
  '課前暖身': [
    'Thinking Ahea 影片'
  ],
  '字彙學習': [
    '字彙朗讀',
    'Quizlet'
  ],
  '聽力練習': [
    'Listening Strategy'
  ]
};

// 定義直接作為連結的mainTitle列表
const directLinkTitles = ['課文Edpuzzle', 'Quizlet', '課文講解影片'];

// 定義按照課程ID分組的配色
const getColorClassByLessonId = (id) => {
  const lessonType = id.charAt(0); // 獲取課程前綴 L 或 R
  const lessonNumber = parseInt(id.substring(1)) || 0; // 獲取課程號碼，如果無法解析則為0

  if (lessonType === 'L') {
    // L系列課程按照mod 3分組
    const mod = lessonNumber % 3;
    if (mod === 1) return 'A elect-w1'; // L1, L4, L7
    if (mod === 2) return 'B elect-w2'; // L2, L5, L8
    if (mod === 0) return 'C elect-w3'; // L3, L6, L9
  } else if (lessonType === 'R') {
    // R系列課程都用同一個配色
    return 'D elect-w4';
  }

  // 預設配色
  return 'D elect-w2';
};

const LessonPage = {
  template: `
    <div v-if="lesson" class="header-container">
      <div class="logo-container">
        <img class="logo" src="./object/Top.png" alt="Logo">
      </div>

      <div class="title-container">
        <h1> {{ lesson.lessonName }}</h1>
      </div>     
    </div>
    
    <nav id="nav" v-if="sortedCategories.length > 0">
      <ul>
        <li 
          v-for="cat in sortedCategories" :key="cat" 
          :class="{ active: cat === currentCategory }" 
          @click="currentCategory = cat">
          <span>{{ cat }}</span>
        </li>
      </ul>
    </nav>

    <div v-if="filteredContent.length > 0">
      <div v-for="main in sortedMainTitles()" :key="main">
        <h3 v-if="isDirectLink(main) && !alwaysExpanded.includes(main)" 
            :class="['banner', getColorClass(), forceYellowBg(main)]" 
            @click="openDirectLink(main)">
          {{ main }}
        </h3>
        
        <!-- 可展開的標題 -->
        <h3 v-else 
            :class="['banner', getColorClass(), forceYellowBg(main)]" 
            @click="toggleMain(main)">
          {{ main }}
        </h3>
        
        <div v-show="alwaysExpanded.includes(main) || (activeMainTitle === main && !isDirectLink(main))">
          <!-- 處理課文動畫和Thinking Ahea 影片 -->
          <div v-if="main === '課文動畫' || main === 'Thinking Ahea 影片'">
            <ul>
              <li v-for="item in getSubtitlesByMain(main)" :key="item.url">
                <button @click="open(item.url)">
                  {{ item.subTitle || '開啟檔案' }}
                </button>
              </li>
            </ul>
          </div>
          
          <!-- 處理音頻文件 -->
          <ul v-else-if="hasAudio(main)" class="audio-list">
            <li v-for="item in filterByMain(main)" :key="item.url">
              <p>{{ item.subTitle }}</p>
              <audio controls preload="metadata">
                <source :src="item.url" type="audio/mpeg" />
              </audio>
            </li>
          </ul>
          
          <!-- 處理其他類型 -->
          <ul v-else>
            <li v-for="item in filterByMain(main)" :key="item.url">
              <button @click="open(item.url)">
                {{ item.subTitle || '開啟檔案' }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else>
      <p> </p>
    </div>
  `,

  // 響應式數據Vue追蹤數據的變化
  data() {
    return {
      lesson: null,
      categories: [],
      currentCategory: '',
      lessons: null,
      activeMainTitle: null,
      alwaysExpanded: ['Thinking Ahead影片', 'Listening Strategy'],
    };
  },
  computed: {
    // 根據指定順序排序categories
    sortedCategories() {
      if (!this.categories.length) return [];

      // 將現有categories按照categoryOrder的順序排序
      return [...this.categories].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);

        // 如果找不到順序，放到最後
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });
    },

    filteredContent() {
      if (!this.lesson) return [];
      return this.lesson.content.filter(
        item => item.category === this.currentCategory
      );
    }
  },
  methods: {
    // 獲取當前課程的配色類
    getColorClass() {
      const lessonId = this.$route.params.lessonId;
      return getColorClassByLessonId(lessonId);
    },
    forceYellowBg(main) {
      const highlightTitles = ['課文朗讀', '課文講解影片', 'Quizlet'];
      return highlightTitles.includes(main) ? 'D' : '';
    },

    // 檢查是否為直接連結的標題
    isDirectLink(title) {
      return directLinkTitles.includes(title);
    },

    // 打開直接連結
    openDirectLink(title) {
      const item = this.filterByMain(title)[0];
      if (item && item.url) {
        this.open(item.url);
      }
    },

    // 切換顯示/隱藏內容
    toggleMain(title) {
      if (this.isDirectLink(title) || this.alwaysExpanded.includes(title)) {
        this.openDirectLink(title);
      } else {
        this.activeMainTitle = this.activeMainTitle === title ? null : title;
      }
    },


    // 獲取排序後的mainTitle列表
    sortedMainTitles() {
      const titles = this.getMainTitles();
      const orderList = mainTitleOrder[this.currentCategory] || [];

      return titles.sort((a, b) => {
        const indexA = orderList.indexOf(a);
        const indexB = orderList.indexOf(b);

        // 如果找不到順序，放到最後
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });
    },

    // 獲取所有mainTitle
    getMainTitles() {
      const titles = new Set();
      for (const item of this.filteredContent) {
        titles.add(item.mainTitle);
      }
      return Array.from(titles);
    },

    // 按mainTitle過濾內容
    filterByMain(main) {
      return this.filteredContent.filter(item => item.mainTitle === main);
    },

    // 獲取特定mainTitle下的所有subTitle
    getSubtitlesByMain(main) {
      const items = this.filterByMain(main);
      return items.sort((a, b) => {
        // 按照 "無字幕", "英文字幕", "中英字幕" 的順序排序
        const order = { "無字幕": 1, "英文字幕": 2, "中英字幕": 3 };
        const orderA = order[a.subTitle] || 99;
        const orderB = order[b.subTitle] || 99;
        return orderA - orderB;
      });
    },

    // 檢查是否有音頻檔案
    hasAudio(main) {
      return this.filterByMain(main).some(item => item.type === 'audio');
    },

    setupAudioHandlers() {
      this.$nextTick(() => {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach((audio, index) => {
          // 移除舊的事件監聽器避免重複綁定
          audio.removeEventListener('play', audio._playHandler);
          audio.removeEventListener('ended', audio._endedHandler);

          // 創建事件處理函數
          audio._playHandler = () => {
            audioElements.forEach(otherAudio => {
              if (otherAudio !== audio) {
                otherAudio.pause();
              }
            });
          };

          audio._endedHandler = () => {
            if (index < audioElements.length - 1) {
              audioElements[index + 1].play();
            }
          };

          // 綁定事件
          audio.addEventListener('play', audio._playHandler);
          audio.addEventListener('ended', audio._endedHandler);
        });
      });
    },

    // 打開連結
    open(url) {
      window.open(url, '_blank');
    },

    // 加載課程數據
    async loadLessonData() {
      try {
        if (!this.lessons) {
          const res = await fetch('lessons.json');
          this.lessons = await res.json();
        }

        const id = this.$route.params.lessonId;
        if (this.lessons[id]) {
          this.lesson = this.lessons[id];

          const catSet = new Set(this.lesson.content.map(i => i.category));
          this.categories = [...catSet];

          // 預設選擇第一個category (按照排序後)
          const sortedCats = [...this.categories].sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);

            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
          });

          this.currentCategory = sortedCats[0] || '';
        } else {
          console.error(`載入資料中：${id}`);
          this.lesson = null;
          this.categories = [];
          this.currentCategory = '';
        }
      } catch (error) {
        console.error('讀取課程資料時發生錯誤:', error);
        this.lesson = null;
      }
    }
  },
  // 監聽路由參數變化
  watch: {
    '$route.params.lessonId': {
      handler() {
        this.loadLessonData();
      },
      immediate: true
    },
    // 新增這個 watcher
    filteredContent() {
      this.setupAudioHandlers();
    },
    currentCategory() {
      this.setupAudioHandlers();
    }
  }
};

// 定義路由 - 使用全局可用的 VueRouter
const routes = [
  { path: '/:lessonId', component: LessonPage },
  { path: '/', redirect: '/L1' } // 保留原本預設導向到 L1 的設定
];

// 創建路由器 - 使用全局可用的 VueRouter
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes
});

// 創建應用 - 使用全局可用的 Vue
const app = Vue.createApp({});

// 使用路由
app.use(router);

// 異步導入並註冊 FrontPage 組件
// 這是一個特殊處理，因為 FrontPage.js 使用 ES 模組而 main.js 不是
(async function () {
  try {
    // 動態導入 FrontPage 模組
    const module = await import('./js/FrontPage.js');
    // 註冊組件
    app.component('front-page', module.default);
    console.log('FrontPage 組件已成功註冊');
  } catch (error) {
    console.error('無法載入 FrontPage 組件:', error);
  } finally {
    // 無論成功或失敗，都掛載應用
    app.mount('#app');
  }
})();