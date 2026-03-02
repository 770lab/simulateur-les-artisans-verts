// ============================================
// SIMULATEUR PAC 2026 — Backend Apps Script
// ============================================
//
// INSTALLATION :
// 1. Créer un Google Sheet avec 3 onglets :
//    - "Users" : colonnes A=username, B=password, C=name, D=role
//    - "Journal" : colonnes A=date, B=user, C=action, D=detail
//    - "Dossiers" : créé automatiquement au premier appel
//
// 2. Extensions → Apps Script → coller ce code
// 3. Déployer → Nouvelle déploiement → Application Web
//    - Exécuter en tant que : Moi
//    - Accès : Tout le monde
// 4. Copier l'URL et la mettre dans le HTML (variable API_URL)
//
// SUPER ADMIN : seul "ishay" peut créer/supprimer des utilisateurs
// ============================================

const SUPER_ADMIN = 'ishay';

function doGet(e) { return handleRequest(e); }

function doPost(e) {
  // Check if POST has JSON body (dossier save)
  try {
    if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      if (body.action === 'saveDossier') {
        return ContentService
          .createTextOutput(JSON.stringify(saveDossierAPI(body)))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch(err) {
    // Not JSON or parse error, fall through to handleRequest
  }
  return handleRequest(e);
}

function handleRequest(e) {
  const p = e.parameter;
  const action = p.action || '';
  let result;

  try {
    switch(action) {

      case 'login':
        result = doLogin(p.user, p.pass);
        break;

      case 'changePassword':
        result = doChangePassword(p.user, p.oldPass, p.newPass);
        break;

      case 'getJournal':
        result = doGetJournal(p.limit || 100);
        break;

      case 'log':
        result = doLog(p.user, p.logAction, p.detail);
        break;

      case 'listUsers':
        result = doListUsers(p.adminUser);
        break;

      case 'createUser':
        result = doCreateUser(p.adminUser, p.username, p.name, p.pass, p.role);
        break;

      case 'deleteUser':
        result = doDeleteUser(p.adminUser, p.username);
        break;

      case 'getDossiers':
        result = getDossiersAPI();
        break;

      case 'deleteDossier':
        result = deleteDossierAPI(p.id);
        break;

      case 'updateDossierStatus':
        result = updateDossierStatusAPI(p.id, p.status);
        break;

      // ============================================
      // PROXY DOMOFINANCE — API DomoSimu
      // ============================================
      case 'domoProxy':
        var route = p.route || '';
        var qs = p.qs || '';
        var domoUrl = 'https://www.domofinance.com/api-partenaires/' + route + (qs ? '?' + qs : '');
        var domoResp = UrlFetchApp.fetch(domoUrl, {
          method: 'get',
          headers: { 'X-AUTH-TOKEN': '5b661c80-e2dc-49e8-9a1b-3cd618319b39' },
          muteHttpExceptions: true
        });
        return ContentService
          .createTextOutput(domoResp.getContentText())
          .setMimeType(ContentService.MimeType.JSON);

      case 'ping':
        result = { success: true, message: 'PAC 2026 Backend OK' };
        break;

      default:
        result = { success: false, error: 'Action inconnue: ' + action };
    }
  } catch(err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// HELPER: vérifier super admin
// ============================================
function isSuperAdmin(username) {
  return username && username.toString().toLowerCase() === SUPER_ADMIN;
}

// ============================================
// LOGIN
// ============================================
function doLogin(username, password) {
  if (!username) return { success: false, error: 'Identifiant requis' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Onglet Users introuvable' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0].toString().toLowerCase() === username.toLowerCase()) {
      if (row[1].toString() === password) {
        addJournalEntry(row[2] || username, 'Connexion', '');
        return {
          success: true,
          user: {
            name: row[2] || username,
            role: row[3] || 'commercial',
            username: row[0]
          }
        };
      } else {
        return { success: false, error: 'Mot de passe incorrect' };
      }
    }
  }
  return { success: false, error: 'Utilisateur inconnu' };
}

// ============================================
// CHANGEMENT DE MOT DE PASSE
// ============================================
function doChangePassword(username, oldPass, newPass) {
  if (!username || !oldPass || !newPass) {
    return { success: false, error: 'Tous les champs sont requis' };
  }
  if (newPass.length < 4) {
    return { success: false, error: 'Le nouveau mot de passe doit faire au moins 4 caractères' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Onglet Users introuvable' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === username.toLowerCase()) {
      if (data[i][1].toString() !== oldPass) {
        return { success: false, error: 'Ancien mot de passe incorrect' };
      }
      sheet.getRange(i + 1, 2).setValue(newPass);
      addJournalEntry(data[i][2] || username, 'Changement mot de passe', '');
      return { success: true, message: 'Mot de passe modifié' };
    }
  }
  return { success: false, error: 'Utilisateur introuvable' };
}

// ============================================
// LISTER LES UTILISATEURS (super admin)
// ============================================
function doListUsers(adminUser) {
  if (!isSuperAdmin(adminUser)) {
    return { success: false, error: 'Accès refusé' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Onglet Users introuvable' };

  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === '') continue;
    users.push({
      username: data[i][0].toString(),
      name: data[i][2] ? data[i][2].toString() : data[i][0].toString(),
      role: data[i][3] ? data[i][3].toString() : 'commercial'
    });
  }
  return { success: true, users: users };
}

// ============================================
// CRÉER UN UTILISATEUR (super admin)
// ============================================
function doCreateUser(adminUser, username, name, password, role) {
  if (!isSuperAdmin(adminUser)) {
    return { success: false, error: 'Accès refusé' };
  }
  if (!username || !name || !password) {
    return { success: false, error: 'Tous les champs sont requis' };
  }
  if (password.length < 4) {
    return { success: false, error: 'Mot de passe trop court (min 4)' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Onglet Users introuvable' };

  // Vérifier que l'utilisateur n'existe pas déjà
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === username.toLowerCase()) {
      return { success: false, error: 'Cet identifiant existe déjà' };
    }
  }

  // Ajouter la ligne
  const validRoles = ['admin', 'commercial', 'telepro'];
  const finalRole = validRoles.indexOf(role) >= 0 ? role : 'commercial';

  sheet.appendRow([username.toUpperCase(), password, name, finalRole]);
  addJournalEntry(adminUser, 'Création utilisateur', username + ' (' + finalRole + ')');

  return { success: true, message: 'Utilisateur créé' };
}

// ============================================
// SUPPRIMER UN UTILISATEUR (super admin)
// ============================================
function doDeleteUser(adminUser, username) {
  if (!isSuperAdmin(adminUser)) {
    return { success: false, error: 'Accès refusé' };
  }
  if (!username) {
    return { success: false, error: 'Identifiant requis' };
  }
  // Protection : ne pas supprimer le super admin
  if (username.toLowerCase() === SUPER_ADMIN) {
    return { success: false, error: 'Impossible de supprimer le super admin' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Onglet Users introuvable' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === username.toLowerCase()) {
      sheet.deleteRow(i + 1);
      addJournalEntry(adminUser, 'Suppression utilisateur', username);
      return { success: true, message: 'Utilisateur supprimé' };
    }
  }
  return { success: false, error: 'Utilisateur introuvable' };
}

// ============================================
// JOURNAL
// ============================================
function addJournalEntry(user, action, detail) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Journal');
    if (!sheet) {
      sheet = ss.insertSheet('Journal');
      sheet.getRange(1, 1, 1, 4).setValues([['Date', 'Utilisateur', 'Action', 'Détail']]);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    sheet.appendRow([new Date(), user || '?', action || '', detail || '']);
    const lastRow = sheet.getLastRow();
    if (lastRow > 501) sheet.deleteRows(2, lastRow - 501);
  } catch(e) {}
}

function doLog(user, action, detail) {
  addJournalEntry(user, action, detail);
  return { success: true };
}

function doGetJournal(limit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Journal');
  if (!sheet) return { success: true, journal: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, journal: [] };

  const lim = Math.min(parseInt(limit) || 100, 500);
  const startRow = Math.max(2, lastRow - lim + 1);
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();

  const journal = data.map(row => ({
    date: row[0] instanceof Date ? row[0].toISOString() : row[0].toString(),
    user: row[1], action: row[2], detail: row[3]
  })).reverse();

  return { success: true, journal: journal };
}

// ============================================
// DOSSIERS — Sauvegarde permanente
// ============================================
function getSheetDossiers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Dossiers');
  if (!sheet) {
    sheet = ss.insertSheet('Dossiers');
    sheet.appendRow(['id','numDevis','nomClient','type','commercial','commercialId','date','dateISO','fields','status']);
    sheet.getRange(1,1,1,10).setFontWeight('bold');
  }
  // Auto-add status column if missing (existing sheets)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('status') === -1) {
    var col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue('status').setFontWeight('bold');
  }
  return sheet;
}

