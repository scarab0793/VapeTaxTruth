/**
 * VapeTaxTruth - report intake (Google Apps Script web app).
 * Paste into the script bound to the "VapeTaxTruth - Reports" spreadsheet,
 * run setup() once, then Deploy > Manage deployments > edit > New version.
 * Deployment settings: Execute as "Me", access "Anyone".
 *
 * The first six columns are unchanged from the original script, so existing rows stay valid.
 */
var SHEET_NAME = 'Reports';
var HEADERS = ['Received', 'Report type', 'Location', 'Description', 'Source URL', 'Status',
               'Report ID', 'Reviewed at', 'Admin notes', 'Published URL'];
var TYPES = ['Business closure', 'Price increase', 'Personal experience', 'Other evidence'];
var STATUSES = ['Pending', 'Under review', 'Verified', 'Approved', 'Rejected', 'Published', 'Duplicate'];
var MAX_PER_HOUR = 60;

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  var tab = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  tab.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  tab.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  tab.getRange(2, 6, tab.getMaxRows() - 1, 1).setDataValidation(rule);
}

function clean_(value, max) {
  var s = String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var story = clean_(p.story, 5000);
  var type = clean_(p.type, 100);
  var source = clean_(p.source, 1000);

  // Honeypot, required field, allowed values, URL shape.
  if (p.website || story.length < 10 || TYPES.indexOf(type) === -1) return text_('Rejected');
  if (source && !/^https?:\/\/[^\s]+$/i.test(source)) return text_('Rejected');

  var cache = CacheService.getScriptCache();
  var hourKey = 'count_' + Math.floor(Date.now() / 3600000);
  var count = Number(cache.get(hourKey) || 0);
  if (count >= MAX_PER_HOUR) return text_('Busy');

  var digest = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, type + '|' + story));
  if (cache.get('dup_' + digest)) return text_('OK'); // duplicate: acknowledge, do not store twice

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    var tab = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
    var reportId = 'R-' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss') + '-' + digest.slice(0, 4);
    tab.appendRow([new Date(), type, clean_(p.location, 150), story, source, 'Pending', reportId]);
    cache.put(hourKey, String(count + 1), 3600);
    cache.put('dup_' + digest, '1', 21600);
    return text_('OK');
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return text_('VapeTaxTruth report intake is running. Reports are accepted by POST only.');
}

function text_(s) {
  return ContentService.createTextOutput(s);
}
