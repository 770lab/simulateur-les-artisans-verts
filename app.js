// ============================================
// APP — Calculs, UI, exports, logging
// Les Artisans Verts © 2026
// ============================================

function detectDept() {
    const deptInput = document.getElementById('departement').value.trim();
    if (!deptInput) return;
    const deptKey = deptInput.padStart(2,'0');

    // Auto IDF
    const IDF_DEPTS = ['75','77','78','91','92','93','94','95'];
    const isIDF = IDF_DEPTS.includes(deptKey);
    document.getElementById('region').value = isIDF ? 'IDF' : 'PROVINCE';

    // Set zone BEFORE detectProfil so it displays correctly
    const zone = DEPT_ZONE[deptInput] || DEPT_ZONE[deptKey];
    if (zone) {
        document.getElementById('zone').value = zone;
        document.getElementById('deptZoneResult').textContent = `→ Zone ${zone}${isIDF ? ' · IDF' : ''}`;
        
        detectProfil();

        // Auto Tbase dimensionnement
        const tbase = DEPT_TBASE[deptKey] || DEPT_TBASE[deptInput];
        if (tbase !== undefined) {
            document.getElementById('dimTbase').value = tbase;
            calcDim();
        }
        calc();
        calcCEEDetail();
    } else {
        detectProfil();
        document.getElementById('deptZoneResult').textContent = '❌ Département inconnu';
        
    }
}

function detectProfil() {
    const region = document.getElementById('region').value;
    const nb = parseInt(document.getElementById('nbPersonnes').value);
    const rfr = parseFloat(document.getElementById('rfr').value);
    const bloc = document.getElementById('mprResultBloc');

    if (!rfr || rfr <= 0) {
        bloc.style.display = 'none';
        return;
    }

    const seuils = getSeuilsForPersonnes(region, nb);
    let profil, icon, label, desc, bg, color;

    if (rfr <= seuils[0]) {
        profil = 'BLEU'; icon = '🔵'; label = 'Profil Bleu'; desc = 'Revenus très modestes';
        bg = 'linear-gradient(135deg, #1e40af, #3b82f6)'; color = '#ffffff';
    } else if (rfr <= seuils[1]) {
        profil = 'JAUNE'; icon = '🟡'; label = 'Profil Jaune'; desc = 'Revenus modestes';
        bg = 'linear-gradient(135deg, #ca8a04, #eab308)'; color = '#ffffff';
    } else if (rfr <= seuils[2]) {
        profil = 'VIOLET'; icon = '🟣'; label = 'Profil Violet'; desc = 'Revenus intermédiaires';
        bg = 'linear-gradient(135deg, #6b21a8, #a855f7)'; color = '#ffffff';
    } else {
        profil = 'ROSE'; icon = '<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:#f472b6;"></span>'; label = 'Profil Rose'; desc = 'Revenus supérieurs';
        bg = 'linear-gradient(135deg, #9d174d, #f472b6)'; color = '#ffffff';
    }

    const regionLabel = region === 'IDF' ? 'Île-de-France' : 'Province';
    const seuilIdx = profil === 'BLEU' ? 0 : (profil === 'JAUNE' ? 1 : 2);
    const seuilVal = seuils[seuilIdx];

    // Update bloc
    bloc.style.display = 'block';
    bloc.style.background = bg;
    bloc.style.color = color;
    document.getElementById('mprProfilIcon').innerHTML = icon;
    document.getElementById('mprProfilLabel').textContent = label;
    document.getElementById('mprProfilDesc').textContent = desc;
    const zn = document.getElementById('zone').value;
    document.getElementById('mprInfoRegion').textContent = regionLabel + ' · ' + zn;
    document.getElementById('mprInfoFoyer').textContent = nb + ' pers.';
    document.getElementById('mprInfoSeuil').textContent = profil === 'ROSE'
        ? '> ' + seuilVal.toLocaleString('fr-FR') + ' €'
        : '≤ ' + seuilVal.toLocaleString('fr-FR') + ' €';
    document.getElementById('mprInfoRFR').textContent = 'RFR déclaré : ' + rfr.toLocaleString('fr-FR') + ' €';

    // Aide MPR pour le scénario en cours
    const sc = document.getElementById('scenario').value;
    const mpr = D.MPR[sc] ? D.MPR[sc][profil] : 0;
    document.getElementById('mprInfoAide').textContent = mpr > 0
        ? 'Aide MaPrimeRénov\' : ' + mpr.toLocaleString('fr-FR') + ' €'
        : 'Pas d\'aide MaPrimeRénov\' pour ce profil';

    document.getElementById('categorie').value = profil;

    // Sync catégorie ménage CEE
    document.getElementById('menageCEE').value = (profil === 'BLEU') ? 'tm' : 'autres';

    calc();
    calcCEEDetail();
}

function toggleRevenus() {
    const body = document.getElementById('revenusBody');
    const arrow = document.getElementById('toggleArrow');
    if (body) body.classList.toggle('open');
    if (arrow) arrow.classList.toggle('open');
}

// ============================================
// CEE DÉTAIL — BAR-TH-171 / 143 / 148
// (Source : fiche BAR-TH-171 vA78.4)
// ============================================

function onTypeLogementChange() {
    updateSurfaceOptions();
    calc();
}

function syncEtas() {
    const val = document.getElementById('etas').value;
    document.getElementById('ceeEtas').value = (val === '111-140') ? 'lt140' : 'ge140';
    calcCEEDetail();
}

function onScenarioChange() {
    const sc = document.getElementById('scenario').value;
    const isSSC = (sc === 'SSC');
    // SSC seul: hide ETAS, surface, barème PAC (143 = forfait zone only)
    document.getElementById('etasGroup').style.display = isSSC ? 'none' : '';
    document.getElementById('ceeSurfaceGroup').style.display = isSSC ? 'none' : '';
    document.getElementById('baremeCard').style.display = isSSC ? 'none' : '';
    const dimCard = document.getElementById('dimensionnementCard');
    if (dimCard) dimCard.style.display = isSSC ? 'none' : '';
    // Demande mairie for SSC scenarios
    const mairieRow = document.getElementById('mairieRow');
    if (mairieRow) mairieRow.style.display = (sc === 'PAC + SSC' || sc === 'SSC') ? '' : 'none';
    detectProfil();
    calc();
    if(typeof logScenarioChange==='function') logScenarioChange();
}

var _calcRunning = false;

var lastCEEDetailPrime = 0;
var lastCEEDetailKwhc = 0;

function toggleCEE() {
    const body = document.getElementById('ceeBody');
    const arrow = document.getElementById('ceeToggleArrow');
    if (body) body.classList.toggle('open');
    if (arrow) arrow.classList.toggle('open');
}

// Quelle(s) fiche(s) BAR-TH s'appliquent selon le scénario
// Depuis 01/01/2026 : BAR-TH-148 NON cumulable avec BAR-TH-171 (arrêté 15/12/2025)
function getCEEFiches(scenario) {
    switch(scenario) {
        case 'PAC':                    return ['171'];
        case 'PAC + BALLON ÉLECTRIQUE': return ['171'];
        case 'PAC + BALLON THERMO':     return ['171']; // 148 non cumulable depuis 01/2026
        case 'PAC + SSC':              return ['171']; // CEE PAC uniquement (143 SSC non applicable en cumul)
        case 'SSC':                    return ['143']; // SSC seul = BAR-TH-143 uniquement
        default:                        return ['171'];
    }
}

function calcCEEDetail() {
  try {
    const sc = document.getElementById('scenario').value;
    const zn = document.getElementById('zone').value;
    const menage = document.getElementById('menageCEE').value;
    const price = CEE_PRICE[menage] || CEE_PRICE.autres;
    const tl = document.getElementById('typeLogement').value;
    const surfaceVal = document.getElementById('surface').value;
    const coefS = getSurfaceCoef(surfaceVal);

    // Update surface info label
    const ceeSurfInfo = document.getElementById('ceeSurfaceInfo');
    if (ceeSurfInfo) {
        const s = parseInt(document.getElementById('ceeSurface').value) || 0;
        if (tl === 'maison') {
            ceeSurfInfo.textContent = s < 70 ? '→ S < 70 m² (coef 0,5)' : (s < 90 ? '→ 70 ≤ S < 90 m² (coef 0,7)' : '→ S ≥ 90 m² (coef 1)');
        } else {
            ceeSurfInfo.textContent = s < 35 ? '→ S < 35 m² (coef 0,5)' : (s < 60 ? '→ 35 ≤ S < 60 m² (coef 0,7)' : '→ S ≥ 60 m² (coef 1)');
        }
    }

    const fiches = getCEEFiches(sc);

    // Labels
    document.getElementById('ceeScenarioLabel').textContent = SCENARIO_NAMES[sc] || sc;
    document.getElementById('ceeFichesLabel').textContent = fiches.map(f => 'BAR-TH-' + f).join(' + ');
    const noteEl = document.getElementById('ceeNonCumulNote');
    if (noteEl) { noteEl.style.display = 'none'; }

    // Show/hide blocs
    document.getElementById('ceeBloc171').classList.toggle('cee-hidden', !fiches.includes('171'));
    document.getElementById('ceeBloc148').classList.toggle('cee-hidden', !fiches.includes('148'));
    document.getElementById('ceeBloc143').classList.toggle('cee-hidden', !fiches.includes('143'));

    let totalKwhc = 0;
    let details = [];
    let statusParts = [];

    // === BAR-TH-171 ===
    if (fiches.includes('171')) {
        const etasKey = document.getElementById('etas').value === '111-140' ? 'lt140' : 'ge140';
        const base = BAR171[tl].base[etasKey];
        const cz = BAR171.coefZone[zn];
        document.getElementById('ceeCoefSurface').value = coefS.toString().replace('.', ',');
        const CDP = 5; // Coup de pouce Chauffage ×5 (arrêté 74e, oct 2025)
        const kwhc171 = base * coefS * cz * CDP;
        totalKwhc += kwhc171;
        details.push(`171: ${fmtIntCEE(kwhc171)}`);
        statusParts.push(`✅ 171: base ${fmtIntCEE(base)} × coef ${coefS} × zone ${cz} × CdP ×${CDP}`);
    }

    // === BAR-TH-148 ===
    if (fiches.includes('148')) {
        const kwhc148 = BAR148[tl] || 14700;
        totalKwhc += kwhc148;
        details.push(`148: ${fmtIntCEE(kwhc148)}`);
        const typeLabel = tl === 'maison' ? 'Maison' : 'Appart';
        document.getElementById('cee148Forfait').value = `${fmtIntCEE(kwhc148)} kWhc (${typeLabel})`;
        const prime148 = (kwhc148 / 1000) * price;
        document.getElementById('ceeOut148').textContent = fmtEurCEE(prime148);
        document.getElementById('ceeOut148Detail').textContent = `${fmtIntCEE(kwhc148)} kWhc`;
        document.getElementById('ceeKpi148').style.display = 'block';
        statusParts.push(`✅ 148: ${fmtIntCEE(kwhc148)} kWhc (v.A73.3 · ${typeLabel})`);
    } else {
        document.getElementById('ceeKpi148').style.display = 'none';
    }

    // === BAR-TH-143 ===
    if (fiches.includes('143')) {
        const base143 = BAR143[zn];
        const CDP143 = 2;
        const kwhc143avecCdP = base143 * CDP143;
        // Si cumul avec 171 : CdP va sur 171 (×5 > ×2), 143 = forfait base
        // Si 143 seul : CdP ×2 applicable
        const has171 = fiches.includes('171');
        const kwhc143 = has171 ? base143 : kwhc143avecCdP;
        totalKwhc += kwhc143;
        details.push(`143: ${fmtIntCEE(kwhc143)}`);
        if (has171) {
            document.getElementById('cee143Forfait').value = `${fmtIntCEE(base143)} kWhc (${zn}) — CdP sur 171`;
            statusParts.push(`✅ 143: forfait ${zn} = ${fmtIntCEE(base143)} kWhc (CdP ×${CDP143} = ${fmtIntCEE(kwhc143avecCdP)} si seul)`);
        } else {
            document.getElementById('cee143Forfait').value = `${fmtIntCEE(base143)} × ${CDP143} = ${fmtIntCEE(kwhc143avecCdP)} kWhc (${zn})`;
            statusParts.push(`✅ 143: forfait ${zn} ${fmtIntCEE(base143)} × CdP ×${CDP143} = ${fmtIntCEE(kwhc143avecCdP)} kWhc`);
        }
    }

    const primeCEE = (totalKwhc / 1000) * price;
    lastCEEDetailPrime = primeCEE;
    lastCEEDetailKwhc = totalKwhc;

    document.getElementById('ceeOutKwhc').textContent = `${fmtIntCEE(totalKwhc)} kWhc`;
    document.getElementById('ceeOutDetail').textContent = details.join(' + ');
    document.getElementById('ceeOutPrime').textContent = fmtEurCEE(primeCEE);
    document.getElementById('ceeOutPrix').textContent = `${price.toString().replace('.', ',')} €/MWhc · ${menage === 'tm' ? 'Très modestes' : 'Autres'}`;

    const resultEl = document.getElementById('ceeResult');
    if (statusParts.length > 0) {
        resultEl.className = 'cee-result show';
        resultEl.innerHTML = statusParts.join('<br>');
    } else {
        resultEl.className = 'cee-result';
    }

  } catch(e) {
    console.error('calcCEEDetail() error:', e);
    if(typeof dbg==='function') dbg('❌ calcCEEDetail: '+e.message+' at line '+(e.stack||'').split('\n')[1]);
    const errDiv = document.getElementById('calcErrorDebug');
    if (errDiv) { errDiv.textContent = '⚠ CEEDetail: ' + e.message; errDiv.style.display = 'block'; errDiv.style.color = '#dc2626'; errDiv.style.background = '#fef2f2'; }
  }
}

