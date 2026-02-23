// ============================================
// SECURITY — Protections anti-copie, auto-update
// Les Artisans Verts © 2026
// ============================================

// Debug helper
const _debugLog=[];
function dbg(msg){
    _debugLog.push(new Date().toLocaleTimeString()+': '+msg);
    try{
        const el=document.getElementById('debugLog');
        if(el) el.innerHTML=_debugLog.slice(-30).map(l=>'<div>'+l+'</div>').join('');
    }catch(e){}
    console.log('[DBG]', msg);
}
window.onerror=function(msg,url,line,col,err){
    console.warn('JS ERROR:', msg, 'line', line);
    return false;
};

// ============================================
// VERSION & AUTO-UPDATE CHECK
// ============================================
const APP_VERSION = '2026-02-20-v1';
// ⚠️ REMPLACE cette URL par l'URL raw de ton fichier sur GitHub
// Format : https://raw.githubusercontent.com/TON-USER/TON-REPO/main/index.html
const GITHUB_RAW_URL = '';

(function autoUpdateCheck(){
    if(!GITHUB_RAW_URL) return;
    let updatePending = false;
    
    setInterval(function(){
        if(updatePending) return;
        fetch(GITHUB_RAW_URL + '?t=' + Date.now(), {cache:'no-store'})
            .then(r => r.text())
            .then(txt => {
                const match = txt.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
                if(match && match[1] !== APP_VERSION){
                    updatePending = true;
                    // Attendre 5 minutes avant d'afficher le popup
                    setTimeout(showUpdatePopup, 5 * 60 * 1000);
                }
            })
            .catch(()=>{});
    }, 2 * 60 * 1000); // Check toutes les 2 minutes
})();

function showUpdatePopup(){
    if(document.getElementById('updatePopup')) return;
    const overlay = document.createElement('div');
    overlay.id = 'updatePopup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
        <div style="background:#1e293b;border:2px solid #34d399;border-radius:20px;padding:32px 28px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="font-size:48px;margin-bottom:12px;">🔄</div>
            <div style="font-size:18px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">Mise à jour des données</div>
            <div style="font-size:14px;color:#94a3b8;margin-bottom:24px;line-height:1.5;">Les données du simulateur ont été mises à jour.<br>Veuillez rafraîchir la page pour continuer.</div>
            <button onclick="location.reload(true)" style="background:linear-gradient(135deg,#059669,#34d399);color:white;border:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;width:100%;box-shadow:0 4px 16px rgba(52,211,153,0.3);transition:transform 0.2s;">
                ✅ Rafraîchir maintenant
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ============================================
// PROTECTION ANTI-COPIE
// ============================================
(function(){
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    
    // Disable keyboard shortcuts (F12, Ctrl+U, Ctrl+S, Ctrl+Shift+I/J/C)
    document.addEventListener('keydown', function(e){
        // F12
        if(e.key === 'F12') { e.preventDefault(); return false; }
        // Ctrl+U (view source)
        if(e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        // Ctrl+S (save)
        if(e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
        // Ctrl+Shift+I (DevTools)
        if(e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
        // Ctrl+Shift+J (Console)
        if(e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
        // Ctrl+Shift+C (Inspect)
        if(e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
        // Ctrl+A (select all) — only outside inputs
        if(e.ctrlKey && e.key === 'a' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); return false; }
    });
    
    // Disable text selection (except in inputs)
    document.addEventListener('selectstart', function(e){
        if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
        e.preventDefault();
    });
    
    // Disable drag
    document.addEventListener('dragstart', function(e){ e.preventDefault(); });
    
    // DevTools detection — redirect if opened
    let _dtCheck = 0;
    setInterval(function(){
        const t0 = performance.now();
        debugger;
        if(performance.now() - t0 > 50){
            _dtCheck++;
            if(_dtCheck > 2) document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-size:24px;font-weight:700;font-family:sans-serif;">⛔ Accès non autorisé</div>';
        } else { _dtCheck = 0; }
    }, 2000);
    
    // Console warning
    console.log('%c⛔ STOP', 'color:red;font-size:48px;font-weight:bold;');
    console.log('%cCe simulateur est la propriété de Les Artisans Verts. Toute copie ou reproduction est interdite.', 'color:#fbbf24;font-size:14px;');
    
    // Invisible watermark — fingerprint dans le DOM
    var _wm = document.createElement('div');
    _wm.style.cssText = 'position:fixed;opacity:0;pointer-events:none;z-index:-1;font-size:0;';
    _wm.setAttribute('data-owner','Les Artisans Verts - LAV-770-SIM-2026');
    _wm.setAttribute('data-license','Propriétaire - Reproduction interdite');
    _wm.setAttribute('data-trace', btoa('LAV|' + Date.now() + '|' + navigator.userAgent));
    document.body.appendChild(_wm);
    
    // Hidden watermark in all print outputs
    var _wmStyle = document.createElement('style');
    _wmStyle.textContent = '@media print { body::after { content: "Les Artisans Verts © 2026 — LAV-770-SIM"; position: fixed; bottom: 5px; right: 5px; font-size: 7px; color: rgba(0,0,0,0.08); z-index: 99999; } }';
    document.head.appendChild(_wmStyle);
    
    // Domain lock — only works on authorized domains
    var _h = location.hostname;
    var _allowed = ['localhost','127.0.0.1','','file','lesartisansverts.fr','www.lesartisansverts.fr'];
    // Also allow github.io subdomains
    if(_h && !_allowed.includes(_h) && !_h.endsWith('.github.io') && !_h.endsWith('.netlify.app') && !_h.endsWith('.vercel.app') && location.protocol !== 'file:'){
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-size:20px;font-weight:700;font-family:sans-serif;text-align:center;padding:20px;">⛔ Domaine non autorisé<br><small style="font-size:14px;color:#94a3b8;margin-top:10px;display:block;">Ce simulateur ne peut fonctionner que sur un domaine autorisé.</small></div>';
    }
})();
