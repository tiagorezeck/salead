// =========================================================================
// GOOGLE APPS SCRIPT (Code.gs) - MOTOR SALEAD DATABASE NO GOOGLE DRIVE + SHEETS
// =========================================================================
// Guia Rápido de Publicação no Google Apps Script:
// 1. Abra script.google.com (ou script.new) e crie um novo projeto.
// 2. Cole este código no arquivo Código.gs.
// 3. Clique em "Implantar" (Deploy) > "Nova Implantação" (New Deployment).
// 4. Escolha o tipo: "App da Web" (Web App).
// 5. Configure:
//    - Descrição: "Motor de Banco & Sheets v1 (SALEAD)"
//    - Executar como: "Eu (seu-email@gmail.com)"
//    - Quem pode acessar: "Qualquer pessoa" (Anyone) (necessário para o fetch do app)
// 6. Clique em "Implantar" e autorize o acesso à sua conta Google.
// 7. Copie a URL do App da Web gerada (terminada em /exec) e cole no painel do SALEAD!
//
// Como os dados ficam organizados no seu Google Drive:
// 📁 Pasta Raiz: SALEAD
//    └── 📁 Pasta AppDatabase_Data:
//         ├── 📄 database_root.json: Arquivo mestre com o estado atual em JSON.
//         ├── 📊 APP_DATABASE_SHEETS: Planilha do Sheets com abas formatadas.
//         ├── 📁 Backups: Snapshots automáticos diários da planilha e backups JSON.
//         ├── 📁 Midia: Imagens e anexos Base64 com links públicos diretos.
//         └── 📄 checkpoint_YYYY-MM-DD_HH-mm.json: Pontos de restauração manuais.
// =========================================================================