function fmtIntCEE(n) {
    return isFinite(n) ? Math.round(n).toLocaleString('fr-FR') : '—';
}
function fmtEurCEE(n) {
    return isFinite(n) ? Math.round(n).toLocaleString('fr-FR') + ' €' : '—';
}

function getCEE(et, zn, cs, sf){
    if(!D.CEE[et]) return 0;
    if(!D.CEE[et][zn]) return 0;
    if(!D.CEE[et][zn][cs]) return 0;
    if(!D.CEE[et][zn][cs][sf]) return 0;
    return D.CEE[et][zn][cs][sf];
}

var mode=0;

function fmt(n){
    return Math.round(n).toLocaleString('fr-FR')+' €';
}

function updateFromTTC(){
    document.getElementById('lockTTC').checked=false;
    calc();
}

function updateFromDetail(){
    document.getElementById('lockCoutHT').checked=false;
    
    const fields = [
        ['coutPACMateriel','qtePACMateriel','totalPACMateriel'],
        ['coutPACPose','qtePACPose','totalPACPose'],
        ['coutBallonMateriel','qteBallonMateriel','totalBallonMateriel'],
        ['coutBallonPose','qteBallonPose','totalBallonPose'],
        ['coutAccessoires','qteAccessoires','totalAccessoires'],
        ['coutAdmin','qteAdmin','totalAdmin'],
        ['coutMandat','qteMandat','totalMandat'],
        ['coutMairie','qteMairie','totalMairie']
    ];
    
    let totalGlobal = 0;
    fields.forEach(([cId, qId, tId]) => {
        const c = parseFloat(document.getElementById(cId).value) || 0;
        const q = parseFloat(document.getElementById(qId).value) || 0;
        const t = c * q;
        document.getElementById(tId).textContent = fmt(t);
        totalGlobal += t;
    });
    
    // Prévisite (checkbox)
    const prevChecked = document.getElementById('checkPrevisite').checked;
    const prevCost = prevChecked ? (parseFloat(document.getElementById('coutPrevisite').value) || 0) : 0;
    document.getElementById('totalPrevisite').textContent = prevChecked ? fmt(prevCost) : '0 €';
    totalGlobal += prevCost;
    
    document.getElementById('coutTotalHTDisplay').textContent = fmt(totalGlobal);
    calc();
}

function getCoutFromFields() {
    const f = ['coutPACMateriel','coutPACPose','coutBallonMateriel','coutBallonPose','coutAccessoires','coutAdmin','coutMandat','coutMairie'];
    const q = ['qtePACMateriel','qtePACPose','qteBallonMateriel','qteBallonPose','qteAccessoires','qteAdmin','qteMandat','qteMairie'];
    let t = 0;
    for (let i = 0; i < f.length; i++) {
        t += (parseFloat(document.getElementById(f[i]).value)||0) * (parseFloat(document.getElementById(q[i]).value)||0);
    }
    if (document.getElementById('checkPrevisite').checked) t += parseFloat(document.getElementById('coutPrevisite').value)||0;
    return t;
}

function getCoutFromDetail(sc, ad) {
    if (!D.COUT_DETAIL[sc]) return D.COUT[sc] || 0;
    const d = D.COUT_DETAIL[sc];
    let t = d.pac_materiel + d.pac_pose + d.ballon_materiel + d.ballon_pose + d.accessoires + d.admin + (d.mairie || 0);
    if (ad > 0) t += Math.round(ad * 0.12);
    if (document.getElementById('checkPrevisite').checked) t += parseFloat(document.getElementById('coutPrevisite').value)||200;
    return t;
}

// Frais pass-through (facturés au client, ajoutés au TTC)
// These are revenue items that shouldn't reduce margin
function getPassThrough() {
    if(mode) {
        const m = (parseFloat(document.getElementById('coutMandat').value)||0) * (parseFloat(document.getElementById('qteMandat').value)||0);
        const r = (parseFloat(document.getElementById('coutMairie').value)||0) * (parseFloat(document.getElementById('qteMairie').value)||0);
        const p = document.getElementById('checkPrevisite').checked ? (parseFloat(document.getElementById('coutPrevisite').value)||0) : 0;
        return m + r + p;
    } else {
        // Client mode: calculate from data
        const sc = document.getElementById('scenario').value;
        const ct = document.getElementById('categorie').value;
        const ad = (D.MPR[sc]&&D.MPR[sc][ct])?D.MPR[sc][ct]:0;
        const d = D.COUT_DETAIL[sc];
        let pt = (d ? (d.mairie||0) : 0);
        if(ad > 0) pt += Math.round(ad * 0.12);
        if(document.getElementById('checkPrevisite').checked) pt += parseFloat(document.getElementById('coutPrevisite').value)||200;
        return pt;
    }
}

