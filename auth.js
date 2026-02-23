// ============================================
// AUTH — Connexion, utilisateurs, sessions
// Les Artisans Verts © 2026
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwP1Nu60KfLu6iKNk7SMfkJoaq5_UbzcEtwnlBm5r1XbDYz8T16zayfPWynm0Zd_4Th/exec';
const FALLBACK_USERS = {
    'ishay':   { pass:'e9138f38d979c81ca528a9a73cbd90892f7413496b076bc655ecc937325369a4', name:'Ishay', role:'admin' },
    'admin':   { pass:'6d67409383d73d798ae012bb90def775f1e6a5d878fd3857f1b3cee24793fa1f', name:'Admin', role:'admin' },
    'mendy':   { pass:'9b5ba8665f66adea835f535ed91caa80e73f169bcfe0fca54f23e44d0ae874cd', name:'Mendy', role:'commercial' },
    'david':   { pass:'b19a7bb33c9d8023f64d00e475416f8feeccca95ab79875095c5db7733b750b0', name:'David', role:'commercial' },
    'sarah':   { pass:'f089f023579c7bd9f176065938e9858f03767564c3f0992cdaeedbc42bd5f38a', name:'Sarah', role:'commercial' },
    'marc':    { pass:'34fb0e105bf277a0e0350e881e42b1b355f1b4cf893e767b0fab57a6545420ea', name:'Marc', role:'commercial' },
    'julie':   { pass:'5f082d797344b7abb2b8e90f68bbe567dc30aa5ed6da82e4cb1165225310c7bb', name:'Julie', role:'commercial' },
    'thomas':  { pass:'b02a6e639618ea0121c6da3eff69796e4ed2e115451e087758438d547bcb4efc', name:'Thomas', role:'commercial' },
    'telepro': { pass:'3ce4eded52851e63bdc4467d0e8eadbfb839a1ca6013207033017ab90c4ec6af', name:'Téléprospecteur', role:'telepro' },
};
var currentUser = null;
var useAPI = false;

function apiCall(params, callback, errorCallback) {
    if (!API_URL) { if(errorCallback) errorCallback('Pas de serveur'); return; }
    const qs = Object.entries(params).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    fetch(API_URL + '?' + qs, {redirect:'follow'})
        .then(r => r.text())
        .then(txt => {
            let d;
            try { d = JSON.parse(txt); } catch(e) {
                const m = txt.match(/\{[\s\S]*\}/);
                if(m) try { d = JSON.parse(m[0]); } catch(e2){}
            }
            if(d) callback(d);
            else if(errorCallback) errorCallback('Réponse invalide');
        })
        .catch(e => { if(errorCallback) errorCallback(e.message); });
}

