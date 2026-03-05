// --- 1. KONFIGURACE (Sjednoceno na supabaseClient) ---
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';

// Tady byla ta chyba - nesmí se to jmenovat jen "supabase"
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. PROMĚNNÉ ---
let currentUser = localStorage.getItem('tt_user_v6') || null;
let gold = 0, stage = 1, tapDmg = 1, tapCost = 10;
let mHP = 10, mCurr = 10;

// --- 3. SYSTÉM UKLÁDÁNÍ (Cloud) ---
async function saveProgress() {
    if (!currentUser) return;
    
    try {
        await supabaseClient.from('leaderboard').upsert({
            name: currentUser,
            gold: Math.floor(gold),
            stage: stage
        }, { onConflict: 'name' });
    } catch (err) {
        console.error("Chyba při ukládání:", err);
    }
}

// --- 4. LEADERBOARD (Opraveno volání klienta) ---
async function renderLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if(body) body.innerHTML = "<li>Načítám...</li>";

    let { data, error } = await supabaseClient
        .from('leaderboard')
        .select('*')
        .order('stage', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Chyba leaderboardu:", error);
        return;
    }

    if(body) {
        body.innerHTML = data.map((p, i) => `
            <tr>
                <td>${i + 1}.</td>
                <td>${p.name}</td>
                <td>${p.gold}</td>
                <td>${p.stage}</td>
            </tr>
        `).join('');
    }
}

// --- 5. LOGIKA HRY ---
function login() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name.length < 3) return alert("Jméno musí mít aspoň 3 znaky!");
    
    currentUser = name;
    localStorage.setItem('tt_user_v6', name);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('user-display').innerText = name;
    saveProgress();
    updateUI();
}

function doTap(e) {
    mCurr -= tapDmg;
    if (mCurr <= 0) {
        gold += stage * 5;
        stage++;
        mHP = Math.round(10 * Math.pow(1.3, stage));
        mCurr = mHP;
        saveProgress();
    }
    updateUI();
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
    if(document.getElementById('gold')) document.getElementById('gold').innerText = Math.floor(gold);
    if(document.getElementById('tap-val')) document.getElementById('tap-val').innerText = tapDmg;
    if(document.getElementById('tap-cost')) document.getElementById('tap-cost').innerText = tapCost;
    if(document.getElementById('hp-bar')) document.getElementById('hp-bar').style.width = (mCurr / mHP * 100) + "%";
    if(document.getElementById('stage-header')) document.getElementById('stage-header').innerText = "Stage: " + stage;
}

// Modaly
function openM(id) {
    document.getElementById(id).style.display = 'block';
    if (id === 'leaderboard-modal') renderLeaderboard();
}

function closeM() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

window.onload = () => {
    if (currentUser) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('user-display').innerText = currentUser;
    }
    updateUI();
};