function calc(){
  try {
    _calcRunning = true;
    
    // Always recalculate CEE detail first (updates lastCEEDetailPrime)
    calcCEEDetail();
    
    const sc=document.getElementById('scenario').value;
    const ct=document.getElementById('categorie').value;
    const zn=document.getElementById('zone').value;
    const et=document.getElementById('etas').value;
    const sf=surfaceToCategory(document.getElementById('surface').value);
    const cs=M[sc];
    
    // Check if CEE override is active
    
    let tt;
    if(mode){
        const lockTTC=document.getElementById('lockTTC').checked;
        if(lockTTC){
            tt = D.TTC[sc] || 0;
            document.getElementById('totalTTCInput').value=tt;
        }else{
            tt=parseFloat(document.getElementById('totalTTCInput').value)||0;
        }
    }else{
        tt=D.TTC[sc]||0;
    }
    
    const ad=(D.MPR[sc]&&D.MPR[sc][ct])?D.MPR[sc][ct]:0;
    
    let ch;
    if(mode){
        const lockCoutHT=document.getElementById('lockCoutHT').checked;
        
        if(lockCoutHT){
            if(D.COUT_DETAIL[sc]){
                const detail=D.COUT_DETAIL[sc];
                document.getElementById('coutPACMateriel').value = detail.pac_materiel;
                document.getElementById('qtePACMateriel').value = 1;
                document.getElementById('totalPACMateriel').textContent = fmt(detail.pac_materiel);
                document.getElementById('coutPACPose').value = detail.pac_pose;
                document.getElementById('qtePACPose').value = 1;
                document.getElementById('totalPACPose').textContent = fmt(detail.pac_pose);
                document.getElementById('coutBallonMateriel').value = detail.ballon_materiel;
                document.getElementById('qteBallonMateriel').value = detail.ballon_materiel > 0 ? 1 : 0;
                document.getElementById('totalBallonMateriel').textContent = fmt(detail.ballon_materiel);
                document.getElementById('coutBallonPose').value = detail.ballon_pose;
                document.getElementById('qteBallonPose').value = detail.ballon_pose > 0 ? 1 : 0;
                document.getElementById('totalBallonPose').textContent = fmt(detail.ballon_pose);
                document.getElementById('coutAccessoires').value = detail.accessoires;
                document.getElementById('qteAccessoires').value = 1;
                document.getElementById('totalAccessoires').textContent = fmt(detail.accessoires);
                document.getElementById('coutAdmin').value = detail.admin;
                document.getElementById('qteAdmin').value = 1;
                document.getElementById('totalAdmin').textContent = fmt(detail.admin);
                // Mandat MPR = 12% de l'aide MPR
                const mandatVal = Math.round(ad * 0.12);
                document.getElementById('coutMandat').value = mandatVal;
                document.getElementById('qteMandat').value = ad > 0 ? 1 : 0;
                document.getElementById('totalMandat').textContent = fmt(ad > 0 ? mandatVal : 0);
                // Demande mairie (SSC uniquement)
                const mairieVal = detail.mairie || 0;
                document.getElementById('coutMairie').value = mairieVal > 0 ? mairieVal : 250;
                document.getElementById('qteMairie').value = mairieVal > 0 ? 1 : 0;
                document.getElementById('totalMairie').textContent = fmt(mairieVal);
                // Prévisite
                const prevOn = document.getElementById('checkPrevisite').checked;
                const prevCost = prevOn ? (parseFloat(document.getElementById('coutPrevisite').value) || 200) : 0;
                document.getElementById('totalPrevisite').textContent = prevOn ? fmt(prevCost) : '0 €';
                ch = detail.pac_materiel + detail.pac_pose + detail.ballon_materiel + detail.ballon_pose + detail.accessoires + detail.admin + (ad > 0 ? mandatVal : 0) + mairieVal + prevCost;
            }else{
                ch = D.COUT[sc] || 0;
            }
        }else{
            const totalPACMateriel = (parseFloat(document.getElementById('coutPACMateriel').value) || 0) * (parseFloat(document.getElementById('qtePACMateriel').value) || 0);
            const totalPACPose = (parseFloat(document.getElementById('coutPACPose').value) || 0) * (parseFloat(document.getElementById('qtePACPose').value) || 0);
            const totalBallonMateriel = (parseFloat(document.getElementById('coutBallonMateriel').value) || 0) * (parseFloat(document.getElementById('qteBallonMateriel').value) || 0);
            const totalBallonPose = (parseFloat(document.getElementById('coutBallonPose').value) || 0) * (parseFloat(document.getElementById('qteBallonPose').value) || 0);
            const totalAccessoires = (parseFloat(document.getElementById('coutAccessoires').value) || 0) * (parseFloat(document.getElementById('qteAccessoires').value) || 0);
            const totalAdmin = (parseFloat(document.getElementById('coutAdmin').value) || 0) * (parseFloat(document.getElementById('qteAdmin').value) || 0);
            ch = totalPACMateriel + totalPACPose + totalBallonMateriel + totalBallonPose + totalAccessoires + totalAdmin;
            ch += (parseFloat(document.getElementById('coutMandat').value)||0) * (parseFloat(document.getElementById('qteMandat').value)||0);
            ch += (parseFloat(document.getElementById('coutMairie').value)||0) * (parseFloat(document.getElementById('qteMairie').value)||0);
            if(document.getElementById('checkPrevisite').checked) ch += parseFloat(document.getElementById('coutPrevisite').value)||0;
        }
        document.getElementById('coutTotalHTDisplay').textContent = fmt(ch);
    }else{
        ch=getCoutFromDetail(sc, ad);
    }
    
    // Pass-through costs (mandat, mairie, prévisite) are revenue items
    // They're displayed in costs but excluded from margin calculation
    const chForMarge = ch - getPassThrough();
    
    let ce;
    let ceForMarge, taForMarge;
    
    // Always use detailed CEE calculation (with Coup de pouce)
    ce = lastCEEDetailPrime;
    ceForMarge = ce;
    taForMarge = ad + ceForMarge;
    
    if(mode){
        // Sync prixCumac with ménage CEE category
        const menageVal = document.getElementById('menageCEE').value;
        const pxAuto = (menageVal === 'tm') ? 12.5 : 7.5;
        document.getElementById('prixCumac').value = pxAuto;
        document.getElementById('kwhCumac').value=Math.round(lastCEEDetailKwhc).toLocaleString('fr-FR');
    }
    
    const ceDisplay = ce;
    const ceeSourceText = getCEEFiches(sc).map(f => 'BAR-TH-' + f).join(' + ') + ' détaillé';
    
    const ta=ad+ceDisplay;
    const rb=tt-ta;
    
    // En vue client, si aides > TTC, ajuster l'affichage pour cohérence (TTC = aides + 1)
    const displayTTC = (!mode && rb < 0) ? (ta + 1) : tt;
    
    document.getElementById('totalTTC').textContent=fmt(displayTTC);
    document.getElementById('aidesMPR').textContent=fmt(ad);
    document.getElementById('aidesCEE').textContent=fmt(ceDisplay);
    document.getElementById('totalAides').textContent=fmt(ta);
    document.getElementById('ceeSourceLabel').textContent=ceeSourceText;
    
    if(mode) document.getElementById('displayCoutHT').textContent=fmt(ch);
    
    const st=document.getElementById('scenario').options[document.getElementById('scenario').selectedIndex].text;
    const ct2=document.getElementById('categorie').options[document.getElementById('categorie').selectedIndex].text;
    const zn2=document.getElementById('zone').options[document.getElementById('zone').selectedIndex].text;
    const et2=document.getElementById('etas').options[document.getElementById('etas').selectedIndex].text;
    const sf2=getSurfaceLabel();
    const colorClass=ct==='BLEU'?'color-bleu':(ct==='JAUNE'?'color-jaune':(ct==='VIOLET'?'color-violet':'color-rose'));
    const borderColor=ct==='BLEU'?'#0071e3':(ct==='JAUNE'?'#fbbf24':(ct==='VIOLET'?'#8b5cf6':'#ec4899'));
    
    let summaryHTML;
    if (sc === 'SSC') {
        summaryHTML = `<strong class="${colorClass}">${st}</strong><span class="separator">•</span>${ct2}<span class="separator">•</span>Zone ${zn2}`;
    } else {
        summaryHTML = `<strong class="${colorClass}">${st}</strong><span class="separator">•</span>${ct2}<span class="separator">•</span>Zone ${zn2}<span class="separator">•</span>${sf2}<span class="separator">•</span>${et2}`;
    }
    document.getElementById('scenarioSummary').innerHTML = summaryHTML;
    document.getElementById('scenarioSummary').style.borderLeftColor=borderColor;
    
    calcRAC(rb,chForMarge,ta,taForMarge,tt);
    syncGesteCoFromAdmin();
    if(typeof dbg==='function') dbg('calc: sc='+sc+' ct='+ct+' ad='+ad+' ce='+ce+' ch='+ch+' chFM='+chForMarge+' tt='+tt+' rb='+rb+' taFM='+taForMarge);
    
    _calcRunning = false;
    const errDiv = document.getElementById('calcErrorDebug');
    if (errDiv) { errDiv.textContent = ''; errDiv.style.display = 'none'; }
  } catch(e) {
    _calcRunning = false;
    console.error('calc() error:', e);
    if(typeof dbg==='function') dbg('❌ calc: '+e.message+' at '+(e.stack||'').split('\n')[1]);
    const errDiv = document.getElementById('calcErrorDebug');
    if (errDiv) { errDiv.textContent = '⚠ calc(): ' + e.message; errDiv.style.display = 'block'; errDiv.style.color = '#dc2626'; errDiv.style.background = '#fef2f2'; }
  }
}

function calcRAC(rb,ch,ta,taForMarge,tt){
    const po=parseFloat(document.getElementById('racPourcent').value)||0;
    const mo=parseFloat(document.getElementById('racOffert').value)||0;
    const rc=rb-mo;
    // RAC négatif → afficher 1€ en vue client, vrai montant en vue fournisseur
    document.getElementById('resteCharge').textContent = (rc < 0 && !mode) ? '1 €' : fmt(rc);
    
    const rbForMarge = tt - taForMarge;
    const rcForMarge = rbForMarge - mo;
    const vhForMarge = Math.max(0,rcForMarge)/1.055;
    const mgForMarge = vhForMarge - ch + taForMarge;
    
    if(mode){
        document.getElementById('margeFinal').textContent=fmt(mgForMarge);
    }
    
    const currentScenario = document.getElementById('scenario').value;
    const seuilOK = (currentScenario === 'PAC + SSC' || currentScenario === 'SSC') ? 6000 : 4000;
    
    // Calculate max % offerable (fournisseur)
    if(mode){
        const maxPctEl = document.getElementById('maxPctValue');
        const maxPctBox = document.getElementById('maxPctInfo');
        if(maxPctEl){
            if(rb <= 0){
                // Aides cover entire TTC - no RAC to discount
                if(mgForMarge >= seuilOK){
                    maxPctEl.textContent = 'Aides > TTC \u2014 pas de RAC \u00e0 r\u00e9duire';
                    maxPctBox.style.background = 'rgba(5,150,105,0.12)';
                    maxPctBox.style.borderColor = 'rgba(5,150,105,0.25)';
                    maxPctBox.style.color = '#34d399';
                } else {
                    maxPctEl.textContent = '0% \u2014 marge insuffisante';
                    maxPctBox.style.background = 'rgba(220,38,38,0.12)';
                    maxPctBox.style.borderColor = 'rgba(220,38,38,0.25)';
                    maxPctBox.style.color = '#f87171';
                }
            } else {
                // Normal case: solve for max offert
                const maxOffert = rbForMarge - (seuilOK + ch - taForMarge) * 1.055;
                const maxPct = Math.min(100, Math.max(0, Math.floor((maxOffert / rb) * 100)));
                const maxOffertDisplay = maxPct === 100 ? rb : Math.floor(maxOffert);
                if(typeof dbg==='function') dbg('maxOff: maxOff='+Math.round(maxOffert)+' pct='+maxPct);
                if(maxOffert > 0){
                    maxPctEl.textContent = maxPct + '% (' + fmt(maxOffertDisplay) + ')';
                    maxPctBox.style.background = 'rgba(5,150,105,0.12)';
                    maxPctBox.style.borderColor = 'rgba(5,150,105,0.25)';
                    maxPctBox.style.color = '#34d399';
                } else {
                    maxPctEl.textContent = '0% \u2014 marge insuffisante';
                    maxPctBox.style.background = 'rgba(220,38,38,0.12)';
                    maxPctBox.style.borderColor = 'rgba(220,38,38,0.25)';
                    maxPctBox.style.color = '#f87171';
                }
            }
        }
    }
    
    const bd=document.getElementById('statusBadge');
    const icon=document.getElementById('statusIcon');
    const txt=document.getElementById('statusText');
    if(typeof dbg==='function') dbg('RAC: mg='+Math.round(mgForMarge)+' seuil='+seuilOK+' rbFM='+Math.round(rbForMarge)+' ch='+Math.round(ch));
    if(mgForMarge>=seuilOK){
        bd.className='status-badge ok';
        icon.textContent='✅';
        txt.textContent='Voulez-vous un devis ?';
        document.getElementById('actionButtons').style.display='';
        document.getElementById('gesteCoSection').style.display='';
    }else{
        bd.className='status-badge danger';
        icon.textContent='⚠️';
        txt.textContent='Aides insuffisantes — ajustez les paramètres';
        document.getElementById('actionButtons').style.display='none';
        document.getElementById('gesteCoSection').style.display='none';
    }
}

