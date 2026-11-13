// School Gallery — a small Google Apps Script that lets the signage Gallery app
// show the photos in one PRIVATE Google Drive folder.
//
// The folder stays private (share it only with the people who add photos).
// The script runs as its owner and hands the screens resized copies of the
// photos, but only when the request carries the secret KEY below. Without it,
// it returns nothing. Change the KEY (and the app's setting) any time.
//
// Folders: ONE parent folder, e.g. "Gallery", with a subfolder per gallery:
//   Gallery/
//     Halloween/        <- photos
//     Field trip/       <- photos
// In Anthias, each Gallery asset names its subfolder in its "Folder" setting
// (e.g. Halloween). A new gallery is just a new subfolder: no script changes.
// Photos directly in the parent folder are shown when "Folder" is left empty.
//
// Setup (once)
//   1. In Google Drive (preferably a separate "signage" account), make the
//      parent folder and share it only with the people who add photos. Open
//      it; its ID is the last part of the address:
//      drive.google.com/drive/folders/<THIS PART>. Paste it below.
//   2. Make up a KEY below: a long random word, e.g. from a password generator.
//   3. https://script.google.com → New project "School Gallery". Replace the
//      code with this whole file. Save.
//   4. Deploy → New deployment → Web app
//        Execute as:     Me
//        Who has access: Anyone
//      Deploy, approve access to Drive, copy the Web app URL (ends in /exec).
//   5. In Anthias: Add → Apps → Gallery. Paste the URL into "Photo feed URL"
//      and the KEY into "Secret key".
//
// After changing this code: Deploy → Manage deployments → pencil → Version:
// New version → Deploy. The URL stays the same.
//
// Test in a browser:  <URL>?key=<KEY>&list=1

const PARENT_FOLDER_ID = 'PASTE-THE-PARENT-FOLDER-ID-HERE'
const KEY = 'CHANGE-ME-TO-A-LONG-RANDOM-WORD'

const WIDTH = 1600 // px wide copies; plenty for a 1080p screen
const MAX_PHOTOS = 200

function doGet(e) {
  const p = (e && e.parameter) || {}
  if (!KEY || KEY.indexOf('CHANGE-ME') === 0 || p.key !== KEY) return json({ error: 'not allowed' })
  const folderId = findFolder(p.folder)
  if (!folderId) return json({ error: 'no folder named "' + (p.folder || '') + '"' })
  if (p.photo) return photo(folderId, p.photo)
  return list(folderId)
}

// The parent folder itself (empty name), or its subfolder with that name
// (not case-sensitive). Never anything outside the parent folder.
function findFolder(name) {
  name = String(name || '').trim().toLowerCase()
  if (!name) return PARENT_FOLDER_ID
  const it = DriveApp.getFolderById(PARENT_FOLDER_ID).getFolders()
  while (it.hasNext()) {
    const f = it.next()
    if (f.getName().trim().toLowerCase() === name) return f.getId()
  }
  return ''
}

// The photos in the folder: id, name and last change, sorted by name.
function list(folderId) {
  const out = []
  const it = DriveApp.getFolderById(folderId).getFiles()
  while (it.hasNext() && out.length < MAX_PHOTOS) {
    const f = it.next()
    if (/^image\//.test(f.getMimeType())) out.push({ id: f.getId(), name: f.getName(), t: f.getLastUpdated().getTime() })
  }
  out.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }) })
  return json({ photos: out })
}

// One photo as a screen-sized JPEG data URL. Only files in the folder are served.
function photo(folderId, id) {
  let f
  try { f = DriveApp.getFileById(id) } catch (err) { return json({ error: 'not found' }) }
  let inFolder = false
  const parents = f.getParents()
  while (parents.hasNext()) if (parents.next().getId() === folderId) inFolder = true
  if (!inFolder || !/^image\//.test(f.getMimeType())) return json({ error: 'not found' })

  const auth = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
  let blob = null
  const meta = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?fields=thumbnailLink&supportsAllDrives=true', auth)
  if (meta.getResponseCode() === 200) {
    const link = JSON.parse(meta.getContentText()).thumbnailLink
    if (link) {
      const res = UrlFetchApp.fetch(link.replace(/=s\d+$/, '') + '=w' + WIDTH, auth)
      if (res.getResponseCode() === 200) blob = res.getBlob()
    }
  }
  if (!blob && f.getSize() < 3000000) blob = f.getBlob() // small originals as they are
  if (!blob) return json({ error: 'too large' })
  return json({ src: 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes()) })
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
