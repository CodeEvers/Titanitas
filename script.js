// --- KONFIGURACE SUPABASE ---
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';
const ttClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- TVÉ PŮVODNÍ KONFIGURACE ---
const heroesCfg = [
    { n: "🛡️ Strážce Vít", bC: 50, bD: 1 },
    { n: "🏹 Lučištnice Ema", bC: 250, bD: 8 },
    { n: "🧙 Mág Merlin", bC: 1200, bD: 45 },
    { n: "⚔️ Rytíř Roland", bC: 6500, bD: 220 },
    { n: "🐲 Drak Bezzubka", bC: 45000, bD: 1100 }
];

// --- STAV HRY (Ponecháno tvé ukládání do localStorage + přidán Cloud) ---
let currentUser = localStorage.getItem('tt_user_v6') || null;
let raw = JSON.parse(localStorage.getItem('ttSave_v6')) || {};

let gold = raw.gold || 0, stage = raw.stage || 1, tapDmg = raw.tapDmg || 1, tapCost = raw.tapCost || 10;
let hLv = raw.hLv || [0,0,0,0,0], diamonds = raw.diamonds || 0, resets = raw.resets || 0;
let clicks = raw.clicks || 0, kills = raw.kills || 0, maxStage = raw.maxStage || 1;
let inv = raw.inv || [], eq = raw.eq || {};

let mHP = 10, mCurr = 10, totalDPS = 0, totalTap = 1;

// --- FUNKCE PRO UKLÁDÁNÍ (Místní + Cloud) ---
async function save() {
    if(stage > maxStage) maxStage = stage;
    // Místní save
    localStorage.setItem('ttSave_v6', JSON.stringify({ gold, stage, tapDmg, tapCost, hLv, diamonds, resets, inv, eq, clicks, kills, maxStage }));
    
    // Cloud save (Supabase) - ukládáme jen to, co chceme v žebříčku
    if (currentUser) {
        await ttClient.from('leaderboard').upsert({
            name: currentUser,
            gold: Math.floor(gold),
            stage: stage
            // Pokud máš v tabulce sloupec resets, můžeš ho přidat sem
        }, { onConflict: 'name' });
    }
}

// --- ŽEBŘÍČEK (Skutečná data ze Supabase) ---
window.renderLeaderboard = async function() {
    const body = document.getElementById('leaderboard-body');
    if (body) body.innerHTML = "<tr><td colspan='4'>Načítám z cloudu...</td></tr>";

    let { data, error } = await ttClient
        .from('leaderboard')
        .select('*')
        .order('stage', { ascending: false })
        .limit(10);

    if (error) return console.error(error);

    body.innerHTML = data.map((p, i) => `
        <tr class="${p.name === currentUser ? 'my-row' : ''}">
            <td>${i + 1}.</td>
            <td>${p.name}</td>
            <td>0</td> <td>${p.stage}</td>
        </tr>
    `).join('');
};

// --- TVÁ PŮVODNÍ HERNÍ LOGIKA ---
window.login = function() {
    let u = document.getElementById('username-input').value.trim();
    if(u.length < 3) return alert("Jméno musí mít alespoň 3 znaky!");
    currentUser = u;
    localStorage.setItem('tt_user_v6', u);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('user-display').innerText = u;
    save();
    updateUI();
};

window.doTap = function(e) {
    if(!currentUser) return;
    clicks++;
    let dmg = totalTap;
    mCurr -= dmg;
    
    // Animace DMG textu
    const d = document.createElement('div');
    d.className = 'dmg-text';
    d.innerText = Math.floor(dmg);
    d.style.left = e.clientX + 'px';
    d.style.top = (e.clientY - 50) + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 700);

    if(mCurr <= 0) kill();
    updateUI();
};

function kill() {
    kills++;
    gold += Math.floor(stage * 6);
    stage++;
    mHP = Math.round(10 * Math.pow(1.3, stage));
    mCurr = mHP;
    document.getElementById('monster').innerText = ['👹','💀','👽','🤖','🐲'][Math.floor(Math.random()*5)];
    save();
    updateUI();
}

window.buyTap = function() {
    if(gold >= tapCost) {
        gold -= tapCost;
        tapDmg++;
        tapCost = Math.round(tapCost * 1.6);
        updateUI();
        save();
    }
};

window.buyHero = function(i) {
    let cost = Math.round(heroesCfg[i].bC * Math.pow(1.25, hLv[i]));
    if(gold >= cost) {
        gold -= cost;
        hLv[i]++;
        updateUI();
        renderHeroes();
        save();
    }
};

function updateUI() {
    let bDPS = 0;
    hLv.forEach((l, i) => bDPS += l * heroesCfg[i].bD);
    totalDPS = bDPS;
    totalTap = tapDmg;

    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('dps').innerText = Math.floor(totalDPS);
    document.getElementById('tap-val').innerText = totalTap;
    document.getElementById('tap-cost').innerText = tapCost;
    document.getElementById('hp-bar').style.width = (mCurr / mHP * 100) + "%";
    document.getElementById('hp-text').innerText = Math.ceil(mCurr) + " / " + mHP;
    document.getElementById('stage-header').innerText = "Stage: " + stage;
}

window.renderHeroes = function() {
    document.getElementById('heroes-list').innerHTML = heroesCfg.map((h, i) => {
        let cost = Math.round(h.bC * Math.pow(1.25, hLv[i]));
        return `<div style="background:#2c3e50; margin:10px; padding:12px; border-radius:10px; text-align:left;">
            <b>${h.n}</b> (Lv ${hLv[i]})<br>
            <button onclick="buyHero(${i})" ${gold < cost ? 'disabled' : ''} style="float:right;">${cost} 💰</button>
        </div>`;
    }).join('');
};

window.openM = function(id) { 
    document.getElementById(id).style.display = 'block'; 
    if(id === 'heroes-modal') renderHeroes();
    if(id === 'leaderboard-modal') renderLeaderboard();
};
window.closeM = function() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); };

// Automatický DPS útok
setInterval(() => {
    if(totalDPS > 0 && currentUser) {
        mCurr -= totalDPS / 10;
        if(mCurr <= 0) kill();
        updateUI();
    }
}, 100);

window.onload = () => {
    if(currentUser) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = currentUser;
    }
    mHP = Math.round(10 * Math.pow(1.3, stage));
    mCurr = mHP;
    updateUI();
};