function shareDevis(){
    const nom=document.getElementById('nom').value.trim()||'Client';
    const prenom=document.getElementById('prenom').value.trim()||'';
    const scenario=document.getElementById('scenario').options[document.getElementById('scenario').selectedIndex].text;
    const ttc=document.getElementById('totalTTC').textContent;
    const totalAides=document.getElementById('totalAides').textContent;
    const rac=document.getElementById('resteCharge').textContent;
    
    const text = `🏠 Estimation PAC — ${prenom} ${nom}\n\n📋 ${scenario}\n💰 Installation TTC : ${ttc}\n🎁 Total aides : ${totalAides}\n🏠 Reste à charge : ${rac}\n\nSimulation réalisée par Les Artisans Verts`;
    
    if(navigator.share){
        navigator.share({
            title: 'Devis PAC — ' + (prenom + ' ' + nom).trim(),
            text: text
        }).catch(()=>{});
    }else{
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(text).then(()=>{
            const bd=document.getElementById('statusBadge');
            const oldTxt=document.getElementById('statusText').textContent;
            document.getElementById('statusText').textContent='✓ Copié !';
            setTimeout(()=>{ document.getElementById('statusText').textContent=oldTxt; }, 2000);
        }).catch(()=>{
            window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(text),'_blank');
        });
    }
}

function updatePct(){
    const sc=document.getElementById('scenario').value;
    const ct=document.getElementById('categorie').value;
    const zn=document.getElementById('zone').value;
    const et=document.getElementById('etas').value;
    const sf=surfaceToCategory(document.getElementById('surface').value);
    const cs=M[sc];
    
    let tt;
    if(mode){
        const lockTTC=document.getElementById('lockTTC').checked;
        tt = lockTTC ? (D.TTC[sc] || 0) : (parseFloat(document.getElementById('totalTTCInput').value)||0);
    }else{
        tt=D.TTC[sc]||0;
    }
    
    const ad=(D.MPR[sc]&&D.MPR[sc][ct])?D.MPR[sc][ct]:0;
    
    let ch;
    if(mode){
        const lockCoutHT=document.getElementById('lockCoutHT').checked;
        if(lockCoutHT){
            if(D.COUT_DETAIL[sc]){
                const detail=D.COUT_DETAIL[sc];
                ch = detail.pac_materiel + detail.pac_pose + detail.ballon_materiel + detail.ballon_pose + detail.accessoires + detail.admin + (ad > 0 ? Math.round(ad * 0.12) : 0) + (detail.mairie || 0) + (document.getElementById("checkPrevisite").checked ? (parseFloat(document.getElementById("coutPrevisite").value) || 200) : 0);
            }else{ ch = D.COUT[sc] || 0; }
        }else{
            const totalPACMateriel = (parseFloat(document.getElementById('coutPACMateriel').value) || 0) * (parseFloat(document.getElementById('qtePACMateriel').value) || 0);
            const totalPACPose = (parseFloat(document.getElementById('coutPACPose').value) || 0) * (parseFloat(document.getElementById('qtePACPose').value) || 0);
            const totalBallonMateriel = (parseFloat(document.getElementById('coutBallonMateriel').value) || 0) * (parseFloat(document.getElementById('qteBallonMateriel').value) || 0);
            const totalBallonPose = (parseFloat(document.getElementById('coutBallonPose').value) || 0) * (parseFloat(document.getElementById('qteBallonPose').value) || 0);
            const totalAccessoires = (parseFloat(document.getElementById('coutAccessoires').value) || 0) * (parseFloat(document.getElementById('qteAccessoires').value) || 0);
            const totalAdmin = (parseFloat(document.getElementById('coutAdmin').value) || 0) * (parseFloat(document.getElementById('qteAdmin').value) || 0);
            ch = totalPACMateriel + totalPACPose + totalBallonMateriel + totalBallonPose + totalAccessoires + totalAdmin;
            ch += (parseFloat(document.getElementById('coutMandat').value)||0) * (parseFloat(document.getElementById('qteMandat').value)||0);
            ch += (parseFloat(document.getElementById('coutMairie').value)||0) * (parseFloat(document.getElementById('qteMairie').value)||0);
            if(document.getElementById('checkPrevisite').checked) ch += parseFloat(document.getElementById('coutPrevisite').value)||0;
        }
    }else{ ch=getCoutFromDetail(sc, ad); }
    
    let ce = lastCEEDetailPrime;
    let ceForMarge = ce;
    let taForMarge = ad + ceForMarge;
    
    const chForMarge = ch - getPassThrough();
    const ta=ad+ce;
    const rb=tt-ta;
    
    let po=parseFloat(document.getElementById('racPourcent').value)||0;
    if(po>100)po=100; if(po<0)po=0;
    document.getElementById('racPourcent').value=Math.round(po);
    const mo=Math.round(rb*(po/100));
    document.getElementById('racOffert').value=mo;
    
    calcRAC(rb,chForMarge,ta,taForMarge,tt);
    syncGesteCoFromAdmin();
}

function updateAmt(){
    const sc=document.getElementById('scenario').value;
    const ct=document.getElementById('categorie').value;
    const zn=document.getElementById('zone').value;
    const et=document.getElementById('etas').value;
    const sf=surfaceToCategory(document.getElementById('surface').value);
    const cs=M[sc];
    
    let tt;
    if(mode){
        const lockTTC=document.getElementById('lockTTC').checked;
        tt = lockTTC ? (D.TTC[sc] || 0) : (parseFloat(document.getElementById('totalTTCInput').value)||0);
    }else{ tt=D.TTC[sc]||0; }
    
    const ad=(D.MPR[sc]&&D.MPR[sc][ct])?D.MPR[sc][ct]:0;
    
    let ch;
    if(mode){
        const lockCoutHT=document.getElementById('lockCoutHT').checked;
        if(lockCoutHT){
            if(D.COUT_DETAIL[sc]){
                const detail=D.COUT_DETAIL[sc];
                ch = detail.pac_materiel + detail.pac_pose + detail.ballon_materiel + detail.ballon_pose + detail.accessoires + detail.admin;
            }else{ ch = D.COUT[sc] || 0; }
        }else{
            const totalPACMateriel = (parseFloat(document.getElementById('coutPACMateriel').value) || 0) * (parseFloat(document.getElementById('qtePACMateriel').value) || 0);
            const totalPACPose = (parseFloat(document.getElementById('coutPACPose').value) || 0) * (parseFloat(document.getElementById('qtePACPose').value) || 0);
            const totalBallonMateriel = (parseFloat(document.getElementById('coutBallonMateriel').value) || 0) * (parseFloat(document.getElementById('qteBallonMateriel').value) || 0);
            const totalBallonPose = (parseFloat(document.getElementById('coutBallonPose').value) || 0) * (parseFloat(document.getElementById('qteBallonPose').value) || 0);
            const totalAccessoires = (parseFloat(document.getElementById('coutAccessoires').value) || 0) * (parseFloat(document.getElementById('qteAccessoires').value) || 0);
            const totalAdmin = (parseFloat(document.getElementById('coutAdmin').value) || 0) * (parseFloat(document.getElementById('qteAdmin').value) || 0);
            ch = totalPACMateriel + totalPACPose + totalBallonMateriel + totalBallonPose + totalAccessoires + totalAdmin;
            ch += (parseFloat(document.getElementById('coutMandat').value)||0) * (parseFloat(document.getElementById('qteMandat').value)||0);
            ch += (parseFloat(document.getElementById('coutMairie').value)||0) * (parseFloat(document.getElementById('qteMairie').value)||0);
            if(document.getElementById('checkPrevisite').checked) ch += parseFloat(document.getElementById('coutPrevisite').value)||0;
        }
    }else{ ch=getCoutFromDetail(sc, ad); }
    
    let ce = lastCEEDetailPrime;
    let ceForMarge = ce;
    let taForMarge = ad + ceForMarge;
    
    const chForMarge = ch - getPassThrough();
    const ta=ad+ce;
    const rb=tt-ta;
    
    let mo=parseFloat(document.getElementById('racOffert').value)||0;
    if(mo>rb)mo=rb; if(mo<0)mo=0;
    document.getElementById('racOffert').value=Math.round(mo);
    let po=rb>0?Math.round((mo/rb)*100):0;
    if(po>100)po=100; if(po<0)po=0;
    document.getElementById('racPourcent').value=po;
    
    calcRAC(rb,chForMarge,ta,taForMarge,tt);
    syncGesteCoFromAdmin();
}

function reset(){
    logAction('Réinitialisation', '');
    document.getElementById('scenario').value='PAC';
    document.getElementById('categorie').value='BLEU';
    document.getElementById('zone').value='H1';
    document.getElementById('etas').value='140-170';
    document.getElementById('surface').value='S>=90';
    document.getElementById('typeLogement').value='maison';
    document.getElementById('rfr').value='';
    document.getElementById('nbPersonnes').value='4';
    document.getElementById('mprResultBloc').style.display='none';
    updateSurfaceOptions();
    document.getElementById('racPourcent').value=0;
    document.getElementById('racOffert').value=0;
    if(mode){
        document.getElementById('prixCumac').value=12.5;
    }
    calc();
}

function checkExport(){
    const nom=document.getElementById('nom').value.trim();
    const prenom=document.getElementById('prenom').value.trim();
    const btn=document.getElementById('exportBtn');
    const wBtn=document.getElementById('whatsappBtn');
    const hint=document.getElementById('exportHint');
    if(nom&&prenom){
        btn.disabled=false; btn.style.cursor='pointer'; btn.style.opacity='1';
        wBtn.disabled=false; wBtn.style.cursor='pointer'; wBtn.style.opacity='1';
        if(hint) hint.style.display='none';
    }else{
        btn.disabled=true; btn.style.cursor='not-allowed'; btn.style.opacity='0.5';
        wBtn.disabled=true; wBtn.style.cursor='not-allowed'; wBtn.style.opacity='0.5';
        if(hint) hint.style.display='block';
    }
}

