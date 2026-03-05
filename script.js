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

// --- STAV HRY ---
let currentUser = localStorage.getItem('tt_user_v6') || null;
let raw = JSON.parse(localStorage.getItem('ttSave_v6')) || {};

let gold = raw.gold || 0, stage = raw.stage || 1, tapDmg = raw.tapDmg || 1, tapCost = raw.tapCost || 10;
let hLv = raw.hLv || [0,0,0,0,0], diamonds = raw.diamonds || 0, resets = raw.resets || 0;
let inv = raw.inv || [], eq = raw.eq || {}, shopItems = raw.shopItems || [];
let clicks = raw.clicks || 0, kills = raw.kills || 0, maxStage = raw.maxStage || 1;

let mHP = 10, mCurr = 10, totalDPS = 0, totalTap = 1, goldMult = 1;

// --- UKLÁDÁNÍ ---
function save() { 
    if(stage > maxStage) maxStage = stage;
    localStorage.setItem('ttSave_v6', JSON.stringify({ gold, stage, tapDmg, tapCost, hLv, diamonds, resets, inv, eq, shopItems, clicks, kills, maxStage })); 
}

async function saveToCloud() {
    if(!currentUser) return;
    try {
        await supabaseClient.from('leaderboard').upsert({
            name: currentUser,
            stage: maxStage,
            resets: resets,
            gold: Math.floor(gold)
        }, { onConflict: 'name' });
    } catch (e) { console.error("Cloud save failed", e); }
}

// --- SYSTÉM PŘIHLÁŠENÍ ---
function login() {
    let u = document.getElementById('username-input').value.trim();
    if(u.length < 3) return alert("Jméno musí mít alespoň 3 znaky!");
    currentUser = u;
    localStorage.setItem('tt_user_v6', u);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('user-display').innerText = "👤 " + u;
    saveToCloud();
    updateUI();
}
function checkAuth() { if(!currentUser) document.getElementById('login-modal').style.display = 'block'; }

// --- BOJ A MONSTRA ---
function setHP() {
    mHP = Math.round(10 * Math.pow(1.28, stage)) * (stage % 10 === 0 ? 5 : 1);
    mCurr = mHP;
}

function updateBiome() {
    const colors = ['#0a0a0a', '#1e3a1e', '#3e2a1a', '#2c3e50', '#4a1a1a'];
    document.body.style.background = colors[Math.min(Math.floor((stage-1)/10), 4)];
}

function doTap(e) {
    if(!currentUser) return;
    clicks++; 
    let crit = Math.random() < 0.1; 
    let dmg = totalTap * (crit ? 5 : 1);
    mCurr -= dmg; 
    
    const d = document.createElement('div');
    d.className = 'dmg-text';
    d.innerText = (crit ? '💥' : '') + Math.floor(dmg);
    d.style.left = e.clientX + 'px';
    d.style.top = (e.clientY - 40) + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 700);

    if(crit) {
        document.getElementById('game-area').classList.add('crit-shake');
        setTimeout(() => document.getElementById('game-area').classList.remove('crit-shake'), 200);
    }

    if(mCurr <= 0) kill();
    updateUI();
}

function kill() {
    kills++; 
    let reward = (stage % 10 === 0 ? stage * 25 : stage * 6) * goldMult;
    gold += Math.floor(reward);
    stage++;
    setHP();
    updateBiome();
    updateUI();
    save();
}

function buyTap() {
    if(gold >= tapCost) {
        gold -= tapCost;
        tapDmg++;
        tapCost = Math.round(tapCost * 1.6);
        updateUI();
        save();
    }
}

// --- PRESTIŽ / RESET ---
function doResets() {
    if(stage < 50) return;
    let gain = Math.floor(stage / 10);
    if(confirm(`VZESTUP: Získáš ${gain} 💎. Tvé jméno se posune v žebříčku a začneš znovu silnější!`)) {
        diamonds += gain; resets++; gold = 0; stage = 1; tapDmg = 1; tapCost = 10; hLv = [0,0,0,0,0];
        setHP(); updateBiome(); updateUI(); closeM(); save(); saveToCloud();
    }
}

// --- MODÁLY A RENDEROVÁNÍ ---
function openM(id) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    const modal = document.getElementById(id);
    if(modal) {
        modal.style.display = 'block';
        if(id === 'heroes-modal') renderHeroes();
        if(id === 'shop-modal') renderShop();
        if(id === 'achieve-modal') renderAchievements();
        if(id === 'char-modal') renderChar();
        if(id === 'leaderboard-modal') renderLeaderboard();
    }
}

function closeM() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

async function renderLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    body.innerHTML = "<tr><td colspan='4'>Načítám...</td></tr>";
    let { data, error } = await supabaseClient.from('leaderboard').select('*').order('resets', {ascending: false}).limit(10);
    if(error) return;
    body.innerHTML = data.map((p, i) => `
        <tr class="${p.name === currentUser ? 'my-row' : ''}">
            <td>${i+1}.</td>
            <td>${p.name}</td>
            <td>${p.resets || 0}</td>
            <td>${p.stage}</td>
        </tr>
    `).join('');
}

function renderHeroes() {
    document.getElementById('heroes-list').innerHTML = heroesCfg.map((h, i) => {
        let cost = Math.round(h.bC * Math.pow(1.25, hLv[i]));
        return `<div style="background:#2c3e50; margin:10px; padding:12px; border-radius:10px; text-align:left; border-bottom: 2px solid rgba(0,0,0,0.2);">
            <b>${h.n}</b> (Lv ${hLv[i]})<br><small>Přínos: +${h.bD} DPS / lvl</small>
            <button onclick="buyHero(${i})" ${gold < cost ? 'disabled' : ''} style="float:right; padding:8px; background:#f1c40f; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">${cost} 💰</button>
        </div>`;
    }).join('');
}