function saveDossierAPI(body) {
  var sheet = getSheetDossiers();
  var data = sheet.getDataRange().getValues();
  var id = body.id || '';

  var existRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      existRow = i + 1;
      break;
    }
  }

  var row = [
    body.id || '',
    body.numDevis || '',
    body.nomClient || '',
    body.type || '',
    body.commercial || '',
    body.commercialId || '',
    body.date || '',
    body.dateISO || '',
    JSON.stringify(body.fields || {}),
    body.status || 'brouillon'
  ];

  if (existRow > 0) {
    sheet.getRange(existRow, 1, 1, 10).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  addJournalEntry(body.commercial || '?', 'Dossier sauvegardé', (body.type||'') + ' ' + (body.nomClient||''));
  return { success: true, id: body.id };
}

function getDossiersAPI() {
  var sheet = getSheetDossiers();
  var data = sheet.getDataRange().getValues();
  var dossiers = [];
  // Find status column index
  var headers = data[0];
  var statusCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase() === 'status') { statusCol = c; break; }
  }

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var fields = {};
    try { fields = JSON.parse(data[i][8] || '{}'); } catch(ex) {}
    dossiers.push({
      id: data[i][0].toString(),
      numDevis: data[i][1].toString(),
      nomClient: data[i][2].toString(),
      type: data[i][3].toString(),
      commercial: data[i][4].toString(),
      commercialId: data[i][5].toString(),
      date: data[i][6].toString(),
      dateISO: data[i][7] instanceof Date ? data[i][7].toISOString() : data[i][7].toString(),
      fields: fields,
      status: statusCol >= 0 ? (data[i][statusCol] || 'brouillon').toString() : 'brouillon'
    });
  }

  dossiers.sort(function(a,b) {
    return (b.dateISO || '') > (a.dateISO || '') ? 1 : -1;
  });

  return { success: true, dossiers: dossiers };
}

