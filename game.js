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

const adController = window.Adsgram ? window.Adsgram.init({ blockId: "bot-47604" }) : null;

async function watchAdForReward() {
    triggerHaptic('light');
    if (!adController) {
        showToast("⚠️ Рекламний модуль чекає активізації!");
        return;
    }

    try {
        const result = await adController.show();
        if (result.done) {
            gameState.ducats += 5;
            triggerHaptic('success');
            saveGame();
            render();
            showToast("🎁 Отримано +5 🪙 Дукатів за рекламу!");
        }
    } catch (e) {
        console.error("Помилка показу реклами:", e);
        showToast("⚠️ Рекламу не було доведено до кінця.");
    }
}

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
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

const defaultState = {
    money: 20,
    ducats: 5,
    clickPower: 1,
    totalClicks: 0,
    lastOnline: Date.now(),
    hasAutoCollector: false,
    activeBoosts: { palynkaTimer: 0, banoshTimer: 0 },
    settings: { music: true, sfx: true },
    beds: [
        { id: 1, name: '🥔 Крумплі', level: 1, basePrice: 15, baseIncome: 1, unlocked: true, unlockEndTime: 0 },
        { id: 2, name: '🧅 Цибуля', level: 0, basePrice: 60, baseIncome: 4, unlocked: false, unlockEndTime: 0 },
        { id: 3, name: '🍅 Парадички', level: 0, basePrice: 250, baseIncome: 15, unlocked: false, unlockEndTime: 0 },
        { id: 4, name: '🥒 Огірки', level: 0, basePrice: 1000, baseIncome: 50, unlocked: false, unlockEndTime: 0 },
        { id: 5, name: '🌶️ Поперички', level: 0, basePrice: 4000, baseIncome: 180, unlocked: false, unlockEndTime: 0 },
        { id: 6, name: '🍓 Поземок', level: 0, basePrice: 15000, baseIncome: 600, unlocked: false, unlockEndTime: 0 },
        { id: 7, name: '🌽 Кіндериця', level: 0, basePrice: 60000, baseIncome: 2200, unlocked: false, unlockEndTime: 0 },
        { id: 8, name: '🍇 Грозна', level: 0, basePrice: 250000, baseIncome: 8500, unlocked: false, unlockEndTime: 0 },
        { id: 9, name: '🍏 Яблука', level: 0, basePrice: 1000000, baseIncome: 32000, unlocked: false, unlockEndTime: 0 },
        { id: 10, name: '🫐 Чорниці', level: 0, basePrice: 4500000, baseIncome: 130000, unlocked: false, unlockEndTime: 0 },
        { id: 11, name: '🧄 Чеснок', level: 0, basePrice: 20000000, baseIncome: 520000, unlocked: false, unlockEndTime: 0 },
        { id: 12, name: '🍄 Трюфлі', level: 0, basePrice: 90000000, baseIncome: 2100000, unlocked: false, unlockEndTime: 0 },
        { id: 13, name: '🍷 Ґраппа', level: 0, basePrice: 400000000, baseIncome: 8800000, unlocked: false, unlockEndTime: 0 },
        { id: 14, name: '💧 Поляна Квасова', level: 0, basePrice: 2000000000, baseIncome: 38000000, unlocked: false, unlockEndTime: 0 },
        { id: 15, name: '🌸 Шафран', level: 0, basePrice: 10000000000, baseIncome: 175000000, unlocked: false, unlockEndTime: 0 }
    ],
    quests: [
        { id: 1, text: 'Зробити 100 тапів', target: 100, current: 0, reward: 250, isDucat: false, done: false },
        { id: 2, text: 'Назбирати 5,000 грн', target: 5000, current: 0, reward: 5, isDucat: true, done: false },
        { id: 3, text: 'Відкрити 5 грядок', target: 5, current: 1, reward: 10, isDucat: true, done: false },
        { id: 4, text: 'Відкрити 10 грядок', target: 10, current: 1, reward: 25, isDucat: true, done: false }
    ]
};

let gameState = defaultState;

function saveGame() {
    try {
        gameState.lastOnline = Date.now();
        localStorage.setItem('zakarpattia_farm_save_v10', JSON.stringify(gameState));
    } catch(e) {}
}

try {
    const loaded = localStorage.getItem('zakarpattia_farm_save_v10');
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

    const tapMultiplier = (gameState.activeBoosts?.palynkaTimer > 0 ? 5 : 1) * (1 + gameState.ducats * 0.15);
    const incomeMultiplier = (gameState.activeBoosts?.banoshTimer > 0 ? 3 : 1) * (1 + gameState.ducats * 0.15);

    document.getElementById('money-display').innerText = formatNum(gameState.money);
    document.getElementById('ducats-display').innerText = gameState.ducats;
    document.getElementById('click-power-display').innerText = formatNum(gameState.clickPower * tapMultiplier);
    
    const totalPassive = gameState.beds.reduce((acc, b) => acc + (b.unlocked ? b.level * b.baseIncome : 0), 0) * incomeMultiplier;
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
            const cost = Math.floor(bed.basePrice * Math.pow(1.17, bed.level));
            const canAfford = gameState.money >= cost;
            const currentIncome = Math.floor(bed.level * bed.baseIncome * incomeMultiplier);

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
            const speedUpDucats = 3;
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
    const cost = Math.floor(bed.basePrice * Math.pow(1.17, bed.level));
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
        const minutesToAdd = bedIndex * 15;
        
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
    const speedUpDucats = 3;
    
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
        showToast("⚠️ Мало донатних дукатів!");
    }
}

