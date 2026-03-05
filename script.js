// --- KONFIGURACE ---
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';

// Změna názvu, aby nebyl konflikt s knihovnou
const mojeSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- PROMĚNNÉ ---
let currentUser = localStorage.getItem('tt_user_v6') || null;
let gold = 0, stage = 1, tapDmg = 1, tapCost = 10;
let mHP = 10, mCurr = 10;

// --- FUNKCE PRO UKLÁDÁNÍ ---
async function saveProgress() {
    if (!currentUser) return;
    try {
        await mojeSupabase.from('leaderboard').upsert({
            name: currentUser,
            gold: Math.floor(gold),
            stage: stage
        }, { onConflict: 'name' });
    } catch (err) {
        console.error("Chyba cloudu:", err);
    }
}

// --- LOGIKA HRY ---
window.login = function() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name.length < 3) return alert("Jméno je moc krátké!");
    
    currentUser = name;
    localStorage.setItem('tt_user_v6', name);
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('user-display').innerText = "👤 " + name;
    saveProgress();
    updateUI();
};

window.doTap = function(e) {
    mCurr -= tapDmg;
    if (mCurr <= 0) {
        gold += stage * 5;
        stage++;
        mHP = Math.round(10 * Math.pow(1.3, stage));
        mCurr = mHP;
        saveProgress();
    }
    updateUI();
};

function updateUI() {
    const elGold = document.getElementById('gold');
    if (elGold) elGold.innerText = Math.floor(gold);
    
    const elStage = document.getElementById('stage-header');
    if (elStage) elStage.innerText = "Stage: " + stage;

    const elHP = document.getElementById('hp-bar');
    if (elHP) elHP.style.width = (mCurr / mHP * 100) + "%";
}

// --- LEADERBOARD ---
window.renderLeaderboard = async function() {
    const body = document.getElementById('leaderboard-body');
    if (body) body.innerHTML = "<tr><td colspan='3'>Načítám...</td></tr>";

    let { data, error } = await mojeSupabase
        .from('leaderboard')
        .select('*')
        .order('stage', { ascending: false })
        .limit(10);

    if (error) return console.error(error);

    if (body) {
        body.innerHTML = data.map((p, i) => `
            <tr>
                <td>${i + 1}.</td>
                <td>${p.name}</td>
                <td>${p.stage}</td>
            </tr>
        `).join('');
    }
};

// Start hry
window.onload = () => {
    if (currentUser) {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'none';
        const userDisp = document.getElementById('user-display');
        if (userDisp) userDisp.innerText = "👤 " + currentUser;
    }
    updateUI();
};
