// ==========================================
// 🔑 НАЛАШТУВАННЯ SUPABASE & TELEGRAM ID
// ==========================================
const SUPABASE_URL = "https://thyzxtnsgptkkftupifn.supabase.co/rest/v1/"; // Заміни на свій Project URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeXp4dG5zZ3B0a2tmdHVwaWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzQxNTYsImV4cCI6MjEwNDgxMDE1Nn0.Xm9ewxhj46pHPPDstgqx4VO6ue3ODCsaoDa9T0aqUm0";                  // Заміни на свій anon/public key

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Отримання ID та даних гравця з Telegram
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const tgUser = tg?.initDataUnsafe?.user;
const userId = tgUser?.id ? String(tgUser.id) : "test_dev_user";
const startParam = tg?.initDataUnsafe?.start_param;

// ==========================================
// 🔊 АУДІО СИСТЕМА
// ==========================================
const bgMusic = document.getElementById('bg-music');
let isAudioUnlocked = false;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (!isAudioUnlocked && bgMusic) {
        bgMusic.volume = 0.25;
        bgMusic.play().then(() => { isAudioUnlocked = true; }).catch(() => {});
    }
}

window.toggleSound = function() {
    const btn = document.getElementById('sound-toggle-btn');
    if (!bgMusic) return;

    if (bgMusic.paused) {
        bgMusic.play();
        if (btn) btn.innerText = '🔊';
    } else {
        bgMusic.pause();
        if (btn) btn.innerText = '🔇';
    }
};

function playSFX(freq, type = 'sine', duration = 0.1) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// ==========================================
// 📊 СТАН ГРИ ТА СКЛАДНИЙ БАЛАНС
// ==========================================
const defaultState = {
    balance: 0,
    totalEarned: 0,
    playerLevel: 1,
    xp: 0,
    talers: 0,
    grapes: 0,
    clickPower: 1,
    boostTimer: 0,
    bograchTimer: 0,
    statClicks: 0,
    statMushrooms: 0,
    refCount: 0,
    referredBy: null,
    // Налаштування будівель (Час розблокування: 5хв, 15хв, 25хв, 35хв, 45хв)
    businesses: [
        { id: 'vineyard', name: 'Виноградарня', icon: '🍇', baseCost: 50, baseIncome: 1, level: 0, reqLevel: 1, unlockTime: 300, unlockTimer: 0, isUnlocking: false, isUnlocked: true, progress: 0 },
        { id: 'polonyna', name: 'Овеча Полонина', icon: '🧀', baseCost: 1500, baseIncome: 12, level: 0, reqLevel: 2, unlockTime: 900, unlockTimer: 0, isUnlocking: false, isUnlocked: false, progress: 0 },
        { id: 'cellar', name: 'Винний Льох', icon: '🍷', baseCost: 25000, baseIncome: 95, level: 0, reqLevel: 4, unlockTime: 1500, unlockTimer: 0, isUnlocking: false, isUnlocked: false, progress: 0 },
        { id: 'resort', name: 'Теплі Купелі', icon: '♨️', baseCost: 450000, baseIncome: 650, level: 0, reqLevel: 7, unlockTime: 2100, unlockTimer: 0, isUnlocking: false, isUnlocked: false, progress: 0 },
        { id: 'castle', name: 'Замок Паланок', icon: '🏰', baseCost: 8500000, baseIncome: 4800, level: 0, reqLevel: 10, unlockTime: 2700, unlockTimer: 0, isUnlocking: false, isUnlocked: false, progress: 0 }
    ],
    wines: [
        { id: 'isabella', name: 'Файне Чикало', reqGrapes: 150, cost: 500, crafted: 0, boost: 0.05 },
        { id: 'cabernet', name: 'Закарпатське Бордо', reqGrapes: 800, cost: 5000, crafted: 0, boost: 0.15 },
        { id: 'troianda', name: 'Троянда Закарпаття', reqGrapes: 3000, cost: 50000, crafted: 0, boost: 0.40 }
    ],
    quests: [
        { id: 'q_click', title: 'Роботящий Леґінь', desc: 'Збери виноград 100 разів', req: 100, current: 0, rewardCoins: 250, rewardXp: 30, done: false },
        { id: 'q_mush', title: 'Хитрий Грибар', desc: 'Знайди 3 білі гриби у лісі', req: 3, current: 0, rewardCoins: 600, rewardXp: 70, done: false },
        { id: 'q_biz', title: 'Великий Ґазда', desc: 'Май сумарно 15 рівнів господарства', req: 15, current: 0, rewardCoins: 1200, rewardXp: 120, done: false }
    ]
};