function buyBoost(type, price) {
    if (gameState.money >= price) {
        gameState.money -= price;
        if (!gameState.activeBoosts) gameState.activeBoosts = { palynkaTimer: 0, banoshTimer: 0 };
        if (type === 'palynka') gameState.activeBoosts.palynkaTimer = 30;
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

function buyWithStars(itemType, starsPrice) {
    triggerHaptic('medium');
    if (!tg || !tg.openInvoice) {
        if (confirm(`Симуляція покупка за ⭐ ${starsPrice} Зірок?`)) {
            processSuccessfulPurchase(itemType);
        }
        return;
    }
    try {
        if (confirm(`Підтвердити покупку за ⭐ ${starsPrice} Зірок?`)) {
            processSuccessfulPurchase(itemType);
        }
    } catch (e) {
        showToast("⚠️ Помилка створення платежу.");
    }
}

function processSuccessfulPurchase(itemType) {
    if (itemType === 'auto_collector') {
        gameState.hasAutoCollector = true;
        showToast("🎉 Кіт-Копач тепер працює на вас вічно!");
    } else if (itemType === 'ducats_pack') {
        gameState.ducats += 50;
        showToast("🎉 Отримано +50 Дукатів!");
    } else if (itemType === 'super_chest') {
        gameState.ducats += 250;
        gameState.activeBoosts.banoshTimer += 3600;
        showToast("🎉 Скриня успішно відкрита!");
    }
    triggerHaptic('success');
    saveGame();
    render();
    closeModal('stars-modal');
}

document.getElementById('tap-btn').addEventListener('click', (e) => {
    if (gameState.settings.music && bgMusic.paused) {
        bgMusic.play().catch(() => {});
    }

    const tapMultiplier = (gameState.activeBoosts?.palynkaTimer > 0 ? 5 : 1) * (1 + gameState.ducats * 0.15);
    const isCrit = Math.random() < 0.15;
    const earned = Math.floor(gameState.clickPower * tapMultiplier * (isCrit ? 5 : 1));

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
        { name: 'Іван з Хуста', score: 1250000 },
        { name: 'Газда Петро', score: 850000 },
        { name: 'Баба Марія', score: 420000 },
        { name: 'Федір Джерельний', score: 150000 },
        { name: 'Копача Вівці', score: 65000 },
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

setInterval(() => {
    if (!activeEvent && Math.random() < 0.3) {
        activeEvent = { type: 'bug', reward: Math.floor(gameState.money * 0.2) + 100 };
        document.getElementById('random-event').classList.remove('hidden');
        triggerHaptic('medium');
        playSound(800, 'sawtooth');
        setTimeout(() => {
            if (activeEvent) {
                activeEvent = null;
                document.getElementById('random-event').classList.add('hidden');
            }
        }, 6000);
    }
}, 10000);

function handleEventClick() {
    if (activeEvent) {
        gameState.money += activeEvent.reward;
        triggerHaptic('heavy');
        showToast(`💥 Жука збито! +${formatNum(activeEvent.reward)} грн`);
        activeEvent = null;
        document.getElementById('random-event').classList.add('hidden');
        saveGame();
        render();
    }
}

function spinWheel() {
    triggerHaptic('medium');
    const prizes = [
        { name: '+500 грн', action: () => gameState.money += 500 },
        { name: '+2 🪙 Дукати', action: () => gameState.ducats += 2 },
        { name: '+5,000 грн', action: () => gameState.money += 5000 },
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
    if (gameState.money < 50000) return showToast("⚠️ Потрібно 50,000 грн!");
    const earned = Math.floor(gameState.money / 50000);
    gameState.ducats += earned;
    gameState.money = 20;
    gameState.beds.forEach((b, idx) => { b.level = idx === 0 ? 1 : 0; b.unlocked = idx === 0; b.unlockEndTime = 0; });
    triggerHaptic('heavy');
    saveGame(); 
    render();
    showToast(`⛵ Сплав успішний! +${earned} 🪙 Дукатів`);
}

setInterval(() => {
    if (gameState.activeBoosts) {
        if (gameState.activeBoosts.palynkaTimer > 0) gameState.activeBoosts.palynkaTimer--;
        if (gameState.activeBoosts.banoshTimer > 0) gameState.activeBoosts.banoshTimer--;
    }

    const incomeMult = (gameState.activeBoosts?.banoshTimer > 0 ? 3 : 1) * (1 + gameState.ducats * 0.15);
    let inc = 0;
    gameState.beds.forEach(b => { if (b.unlocked) inc += b.level * b.baseIncome; });
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