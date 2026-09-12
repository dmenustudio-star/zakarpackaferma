// ==========================================
// 🔑 НАЛАШТУВАННЯ SUPABASE & TELEGRAM ID
// ==========================================
const SUPABASE_URL = "sb_publishable_E0vH6VXOaDuabzi6gROFqw_K__mVSKW"; // Заміни на свій Project URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeXp4dG5zZ3B0a2tmdHVwaWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzQxNTYsImV4cCI6MjEwNDgxMDE1Nn0.Xm9ewxhj46pHPPDstgqx4VO6ue3ODCsaoDa9T0aqUm0";                  // Заміни на свій anon/public key

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Отримання ID гравця з Telegram
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const tgUser = tg?.initDataUnsafe?.user;
const userId = tgUser?.id ? String(tgUser.id) : "test_dev_user";

// ==========================================
// АУДІО СИСТЕМА
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
// СТАН ГРИ ТА ДАНІ
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
    businesses: [
        { id: 'vineyard', name: 'Винобраня', icon: '🍇', baseCost: 10, baseIncome: 1, level: 0, reqLevel: 1, progress: 0 },
        { id: 'polonyna', name: 'Овеча Полонина', icon: '🧀', baseCost: 100, baseIncome: 8, level: 0, reqLevel: 2, progress: 0 },
        { id: 'cellar', name: 'Винний Льох', icon: '🍷', baseCost: 1100, baseIncome: 47, level: 0, reqLevel: 3, progress: 0 },
        { id: 'resort', name: 'Теплі Купелі', icon: '♨️', baseCost: 12000, baseIncome: 260, level: 0, reqLevel: 5, progress: 0 },
        { id: 'castle', name: 'Замок Паланок', icon: '🏰', baseCost: 100000, baseIncome: 1400, level: 0, reqLevel: 8, progress: 0 }
    ],
    wines: [
        { id: 'isabella', name: 'Файне Чикало', reqGrapes: 50, cost: 200, crafted: 0, boost: 0.05 },
        { id: 'cabernet', name: 'Закарпатське Бордо', reqGrapes: 250, cost: 1500, crafted: 0, boost: 0.15 },
        { id: 'troianda', name: 'Троянда Закарпаття', reqGrapes: 1000, cost: 10000, crafted: 0, boost: 0.40 }
    ],
    quests: [
        { id: 'q_click', title: 'Роботящий Леґінь', desc: 'Урви 50 разів трачу', req: 50, current: 0, rewardCoins: 150, rewardXp: 20, done: false },
        { id: 'q_mushroom', title: 'Хитрий Грибар', desc: 'Знайди 2 файні білі гриби', req: 2, current: 0, rewardCoins: 300, rewardXp: 50, done: false },
        { id: 'q_biz', title: 'Великий Ґазда', desc: 'Май сумарно 10 рівнів ґражди', req: 10, current: 0, rewardCoins: 500, rewardXp: 80, done: false }
    ]
};

let gameState = JSON.parse(localStorage.getItem('zakarpattia_farm_v13')) || defaultState;

// ==========================================
// СИНХРОНІЗАЦІЯ З БАЗОЮ DANIH (SUPABASE)
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
            console.log("✅ Прогрес ґазди завантажено з хмари!");
        } else {
            console.log("🆕 Новий ґазда! Створюємо запис у базі...");
        }
    } catch (e) {
        console.warn("Помилка зв'язку з базою, використовуємо локальну пам'ять", e);
    }
    updateUI();
}

async function saveGame() {
    // 1. Локальний бэкап
    localStorage.setItem('zakarpattia_farm_v13', JSON.stringify(gameState));

    // 2. Хмарне збереження у Supabase
    if (!supabase) return;
    try {
        await supabase
            .from('players')
            .upsert({ 
                telegram_id: userId, 
                save_data: gameState,
                updated_at: new Date()
            });
    } catch (e) {
        console.error("Помилка збереження у хмару:", e);
    }
}

// ==========================================
// ЛОГІКА ГРИ
// ==========================================
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
    const basePps = gameState.businesses.reduce((sum, b) => sum + (b.level * b.baseIncome), 0);
    return Math.floor(basePps * getPrestigeMultiplier());
}

function getXpForNextLevel() {
    return Math.floor(100 * Math.pow(1.4, gameState.playerLevel - 1));
}

function addXp(amount) {
    gameState.xp += amount;
    const reqXp = getXpForNextLevel();
    if (gameState.xp >= reqXp) {
        gameState.xp -= reqXp;
        gameState.playerLevel += 1;
        playSFX(880, 'sine', 0.3);
        alert(`🎉 Йой, вічуємо! Ти тепер ${gameState.playerLevel}-й рівень Ґазди!`);
    }
}

function updateQuests() {
    gameState.quests.forEach(q => {
        if (q.done) return;
        if (q.id === 'q_click') q.current = gameState.statClicks;
        if (q.id === 'q_mushroom') q.current = gameState.statMushrooms;
        if (q.id === 'q_biz') q.current = gameState.businesses.reduce((sum, b) => sum + b.level, 0);
    });
}

