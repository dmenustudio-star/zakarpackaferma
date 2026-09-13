const tg = window.Telegram?.WebApp;
if (tg) { 
    try { 
        tg.expand(); 
        tg.ready();
        tg.enableClosingConfirmation();
    } catch(e){} 
}

const bgMusic = new Audio('music.mp3'); 
bgMusic.loop = true;
bgMusic.volume = 0.4;

function triggerHaptic(style = 'light') {
    if (tg?.HapticFeedback) {
        try {
            if (style === 'heavy') tg.HapticFeedback.impactOccurred('heavy');
            else if (style === 'medium') tg.HapticFeedback.impactOccurred('medium');
            else if (style === 'success') tg.HapticFeedback.notificationOccurred('success');
            else tg.HapticFeedback.impactOccurred('light');
        } catch(e) {}
    }
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type = 'sine', duration = 0.08) {
    if (gameState.settings && !gameState.settings.sfx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function formatNum(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

const defaultState = {
    money: 15,
    ducats: 5,
    clickPower: 1,
    totalClicks: 0,
    toolDurability: 100, // Знос інструменту (від 0 до 100)
    lastOnline: Date.now(),
    hasAutoCollector: false,
    activeBoosts: { palynkaTimer: 0, banoshTimer: 0, hangoverTimer: 0 },
    activeHazard: null, // Погода чи податок війта: { type: 'drought'|'tax', text: '...', time: X }
    settings: { music: true, sfx: true },
    beds: [
        { id: 1, name: '🥔 Крумплі', level: 1, basePrice: 20, baseIncome: 1, unlocked: true, unlockEndTime: 0 },
        { id: 2, name: '🧅 Цибуля', level: 0, basePrice: 85, baseIncome: 4, unlocked: false, unlockEndTime: 0 },
        { id: 3, name: '🍅 Парадички', level: 0, basePrice: 350, baseIncome: 14, unlocked: false, unlockEndTime: 0 },
        { id: 4, name: '🥒 Огірки', level: 0, basePrice: 1500, baseIncome: 45, unlocked: false, unlockEndTime: 0 },
        { id: 5, name: '🌶️ Поперички', level: 0, basePrice: 6500, baseIncome: 160, unlocked: false, unlockEndTime: 0 },
        { id: 6, name: '🍓 Поземок', level: 0, basePrice: 28000, baseIncome: 550, unlocked: false, unlockEndTime: 0 },
        { id: 7, name: '🌽 Кіндериця', level: 0, basePrice: 120000, baseIncome: 1900, unlocked: false, unlockEndTime: 0 },
        { id: 8, name: '🍇 Грозна', level: 0, basePrice: 550000, baseIncome: 7000, unlocked: false, unlockEndTime: 0 },
        { id: 9, name: '🍏 Яблука', level: 0, basePrice: 2500000, baseIncome: 25000, unlocked: false, unlockEndTime: 0 },
        { id: 10, name: '🫐 Чорниці', level: 0, basePrice: 12000000, baseIncome: 95000, unlocked: false, unlockEndTime: 0 },
        { id: 11, name: '🧄 Чеснок', level: 0, basePrice: 55000000, baseIncome: 380000, unlocked: false, unlockEndTime: 0 },
        { id: 12, name: '🍄 Трюфлі', level: 0, basePrice: 250000000, baseIncome: 1500000, unlocked: false, unlockEndTime: 0 },
        { id: 13, name: '🍷 Ґраппа', level: 0, basePrice: 1200000000, baseIncome: 6200000, unlocked: false, unlockEndTime: 0 },
        { id: 14, name: '💧 Поляна Квасова', level: 0, basePrice: 6000000000, baseIncome: 26000000, unlocked: false, unlockEndTime: 0 },
        { id: 15, name: '🌸 Шафран', level: 0, basePrice: 30000000000, baseIncome: 110000000, unlocked: false, unlockEndTime: 0 },
        { id: 16, name: '🍯 Карпатський Мед', level: 0, basePrice: 150000000000, baseIncome: 480000000, unlocked: false, unlockEndTime: 0 },
        { id: 17, name: '🫕 Бриндза з полонини', level: 0, basePrice: 800000000000, baseIncome: 2100000000, unlocked: false, unlockEndTime: 0 },
        { id: 18, name: '🦌 Роги оленя', level: 0, basePrice: 4200000000000, baseIncome: 9500000000, unlocked: false, unlockEndTime: 0 },
        { id: 19, name: '🪵 Карпатський Сруб', level: 0, basePrice: 22000000000000, baseIncome: 44000000000, unlocked: false, unlockEndTime: 0 },
        { id: 20, name: '🦅 Перо Беркута', level: 0, basePrice: 120000000000000, baseIncome: 200000000000, unlocked: false, unlockEndTime: 0 },
        { id: 21, name: '🌿 Трава Мольфара', level: 0, basePrice: 650000000000000, baseIncome: 920000000000, unlocked: false, unlockEndTime: 0 },
        { id: 22, name: '💎 Карпатський Самоцвіт', level: 0, basePrice: 3500000000000000, baseIncome: 4300000000000, unlocked: false, unlockEndTime: 0 },
        { id: 23, name: '👑 Корона Довбуша', level: 0, basePrice: 18000000000000000, baseIncome: 20000000000000, unlocked: false, unlockEndTime: 0 },
        { id: 24, name: '⚡ Сила Трембіти', level: 0, basePrice: 95000000000000000, baseIncome: 98000000000000, unlocked: false, unlockEndTime: 0 },
        { id: 25, name: '🌌 Дух Синевиру', level: 0, basePrice: 500000000000000000, baseIncome: 500000000000000, unlocked: false, unlockEndTime: 0 }
    ],
    quests: [
        { id: 1, text: 'Зробити 150 тапів', target: 150, current: 0, reward: 300, isDucat: false, done: false },
        { id: 2, text: 'Назбирати 25,000 грн', target: 25000, current: 0, reward: 8, isDucat: true, done: false },
        { id: 3, text: 'Відкрити 10 грядок', target: 10, current: 1, reward: 15, isDucat: true, done: false },
        { id: 4, text: 'Відкрити 20 грядок', target: 20, current: 1, reward: 40, isDucat: true, done: false }
    ]
};

let gameState = defaultState;

function saveGame() {
    try {
        gameState.lastOnline = Date.now();
        localStorage.setItem('zakarpattia_farm_save_v13', JSON.stringify(gameState));
    } catch(e) {}
}

try {
    const loaded = localStorage.getItem('zakarpattia_farm_save_v13');
    if (loaded) {
        const parsed = JSON.parse(loaded);
        gameState = { 
            ...defaultState, 
            ...parsed,
            activeBoosts: { ...defaultState.activeBoosts, ...(parsed.activeBoosts || {}) },
            settings: { ...defaultState.settings, ...(parsed.settings || {}) },
            beds: defaultState.beds.map(defaultBed => {
                const savedBed = parsed.beds?.find(b => b.id === defaultBed.id);
                return savedBed ? { ...defaultBed, ...savedBed } : defaultBed;
            }),
            quests: defaultState.quests.map(defaultQ => {
                const savedQ = parsed.quests?.find(q => q.id === defaultQ.id);
                return savedQ ? { ...defaultQ, ...savedQ } : defaultQ;
            })
        };
        if (gameState.toolDurability === undefined) gameState.toolDurability = 100;
    }
} catch(e) {
    gameState = defaultState;
}

const now = Date.now();
gameState.beds.forEach(bed => {
    if (!bed.unlocked && bed.unlockEndTime > 0 && now >= bed.unlockEndTime) {
        bed.unlocked = true;
        bed.level = 1;
        bed.unlockEndTime = 0;
    }
});

const offlineTimeSec = Math.floor((now - (gameState.lastOnline || now)) / 1000);
if (offlineTimeSec > 10) {
    const incomeMultiplier = (gameState.activeBoosts?.banoshTimer > 0 ? 3 : 1) * (1 + gameState.ducats * 0.15);
    const passiveBase = gameState.beds.reduce((acc, b) => acc + (b.unlocked ? b.level * b.baseIncome : 0), 0) * incomeMultiplier;
    const offlineMultiplier = gameState.hasAutoCollector ? 1.0 : 0.4;
    const earnedOffline = Math.floor(passiveBase * offlineTimeSec * offlineMultiplier);
    if (earnedOffline > 0) {
        gameState.money += earnedOffline;
        setTimeout(() => showToast(`🌙 Офлайн прибуток: +${formatNum(earnedOffline)} грн!`), 800);
    }
}
gameState.lastOnline = now;
saveGame();

let activeEvent = null;

document.addEventListener('click', () => {
    if (gameState.settings.music && bgMusic.paused) {
        bgMusic.play().catch(() => {});
    }
}, { once: true });

function updateSettingsUI() {
    const musicBtn = document.getElementById('music-toggle-btn');
    const sfxBtn = document.getElementById('sfx-toggle-btn');
    if (musicBtn) {
        musicBtn.innerText = gameState.settings.music ? 'Увімкнено' : 'Вимкнено';
        musicBtn.style.background = gameState.settings.music ? 'linear-gradient(180deg, #66bb6a 0%, #2e7d32 100%)' : 'linear-gradient(180deg, #616161 0%, #37474f 100%)';
    }
    if (sfxBtn) {
        sfxBtn.innerText = gameState.settings.sfx ? 'Увімкнено' : 'Вимкнено';
        sfxBtn.style.background = gameState.settings.sfx ? 'linear-gradient(180deg, #66bb6a 0%, #2e7d32 100%)' : 'linear-gradient(180deg, #616161 0%, #37474f 100%)';
    }
}

function toggleMusic() {
    gameState.settings.music = !gameState.settings.music;
    if (gameState.settings.music) {
        bgMusic.play().catch(() => {});
    } else {
        bgMusic.pause();
    }
    updateSettingsUI();
    saveGame();
    triggerHaptic('light');
}

function toggleSfx() {
    gameState.settings.sfx = !gameState.settings.sfx;
    updateSettingsUI();
    saveGame();
    triggerHaptic('light');
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function render() {
    const currentTime = Date.now();

    gameState.beds.forEach(bed => {
        if (!bed.unlocked && bed.unlockEndTime > 0 && currentTime >= bed.unlockEndTime) {
            bed.unlocked = true;
            bed.level = 1;
            bed.unlockEndTime = 0;
            saveGame();
            showToast(`🎉 Грядка "${bed.name}" з'явилася!`);
        }
    });

    // Розрахунок множників з урахуванням похмілля та допінгів
    let tapMult = (gameState.activeBoosts?.palynkaTimer > 0 ? 5 : 1) * (1 + gameState.ducats * 0.15);
    if (gameState.activeBoosts?.hangoverTimer > 0) tapMult *= 0.5; // Похмілля ріже силу вдвічі
    if (gameState.toolDurability <= 0) tapMult = 0; // Зламаний інструмент

    let incomeMult = (gameState.activeBoosts?.banoshTimer > 0 ? 3 : 1) * (1 + gameState.ducats * 0.15);
    if (gameState.activeHazard && gameState.activeHazard.type === 'drought') {
        incomeMult = 0; // Засуха блокує пасивний дохід
    }

    document.getElementById('money-display').innerText = formatNum(gameState.money);
    document.getElementById('ducats-display').innerText = gameState.ducats;
    document.getElementById('click-power-display').innerText = formatNum(gameState.clickPower * tapMult);
    
    const durabilityEl = document.getElementById('tool-durability');
    if (durabilityEl) {
        durabilityEl.innerText = `Знос інструменту: ${Math.max(0, Math.floor(gameState.toolDurability))}%`;
        durabilityEl.style.color = gameState.toolDurability < 20 ? '#ff5252' : '#ffeb3b';
    }

    // Рендер банера погоди / війта
    const weatherBanner = document.getElementById('weather-banner');
    if (weatherBanner) {
        if (gameState.activeHazard) {
            weatherBanner.classList.remove('hidden');
            document.getElementById('weather-text').innerText = gameState.activeHazard.text;
        } else {
            weatherBanner.classList.add('hidden');
        }
    }

    const totalPassive = gameState.beds.reduce((acc, b) => acc + (b.unlocked ? b.level * b.baseIncome : 0), 0) * incomeMult;
    document.getElementById('passive-income').innerText = formatNum(totalPassive);

    const bedsContainer = document.getElementById('beds-list');
    bedsContainer.innerHTML = '';

    const unlockedCount = gameState.beds.filter(b => b.unlocked).length;
    gameState.quests.forEach(q => {
        if ((q.id === 3 || q.id === 4) && !q.done) q.current = unlockedCount;
    });

    gameState.beds.forEach(bed => {
        const card = document.createElement('div');
        card.className = 'bed-card';

        if (bed.unlocked) {
            const cost = Math.floor(bed.basePrice * Math.pow(1.22, bed.level));
            const canAfford = gameState.money >= cost;
            const currentIncome = Math.floor(bed.level * bed.baseIncome * incomeMult);

            card.innerHTML = `
                <div class="bed-info">
                    <h4>${bed.name} <span class="level-badge">Lvl ${bed.level}</span></h4>
                    <p>⚡ +${formatNum(currentIncome)} грн/с</p>
                </div>
                <button class="btn-action" ${!canAfford ? 'disabled' : ''} onclick="upgradeBed(${bed.id})">
                    ПРИЧИНИТИ<br>${formatNum(cost)} грн
                </button>
            `;
        } else if (bed.unlockEndTime > 0) {
            const timeLeft = Math.max(0, Math.ceil((bed.unlockEndTime - currentTime) / 1000));
            const speedUpDucats = 5;
            const canAffordDucats = gameState.ducats >= speedUpDucats;

            card.innerHTML = `
                <div class="bed-info">
                    <h4>⏳ ${bed.name}</h4>
                    <p style="color: #ffd54f; font-weight: 700;">⏱️ ${formatTime(timeLeft)}</p>
                </div>
                <button class="btn-action" ${!canAffordDucats ? 'disabled' : ''} onclick="speedUpBed(${bed.id})" style="background: linear-gradient(180deg, #ab47bc 0%, #6a1b9a 100%); border-color: #e1bee7;">
                    ⚡ ПРИШВИДШИТИ<br>💎 ${speedUpDucats} Дукати
                </button>
            `;
        } else {
            const canUnlock = gameState.money >= bed.basePrice;
            card.innerHTML = `
                <button class="btn-action btn-unlock" ${!canUnlock ? 'disabled' : ''} onclick="unlockBed(${bed.id})">
                    🔓 ВІДКРИТИ: ${bed.name} (${formatNum(bed.basePrice)} грн)
                </button>
            `;
        }
        bedsContainer.appendChild(card);
    });

    renderQuests();
    updateSettingsUI();
}

function upgradeBed(id) {
    const bed = gameState.beds.find(b => b.id === id);
    if (!bed) return;
    const cost = Math.floor(bed.basePrice * Math.pow(1.22, bed.level));
    if (gameState.money >= cost) {
        gameState.money -= cost;
        bed.level++;
        triggerHaptic('medium');
        saveGame();
        render();
        playSound(520, 'square');
    }
}

function unlockBed(id) {
    const bed = gameState.beds.find(b => b.id === id);
    if (!bed) return;
    if (gameState.money >= bed.basePrice) {
        gameState.money -= bed.basePrice;
        
        const bedIndex = gameState.beds.findIndex(b => b.id === id);
        const minutesToAdd = (bedIndex + 1) * 20; 
        
        bed.unlockEndTime = Date.now() + minutesToAdd * 60 * 1000;
        
        triggerHaptic('success');
        saveGame();
        render();
        playSound(660, 'triangle');
        showToast(`🏗️ Будівництво почалося (${minutesToAdd} хв)!`);
    }
}

function speedUpBed(id) {
    const bed = gameState.beds.find(b => b.id === id);
    if (!bed || bed.unlockEndTime === 0) return;
    const speedUpDucats = 5;
    
    if (gameState.ducats >= speedUpDucats) {
        gameState.ducats -= speedUpDucats;
        bed.unlocked = true;
        bed.level = 1;
        bed.unlockEndTime = 0;
        triggerHaptic('success');
        saveGame();
        render();
        showToast(`⚡ Грядку зведено миттєво за дукати!`);
    } else {
        showToast("⚠️ Мало внутрішніх дукатів!");
    }
}

function buyBoost(type, price) {
    if (gameState.money >= price) {
        gameState.money -= price;
        if (!gameState.activeBoosts) gameState.activeBoosts = { palynkaTimer: 0, banoshTimer: 0, hangoverTimer: 0 };
        if (type === 'palynka') {
            gameState.activeBoosts.palynkaTimer = 30;
        }
        if (type === 'banosh') gameState.activeBoosts.banoshTimer = 60;
        triggerHaptic('success');
        saveGame();
        render();
        closeModal('boosts-modal');
        showToast("🔥 Допінг активовано!");
    } else {
        showToast("⚠️ Мало грошей!");
    }
}

function repairTool() {
    const repairCost = 50;
    if (gameState.money >= repairCost) {
        gameState.money -= repairCost;
        gameState.toolDurability = 100;
        triggerHaptic('success');
        saveGame();
        render();
        showToast("🛠️ Мотику успішно відковано!");
        playSound(700, 'triangle');
    } else {
        showToast("⚠️ Не вистачає грошей на коваля (50 грн)!");
    }
}

document.getElementById('tap-btn').addEventListener('click', (e) => {
    if (gameState.toolDurability <= 0) {
        showToast("⚠️ Мотика зламана! Час її відкувати.");
        triggerHaptic('heavy');
        return;
    }

    if (gameState.settings.music && bgMusic.paused) {
        bgMusic.play().catch(() => {});
    }

    // Знос інструменту при кожному тапі
    gameState.toolDurability = Math.max(0, gameState.toolDurability - 0.8);

    let tapMult = (gameState.activeBoosts?.palynkaTimer > 0 ? 5 : 1) * (1 + gameState.ducats * 0.15);
    if (gameState.activeBoosts?.hangoverTimer > 0) tapMult *= 0.5;

    const isCrit = Math.random() < 0.12;
    const earned = Math.floor(gameState.clickPower * tapMult * (isCrit ? 4 : 1));

    gameState.money += earned;
    gameState.totalClicks++;

    triggerHaptic(isCrit ? 'heavy' : 'light');

    gameState.quests.forEach(q => {
        if (q.id === 1 && !q.done) q.current = gameState.totalClicks;
        if (q.id === 2 && !q.done) q.current = Math.floor(gameState.money);
    });

    saveGame();
    render();
    playSound(isCrit ? 880 : 440, 'sine');

    const floatText = document.createElement('div');
    floatText.innerText = `${isCrit ? '💥 CRIT! ' : ''}+${formatNum(earned)} 💰`;
    floatText.style.cssText = `
        position: fixed; left: ${e.clientX || window.innerWidth/2}px; top: ${(e.clientY || window.innerHeight/2) - 20}px;
        color: ${isCrit ? '#ff1744' : '#ffd54f'}; font-weight: 700; font-size: ${isCrit ? '22px' : '16px'}; pointer-events: none;
        text-shadow: 0 2px 4px #000; transition: all 0.5s ease-out; z-index: 1000;
    `;
    document.body.appendChild(floatText);
    setTimeout(() => { floatText.style.transform = `translateY(-50px) scale(1.1)`; floatText.style.opacity = '0'; }, 30);
    setTimeout(() => floatText.remove(), 500);
});

function renderQuests() {
    const list = document.getElementById('quests-list');
    if (!list) return;
    list.innerHTML = '';
    gameState.quests.forEach(q => {
        const item = document.createElement('div');
        item.className = 'quest-item';
        const progress = Math.min(100, Math.floor((q.current / q.target) * 100));
        item.innerHTML = `
            <div>
                <strong>${q.text}</strong><br>
                <small>${formatNum(q.current)}/${formatNum(q.target)} (${progress}%)</small>
            </div>
            <button class="btn-action" ${q.current < q.target || q.done ? 'disabled' : ''} onclick="claimQuest(${q.id})">
                ${q.done ? 'Взято' : 'Забрати'}
            </button>
        `;
        list.appendChild(item);
    });
}

function claimQuest(id) {
    const q = gameState.quests.find(x => x.id === id);
    if (q && q.current >= q.target && !q.done) {
        q.done = true;
        if (q.isDucat) gameState.ducats += q.reward;
        else gameState.money += q.reward;
        triggerHaptic('success');
        saveGame();
        render();
        showToast("🎁 Нагороду отримано!");
    }
}

function openLeaderboard() {
    openModal('leaderboard-modal');
    triggerHaptic('light');

    const listContainer = document.getElementById('leaderboard-list');
    listContainer.innerHTML = '<div style="text-align: center; padding: 10px;">Завантаження рейтингу...</div>';

    const tgUser = tg?.initDataUnsafe?.user;
    const myName = tgUser ? (tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '')) : 'Мій Газдівський Дім';
    const myScore = gameState.money + (gameState.ducats * 1000);

    let leaders = [
        { name: 'Іван з Хуста', score: 125000000 },
        { name: 'Газда Петро', score: 85000000 },
        { name: 'Баба Марія', score: 42000000 },
        { name: 'Федір Джерельний', score: 15000000 },
        { name: 'Копача Вівці', score: 6500000 },
        { name: myName, score: myScore, isMe: true }
    ];

    leaders.sort((a, b) => b.score - a.score);

    listContainer.innerHTML = '';
    leaders.forEach((leader, index) => {
        const item = document.createElement('div');
        item.className = `leader-item ${leader.isMe ? 'me' : ''}`;
        
        let medal = `#${index + 1}`;
        if (index === 0) medal = '🥇';
        if (index === 1) medal = '🥈';
        if (index === 2) medal = '🥉';

        item.innerHTML = `
            <div><strong>${medal} ${leader.name}</strong></div>
            <div><span style="color: #ffd54f;">${formatNum(leader.score)}</span> очок</div>
        `;
        listContainer.appendChild(item);
    });
}

// Рандомні події (жук) та поява негоди/податків війта
setInterval(() => {
    if (!activeEvent && Math.random() < 0.20) {
        activeEvent = { type: 'bug', reward: Math.floor(gameState.money * 0.15) + 50 };
        document.getElementById('random-event').classList.remove('hidden');
        triggerHaptic('medium');
        playSound(800, 'sawtooth');
        setTimeout(() => {
            if (activeEvent) {
                activeEvent = null;
                document.getElementById('random-event').classList.add('hidden');
            }
        }, 5000);
    }

    // Рандомні суворі умови (Засуха або Війт)
    if (!gameState.activeHazard && Math.random() < 0.08) {
        const hazardType = Math.random() < 0.5 ? 'drought' : 'tax';
        if (hazardType === 'drought') {
            gameState.activeHazard = { type: 'drought', text: '☀️ Сильна засуха! Пасивний дохід зупинено на 30 сек.', time: 30 };
        } else {
            const taxAmount = Math.max(200, Math.floor(gameState.money * 0.1));
            gameState.activeHazard = { type: 'tax', text: `📜 Завітав сільський війт! Потрібно сплатити данину: ${formatNum(taxAmount)} грн (кликай сюди, щоб оплатити)`, amount: taxAmount, time: 45 };
            
            // Робимо клікабельним баннер для сплати податку
            document.getElementById('weather-banner').onclick = () => {
                if (gameState.money >= gameState.activeHazard.amount) {
                    gameState.money -= gameState.activeHazard.amount;
                    gameState.activeHazard = null;
                    triggerHaptic('success');
                    showToast("✅ Війт задоволений, податок сплачено!");
                    saveGame();
                    render();
                } else {
                    showToast("⚠️ У касі немає таких грошей для війта!");
                }
            };
        }
        triggerHaptic('heavy');
    }
}, 15000);

function handleEventClick() {
    if (activeEvent) {
        gameState.money += activeEvent.reward;
        triggerHaptic('heavy');
        showToast(`💥 Когута збито! +${formatNum(activeEvent.reward)} грн`);
        activeEvent = null;
        document.getElementById('random-event').classList.add('hidden');
        saveGame();
        render();
    }
}

function spinWheel() {
    triggerHaptic('medium');
    const prizes = [
        { name: '+300 грн', action: () => gameState.money += 300 },
        { name: '+1 🪙 Дукат', action: () => gameState.ducats += 1 },
        { name: '+3,000 грн', action: () => gameState.money += 3000 },
        { name: 'Нічого 😢', action: () => {} }
    ];
    const win = prizes[Math.floor(Math.random() * prizes.length)];
    document.getElementById('wheel-display').innerText = '🎰';
    setTimeout(() => {
        document.getElementById('wheel-display').innerText = win.name;
        win.action();
        triggerHaptic('success');
        saveGame();
        render();
        showToast(`Виграш: ${win.name}`);
    }, 800);
}

function openModal(id) { triggerHaptic('light'); document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { triggerHaptic('light'); document.getElementById(id).classList.add('hidden'); }

function doPrestige() {
    if (gameState.money < 200000) return showToast("⚠️ Потрібно 200,000 грн для Сплаву!");
    const earned = Math.floor(gameState.money / 200000);
    gameState.ducats += earned;
    gameState.money = 15;
    gameState.toolDurability = 100;
    gameState.beds.forEach((b, idx) => { b.level = idx === 0 ? 1 : 0; b.unlocked = idx === 0; b.unlockEndTime = 0; });
    triggerHaptic('heavy');
    saveGame(); 
    render();
    showToast(`⛵ Сплав успішний! +${earned} 🪙 Дукатів`);
}

// Щосекундний тік грального процесу
setInterval(() => {
    if (gameState.activeBoosts) {
        if (gameState.activeBoosts.palynkaTimer > 0) {
            gameState.activeBoosts.palynkaTimer--;
            // Якщо палинка закінчилася, увімкнути похмілля на 15 сек
            if (gameState.activeBoosts.palynkaTimer === 0) {
                gameState.activeBoosts.hangoverTimer = 15;
                showToast("🥴 Похмілля! Сила тапу впала на 15 секунд.");
            }
        }
        if (gameState.activeBoosts.banoshTimer > 0) gameState.activeBoosts.banoshTimer--;
        if (gameState.activeBoosts.hangoverTimer > 0) gameState.activeBoosts.hangoverTimer--;
    }

    if (gameState.activeHazard) {
        gameState.activeHazard.time--;
        if (gameState.activeHazard.time <= 0) {
            if (gameState.activeHazard.type === 'tax') {
                // Якщо не сплатив податок вовремя — штраф з каси
                gameState.money = Math.max(0, gameState.money - gameState.activeHazard.amount);
                showToast("⚠️ Війт сам забрав штраф з комори!");
            }
            gameState.activeHazard = null;
            document.getElementById('weather-banner').onclick = null;
        }
    }

    const incomeMult = (gameState.activeBoosts?.banoshTimer > 0 ? 3 : 1) * (1 + gameState.ducats * 0.15);
    let inc = 0;
    
    // Якщо засуха — пасивний дохід 0
    const isDrought = gameState.activeHazard && gameState.activeHazard.type === 'drought';
    if (!isDrought) {
        gameState.beds.forEach(b => { if (b.unlocked) inc += b.level * b.baseIncome; });
    }

    if (inc > 0) {
        gameState.money += inc * incomeMult;
    }
    
    render();
}, 1000);

setInterval(saveGame, 5000);
render();

if (gameState.settings.music) {
    bgMusic.play().catch(() => {});
}