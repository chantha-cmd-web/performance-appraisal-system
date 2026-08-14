/**
 * Google Apps Script - Database Proxy for Staff Evaluation System
 *
 * Deployed as a Web App:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all code with this file.
 * 4. Replace SECRET_TOKEN with a secure value.
 * 5. Click "Deploy" > "New Deployment".
 * 6. Select "Web App", set Execute as "Me", set Access to "Anyone".
 * 7. Click Deploy, authorize permissions, and copy the Web App URL.
 * 8. Put the Web App URL in your .env as GOOGLE_APPS_SCRIPT_URL=your_url
 */

// CHANGE THIS: Secure passphrase matching GOOGLE_APPS_SCRIPT_SECRET in your server's .env file
var SECRET_TOKEN = "staff-eval-secure-passphrase-2026";

var SCHEMAS = {
  "users": ["id", "name", "password", "role"],
  "employees": ["id", "name", "khmerName", "campus", "department", "position", "category", "supervisorId", "supporterId", "evalModel", "evalPeriod"],
  "evaluations": ["id", "employeeId", "employeeName", "campus", "department", "position", "appraiser", "supporter", "reviewDate", "weightScheme", "evaluationType", "evalPeriod", "totalSelf", "totalSuper", "overallScore", "evaluatorComments", "status", "createdBy", "createdByName", "createdAt"],
  "criteria_scores": ["id", "evaluationId", "criteriaId", "selfScore", "superScore", "supporterScore", "managementScore", "aspScore"],
  "peer_feedback": ["id", "evaluationId", "peerName", "feedback", "score"],
  "audit_logs": ["id", "userId", "userName", "action", "details", "timestamp"],
  "app_settings": ["key", "value"],
  "notifications": ["id", "userId", "type", "title", "message", "khMessage", "link", "evaluationId", "read", "createdAt"]
};

/**
 * Handle GET Requests - Diagnostics and Connectivity Test
 */
function doGet(e) {
  return HtmlService.createHtmlOutput(
    "<h1>Staff Evaluation System Database Proxy</h1>" +
    "<p>Status: <strong>Active and Running</strong></p>" +
    "<p>Database integration configured correctly. Connect your Web Application using the POST endpoint.</p>"
  );
}

/**
 * Handle POST Requests - Reads and Writes Data securely
 */
function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    
    // Verify Security Token
    if (postData.secret !== SECRET_TOKEN) {
      return makeJsonResponse({ error: "Unauthorized: Invalid secret token" }, 401);
    }
    
    // Auto-initialize spreadsheets if needed
    initSheets();
    
    var action = postData.action;
    
    if (action === "getData") {
      return makeJsonResponse({ success: true, data: getAllData() });
    }
    
    if (action === "saveTable") {
      var tableName = postData.tableName;
      var tableData = postData.tableData;
      
      if (!SCHEMAS[tableName]) {
        return makeJsonResponse({ error: "Unknown table: " + tableName }, 400);
      }
      
      // Validation check
      var validationError = validateTableData(tableName, tableData);
      if (validationError) {
        return makeJsonResponse({ error: "Validation failed: " + validationError }, 400);
      }
      
      writeSheetData(tableName, tableData, SCHEMAS[tableName]);
      
      // Perform automated logging of the database write
      logDbAction(postData.user || "system", "save_table", "Synchronized table: " + tableName + " (" + tableData.length + " rows)");
      
      return makeJsonResponse({ success: true, message: "Table synchronized successfully" });
    }
    
    if (action === "logAudit") {
      var log = postData.log;
      if (log) {
        appendAuditLogRow(log);
        return makeJsonResponse({ success: true });
      }
      return makeJsonResponse({ error: "Missing log object" }, 400);
    }
    
    return makeJsonResponse({ error: "Action '" + action + "' not supported" }, 400);
    
  } catch (err) {
    return makeJsonResponse({ error: err.toString(), stack: err.stack }, 500);
  }
}

/**
 * Validates data before writing to prevent database corruptions
 */
function validateTableData(tableName, data) {
  if (!Array.isArray(data)) {
    return "Data must be an array of objects";
  }
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    
    if (tableName === "users") {
      if (!row.id || !row.role) {
        return "User row at index " + i + " is missing required 'id' or 'role' fields.";
      }
    }
    
    if (tableName === "employees") {
      if (!row.id || !row.name) {
        return "Employee row at index " + i + " is missing required 'id' or 'name' fields.";
      }
    }
    
    if (tableName === "evaluations") {
      if (!row.employeeId || !row.status) {
        return "Evaluation row at index " + i + " is missing 'employeeId' or 'status'.";
      }
    }
  }
  return null; // Passes validation
}

/**
 * Initialize all database sheets with headers
 */
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var tableName in SCHEMAS) {
    var sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      sheet.getRange(1, 1, 1, SCHEMAS[tableName].length).setValues([SCHEMAS[tableName]]);
      sheet.getRange(1, 1, 1, SCHEMAS[tableName].length).setFontWeight("bold");
      sheet.getRange(1, 1, 1, SCHEMAS[tableName].length).setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }
  }
}

/**
 * Converts a sheet's rows into an array of objects
 */
function getSheetData(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var data = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      
      // Normalize values
      if (val === "TRUE" || val === "true") {
        val = true;
      } else if (val === "FALSE" || val === "false") {
        val = false;
      }
      obj[headers[j]] = val;
    }
    data.push(obj);
  }
  return data;
}

/**
 * Overwrites sheet content with standard headers and rows
 */
function writeSheetData(sheetName, data, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = item[key];
      if (val === undefined || val === null) {
        row.push("");
      } else if (typeof val === "object") {
        row.push(JSON.stringify(val));
      } else {
        row.push(val);
      }
    }
    rows.push(row);
  }
  
  // Clear the entire used area first. An EMPTY intermediate state is safe for
  // concurrent readers: they see an empty table and keep their current data.
  var usedRows = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(1, 1, usedRows, headers.length).clearContent();
  
  // Write headers and all data rows in a SINGLE atomic setValues call. The old
  // approach (clear -> headers -> rows) left a window where a concurrent getData
  // could observe a half-written table (empty headers or partial rows), which the
  // server then treated as authoritative and propagated as corrupted data.
  var fullMatrix = [headers].concat(rows);
  sheet.getRange(1, 1, fullMatrix.length, headers.length).setValues(fullMatrix);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.getRange(1, 1, 1, headers.length).setBackground("#e2e8f0");
  sheet.setFrozenRows(1);
}

/**
 * Reads all tables from Google Sheets and returns them as a combined object
 */
function getAllData() {
  var db = {};
  for (var tableName in SCHEMAS) {
    db[tableName] = getSheetData(tableName);
  }
  return db;
}

/**
 * Logs database mutations directly to the audit_logs sheet
 */
function logDbAction(user, action, details) {
  var id = "log_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
  var logRow = {
    id: id,
    userId: user.id || "system",
    userName: user.name || "System Database",
    action: action,
    details: details,
    timestamp: new Date().toISOString()
  };
  appendAuditLogRow(logRow);
}

/**
 * Safely appends an audit log to avoid overwriting the whole sheet for speed
 */
function appendAuditLogRow(log) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("audit_logs");
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName("audit_logs");
  }
  
  var headers = SCHEMAS["audit_logs"];
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var val = log[headers[i]];
    row.push(val === undefined || val === null ? "" : val);
  }
  sheet.appendRow(row);
}

/**
 * Utility: Standard JSON response
 */
function makeJsonResponse(content, statusCode) {
  statusCode = statusCode || 200;
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}
