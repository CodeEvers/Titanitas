(function() { // --- ZÁMEK START ---

// --- KONFIGURACE SUPABASE ---
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- KONFIGURACE HRY ---
const heroesCfg = [
    { n: "🛡️ Strážce Vít", bC: 50, bD: 1 },
    { n: "🏹 Lučištnice Ema", bC: 250, bD: 8 },
    { n: "🧙 Mág Merlin", bC: 1200, bD: 45 },
    { n: "⚔️ Rytíř Roland", bC: 6500, bD: 220 },
    { n: "🐲 Drak Bezzubka", bC: 45000, bD: 1100 }
];
const rarities = [
    { n: "Basic", c: "r-basic", m: 1, p: 65 },
    { n: "Rare", c: "r-rare", m: 3, p: 22 },
    { n: "Epic", c: "r-epic", m: 8, p: 8 },
    { n: "Legend", c: "r-legend", m: 25, p: 4 },
    { n: "Mythic", c: "r-mythic", m: 80, p: 1 }
];
const itemTypes = ['helma', 'hrud', 'kalhoty', 'boty', 'nausnice', 'prsten', 'stit', 'mec'];

// --- STAV HRY ---
let currentUser = localStorage.getItem('tt_user_v6') || null;
let raw = JSON.parse(localStorage.getItem('ttSave_v6')) || {};

let gold = raw.gold || 0, stage = raw.stage || 1, tapDmg = raw.tapDmg || 1, tapCost = raw.tapCost || 10;
let hLv = raw.hLv || [0,0,0,0,0], diamonds = raw.diamonds || 0, resets = raw.resets || 0;
let inv = raw.inv || [], eq = raw.eq || {}, shopItems = raw.shopItems || [];
let clicks = raw.clicks || 0, kills = raw.kills || 0, maxStage = raw.maxStage || 1;
let lastFreeRefresh = raw.lastFreeRefresh || 0; 
let lastLucky = raw.lastLucky || 0; 

let mHP = 10, mCurr = raw.mCurr || 10, totalDPS = 0, totalTap = 1, goldMult = 1, isGolden = false;

// ANTICHEAT PROMĚNNÁ
let lastClickTime = 0;

// --- UKLÁDÁNÍ ---
function save() { 
    if(stage > maxStage) maxStage = stage;
    const saveObj = { gold, stage, tapDmg, tapCost, hLv, diamonds, resets, inv, eq, shopItems, clicks, kills, maxStage, mCurr, lastFreeRefresh, lastLucky };
    localStorage.setItem('ttSave_v6', JSON.stringify(saveObj)); 
    return saveObj;
}

async function saveToCloud() {
    if(!currentUser) return;
    try {
        const fullData = save();
        await supabaseClient.from('leaderboard').upsert({
            name: currentUser, 
            stage: stage, 
            resets: resets, 
            gold: Math.floor(gold),
            diamonds: diamonds,
            save_data: fullData 
        }, { onConflict: 'name' });
    } catch (e) { console.error("Cloud save failed", e); }
}

// --- SYSTÉM PŘIHLÁŠENÍ ---
window.login = async function() {
    let u = document.getElementById('username-input').value.trim();
    if(u.length < 3) return alert("Jméno musí mít alespoň 3 znaky!");

    const { data: player, error } = await supabaseClient
        .from('leaderboard')
        .select('*')
        .eq('name', u)
        .maybeSingle();

    if (player) {
        let pass = prompt(`Vítej zpět, ${u}! Zadej své heslo:`);
        if (pass === player.password) {
            currentUser = u;
            localStorage.setItem('tt_user_v6', u);
            
            if (player.save_data) {
                const s = player.save_data;
                gold = s.gold; stage = s.stage; tapDmg = s.tapDmg; tapCost = s.tapCost;
                hLv = s.hLv; resets = s.resets; inv = s.inv; eq = s.eq; 
                shopItems = s.shopItems || []; clicks = s.clicks; kills = s.kills; maxStage = s.maxStage;
                lastFreeRefresh = s.lastFreeRefresh || 0;
                lastLucky = s.lastLucky || 0;
                diamonds = (player.diamonds !== undefined && player.diamonds !== null) ? player.diamonds : (s.diamonds || 0);
                
                setHP(); 
                if(s.mCurr !== undefined) mCurr = s.mCurr;
            }
            
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('user-display').innerText = "👤 " + u;
            updateBiome(); updateUI(); save();
            alert("Data úspěšně načtena z cloudu!");
        } else {
            alert("Chybné heslo!");
        }
    } else {
        let newPass = prompt(`Nový hrdina ${u}! Vytvoř si heslo:`);
        if(!newPass || newPass.length < 3) return alert("Heslo je příliš krátké!");
        currentUser = u;
        localStorage.setItem('tt_user_v6', u);
        const { error: insErr } = await supabaseClient.from('leaderboard').insert([
            { name: u, password: newPass, stage: stage, resets: resets, gold: Math.floor(gold), diamonds: diamonds }
        ]);
        if(insErr) return alert("Chyba při registraci!");
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = "👤 " + u;
        saveToCloud(); updateUI();
    }
}

window.checkAuth = function() { if(!currentUser) document.getElementById('login-modal').style.display = 'block'; }

// --- BOJ A VIZUÁL ---
function createParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div'); p.className = 'particle'; p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p);
        const angle = Math.random() * Math.PI * 2; const velocity = 2 + Math.random() * 4;
        let px = x, py = y, vx = Math.cos(angle) * velocity, vy = Math.sin(angle) * velocity;
        const anim = setInterval(() => { vx *= 0.95; vy += 0.25; px += vx; py += vy; p.style.left = px + 'px'; p.style.top = py + 'px'; if (py > window.innerHeight) { clearInterval(anim); p.remove(); } }, 20);
        setTimeout(() => { clearInterval(anim); p.remove(); }, 700);
    }
}