function sendWhatsApp(){
    if(typeof logExport==='function') logExport('WhatsApp');
    const nom=document.getElementById('nom').value.trim() || 'Client';
    const prenom=document.getElementById('prenom').value.trim() || '';
    const scenario=document.getElementById('scenario').options[document.getElementById('scenario').selectedIndex].text;
    const categorie=document.getElementById('categorie').options[document.getElementById('categorie').selectedIndex].text;
    const zone=document.getElementById('zone').options[document.getElementById('zone').selectedIndex].text;
    const etas=document.getElementById('etas').options[document.getElementById('etas').selectedIndex].text;
    const surface=getSurfaceLabel();
    const ttc=document.getElementById('totalTTC').textContent;
    const aidesMPR=document.getElementById('aidesMPR').textContent;
    const aidesCEE=document.getElementById('aidesCEE').textContent;
    const totalAides=document.getElementById('totalAides').textContent;
    const racBrut=document.getElementById('resteCharge').textContent;
    const racPct=parseInt(document.getElementById('racPourcent').value)||0;
    const racOffert=parseInt(document.getElementById('racOffert').value)||0;

    let racLines = `• Reste à charge brut : ${racBrut}`;
    if(racPct > 0 || racOffert > 0){
        racLines += `\n• Prise en charge : ${racPct}% soit ${racOffert.toLocaleString('fr-FR')} €`;
        const racFinal = Math.max(0, parseInt(document.getElementById('resteCharge').textContent.replace(/[^\d]/g,'')) - racOffert);
        racLines += `\n• *Reste à charge final : ${racFinal.toLocaleString('fr-FR')} €*`;
    }

    const text = `🏠 *Demande de devis - Les Artisans Verts*\n\n👤 *Client :* ${prenom} ${nom}\n\n📋 *Configuration :*\n• Scénario : ${scenario}\n• ${categorie}\n• ${zone}\n• ${surface}\n• ${etas}\n\n💰 *Montants :*\n• Total TTC : ${ttc}\n• Aides MPR : ${aidesMPR}\n• Aides CEE : ${aidesCEE}\n• Total aides : ${totalAides}\n${racLines}\n\nJe souhaite obtenir un devis détaillé.`;
    window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(text), '_blank');
}

function sendMail(){
    if(typeof logExport==='function') logExport('MAIL');
    const nom = document.getElementById('nom').value.trim() || 'Client';
    const prenom = document.getElementById('prenom').value.trim() || '';
    const fullName = (prenom + ' ' + nom).trim();
    const scenario = document.getElementById('scenario').options[document.getElementById('scenario').selectedIndex].text;

    const subject = `Votre projet ${scenario} - Documents à transmettre - Les Artisans Verts`;

    const body = `Bonjour ${fullName},\n\nSuite à notre échange téléphonique, votre projet d'installation de ${scenario} peut être éligible aux aides MaPrimeRénov'.\n\n👉 Afin de réserver votre éligibilité et lancer la constitution de votre dossier, il nous manque simplement quelques documents.\nMerci de nous les transmettre par retour de mail (photos ou scans suffisent) :\n\n• Dernier avis d'imposition de toutes les personnes figurant sur la taxe foncière\n• Dernière taxe foncière (ou acte notarié si achat de moins d'un an)\n• Pièces d'identité recto-verso des titulaires\n\n⏱️ Dès réception, nous analysons votre dossier en priorité et vous confirmons votre niveau d'aides.\n\nPlus tôt nous recevons les documents, plus vite nous pouvons sécuriser votre montant d'aides et planifier la suite de votre projet.\n\nSi vous le souhaitez, je peux également vous guider par téléphone pour l'envoi.\n\nJe reste à votre entière disposition.\n\nBien cordialement,`;

    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    showLocalNotif('✉️ Mail envoyé', 'Demande de pièces envoyée à ' + fullName);
}