// ============================================
// MISE À JOUR STATUT DOSSIER
// ============================================
function updateDossierStatusAPI(id, status) {
  if (!id) return { success: false, error: 'ID manquant' };
  var validStatuses = ['brouillon', 'envoye', 'signe', 'perdu'];
  if (validStatuses.indexOf(status) === -1) return { success: false, error: 'Statut invalide' };

  var sheet = getSheetDossiers();
  var data = sheet.getDataRange().getValues();

  // Find status column
  var headers = data[0];
  var statusCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().toLowerCase() === 'status') { statusCol = c; break; }
  }
  if (statusCol === -1) return { success: false, error: 'Colonne status introuvable' };

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      sheet.getRange(i + 1, statusCol + 1).setValue(status);
      var nom = data[i][2] || '';
      addJournalEntry('', 'Statut dossier', status + ' — ' + nom);
      return { success: true };
    }
  }
  return { success: false, error: 'Dossier introuvable' };
}

function deleteDossierAPI(id) {
  if (!id) return { success: false, error: 'ID manquant' };

  var sheet = getSheetDossiers();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      var nom = data[i][2] || '';
      sheet.deleteRow(i + 1);
      addJournalEntry('', 'Dossier supprimé', nom);
      return { success: true };
    }
  }
  return { success: false, error: 'Dossier introuvable' };
}
