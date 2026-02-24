// ============================================
// AUTH — Connexion, utilisateurs, sessions
// Les Artisans Verts © 2026
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwMCcrAU9QrP6N6G2haz2dCdO4dFEH0aeNlyeIvpP5EDw_R2JTjSHrLr2E74EhUGlqn/exec';
const FALLBACK_USERS = {
    'ishay':   { pass:'dd856a9e1874db2190766dd537671f2c79c56d9bb975e5ac3c7db5a4f7d108ee', name:'Ishay', role:'admin' },
    'yoann':   { pass:'1cf674b0d4b3038b008530bdd26fae2f205dd912ee86c0ae31981d218d1336db', name:'Yoann', role:'admin' },
    'ben':     { pass:'82ce7ffdbfb6da41dab321cee9286e88ea8e973b6d698c3621891908613640da', name:'Ben', role:'admin' },
    'john':    { pass:'c81539a4672d1ab486b3cbb9a7a93bbaf8f125eb437b2bf7b7d54c60f0e752b1', name:'John', role:'admin' },
    'mendy':   { pass:'ec341ec118416c929aa0e29541dee23484f196bee592fa8bd4003aab8867889a', name:'Mendy', role:'commercial' },
    'jean':    { pass:'51779e67e9af1ddcb546b19a7192b65525fbe5b8166bb60f0165b17d804f8bc1', name:'Jean Christophe', role:'commercial' },
    'telepro': { pass:'e28872f1f6a5bd90d8d86584e67afd1ccc510edcb1e7e7e07e1feee552a1fadd', name:'Téléprospecteur', role:'telepro' },
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
    var mc = document.getElementById('mainContent');
    mc.classList.remove('fournisseur-mode');
    mc.classList.remove('telepro-mode');
    document.getElementById('togClient').classList.remove('active');
    document.getElementById('togFournisseur').classList.remove('active');
    document.getElementById('togTelepro').classList.remove('active');

    if(v === 'telepro'){
        mode = 1;
        mc.classList.add('fournisseur-mode');
        mc.classList.add('telepro-mode');
        document.getElementById('togTelepro').classList.add('active');
        logAction('Vue telepro', '');
    } else if(v === 'fournisseur'){
        mode = 1;
        mc.classList.add('fournisseur-mode');
        document.getElementById('togFournisseur').classList.add('active');
        logAction('Vue fournisseur', '');
    } else {
        mode = 0;
        document.getElementById('togClient').classList.add('active');
        logAction('Vue client', '');
    }
    try{ calc(); }catch(e){}
}