let gameState = JSON.parse(localStorage.getItem('zakarpattia_farm_v15')) || defaultState;

// Перевірка на випадок оновлення структури збереження
if (!gameState.wines) gameState.wines = defaultState.wines;
if (!gameState.quests) gameState.quests = defaultState.quests;

// ==========================================
// 💾 СИНХРОНІЗАЦІЯ З БАЗОЮ (SUPABASE)
// ==========================================
async function loadGameFromServer() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('players')
            .select('save_data')
            .eq('telegram_id', userId)
            .single();

        if (data && data.save_data) {
            gameState = { ...defaultState, ...data.save_data };
        } else {
            await processReferral();
        }
    } catch (e) {
        console.warn("База недоступна, використовуємо локальне збереження", e);
    }
    updateUI();
}

async function saveGame() {
    localStorage.setItem('zakarpattia_farm_v15', JSON.stringify(gameState));

    if (!supabase) return;
    try {
        await supabase
            .from('players')
            .upsert({ 
                telegram_id: userId, 
                save_data: gameState,
                updated_at: new Date()
            });
    } catch (e) {}
}

// ==========================================
// 👥 РЕФЕРАЛЬНА СИСТЕМА
// ==========================================
async function processReferral() {
    if (!startParam || startParam === userId || gameState.referredBy) return;

    gameState.referredBy = startParam;
    gameState.balance += 300;
    alert("🎁 Вас запросив кум! Ви отримали +300 ₴ підйомних!");

    if (!supabase) return;

    try {
        const { data } = await supabase
            .from('players')
            .select('save_data')
            .eq('telegram_id', startParam)
            .single();

        if (data && data.save_data) {
            const referrerState = data.save_data;
            referrerState.balance = (referrerState.balance || 0) + 1000;
            referrerState.talers = (referrerState.talers || 0) + 1;
            referrerState.refCount = (referrerState.refCount || 0) + 1;

            await supabase
                .from('players')
                .upsert({
                    telegram_id: startParam,
                    save_data: referrerState,
                    updated_at: new Date()
                });
        }
    } catch (e) {}
}

window.shareRefLink = function() {
    initAudio();
    const botUsername = "ТВІЙ_BOT_USERNAME"; // 👈 ЗАМІНИ на юзернейм свого бота без @
    const link = `https://t.me/${botUsername}/play?startapp=${userId}`;
    const text = "Заходь у закарпатську ґражду! Будуй бізнес, вирощуй виноград та заробляй!";
    
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else {
        navigator.clipboard.writeText(link);
        alert("📋 Посилання скопійовано!");
    }
};