function buyHero(i) {
    let cost = Math.round(heroesCfg[i].bC * Math.pow(1.25, hLv[i]));
    if(gold >= cost) { gold -= cost; hLv[i]++; updateUI(); renderHeroes(); save(); }
}

function renderAchievements() {
    document.getElementById('achieve-list').innerHTML = `
        <div style="text-align:left; padding:15px; background: #111; border-radius: 10px;">
            <p>🎯 Celkem kliknutí: <b style="color:#f1c40f">${clicks}</b></p>
            <p>⚔️ Poražených monster: <b style="color:#f1c40f">${kills}</b></p>
            <p>🗺️ Nejvyšší Stage: <b style="color:#f1c40f">${maxStage}</b></p>
            <p>✨ Počet Vzestupů: <b style="color:#f1c40f">${resets}</b></p>
        </div>`;
}

// --- OBCHOD A INVENTÁŘ ---
function generateItem() {
    const types = ['helma', 'hrud', 'stit', 'mec'];
    const type = types[Math.floor(Math.random() * types.length)];
    const rRoll = Math.random() * 100;
    let r = rarities[0]; let sum = 0;
    for(let rarity of rarities) { sum += rarity.p; if(rRoll <= sum) { r = rarity; break; } }
    const power = Math.round((1 + resets * 2) * r.m * (stage / 5 + 1));
    const effect = (type === 'mec') ? "Tap DMG" : "Hero DPS";
    return { type, rarity: r, power, effect, id: Date.now() + Math.random() };
}

function renderShop() {
    if(shopItems.length === 0) shopItems = [generateItem(), generateItem(), generateItem()];
    document.getElementById('shop-items').innerHTML = shopItems.map((it, idx) => {
        let cost = Math.round(it.power * 0.8) + 5;
        return `<div style="background:#2c3e50; padding:10px; border-radius:10px; margin-bottom:10px; text-align:left;">
            <b class="${it.rarity.c}">${it.rarity.n} ${it.type}</b> (+${it.power} ${it.effect})
            <button onclick="buyItem(${idx})" ${diamonds < cost ? 'disabled' : ''} style="float:right; background:#2ecc71; color:white; border:none; padding:5px 10px; border-radius:5px;">${cost} 💎</button>
        </div>`;
    }).join('');
}

function buyItem(idx) {
    let it = shopItems[idx]; let cost = Math.round(it.power * 0.8) + 5;
    if(diamonds >= cost && inv.length < 8) { diamonds -= cost; inv.push(it); shopItems.splice(idx, 1); renderShop(); updateUI(); save(); }
}

function renderChar() {
    ['helma', 'hrud', 'stit', 'mec'].forEach(t => {
        let s = document.getElementById('slot-'+t);
        if(eq[t]) s.innerHTML = `<b class="${eq[t].rarity.c}">${eq[t].power}</b>`, s.style.border = "2px solid gold";
        else s.innerHTML = `<span>${t}</span>`, s.style.border = "2px dashed #444";
    });
    document.getElementById('inv-grid').innerHTML = Array.from({length: 8}, (_, i) => {
        let it = inv[i];
        return `<div class="inv-cell" onclick="equipItem(${i})">${it ? `<b class="${it.rarity.c}">${it.power}</b>` : ''}</div>`;
    }).join('');
}

function equipItem(idx) {
    let it = inv[idx]; if(!it) return;
    let old = eq[it.type]; eq[it.type] = it;
    if(old) inv[idx] = old; else inv.splice(idx, 1);
    renderChar(); updateUI(); save();
}

function unequip(t) { if(!eq[t] || inv.length >= 8) return; inv.push(eq[t]); delete eq[t]; renderChar(); updateUI(); save(); }

// --- HLAVNÍ UPDATE ---
function updateUI() {
    let gTap = 0, gDPS = 0;
    Object.values(eq).forEach(i => {
        if (i.effect === "Tap DMG") gTap += i.power;
        if (i.effect === "Hero DPS") gDPS += i.power;
    });
    let bDPS = 0; hLv.forEach((l, i) => bDPS += l * heroesCfg[i].bD);
    totalTap = tapDmg + gTap; totalDPS = bDPS + gDPS;

    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('dps').innerText = Math.floor(totalDPS);
    document.getElementById('tap-val').innerText = totalTap;
    document.getElementById('tap-cost').innerText = tapCost;
    document.getElementById('diamonds-hud').innerText = diamonds;
    document.getElementById('hp-bar').style.width = (mCurr / mHP * 100) + "%";
    document.getElementById('hp-text').innerText = Math.ceil(mCurr) + " / " + mHP;
    document.getElementById('stage-header').innerText = "Stage: " + stage;
    document.getElementById('quick-tap').disabled = gold < tapCost;

    let pBtn = document.getElementById('prestigeBtn');
    if(stage >= 50) pBtn.classList.add('ready'); else pBtn.classList.remove('ready');
}

setInterval(() => {
    if(totalDPS > 0 && currentUser) {
        mCurr -= totalDPS / 10;
        if(mCurr <= 0) kill();
        updateUI();
    }
}, 100);

setInterval(saveToCloud, 30000);

window.onload = () => {
    if(currentUser) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = "👤 " + currentUser;
    }
    setHP(); updateBiome(); updateUI();
};