window.doTap = function(e) {
    if(!currentUser) return window.checkAuth();

    let now = Date.now();
    if (now - lastClickTime < 100) return;
    lastClickTime = now;

    clicks++; 

    // BONUS: Každých 50 kliknutí dá 10 goldů
    if (clicks % 50 === 0) {
        gold += 10;
        const b = document.createElement('div');
        b.className = 'dmg-text';
        b.style.color = '#2ecc71';
        b.style.left = e.clientX + 'px';
        b.style.top = (e.clientY - 80) + 'px';
        b.innerText = "+10 💰 (BONUS!)";
        document.body.appendChild(b);
        setTimeout(() => b.remove(), 800);
    }

    let crit = Math.random() < 0.1; let dmg = totalTap * (crit ? 5 : 1);
    mCurr -= dmg;
    const d = document.createElement('div'); d.className = 'dmg-text'; d.innerText = (crit ? '💥' : '') + Math.floor(dmg); d.style.left = e.clientX + 'px'; d.style.top = (e.clientY - 50) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700);
    createParticles(e.clientX, e.clientY);
    if(crit) { document.getElementById('game-area').classList.add('crit-shake'); setTimeout(() => document.getElementById('game-area').classList.remove('crit-shake'), 250); }
    document.getElementById('monster').style.transform = 'scale(0.85)'; setTimeout(() => document.getElementById('monster').style.transform = 'scale(1)', 50);
    if(mCurr <= 0) kill();
    updateUI();
}

function kill() {
    kills++; 
    let reward = (stage % 10 === 0 ? stage * 60 : stage * 6) * goldMult; 
    if(isGolden) reward *= 10;
    gold += Math.floor(reward); 
    stage++; 
    isGolden = Math.random() < 0.01;
    const m = document.getElementById('monster');

    const normalMonsters = ['👹','💀','👽','🤖','🐲','👻','👾','🎃','🧛','🧟','🤡','👺','🐌','🦂','🕷️','🐺','🦁'];
    const bossMonsters = ['👑','👹','🔥','💀','👿','🐲','👁️'];

    if(isGolden) {
        m.innerText = '💰';
        m.classList.add('golden-monster');
    } else {
        const pool = (stage % 10 === 0) ? bossMonsters : normalMonsters;
        m.innerText = pool[Math.floor(Math.random() * pool.length)];
        m.classList.remove('golden-monster');
    }
    setHP(); updateBiome(); updateUI(); save();
}

function setHP() { mHP = Math.round(10 * Math.pow(1.3, stage)) * (stage % 10 === 0 ? 5 : 1); mCurr = mHP; }