function exportPDF(mode){
    if(typeof logExport==='function') logExport('PDF_' + (mode||'admin').toUpperCase());
    const isClient = (mode === 'client');

    // Toggle print mode class
    document.body.classList.remove('print-client');
    if(isClient) document.body.classList.add('print-client');

    const nom=document.getElementById('nom').value.trim() || 'Client';
    const prenom=document.getElementById('prenom').value.trim() || '';
    const fullName = (prenom + ' ' + nom).trim();

    // En-tête
    document.getElementById('printTitle').textContent = isClient
        ? 'Estimation des aides — ' + fullName
        : 'Dossier — ' + fullName;
    document.getElementById('printDate').textContent = new Date().toLocaleDateString('fr-FR', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    document.getElementById('printCommercial').textContent = currentUser ? ('Commercial : ' + currentUser.name) : '';

    // Client info
    document.getElementById('printNom').textContent = fullName;
    document.getElementById('printDept').textContent = document.getElementById('departement').value || '—';
    var phaseVal = document.getElementById('phase').value;
    document.getElementById('printPhase').textContent = phaseVal === 'mono' ? 'Monophasé' : phaseVal === 'tri' ? 'Triphasé' : '—';
    const zoneEl = document.getElementById('zone');
    document.getElementById('printZone').textContent = zoneEl ? zoneEl.value : '—';
    const foyerEl = document.getElementById('foyer');
    document.getElementById('printFoyer').textContent = foyerEl ? foyerEl.options[foyerEl.selectedIndex].text : '—';
    const rfr = document.getElementById('rfr').value;
    document.getElementById('printRFR').textContent = rfr ? parseInt(rfr).toLocaleString('fr-FR') + ' €' : '—';

    // Profil MPR
    const profilLabel = document.getElementById('mprProfilLabel');
    const profilDesc = document.getElementById('mprProfilDesc');
    const profilCard = document.getElementById('printProfilCard');
    const cat = document.getElementById('categorie').value;
    const profilColors = { BLEU:'#2563eb', JAUNE:'#d97706', VIOLET:'#7c3aed', ROSE:'#db2777' };
    const profilIcons = { BLEU:'🔵', JAUNE:'🟡', VIOLET:'🟣', ROSE:'🔴' };
    profilCard.style.background = profilColors[cat] || '#64748b';
    document.getElementById('printProfilIcon').textContent = profilIcons[cat] || '⚪';
    document.getElementById('printProfilLabel').textContent = profilLabel ? profilLabel.textContent : cat;
    document.getElementById('printProfilDesc').textContent = profilDesc ? profilDesc.textContent : '';
    const seuilEl = document.getElementById('mprInfoSeuil');
    document.getElementById('printProfilSeuil').textContent = seuilEl ? ('Seuil : ' + seuilEl.textContent) : '';

    // Configuration technique
    const sc = document.getElementById('scenario');
    const scText = sc.options[sc.selectedIndex].text;
    document.getElementById('printScenario').textContent = scText;
    const ceeSurf = document.getElementById('ceeSurface');
    const surfText = (ceeSurf ? ceeSurf.value : '95') + ' m²';
    document.getElementById('printSurface').textContent = surfText;
    const etas = document.getElementById('etas');
    document.getElementById('printETAS').textContent = etas ? etas.options[etas.selectedIndex].text : '—';
    const baremeReco = document.getElementById('baremeReco');
    document.getElementById('printPACReco').textContent = baremeReco ? baremeReco.textContent : '—';
    const isoState = document.getElementById('isoStateName');
    document.getElementById('printIsolation').textContent = isoState ? isoState.textContent : '—';
    document.getElementById('printAnnee').textContent = document.getElementById('dimAnnee').value || '—';

    // Client-only fields
    document.getElementById('printScenarioClient').textContent = scText;
    document.getElementById('printSurfaceClient').textContent = surfText;

    // Montants
    document.getElementById('printTTC').textContent = document.getElementById('totalTTC').textContent;
    document.getElementById('printMPR').textContent = document.getElementById('aidesMPR').textContent;
    document.getElementById('printCEE').textContent = document.getElementById('aidesCEE').textContent;
    document.getElementById('printTotalAides').textContent = document.getElementById('totalAides').textContent;

    // Détail CEE
    const ceeFiches = document.getElementById('ceeFichesLabel');
    const ceeDetailEl = document.getElementById('ceeOutDetail');
    const ceePrixEl = document.getElementById('ceeOutPrix');
    let ceeDetail = '';
    if(ceeFiches) ceeDetail += 'Fiches : ' + ceeFiches.textContent;
    if(ceeDetailEl && ceeDetailEl.textContent !== '—') ceeDetail += ' · ' + ceeDetailEl.textContent;
    if(ceePrixEl && ceePrixEl.textContent !== '—') ceeDetail += ' · ' + ceePrixEl.textContent;
    document.getElementById('printCEEDetail').textContent = ceeDetail || '—';

    // RAC
    document.getElementById('printRAC').textContent = document.getElementById('resteCharge').textContent;
    const pct = document.getElementById('racPourcent').value;
    const offert = document.getElementById('racOffert').value;
    if(parseInt(pct) > 0 || parseInt(offert) > 0){
        document.getElementById('printRACDetail').textContent = 'Prise en charge fournisseur : ' + pct + '% soit ' + offert + ' €';
    } else {
        document.getElementById('printRACDetail').textContent = '';
    }

    // Statut
    const badge = document.getElementById('statusBadge');
    const printStatus = document.getElementById('printStatus');
    printStatus.textContent = document.getElementById('statusText').textContent;
    if(badge.classList.contains('ok')){
        printStatus.style.background = '#dcfce7';
        printStatus.style.color = '#166534';
        printStatus.style.border = '2px solid #86efac';
    } else {
        printStatus.style.background = '#fef2f2';
        printStatus.style.color = '#991b1b';
        printStatus.style.border = '2px solid #fca5a5';
    }

    window.print();

    // Cleanup
    document.body.classList.remove('print-client');
}

// CHANGEMENT DE MOT DE PASSE
// ============================================
function openPwdModal(){
    document.getElementById('pwdOld').value = '';
    document.getElementById('pwdNew').value = '';
    document.getElementById('pwdConfirm').value = '';
    document.getElementById('pwdError').style.display = 'none';
    document.getElementById('pwdSuccess').style.display = 'none';
    document.getElementById('pwdModal').classList.add('active');
}
function doChangePassword(){
    const oldP = document.getElementById('pwdOld').value;
    const newP = document.getElementById('pwdNew').value;
    const conf = document.getElementById('pwdConfirm').value;
    const errEl = document.getElementById('pwdError');
    const okEl = document.getElementById('pwdSuccess');
    errEl.style.display = 'none';
    okEl.style.display = 'none';

    if(!oldP || !newP){ errEl.textContent='Tous les champs sont requis'; errEl.style.display='block'; return; }
    if(newP.length < 4){ errEl.textContent='Minimum 4 caractères'; errEl.style.display='block'; return; }
    if(newP !== conf){ errEl.textContent='Les mots de passe ne correspondent pas'; errEl.style.display='block'; return; }

    if(useAPI && API_URL){
        errEl.textContent = 'Modification...'; errEl.style.display='block'; errEl.style.color='#6b7280';
        apiCall({action:'changePassword', user:currentUser.id, oldPass:oldP, newPass:newP}, function(d){
            errEl.style.color = '#dc2626';
            if(d.success){
                errEl.style.display = 'none';
                okEl.textContent = '✅ Mot de passe modifié !';
                okEl.style.display = 'block';
                setTimeout(()=>{ document.getElementById('pwdModal').classList.remove('active'); }, 1500);
            } else {
                errEl.textContent = d.error || 'Erreur';
                errEl.style.display = 'block';
            }
        }, function(err){
            errEl.textContent = 'Erreur serveur: ' + err;
            errEl.style.display = 'block';
            errEl.style.color = '#dc2626';
        });
    } else {
        // Mode local: update FALLBACK_USERS
        const account = FALLBACK_USERS[currentUser.id];
        if(!account){ errEl.textContent='Compte introuvable'; errEl.style.display='block'; return; }
        if(account.pass !== oldP){ errEl.textContent='Ancien mot de passe incorrect'; errEl.style.display='block'; return; }
        account.pass = newP;
        okEl.textContent = '✅ Modifié (session uniquement en mode local)';
        okEl.style.display = 'block';
        logAction('Changement mot de passe', currentUser.name);
        setTimeout(()=>{ document.getElementById('pwdModal').classList.remove('active'); }, 1500);
    }
}

// ============================================
// JOURNAL DES MODIFICATIONS
// ============================================
function getJournal(){
    try{ return JSON.parse(localStorage.getItem('pac_journal') || '[]'); }catch(e){ return []; }
}
function saveJournal(j){
    try{
        if(j.length > 200) j = j.slice(j.length - 200);
        localStorage.setItem('pac_journal', JSON.stringify(j));
    }catch(e){}
}
function logAction(action, detail){
    const entry = {
        date: new Date().toISOString(),
        user: currentUser ? currentUser.name : '?',
        role: currentUser ? currentUser.role : '?',
        action: action,
        detail: detail || ''
    };
    // Local journal
    const j = getJournal();
    j.push(entry);
    saveJournal(j);
    // API journal (fire and forget)
    if(useAPI && API_URL){
        apiCall({action:'log', user:entry.user, role:entry.role, logAction:action, detail:detail||''}, function(){}, function(){});
    }
    if(typeof dbg==='function') dbg('📝 ' + action + (detail ? ': '+detail : ''));
}
function openHistory(){
    if(useAPI && API_URL){
        // Fetch from server
        const body = document.getElementById('historyBody');
        body.innerHTML = '<div class="hist-empty">Chargement...</div>';
        document.getElementById('historyModal').classList.add('active');
        apiCall({action:'getJournal', limit:'100'}, function(d){
            renderJournal(d.journal || []);
        }, function(err){
            // Fallback to local
            renderJournal(getJournal().reverse().slice(0, 100));
        });
    } else {
        renderJournal(getJournal().reverse().slice(0, 100));
        document.getElementById('historyModal').classList.add('active');
    }
}
function renderJournal(entries){
    const body = document.getElementById('historyBody');
    if(!entries || entries.length === 0){
        body.innerHTML = '<div class="hist-empty">Aucune entrée dans le journal</div>';
        return;
    }
    let html = '';
    entries.forEach(e => {
        const d = new Date(e.date);
        const dateStr = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const roleIcon = e.role === 'admin' ? '👑' : (e.role === 'telepro' ? '📞' : '📊');
        html += '<div class="hist-entry">';
        html += '<div class="hist-meta"><span class="hist-user">' + roleIcon + ' ' + (e.user||'?') + '</span><span class="hist-date">' + dateStr + '</span></div>';
        html += '<div class="hist-action">' + (e.action||'') + '</div>';
        if(e.detail) html += '<div class="hist-detail">' + e.detail + '</div>';
        html += '</div>';
    });
    if(currentUser && currentUser.role === 'admin'){
        html += '<div class="hist-clear"><button onclick="clearJournal()">🗑️ Vider le journal</button></div>';
    }
    body.innerHTML = html;
}
function clearJournal(){
    if(confirm('Vider tout le journal ?')){
        try{ localStorage.setItem('pac_journal','[]'); }catch(e){}
        openHistory();
    }
}

// Log key actions
function logScenarioChange(){
    const sc = document.getElementById('scenario').options[document.getElementById('scenario').selectedIndex].text;
    logAction('Changement scénario', sc);
}
function logClientChange(){
    const nom = document.getElementById('nom').value.trim();
    const prenom = document.getElementById('prenom').value.trim();
    if(nom || prenom) logAction('Client modifié', (prenom + ' ' + nom).trim());
}
function logExport(type){
    const nom = document.getElementById('nom').value.trim() || 'Client';
    const prenom = document.getElementById('prenom').value.trim() || '';
    const sc = document.getElementById('scenario').options[document.getElementById('scenario').selectedIndex].text;
    const cat = document.getElementById('categorie').value;
    const zn = document.getElementById('zone').value;
    const ttc = document.getElementById('totalTTC').textContent;
    const mpr = document.getElementById('aidesMPR').textContent;
    const cee = document.getElementById('aidesCEE').textContent;
    const rac = document.getElementById('resteCharge').textContent;
    const pct = document.getElementById('racPourcent').value;
    const detail = (prenom + ' ' + nom).trim() + ' · ' + sc + ' · ' + cat + ' · ' + zn + ' · TTC:' + ttc + ' MPR:' + mpr + ' CEE:' + cee + ' RAC:' + rac + (parseInt(pct)>0 ? ' ('+pct+'%)' : '');
    logAction('Export ' + type, detail);
}
function logRACChange(){
    const pct = document.getElementById('racPourcent').value;
    const offert = document.getElementById('racOffert').value;
    const rac = document.getElementById('resteCharge').textContent;
    logAction('RAC modifié', pct + '% / ' + offert + ' € → RAC: ' + rac);
    // Sync to client geste co
    syncGesteCoFromAdmin();
}

function syncGesteCo(){
    const pct = parseInt(document.getElementById('gesteCoClient').value) || 0;
    document.getElementById('racPourcent').value = Math.min(100, Math.max(0, pct));
    updatePct();
    updateGesteCoDisplay();
    logRACChange();
}

function syncGesteCoFromAdmin(){
    const pct = parseInt(document.getElementById('racPourcent').value) || 0;
    document.getElementById('gesteCoClient').value = pct;
    updateGesteCoDisplay();
}

function updateGesteCoDisplay(){
    const pct = parseInt(document.getElementById('racPourcent').value) || 0;
    const offert = parseInt(document.getElementById('racOffert').value) || 0;
    const montantEl = document.getElementById('gesteCoMontant');
    const montantInput = document.getElementById('gesteCoMontantInput');
    const finalLine = document.getElementById('racFinalLine');
    if(montantInput) montantInput.value = offert > 0 ? offert : 0;
    if(pct > 0 && offert > 0){
        montantEl.textContent = '−' + offert.toLocaleString('fr-FR') + ' €';
        const racText = document.getElementById('resteCharge').textContent;
        const racVal = parseInt(racText.replace(/[^\d-]/g,'')) || 0;
        const racFinal = Math.max(0, racVal - offert);
        finalLine.style.display = 'block';
        finalLine.innerHTML = 'Après geste : <strong style="color:#fbbf24;">' + racFinal.toLocaleString('fr-FR') + ' €</strong>';
    } else {
        montantEl.textContent = '—';
        finalLine.style.display = 'none';
    }
}

// ============================================
// TRACKING DÉTAILLÉ — TOUTES LES INTERACTIONS
// ============================================
(function(){
    let _lastDept = '', _lastRFR = '', _lastNbPers = '', _lastEtas = '';
    let _lastSurface = '', _lastMenage = '', _lastAnnee = '';
    let _lastTTC = '', _lastLockTTC = true, _lastLockCout = true;

    // Département
    const deptEl = document.getElementById('departement');
    if(deptEl) deptEl.addEventListener('change', function(){
        const v = this.value.trim();
        if(v && v !== _lastDept){ _lastDept = v;
            const zn = document.getElementById('zone') ? document.getElementById('zone').value : '';
            logAction('Département saisi', v + (zn ? ' → Zone ' + zn : ''));
        }
    });

    // RFR
    const rfrEl = document.getElementById('rfr');
    if(rfrEl) rfrEl.addEventListener('change', function(){
        const v = this.value.trim();
        if(v && v !== _lastRFR){ _lastRFR = v;
            const cat = document.getElementById('categorie') ? document.getElementById('categorie').value : '';
            logAction('RFR saisi', parseInt(v).toLocaleString('fr-FR') + ' € → ' + cat);
        }
    });

    // Nb personnes foyer
    const foyerEl = document.getElementById('nbPersonnes');
    if(foyerEl) foyerEl.addEventListener('change', function(){
        const v = this.value;
        if(v !== _lastNbPers){ _lastNbPers = v;
            logAction('Foyer modifié', v + ' personne(s)');
        }
    });

    // ETAS
    const etasEl = document.getElementById('etas');
    if(etasEl) etasEl.addEventListener('change', function(){
        const v = this.options[this.selectedIndex].text;
        if(v !== _lastEtas){ _lastEtas = v;
            logAction('ETAS modifié', v);
        }
    });

    // Surface CEE
    const surfEl = document.getElementById('ceeSurface');
    if(surfEl) surfEl.addEventListener('change', function(){
        const v = this.value;
        if(v !== _lastSurface){ _lastSurface = v;
            logAction('Surface modifiée', v + ' m²');
        }
    });

    // Ménage CEE
    const menageEl = document.getElementById('menageCEE');
    if(menageEl) menageEl.addEventListener('change', function(){
        const v = this.options[this.selectedIndex].text;
        if(v !== _lastMenage){ _lastMenage = v;
            logAction('Ménage CEE modifié', v);
        }
    });

    // Année construction
    const anneeEl = document.getElementById('dimAnnee');
    if(anneeEl) anneeEl.addEventListener('change', function(){
        const v = this.value;
        if(v !== _lastAnnee){ _lastAnnee = v;
            logAction('Année construction', v);
        }
    });

    // Isolation checkboxes
    document.querySelectorAll('.iso-check input[type="checkbox"]').forEach(function(cb){
        cb.addEventListener('change', function(){
            const label = this.closest('.iso-check') ? this.closest('.iso-check').textContent.trim().split('\n')[0].trim() : '?';
            logAction('Isolation modifiée', label + ' → ' + (this.checked ? 'Oui' : 'Non'));
        });
    });

    // TTC modifié manuellement
    const ttcEl = document.getElementById('totalTTCInput');
    if(ttcEl) ttcEl.addEventListener('change', function(){
        const v = this.value;
        if(v !== _lastTTC){ _lastTTC = v;
            logAction('TTC modifié', parseInt(v).toLocaleString('fr-FR') + ' €');
        }
    });

    // Lock TTC
    const lockTTCEl = document.getElementById('lockTTC');
    if(lockTTCEl) lockTTCEl.addEventListener('change', function(){
        logAction('Verrouillage TTC', this.checked ? 'Activé' : 'Désactivé');
    });

    // Lock Coût HT
    const lockCoutEl = document.getElementById('lockCoutHT');
    if(lockCoutEl) lockCoutEl.addEventListener('change', function(){
        logAction('Verrouillage Coûts HT', this.checked ? 'Activé' : 'Désactivé');
    });

    // Coûts détaillés (matériel, pose, etc.)
    ['coutPACMateriel','coutPACPose','coutBallonMateriel','coutBallonPose','coutAccessoires','coutAdmin','coutMandat','coutMairie'].forEach(function(id){
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', function(){
            const label = id.replace('cout','').replace(/([A-Z])/g,' $1').trim();
            logAction('Coût modifié', label + ' : ' + parseInt(this.value).toLocaleString('fr-FR') + ' €');
        });
    });

    // Quantités
    ['qtePACMateriel','qtePACPose','qteBallonMateriel','qteBallonPose','qteAccessoires','qteAdmin','qteMandat','qteMairie'].forEach(function(id){
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', function(){
            const label = id.replace('qte','').replace(/([A-Z])/g,' $1').trim();
            logAction('Quantité modifiée', label + ' : ×' + this.value);
        });
    });

    // Dimensionnement
    const dimSurfEl = document.getElementById('dimSurface');
    if(dimSurfEl) dimSurfEl.addEventListener('change', function(){
        logAction('Dim. surface modifiée', this.value + ' m²');
    });
    const dimHautEl = document.getElementById('dimHauteur');
    if(dimHautEl) dimHautEl.addEventListener('change', function(){
        logAction('Dim. hauteur modifiée', this.value + ' m');
    });

    // Prévisite
    const prevEl = document.getElementById('checkPrevisite');
    if(prevEl) prevEl.addEventListener('change', function(){
        logAction('Prévisite', this.checked ? 'Activée' : 'Désactivée');
    });

})();


