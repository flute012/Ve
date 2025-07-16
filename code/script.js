document.addEventListener('DOMContentLoaded', () => {
    // Vue 相關功能
    const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

    const APP_CONFIG = {
        // 課程配置
        LESSONS: {
            "L01": {
                TITLE: "L01 The Heart of a Champion",
                FILE_PATHS: {
                    HTML_PARAGRAPH_JSON: './contexts/L01_課文文件.json',
                    CHINESE_PARAGRAPH_JSON: './contexts/L01_段落.json',
                    VOCABULARY_JSON: './contexts/L01-vocabulary.json',
                    AUDIO_FILE: './contexts/B2L1課文全文.mp3'
                }
            },
            "L02": {
                TITLE: "L02 My Mouth's in Airplane Mode!",
                FILE_PATHS: {
                    HTML_PARAGRAPH_JSON: './contexts/L01_課文文件.json',
                    CHINESE_PARAGRAPH_JSON: './contexts/L01_段落.json',
                    VOCABULARY_JSON: './contexts/L01-vocabulary.json',
                    AUDIO_FILE: './contexts/B2L1課文全文.mp3'
                }
            },
            // 後續此處添加課程...
        },
        // 資料結構設定
        DATA_KEYS: {
            HTML_PARAGRAPHS_KEY: 'paragraphs', // HTML段落資料的子鍵名
        }
    };

    // 創建 Vue 應用
    const app = createApp({
        setup() {
            // === 資料狀態 ===
            const currentLessonId = ref('');
            const lessonTitle = ref('');
            const paragraphData = ref([]);
            const vocabularyData = ref([]);
            const selectedWord = ref(null);
            const loading = ref(true);
            const error = ref(null);
            const processedParagraphs = ref([]);
            const showTranslation = ref(false); // 預設不顯示翻譯
            
            // 音頻相關
            const audioElement = ref(null);
            const isPlaying = ref(false);
            const currentSpeed = ref(1.0);
            const currentWordIndex = ref(-1);
            const wordElements = ref([]);

            // 獲取當前課程ID
            const getLessonId = () => {
                // 從URL獲取課程ID
                const urlParams = new URLSearchParams(window.location.search);
                let lessonId = urlParams.get('lesson');
                
                // 如果URL中沒有指定課程ID，則從文件名嘗試獲取
                if (!lessonId) {
                    const path = window.location.pathname;
                    const filename = path.split('/').pop().toLowerCase(); // 獲取文件名並轉小寫
                    
                    // 直接映射文件名到課程ID
                    if (filename === 'l1.html' || filename === 'l01.html') {
                        lessonId = 'L01';
                    } else if (filename === 'l2.html' || filename === 'l02.html') {
                        lessonId = 'L02';
                    } else {
                        // 如果還沒有找到，嘗試正則表達式匹配
                        const match = path.match(/L(\d+)\.html/i);
                        if (match) {
                            lessonId = `L${match[1].padStart(2, '0')}`;
                        } else {
                            // 默認課程
                            lessonId = 'L01';
                        }
                    }
                }
                
                console.log(`當前解析的課程ID: ${lessonId}`);
                return lessonId;
            };
 
            // 切換播放/暫停
            const togglePlayPause = () => {
                if (!audioElement.value) return;
                
                const playPauseBtn = document.getElementById('playPauseBtn');
                
                if (isPlaying.value) {
                    audioElement.value.pause();
                    playPauseBtn.classList.remove('playing');
                    isPlaying.value = false;
                } else {
                    audioElement.value.play().catch(err => {
                        console.error("播放音頻失敗:", err);
                    });
                    playPauseBtn.classList.add('playing');
                    isPlaying.value = true;
                }
            };
            
            // 切換語速模態窗
            const toggleSpeedModal = () => {
                const speedModal = document.getElementById('speedModal');
                if (speedModal.style.display === 'block') {
                    speedModal.style.display = 'none';
                } else {
                    speedModal.style.display = 'block';
                    document.getElementById('modalSpeedValue').innerText = `${currentSpeed.value}x`;
                    document.getElementById('speedControlModal').value = currentSpeed.value;
                }
            };
            
            // 切換使用說明模態窗
            const toggleInstructions = () => {
                const instructionsModal = document.getElementById('instructionsModal');
                if (instructionsModal.style.display === 'block') {
                    instructionsModal.style.display = 'none';
                } else {
                    instructionsModal.style.display = 'block';
                }
            };
            
            // 更新播放速度
            const updatePlaybackSpeed = (speed) => {
                if (!audioElement.value) return;
                
                speed = parseFloat(speed);
                if (isNaN(speed)) return;
                
                // 限制速度範圍
                speed = Math.max(0.25, Math.min(2, speed));
                currentSpeed.value = speed;
                
                // 更新音頻播放速度
                audioElement.value.playbackRate = speed;
                
                // 更新UI顯示
                document.getElementById('speedValue').innerText = `${speed.toFixed(1)}x`;
                document.getElementById('modalSpeedValue').innerText = `${speed.toFixed(1)}x`;
                
                // 更新速度預設按鈕的激活狀態
                document.querySelectorAll('.speed-preset-btn').forEach(btn => {
                    if (parseFloat(btn.dataset.speed) === speed) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                
                // 更新速度標籤文字
                const speedLabel = document.querySelector('.speed-label');
                if (speed < 0.8) {
                    speedLabel.textContent = "慢速";
                } else if (speed > 1.2) {
                    speedLabel.textContent = "快速";
                } else {
                    speedLabel.textContent = "正常";
                }
            };

            // 顯示詞彙卡片
            const showVocabularyCard = () => {
                // 顯示詞彙卡和遮罩
                document.getElementById('vocabularyCard').style.display = 'block';
                document.getElementById('overlay').style.display = 'block';
                
                // 暫停音頻播放
                if (audioElement.value && !audioElement.value.paused) {
                    audioElement.value.pause();
                    isPlaying.value = false;
                    document.getElementById('playPauseBtn').innerHTML = '▶';
                    console.log("詞彙卡顯示時暫停音頻播放");
                }
                
                // 如果已有選定的詞彙，延遲0.3秒後播放發音
                if (selectedWord.value && selectedWord.value.word) {
                    setTimeout(() => {
                        playWordPronunciation(selectedWord.value.word);
                    }, 300);
                }
            };
            
             // 關閉詞彙卡片
             const closeVocabularyCard = () => {
                document.getElementById('vocabularyCard').style.display = 'none';
                document.getElementById('overlay').style.display = 'none';
            };
            
            // 播放單字發音
            const playWordPronunciation = (word) => {
                if (!word) return;
                
                try {
                    // 使用瀏覽器的語音合成API播放單字發音
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = 'en-US'; // 設定語言為英文
                    utterance.rate = 0.9; // 稍微放慢速度以便清晰聽到
                    
                    // 播放發音
                    window.speechSynthesis.speak(utterance);
                    console.log(`播放單字: ${word}`);
                } catch (err) {
                    console.error("播放單字發音失敗:", err);
                }
            };
            
            // 處理詞彙點擊
            const handleWordClick = (id) => {
                let word = vocabularyData.value.find(w => w.number === id);
                
                if (!word && event && event.target) {
                    const dataId = event.target.getAttribute('data-id');
                    if (dataId) {
                        word = vocabularyData.value.find(w => w.number === dataId);
                        if (!word) {
                            const text = event.target.textContent;
                            word = {
                                number: dataId,
                                word: text,
                                phonetics: '(暫無音標)',
                                pos: '未知',
                                definition_zh: '此詞彙尚未有定義',
                                syllable: '' 
                            };
                        }
                    }
                }
                
                if (word) {
                    selectedWord.value = word;
                    showVocabularyCard();
                    
                    // 延遲0.3秒後播放單字發音
                    setTimeout(() => {
                        playWordPronunciation(word.word);
                    }, 300);
                }
            };
            
            // 更新進度條
            const updateProgressBar = () => {
                const progressBar = document.getElementById('audio-progress-bar');
                
                if (progressBar && audioElement.value && audioElement.value.duration) {
                    const percentage = (audioElement.value.currentTime / audioElement.value.duration) * 100;
                    progressBar.style.width = `${percentage}%`;
                }
            };
            
            // 格式化時間
            const formatTime = (seconds) => {
                if (isNaN(seconds)) return '00:00';
                
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                
                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            };
            
            // 處理詞彙元素
            const processWordElements = () => {
                console.log("開始處理單詞元素...");
                
                // 重置單詞元素列表
                wordElements.value = [];
                
                // 查找所有帶有時間戳記的元素
                const spanElements = document.querySelectorAll('span[data-start][data-end]');
                console.log(`找到 ${spanElements.length} 個時間標記的元素`);
                
                // 按時間排序
                const sortedElements = Array.from(spanElements).sort((a, b) => {
                    return parseFloat(a.dataset.start) - parseFloat(b.dataset.start);
                });
                
                // 處理排序後的元素
                sortedElements.forEach((element, idx) => {
                    const startTime = parseFloat(element.dataset.start);
                    const endTime = parseFloat(element.dataset.end);
                    
                    if (!isNaN(startTime) && !isNaN(endTime)) {
                        element.classList.add('word');
                        element.dataset.index = idx;
                        
                        // 檢查是否是詞彙 - 優先級高於播放功能
                        const isVocab = element.classList.contains('vocab-word') || 
                                    element.closest('.vocab-word') !== null || 
                                    element.hasAttribute('data-id') || 
                                    element.parentElement.hasAttribute('data-id') ||
                                    (element.closest('b') && element.closest('b').hasAttribute('id'));
                        
                        // 非詞彙才添加播放功能
                        if (!isVocab) {
                            element.addEventListener('click', (e) => {
                                e.stopPropagation();
                                playFromWord(element);
                            });
                        }
                        
                        wordElements.value.push(element);
                    }
                });
                
                console.log(`共處理 ${wordElements.value.length} 個文字元素`);
            };
            
            // 從指定單詞播放
            const playFromWord = (wordElement) => {
                if (!audioElement.value || !wordElement.dataset.start) return;
                
                const startTime = parseFloat(wordElement.dataset.start);
                console.log(`播放位置: ${startTime}秒`);
                
                audioElement.value.currentTime = startTime;
                audioElement.value.play().catch(err => {
                    console.error("播放音頻失敗:", err);
                });
                
                isPlaying.value = true;
                document.getElementById('playPauseBtn').innerHTML = '⏸';
                
                currentWordIndex.value = parseInt(wordElement.dataset.index);
                updateProgressBar();
                highlightCurrentWord();
            };
            
            // 高亮當前單詞
            const highlightCurrentWord = () => {
                // 移除所有高亮
                document.querySelectorAll('.current-word').forEach(el => {
                    el.classList.remove('current-word');
                });
                
                if (currentWordIndex.value === -1) return;
                
                // 找到匹配當前索引的元素並高亮
                wordElements.value.forEach(element => {
                    if (element.dataset.index && parseInt(element.dataset.index) === currentWordIndex.value) {
                        element.classList.add('current-word');
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            };
            
            // 更新單詞高亮
            const updateWordHighlight = () => {
                if (!audioElement.value) return;
                
                updateProgressBar();
                
                const currentTime = audioElement.value.currentTime;
                let newIndex = -1;
                
                // 先清除所有高亮
                document.querySelectorAll('.current-word').forEach(el => {
                    el.classList.remove('current-word');
                });
                
                // 尋找當前時間範圍內的單詞
                for (let i = 0; i < wordElements.value.length; i++) {
                    const element = wordElements.value[i];
                    const start = parseFloat(element.dataset.start);
                    const end = parseFloat(element.dataset.end);
                    
                    if (!isNaN(start) && !isNaN(end) && currentTime >= start && currentTime <= end) {
                        element.classList.add('current-word');
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        newIndex = parseInt(element.dataset.index);
                        break;
                    }
                }
                
                if (newIndex !== -1) {
                    currentWordIndex.value = newIndex;
                }
            };
            
            // 設置進度條點擊事件
            const setupProgressBarControls = () => {
                const progressContainer = document.getElementById('audio-progress-container');
                
                if (progressContainer) {
                    progressContainer.addEventListener('click', (e) => {
                        if (audioElement.value && audioElement.value.duration) {
                            const rect = progressContainer.getBoundingClientRect();
                            const clickPosition = (e.clientX - rect.left) / rect.width;
                            audioElement.value.currentTime = clickPosition * audioElement.value.duration;
                            updateProgressBar();
                        }
                    });
                }
            };
            
            // 設置語速控制事件
            const setupSpeedControls = () => {
                // 速度滑塊
                const speedSlider = document.getElementById('speedControlModal');
                if (speedSlider) {
                    speedSlider.addEventListener('input', (e) => {
                        updatePlaybackSpeed(e.target.value);
                    });
                }
                
                // 速度預設按鈕
                document.querySelectorAll('.speed-preset-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const speed = parseFloat(btn.dataset.speed);
                        updatePlaybackSpeed(speed);
                        document.getElementById('speedControlModal').value = speed;
                    });
                });
                
                // 點擊速度模態窗背景關閉
                document.getElementById('speedModal').addEventListener('click', (e) => {
                    if (e.target === document.getElementById('speedModal')) {
                        toggleSpeedModal();
                    }
                });
            };
            
            // 從HTML文件中提取段落數據 - 使用遞歸搜尋
            const extractHtmlParagraphData = (jsonData) => {
                const paragraphsKey = APP_CONFIG.DATA_KEYS.HTML_PARAGRAPHS_KEY;
                
                // 遞歸查找目標鍵的函數
                const findValueByKey = (obj, targetKey) => {
                    // 如果 obj 是 null 或非對象，返回 null
                    if (obj === null || typeof obj !== 'object') {
                        return null;
                    }
                    
                    // 如果目標鍵存在於當前對象中，直接返回
                    if (targetKey in obj) {
                        return obj[targetKey];
                    }
                    
                    // 否則遞歸搜尋對象中的每個值
                    for (const key in obj) {
                        const result = findValueByKey(obj[key], targetKey);
                        if (result !== null) {
                            return result;
                        }
                    }
                    
                    // 如果沒有找到，返回 null
                    return null;
                };
                
                // 查找段落數據
                const paragraphsData = findValueByKey(jsonData, paragraphsKey);
                
                if (!paragraphsData) {
                    throw new Error(`無法找到鍵 "${paragraphsKey}" 在JSON數據中`);
                }
                
                // 轉換段落數據為陣列格式
                const paragraphsArray = [];
                
                // 將對象轉換為數組
                for (const key in paragraphsData) {
                    if (paragraphsData.hasOwnProperty(key)) {
                        paragraphsArray.push({
                            ...paragraphsData[key],
                            id: key
                        });
                    }
                }
                
                return paragraphsArray;
            };

            // 從中文翻譯文件中提取數據 - 使用特徵識別
            const extractChineseTranslations = (jsonData) => {
                // 遞歸查找第一個包含中文翻譯的對象
                const findChineseData = (obj) => {
                    if (obj === null || typeof obj !== 'object') return null;
                
                    if (Array.isArray(obj) && obj.length > 0 && obj[0] && typeof obj[0].chinese === 'string') {
                        return obj;
                    }
                
                    for (const key in obj) {
                        const result = findChineseData(obj[key]);
                        if (result !== null) return result;
                    }
                
                    return null;
                };
                
                // 查找中文翻譯數據
                const chineseData = findChineseData(jsonData);
                
                if (!chineseData) {
                    console.warn(`無法找到中文翻譯數據`);
                    return [];
                }
                
                return chineseData;
            };
            
            // 合併HTML和中文翻譯數據
            const mergeHtmlAndChineseData = (htmlData, chineseData) => {
                // 複製HTML數據，不直接修改原始數據
                const mergedData = JSON.parse(JSON.stringify(htmlData));
                
                // 添加中文翻譯
                mergedData.forEach((paragraph, index) => {
                    if (chineseData[index]) {
                        paragraph.chinese = chineseData[index].chinese;
                    } else {
                        paragraph.chinese = "（此段落無中文翻譯）";
                    }
                });
                
                return mergedData;
            };
            
            // 載入數據
            const loadData = async () => {
                try {
                    // 獲取當前課程ID
                    currentLessonId.value = getLessonId();
                    console.log(`正在載入課程: ${currentLessonId.value}`);
                    
                    // 檢查課程是否存在
                    if (!APP_CONFIG.LESSONS[currentLessonId.value]) {
                        throw new Error(`課程 ${currentLessonId.value} 不存在`);
                    }
                    
                    // 更新標題
                    lessonTitle.value = APP_CONFIG.LESSONS[currentLessonId.value].TITLE;
                    
                    // 獲取當前課程的文件路徑
                    const lessonConfig = APP_CONFIG.LESSONS[currentLessonId.value];
                    console.log("文件路徑配置:", lessonConfig.FILE_PATHS);
                    
                    // 載入HTML段落數據
                    console.log(`開始載入 ${currentLessonId.value} 的HTML段落數據...`);
                    console.log(`HTML文件路徑: ${lessonConfig.FILE_PATHS.HTML_PARAGRAPH_JSON}`);
                    
                    const htmlResponse = await fetch(lessonConfig.FILE_PATHS.HTML_PARAGRAPH_JSON);
                    
                    if (!htmlResponse.ok) {
                        throw new Error(`無法載入HTML段落數據: ${htmlResponse.status} - 文件路徑: ${lessonConfig.FILE_PATHS.HTML_PARAGRAPH_JSON}`);
                    }
                    
                    const parsedHtmlData = await htmlResponse.json();
                    const htmlParagraphs = extractHtmlParagraphData(parsedHtmlData);
                    
                    // 載入中文翻譯數據
                    console.log(`開始載入 ${currentLessonId.value} 的中文翻譯數據...`);
                    const chineseResponse = await fetch(lessonConfig.FILE_PATHS.CHINESE_PARAGRAPH_JSON);
                    
                    if (!chineseResponse.ok) {
                        throw new Error(`無法載入中文翻譯數據: ${chineseResponse.status}`);
                    }
                    
                    const parsedChineseData = await chineseResponse.json();
                    const chineseTranslations = extractChineseTranslations(parsedChineseData);
                    
                    // 合併HTML和中文翻譯數據
                    paragraphData.value = mergeHtmlAndChineseData(htmlParagraphs, chineseTranslations);
                    
                    // 載入詞彙數據
                    const vocabResponse = await fetch(lessonConfig.FILE_PATHS.VOCABULARY_JSON);
                    
                    if (!vocabResponse.ok) {
                        throw new Error(`無法載入詞彙數據: ${vocabResponse.status}`);
                    }
                    
                    const parsedVocabData = await vocabResponse.json();
                    
                    // 壓平詞彙資料
                    const flatVocab = [];
                    parsedVocabData.forEach(section => {
                        if (section.word_forms) {
                            section.word_forms.forEach(word => {
                                flatVocab.push(word);
                            });
                        }
                    });
                    
                    vocabularyData.value = flatVocab;
                    
                    // 預處理所有段落
                    paragraphData.value.forEach((paragraph, index) => {
                        processedParagraphs.value[index] = paragraph.english_with_html;
                    });
                    
                    loading.value = false;
                } catch (err) {
                    console.error("載入數據時發生錯誤:", err);
                    error.value = `載入數據時發生錯誤: ${err.message}`;
                    loading.value = false;
                }
            };
            
            // 為點擊詞彙卡片設置事件委派
            const setupVocabClickHandlers = () => {
                document.addEventListener('click', (e) => {
                    // 首先檢查是否為詞彙卡片點擊（優先處理）
                    const vocabElement = e.target.closest('.vocab-word') || 
                                    e.target.closest('b[id]') ||
                                    (e.target.hasAttribute('data-id') ? e.target : null) ||
                                    (e.target.parentElement && e.target.parentElement.hasAttribute('data-id') ? e.target.parentElement : null);
                    
                    if (vocabElement) {
                        e.stopPropagation(); // 阻止事件冒泡
                        e.preventDefault(); // 阻止默認行為
                        
                        // 獲取詞彙ID，優先從 data-id 屬性獲取
                        let id = vocabElement.getAttribute('data-id');
                        
                        // 如果沒有 data-id，則嘗試從 onclick 屬性獲取
                        if (!id) {
                            const onclickMatch = vocabElement.getAttribute('onclick')?.match(/'([^']+)'/);
                            if (onclickMatch) {
                                id = onclickMatch[1];
                            }
                        }
                        
                        // 如果還沒有找到ID，但元素是或在 b 標籤內，則從 b 標籤獲取 id
                        if (!id && (vocabElement.tagName === 'B' || vocabElement.closest('b'))) {
                            const bElement = vocabElement.tagName === 'B' ? vocabElement : vocabElement.closest('b');
                            id = bElement.getAttribute('id');
                        }
                        
                        if (id) {
                            handleWordClick(id);
                            return; // 已處理詞彙點擊，不再繼續
                        }
                    }
                    
                    // 如果不是詞彙點擊，檢查是否需要播放音頻
                    if (e.target.classList.contains('word') && 
                        !e.target.closest('.vocab-word') && 
                        !e.target.hasAttribute('data-id') && 
                        !(e.target.parentElement && e.target.parentElement.hasAttribute('data-id')) &&
                        !e.target.closest('b[id]')) {
                        playFromWord(e.target);
                    }
                });
            };
            
            // 初始化
            onMounted(async () => {
                console.log("頁面載入，開始初始化...");
                
                // 添加音頻元素
                const audio = document.createElement('audio');
                audio.id = 'audio-player';
                audio.style.display = 'none';
                document.body.appendChild(audio);
                audioElement.value = audio;
                
                // 添加音頻事件監聽
                audio.addEventListener('timeupdate', updateWordHighlight);
                audio.addEventListener('ended', () => {
                    isPlaying.value = false;
                    document.getElementById('playPauseBtn').innerHTML = '▶';
                });
                
                // 設置進度條控制
                setupProgressBarControls();
                
                // 設置語速控制
                setupSpeedControls();
                
                // 載入數據
                await loadData();
                
                // 載入音頻文件
                try {
                    const lessonConfig = APP_CONFIG.LESSONS[currentLessonId.value];
                    console.log(`正在載入課程 ${currentLessonId.value} 的音頻`);
                    console.log(`音頻文件路徑: ${lessonConfig.FILE_PATHS.AUDIO_FILE}`);
                    
                    audioElement.value.src = lessonConfig.FILE_PATHS.AUDIO_FILE;
                    audioElement.value.onloadedmetadata = () => {
                        console.log(`音頻元數據已載入，時長: ${audioElement.value.duration}秒`);
                        updateProgressBar();
                    };
                    audioElement.value.onerror = (e) => {
                        console.error("音頻載入失敗:", e);
                        console.error(`嘗試載入的文件: ${lessonConfig.FILE_PATHS.AUDIO_FILE}`);
                        error.value = "無法載入音頻文件";
                    };
                    audioElement.value.load();
                } catch (err) {
                    console.error("載入音頻文件時發生錯誤:", err);
                    error.value = `載入音頻文件錯誤: ${err.message}`;
                }
                
                // 按ESC鍵關閉詞彙卡片
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        closeVocabularyCard();
                        const speedModal = document.getElementById('speedModal');
                        if (speedModal && speedModal.style.display === 'block') {
                            toggleSpeedModal(); // 同時關閉速度模態窗
                        }
                    } else if (e.key === ' ' && audioElement.value) {
                        // 空格鍵控制播放/暫停
                        e.preventDefault(); // 防止頁面滾動
                        togglePlayPause();
                    }
                });
                
                // 防止點擊卡片關閉
                const vocabCard = document.getElementById('vocabularyCard');
                if (vocabCard) {
                    vocabCard.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                }
                
                // 將處理函數暴露給window
                window.handleWordClick = handleWordClick;
                window.playWordPronunciation = playWordPronunciation;
                
                // 設置詞彙點擊處理
                setupVocabClickHandlers();
                // 載入數據
                await loadData();              
                // 數據載入後，處理詞彙元素
                nextTick(() => {
                    processWordElements();
                });
            });


            // 返回設置中的值和方法
            return {
                // 資料
                currentLessonId,
                lessonTitle,
                paragraphData,
                vocabularyData,
                selectedWord,
                loading,
                error,
                processedParagraphs,
                showTranslation,
                
                // 方法
                togglePlayPause,
                toggleSpeedModal,
                toggleInstructions,
                closeVocabularyCard,
                handleWordClick
            };
        }
    });

    // 掛載 Vue 應用
    app.mount('#app');

    // 初始化全局事件處理
    // 初始隱藏速度模態窗
    const speedModal = document.getElementById('speedModal');
    if (speedModal) {
        speedModal.style.display = 'none';
    }
    
    // 初始隱藏說明模態窗
    const instructionsModal = document.getElementById('instructionsModal');
    if (instructionsModal) {
        instructionsModal.style.display = 'none';
    }
});