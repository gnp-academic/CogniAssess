/* ============================================================
   apps-script-code.gs — Google Apps Script Backend
   CogniAssess Result Submission Handler

   SETUP:
   1. Open your Google Sheet → Extensions → Apps Script
   2. Paste this entire file into the editor (replace default code)
   3. Save, then Deploy → New Deployment → Web App
   4. Execute as: Me | Who has access: Anyone
   5. Copy the Web App URL into storage.js → WEB_APP_URL
   ============================================================ */

/* ---- Column header row (paste into Row 1 of Sheet) --------
   Timestamp | AttemptID | Name | Email | Mobile | Batch |
   StartTime | EndTime | TotalTimeSec | TotalTimeMin | AutoSubmitted |
   TotalScore | MaxScore | Percentage | PerformanceLevel | CompletionPct |
   PatternMatch | BlockArrange | Memory | Reaction | RuleSwitching |
   PuzzleGrid | Direction | CalcSprint |
   SkillPattern | SkillMemory | SkillAttention | SkillLogical |
   SkillSpatial | SkillReaction | SkillNumerical | SkillDecision |
   TotalCorrect | TotalWrong | TotalMissed | AvgResponseMs |
   FastestMs | SlowestMs | TabSwitches | RefreshCount | DuplicateFlag
   ---------------------------------------------------------------- */

var SHEET_NAME = 'Results'; // Name of the sheet tab

function doPost(e) {
  /* ---- Parse body ---------------------------------------- */
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Invalid JSON: ' + err.message });
  }

  if (!payload || !payload.attemptId) {
    return jsonResponse({ status: 'error', message: 'Missing attemptId in payload.' });
  }

  /* ---- Use LockService to prevent concurrent write issues - */
  var lock = LockService.getScriptLock();
  var acquired = false;
  try {
    lock.waitLock(15000); // wait up to 15 seconds
    acquired = true;
  } catch (lockErr) {
    return jsonResponse({ status: 'error', message: 'Server busy. Please retry in a moment.' });
  }

  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    /* Create sheet if it doesn't exist */
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      writeHeaders(sheet);
    }

    /* If sheet is empty, write headers */
    if (sheet.getLastRow() === 0) {
      writeHeaders(sheet);
    }

    /* ---- Duplicate detection ------------------------------ */
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      /* AttemptID is column B (index 2) */
      var attemptIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < attemptIds.length; i++) {
        if (attemptIds[i][0] === payload.attemptId) {
          return jsonResponse({
            status:  'duplicate',
            message: 'Attempt ID already exists. Duplicate submission blocked.'
          });
        }
      }
    }

    /* ---- Append new row ----------------------------------- */
    var row = buildRow(payload);
    sheet.appendRow(row);

    return jsonResponse({ status: 'success', message: 'Result saved successfully.', row: lastRow + 1 });

  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Write failed: ' + err.message });
  } finally {
    if (acquired) lock.releaseLock();
  }
}

/* ---- Build the data row array in column order ------------- */
function buildRow(p) {
  return [
    new Date().toISOString(),     // Timestamp (server-side)
    p.attemptId        || '',
    p.name             || '',
    p.email            || '',
    p.mobile           || '',
    p.batch            || '',
    p.startTime        || '',
    p.endTime          || '',
    p.totalTimeSec     || 0,
    p.totalTimeMin     || 0,
    p.autoSubmitted    || 'No',
    p.totalScore       || 0,
    p.maxScore         || 0,
    p.percentage       || 0,
    p.performanceLevel || '',
    p.completionPct    || 0,
    p.scorePatternMatch  || 0,
    p.scoreBlockArrange  || 0,
    p.scoreMemory        || 0,
    p.scoreReaction      || 0,
    p.scoreRuleSwitching || 0,
    p.scorePuzzleGrid    || 0,
    p.scoreDirection     || 0,
    p.scoreCalcSprint    || 0,
    p.skillPatternRecog  || 0,
    p.skillMemory        || 0,
    p.skillAttention     || 0,
    p.skillLogical       || 0,
    p.skillSpatial       || 0,
    p.skillReaction      || 0,
    p.skillNumerical     || 0,
    p.skillDecision      || 0,
    p.totalCorrect       || 0,
    p.totalWrong         || 0,
    p.totalMissed        || 0,
    p.avgResponseTimeMs  || 0,
    p.fastestResponseMs  || 0,
    p.slowestResponseMs  || 0,
    p.tabSwitchCount     || 0,
    p.refreshCount       || 0,
    p.duplicateFlag      || 'No'
  ];
}

/* ---- Write column headers to row 1 ------------------------ */
function writeHeaders(sheet) {
  var headers = [
    'Timestamp','AttemptID','Name','Email','Mobile','Batch',
    'StartTime','EndTime','TotalTimeSec','TotalTimeMin','AutoSubmitted',
    'TotalScore','MaxScore','Percentage','PerformanceLevel','CompletionPct',
    'ScorePattern','ScoreBlock','ScoreMemory','ScoreReaction','ScoreRules',
    'ScoreGrid','ScoreDirection','ScoreCalc',
    'SkillPattern','SkillMemory','SkillAttention','SkillLogical',
    'SkillSpatial','SkillReaction','SkillNumerical','SkillDecision',
    'TotalCorrect','TotalWrong','TotalMissed','AvgResponseMs',
    'FastestMs','SlowestMs','TabSwitches','RefreshCount','DuplicateFlag'
  ];
  sheet.appendRow(headers);

  /* Style header row */
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1e1b4b');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/* ---- JSON response with CORS headers ---------------------- */
function jsonResponse(obj) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/* ---- Test function (run manually in Apps Script editor) --- */
function testDoPost() {
  var mockPayload = {
    attemptId:        'ATT-TEST-001',
    name:             'Test User',
    email:            'test@example.com',
    mobile:           '9999999999',
    batch:            'Test Batch 2025',
    startTime:        new Date().toISOString(),
    endTime:          new Date().toISOString(),
    totalTimeSec:     900,
    totalTimeMin:     '15.00',
    autoSubmitted:    'No',
    totalScore:       520,
    maxScore:         800,
    percentage:       65,
    performanceLevel: 'Good',
    completionPct:    100,
    scorePatternMatch:  75,
    scoreBlockArrange:  60,
    scoreMemory:        70,
    scoreReaction:      55,
    scoreRuleSwitching: 65,
    scorePuzzleGrid:    80,
    scoreDirection:     60,
    scoreCalcSprint:    55,
    skillPatternRecog:  75,
    skillMemory:        70,
    skillAttention:     55,
    skillLogical:       62,
    skillSpatial:       70,
    skillReaction:      55,
    skillNumerical:     55,
    skillDecision:      65,
    totalCorrect:       42,
    totalWrong:         12,
    totalMissed:        6,
    avgResponseTimeMs:  2400,
    fastestResponseMs:  450,
    slowestResponseMs:  9800,
    tabSwitchCount:     0,
    refreshCount:       0,
    duplicateFlag:      'No'
  };

  var mockEvent = {
    postData: { contents: JSON.stringify(mockPayload) }
  };

  var result = doPost(mockEvent);
  Logger.log(result.getContent());
}
