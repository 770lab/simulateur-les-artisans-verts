// ============================================
// GOOGLE APPS SCRIPT — Upload Documents vers Google Drive
// Les Artisans Verts © 2026
// ============================================
//
// 📋 INSTRUCTIONS DE DÉPLOIEMENT :
//
// 1. Va sur https://script.google.com → Nouveau projet
// 2. Colle ce code dans l'éditeur (remplace tout)
// 3. Clique sur "Déployer" → "Nouveau déploiement"
// 4. Type : "Application Web"
// 5. Exécuter en tant que : "Moi"
// 6. Accès : "Tout le monde"
// 7. Copie l'URL du déploiement
// 8. Colle l'URL dans app.js → variable UPLOAD_SCRIPT_URL
//
// ============================================

// ID du dossier racine Google Drive pour les documents clients
var ROOT_FOLDER_ID = '1Tqv0t5468di2-NIdET9FKs8j4LdQ80Qt';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var clientFolder = data.folder || 'Client_inconnu';
    var files = data.files || [];
    
    if (files.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Aucun fichier reçu'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Ouvrir le dossier racine
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    
    // Créer ou récupérer le sous-dossier client
    var subFolder = getOrCreateFolder(rootFolder, clientFolder);
    
    // Créer les sous-dossiers par type de document
    var uploaded = [];
    
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var docType = file.type || 'autre'; // avis, taxe, id
      var fileName = file.name || 'document_' + i;
      var base64Data = file.data || '';
      var mimeType = file.mimeType || 'application/octet-stream';
      
      // Créer sous-dossier par type (Avis_imposition, Taxe_fonciere, Pieces_identite)
      var typeFolderName = getTypeFolderName(docType);
      var typeFolder = getOrCreateFolder(subFolder, typeFolderName);
      
      // Décoder le base64 et créer le fichier
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      var driveFile = typeFolder.createFile(blob);
      
      uploaded.push({
        name: fileName,
        type: docType,
        url: driveFile.getUrl(),
        id: driveFile.getId()
      });
    }
    
    // Envoyer notification par email (optionnel)
    try {
      sendNotification(clientFolder, uploaded);
    } catch(emailErr) {
      // Pas grave si l'email échoue
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      folder: clientFolder,
      folderUrl: subFolder.getUrl(),
      filesUploaded: uploaded.length,
      files: uploaded
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Permettre les requêtes CORS preflight
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Upload API Les Artisans Verts'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Créer ou récupérer un sous-dossier
function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

// Nom de dossier lisible par type de doc
function getTypeFolderName(docType) {
  var map = {
    'avis': '1_Avis_imposition',
    'taxe': '2_Taxe_fonciere',
    'id':   '3_Pieces_identite'
  };
  return map[docType] || '4_Autres';
}

// Notification email (optionnel — à personnaliser)
function sendNotification(clientFolder, files) {
  var recipient = Session.getActiveUser().getEmail();
  var subject = '📎 Nouveaux documents — ' + clientFolder;
  var body = 'Le client ' + clientFolder + ' a envoyé ' + files.length + ' document(s) :\n\n';
  
  for (var i = 0; i < files.length; i++) {
    body += '• ' + files[i].name + ' (' + files[i].type + ')\n';
    body += '  → ' + files[i].url + '\n\n';
  }
  
  body += 'Dossier Drive : voir le dossier partagé.';
  
  MailApp.sendEmail(recipient, subject, body);
}
