// ============================================
// SIMULATEUR PAC 2026 — Backend Apps Script
// ============================================
// 
// INSTALLATION :
// 1. Créer un Google Sheet avec 2 onglets :
//    - "Users" : colonnes A=username, B=password, C=name, D=role
//    - "Journal" : colonnes A=date, B=user, C=action, D=detail
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
function doPost(e) { return handleRequest(e); }

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