// ==========================================
// 🏆 ТАБЛИЦЯ ЛІДЕРІВ
// ==========================================
window.loadLeaderboard = async function() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<p style="text-align:center;">Збираємо дані з району...</p>';

    if (!supabase) {
        listEl.innerHTML = '<p style="text-align:center; color:red;">База даних не налаштована.</p>';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('players')
            .select('telegram_id, save_data')
            .limit(50);

        if (error) throw error;

        const players = data
            .map(row => {
                const save = row.save_data || {};
                return {
                    id: row.telegram_id,
                    level: save.playerLevel || 1,
                    earned: save.totalEarned || save.balance || 0,
                    talers: save.talers || 0
                };
            })
            .sort((a, b) => b.earned - a.earned)
            .slice(0, 10);

        listEl.innerHTML = '';
        players.forEach((p, index) => {
            let medal = `#${index + 1}`;
            if (index === 0) medal = '🥇';
            if (index === 1) medal = '🥈';
            if (index === 2) medal = '🥉';

            const isCurrent = String(p.id) === String(userId);

            listEl.innerHTML += `
                <div class="quest-card" style="${isCurrent ? 'border: 2px solid #ffd54f; background: rgba(255,213,79,0.15);' : ''}">
                    <div class="quest-info">
                        <h4>${medal} Ґазда ID: ...${String(p.id).slice(-4)} ${isCurrent ? '(Ти)' : ''}</h4>
                        <p>Рівень: 👨‍🌾 ${p.level} | Талери: ⭐ ${p.talers}</p>
                        <p style="color:#aed581; font-weight:bold;">Зароблено: 🪙 ${Math.floor(p.earned)} ₴</p>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        listEl.innerHTML = '<p style="text-align:center;">Помилка завантаження списку лідерів.</p>';
    }
};

// ==========================================
// ⚙️ МЕХАНІКИ ПРОКАЧКИ ТА ТАЙМЕРІВ
// ==========================================
function getBusinessCost(b) {
    // Коефіцієнт зростання 1.45 забезпечує високу складність
    return Math.floor(b.baseCost * Math.pow(1.45, b.level));
}

function getBusinessMultiplier(level) {
    let mult = 1;
    // Кожні 10 рівнів множать прибуток на х2
    const tens = Math.floor(level / 10);
    if (tens > 0) mult *= Math.pow(2, tens);
    // На 25 рівні діє великий бонус х5
    if (level >= 25) mult *= 5;
    return mult;
}

function getWineMultiplier() {
    return 1 + gameState.wines.reduce((sum, w) => sum + (w.crafted * w.boost), 0);
}

function getPrestigeMultiplier() {
    let boost = 1;
    if (gameState.boostTimer > 0) boost *= 2;
    if (gameState.bograchTimer > 0) boost *= 3;
    return (1 + (gameState.talers * 0.1)) * getWineMultiplier() * boost;
}

function getTotalPps() {
    const basePps = gameState.businesses.reduce((sum, b) => {
        if (!b.isUnlocked) return sum;
        return sum + (b.level * b.baseIncome * getBusinessMultiplier(b.level));
    }, 0);
    return Math.floor(basePps * getPrestigeMultiplier());
}

function getXpForNextLevel() {
    return Math.floor(150 * Math.pow(1.5, gameState.playerLevel - 1));
}

function addXp(amount) {
    gameState.xp += amount;
    const reqXp = getXpForNextLevel();
    if (gameState.xp >= reqXp) {
        gameState.xp -= reqXp;
        gameState.playerLevel += 1;
        playSFX(880, 'sine', 0.3);
        alert(`🎉 Вітаємо! Ви досягли ${gameState.playerLevel}-го рівня Ґазди!`);
    }
}

// Запуск будівництва нової грядки/споруди
window.startUnlockBusiness = function(i) {
    initAudio();
    const b = gameState.businesses[i];
    if (gameState.playerLevel >= b.reqLevel && !b.isUnlocked && !b.isUnlocking) {
        b.isUnlocking = true;
        b.unlockTimer = b.unlockTime;
        playSFX(500, 'square', 0.2);
        saveGame();
        updateUI();
    }
};

window.buyBusiness = function(i) {
    initAudio();
    const b = gameState.businesses[i];
    if (!b.isUnlocked) return;

    const cost = getBusinessCost(b);
    if (gameState.balance >= cost) {
        gameState.balance -= cost;
        b.level += 1;
        addXp(Math.floor(cost * 0.05));
        playSFX(587.33, 'triangle', 0.15);
        saveGame();
        updateUI();
    }
};

// ==========================================
// 🍷 ВИНОРОБСТВО ТА 📜 КВЕСТИ
// ==========================================
window.craftWine = function(i) {
    initAudio();
    const w = gameState.wines[i];
    if (gameState.grapes >= w.reqGrapes && gameState.balance >= w.cost) {
        gameState.grapes -= w.reqGrapes;
        gameState.balance -= w.cost;
        w.crafted += 1;
        playSFX(659.25, 'sine', 0.3);
        alert(`🍷 Ви успішно виготовили "${w.name}"! Дохід збільшено на +${Math.round(w.boost * 100)}%`);
        saveGame();
        updateUI();
        renderWines();
    }
};

window.claimQuest = function(i) {
    initAudio();
    const q = gameState.quests[i];
    if (!q.done && q.current >= q.req) {
        q.done = true;
        gameState.balance += q.rewardCoins;
        addXp(q.rewardXp);
        playSFX(783.99, 'sine', 0.3);
        alert(`📜 Квест "${q.title}" виконано! Отримано: +${q.rewardCoins} ₴ та +${q.rewardXp} XP`);
        saveGame();
        updateUI();
        renderQuests();
    }
};

window.doPrestige = function() {
    initAudio();
    if (gameState.balance < 1000000) {
        alert("Потрібно мати принаймні 1,000,000 ₴ для проведення перерозподілу!");
        return;
    }

    if (confirm("Ви впевнені? Скинеться баланс та рівні будівель, але ви отримаєте Талери, які назавжди помножать ваш дохід!")) {
        const gainedTalers = Math.floor(Math.sqrt(gameState.balance / 100000));
        gameState.talers += gainedTalers;
        gameState.balance = 0;
        gameState.playerLevel = 1;
        gameState.xp = 0;
        
        gameState.businesses.forEach((b, index) => {
            b.level = 0;
            b.progress = 0;
            b.isUnlocked = (index === 0);
            b.isUnlocking = false;
            b.unlockTimer = 0;
        });

        playSFX(1046.50, 'triangle', 0.5);
        alert(`👑 Перерозподіл успішний! Отримано +${gainedTalers} Талерів!`);
        saveGame();
        updateUI();
    }
};

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}хв ${s < 10 ? '0' : ''}${s}с`;
}

// ==========================================
// 📱 ВІДОБРАЖЕННЯ ТА ІНТЕРФЕЙС
// ==========================================
window.switchTab = function(tab) {
    initAudio();
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active');
    
    if (event && event.target) event.target.classList.add('active');

    if (tab === 'top') loadLeaderboard();
    if (tab === 'wine') renderWines();
    if (tab === 'quests') renderQuests();
};

function renderWines() {
    const list = document.getElementById('wine-list');
    if (!list) return;
    list.innerHTML = '';

    gameState.wines.forEach((w, i) => {
        const canCraft = gameState.grapes >= w.reqGrapes && gameState.balance >= w.cost;
        list.innerHTML += `
            <div class="quest-card">
                <div class="quest-info">
                    <h4>🍷 ${w.name} (Створено: ${w.crafted})</h4>
                    <p>Вимоги: 🍇 ${w.reqGrapes} винограду | 🪙 ${w.cost} ₴</p>
                    <p style="color:#aed581;">Бонус: +${Math.round(w.boost * 100)}% до загального доходу</p>
                </div>
                <button class="claim-btn" ${canCraft ? '' : 'disabled'} onclick="craftWine(${i})">Виготовити</button>
            </div>
        `;
    });
}

function renderQuests() {
    const list = document.getElementById('quest-list');
    if (!list) return;
    list.innerHTML = '';

    // Актуалізація прогресу квестів
    gameState.quests[0].current = gameState.statClicks;
    gameState.quests[1].current = gameState.statMushrooms;
    gameState.quests[2].current = gameState.businesses.reduce((sum, b) => sum + b.level, 0);

    gameState.quests.forEach((q, i) => {
        const canClaim = !q.done && q.current >= q.req;
        list.innerHTML += `
            <div class="quest-card">
                <div class="quest-info">
                    <h4>${q.done ? '✅' : '📜'} ${q.title}</h4>
                    <p>${q.desc} (${Math.min(q.current, q.req)}/${q.req})</p>
                    <p style="color:#ffd54f;">Винагорода: +${q.rewardCoins} ₴ | +${q.rewardXp} XP</p>
                </div>
                <button class="claim-btn" ${canClaim ? '' : 'disabled'} onclick="claimQuest(${i})">
                    ${q.done ? 'Виконано' : 'Забрати'}
                </button>
            </div>
        `;
    });
}

function updateUI() {
    const balanceEl = document.getElementById('balance');
    if (balanceEl) balanceEl.innerText = Math.floor(gameState.balance);

    const ppsEl = document.getElementById('pps');
    if (ppsEl) ppsEl.innerText = getTotalPps();

    const lvlEl = document.getElementById('player-level');
    if (lvlEl) lvlEl.innerText = gameState.playerLevel;

    const talersEl = document.getElementById('talers');
    if (talersEl) talersEl.innerText = gameState.talers;

    const grapesEl = document.getElementById('grape-count');
    if (grapesEl) grapesEl.innerText = gameState.grapes;

    const reqXp = getXpForNextLevel();
    const xpBar = document.getElementById('xp-bar-fill');
    if (xpBar) xpBar.style.width = `${Math.min(100, (gameState.xp / reqXp) * 100)}%`;

    gameState.businesses.forEach((b, i) => {
        const cost = getBusinessCost(b);
        const shaft = document.getElementById(`shaft-${i}`);
        const btn = document.getElementById(`btn-${i}`);

        if (shaft && btn) {
            if (gameState.playerLevel < b.reqLevel) {
                shaft.classList.add('locked');
                btn.disabled = true;
                btn.innerHTML = `<span style="font-size:9px">🔒 Рівень ${b.reqLevel}</span>`;
            } else if (!b.isUnlocked) {
                shaft.classList.add('locked');
                if (b.isUnlocking) {
                    btn.disabled = true;
                    btn.innerHTML = `<span style="font-size:9px">⏳ Будується...<br>${formatTime(b.unlockTimer)}</span>`;
                } else {
                    btn.disabled = false;
                    btn.innerHTML = `<span style="font-size:9px">🏗️ Розпочати (${formatTime(b.unlockTime)})</span>`;
                    btn.onclick = () => startUnlockBusiness(i);
                }
            } else {
                shaft.classList.remove('locked');
                btn.disabled = gameState.balance < cost;
                btn.onclick = () => buyBusiness(i);
                
                const bonus = getBusinessMultiplier(b.level);
                const bonusText = bonus > 1 ? ` (x${bonus})` : '';

                const lvlBadge = document.getElementById(`lvl-${i}`);
                if (lvlBadge) lvlBadge.innerText = b.level;

                const costEl = document.getElementById(`cost-${i}`);
                if (costEl) costEl.innerText = `${cost} ₴`;

                const rateEl = document.getElementById(`rate-${i}`);
                if (rateEl) rateEl.innerText = `+${Math.floor(b.level * b.baseIncome * bonus * getPrestigeMultiplier())} ₴/с${bonusText}`;
            }
        }
    });
}

function initDOM() {
    const container = document.getElementById('mines-container');
    if (!container) return;
    container.innerHTML = '';
    gameState.businesses.forEach((b, i) => {
        container.innerHTML += `
            <div id="shaft-${i}" class="mine-shaft">
                <div class="mine-avatar">${b.icon}<span id="lvl-${i}" class="mine-level-badge">0</span></div>
                <div class="mine-details">
                    <div class="mine-header"><strong>${b.name}</strong><span id="rate-${i}">+0 ₴/с</span></div>
                    <div class="progress-container"><div id="pbar-${i}" class="progress-fill"></div></div>
                </div>
                <button id="btn-${i}" class="lvl-up-btn">
                    <span style="font-size:9px">БУДУВАТИ</span><br><span id="cost-${i}">0 ₴</span>
                </button>
            </div>
        `;
    });
}

// ==========================================
// 🔄 ГОЛОВНИЙ ІГРОВИЙ ЦИКЛ (GAME LOOP)
// ==========================================
let lastTick = Date.now();
function gameLoop() {
    const now = Date.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;

    // Таймери будівництва
    gameState.businesses.forEach(b => {
        if (b.isUnlocking) {
            b.unlockTimer -= delta;
            if (b.unlockTimer <= 0) {
                b.isUnlocking = false;
                b.isUnlocked = true;
                b.unlockTimer = 0;
                alert(`🎉 Будівництво закінчено! Об'єкт "${b.name}" відтепер працює!`);
                saveGame();
            }
        }
    });

    // Нарахування доходу
    gameState.businesses.forEach((b, i) => {
        if (b.isUnlocked && b.level > 0) {
            b.progress += delta * 100;
            if (b.progress >= 100) {
                b.progress = 0;
                const earned = (b.level * b.baseIncome * getBusinessMultiplier(b.level) * getPrestigeMultiplier());
                gameState.balance += earned;
                gameState.totalEarned += earned;
            }
            const pbar = document.getElementById(`pbar-${i}`);
            if (pbar) pbar.style.width = `${b.progress}%`;
        }
    });

    updateUI();
    requestAnimationFrame(gameLoop);
}

// ==========================================
// 🚀 СТАРТ ТА ПОДІЇ
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    initDOM();
    await loadGameFromServer();

    // Розблокування звуку першим кліком
    const unlockHandler = () => {
        initAudio();
        document.removeEventListener('click', unlockHandler);
        document.removeEventListener('touchstart', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    document.addEventListener('touchstart', unlockHandler);

    // Клік по винограду
    const clickBtn = document.getElementById('click-btn');
    if (clickBtn) {
        clickBtn.addEventListener('click', () => {
            initAudio();
            gameState.grapes += 1;
            gameState.statClicks += 1;
            const clickEarned = gameState.clickPower * getPrestigeMultiplier();
            gameState.balance += clickEarned;
            gameState.totalEarned += clickEarned;
            addXp(1);
            playSFX(440, 'sine', 0.08);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            updateUI();
        });
    }

    // Автозбереження кожні 10 секунд
    setInterval(saveGame, 10000);
    requestAnimationFrame(gameLoop);
});