window.claimQuest = function(index) {
    initAudio();
    const q = gameState.quests[index];
    if (q && !q.done && q.current >= q.req) {
        q.done = true;
        gameState.balance += q.rewardCoins;
        addXp(q.rewardXp);
        playSFX(784, 'triangle', 0.2);
        alert(`🎁 Нагороду взято: +${q.rewardCoins} ₴ та +${q.rewardXp} XP! Файний ґазда!`);
        saveGame();
        updateUI();
    }
};

window.craftWine = function(index) {
    initAudio();
    const w = gameState.wines[index];
    if (gameState.grapes >= w.reqGrapes && gameState.balance >= w.cost) {
        gameState.grapes -= w.reqGrapes;
        gameState.balance -= w.cost;
        w.crafted += 1;
        playSFX(659, 'sine', 0.2);
        alert(`🍷 Закупорено пляшку "${w.name}"! Дохід виростав на +${Math.round(w.boost * 100)}%!`);
        saveGame();
        updateUI();
    }
};

window.buyBograchBoost = function() {
    initAudio();
    if (gameState.balance >= 500) {
        gameState.balance -= 500;
        gameState.bograchTimer += 120;
        playSFX(523, 'square', 0.2);
        alert("🍲 Наїлися-сьте бограчу! Прибуток x3 на 2 мінути!");
        saveGame();
        updateUI();
    } else {
        alert("Нийсе грошей! Потрібно 500 ₴");
    }
};

window.buyBusiness = function(i) {
    initAudio();
    const b = gameState.businesses[i];
    const cost = Math.floor(b.baseCost * Math.pow(1.15, b.level));
    if (gameState.balance >= cost && gameState.playerLevel >= b.reqLevel) {
        gameState.balance -= cost;
        b.level += 1;
        addXp(Math.floor(cost * 0.08));
        playSFX(587.33, 'triangle', 0.15);
        saveGame();
        updateUI();
    }
};

window.switchTab = function(tab) {
    initAudio();
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    event.target.classList.add('active');
};

window.spinWheel = function() {
    initAudio();
    if (gameState.balance < 100) {
        alert("Замало крейцарів! Треба 100 ₴");
        return;
    }
    gameState.balance -= 100;
    playSFX(600, 'sine', 0.1);

    const display = document.getElementById('wheel-result');
    if (display) display.innerText = "🌀";

    setTimeout(() => {
        const prizes = ['coins', 'boost', 'taler', 'grapes'];
        const res = prizes[Math.floor(Math.random() * prizes.length)];
        
        if (res === 'coins') {
            const win = 400 * gameState.playerLevel;
            gameState.balance += win;
            if (display) display.innerText = "🪙";
            alert(`🎉 Урвав-сь ${win} ₴!`);
        } else if (res === 'boost') {
            gameState.boostTimer += 60;
            if (display) display.innerText = "🔥";
            alert("🔥 Урвав-сь Х2 НАВАР на 60 секунд!");
        } else if (res === 'grapes') {
            gameState.grapes += 100;
            if (display) display.innerText = "🍇";
            alert("🍇 Взяв-сь +100 кг Трачу!");
        } else {
            gameState.talers += 1;
            if (display) display.innerText = "⭐";
            alert("⭐ Супер приз! +1 Закарпатський Талер!");
        }
        saveGame();
        updateUI();
    }, 800);
};

window.doPrestige = function() {
    initAudio();
    const reward = Math.floor(Math.sqrt(gameState.totalEarned / 50000));
    if (reward <= 0) {
        alert("Зароби майже 50,000 ₴ загалом, аби-сь мав за що у Чехи їхати!");
        return;
    }

    if (confirm(`Айдав у Чехи? Отримаєш +${reward} ⭐ Талерів, але ґражда скинеся!`)) {
        gameState.talers += reward;
        gameState.balance = 0;
        gameState.businesses.forEach(b => b.level = 0);
        saveGame();
        updateUI();
        switchTab('mines');
    }
};

function spawnRandomEvent() {
    if (Math.random() < 0.4) {
        const el = document.getElementById('random-event');
        if (!el) return;
        const x = Math.random() * (window.innerWidth - 60);
        const y = 120 + Math.random() * (window.innerHeight - 250);
        
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.display = 'block';

        setTimeout(() => { el.style.display = 'none'; }, 6000);
    }
}

window.catchRandomEvent = function() {
    initAudio();
    const el = document.getElementById('random-event');
    if (el) el.style.display = 'none';
    gameState.statMushrooms += 1;
    const bonus = Math.max(50, getTotalPps() * 30);
    gameState.balance += bonus;
    playSFX(784, 'square', 0.2);
    alert(`🍄 Найшов-сь білий гриб під ялицьов! +${Math.floor(bonus)} ₴`);
    saveGame();
    updateUI();
};