// ============================================
// SCROLL GRADIENT
// ============================================
(function() {
    const gradients = [
        'linear-gradient(90deg, #34d399, #22d3ee, #818cf8)',
        'linear-gradient(90deg, #22d3ee, #818cf8, #c084fc)',
        'linear-gradient(90deg, #818cf8, #c084fc, #f472b6)',
        'linear-gradient(90deg, #c084fc, #f472b6, #fb923c)',
        'linear-gradient(90deg, #f472b6, #fb923c, #fbbf24)',
        'linear-gradient(90deg, #fb923c, #fbbf24, #34d399)',
    ];
    let ticking = false;
    function updateScrollGradient() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
        const idx = Math.min(Math.floor(scrollPercent * gradients.length), gradients.length - 1);
        document.documentElement.style.setProperty('--scroll-gradient', gradients[idx]);
        ticking = false;
    }
    window.addEventListener('scroll', function() {
        if (!ticking) { requestAnimationFrame(updateScrollGradient); ticking = true; }
    }, { passive: true });
    updateScrollGradient();
})();

// ============================================
// DIMENSIONNEMENT PAC
// ============================================

// Tbase par département (°C) - valeurs conventionnelles

// ============ DIMENSIONNEMENT — Année → G auto ============

// Table G par année de construction
function getGFromAnnee(annee) {
    if (annee >= 2021) return 0.6;   // RE 2020
    if (annee >= 2013) return 0.7;   // RT 2012
    if (annee >= 2006) return 0.75;  // RT 2005
    if (annee >= 2001) return 0.8;
    if (annee >= 1990) return 0.95;  // RT 2000
    if (annee >= 1983) return 1.1;
    if (annee >= 1975) return 1.3;   // 1ère réglementation
    return 1.6;                       // Avant 1975
}

var currentIsolation = 'origine';

function evalIsolation() {
    const checks = document.querySelectorAll('#isoChecklist input[type="checkbox"]:checked');
    const count = checks.length;
    let recentCount = 0;
    checks.forEach(cb => {
        const quand = cb.closest('.iso-check').querySelector('.iso-quand');
        if (quand && quand.value === 'recent') recentCount++;
    });

    // Détermination auto de l'état
    if (count === 0) {
        currentIsolation = 'origine';
    } else if (count >= 3 && recentCount >= 2) {
        currentIsolation = 'totale';
    } else {
        currentIsolation = 'partielle';
    }

    // Affichage
    const names = { origine: 'État d\'origine / Non précisé', partielle: 'Rénovation partielle', totale: 'Rénovation totale' };
    const colors = { origine: '#64748b', partielle: '#d97706', totale: '#16a34a' };
    const el = document.getElementById('isoStateName');
    if (el) { el.textContent = names[currentIsolation]; el.style.color = colors[currentIsolation]; }
    calcDim();
}

function selectIsolation(state) { currentIsolation = state; calcDim(); }

function getEffectiveG() {
    const annee = parseInt(document.getElementById('dimAnnee').value) || 2000;
    let g = getGFromAnnee(annee);
    if (currentIsolation === 'partielle') g = Math.max(g - 0.2, 0.5);
    if (currentIsolation === 'totale') g = Math.max(Math.min(g, 0.7), 0.5);
    return g;
}

// ============ BARÈME PAC ============
// Pattern: every 10m², alternating single/double recommendations
// +2kW per 20m² step
function getBaremePAC(surface) {
    if (surface <= 40) return [4];
    if (surface <= 50) return [6];
    // From 60m²: pattern repeats every 20m²
    // 60-70 = [6,8], 80 = [8], 90 = [8,10], 100 = [10], etc.
    const base = Math.floor((surface - 1) / 20); // 0-indexed group
    const inGroup = ((surface - 1) % 20) < 10 ? 0 : 1; // first or second half
    const kw = (base) * 2 + 4; // 4, 6, 8, 10, ...
    
    // Simpler approach: use explicit formula
    const step = Math.floor((surface - 1) / 10); // 0=≤10, ... 3=31-40, 4=41-50, 5=51-60...
    const kwBase = Math.max(4, Math.floor(surface / 10) * 2);
    
    // Even simpler: keep the proven table + extend
    const table = [
        [40, [4]], [50, [6]], [60, [6,8]], [70, [6,8]], [80, [8]], [90, [8,10]],
        [100, [10]], [110, [10,12]], [120, [12]], [130, [12,14]], [140, [14]],
        [150, [14,16]], [160, [16]], [170, [16,18]], [180, [18]], [190, [18,20]],
        [200, [20]], [210, [20,22]], [220, [22]], [230, [22,24]], [240, [24]],
        [250, [24,26]], [260, [26]], [270, [26,28]], [280, [28]], [290, [28,30]],
        [300, [30]], [350, [30,35]], [Infinity, [35]]
    ];
    for (const [max, reco] of table) {
        if (surface <= max) return reco;
    }
    return [35];
}

function calcBareme() {
    const s = parseInt(document.getElementById('baremeSurface').value) || 100;
    const reco = getBaremePAC(s);
    const el = document.getElementById('baremeReco');
    const alt = document.getElementById('baremeAlt');
    const hint = document.getElementById('baremeIsoHint');
    const cursor = document.getElementById('baremeCursor');
    const lowEl = document.getElementById('baremeLow');
    const highEl = document.getElementById('baremeHigh');

    // Determine low and high power
    let lowKW, highKW;
    if (reco.length === 2) {
        lowKW = reco[0];
        highKW = reco[1];
    } else {
        lowKW = reco[0];
        highKW = reco[0] < 35 ? reco[0] + 2 : reco[0];
    }

    lowEl.textContent = lowKW + ' kW';
    highEl.textContent = highKW + ' kW';

    // Score: 0 = well insulated (left/green), 100 = poorly insulated (right/red)
    const annee = parseInt(document.getElementById('dimAnnee').value) || 2000;
    
    // Count checked isolation items
    const checks = document.querySelectorAll('#isoChecklist input[type="checkbox"]:checked');
    const totalChecks = checks.length; // 0 to 5
    let recentCount = 0;
    checks.forEach(cb => {
        const quand = cb.closest('.iso-check').querySelector('.iso-quand');
        if (quand && quand.value === 'recent') recentCount++;
    });

    // Base score from année
    let score;
    if (annee < 1975) score = 90;
    else if (annee < 1990) score = 75;
    else if (annee < 2005) score = 55;
    else if (annee < 2012) score = 35;
    else score = 20;

    // Each checked item reduces score significantly
    // 5 items checked = max reduction
    const reductionPerItem = 12; // each item: -12
    const recentBonus = 3; // recent items: extra -3
    score -= totalChecks * reductionPerItem;
    score -= recentCount * recentBonus;

    // All 5 checked + all recent → score should be ~0-5
    // 5*12 + 5*3 = 75, from base 90 → 15, from base 55 → -20 → clamped to 5

    // Clamp 3-97%
    score = Math.max(3, Math.min(97, score));

    // Position cursor
    cursor.style.left = `calc(${score}% - 12px)`;

    // Determine recommendation
    if (score <= 25) {
        el.textContent = lowKW + ' kW';
        el.style.color = '#16a34a';
        alt.textContent = 'Isolation performante → puissance optimisée';
        if (hint) hint.textContent = '';
    } else if (score >= 75) {
        el.textContent = highKW + ' kW';
        el.style.color = '#dc2626';
        alt.textContent = 'Isolation faible → puissance supérieure conseillée';
        if (hint) hint.textContent = '';
    } else {
        el.textContent = lowKW + ' ou ' + highKW + ' kW';
        el.style.color = '#d97706';
        alt.textContent = lowKW + ' kW = économique · ' + highKW + ' kW = confort';
        if (hint) hint.textContent = '';
    }
}

function syncMenageCEE() {
    const cat = document.getElementById('categorie').value;
    document.getElementById('menageCEE').value = (cat === 'BLEU') ? 'tm' : 'autres';
    calcCEEDetail();
}

function syncSurfaces(from) {
    const val = (from === 'bareme')
        ? document.getElementById('baremeSurface').value
        : (from === 'cee')
        ? document.getElementById('ceeSurface').value
        : document.getElementById('dimSurface').value;
    const s = parseInt(val) || 100;
    document.getElementById('baremeSurface').value = s;
    document.getElementById('dimSurface').value = s;
    const ceeSurf = document.getElementById('ceeSurface');
    if (ceeSurf) ceeSurf.value = s;

    // Auto-set surface dropdown (maison)
    const tl = document.getElementById('typeLogement').value;
    const sel = document.getElementById('surface');
    if (tl === 'maison') {
        if (s < 70) sel.value = 'S<70';
        else if (s < 90) sel.value = '70<=S<90';
        else sel.value = 'S>=90';
    } else {
        if (s < 35) sel.value = 'S<35';
        else if (s < 60) sel.value = '35<=S<60';
        else sel.value = 'S>=60';
    }

    calcBareme();
    calcDim();
    calcCEEDetail();
    calc();
}

function buildBaremeTable() { /* table removed */ }

function selectG(g) { /* legacy compat */ currentG = g; calcDim(); }

