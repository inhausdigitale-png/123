const STATE_FILE_ID_KEY = "CAMPAIGN_LOG_STATE_FILE_ID";
const SAVED_AT_KEY = "CAMPAIGN_LOG_SAVED_AT";
const REPORT_SPREADSHEET_ID_KEY = "CAMPAIGN_LOG_REPORT_SPREADSHEET_ID";
const STATE_FILE_NAME = "Campaign Log State.json";
const REPORT_SPREADSHEET_NAME = "Campaign Log Reports";

function doGet(e) {
  const callback = e.parameter.callback || "callback";
  if (e.parameter.action === "ping") {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify({ ok: true, message: "Campaign Log sync is ready" })});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  const state = readStateFile();
  const savedAt = PropertiesService.getScriptProperties().getProperty(SAVED_AT_KEY);
  const body = JSON.stringify({
    ok: true,
    savedAt: savedAt || "",
    data: state,
  });
  return ContentService
    .createTextOutput(`${callback}(${body});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  if (payload.action !== "save" || !payload.data) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "Missing save data" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const savedAt = payload.savedAt || new Date().toISOString();
  writeStateFile(payload.data);
  PropertiesService.getScriptProperties().setProperty(SAVED_AT_KEY, savedAt);
  writeReportSheets(payload.data, savedAt);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, savedAt }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readStateFile() {
  const fileId = PropertiesService.getScriptProperties().getProperty(STATE_FILE_ID_KEY);
  if (!fileId) return null;
  const text = DriveApp.getFileById(fileId).getBlob().getDataAsString();
  return text ? JSON.parse(text) : null;
}

function writeStateFile(data) {
  const json = JSON.stringify(data);
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(STATE_FILE_ID_KEY);
  if (existingId) {
    DriveApp.getFileById(existingId).setContent(json);
    return;
  }
  const file = DriveApp.createFile(STATE_FILE_NAME, json, MimeType.PLAIN_TEXT);
  props.setProperty(STATE_FILE_ID_KEY, file.getId());
}

function writeReportSheets(data, savedAt) {
  const spreadsheet = getReportSpreadsheet();
  writeSheet(spreadsheet, "Campaign Tracker", [
    ["Saved At", "Date", "Project", "Campaign ID", "Campaign Name", "Ad Set Name", "Platform", "Status", "Budget", "Spend", "Leads", "SVC", "Booked", "Revenue"],
    ...(data.campaigns || []).map((row) => [
      savedAt, row.date, row.project, row.id, row.name, row.adsetName, row.platform, row.status,
      row.budget, row.spend, row.leads, row.svc, row.booked, row.revenue,
    ]),
  ]);
  writeSheet(spreadsheet, "Target Budget", [
    ["Saved At", "Month", "Project", "Medium", "Budget", "Spend", "Total Target", "Total Achieved", "Digital Target", "Digital Achieved", "BTL Target", "BTL Achieved"],
    ...(data.targets || []).map((row) => [
      savedAt, row.month, row.project, row.medium, row.budget, row.spend,
      row.totalLeadTarget, row.totalLeadAchieved, row.digitalLeadTarget, row.digitalLeadAchieved,
      row.btlLeadTarget, row.btlLeadAchieved,
    ]),
  ]);
  writeSheet(spreadsheet, "Portal Report", [
    ["Saved At", "Date", "Month", "Portal", "Project", "Generated", "SVS", "SVC", "Walk-in", "Gross", "Net"],
    ...(data.portalRows || []).map((row) => [
      savedAt, row.date, row.month, row.portal, row.project, row.generated, row.svs, row.svc,
      row.walkin, row.gross, row.net,
    ]),
  ]);
  writeSheet(spreadsheet, "Creative Performance", [
    ["Saved At", "Date", "Project", "Campaign ID", "Campaign Name", "Ad Set Name", "Creative", "Type", "Platform", "Spend", "Impressions", "Clicks", "Leads", "SVC", "Booked", "Status", "Has Image"],
    ...(data.creatives || []).map((row) => [
      savedAt, row.date, row.project, row.campaignId, row.campaignName, row.adsetName,
      row.creativeName, row.creativeType, row.platform, row.spend, row.impressions,
      row.clicks, row.leads, row.svc, row.booked, row.status, row.imageData ? "Yes" : "No",
    ]),
  ]);
  writeSheet(spreadsheet, "Users", [
    ["Saved At", "User Name", "Display Name", "Role", "Active", "Assigned Projects"],
    ...(data.users || []).map((row) => [
      savedAt, row.username, row.name, row.role, row.active !== false ? "Yes" : "No",
      (row.projects || []).join(", "),
    ]),
  ]);
}

function getReportSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(REPORT_SPREADSHEET_ID_KEY);
  if (existingId) return SpreadsheetApp.openById(existingId);
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheet = activeSpreadsheet || SpreadsheetApp.create(REPORT_SPREADSHEET_NAME);
  props.setProperty(REPORT_SPREADSHEET_ID_KEY, spreadsheet.getId());
  return spreadsheet;
}

function writeSheet(spreadsheet, sheetName, values) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  sheet.clearContents();
  if (values.length) {
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    sheet.setFrozenRows(1);
  }
}