export const SALEAD_GOOGLE_APPS_SCRIPT_CODE = `// =========================================================================
// MOTOR UNIVERSAL SALEAD: GOOGLE SHEETS + GOOGLE DRIVE + MULTI-USUÁRIO
// =========================================================================

const ROOT_FOLDER_NAME = "SALEAD";
const DATA_FOLDER_NAME = "AppDatabase_Data";
const BACKUP_FOLDER_NAME = "Backups";
const MEDIA_FOLDER_NAME = "Midia";
const SPREADSHEET_BASE_NAME = "APP_DATABASE_SHEETS";
const ROOT_FILE_NAME = "database_root.json";

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || "get";
    var folders = getSaleadFolders();
    var folder = folders.data;

    // 1. PING / TESTE DE CONEXÃO
    if (action === "ping" || action === "test") {
      var ss = getOrCreateSpreadsheet(folder);
      setupDailyBackupTrigger();

      var exportUrl = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export?format=xlsx";

      return jsonResponse({
        status: "success",
        hasDatabase: true,
        rootFolder: ROOT_FOLDER_NAME,
        folder: ROOT_FOLDER_NAME + "/" + DATA_FOLDER_NAME,
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        spreadsheetId: ss.getId(),
        exportXlsxUrl: exportUrl,
        timestamp: new Date().getTime(),
        message: "Conexão ativa! Banco SALEAD no Google Sheets pronto (" + ss.getName() + " em " + ROOT_FOLDER_NAME + "/" + DATA_FOLDER_NAME + ")."
      });
    }

    // 2. LISTAR ARQUIVOS E CHECKPOINTS
    if (action === "list_files") {
      var files = folder.getFiles();
      var list = [];
      while (files.hasNext()) {
        var file = files.next();
        var fileName = file.getName();
        list.push({
          id: file.getId(),
          name: fileName,
          isRoot: fileName === ROOT_FILE_NAME,
          size: file.getSize(),
          lastUpdated: file.getLastUpdated().getTime(),
          url: file.getUrl()
        });
      }
      list.sort(function(a, b) { return b.lastUpdated - a.lastUpdated; });
      return jsonResponse({ status: "success", files: list });
    }

    // 3. BUSCAR ARQUIVO ESPECÍFICO
    if (action === "get_file") {
      var targetFileName = params.fileName || ROOT_FILE_NAME;
      var targetFiles = folder.getFilesByName(targetFileName);
      if (targetFiles.hasNext()) {
        var tFile = targetFiles.next();
        return ContentService.createTextOutput(tFile.getBlob().getDataAsString("UTF-8"))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return jsonResponse({ status: "error", message: "Arquivo não encontrado: " + targetFileName });
    }

    // 4. GET PADRÃO (RETORNA O BANCO COMPLETO)
    var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
    if (rootFiles.hasNext()) {
      var rootFile = rootFiles.next();
      return ContentService.createTextOutput(rootFile.getBlob().getDataAsString("UTF-8"))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return jsonResponse({ status: "empty", message: "Banco de dados ainda não inicializado." });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  // Lock Service para garantir concorrência segura em múltiplos leads simultâneos
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Aguarda até 30s
  } catch (eLock) {
    return jsonResponse({ status: "error", message: "Servidor ocupado. Tente novamente em instantes." });
  }

  try {
    var postData = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(postData);
    var action = payload.action || "save";
    var folders = getSaleadFolders();
    var folder = folders.data;
    var spreadsheet = getOrCreateSpreadsheet(folder);

    // =========================================================================
    // AÇÃO: CAPTURA CONCORRENTE DE LEAD VIA LANDING PAGE
    // =========================================================================
    if (action === "SUBMIT_LP_LEAD") {
      var lead = payload.lead || {};
      var now = new Date();
      var dateFormatted = formatDate(now);
      var leadId = lead.id || ("lead_lp_" + now.getTime() + "_" + Math.random().toString(36).substring(2, 6));
      var isTestMode = (payload.isTest === true || lead.isTest === true);

      if (isTestMode) {
        // 1. Grava apenas na aba de testes "leadtest"
        var testSheet = getOrCreateSheet(spreadsheet, "leadtest", [
          "Data / Hora", "ID Lead", "Landing Page (Título)", "ID Landing Page", "Nome", "WhatsApp", "E-mail", "Empresa", "Origem", "UTM Source", "UTM Medium", "UTM Campaign", "Respostas / Quiz", "Status"
        ]);

        var answersStr = typeof lead.answers === 'object' ? JSON.stringify(lead.answers) : (lead.answers || "");
        var utm = lead.utm || {};

        testSheet.appendRow([
          dateFormatted,
          leadId,
          lead.landingPageTitle || lead.pageTitle || "Landing Page",
          lead.landingPageId || "",
          lead.name || "",
          lead.whatsapp || "",
          lead.email || "",
          lead.company || "",
          lead.source || "Landing Page (Teste)",
          utm.utm_source || utm.source || "",
          utm.utm_medium || utm.medium || "",
          utm.utm_campaign || utm.campaign || "",
          answersStr,
          "Lead de Teste"
        ]);

        return jsonResponse({
          status: "success",
          leadId: leadId,
          isTest: true,
          message: "Lead de teste capturado com sucesso na Landing Page e registrado na aba de testes [leadtest]!"
        });
      }

      // 1. Grava na aba específica de conversões de Landing Pages
      var lpSheet = getOrCreateSheet(spreadsheet, "Leads_LandingPages", [
        "Data / Hora", "ID Lead", "Landing Page (Título)", "ID Landing Page", "Nome", "WhatsApp", "E-mail", "Empresa", "Origem", "UTM Source", "UTM Medium", "UTM Campaign", "Respostas / Quiz", "Status"
      ]);

      var answersStr = typeof lead.answers === 'object' ? JSON.stringify(lead.answers) : (lead.answers || "");
      var utm = lead.utm || {};

      lpSheet.appendRow([
        dateFormatted,
        leadId,
        lead.landingPageTitle || lead.pageTitle || "Landing Page",
        lead.landingPageId || "",
        lead.name || "",
        lead.whatsapp || "",
        lead.email || "",
        lead.company || "",
        lead.source || "Landing Page",
        utm.utm_source || utm.source || "",
        utm.utm_medium || utm.medium || "",
        utm.utm_campaign || utm.campaign || "",
        answersStr,
        "Novo Lead"
      ]);

      // 2. Grava também na aba principal de Leads
      var mainLeadsSheet = getOrCreateSheet(spreadsheet, "Leads", [
        "ID", "Nome", "Empresa", "Email", "WhatsApp", "Valor", "Fase / Etapa", "Responsável", "Temperatura", "Origem", "Score", "Tags", "Data Cadastro", "Última Interação"
      ]);

      mainLeadsSheet.appendRow([
        leadId,
        lead.name || "",
        lead.company || "",
        lead.email || "",
        lead.whatsapp || "",
        0,
        "Leads",
        "",
        "Quente",
        lead.source || "Landing Page",
        85,
        "LP, " + (lead.landingPageTitle || "Conversão"),
        dateFormatted,
        "Capturado via Landing Page: " + (lead.landingPageTitle || "")
      ]);

      // 3. Atualiza o contador de conversões na aba Landing_Pages e no JSON Raiz
      updateLandingPageLeadCount(spreadsheet, folder, lead.landingPageId || lead.pageId, lead.landingPageTitle || lead.pageTitle);

      // 4. Atualiza também o JSON raiz no Drive para sync imediato via API/PULL
      try {
        var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
        var dbObj = {};
        if (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          try { dbObj = JSON.parse(rf.getBlob().getDataAsString("UTF-8")) || {}; } catch(eP) { dbObj = {}; }
        }
        if (!Array.isArray(dbObj.leads)) dbObj.leads = [];
        var lpTitle = lead.landingPageTitle || lead.pageTitle || "Landing Page";
        var lpId = lead.landingPageId || lead.pageId || "";
        dbObj.leads.unshift({
          id: leadId,
          name: lead.name || "Lead Capturado",
          company: lead.company || (lead.name ? (lead.name + " (LP: " + lpTitle + ")") : "Empresa"),
          email: lead.email || "",
          whatsapp: lead.whatsapp || "",
          value: 0,
          stage: "Leads",
          owner: "Inbound LP",
          source: lead.source || ("LP: " + lpTitle),
          classification: "Lead",
          temperature: "Quente",
          landingPage: lpTitle,
          landingPageId: lpId,
          tags: ["inbound", "landing-page"],
          score: 85,
          createdAt: dateFormatted,
          submittedAt: dateFormatted
        });
        
        var toDel = folder.getFilesByName(ROOT_FILE_NAME);
        while (toDel.hasNext()) { toDel.next().setTrashed(true); }
        folder.createFile(ROOT_FILE_NAME, JSON.stringify(dbObj, null, 2), MimeType.PLAIN_TEXT);
      } catch(eDb) {}

      return jsonResponse({
        status: "success",
        leadId: leadId,
        message: "Lead capturado com sucesso na Landing Page e registrado nas planilhas!"
      });
    }

    // =========================================================================
    // AÇÃO: RESPOSTA DE PESQUISA (GRAVAÇÃO EM TABELA SEPARADA POR PESQUISA)
    // =========================================================================
    if (action === "SUBMIT_SURVEY_RESPONSE") {
      var sr = payload.surveyResponse || {};
      var now = new Date();
      var dateFormatted = formatDate(now);
      var responseId = sr.id || ("resp_" + now.getTime() + "_" + Math.random().toString(36).substring(2, 6));
      var surveyName = sr.surveyName || "Pesquisa";
      var surveyId = sr.surveyId || "pesquisa_geral";

      // 1. Grava na aba consolidada geral de Respostas
      var generalSheet = getOrCreateSheet(spreadsheet, "Respostas_Gerais", [
        "Data / Hora", "ID Resposta", "Pesquisa (Nome)", "ID Pesquisa", "Nome Participante", "WhatsApp", "E-mail", "Empresa", "Score", "Temperatura", "Respostas Completas"
      ]);

      generalSheet.appendRow([
        dateFormatted,
        responseId,
        surveyName,
        surveyId,
        sr.leadName || "",
        sr.leadWhatsapp || "",
        sr.leadEmail || "",
        sr.leadCompany || "",
        sr.score || 0,
        sr.temperature || "Morno",
        JSON.stringify(sr.answers || {})
      ]);

      // 2. CRIA / ATUALIZA UMA TABELA SEPARADA EXCLUSIVA PARA ESTA PESQUISA
      var safeSheetName = buildSafeSurveySheetName(surveyName);
      
      // Coleta perguntas dinâmicas
      var questionsList = Array.isArray(sr.questions) ? sr.questions : [];
      var questionHeaders = [];
      var questionIds = [];

      if (questionsList.length > 0) {
        questionsList.forEach(function(q) {
          questionHeaders.push(q.question || q.id);
          questionIds.push(q.id);
        });
      } else if (sr.answers && typeof sr.answers === 'object') {
        Object.keys(sr.answers).forEach(function(key) {
          questionHeaders.push("Questão " + key);
          questionIds.push(key);
        });
      }

      var specificHeaders = [
        "Data / Hora", "ID Resposta", "Nome Participante", "WhatsApp", "E-mail", "Empresa", "Score (0-100)", "Classificação / Temperatura"
      ].concat(questionHeaders);

      var specificSheet = getOrCreateSheet(spreadsheet, safeSheetName, specificHeaders);

      var answerRow = [
        dateFormatted,
        responseId,
        sr.leadName || "",
        sr.leadWhatsapp || "",
        sr.leadEmail || "",
        sr.leadCompany || "",
        sr.score || 0,
        sr.temperature || "Morno"
      ];

      questionIds.forEach(function(qId) {
        var ansVal = (sr.answers && sr.answers[qId] !== undefined) ? sr.answers[qId] : "";
        if (typeof ansVal === 'object') ansVal = JSON.stringify(ansVal);
        answerRow.push(ansVal);
      });

      specificSheet.appendRow(answerRow);

      // 3. Atualiza contador no JSON raiz
      incrementSurveyCompletion(folder, surveyId);

      return jsonResponse({
        status: "success",
        responseId: responseId,
        sheetName: safeSheetName,
        message: "Resposta registrada com sucesso na tabela separada [" + safeSheetName + "]!"
      });
    }

    // =========================================================================
    // CRIAR CHECKPOINT (PONTO DE RESTAURAÇÃO)
    // =========================================================================
    if (action === "create_checkpoint") {
      var now = new Date();
      var timestamp = formatDate(now);
      var checkpointName = "Checkpoint-" + timestamp + ".json";
      var content = JSON.stringify(payload.data || payload, null, 2);
      folder.createFile(checkpointName, content, MimeType.PLAIN_TEXT);

      // Snapshot da planilha no Drive
      var backupFolder = getOrCreateFolder(BACKUP_FOLDER_NAME, folder);
      DriveApp.getFileById(spreadsheet.getId()).makeCopy("SHEETS_SNAPSHOT_" + timestamp, backupFolder);

      return jsonResponse({ status: "success", fileName: checkpointName, message: "Checkpoint salvo com sucesso!" });
    }

    // =========================================================================
    // RESTAURAR CHECKPOINT COMO BANCO RAIZ
    // =========================================================================
    if (action === "set_as_root") {
      var srcFileName = payload.fileName;
      var srcFiles = folder.getFilesByName(srcFileName);
      if (!srcFiles.hasNext()) {
        return jsonResponse({ status: "error", message: "Arquivo de checkpoint não encontrado." });
      }
      var srcContent = srcFiles.next().getBlob().getDataAsString("UTF-8");
      
      // Sobrescreve banco raiz
      var oldRoots = folder.getFilesByName(ROOT_FILE_NAME);
      while (oldRoots.hasNext()) { oldRoots.next().setTrashed(true); }
      folder.createFile(ROOT_FILE_NAME, srcContent, MimeType.PLAIN_TEXT);

      var parsedContent = JSON.parse(srcContent);
      syncDataToGoogleSheets(spreadsheet, parsedContent);

      return jsonResponse({ status: "success", content: parsedContent, message: "Restaurado com sucesso!" });
    }

    // =========================================================================
    // LIMPAR DADOS FAKE E ZERAR CONTADORES DE TESTE DE UMA LANDING PAGE
    // =========================================================================
    if (action === "CLEAR_LP_TEST_DATA") {
      var targetLpId = String(payload.landingPageId || payload.pageId || "");
      var targetLpTitle = String(payload.landingPageTitle || payload.pageTitle || "");

      // 1. Zera contadores na aba Landing_Pages do Google Sheets
      var lpSheet = spreadsheet.getSheetByName("Landing_Pages");
      if (lpSheet) {
        var lpData = lpSheet.getDataRange().getValues();
        for (var i = 1; i < lpData.length; i++) {
          var rowId = String(lpData[i][0]);
          var rowTitle = String(lpData[i][1]);
          if ((targetLpId && rowId === targetLpId) || (targetLpTitle && rowTitle.toLowerCase() === targetLpTitle.toLowerCase())) {
            lpSheet.getRange(i + 1, 5).setValue(0);     // Visitas
            lpSheet.getRange(i + 1, 6).setValue(0);     // Leads
            lpSheet.getRange(i + 1, 7).setValue("0%");  // Conversão
            break;
          }
        }
      }

      // 2. Remove leads vinculados da aba Leads_LandingPages
      var leadsLpSheet = spreadsheet.getSheetByName("Leads_LandingPages");
      if (leadsLpSheet) {
        var lData = leadsLpSheet.getDataRange().getValues();
        // Percorre de baixo para cima para deleção segura
        for (var li = lData.length - 1; li >= 1; li--) {
          var rLpTitle = String(lData[li][2]);
          var rLpId = String(lData[li][3]);
          if ((targetLpId && rLpId === targetLpId) || (targetLpTitle && rLpTitle.toLowerCase() === targetLpTitle.toLowerCase())) {
            leadsLpSheet.deleteRow(li + 1);
          }
        }
      }

      // 3. Remove leads de teste da aba principal Leads
      var mainLeadsSheet = spreadsheet.getSheetByName("Leads");
      if (mainLeadsSheet) {
        var mData = mainLeadsSheet.getDataRange().getValues();
        for (var mi = mData.length - 1; mi >= 1; mi--) {
          var rOrigem = String(mData[mi][9]);
          var rTags = String(mData[mi][11]);
          var matchLp = (targetLpTitle && (rOrigem.indexOf(targetLpTitle) !== -1 || rTags.indexOf(targetLpTitle) !== -1));
          if (matchLp) {
            mainLeadsSheet.deleteRow(mi + 1);
          }
        }
      }

      // 3.5 Remove leads de teste da aba "leadtest" se houver
      var testSheet = spreadsheet.getSheetByName("leadtest");
      if (testSheet) {
        var tData = testSheet.getDataRange().getValues();
        // Percorre de baixo para cima para deleção segura
        for (var ti = tData.length - 1; ti >= 1; ti--) {
          var rLpTitle = String(tData[ti][2]);
          var rLpId = String(tData[ti][3]);
          if ((targetLpId && rLpId === targetLpId) || (targetLpTitle && rLpTitle.toLowerCase() === targetLpTitle.toLowerCase())) {
            testSheet.deleteRow(ti + 1);
          }
        }
      }

      // 4. Limpa no JSON Raiz
      try {
        var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
        if (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          var db = JSON.parse(rf.getBlob().getDataAsString("UTF-8")) || {};
          
          if (Array.isArray(db.landingPages)) {
            db.landingPages.forEach(function(p) {
              if ((targetLpId && String(p.id) === targetLpId) || (targetLpTitle && String(p.name || p.title).toLowerCase() === targetLpTitle.toLowerCase())) {
                p.visits = 0;
                p.leads = 0;
                p.leads_count = 0;
                p.viewsCount = 0;
                p.conv = 0;
              }
            });
          }

          if (Array.isArray(db.leads)) {
            db.leads = db.leads.filter(function(l) {
              var lId = String(l.landingPageId || "");
              var lTitle = String(l.landingPage || l.source || "");
              if (targetLpId && lId === targetLpId) return false;
              if (targetLpTitle && lTitle.indexOf(targetLpTitle) !== -1) return false;
              return true;
            });
          }

          rf.setContent(JSON.stringify(db, null, 2));
        }
      } catch(eDbClean) {}

      return jsonResponse({
        status: "success",
        message: "Dados de teste da Landing Page limpos e contadores zerados com sucesso nas planilhas e no banco!"
      });
    }

    // =========================================================================
    // UPLOAD DE MÍDIA / IMAGEM (BASE64)
    // =========================================================================
    if (action === "UPLOAD_MEDIA") {
      var mediaBase64 = payload.base64Data || payload.base64;
      if (!mediaBase64) return jsonResponse({ status: "error", message: "Sem dados de mídia." });

      var category = payload.folderCategory || "Geral";
      var customName = payload.fileName || ("media_" + formatDate(new Date()) + ".jpg");
      var mimeTypeStr = payload.mimeType || "image/jpeg";

      if (mediaBase64.indexOf(",") !== -1) {
        mediaBase64 = mediaBase64.substring(mediaBase64.indexOf(",") + 1);
      }

      var decodedBlob = Utilities.newBlob(Utilities.base64Decode(mediaBase64), mimeTypeStr, customName);
      var midiaFolder = getOrCreateFolder("Midia", folder);
      var catFolder = getOrCreateFolder(category, midiaFolder);

      var newFile = catFolder.createFile(decodedBlob);
      try { newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (eS) {}

      var fileId = newFile.getId();
      return jsonResponse({
        status: "success",
        fileId: fileId,
        url: "https://lh3.googleusercontent.com/d/" + fileId,
        message: "Arquivo enviado com sucesso para o Drive!"
      });
    }

    // =========================================================================
    // SALVAR / SINCRONIZAR BANCO DE DADOS GERAL
    // =========================================================================
    var incomingData = payload.data || payload;
    var existingData = null;
    var currentRoots = folder.getFilesByName(ROOT_FILE_NAME);
    if (currentRoots.hasNext()) {
      try {
        existingData = JSON.parse(currentRoots.next().getBlob().getDataAsString("UTF-8"));
      } catch (eJson) {
        existingData = null;
      }
    }

    // Mesclagem inteligente de tabelas
    var mergedData = mergeDatabaseObjects(existingData, incomingData);

    // Atualiza JSON raiz no Drive
    var toDelete = folder.getFilesByName(ROOT_FILE_NAME);
    while (toDelete.hasNext()) { toDelete.next().setTrashed(true); }
    folder.createFile(ROOT_FILE_NAME, JSON.stringify(mergedData, null, 2), MimeType.PLAIN_TEXT);

    // Atualiza Todas as Abas no Google Sheets
    syncDataToGoogleSheets(spreadsheet, mergedData);

    setupDailyBackupTrigger();

    var exportUrl = "https://docs.google.com/spreadsheets/d/" + spreadsheet.getId() + "/export?format=xlsx";

    return jsonResponse({
      status: "success",
      timestamp: new Date().getTime(),
      spreadsheetUrl: spreadsheet.getUrl(),
      spreadsheetName: spreadsheet.getName(),
      spreadsheetId: spreadsheet.getId(),
      exportXlsxUrl: exportUrl,
      data: mergedData,
      message: "Sincronizado e tabelado com sucesso no Google Sheets!"
    });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// =========================================================================
// SINCRONIZAÇÃO COMPLETA DE TABELAS NO GOOGLE SHEETS
// =========================================================================
function syncDataToGoogleSheets(ss, data) {
  if (!data || typeof data !== 'object') return;
  var currentYear = new Date().getFullYear();

  // 1. Tabela de Leads & Oportunidades
  if (Array.isArray(data.leads)) {
    var sheetLeads = getOrCreateSheet(ss, "Leads", [
      "ID", "Nome", "Empresa", "Email", "WhatsApp", "Valor", "Fase / Etapa", "Responsável", "Temperatura", "Origem", "Score", "Tags", "Data Cadastro", "Última Interação"
    ]);
    var rowsLeads = data.leads.map(function(l) {
      return [
        l.id || "",
        l.name || "",
        l.company || "",
        l.email || "",
        l.whatsapp || "",
        l.value || 0,
        l.stage || "",
        l.owner || "",
        l.temperature || "Morno",
        l.source || "",
        l.score || 0,
        Array.isArray(l.tags) ? l.tags.join(", ") : (l.tags || ""),
        l.createdAt || l.created_at || "",
        l.lastInteraction || ""
      ];
    });
    writeRowsToSheet(sheetLeads, rowsLeads);
  }

  // 2. Tabela de Usuários & Equipe Comercial
  if (Array.isArray(data.users)) {
    var sheetUsers = getOrCreateSheet(ss, "Usuarios", [
      "ID", "Nome", "Email", "Cargo / Função", "Status", "Telefone", "Data Cadastro"
    ]);
    var rowsUsers = data.users.map(function(u) {
      return [
        u.id || "",
        u.name || "",
        u.email || "",
        u.role || "",
        u.status || "Ativo",
        u.contact || "",
        u.createdAt || ""
      ];
    });
    writeRowsToSheet(sheetUsers, rowsUsers);
  }

  // 3. Tabela de Landing Pages (Motor Completo)
  if (Array.isArray(data.landingPages)) {
    var sheetLP = getOrCreateSheet(ss, "Landing_Pages", [
      "ID", "Nome / Título", "Slug", "Status", "Visitas", "Leads Capturados", "Taxa Conv (%)", "Tipo", "Nicho / Oferta", "Data Criação", "Última Atualização"
    ]);
    var rowsLP = data.landingPages.map(function(lp) {
      var visits = Number(lp.visits || lp.viewsCount || 0);
      var leadsCount = Number(lp.leads || lp.leads_count || 0);
      var conv = visits > 0 ? Math.round((leadsCount / visits) * 100) : 0;
      return [
        lp.id || "",
        lp.title || lp.name || "",
        lp.slug || "",
        lp.status || "Ativa",
        visits,
        leadsCount,
        conv + "%",
        lp.type || "COMET CRO",
        lp.sector || lp.niche || "Geral",
        lp.created_at || lp.createdAt || "",
        lp.updated_at || lp.updatedAt || ""
      ];
    });
    writeRowsToSheet(sheetLP, rowsLP);
  }

  // 4. Tabela de Diagnósticos & Surveys Cadastrados
  if (Array.isArray(data.surveys)) {
    var sheetSurveys = getOrCreateSheet(ss, "Diagnosticos_Surveys", [
      "ID", "Nome da Pesquisa / Diagnóstico", "Tipo", "Finalidade", "Visitas", "Respostas Concluídas", "Status", "Qtd Perguntas", "Data Criação"
    ]);
    var rowsSurveys = data.surveys.map(function(s) {
      var numQuestions = Array.isArray(s.questions) ? s.questions.length : 0;
      return [
        s.id || "",
        s.name || "",
        s.type || "individual",
        s.purpose || "min",
        s.visits || 0,
        s.completions || 0,
        s.status || "active",
        numQuestions,
        s.createdAt || s.created_at || ""
      ];
    });
    writeRowsToSheet(sheetSurveys, rowsSurveys);

    // 5. CRIAÇÃO DE TABELA SEPARADA PARA CADA PESQUISA EXISTENTE
    data.surveys.forEach(function(s) {
      if (!s || !s.name) return;
      var sheetName = buildSafeSurveySheetName(s.name);
      var questionHeaders = [];
      if (Array.isArray(s.questions)) {
        s.questions.forEach(function(q) {
          questionHeaders.push(q.question || q.title || q.id);
        });
      }
      var headers = [
        "Data / Hora", "ID Resposta", "Nome Participante", "WhatsApp", "E-mail", "Empresa", "Score (0-100)", "Classificação / Temperatura"
      ].concat(questionHeaders);

      getOrCreateSheet(ss, sheetName, headers);
    });
  }

  // 6. Tabela de Produtos & Ofertas
  if (Array.isArray(data.products)) {
    var sheetProd = getOrCreateSheet(ss, "Produtos", [
      "ID", "Nome do Produto", "Categoria", "Preço Custo", "Preço Venda", "Recorrência", "Meses Recorrência", "Estratégia"
    ]);
    var rowsProd = data.products.map(function(p) {
      return [
        p.id || "",
        p.name || "",
        p.category || "Geral",
        p.costPrice || p.cost_price || 0,
        p.salePrice || p.sale_price || 0,
        p.recurring ? "Sim" : "Não",
        p.recurrenceMonths || 12,
        p.strategy || "Nenhuma"
      ];
    });
    writeRowsToSheet(sheetProd, rowsProd);
  }

  // 7. Tabela de Tarefas e Atividades
  if (Array.isArray(data.tasks)) {
    var sheetTasks = getOrCreateSheet(ss, "Tarefas_" + currentYear, [
      "ID", "Título", "Lead Relacionado", "Responsáveis", "Prazo", "Prioridade", "Concluído", "Data Criação"
    ]);
    var rowsTasks = data.tasks.map(function(t) {
      return [
        t.id || "",
        t.title || "",
        t.lead || "",
        Array.isArray(t.owners) ? t.owners.join(", ") : (t.owners || ""),
        t.due || "",
        t.priority || "media",
        t.done ? "Sim" : "Não",
        t.createdAt || ""
      ];
    });
    writeRowsToSheet(sheetTasks, rowsTasks);
  }
}

// AUXILIARES SHEETS E DRIVE
function buildSafeSurveySheetName(surveyName) {
  var clean = (surveyName || "Pesquisa")
    .replace(/[:\\/?*[\\]]/g, "-")
    .trim();
  if (clean.length > 24) clean = clean.substring(0, 24);
  return "Pesq - " + clean;
}

function updateLandingPageLeadCount(ss, folder, lpId, lpTitle) {
  try {
    var lpSheet = ss.getSheetByName("Landing_Pages");
    if (lpSheet) {
      var data = lpSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowId = String(data[i][0]);
        var rowTitle = String(data[i][1]);
        if ((lpId && rowId === String(lpId)) || (lpTitle && rowTitle === String(lpTitle))) {
          var currentLeads = Number(data[i][5] || 0) + 1;
          var currentVisits = Number(data[i][4] || 0);
          if (currentVisits < currentLeads) currentVisits = currentLeads;
          var newConv = currentVisits > 0 ? Math.round((currentLeads / currentVisits) * 100) : 0;
          
          lpSheet.getRange(i + 1, 5).setValue(currentVisits);
          lpSheet.getRange(i + 1, 6).setValue(currentLeads);
          lpSheet.getRange(i + 1, 7).setValue(newConv + "%");
          break;
        }
      }
    }
  } catch(e) {}
}

function incrementSurveyCompletion(folder, surveyId) {
  try {
    var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
    if (!rootFiles.hasNext()) return;
    var file = rootFiles.next();
    var db = JSON.parse(file.getBlob().getDataAsString("UTF-8"));
    if (Array.isArray(db.surveys)) {
      db.surveys.forEach(function(s) {
        if (s.id === surveyId) {
          s.completions = (s.completions || 0) + 1;
        }
      });
      file.setContent(JSON.stringify(db, null, 2));
    }
  } catch(e) {}
}

function getOrCreateSpreadsheet(folder) {
  var files = folder.getFilesByName(SPREADSHEET_BASE_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }
  var newSs = SpreadsheetApp.create(SPREADSHEET_BASE_NAME);
  var ssFile = DriveApp.getFileById(newSs.getId());
  try {
    ssFile.moveTo(folder);
  } catch (eMove) {
    try {
      folder.addFile(ssFile);
      DriveApp.getRootFolder().removeFile(ssFile);
    } catch (eFallback) {}
  }
  return newSs;
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var defaultSheet = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
    if (defaultSheet && ss.getSheets().length > 1) {
      try { ss.deleteSheet(defaultSheet); } catch(e) {}
    }
  }
  if (headers && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#0F172A");
    range.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function writeRowsToSheet(sheet, rows) {
  if (!rows || rows.length === 0) return;
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function mergeDatabaseObjects(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  var result = Object.assign({}, incoming);

  for (var key in incoming) {
    if (Array.isArray(incoming[key]) && Array.isArray(existing[key])) {
      var itemMap = {};
      existing[key].forEach(function(item) { if (item && item.id) itemMap[item.id] = item; });
      incoming[key].forEach(function(item) {
        if (item && item.id) {
          itemMap[item.id] = Object.assign({}, itemMap[item.id] || {}, item);
        }
      });
      var mergedList = [];
      for (var idKey in itemMap) { mergedList.push(itemMap[idKey]); }
      result[key] = mergedList;
    }
  }
  result.ultimoBackup = new Date().toISOString();
  return result;
}

function setupDailyBackupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runDailyBackup") return;
  }
  ScriptApp.newTrigger("runDailyBackup").timeBased().everyDays(1).atHour(0).create();
}

function getSaleadFolders() {
  var rootFolder = getOrCreateFolder(ROOT_FOLDER_NAME);
  var dataFolder = getOrCreateFolder(DATA_FOLDER_NAME, rootFolder);
  var backupFolder = getOrCreateFolder(BACKUP_FOLDER_NAME, rootFolder);
  var mediaFolder = getOrCreateFolder(MEDIA_FOLDER_NAME, rootFolder);
  return {
    root: rootFolder,
    data: dataFolder,
    backup: backupFolder,
    media: mediaFolder
  };
}

function runDailyBackup() {
  try {
    var folders = getSaleadFolders();
    var folder = folders.data;
    var backupFolder = folders.backup;
    var ss = getOrCreateSpreadsheet(folder);
    var timestamp = formatDate(new Date());

    DriveApp.getFileById(ss.getId()).makeCopy("BACKUP_SHEETS_" + timestamp, backupFolder);
    var files = folder.getFilesByName(ROOT_FILE_NAME);
    if (files.hasNext()) {
      files.next().makeCopy("BACKUP_JSON_" + timestamp + ".json", backupFolder);
    }
  } catch (e) {}
}

function getOrCreateFolder(folderName, parentFolder) {
  var target = parentFolder ? parentFolder : DriveApp;
  var folders = target.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder ? parentFolder.createFolder(folderName) : DriveApp.createFolder(folderName);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  var pad = function(n) { return n < 10 ? '0' + n : n; };
  return pad(date.getDate()) + "-" + pad(date.getMonth() + 1) + "-" + date.getFullYear() + "-" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}
`;