function calcDim() {
    const S = parseFloat(document.getElementById('dimSurface').value) || 0;
    const H = parseFloat(document.getElementById('dimHauteur').value) || 2.5;
    const V = S * H;

    const Tbase = parseFloat(document.getElementById('dimTbase').value) || -7;
    const Tint = parseFloat(document.getElementById('dimTint').value) || 21;
    const deltaT = Tint - Tbase;

    const G = getEffectiveG();
    currentG = G;
    const gDisplay = document.getElementById('dimGDisplay');
    if (gDisplay) gDisplay.textContent = `G = ${G.toFixed(2).replace('.', ',')}`;

    const P = G * V * deltaT;
    const T1 = parseFloat(document.getElementById('dimT1').value) || 60;
    const T2 = parseFloat(document.getElementById('dimT2').value) || 140;

    const puissancePAC = P * T1 / 100;
    const puissanceTotale = P * T2 / 100;
    const puissanceAppoint = puissanceTotale - puissancePAC;

    document.getElementById('dimDeperditions').textContent = Math.round(P).toLocaleString('fr-FR') + ' W';
    document.getElementById('dimDepFormula').textContent = `${G.toFixed(2).replace('.', ',')} × ${Math.round(V)} × ${deltaT}`;

    document.getElementById('dimPuissancePAC').textContent = (puissancePAC / 1000).toFixed(1).replace('.', ',') + ' kW';
    document.getElementById('dimPuissancePACDetail').textContent = `${Math.round(P).toLocaleString('fr-FR')} W × ${T1}%`;

    document.getElementById('dimPuissanceAppoint').textContent = (puissanceAppoint / 1000).toFixed(1).replace('.', ',') + ' kW';
    document.getElementById('dimPuissanceAppointDetail').textContent = `(P × ${T2}% − PAC)`;

    document.getElementById('dimPuissanceTotale').textContent = (puissanceTotale / 1000).toFixed(1).replace('.', ',') + ' kW';
}


// ============================================
// UPLOAD DOCUMENTS
// ============================================
var uploadedFiles = { avis: [], taxe: [], id: [] };

function initUploadZones() {
    ['Avis', 'Taxe', 'ID'].forEach(function(key) {
        var zone = document.getElementById('drop' + key);
        var input = document.getElementById('file' + key);
        if (!zone || !input) return;

        zone.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') input.click();
        });

        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', function() {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            var docType = key.toLowerCase();
            if (e.dataTransfer.files.length) {
                processFiles(e.dataTransfer.files, docType);
            }
        });
    });
}

function handleUpload(input, docType) {
    if (input.files.length) {
        processFiles(input.files, docType);
    }
}

function processFiles(files, docType) {
    var zone = document.getElementById('drop' + docType.charAt(0).toUpperCase() + docType.slice(1));
    var statusEl = document.getElementById('status' + docType.charAt(0).toUpperCase() + docType.slice(1));
    if (docType === 'id') {
        zone = document.getElementById('dropID');
        statusEl = document.getElementById('statusID');
    }

    var names = [];
    for (var i = 0; i < files.length; i++) {
        uploadedFiles[docType].push(files[i]);
        names.push(files[i].name);
    }

    zone.classList.add('uploaded');
    var count = uploadedFiles[docType].length;
    statusEl.innerHTML = '✅ ' + count + ' fichier' + (count > 1 ? 's' : '');
    statusEl.title = names.join(', ');

    if (typeof logAction === 'function') {
        logAction('UPLOAD', docType + ': ' + names.join(', '));
    }
    checkAllUploaded();
}

function checkAllUploaded() {
    var total = uploadedFiles.avis.length + uploadedFiles.taxe.length + uploadedFiles.id.length;
    var allThree = uploadedFiles.avis.length > 0 && uploadedFiles.taxe.length > 0 && uploadedFiles.id.length > 0;
    
    if (total > 0) {
        var prog = document.getElementById('uploadProgress');
        var text = document.getElementById('uploadText');
        if (prog) {
            prog.style.display = 'block';
            var pct = (allThree ? 100 : Math.round((total / 3) * 80));
            document.getElementById('uploadBar').style.width = pct + '%';
            
            if (allThree) {
                text.innerHTML = '✅ Tous les documents sont prêts — <a href="#" onclick="sendAllDocs(); return false;" style="color:#34d399; text-decoration:underline; font-weight:700;">Envoyer</a>';
            } else {
                text.innerHTML = total + ' fichier(s) prêt(s) — <a href="#" onclick="sendAllDocs(); return false;" style="color:#fbbf24; text-decoration:underline;">Envoyer ce qui est prêt</a>';
            }
        }
    }
}

function sendAllDocs() {
    if (!UPLOAD_SCRIPT_URL) {
        alert('⚠️ L\'URL du script d\'upload n\'est pas configurée.\nVoir data.js → UPLOAD_SCRIPT_URL');
        return;
    }
    var nom = (document.getElementById('prenom').value.trim() + '_' + document.getElementById('nom').value.trim()).replace(/\s+/g, '_') || 'Client';
    var dept = document.getElementById('departement').value.trim() || '00';
    var folder = nom + '_' + dept;

    var text = document.getElementById('uploadText');
    var bar = document.getElementById('uploadBar');
    text.innerHTML = '⏳ Préparation des fichiers...';
    bar.style.width = '10%';

    // Convertir tous les fichiers en base64
    var allFiles = [];
    var types = ['avis', 'taxe', 'id'];
    var pending = 0;

    types.forEach(function(docType) {
        uploadedFiles[docType].forEach(function(file) {
            pending++;
            var reader = new FileReader();
            reader.onload = function(e) {
                var base64 = e.target.result.split(',')[1]; // enlever le préfixe data:...
                allFiles.push({
                    name: file.name,
                    type: docType,
                    mimeType: file.type || 'application/octet-stream',
                    data: base64
                });
                pending--;
                bar.style.width = Math.round((1 - pending / totalFiles) * 40 + 10) + '%';
                if (pending === 0) doSend();
            };
            reader.readAsDataURL(file);
        });
    });

    var totalFiles = pending;
    if (totalFiles === 0) {
        text.innerHTML = '⚠️ Aucun fichier à envoyer';
        return;
    }

    function doSend() {
        text.innerHTML = '⏳ Envoi vers Google Drive — <strong>' + folder + '</strong>...';
        bar.style.width = '50%';

        fetch(UPLOAD_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder: folder,
                files: allFiles
            })
        })
        .then(function() {
            // mode no-cors = opaque response, on assume succès
            bar.style.width = '100%';
            bar.style.background = 'linear-gradient(90deg, #34d399, #34d399)';
            text.innerHTML = '✅ ' + allFiles.length + ' document(s) envoyé(s) dans <strong>' + folder + '/</strong>';
            showLocalNotif('📎 Documents envoyés', allFiles.length + ' fichier(s) uploadé(s) pour ' + folder);
            if (typeof logAction === 'function') {
                logAction('DOCS_SENT', folder + ' (' + allFiles.length + ' fichiers)');
            }
        })
        .catch(function(err) {
            bar.style.width = '100%';
            bar.style.background = 'linear-gradient(90deg, #ef4444, #ef4444)';
            text.innerHTML = '❌ Erreur d\'envoi — réessayez ou envoyez par mail';
            dbg('Upload error: ' + err);
        });
    }
}

// ============================================
// PWA — Service Worker + Push + Install
// ============================================
var swRegistration = null;
var deferredInstallPrompt = null;

function initPWA() {
    if (!('serviceWorker' in navigator)) { dbg('SW not supported'); return; }

    navigator.serviceWorker.register('./sw.js')
    .then(function(reg) {
        swRegistration = reg;
        dbg('✅ Service Worker registered');
        initPush(reg);
    })
    .catch(function(err) { dbg('SW error: ' + err); });

    // Capture install prompt (may fire before login)
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredInstallPrompt = e;
        showInstallBanner(); // try now, will retry after login via showApp()
    });
}

function initPush(reg) {
    if (!('PushManager' in window) || !VAPID_PUBLIC_KEY) return;

    // Check if already subscribed → update bell icon
    reg.pushManager.getSubscription().then(function(sub) {
        if (sub) {
            dbg('Push already subscribed');
            sendSubscriptionToServer(sub);
            updateBellIcon(true);
        }
    });
}

function updateBellIcon(subscribed) {
    var bell = document.getElementById('notifBell');
    if (bell) bell.innerHTML = subscribed ? '🔔' : '🔕';
}

function subscribePush() {
    if (!swRegistration) {
        alert('Service Worker non disponible. Vérifiez que vous êtes en HTTPS.');
        return;
    }
    if (!VAPID_PUBLIC_KEY) {
        alert('Clé VAPID non configurée.');
        return;
    }

    // Check if already subscribed
    swRegistration.pushManager.getSubscription().then(function(existingSub) {
        if (existingSub) {
            // Already subscribed → toggle off (unsubscribe)
            existingSub.unsubscribe().then(function() {
                dbg('🔕 Push unsubscribed');
                updateBellIcon(false);
            });
            return;
        }

        // Not subscribed → request permission and subscribe
        Notification.requestPermission().then(function(permission) {
            if (permission !== 'granted') {
                alert('Notifications refusées. Activez-les dans les paramètres du navigateur.');
                return;
            }

            var applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            })
            .then(function(sub) {
                dbg('✅ Push subscribed');
                sendSubscriptionToServer(sub);
                updateBellIcon(true);
            })
            .catch(function(err) {
                dbg('Push subscribe error: ' + err);
                alert('Erreur d\'activation des notifications : ' + err.message);
            });
        });
    });
}

function sendSubscriptionToServer(subscription) {
    if (!UPLOAD_SCRIPT_URL) return;
    var data = JSON.stringify(subscription);
    fetch(UPLOAD_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe_push', subscription: data })
    }).catch(function(err) { dbg('Push sync error: ' + err); });
}

function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function showInstallBanner() {
    // Only show install banner to admin users
    if (!currentUser || currentUser.role !== 'admin') return;
    // Already running as installed PWA? Skip.
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
    if (!deferredInstallPrompt) return;
    var banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'flex';
}

function installApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function(choice) {
        if (choice.outcome === 'accepted') {
            dbg('✅ App installed');
            var banner = document.getElementById('installBanner');
            if (banner) banner.style.display = 'none';
        }
        deferredInstallPrompt = null;
    });
}

// Notification locale (utilisable depuis le simulateur)
function showLocalNotif(title, body) {
    if (Notification.permission === 'granted' && swRegistration) {
        swRegistration.showNotification(title, {
            body: body,
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [200, 100, 200]
        });
    }
}

// ============================================
// INIT
// ============================================
dbg('🚀 Init start');
checkAutoLogin();
initUploadZones();
initPWA();
dbg('🏁 Init complete');
// Triple-tap to show debug panel
