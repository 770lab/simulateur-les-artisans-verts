// ============================================
// GOOGLE APPS SCRIPT — Upload + Push Notifications
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
// 8. Colle l'URL dans data.js → variable UPLOAD_SCRIPT_URL
//
// ============================================

// CONFIGURATION
var ROOT_FOLDER_ID = '1Tqv0t5468di2-NIdET9FKs8j4LdQ80Qt';

// Clés VAPID (générées automatiquement — ne pas changer)
var VAPID_PUBLIC_KEY = 'BIJgFL-8yu1kfz92UA5Y6GxkKK6rTd4bnZDfAXjaH-Bbhqm7XgJwZuGA2RkU9drjhr9K_Alg4-pvgrg8FtjY8y8';
var VAPID_PRIVATE_KEY = 'fVjdpFZ7cHc0REkRh_2mrHQPOnCwfQNjgrSbOdSUWu4';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // ---- Enregistrement push subscription ----
    if (data.action === 'subscribe_push') {
      return handlePushSubscription(data.subscription);
    }
    
    // ---- Upload de fichiers ----
    var clientFolder = data.folder || 'Client_inconnu';
    var files = data.files || [];
    
    if (files.length === 0) {
      return jsonResponse({ success: false, error: 'Aucun fichier reçu' });
    }
    
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var subFolder = getOrCreateFolder(rootFolder, clientFolder);
    var uploaded = [];
    
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var typeFolderName = getTypeFolderName(file.type || 'autre');
      var typeFolder = getOrCreateFolder(subFolder, typeFolderName);
      
      var decoded = Utilities.base64Decode(file.data || '');
      var blob = Utilities.newBlob(decoded, file.mimeType || 'application/octet-stream', file.name || 'document_' + i);
      var driveFile = typeFolder.createFile(blob);
      
      uploaded.push({
        name: file.name,
        type: file.type,
        url: driveFile.getUrl(),
        id: driveFile.getId()
      });
    }
    
    // Notification email
    try { sendEmailNotification(clientFolder, uploaded, subFolder.getUrl()); } catch(e) {}
    
    // Notification push à tous les abonnés
    try { 
      sendPushToAll(
        '📎 Documents reçus !', 
        clientFolder + ' — ' + uploaded.length + ' fichier(s)',
        'docs'
      ); 
    } catch(e) {}
    
    return jsonResponse({
      success: true,
      folder: clientFolder,
      folderUrl: subFolder.getUrl(),
      filesUploaded: uploaded.length,
      files: uploaded
    });
    
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'Upload API Les Artisans Verts' });
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

function handlePushSubscription(subscriptionJson) {
  var props = PropertiesService.getScriptProperties();
  var subs = JSON.parse(props.getProperty('push_subscriptions') || '[]');
  
  // Éviter les doublons
  var exists = subs.some(function(s) { return s === subscriptionJson; });
  if (!exists) {
    subs.push(subscriptionJson);
    props.setProperty('push_subscriptions', JSON.stringify(subs));
  }
  
  return jsonResponse({ success: true, message: 'Subscription enregistrée', total: subs.length });
}

function sendPushToAll(title, body, tag) {
  var props = PropertiesService.getScriptProperties();
  var subs = JSON.parse(props.getProperty('push_subscriptions') || '[]');
  
  var payload = JSON.stringify({
    title: title,
    body: body,
    icon: './icon-192.png',
    tag: tag || 'lav-notif',
    url: './index.html'
  });
  
  for (var i = 0; i < subs.length; i++) {
    try {
      var sub = JSON.parse(subs[i]);
      sendWebPush(sub, payload);
    } catch(e) {
      // Subscription invalide, la supprimer
      subs.splice(i, 1);
      i--;
    }
  }
  
  props.setProperty('push_subscriptions', JSON.stringify(subs));
}

function sendWebPush(subscription, payload) {
  // Note: Google Apps Script ne supporte pas nativement le protocole Web Push
  // avec chiffrement. Pour un vrai push, utiliser un service externe :
  //
  // Option 1 : Firebase Cloud Messaging (gratuit, Google)
  // Option 2 : Appel à un worker Cloudflare/Vercel qui fait le push
  //
  // En attendant, on utilise les notifications email comme fallback
  Logger.log('Push notification: ' + payload);
}

// Fonction utilitaire pour tester les notifs manuellement
function testPush() {
  sendPushToAll('🔥 Test notification', 'Les notifications fonctionnent !', 'test');
}

// ============================================
// HELPERS
// ============================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function getTypeFolderName(docType) {
  var map = {
    'avis': '1_Avis_imposition',
    'taxe': '2_Taxe_fonciere',
    'id':   '3_Pieces_identite'
  };
  return map[docType] || '4_Autres';
}

function sendEmailNotification(clientFolder, files, folderUrl) {
  var recipient = Session.getActiveUser().getEmail();
  var subject = '📎 Nouveaux documents — ' + clientFolder;
  var body = '📎 Le client ' + clientFolder + ' a envoyé ' + files.length + ' document(s) :\n\n';
  
  for (var i = 0; i < files.length; i++) {
    body += '• ' + files[i].name + ' (' + files[i].type + ')\n';
    body += '  → ' + files[i].url + '\n\n';
  }
  
  body += '📁 Dossier Drive : ' + folderUrl;
  
  MailApp.sendEmail(recipient, subject, body);
}
