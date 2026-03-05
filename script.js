// --- 1. INICIALIZACE SUPABASE ---
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. HERNÍ PROMĚNNÉ ---
let currentUser = localStorage.getItem('tt_user_v6') || null;
let gold = 0, stage = 1, tapDmg = 1, tapCost = 10;
let mHP = 10, mCurr = 10, kills = 0;

// --- 3. FUNKCE PRO UKLÁDÁNÍ A NAČÍTÁNÍ ---
async function saveProgress() {
    if (!currentUser) return;

    // Lokální uložení
    const saveObj = { gold, stage, tapDmg, tapCost, kills };
    localStorage.setItem('ttSave_v6', JSON.stringify(saveObj));

    // Cloud uložení - OPRAVENO NA TVÉ SLOUPCE (name, gold, stage)
    try {
        await supabase.from('leaderboard').upsert({
            name: currentUser,
            gold: Math.floor(gold),
            stage: stage
        }, { onConflict: 'name' });
    } catch (err) {
        console.error("Chyba cloudu:", err);
    }
}

// --- 4. FUNKCE HRY ---
function login() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name.length < 3) return alert("Jméno je moc krátké!");
    
    currentUser = name;
    localStorage.setItem('tt_user_v6', name);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('user-display').innerText = "👤 " + name;
    updateUI();
}

function doTap(e) {
    if (!currentUser) return;
    mCurr -= tapDmg;
    
    // Číslo poškození
    const d = document.createElement('div');
    d.className = 'dmg-text';
    d.innerText = tapDmg;
    d.style.left = e.clientX + 'px';
    d.style.top = e.clientY + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 700);

    if (mCurr <= 0) killMonster();
    updateUI();
}

function killMonster() {
    kills++;
    gold += stage * 5;
    stage++;
    mHP = Math.round(10 * Math.pow(1.3, stage));
    mCurr = mHP;
    saveProgress();
}

function buyTap() {
    if (gold >= tapCost) {
        gold -= tapCost;
        tapDmg++;
        tapCost = Math.round(tapCost * 1.6);
        updateUI();
        saveProgress();
    }
}

function updateUI() {
    document.getElementById('gold').innerText = Math.floor(gold);
    document.getElementById('tap-val').innerText = tapDmg;
    document.getElementById('tap-cost').innerText = tapCost;
    document.getElementById('hp-bar').style.width = (mCurr / mHP * 100) + "%";
    document.getElementById('hp-text').innerText = Math.ceil(mCurr) + " / " + mHP;
    document.getElementById('stage-header').innerText = "Stage: " + stage;
}

// --- 5. LEADERBOARD ---
async function renderLeaderboard() {
    let { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('stage', { ascending: false })
        .limit(10);

    if (error) return console.error(error);

    const body = document.getElementById('leaderboard-body');
    body.innerHTML = data.map((p, i) => `
        <tr class="${p.name === currentUser ? 'my-row' : ''}">
            <td>${i + 1}.</td>
            <td>${p.name}</td>
            <td>${p.stage}</td>
        </tr>
    `).join('');
}

// --- 6. OVLÁDÁNÍ MODALŮ ---
function openM(id) {
    document.getElementById(id).style.display = 'block';
    if (id === 'leaderboard-modal') renderLeaderboard();
}

function closeM() {
    document.querySelectorAll('.modal').forEach(m => {
        if (m.id !== 'login-modal') m.style.display = 'none';
    });
}

// Spuštění při načtení
window.onload = () => {
    if (currentUser) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = "👤 " + currentUser;
        // Načtení dat z localStorage
        const saved = JSON.parse(localStorage.getItem('ttSave_v6'));
        if (saved) {
            gold = saved.gold || 0;
            stage = saved.stage || 1;
            tapDmg = saved.tapDmg || 1;
            tapCost = saved.tapCost || 10;
            kills = saved.kills || 0;
        }
    }
    mHP = Math.round(10 * Math.pow(1.3, stage));
    mCurr = mHP;
    updateUI();
};