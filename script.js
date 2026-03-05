// --- KONFIGURACE SUPABASE ---
// Opraveno: Používáme const a název supabaseClient (image_84d3f5.png)
const supabaseUrl = 'https://ypiouidfskzfwuvldwlk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaW91aWRmc2t6Znd1dmxkd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg4NzUsImV4cCI6MjA4ODIwNDg3NX0.hwpuuxMdII0uB1HQgu8RN-NFgOBy9UOdU7J9QZsPizA';

// Vytvoření klienta pod unikátním názvem
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- HERNÍ PROMĚNNÉ ---
let gold = 0;
let stage = 1;
let currentUser = localStorage.getItem('titanitas_user') || "Hráč";

// --- FUNKCE PRO UKLÁDÁNÍ (CLOUD SAVE) ---
async function saveToCloud() {
    if (!currentUser) return;
    
    try {
        // Používáme sjednocený supabaseClient (image_84cffe.png)
        await supabaseClient.from('leaderboard').upsert({
            name: currentUser,
            gold: Math.floor(gold),
            stage: stage
        }, { onConflict: 'name' });
    } catch (e) {
        console.error("Chyba při ukládání na DB:", e);
    }
}

// --- FUNKCE PRO ŽEBŘÍČEK (OPRAVENO) ---
async function renderLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if (body) body.innerHTML = "<tr><td colspan='4'>Načítám z cloudu...</td></tr>";

    // Oprava: ReferenceError: ttClient is not defined vyřešena (image_830a39.png)
    let { data, error } = await supabaseClient
        .from('leaderboard')
        .select('*')
        .order('stage', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Chyba žebříčku:", error);
        if (body) body.innerHTML = "<tr><td colspan='4'>Chyba načítání</td></tr>";
        return;
    }

    if (body && data) {
        body.innerHTML = data.map((p, i) => `
            <tr style="${p.name === currentUser ? 'background: rgba(255,215,0,0.2);' : ''}">
                <td>${i + 1}.</td>
                <td>${p.name}</td>
                <td>${p.resets || 0}</td>
                <td>${p.stage}</td>
            </tr>
        `).join('');
    }
}

// --- POMOCNÉ FUNKCE PRO OKNA ---
window.openM = function() {
    document.getElementById('leaderboard-modal').style.display = 'block';
    renderLeaderboard();
};

window.closeM = function() {
    document.getElementById('leaderboard-modal').style.display = 'none';
};

// Automatické ukládání každých 30 sekund
setInterval(saveToCloud, 30000);
