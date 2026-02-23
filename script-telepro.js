// ============================================
// SCRIPT TELEPRO — Panneau interactif
// Les Artisans Verts © 2026
// ============================================

// ============================================
// SCRIPT TELEPRO — TOGGLE STEPS
// ============================================
function toggleStep(n){
    for(let i = 1; i <= 12; i++){
        const el = document.getElementById('ss' + i);
        if(!el) continue;
        if(i === n){
            el.classList.toggle('active');
        } else {
            el.classList.remove('active');
        }
        if(i < n) el.classList.add('done');
    }
}

// Sync script inputs → simulator fields
function syncScript(targetId, value){
    const target = document.getElementById(targetId);
    if(!target) return;
    
    if(target.tagName === 'SELECT'){
        target.value = value;
        target.dispatchEvent(new Event('change'));
    } else {
        target.value = value;
        target.dispatchEvent(new Event('input'));
    }
    
    // Trigger appropriate recalculation
    if(targetId === 'departement') { detectDept(); }
    if(targetId === 'rfr' || targetId === 'nbPersonnes') { detectProfil(); updateScriptBadge(); }
    if(targetId === 'dimAnnee') { try { evalIsolation(); calcBareme(); calcDim(); } catch(e){} }
    if(targetId === 'ceeSurface') { syncSurfaces('cee'); }
    if(targetId === 'scenario') { onScenarioChange(); }
    if(targetId === 'nom' || targetId === 'prenom') { checkExport(); }
}

// Sync isolation checkboxes from script → simulator
function syncIso(value, checked){
    var boxes = document.querySelectorAll('#isoChecklist input[name="isoWork"]');
    boxes.forEach(function(box){
        if(box.value === value){
            box.checked = checked;
        }
    });
    setTimeout(function(){ evalIsolation(); calcBareme(); }, 10);
}

// Update result badge in script step 7
function updateScriptBadge(){
    setTimeout(function(){
        var badge = document.getElementById('sResultBadge');
        var racDisplay = document.getElementById('sRACDisplay');
        if(!badge) return;
        
        var statusEl = document.getElementById('dossierStatus');
        if(!statusEl) { badge.style.display = 'none'; return; }
        
        var cat = document.getElementById('categorie') ? document.getElementById('categorie').value : '';
        var racEl = document.getElementById('racDisplay');
        var rac = racEl ? racEl.textContent : '—';
        
        if(statusEl.classList.contains('danger')){
            badge.style.display = 'block';
            badge.style.background = 'rgba(239,68,68,0.15)';
            badge.style.color = '#f87171';
            badge.innerHTML = '⚠️ Aides insuffisantes — ne pas poursuivre';
        } else {
            badge.style.display = 'block';
            badge.style.background = 'rgba(52,211,153,0.12)';
            badge.style.color = '#34d399';
            badge.innerHTML = '✅ Éligible — Profil ' + cat + ' — RAC : ' + rac;
        }
        
        if(racDisplay) racDisplay.textContent = rac;
    }, 300);
}