function updateUI() {
    updateQuests();

    document.getElementById('balance').innerText = Math.floor(gameState.balance);
    document.getElementById('pps').innerText = getTotalPps();
    document.getElementById('player-level').innerText = gameState.playerLevel;
    document.getElementById('talers').innerText = gameState.talers;
    document.getElementById('grape-count').innerText = gameState.grapes;
    document.getElementById('pending-talers').innerText = Math.floor(Math.sqrt(gameState.totalEarned / 50000));

    const reqXp = getXpForNextLevel();
    document.getElementById('xp-bar-fill').style.width = `${Math.min(100, (gameState.xp / reqXp) * 100)}%`;

    const boostInd = document.getElementById('boost-indicator');
    if (boostInd) {
        let text = '';
        if (gameState.boostTimer > 0) text += `(x2 🔥 ${Math.ceil(gameState.boostTimer)}s) `;
        if (gameState.bograchTimer > 0) text += `(x3 🍲 ${Math.ceil(gameState.bograchTimer)}s)`;
        boostInd.innerText = text;
        boostInd.style.display = text ? 'inline' : 'none';
    }

    gameState.businesses.forEach((b, i) => {
        const cost = Math.floor(b.baseCost * Math.pow(1.15, b.level));
        const shaft = document.getElementById(`shaft-${i}`);
        const btn = document.getElementById(`btn-${i}`);

        if (shaft && btn) {
            if (gameState.playerLevel < b.reqLevel) {
                shaft.classList.add('locked');
                btn.disabled = true;
                btn.innerHTML = `<span style="font-size:9px">Рівен ${b.reqLevel}</span>`;
            } else {
                shaft.classList.remove('locked');
                btn.disabled = gameState.balance < cost;
                document.getElementById(`lvl-${i}`).innerText = b.level;
                document.getElementById(`cost-${i}`).innerText = `${cost} ₴`;
                document.getElementById(`rate-${i}`).innerText = `+${Math.floor(b.level * b.baseIncome * getPrestigeMultiplier())} ₴/с`;
            }
        }
    });

    const wineryContainer = document.getElementById('winery-recipes-list');
    if (wineryContainer) {
        wineryContainer.innerHTML = '';
        gameState.wines.forEach((w, i) => {
            wineryContainer.innerHTML += `
                <div class="winery-recipe-card">
                    <div class="recipe-info">
                        <h4>${w.name} (${w.crafted} пляш.)</h4>
                        <p>Треба: 🍇 ${w.reqGrapes} кг | 🪙 ${w.cost} ₴</p>
                        <p style="color:#aed581">+${Math.round(w.boost * 100)}% до гешефту</p>
                    </div>
                    <button class="craft-btn" ${(gameState.grapes >= w.reqGrapes && gameState.balance >= w.cost) ? '' : 'disabled'} onclick="craftWine(${i})">
                        Закупорити
                    </button>
                </div>
            `;
        });
    }

    const questsContainer = document.getElementById('quests-list');
    if (questsContainer) {
        questsContainer.innerHTML = '';
        gameState.quests.forEach((q, i) => {
            const isReady = q.current >= q.req && !q.done;
            questsContainer.innerHTML += `
                <div class="quest-card">
                    <div class="quest-info">
                        <h4>${q.title} ${q.done ? '✅' : ''}</h4>
                        <p>${q.desc}</p>
                        <p>Зроблено: ${Math.min(q.current, q.req)} / ${q.req}</p>
                    </div>
                    <button class="claim-btn" ${isReady ? '' : 'disabled'} onclick="claimQuest(${i})">
                        ${q.done ? 'Зроблено' : 'Урвати'}
                    </button>
                </div>
            `;
        });
    }
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
                <button id="btn-${i}" class="lvl-up-btn" onclick="buyBusiness(${i})">
                    <span style="font-size:9px">БУДУВАТИ</span><br><span id="cost-${i}">10 ₴</span>
                </button>
            </div>
        `;
    });
}

let lastTick = Date.now();
function gameLoop() {
    const now = Date.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;

    if (gameState.boostTimer > 0) gameState.boostTimer = Math.max(0, gameState.boostTimer - delta);
    if (gameState.bograchTimer > 0) gameState.bograchTimer = Math.max(0, gameState.bograchTimer - delta);

    gameState.businesses.forEach((b, i) => {
        if (b.level > 0 && gameState.playerLevel >= b.reqLevel) {
            b.progress += delta * 100;
            if (b.progress >= 100) {
                b.progress = 0;
                const earned = (b.level * b.baseIncome * getPrestigeMultiplier());
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
// СТАРТ ДОДАТКУ
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    initDOM();
    
    // Вантажимо прогрес з хмари при запуску
    await loadGameFromServer();

    const unlockHandler = () => {
        initAudio();
        document.removeEventListener('click', unlockHandler);
        document.removeEventListener('touchstart', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    document.addEventListener('touchstart', unlockHandler);

    const clickBtn = document.getElementById('click-btn');
    if (clickBtn) {
        clickBtn.addEventListener('click', () => {
            initAudio();
            gameState.grapes += 1;
            gameState.statClicks += 1;
            gameState.balance += gameState.clickPower * getPrestigeMultiplier();
            addXp(1);
            playSFX(440, 'sine', 0.08);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            updateUI();
        });
    }

    // Авто-збереження кожні 10 секунд
    setInterval(saveGame, 10000);
    setInterval(spawnRandomEvent, 18000);
    requestAnimationFrame(gameLoop);
});