function doLogin(){
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    errEl.style.display = 'none';
    if(!u){ errEl.textContent='Veuillez saisir un identifiant'; errEl.style.display='block'; return; }

    if(API_URL) {
        // API mode
        errEl.textContent = 'Connexion...'; errEl.style.display='block'; errEl.style.color='#6b7280';
        apiCall({action:'login', user:u, pass:p}, function(d){
            errEl.style.color = '#dc2626';
            if(d.success){
                useAPI = true;
                const usr = d.user || {};
                var _r = (usr.role || 'commercial').toLowerCase();
                if(_r === 'user') _r = 'commercial';
                currentUser = {
                    id: usr.username || u,
                    name: usr.name || u,
                    role: _r
                };
                try{ localStorage.setItem('pac_user', JSON.stringify(currentUser)); localStorage.setItem('pac_api','1'); }catch(e){}
                showApp();
            } else {
                // API rejected → try local fallback
                errEl.style.color = '#dc2626';
                doLoginLocal(u, p, errEl);
            }
        }, function(err){
            // Fallback local
            errEl.style.color = '#dc2626';
            doLoginLocal(u, p, errEl);
        });
    } else {
        doLoginLocal(u, p, errEl);
    }
}
function doLoginLocal(u, p, errEl){
    const account = FALLBACK_USERS[u];
    if(!account){
        errEl.textContent = 'Identifiant ou mot de passe incorrect';
        errEl.style.display = 'block';
        errEl.style.color = '#dc2626';
        return;
    }
    // Hash password with SHA-256 and compare
    sha256(p).then(function(hash){
        if(hash !== account.pass){
            errEl.textContent = 'Identifiant ou mot de passe incorrect';
            errEl.style.display = 'block';
            errEl.style.color = '#dc2626';
            return;
        }
        useAPI = false;
        currentUser = { id:u, name:account.name, role:account.role };
        try{ localStorage.setItem('pac_user', JSON.stringify(currentUser)); localStorage.removeItem('pac_api'); }catch(e){}
        showApp();
        logAction('Connexion (local)', account.name);
    });
}
async function sha256(str){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
document.getElementById('loginPass').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
document.getElementById('loginUser').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

function doLogout(){
    logAction('Déconnexion', currentUser ? currentUser.name : '');
    currentUser = null;
    try{ localStorage.removeItem('pac_user'); localStorage.removeItem('pac_api'); }catch(e){}
    location.reload();
}

function goToLogin(){
    currentUser = null;
    try{ localStorage.removeItem('pac_user'); }catch(e){}
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

function doGuestLogin(){
    currentUser = { id:'guest', name:'Client', role:'guest' };
    try{ localStorage.setItem('pac_user', JSON.stringify(currentUser)); }catch(e){}
    showApp();
}

function switchView(v){
    if(v === 'fournisseur'){
        mode = 1;
        document.getElementById('mainContent').classList.add('fournisseur-mode');
        document.getElementById('togFournisseur').classList.add('active');
        document.getElementById('togClient').classList.remove('active');
        logAction('Vue fournisseur', '');
    } else {
        mode = 0;
        document.getElementById('mainContent').classList.remove('fournisseur-mode');
        document.getElementById('togClient').classList.add('active');
        document.getElementById('togFournisseur').classList.remove('active');
        logAction('Vue client', '');
    }
    try{ calc(); }catch(e){}
}

function showApp(){
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';

    const isGuest = !currentUser || currentUser.role === 'guest';

    if(isGuest){
        // Vue client uniquement
        mode = 0;
        document.getElementById('mainContent').classList.remove('fournisseur-mode');
        document.getElementById('mainContent').classList.remove('telepro-mode');
        document.getElementById('guestBar').style.display = 'flex';
        document.getElementById('userBar').style.display = 'none';
    } else {
        // Commercial/admin/telepro : vue fournisseur par défaut
        mode = 1;
        document.getElementById('mainContent').classList.add('fournisseur-mode');
        document.getElementById('guestBar').style.display = 'none';
        document.getElementById('userBar').style.display = 'flex';
        document.getElementById('userNameDisplay').textContent = currentUser.name;

        // Telepro mode
        const isTelepro = currentUser.role === 'telepro';
        if(isTelepro){
            document.getElementById('mainContent').classList.add('telepro-mode');
            document.getElementById('userRoleDisplay').textContent = '📞 Téléprospecteur';
        } else {
            document.getElementById('mainContent').classList.remove('telepro-mode');
            document.getElementById('userRoleDisplay').textContent = currentUser.role === 'admin' ? '👑 Admin' : '📊 Commercial';
        }

        // Admin-only buttons
        const isAdmin = currentUser.role === 'admin';
        document.getElementById('btnHistory').style.display = isAdmin ? '' : 'none';
        document.getElementById('btnPwd').style.display = isAdmin ? '' : 'none';
        var notifBtn = document.getElementById('btnNotif');
        if (notifBtn) notifBtn.style.display = '';
        // Toggle default to fournisseur
        document.getElementById('togFournisseur').classList.add('active');
        document.getElementById('togClient').classList.remove('active');
    }

    try { updateSurfaceOptions(); } catch(e){}
    try { calc(); } catch(e){}
    try { buildBaremeTable(); } catch(e){}
    try { calcBareme(); } catch(e){}
    try { syncEtas(); } catch(e){}
    try { calcDim(); } catch(e){}
}

function checkAutoLogin(){
    try{
        const stored = localStorage.getItem('pac_user');
        if(stored){
            const data = JSON.parse(stored);
            if(data && data.id){
                if(localStorage.getItem('pac_api')) useAPI = true;
                currentUser = data;
                showApp();
                return true;
            }
        }
    }catch(e){}
    return false;
}

// ============================================
