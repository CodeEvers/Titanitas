// --- KONFIGURACE SUPABASE ---
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- HERNÍ DATA ---
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

let mHP = 10, mCurr = 10, totalDPS = 0, totalTap = 1, goldMult = 1, isGolden = false;

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

// --- SYSTÉM HRY ---
function login() {
    let u = document.getElementById('username-input').value.trim();
    if(u.length < 3) return alert("Krátké jméno!");
    currentUser = u;
    localStorage.setItem('tt_user_v6', u);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('user-display').innerText = "👤 " + u;
    saveToCloud();
    updateUI();
}

function checkAuth() { if(!currentUser) document.getElementById('login-modal').style.display = 'block'; }

function doTap(e) {
    if(!currentUser) return;
    clicks++; 
    let crit = Math.random() < 0.1; 
    let dmg = totalTap * (crit ? 5 : 1);
    mCurr -= dmg; 
    
    // Vizualizace DMG
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

function setHP() {
    mHP = Math.round(10 * Math.pow(1.28, stage)) * (stage % 10 === 0 ? 5 : 1);
    mCurr = mHP;
}

function updateBiome() {
    const colors = ['#0a0a0a', '#1e3a1e', '#3e2a1a', '#2c3e50', '#4a1a1a'];
    document.body.style.background = colors[Math.min(Math.floor((stage-1)/10), 4)];
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

// --- MODÁLY A ŽEBŘÍČEK ---
function openM(id) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'leaderboard-modal') renderLeaderboard();
}

function closeM() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

async function renderLeaderboard() {
    let { data, error } = await supabaseClient.from('leaderboard').select('*').order('resets', {ascending: false}).limit(10);
    if(error) return;
    
    document.getElementById('leaderboard-body').innerHTML = data.map((p, i) => `
        <tr class="${p.name === currentUser ? 'my-row' : ''}">
            <td>${i+1}.</td>
            <td>${p.name}</td>
            <td>${p.resets || 0}</td>
            <td>${p.stage}</td>
        </tr>
    `).join('');
}

function updateUI() {
    // Výpočet bonusů z vybavení
    let gTap = 0, gDPS = 0, gGold = 1;
    Object.values(eq).forEach(i => {
        if (i.effect === "Tap DMG") gTap += i.power;
        if (i.effect === "Hero DPS") gDPS += i.power;
    });

    let bDPS = 0; hLv.forEach((l, i) => bDPS += l * heroesCfg[i].bD);
    totalTap = tapDmg + gTap; 
    totalDPS = bDPS + gDPS;

    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('dps').innerText = Math.floor(totalDPS);
    document.getElementById('tap-val').innerText = totalTap;
    document.getElementById('tap-cost').innerText = tapCost;
    document.getElementById('hp-bar').style.width = (mCurr / mHP * 100) + "%";
    document.getElementById('hp-text').innerText = Math.ceil(mCurr) + " / " + mHP;
    document.getElementById('stage-header').innerText = "Stage: " + stage;
    document.getElementById('quick-tap').disabled = gold < tapCost;
}

// Smyčka pro DPS (automatické poškození)
setInterval(() => {
    if(totalDPS > 0 && currentUser) {
        mCurr -= totalDPS / 10;
        if(mCurr <= 0) kill();
        updateUI();
    }
}, 100);

// Automatický cloud save každých 30s
setInterval(saveToCloud, 30000);

window.onload = () => {
    if(currentUser) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = "👤 " + currentUser;
    }
    setHP();
    updateUI();
};