function showApp(){
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';

    const isGuest = !currentUser || currentUser.role === 'guest';
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isTelepro = currentUser && currentUser.role === 'telepro';
    const isCommercial = currentUser && currentUser.role === 'commercial';

    if(isGuest){
        // Vue client uniquement, pas de toggle
        mode = 0;
        document.getElementById('mainContent').classList.remove('fournisseur-mode');
        document.getElementById('mainContent').classList.remove('telepro-mode');
        document.getElementById('guestBar').style.display = 'flex';
        document.getElementById('userBar').style.display = 'none';
    } else {
        document.getElementById('guestBar').style.display = 'none';
        document.getElementById('userBar').style.display = 'flex';
        document.getElementById('userNameDisplay').textContent = currentUser.name;

        if(isAdmin){
            // Admin : toggle visible avec 3 vues, défaut = fournisseur
            document.getElementById('viewToggle').style.display = '';
            document.getElementById('togTelepro').style.display = '';
            document.getElementById('userRoleDisplay').textContent = '👑 Admin';
            switchView('fournisseur');
        } else if(isTelepro){
            // Telepro : verrouillé en mode telepro, pas de toggle
            document.getElementById('viewToggle').style.display = 'none';
            document.getElementById('userRoleDisplay').textContent = '📞 Téléprospecteur';
            switchView('telepro');
        } else {
            // Commercial : toggle visible avec Client + Pro, défaut = fournisseur
            document.getElementById('viewToggle').style.display = '';
            document.getElementById('togClient').style.display = '';
            document.getElementById('togFournisseur').style.display = '';
            document.getElementById('togTelepro').style.display = 'none';
            document.getElementById('userRoleDisplay').textContent = '📊 Commercial';
            switchView('fournisseur');
        }

        // Admin-only buttons
        document.getElementById('btnHistory').style.display = isAdmin ? '' : 'none';
        document.getElementById('btnPwd').style.display = isAdmin ? '' : 'none';
        var notifBtn = document.getElementById('btnNotif');
        if (notifBtn) notifBtn.style.display = isAdmin ? '' : 'none';
        // Super admin only (ishay)
        var isSuperAdmin = currentUser && currentUser.id && currentUser.id.toLowerCase() === 'ishay';
        var userMgmtBtn = document.getElementById('btnUserMgmt');
        if (userMgmtBtn) userMgmtBtn.style.display = isSuperAdmin ? '' : 'none';
    }

    try { updateSurfaceOptions(); } catch(e){}
    try { calc(); } catch(e){}
    try { buildBaremeTable(); } catch(e){}
    try { calcBareme(); } catch(e){}
    try { syncEtas(); } catch(e){}
    try { calcDim(); } catch(e){}
    // Retry install banner now that user is logged in
    try { showInstallBanner(); } catch(e){}
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

// ============================================
// USER MANAGEMENT (super admin only)
// ============================================
function openUserMgmt() {
    document.getElementById('userMgmtModal').classList.add('active');
    loadUserList();
}

function loadUserList() {
    var container = document.getElementById('userListContainer');
    container.innerHTML = '<div style="padding:12px;color:#9ca3af;text-align:center;">Chargement...</div>';
    if (!API_URL) { container.innerHTML = '<div style="padding:12px;color:#dc2626;text-align:center;">API non configurée</div>'; return; }
    apiCall({action:'listUsers', adminUser:currentUser.id}, function(d) {
        if (d.success && d.users) {
            var rc = {admin:'#7c3aed', commercial:'#2563eb', telepro:'#059669'};
            var rl = {admin:'👑 Admin', commercial:'📊 Commercial', telepro:'📞 Télépro'};
            var html = '<table style="width:100%;border-collapse:collapse;">';
            html += '<tr style="background:#f9fafb;font-size:11px;color:#6b7280;text-transform:uppercase;"><td style="padding:8px 12px;">ID</td><td style="padding:8px 12px;">Nom</td><td style="padding:8px 12px;">Rôle</td><td style="padding:8px 4px;"></td></tr>';
            d.users.forEach(function(u) {
                var r = (u.role||'commercial').toLowerCase();
                html += '<tr style="border-top:1px solid #f3f4f6;">';
                html += '<td style="padding:6px 12px;font-weight:600;">' + _esc(u.username) + '</td>';
                html += '<td style="padding:6px 12px;">' + _esc(u.name) + '</td>';
                html += '<td style="padding:6px 12px;"><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:'+(rc[r]||'#6b7280')+'15;color:'+(rc[r]||'#6b7280')+';font-weight:600;">'+(rl[r]||r)+'</span></td>';
                html += '<td style="padding:6px 4px;text-align:center;">';
                if (u.username.toLowerCase() !== 'ishay') html += '<button onclick="doDeleteUser(\''+_esc(u.username)+'\')" style="background:none;border:none;cursor:pointer;font-size:14px;opacity:0.4;" title="Supprimer">🗑️</button>';
                html += '</td></tr>';
            });
            container.innerHTML = html + '</table>';
        } else { container.innerHTML = '<div style="padding:12px;color:#dc2626;text-align:center;">'+(d.error||'Erreur')+'</div>'; }
    }, function() { container.innerHTML = '<div style="padding:12px;color:#dc2626;text-align:center;">Erreur réseau</div>'; });
}
function _esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

function doCreateUser() {
    var msg = document.getElementById('userMgmtMsg');
    var u = (document.getElementById('newUserUsername').value||'').trim().toLowerCase();
    var n = (document.getElementById('newUserName').value||'').trim();
    var p = document.getElementById('newUserPassword').value||'';
    var r = document.getElementById('newUserRole').value;
    if(!u||!n||!p){msg.textContent='Tous les champs sont requis';msg.style.color='#dc2626';msg.style.display='block';return;}
    if(p.length<4){msg.textContent='Mot de passe : min 4 car.';msg.style.color='#dc2626';msg.style.display='block';return;}
    msg.textContent='Création...';msg.style.color='#6b7280';msg.style.display='block';
    apiCall({action:'createUser',adminUser:currentUser.id,username:u,name:n,pass:p,role:r},function(d){
        if(d.success){msg.textContent='✅ '+n+' créé !';msg.style.color='#16a34a';document.getElementById('newUserUsername').value='';document.getElementById('newUserName').value='';document.getElementById('newUserPassword').value='';loadUserList();}
        else{msg.textContent='❌ '+(d.error||'Erreur');msg.style.color='#dc2626';}
    },function(){msg.textContent='❌ Erreur réseau';msg.style.color='#dc2626';});
}

function doDeleteUser(username) {
    if(!confirm('Supprimer "'+username+'" ?'))return;
    apiCall({action:'deleteUser',adminUser:currentUser.id,username:username},function(d){
        if(d.success)loadUserList();else alert(d.error||'Erreur');
    },function(){alert('Erreur réseau');});
}