function updateBiome() { 
    const biomeImages = [
        'temnota.png',      // 1-10
        'les.png',          // 11-20
        'dul.png',          // 21-30
        'nadvori.png',      // 31-40
        'brana.png',        // 41-50
        'vez.png',          // 51-60
        'laguna.png',       // 61-70
        'dimenze.png',      // 71-80
        'lava.png',         // 81-90
        'prazdnota.png'     // 91+
    ];
    const index = Math.min(Math.floor((stage - 1) / 10), biomeImages.length - 1);
    const imgName = biomeImages[index];
    
    // Nastavení obrázku na pozadí s "cover" efektem pro mobily i PC
    document.body.style.backgroundImage = `url('assets/backgrounds/${imgName}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed'; // Drží pozadí na místě při scrollu
}

window.buyTap = function() { 
    if(gold >= tapCost) { 
        gold -= tapCost; 
        tapDmg++; 

        if (tapDmg % 10 === 0) {
            tapDmg += 10;
            const d = document.createElement('div');
            d.className = 'dmg-text';
            d.style.color = '#f1c40f';
            d.style.left = '50%';
            d.style.top = '40%';
            d.innerText = "MILNÍK: +10 DMG! ✨";
            document.body.appendChild(d);
            setTimeout(() => d.remove(), 1000);
        }

        tapCost = Math.round(tapCost * 1.6); 
        updateUI(); 
        save(); 
    } 
}

// --- MODÁLY A SYSTÉMY ---
window.openM = function(id) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'char-modal') renderChar();
    if(id === 'shop-modal') renderShop();
    if(id === 'heroes-modal') renderHeroes();
    if(id === 'achieve-modal') renderAchievements();
    if(id === 'leaderboard-modal') renderLeaderboard();
}
window.closeM = function() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

async function renderLeaderboard() {
    let filter = document.getElementById('search-player').value.toLowerCase();
    let { data, error } = await supabaseClient.from('leaderboard').select('*').order('resets', {ascending: false}).order('stage', {ascending: false}).limit(20);
    if(error) return;
    document.getElementById('leaderboard-body').innerHTML = data
        .filter(p => p.name.toLowerCase().includes(filter))
        .map((p, i) => {
            let rank = i + 1;
            let rClass = rank === 1 ? 'top1' : (rank === 2 ? 'top2' : (rank === 3 ? 'top3' : ''));
            if(p.name === currentUser) rClass += " my-row";
            return `<tr class="${rClass}"><td>${rank}.</td><td>${p.name}</td><td>${p.resets || 0}</td><td>${p.stage}</td></tr>`;
        }).join('');
}

function renderHeroes() {
    document.getElementById('heroes-list').innerHTML = heroesCfg.map((h, i) => {
        let cost = Math.round(h.bC * Math.pow(1.25, hLv[i]));
        return `<div style="background:#2c3e50; margin:10px; padding:12px; border-radius:10px; text-align:left; border-bottom: 2px solid rgba(0,0,0,0.2);">
            <b>${h.n}</b> (Lv ${hLv[i]})<br><small>Přínos: +${h.bD} DPS / lvl</small>
            <button onclick="buyHero(${i})" ${gold < cost ? 'disabled' : ''} style="float:right; padding:10px; background:#f1c40f; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">${cost} 💰</button>
        </div>`;
    }).join('');
}
window.buyHero = function(i) { let cost = Math.round(heroesCfg[i].bC * Math.pow(1.25, hLv[i])); if(gold >= cost) { gold -= cost; hLv[i]++; updateUI(); renderHeroes(); save(); } }

function generateItem() {
    let type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    let rRoll = Math.random() * 100, r, sum = 0;
    for(let rarity of rarities) { sum += rarity.p; if(rRoll <= sum) { r = rarity; break; } }
    let power = Math.round((1 + resets * 5) * r.m * (0.8 + Math.random() * 0.4));
    let effect = ['mec', 'prsten', 'nausnice'].includes(type) ? "Tap DMG" : (type === 'stit' ? "Gold %" : "Hero DPS");
    return { type, rarity: r, power, effect, id: Date.now() + Math.random() };
}

function renderChar() {
    itemTypes.forEach(t => {
        let s = document.getElementById('slot-'+t);
        if(eq[t]) s.innerHTML = `<b class="${eq[t].rarity.c}">${eq[t].power}</b><br><small>${eq[t].effect}</small>`, s.style.border = "2px solid gold";
        else s.innerHTML = `<span>${t}</span>`, s.style.border = "2px dashed #444";
    });
    document.getElementById('inv-grid').innerHTML = Array.from({length: 8}, (_, i) => {
        let it = inv[i];
        return `<div class="inv-cell" onclick="handleInvClick(${i})">${it ? `<b class="${it.rarity.c}">${it.power}</b>` : ''}</div>`;
    }).join('');
}

window.handleInvClick = function(idx) {
    let it = inv[idx]; if(!it) return;
    if(confirm(`Předmět: ${it.rarity.n} ${it.type} (+${it.power} ${it.effect})\n\nChcete předmět NASADIT? (Klikněte na OK)\nChcete předmět PRODAT? (Klikněte na Zrušit)`)) {
        let old = eq[it.type]; eq[it.type] = it; if(old) inv[idx] = old; else inv.splice(idx, 1);
        alert("Předmět nasazen!");
    } else { 
        let price = Math.floor(stage * 20 * it.rarity.m);
        if(confirm(`Opravdu chcete prodat předmět za ${price} zlata?`)) {
            gold += price; inv.splice(idx, 1);
            alert(`Prodáno za ${price} 💰`);
        }
    }
    renderChar(); updateUI(); save();
}

window.unequip = function(t) { if(!eq[t] || inv.length >= 8) return; inv.push(eq[t]); delete eq[t]; renderChar(); updateUI(); save(); }

function renderShop() {
    if(shopItems.length === 0) refreshShop(true);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const timeLeft = Math.max(0, cooldown - (now - lastFreeRefresh));
    const isFree = timeLeft === 0;

    let refreshBtnHTML = '';
    if (isFree) {
        refreshBtnHTML = `<button onclick="refreshShop()" style="width:100%; padding:10px; background:#2ecc71; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-bottom:10px;">🔄 OBNOVIT ZDARMA!</button>`;
    } else {
        const h = Math.floor(timeLeft / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        refreshBtnHTML = `<button onclick="refreshShop()" style="width:100%; padding:10px; background:#34495e; color:#bdc3c7; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-bottom:5px;">🔄 DALŠÍ ZDARMA ZA ${h}h ${m}m</button>
                          <center><small style="color:#f1c40f; cursor:pointer" onclick="forceRefreshWithDiamond()">Nebo obnovit za 1 💎</small></center><br>`;
    }

    document.getElementById('shop-items').innerHTML = refreshBtnHTML + shopItems.map((it, idx) => {
        let curP = eq[it.type] ? eq[it.type].power : 0;
        let cost = Math.round(it.power/2) + 5;
        return `<div class="shop-item ${it.power > curP ? 'better' : 'worse'}">
            <b class="${it.rarity.c}">${it.rarity.n} ${it.type}</b><br><small>Dává: +${it.power} ${it.effect}</small>
            <button class="shop-btn" onclick="buyItem(${idx})" ${diamonds < cost ? 'disabled' : ''} style="float:right; background:#f1c40f; border:none; padding:7px; border-radius:5px; font-weight:bold; cursor:pointer;">${cost} 💎</button>
        </div>`;
    }).join('');
}

window.refreshShop = function(f = false) { 
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    if(!f) {
        if((now - lastFreeRefresh) >= cooldown) { lastFreeRefresh = now; } else { return; }
    }
    shopItems = [generateItem(), generateItem(), generateItem()]; 
    renderShop(); updateUI(); save(); 
}

window.forceRefreshWithDiamond = function() {
    if(diamonds < 1) return alert("Nemáš dost drahokamů!");
    diamonds -= 1;
    shopItems = [generateItem(), generateItem(), generateItem()]; 
    renderShop(); updateUI(); save();
}

window.buyItem = function(idx) {
    let it = shopItems[idx]; let cost = Math.round(it.power/2) + 5;
    if(diamonds >= cost && inv.length < 8) { diamonds -= cost; inv.push(it); shopItems.splice(idx, 1); renderShop(); updateUI(); save(); }
}

function renderAchievements() {
    document.getElementById('achieve-list').innerHTML = `<div style="text-align:left; padding:15px; background: #111; border-radius: 10px;">
        <p>🎯 Kliknutí: <b style="color:#f1c40f">${clicks}</b></p>
        <p>⚔️ Kills: <b style="color:#f1c40f">${kills}</b></p>
        <p>🗺️ Max Stage: <b style="color:#f1c40f">${maxStage}</b></p>
        <p>✨ Resets: <b style="color:#f1c40f">${resets}</b></p>
    </div>`;
}

window.doResets = function() {
    if(stage < 50) return;
    let gain = Math.floor(stage / 10);
    // ZMĚNA: Bonus se vypočítá z aktuálních resetů, tzn. při prvním resetu (resets=0) dostane 500 pro tu novou hru.
    let goldBonus = Math.floor(500 * Math.pow(1.2, resets));
    if(confirm(`VZESTUP: Získáš ${gain} 💎. Tvé jméno se posune v žebříčku a začneš znovu silnější!\n(Bonus do startu: ${goldBonus} 💰)`)) {
        diamonds += gain; 
        resets++; // Zvýšíme úroveň prestiže
        gold = goldBonus; // Nastavíme bonusové zlato
        stage = 1; tapDmg = 1; tapCost = 10; hLv = [0,0,0,0,0];
        setHP(); updateBiome(); updateUI(); window.closeM(); save(); saveToCloud();
    }
}

function updateUI() {
    let gTap = 0, gDPS = 0, gGold = 1;
    Object.values(eq).forEach(i => { if (i.effect === "Tap DMG") gTap += i.power; if (i.effect === "Hero DPS") gDPS += i.power; if (i.effect === "Gold %") gGold += (i.power / 100); });
    let bDPS = 0; hLv.forEach((l, i) => bDPS += l * heroesCfg[i].bD);
    totalTap = tapDmg + gTap; totalDPS = bDPS + gDPS; goldMult = gGold;
    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('dps').innerText = Math.floor(totalDPS);
    document.getElementById('tap-val').innerText = totalTap;
    document.getElementById('tap-cost').innerText = tapCost;
    document.getElementById('diamonds-hud').innerText = diamonds;
    document.getElementById('hp-bar').style.width = (mCurr / mHP * 100) + "%";
    document.getElementById('hp-text').innerText = Math.ceil(mCurr) + " / " + mHP;
    document.getElementById('stage-header').innerHTML = stage % 10 === 0 ? `<span style="color:#ff4d4d">⚠️ BOSS: ${stage} ⚠️</span>` : `Stage: ${stage}`;
    let pBtn = document.getElementById('prestigeBtn');
    if(stage >= 50) { pBtn.classList.add('ready'); pBtn.innerText = `✨ VZESTUP (+${Math.floor(stage/10)} 💎)`; }
    else { pBtn.classList.remove('ready'); pBtn.innerText = "RESTART (50+)"; }
}

function checkLuckyDiamond() {
    const now = Date.now();
    const cooldown = 6 * 60 * 60 * 1000;
    const container = document.getElementById('lucky-diamond-container');
    if (!container) return;

    if (now - lastLucky >= cooldown) {
        container.style.display = 'block';
        if (container.dataset.status !== 'ready') {
            if (Math.random() < 0.01) {
                container.innerText = '🟡'; container.style.borderColor = '#f1c40f'; container.dataset.type = 'gold';
            } else {
                container.innerText = '💎'; container.style.borderColor = '#3498db'; container.dataset.type = 'normal';
            }
            container.dataset.status = 'ready';
        }
    } else {
        container.style.display = 'none';
        container.dataset.status = 'waiting';
    }
}

window.collectLuckyDiamond = function() {
    const container = document.getElementById('lucky-diamond-container');
    const isGold = container.dataset.type === 'gold';
    let gain = isGold ? (Math.floor(Math.random() * 3) + 1) : 1;
    diamonds += gain;
    lastLucky = Date.now();
    alert(isGold ? `ŠTĚSTÍ! Našel jsi Zlatý diamant a získal ${gain} 💎!` : `Získal jsi 1 💎!`);
    container.style.display = 'none';
    container.dataset.status = 'waiting';
    updateUI(); save(); saveToCloud();
};

// --- SMYČKY ---
setInterval(() => { if(totalDPS > 0 && currentUser) { mCurr -= totalDPS / 10; if(mCurr <= 0) kill(); updateUI(); } }, 100);
setInterval(saveToCloud, 30000);
setInterval(checkLuckyDiamond, 10000);

window.onload = () => {
    if(currentUser) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = "👤 " + currentUser;
        setHP();
        if(raw.mCurr !== undefined) mCurr = raw.mCurr;
        checkLuckyDiamond();
    } else {
        window.checkAuth();
    }
    updateBiome(); updateUI();
};

})(); // --- ZÁMEK KONEC ---
