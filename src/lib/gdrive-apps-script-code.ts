// =========================================================================
// GOOGLE APPS SCRIPT (Code.gs) - MOTOR SALEAD DATABASE NO GOOGLE DRIVE + SHEETS v3.1
// Arquitetura Estilo Supabase / Firebase (Zero-LocalStorage, Cache em Chunks 65KB, Lock Atômico)
// =========================================================================
// Guia Rápido de Atualização / Publicação no Google Apps Script:
// 1. Abra script.google.com e abra seu projeto atual do SALEAD.
// 2. Substitua TODO o conteúdo de Código.gs pelo código abaixo.
// 3. Clique no ícone de Disquete (Salvar).
// 4. Clique em "Implantar" (Deploy) > "Gerenciar implantações" (ou "Nova Implantação").
// 5. No lápis (Editar) > Versão: selecione "Nova versão" > Quem pode acessar: "Qualquer pessoa" > "Implantar".
//    (Ou crie uma Nova Implantação tipo "App da Web" com acesso "Qualquer pessoa" e cole a URL /exec no sistema).
//
// O QUE HÁ DE NOVO NA VERSÃO 3.1 (SHEETS-FIRST PARA LANDING PAGES + CLOUD ENGINE):
// ⚡ CacheService em Chunks (65KB por bloco via putAll): Respostas < 100ms mesmo com dezenas de LPs ricas!
// 📊 Landing_Pages direto no Sheets: Salva Modelo Hero, Tema, Cor e Config JSON nas colunas da planilha.
// 🎯 GET_PUBLIC_LP direto do Sheets: Abertura fiel em qualquer navegador ou guia anônima sem voltar ao Modelo 1.
// 🧹 Deleções Completas em Lote: Suporta DELETE_PRODUCT, DELETE_TASK, DELETE_SURVEY, CLEAR_LP_TEST_DATA e CLEAN_DATABASE_KEEP_ONE.
// 📦 Escrita Atômica + LockService 30s + Batch Sheets Sync: Tabelas sempre atualizadas sem perder dados.
// =========================================================================

export const SALEAD_GOOGLE_APPS_SCRIPT_CODE = `// =========================================================================
// MOTOR UNIVERSAL SALEAD v3.1: CLOUD ENGINE + GOOGLE SHEETS + DRIVE
// =========================================================================

const ROOT_FOLDER_NAME = "SALEAD";
const DATA_FOLDER_NAME = "AppDatabase_Data";
const BACKUP_FOLDER_NAME = "Backups";
const MEDIA_FOLDER_NAME = "Midia";
const SPREADSHEET_BASE_NAME = "APP_DATABASE_SHEETS";
const DEFAULT_SPREADSHEET_ID = "1BsOiK5dC7acweEnFEauh8aDXgKI9vIt4C9OVSw7jMu4";
const ROOT_FILE_NAME = "database_root.json";

// Cache em Chunks (seguro contra limite de 100KB do CacheService) & Concorrência
const CACHE_META_KEY = "SALEAD_DB_META_V3";
const CACHE_CHUNK_PREFIX = "SALEAD_DB_C_V3_";
const CHUNK_CHAR_SIZE = 65000;
const MAX_CHUNKS = 45;
const CACHE_TTL_SECONDS = 1800; // 30 minutos

// =========================================================================
// DO GET (LEITURA ULTRA-RÁPIDA COM CACHE EM CHUNKS, LP/PESQUISA PÚBLICA, PING)
// =========================================================================
function doGet(e) {
  try {
    var params = e ? (e.parameter || {}) : {};
    var action = String(params.action || "get");

    // 0. Validação de Token de Segurança (se configurado nas Propriedades do Script)
    var auth = validateSecurityToken(e, null);
    if (!auth.valid) {
      return jsonResponse({
        status: "unauthorized",
        statusCode: 401,
        message: auth.error
      }, 401);
    }

    var folders = getSaleadFolders();
    var folder = folders.data;

    // 1. PING / TESTE DE CONEXÃO
    if (action === "ping" || action === "test") {
      var ss = getOrCreateSpreadsheet(folder);
      setupDailyBackupTrigger();

      var exportUrl = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export?format=xlsx";
      var scriptSecret = PropertiesService.getScriptProperties().getProperty("API_SECRET") || "";

      return jsonResponse({
        status: "success",
        statusCode: 200,
        hasDatabase: true,
        securedWithToken: Boolean(scriptSecret),
        rootFolder: ROOT_FOLDER_NAME,
        folder: ROOT_FOLDER_NAME + "/" + DATA_FOLDER_NAME,
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        spreadsheetId: ss.getId(),
        exportXlsxUrl: exportUrl,
        cacheEnabled: true,
        chunkedCacheEnabled: true,
        lockEnabled: true,
        version: "3.1-SheetsFirst",
        timestamp: new Date().getTime(),
        message: "Conexão ativa! Motor v3.1 Cloud Engine + Sheets-First pronto (" + ss.getName() + " em " + ROOT_FOLDER_NAME + "/" + DATA_FOLDER_NAME + ")."
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
      return jsonResponse({ status: "error", statusCode: 404, message: "Arquivo não encontrado: " + targetFileName }, 404);
    }

    // 4. REGISTRAR VISITA VIA GET (COM LOCK CURTO)
    if (action === "RECORD_LP_VISIT" || action === "INCREMENT_LP_VISIT" || action === "lp_visit") {
      var getLpId = params.lpId || params.id || params.pageId || params.slug || "";
      var getLpTitle = params.landingPageTitle || params.pageTitle || params.title || "";
      var visitRes = handleRecordLpVisit(folder, getLpId, getLpTitle);
      return jsonResponse({
        status: "success",
        visits: visitRes.visits,
        conv: visitRes.conv,
        message: "Visita computada com sucesso no Sheets e Drive!"
      });
    }

    // 5. CONSULTA PÚBLICA DIRETA DE LANDING PAGE (LENDO DIRETO DO GOOGLE SHEETS + JSON)
    if (action === "GET_PUBLIC_LP" || action === "GET_LP_BY_SLUG") {
      var queryKey = String(params.id || params.lpId || params.slug || params.token || params.title || "").trim();
      var forceSheetsDirect = (params.source === "sheets" || params.nocache === "true" || params.nocache === "1");
      var ssPublic = getOrCreateSpreadsheet(folder);
      var sheetLps = forceSheetsDirect ? readLandingPagesFromSheet(ssPublic) : [];
      var foundFromSheet = findLandingPageInList(sheetLps, queryKey);

      var dbPublic = readDatabaseRootObject(folder, forceSheetsDirect);
      var foundFromDb = findLandingPageInDb(dbPublic, queryKey);

      if (!foundFromSheet && !forceSheetsDirect) {
        sheetLps = readLandingPagesFromSheet(ssPublic);
        foundFromSheet = findLandingPageInList(sheetLps, queryKey);
      }

      var foundLp = mergeSingleLandingPageCandidate(foundFromSheet, foundFromDb);

      if (!foundLp) {
        return jsonResponse({
          status: "error",
          statusCode: 404,
          message: "Landing Page não encontrada no Google Sheets ou Drive: " + queryKey
        }, 404);
      }

      var linkedSurvey = null;
      if (foundLp.surveyId && dbPublic && Array.isArray(dbPublic.surveys)) {
        linkedSurvey = findSurveyInDb(dbPublic, foundLp.surveyId);
      }

      return jsonResponse({
        status: "success",
        source: foundFromSheet ? "sheets" : "drive_json",
        landingPage: foundLp,
        lp: foundLp,
        page: foundLp,
        survey: linkedSurvey,
        company: (dbPublic && dbPublic.company) || null
      });
    }

    // 6. CONSULTA PÚBLICA RÁPIDA DE PESQUISA / DIAGNÓSTICO
    if (action === "GET_PUBLIC_SURVEY") {
      var surveyQuery = String(params.id || params.surveyId || params.slug || params.title || "").trim();
      var dbSurvey = readDatabaseRootObject(folder, params.nocache === "true" || params.nocache === "1");
      var foundSurvey = findSurveyInDb(dbSurvey, surveyQuery);

      if (!foundSurvey) {
        return jsonResponse({
          status: "error",
          statusCode: 404,
          message: "Pesquisa não encontrada na nuvem: " + surveyQuery
        }, 404);
      }

      return jsonResponse({
        status: "success",
        survey: foundSurvey,
        company: dbSurvey.company || null
      });
    }

    // 6b. LEITURA COMPLETA DAS ABAS DA PLANILHA VIA GET
    if (action === "FORCE_READ_SHEETS" || action === "RECOVER_FROM_SHEETS" || action === "force_read") {
      var ssGet = getOrCreateSpreadsheet(folder);
      var forcedGet = readDatabaseRootRaw(folder) || {};
      forcedGet = mergeSpreadsheetRecoveryIntoDb(ssGet, forcedGet);
      forcedGet.ultimoBackup = new Date().toISOString();
      var serializedForcedGet = writeDatabaseRootObject(folder, forcedGet);
      putToChunkedCache(serializedForcedGet, CACHE_TTL_SECONDS);
      return jsonResponse({
        status: "success",
        message: "Abas da planilha lidas com sucesso!",
        spreadsheetName: ssGet.getName(),
        spreadsheetUrl: ssGet.getUrl(),
        data: forcedGet
      });
    }

    // 7. LEITURA COMPLETA DO BANCO DE DADOS (CACHE EM CHUNKS -> DATABASE_ROOT.JSON FIEL)
    var forceNoCache = (params.nocache === "true" || params.nocache === "1");
    if (!forceNoCache) {
      var cachedJsonStr = getFromChunkedCache();
      if (cachedJsonStr) {
        return ContentService.createTextOutput(cachedJsonStr)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    var dbData = readDatabaseRootObject(folder, true);
    var serializedData = JSON.stringify(dbData);
    putToChunkedCache(serializedData, CACHE_TTL_SECONDS);

    return ContentService.createTextOutput(serializedData)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return jsonResponse({ status: "error", statusCode: 500, message: err.toString() }, 500);
  }
}

// =========================================================================
// DO POST (OPERAÇÕES DE ESCRITA ATÔMICAS COM LOCK SERVICE + CACHE REFRESH)
// =========================================================================
function doPost(e) {
  var postData = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
  var payload = {};
  try {
    payload = JSON.parse(postData);
  } catch (eParse) {
    payload = {};
  }

  // 1. Validação de Token de Segurança (API Secret)
  var auth = validateSecurityToken(e, payload);
  if (!auth.valid) {
    return jsonResponse({
      status: "unauthorized",
      statusCode: 401,
      message: auth.error
    }, 401);
  }

  // 2. Lock Service Universal com Timeout Seguro (30s)
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    hasLock = lock.tryLock(30000);
  } catch (eLock) {
    hasLock = false;
  }

  if (!hasLock) {
    return jsonResponse({
      status: "busy",
      statusCode: 429,
      message: "Servidor ocupado processando outra requisição simultânea. Tente novamente em instantes."
    }, 429);
  }

  try {
    var action = String(payload.action || "save");
    var folders = getSaleadFolders();
    var folder = folders.data;
    var spreadsheet = getOrCreateSpreadsheet(folder);

    // =========================================================================
    // CONFIGURAR OU ATUALIZAR CHAVE DE SEGURANÇA (API SECRET)
    // =========================================================================
    if (action === "SET_API_SECRET") {
      var newSecret = String((payload.data && payload.data.newSecret) || payload.newSecret || payload.secret || "").trim();
      if (newSecret) {
        PropertiesService.getScriptProperties().setProperty("API_SECRET", newSecret);
        return jsonResponse({
          status: "success",
          message: "Chave de segurança (API Secret) ativada com sucesso no motor! Todas as conexões passam a exigir o Token."
        });
      } else {
        PropertiesService.getScriptProperties().deleteProperty("API_SECRET");
        return jsonResponse({
          status: "success",
          message: "Chave de segurança removida com sucesso. O motor voltou ao modo público flexível."
        });
      }
    }

    // =========================================================================
    // FORÇAR LEITURA DAS ABAS DO GOOGLE SHEETS E MESCLAR NO JSON MESTRE
    // =========================================================================
    if (action === "FORCE_READ_SHEETS" || action === "RECOVER_FROM_SHEETS" || action === "force_read") {
      var forcedData = readDatabaseRootRaw(folder) || {};
      forcedData = mergeSpreadsheetRecoveryIntoDb(spreadsheet, forcedData);
      forcedData.ultimoBackup = new Date().toISOString();
      forcedData.revision = (Number(forcedData.revision) || 0) + 1;

      var serializedForced = writeDatabaseRootObject(folder, forcedData);
      putToChunkedCache(serializedForced, CACHE_TTL_SECONDS);

      return jsonResponse({
        status: "success",
        message: "Todas as abas da planilha foram lidas com sucesso! " + (forcedData.leads ? forcedData.leads.length : 0) + " leads sincronizados.",
        leadsCount: forcedData.leads ? forcedData.leads.length : 0,
        pagesCount: forcedData.landingPages ? forcedData.landingPages.length : 0,
        spreadsheetName: spreadsheet.getName(),
        spreadsheetUrl: spreadsheet.getUrl(),
        data: forcedData
      });
    }

    // =========================================================================
    // REGISTRAR VISITA DE LANDING PAGE
    // =========================================================================
    if (action === "RECORD_LP_VISIT" || action === "INCREMENT_LP_VISIT" || action === "lp_visit") {
      var targetId = payload.lpId || payload.id || payload.pageId || payload.slug || (payload.data && (payload.data.lpId || payload.data.id || payload.data.slug)) || "";
      var targetTitle = payload.landingPageTitle || payload.pageTitle || payload.title || (payload.data && (payload.data.title || payload.data.pageTitle)) || "";
      var visitRes = handleRecordLpVisit(folder, targetId, targetTitle, spreadsheet);

      return jsonResponse({
        status: "success",
        visits: visitRes.visits,
        conv: visitRes.conv,
        message: "Visita registrada com sucesso na planilha!"
      });
    }

    // =========================================================================
    // SUBMETER NOVO LEAD VIA LANDING PAGE (ATÔMICO NO DRIVE + SHEETS + CACHE)
    // =========================================================================
    if (action === "SUBMIT_LP_LEAD") {
      var lead = payload.lead || (payload.data && payload.data.lead) || {};
      var now = new Date();
      var dateFormatted = formatDate(now);
      var isoNow = now.toISOString();
      var leadId = lead.id || ("lead_" + Utilities.getUuid());
      var isTestMode = (payload.isTest === true || lead.isTest === true || (payload.data && payload.data.isTest === true));
      var lpTitle = lead.landingPageTitle || lead.pageTitle || "Landing Page";
      var lpId = lead.landingPageId || lead.pageId || "";

      if (isTestMode) {
        var testSheet = getOrCreateSheet(spreadsheet, "leadtest", [
          "Data / Hora", "ID Lead", "Landing Page (Título)", "ID Landing Page", "Nome", "WhatsApp", "E-mail", "Empresa", "Origem", "UTM Source", "UTM Medium", "UTM Campaign", "Respostas / Quiz", "Status"
        ]);
        var answersStrT = typeof lead.answers === "object" ? JSON.stringify(lead.answers) : (lead.answers || "");
        var utmT = lead.utm || {};
        testSheet.appendRow([
          dateFormatted, leadId, lpTitle, lpId, lead.name || "", lead.whatsapp || "", lead.email || "", lead.company || "",
          lead.source || "Landing Page (Teste)", utmT.utm_source || utmT.source || "", utmT.utm_medium || utmT.medium || "",
          utmT.utm_campaign || utmT.campaign || "", answersStrT, "Lead de Teste"
        ]);
      } else {
        var lpLeadsSheet = getOrCreateSheet(spreadsheet, "Leads_LandingPages", [
          "Data / Hora", "ID Lead", "Landing Page (Título)", "ID Landing Page", "Nome", "WhatsApp", "E-mail", "Empresa", "Origem", "UTM Source", "UTM Medium", "UTM Campaign", "Respostas / Quiz", "Status"
        ]);
        var answersStr = typeof lead.answers === "object" ? JSON.stringify(lead.answers) : (lead.answers || "");
        var utm = lead.utm || {};
        lpLeadsSheet.appendRow([
          dateFormatted, leadId, lpTitle, lpId, lead.name || "", lead.whatsapp || "", lead.email || "", lead.company || "",
          lead.source || "Landing Page", utm.utm_source || utm.source || "", utm.utm_medium || utm.medium || "",
          utm.utm_campaign || utm.campaign || "", answersStr, "Novo Lead"
        ]);

        var mainLeadsSheet = getOrCreateSheet(spreadsheet, "Leads", [
          "ID", "Nome", "Empresa", "Email", "WhatsApp", "Valor", "Fase / Etapa", "Responsável", "Temperatura", "Origem", "Score", "Tags", "Data Cadastro", "Última Interação", "ID Pipeline", "Data Movimentação"
        ]);
        mainLeadsSheet.appendRow([
          leadId, lead.name || "", lead.company || "", lead.email || "", lead.whatsapp || "",
          Number(lead.value || 0), lead.stage || "Leads", lead.owner || "", lead.temperature || "Quente",
          lead.source || ("LP: " + lpTitle), Number(lead.score || 85),
          "LP, " + lpTitle, isoNow, "Capturado via Landing Page: " + lpTitle,
          lead.pipelineId || "prospection", ""
        ]);

        updateLandingPageLeadCount(spreadsheet, lpId, lpTitle);
      }

      // Atualiza JSON raiz + Cache em Chunks atomicamente
      var dbObj = readDatabaseRootRaw(folder) || {};
      if (!Array.isArray(dbObj.leads)) dbObj.leads = [];
      var existingIdx = dbObj.leads.findIndex(function(item) { return item && item.id === leadId; });
      var newLeadObj = {
        id: leadId,
        name: lead.name || "Lead Capturado",
        company: lead.company || (lead.name ? (lead.name + " (LP: " + lpTitle + ")") : "Empresa"),
        email: lead.email || "",
        whatsapp: lead.whatsapp || "",
        value: Number(lead.value || 0),
        stage: lead.stage || "Leads",
        owner: lead.owner || "Inbound LP",
        pipelineId: lead.pipelineId || "prospection",
        source: lead.source || ("LP: " + lpTitle),
        classification: isTestMode ? "Lead Teste" : "Lead",
        temperature: lead.temperature || "Quente",
        landingPage: lpTitle,
        landingPageId: lpId,
        pageId: lpId,
        pageTitle: lpTitle,
        tags: isTestMode ? ["leadtest", "modo-teste", "landing-page"] : ["inbound", "landing-page"],
        score: Number(lead.score || 85),
        quizAnswers: lead.answers || {},
        utms: lead.utm || {},
        customFields: lead.customFields || {},
        isTest: isTestMode,
        createdAt: isoNow,
        submittedAt: isoNow
      };

      if (existingIdx !== -1) {
        dbObj.leads[existingIdx] = Object.assign({}, dbObj.leads[existingIdx], newLeadObj);
      } else {
        dbObj.leads.unshift(newLeadObj);
      }

      if (!isTestMode && Array.isArray(dbObj.landingPages)) {
        dbObj.landingPages.forEach(function(lp) {
          if (!lp) return;
          if ((lpId && (lp.id === lpId || lp.slug === lpId)) || (lpTitle && (lp.title === lpTitle || lp.name === lpTitle))) {
            lp.leads = (Number(lp.leads || lp.leads_count) || 0) + 1;
            lp.leads_count = lp.leads;
            lp.visits = Math.max(Number(lp.visits || lp.viewsCount) || 0, lp.leads);
            lp.viewsCount = lp.visits;
            lp.conv = Math.min(100, Math.round((lp.leads / lp.visits) * 100));
            lp.updated_at = isoNow;
          }
        });
      }

      dbObj.revision = (Number(dbObj.revision) || 0) + 1;
      dbObj.ultimoBackup = isoNow;
      var serializedLeadDb = writeDatabaseRootObject(folder, dbObj);
      putToChunkedCache(serializedLeadDb, CACHE_TTL_SECONDS);

      return jsonResponse({
        status: "success",
        leadId: leadId,
        isTest: isTestMode,
        message: isTestMode
          ? "Lead de teste capturado e registrado na aba [leadtest]!"
          : "Lead capturado com sucesso na Landing Page e registrado nas planilhas e nuvem!"
      });
    }

    // =========================================================================
    // RESPOSTA DE PESQUISA / DIAGNÓSTICO (ATÔMICO NO DRIVE + SHEETS + CACHE)
    // =========================================================================
    if (action === "SUBMIT_SURVEY_RESPONSE") {
      var sr = payload.surveyResponse || payload.response || (payload.data && payload.data.surveyResponse) || {};
      var nowS = new Date();
      var dateFormattedS = formatDate(nowS);
      var isoNowS = nowS.toISOString();
      var responseId = sr.id || ("resp_" + Utilities.getUuid());
      var surveyName = sr.surveyName || "Pesquisa";
      var surveyId = sr.surveyId || "pesquisa_geral";

      var generalSheet = getOrCreateSheet(spreadsheet, "Respostas_Gerais", [
        "Data / Hora", "ID Resposta", "Pesquisa (Nome)", "ID Pesquisa", "Nome Participante", "WhatsApp", "E-mail", "Empresa", "Score", "Temperatura", "Respostas Completas"
      ]);
      generalSheet.appendRow([
        dateFormattedS, responseId, surveyName, surveyId, sr.leadName || "", sr.leadWhatsapp || "",
        sr.leadEmail || "", sr.leadCompany || "", sr.score || 0, sr.temperature || "Morno", JSON.stringify(sr.answers || {})
      ]);

      var safeSheetName = buildSafeSurveySheetName(surveyName);
      var questionsList = Array.isArray(sr.questions) ? sr.questions : [];
      var questionHeaders = [];
      var questionIds = [];
      if (questionsList.length > 0) {
        questionsList.forEach(function(q) {
          questionHeaders.push(q.question || q.title || q.id);
          questionIds.push(q.id);
        });
      } else if (sr.answers && typeof sr.answers === "object") {
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
        dateFormattedS, responseId, sr.leadName || "", sr.leadWhatsapp || "", sr.leadEmail || "",
        sr.leadCompany || "", sr.score || 0, sr.temperature || "Morno"
      ];
      questionIds.forEach(function(qId) {
        var ansVal = (sr.answers && sr.answers[qId] !== undefined) ? sr.answers[qId] : "";
        if (typeof ansVal === "object") ansVal = JSON.stringify(ansVal);
        answerRow.push(ansVal);
      });
      specificSheet.appendRow(answerRow);

      var dbSr = readDatabaseRootRaw(folder) || {};
      if (!Array.isArray(dbSr.surveyResponses)) dbSr.surveyResponses = [];
      dbSr.surveyResponses.unshift({
        id: responseId,
        surveyId: surveyId,
        survey_id: surveyId,
        surveyName: surveyName,
        leadName: sr.leadName || "Participante",
        leadWhatsapp: sr.leadWhatsapp || "",
        leadEmail: sr.leadEmail || "",
        leadCompany: sr.leadCompany || "",
        score: Number(sr.score || 0),
        temperature: sr.temperature || "Morno",
        answers: sr.answers || {},
        completedAt: isoNowS,
        created_at: isoNowS
      });

      if (Array.isArray(dbSr.surveys)) {
        dbSr.surveys.forEach(function(s) {
          if (s && (s.id === surveyId || s.slug === surveyId)) {
            s.completions = (Number(s.completions) || 0) + 1;
            s.updatedAt = isoNowS;
          }
        });
      }

      if (sr.leadName || sr.leadWhatsapp || sr.leadEmail) {
        var leadsSheet = getOrCreateSheet(spreadsheet, "Leads", [
          "ID", "Nome", "Empresa", "Email", "WhatsApp", "Valor", "Fase / Etapa", "Responsável", "Temperatura", "Origem", "Score", "Tags", "Data Cadastro", "Última Interação", "ID Pipeline", "Data Movimentação"
        ]);
        var srvLeadId = "lead_srv_" + Utilities.getUuid();
        leadsSheet.appendRow([
          srvLeadId, sr.leadName || "", sr.leadCompany || "", sr.leadEmail || "", sr.leadWhatsapp || "",
          sr.temperature === "Quente" ? 8500 : 3500, sr.temperature === "Quente" ? "Oportunidade" : "Leads", "",
          sr.temperature || "Morno", "Pesquisa: " + surveyName, sr.score || 0, "Pesquisa, " + surveyName,
          isoNowS, "Respondeu Pesquisa: " + surveyName + " (Score: " + (sr.score || 0) + ")", "prospection", ""
        ]);

        if (!Array.isArray(dbSr.leads)) dbSr.leads = [];
        dbSr.leads.unshift({
          id: srvLeadId,
          name: sr.leadName || "Participante",
          company: sr.leadCompany || ((sr.leadName || "Participante") + " (Pesquisa)"),
          email: sr.leadEmail || "",
          whatsapp: sr.leadWhatsapp || "",
          value: sr.temperature === "Quente" ? 8500 : 3500,
          stage: sr.temperature === "Quente" ? "Oportunidade" : "Leads",
          owner: "Inbound Pesquisa",
          pipelineId: "prospection",
          temperature: sr.temperature || "Morno",
          source: "Pesquisa: " + surveyName,
          score: Number(sr.score || 0),
          tags: ["pesquisa", "min-qualificado"],
          surveyAnswers: sr.answers || {},
          createdAt: isoNowS
        });
      }

      dbSr.revision = (Number(dbSr.revision) || 0) + 1;
      dbSr.ultimoBackup = isoNowS;
      var serializedSrDb = writeDatabaseRootObject(folder, dbSr);
      putToChunkedCache(serializedSrDb, CACHE_TTL_SECONDS);

      return jsonResponse({
        status: "success",
        responseId: responseId,
        sheetName: safeSheetName,
        message: "Resposta registrada com sucesso na tabela [" + safeSheetName + "] e nuvem!"
      });
    }

    // =========================================================================
    // CHECKPOINT / RESTAURAÇÃO
    // =========================================================================
    if (action === "create_checkpoint") {
      var timestamp = formatDate(new Date());
      var checkpointName = "Checkpoint-" + timestamp + ".json";
      var content = JSON.stringify(payload.data || payload, null, 2);
      folder.createFile(checkpointName, content, MimeType.PLAIN_TEXT);

      var backupFolder = getOrCreateFolder(BACKUP_FOLDER_NAME, folder);
      DriveApp.getFileById(spreadsheet.getId()).makeCopy("SHEETS_SNAPSHOT_" + timestamp, backupFolder);

      return jsonResponse({ status: "success", fileName: checkpointName, message: "Checkpoint salvo com sucesso!" });
    }

    if (action === "set_as_root") {
      var srcFileName = payload.fileName;
      var srcFiles = folder.getFilesByName(srcFileName);
      if (!srcFiles.hasNext()) {
        return jsonResponse({ status: "error", message: "Arquivo de checkpoint não encontrado." }, 404);
      }
      var srcContent = srcFiles.next().getBlob().getDataAsString("UTF-8");
      var parsedContent = JSON.parse(srcContent);
      var serializedRestored = writeDatabaseRootObject(folder, parsedContent);
      syncDataToGoogleSheets(spreadsheet, parsedContent);
      putToChunkedCache(serializedRestored, CACHE_TTL_SECONDS);

      return jsonResponse({ status: "success", content: parsedContent, message: "Restaurado com sucesso!" });
    }

    // =========================================================================
    // EXCLUSÕES COMPLETAS EM LOTE (LEADS, LPs, PRODUTOS, TAREFAS, PESQUISAS, TESTES)
    // =========================================================================
    if (action === "DELETE_LEAD" || action === "DELETE_MULTIPLE_LEADS") {
      var rawLeadIds = payload.ids || (payload.leadId ? [payload.leadId] : (payload.id ? [payload.id] : []));
      var targetLeadIds = Array.isArray(rawLeadIds) ? rawLeadIds.map(String) : [String(rawLeadIds)];
      var leadEmail = (payload.email || "").trim().toLowerCase();
      var leadPhone = (payload.whatsapp || payload.phone || "").replace(/[^0-9]/g, "");
      var leadIdSet = {};
      targetLeadIds.forEach(function(id) { if (id) leadIdSet[id] = true; });

      var mainLeads = spreadsheet.getSheetByName("Leads");
      if (mainLeads) {
        var mRows = mainLeads.getDataRange().getValues();
        var filteredMain = [];
        for (var mi = 1; mi < mRows.length; mi++) {
          var rId = String(mRows[mi][0] || "");
          var rEmail = String(mRows[mi][3] || "").trim().toLowerCase();
          var rPhone = String(mRows[mi][4] || "").replace(/[^0-9]/g, "");
          var match = Boolean(
            (rId && leadIdSet[rId]) ||
            (leadEmail && rEmail === leadEmail) ||
            (leadPhone && leadPhone.length >= 8 && rPhone === leadPhone)
          );
          if (!match) filteredMain.push(mRows[mi]);
        }
        writeRowsToSheet(mainLeads, filteredMain);
      }

      var llSheet = spreadsheet.getSheetByName("Leads_LandingPages");
      if (llSheet) {
        var llRows = llSheet.getDataRange().getValues();
        var filteredLl = [];
        for (var lli = 1; lli < llRows.length; lli++) {
          var lId = String(llRows[lli][1] || "");
          var lEmail = String(llRows[lli][6] || "").trim().toLowerCase();
          var lPhone = String(llRows[lli][5] || "").replace(/[^0-9]/g, "");
          var lMatch = Boolean(
            (lId && leadIdSet[lId]) ||
            (leadEmail && lEmail === leadEmail) ||
            (leadPhone && leadPhone.length >= 8 && lPhone === leadPhone)
          );
          if (!lMatch) filteredLl.push(llRows[lli]);
        }
        writeRowsToSheet(llSheet, filteredLl);
      }

      var dbRootL = readDatabaseRootRaw(folder);
      if (dbRootL && Array.isArray(dbRootL.leads)) {
        dbRootL.leads = dbRootL.leads.filter(function(l) {
          if (!l) return false;
          var lId = String(l.id || "");
          var lEm = String(l.email || "").trim().toLowerCase();
          var lPh = String(l.whatsapp || "").replace(/[^0-9]/g, "");
          if (lId && leadIdSet[lId]) return false;
          if (leadEmail && lEm === leadEmail) return false;
          if (leadPhone && leadPhone.length >= 8 && lPh === leadPhone) return false;
          return true;
        });
        dbRootL.revision = (Number(dbRootL.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbRootL), CACHE_TTL_SECONDS);
      } else {
        invalidateDatabaseCache();
      }

      return jsonResponse({
        status: "success",
        deletedIds: targetLeadIds,
        message: "Lead(s) excluído(s) permanentemente!"
      });
    }

    if (action === "DELETE_LANDING_PAGE" || action === "DELETE_LP" || action === "DELETE_MULTIPLE_LANDING_PAGES") {
      var rawIds = payload.ids || (payload.landingPageId ? [payload.landingPageId] : (payload.pageId ? [payload.pageId] : []));
      var targetIds = Array.isArray(rawIds) ? rawIds.map(String) : [String(rawIds)];
      var targetTitle = String(payload.landingPageTitle || payload.pageTitle || "").trim();
      var targetSlug = String(payload.slug || "").trim();
      var idSet = {};
      targetIds.forEach(function(id) { if (id) idSet[id] = true; });

      var lpSheetDel = spreadsheet.getSheetByName("Landing_Pages");
      if (lpSheetDel) {
        var lpData = lpSheetDel.getDataRange().getValues();
        var filteredLps = [];
        for (var i = 1; i < lpData.length; i++) {
          var rowId = String(lpData[i][0] || "");
          var rowTitle = String(lpData[i][1] || "");
          var rowSlug = String(lpData[i][2] || "");
          var shouldDelete = Boolean(
            (rowId && idSet[rowId]) ||
            (targetTitle && rowTitle.toLowerCase() === targetTitle.toLowerCase()) ||
            (targetSlug && rowSlug.toLowerCase() === targetSlug.toLowerCase())
          );
          if (!shouldDelete) filteredLps.push(lpData[i]);
        }
        writeRowsToSheet(lpSheetDel, filteredLps);
      }

      var updatedLpList = [];
      var dbLpDel = readDatabaseRootRaw(folder);
      if (dbLpDel) {
        if (Array.isArray(dbLpDel.landingPages)) {
          dbLpDel.landingPages = dbLpDel.landingPages.filter(function(p) {
            if (!p) return false;
            var pId = String(p.id || "");
            var pSlug = String(p.slug || "");
            var pTitle = String(p.title || p.name || "");
            if (pId && idSet[pId]) return false;
            if (targetSlug && pSlug.toLowerCase() === targetSlug.toLowerCase()) return false;
            if (targetTitle && pTitle.toLowerCase() === targetTitle.toLowerCase()) return false;
            return true;
          });
          updatedLpList = dbLpDel.landingPages;
        }
        if (!Array.isArray(dbLpDel.deletedLpIds)) dbLpDel.deletedLpIds = [];
        targetIds.forEach(function(id) {
          if (id && dbLpDel.deletedLpIds.indexOf(id) === -1) dbLpDel.deletedLpIds.push(id);
        });
        dbLpDel.revision = (Number(dbLpDel.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbLpDel), CACHE_TTL_SECONDS);
      } else {
        invalidateDatabaseCache();
      }

      return jsonResponse({
        status: "success",
        deletedIds: targetIds,
        remainingCount: updatedLpList.length,
        message: "Landing Page excluída com sucesso!"
      });
    }

    if (action === "CLEAR_LP_TEST_DATA") {
      var testLpId = String(payload.landingPageId || payload.lpId || "").trim();
      var testLpTitle = String(payload.landingPageTitle || "").trim().toLowerCase();

      var sheetTest = spreadsheet.getSheetByName("leadtest");
      if (sheetTest) {
        var tRows = sheetTest.getDataRange().getValues();
        var keptTRows = [];
        for (var ti = 1; ti < tRows.length; ti++) {
          var rowLpTitle = String(tRows[ti][2] || "").toLowerCase();
          var rowLpId = String(tRows[ti][3] || "").trim();
          var isMatchT = (testLpId && rowLpId === testLpId) || (testLpTitle && rowLpTitle === testLpTitle);
          if (!isMatchT) keptTRows.push(tRows[ti]);
        }
        writeRowsToSheet(sheetTest, keptTRows);
      }

      var dbClearT = readDatabaseRootRaw(folder);
      if (dbClearT) {
        if (Array.isArray(dbClearT.leads)) {
          dbClearT.leads = dbClearT.leads.filter(function(l) {
            if (!l) return false;
            var isT = Boolean(l.isTest || l.classification === "Lead Teste" || (Array.isArray(l.tags) && l.tags.indexOf("leadtest") !== -1));
            if (!isT) return true;
            if (testLpId && (l.landingPageId === testLpId || l.pageId === testLpId)) return false;
            if (testLpTitle && String(l.pageTitle || l.landingPage || "").toLowerCase().indexOf(testLpTitle) !== -1) return false;
            return true;
          });
        }
        if (Array.isArray(dbClearT.landingPages)) {
          dbClearT.landingPages.forEach(function(lp) {
            if (lp && (lp.id === testLpId || (testLpTitle && String(lp.title || lp.name || "").toLowerCase() === testLpTitle))) {
              lp.visits = 0; lp.viewsCount = 0; lp.leads = 0; lp.leads_count = 0; lp.conv = 0;
            }
          });
        }
        dbClearT.revision = (Number(dbClearT.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbClearT), CACHE_TTL_SECONDS);
      } else {
        invalidateDatabaseCache();
      }

      return jsonResponse({ status: "success", message: "Dados de teste da Landing Page removidos com sucesso!" });
    }

    if (action === "DELETE_PRODUCT") {
      var prodId = String(payload.productId || payload.id || "").trim();
      var prodSheet = spreadsheet.getSheetByName("Produtos");
      if (prodSheet && prodId) {
        var pRows = prodSheet.getDataRange().getValues();
        var keptP = [];
        for (var pi = 1; pi < pRows.length; pi++) {
          if (String(pRows[pi][0] || "") !== prodId) keptP.push(pRows[pi]);
        }
        writeRowsToSheet(prodSheet, keptP);
      }
      var dbProd = readDatabaseRootRaw(folder);
      if (dbProd && Array.isArray(dbProd.products)) {
        dbProd.products = dbProd.products.filter(function(p) { return p && String(p.id) !== prodId; });
        dbProd.revision = (Number(dbProd.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbProd), CACHE_TTL_SECONDS);
      } else {
        invalidateDatabaseCache();
      }
      return jsonResponse({ status: "success", productId: prodId, message: "Produto excluído com sucesso!" });
    }

    if (action === "DELETE_TASK") {
      var taskId = String(payload.taskId || payload.id || "").trim();
      var taskSheet = spreadsheet.getSheetByName("Tarefas_" + new Date().getFullYear());
      if (taskSheet && taskId) {
        var tkRows = taskSheet.getDataRange().getValues();
        var keptTk = [];
        for (var tki = 1; tki < tkRows.length; tki++) {
          if (String(tkRows[tki][0] || "") !== taskId) keptTk.push(tkRows[tki]);
        }
        writeRowsToSheet(taskSheet, keptTk);
      }
      var dbTask = readDatabaseRootRaw(folder);
      if (dbTask && Array.isArray(dbTask.tasks)) {
        dbTask.tasks = dbTask.tasks.filter(function(t) { return t && String(t.id) !== taskId; });
        dbTask.revision = (Number(dbTask.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbTask), CACHE_TTL_SECONDS);
      } else {
        invalidateDatabaseCache();
      }
      return jsonResponse({ status: "success", taskId: taskId, message: "Tarefa excluída com sucesso!" });
    }

    if (action === "DELETE_SURVEY") {
      var srvId = String(payload.surveyId || payload.id || "").trim();
      var srvName = String(payload.surveyName || payload.name || "").trim().toLowerCase();
      var srvSheet = spreadsheet.getSheetByName("Diagnosticos_Surveys");
      if (srvSheet) {
        var svRows = srvSheet.getDataRange().getValues();
        var keptSv = [];
        for (var svi = 1; svi < svRows.length; svi++) {
          var svRowId = String(svRows[svi][0] || "");
          var svRowName = String(svRows[svi][1] || "").toLowerCase();
          if ((srvId && svRowId === srvId) || (srvName && svRowName === srvName)) continue;
          keptSv.push(svRows[svi]);
        }
        writeRowsToSheet(srvSheet, keptSv);
      }
      var dbSrv = readDatabaseRootRaw(folder);
      if (dbSrv && Array.isArray(dbSrv.surveys)) {
        dbSrv.surveys = dbSrv.surveys.filter(function(s) {
          if (!s) return false;
          if (srvId && String(s.id) === srvId) return false;
          if (srvName && String(s.name || "").toLowerCase() === srvName) return false;
          return true;
        });
        dbSrv.revision = (Number(dbSrv.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbSrv), CACHE_TTL_SECONDS);
      } else {
        invalidateDatabaseCache();
      }
      return jsonResponse({ status: "success", surveyId: srvId, message: "Pesquisa excluída com sucesso!" });
    }

    if (action === "CLEAN_DATABASE_KEEP_ONE") {
      var keepId = String(payload.keepId || "").trim();
      var dbKeep = readDatabaseRootRaw(folder);
      if (dbKeep && Array.isArray(dbKeep.landingPages)) {
        var keptPage = dbKeep.landingPages.find(function(p) { return p && (p.id === keepId || p.slug === keepId); });
        dbKeep.landingPages = keptPage ? [keptPage] : (dbKeep.landingPages.length > 0 ? [dbKeep.landingPages[0]] : []);
        syncDataToGoogleSheets(spreadsheet, dbKeep);
        dbKeep.revision = (Number(dbKeep.revision) || 0) + 1;
        putToChunkedCache(writeDatabaseRootObject(folder, dbKeep), CACHE_TTL_SECONDS);
      }
      return jsonResponse({ status: "success", keepId: keepId, message: "Banco de LPs limpo mantendo apenas 1 item!" });
    }

    if (action === "UPLOAD_MEDIA") {
      var mediaBase64 = payload.base64Data || payload.base64;
      if (!mediaBase64) return jsonResponse({ status: "error", message: "Sem dados de mídia." }, 400);

      var category = payload.folderCategory || "Geral";
      var customName = payload.fileName || ("media_" + formatDate(new Date()) + ".jpg");
      var mimeTypeStr = payload.mimeType || "image/jpeg";

      if (mediaBase64.indexOf(",") !== -1) {
        mediaBase64 = mediaBase64.substring(mediaBase64.indexOf(",") + 1);
      }

      var decodedBlob = Utilities.newBlob(Utilities.base64Decode(mediaBase64), mimeTypeStr, customName);
      var midiaFolder = getOrCreateFolder(MEDIA_FOLDER_NAME, folder);
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
    // SALVAR / SINCRONIZAR BANCO DE DADOS COMPLETO (ESTILO SUPABASE/FIREBASE)
    // =========================================================================
    var incomingData = payload.data || payload;
    var existingData = readDatabaseRootRaw(folder);
    var mergedData = mergeDatabaseObjects(existingData, incomingData);
    mergedData.revision = Math.max(Number(existingData && existingData.revision) || 0, Number(incomingData && incomingData.revision) || 0) + 1;
    mergedData.ultimoBackup = new Date().toISOString();

    var serializedSaved = writeDatabaseRootObject(folder, mergedData);
    syncDataToGoogleSheets(spreadsheet, mergedData);
    putToChunkedCache(serializedSaved, CACHE_TTL_SECONDS);
    setupDailyBackupTrigger();

    var exportUrl = "https://docs.google.com/spreadsheets/d/" + spreadsheet.getId() + "/export?format=xlsx";

    return jsonResponse({
      status: "success",
      timestamp: new Date().getTime(),
      revision: mergedData.revision,
      spreadsheetUrl: spreadsheet.getUrl(),
      spreadsheetName: spreadsheet.getName(),
      spreadsheetId: spreadsheet.getId(),
      exportXlsxUrl: exportUrl,
      data: mergedData,
      message: "Sincronizado e tabelado com sucesso no Google Sheets e Drive!"
    });

  } catch (err) {
    return jsonResponse({ status: "error", statusCode: 500, message: err.toString() }, 500);
  } finally {
    if (hasLock) {
      try { lock.releaseLock(); } catch(e) {}
    }
  }
}

// =========================================================================
// LEITURA / ESCRITA FIEL DO DATABASE ROOT (PRESERVA 100% DAS LPs E CONFIGS)
// =========================================================================
function readDatabaseRootRaw(folder) {
  var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
  if (rootFiles.hasNext()) {
    try {
      var rawText = rootFiles.next().getBlob().getDataAsString("UTF-8");
      if (rawText && rawText.trim().length > 1) {
        return JSON.parse(rawText);
      }
    } catch (eDb) {}
  }
  return null;
}

function readDatabaseRootObject(folder, bypassCache) {
  if (!bypassCache) {
    var cachedStr = getFromChunkedCache();
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch (eC) {}
    }
  }
  var raw = readDatabaseRootRaw(folder);
  if (raw && typeof raw === "object") {
    return raw;
  }
  // Apenas se database_root.json ainda não existir no Drive, recupera das abas iniciais do Sheets
  var ss = getOrCreateSpreadsheet(folder);
  var bootstrapped = mergeSpreadsheetRecoveryIntoDb(ss, {
    leads: [],
    landingPages: [],
    surveys: [],
    surveyResponses: [],
    products: [],
    tasks: [],
    pipelines: [],
    pipelineHistory: [],
    playbooks: [],
    objections: [],
    automations: [],
    handoffRules: [],
    stageWorkflows: [],
    marketingInvestments: [],
    users: []
  });
  return bootstrapped;
}

function writeDatabaseRootObject(folder, dbObj) {
  var serialized = JSON.stringify(dbObj);
  var files = folder.getFilesByName(ROOT_FILE_NAME);
  if (files.hasNext()) {
    var primaryFile = files.next();
    primaryFile.setContent(serialized);
    while (files.hasNext()) {
      try { files.next().setTrashed(true); } catch (eTr) {}
    }
  } else {
    folder.createFile(ROOT_FILE_NAME, serialized, MimeType.PLAIN_TEXT);
  }
  return serialized;
}

function normalizeLookupSlug(val) {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findLandingPageInList(list, queryKey) {
  if (!Array.isArray(list) || !queryKey) return null;
  var qRaw = String(queryKey).trim();
  var qLow = qRaw.toLowerCase();
  var qSlug = normalizeLookupSlug(qRaw);

  for (var i = 0; i < list.length; i++) {
    var lp = list[i];
    if (!lp) continue;
    if (lp.id === qRaw || (lp.id && String(lp.id).toLowerCase() === qLow)) return lp;
    if (lp.originalId && (lp.originalId === qRaw || String(lp.originalId).toLowerCase() === qLow)) return lp;
    if (lp.slug && (lp.slug === qRaw || String(lp.slug).toLowerCase() === qLow || normalizeLookupSlug(lp.slug) === qSlug)) return lp;
    if (lp.previewToken && (lp.previewToken === qRaw || String(lp.previewToken).toLowerCase() === qLow)) return lp;
    var titleSlug = normalizeLookupSlug(lp.title || lp.name || "");
    if (titleSlug && qSlug && titleSlug === qSlug) return lp;
  }
  return null;
}

function findLandingPageInDb(db, queryKey) {
  if (!db || !Array.isArray(db.landingPages) || !queryKey) return null;
  return findLandingPageInList(db.landingPages, queryKey);
}

function parseTimestampMs(lp) {
  if (!lp) return 0;
  var raw = lp.updatedAt || lp.updated_at || lp.createdAt || lp.created_at || 0;
  var ms = new Date(raw).getTime();
  return isNaN(ms) ? 0 : ms;
}

function normalizeLandingPageModel(lp) {
  if (!lp || typeof lp !== "object") return lp;
  var model = (lp.hero && lp.hero.model) || lp.heroModel || lp.hero_model || "split_image";
  var out = Object.assign({}, lp, { heroModel: model });
  if (out.hero && typeof out.hero === "object") {
    out.hero = Object.assign({}, out.hero, { model: model });
  }
  if (out.config && typeof out.config === "object") {
    out.config = Object.assign({}, out.config, {
      heroModel: model,
      hero: out.hero || out.config.hero
    });
  }
  return out;
}

function mergeSingleLandingPageCandidate(sheetLp, dbLp) {
  if (!sheetLp && !dbLp) return null;
  if (!sheetLp) return normalizeLandingPageModel(dbLp);
  if (!dbLp) return normalizeLandingPageModel(sheetLp);

  var sheetHasRichJson = Boolean(sheetLp.hero && (sheetLp.hero.headline || sheetLp.hero.model));
  var dbHasRichJson = Boolean(dbLp.hero && (dbLp.hero.headline || dbLp.hero.model));
  var sheetTime = parseTimestampMs(sheetLp);
  var dbTime = parseTimestampMs(dbLp);

  // Prioriza o mais recente; em empate, prioriza o registro do Sheets se completo
  var preferSheet = sheetHasRichJson && (!dbHasRichJson || sheetTime >= dbTime);
  var primary = preferSheet ? sheetLp : dbLp;
  var secondary = preferSheet ? dbLp : sheetLp;

  var merged = Object.assign({}, secondary, primary);
  var finalModel = (primary.hero && primary.hero.model) || primary.heroModel || primary.hero_model || (secondary.hero && secondary.hero.model) || secondary.heroModel || "split_image";
  merged.heroModel = finalModel;
  merged.hero = Object.assign({}, secondary.hero || {}, primary.hero || {}, { model: finalModel });
  merged.visits = Math.max(Number(sheetLp.visits || 0), Number(dbLp.visits || 0));
  merged.viewsCount = merged.visits;
  merged.leads = Math.max(Number(sheetLp.leads || 0), Number(dbLp.leads || 0));
  merged.leads_count = merged.leads;
  return normalizeLandingPageModel(merged);
}

function readLandingPagesFromSheet(ss) {
  var results = [];
  if (!ss) return results;
  var allSheets = ss.getSheets();
  function normH(val) {
    return String(val || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
  }

  for (var sIdx = 0; sIdx < allSheets.length; sIdx++) {
    var curSheet = allSheets[sIdx];
    var sNameNorm = normH(curSheet.getName());
    if (sNameNorm.indexOf("landing") === -1 && sNameNorm.indexOf("pagina") === -1 && sNameNorm !== "lps") continue;

    var sValues = curSheet.getDataRange().getValues();
    if (!sValues || sValues.length < 2) continue;
    var headersNorm = (sValues[0] || []).map(normH);

    var colId = headersNorm.indexOf("id");
    var colTitle = headersNorm.indexOf("nome / titulo") !== -1 ? headersNorm.indexOf("nome / titulo") : (headersNorm.indexOf("titulo") !== -1 ? headersNorm.indexOf("titulo") : 1);
    var colSlug = headersNorm.indexOf("slug") !== -1 ? headersNorm.indexOf("slug") : 2;
    var colStatus = headersNorm.indexOf("status") !== -1 ? headersNorm.indexOf("status") : 3;
    var colVisits = headersNorm.indexOf("visitas") !== -1 ? headersNorm.indexOf("visitas") : 4;
    var colLeads = headersNorm.indexOf("leads capturados") !== -1 ? headersNorm.indexOf("leads capturados") : 5;
    var colConv = headersNorm.indexOf("taxa conv (%)") !== -1 ? headersNorm.indexOf("taxa conv (%)") : 6;
    var colType = headersNorm.indexOf("tipo");
    var colNiche = headersNorm.indexOf("nicho / oferta");
    var colHeroModel = headersNorm.indexOf("modelo hero");
    var colTheme = headersNorm.indexOf("tema");
    var colAccent = headersNorm.indexOf("cor destaque");
    var colSurveyId = headersNorm.indexOf("survey id");
    var colExternalUrl = headersNorm.indexOf("url externa");
    var colCreated = headersNorm.indexOf("data criacao");
    var colUpdated = headersNorm.indexOf("ultima atualizacao");
    var colJson1 = headersNorm.indexOf("config json");
    var colJson2 = headersNorm.indexOf("config json (cont.)");

    for (var rIdx = 1; rIdx < sValues.length; rIdx++) {
      var row = sValues[rIdx];
      if (!row || (!row[0] && !row[colTitle])) continue;

      var jsonStr = "";
      if (colJson1 !== -1 && row[colJson1]) jsonStr += String(row[colJson1]);
      if (colJson2 !== -1 && row[colJson2]) jsonStr += String(row[colJson2]);

      var parsedJson = {};
      if (jsonStr && jsonStr.trim().charAt(0) === "{") {
        try { parsedJson = JSON.parse(jsonStr); } catch (eJson) {}
      }

      var pId = String((colId !== -1 ? row[colId] : row[0]) || parsedJson.id || ("lp_sheet_" + rIdx));
      var pTitle = String((colTitle !== -1 ? row[colTitle] : "") || parsedJson.title || parsedJson.name || "Landing Page");
      var pSlug = String((colSlug !== -1 ? row[colSlug] : "") || parsedJson.slug || normalizeLookupSlug(pTitle));
      var pStatus = String((colStatus !== -1 ? row[colStatus] : row[3]) || parsedJson.status || "Ativa");
      var pVisits = Number((colVisits !== -1 ? row[colVisits] : row[4]) || parsedJson.visits || 0);
      var pLeads = Number((colLeads !== -1 ? row[colLeads] : row[5]) || parsedJson.leads || 0);
      var pConv = Number(String((colConv !== -1 ? row[colConv] : row[6]) || "0").replace("%", "")) || (pVisits > 0 ? Math.round((pLeads / pVisits) * 100) : 0);
      var pHeroModel = String((colHeroModel !== -1 ? row[colHeroModel] : "") || parsedJson.heroModel || (parsedJson.hero && parsedJson.hero.model) || "").trim();
      var pTheme = String((colTheme !== -1 ? row[colTheme] : "") || parsedJson.theme || "").trim();
      var pAccent = String((colAccent !== -1 ? row[colAccent] : "") || parsedJson.accentColor || "").trim();
      var pSurveyId = String((colSurveyId !== -1 ? row[colSurveyId] : "") || parsedJson.surveyId || "").trim();
      var pExtUrl = String((colExternalUrl !== -1 ? row[colExternalUrl] : "") || parsedJson.externalUrl || "").trim();
      var pCreated = (colCreated !== -1 && row[colCreated]) ? String(row[colCreated]) : (parsedJson.createdAt || parsedJson.created_at || "");
      var pUpdated = (colUpdated !== -1 && row[colUpdated]) ? String(row[colUpdated]) : (parsedJson.updatedAt || parsedJson.updated_at || "");

      var lpObj = Object.assign({}, parsedJson, {
        id: pId,
        title: pTitle,
        name: pTitle,
        slug: pSlug,
        status: pStatus,
        visits: pVisits,
        viewsCount: pVisits,
        leads: pLeads,
        leads_count: pLeads,
        conv: pConv,
        type: (colType !== -1 && row[colType]) ? String(row[colType]) : (parsedJson.type || "COMET CRO"),
        niche: (colNiche !== -1 && row[colNiche]) ? String(row[colNiche]) : (parsedJson.niche || parsedJson.sector || "Geral")
      });

      if (pHeroModel) {
        lpObj.heroModel = pHeroModel;
        lpObj.hero = Object.assign({}, lpObj.hero || {}, { model: pHeroModel });
      }
      if (pTheme) lpObj.theme = pTheme;
      if (pAccent) lpObj.accentColor = pAccent;
      if (pSurveyId) lpObj.surveyId = pSurveyId;
      if (pExtUrl) lpObj.externalUrl = pExtUrl;
      if (pCreated) { lpObj.createdAt = pCreated; lpObj.created_at = pCreated; }
      if (pUpdated) { lpObj.updatedAt = pUpdated; lpObj.updated_at = pUpdated; }

      results.push(normalizeLandingPageModel(lpObj));
    }
  }
  return results;
}

function findSurveyInDb(db, queryKey) {
  if (!db || !Array.isArray(db.surveys) || !queryKey) return null;
  var qRaw = String(queryKey).trim();
  var qLow = qRaw.toLowerCase();
  var qSlug = normalizeLookupSlug(qRaw);

  for (var i = 0; i < db.surveys.length; i++) {
    var s = db.surveys[i];
    if (!s) continue;
    if (s.id === qRaw || (s.id && String(s.id).toLowerCase() === qLow)) return s;
    if (s.slug && (s.slug === qRaw || String(s.slug).toLowerCase() === qLow || normalizeLookupSlug(s.slug) === qSlug)) return s;
    var nameSlug = normalizeLookupSlug(s.name || "");
    if (nameSlug && qSlug && nameSlug === qSlug) return s;
  }
  return null;
}

function handleRecordLpVisit(folder, targetId, targetTitle, existingSpreadsheet) {
  var ssVisit = existingSpreadsheet || getOrCreateSpreadsheet(folder);
  var lpVisits = 1;
  var lpConv = 0;

  var sheetLp = ssVisit.getSheetByName("Landing_Pages");
  if (sheetLp) {
    var vData = sheetLp.getDataRange().getValues();
    var headersV = (vData[0] || []).map(function(h) {
      return String(h || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    });
    var idxVisits = headersV.indexOf("visitas") !== -1 ? headersV.indexOf("visitas") : 4;
    var idxLeads = headersV.indexOf("leads capturados") !== -1 ? headersV.indexOf("leads capturados") : 5;
    var idxConv = headersV.indexOf("taxa conv (%)") !== -1 ? headersV.indexOf("taxa conv (%)") : 6;
    var idxUpdated = headersV.indexOf("ultima atualizacao") !== -1 ? headersV.indexOf("ultima atualizacao") : (vData[0] && vData[0].length >= 16 ? 15 : 10);

    for (var vi = 1; vi < vData.length; vi++) {
      var rId = String(vData[vi][0] || "");
      var rTitle = String(vData[vi][1] || "");
      var rSlug = String(vData[vi][2] || "");
      if ((targetId && (rId === String(targetId) || rSlug === String(targetId))) || (targetTitle && rTitle === String(targetTitle))) {
        var currVisits = Number(vData[vi][idxVisits] || 0) + 1;
        var currLeads = Number(vData[vi][idxLeads] || 0);
        lpVisits = currVisits;
        lpConv = currVisits > 0 ? Math.round((currLeads / currVisits) * 100) : 0;
        vData[vi][idxVisits] = currVisits;
        vData[vi][idxConv] = lpConv + "%";
        if (idxUpdated < vData[vi].length) {
          vData[vi][idxUpdated] = new Date().toISOString();
        }
        sheetLp.getRange(vi + 1, 1, 1, vData[vi].length).setValues([vData[vi]]);
        break;
      }
    }
  }

  try {
    var dbRootObj = readDatabaseRootRaw(folder);
    if (dbRootObj && Array.isArray(dbRootObj.landingPages)) {
      dbRootObj.landingPages.forEach(function(lp) {
        if (!lp) return;
        if (lp.id === targetId || lp.slug === targetId || (targetTitle && (lp.title === targetTitle || lp.name === targetTitle))) {
          lp.visits = (Number(lp.visits) || 0) + 1;
          lp.viewsCount = lp.visits;
          lp.views_count = lp.visits;
          var leads = Number(lp.leads || lp.leads_count) || 0;
          lp.conv = Math.round((leads / lp.visits) * 100);
          lpVisits = lp.visits;
          lpConv = lp.conv;
        }
      });
      putToChunkedCache(writeDatabaseRootObject(folder, dbRootObj), CACHE_TTL_SECONDS);
    }
  } catch (eVisit) {}

  return { visits: lpVisits, conv: lpConv };
}

function mergeSpreadsheetRecoveryIntoDb(ss, forcedData) {
  if (!Array.isArray(forcedData.leads)) forcedData.leads = [];
  if (!Array.isArray(forcedData.landingPages)) forcedData.landingPages = [];
  if (!Array.isArray(forcedData.products)) forcedData.products = [];

  var allSheets = ss.getSheets();
  function normH(val) {
    return String(val || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  for (var sIdx = 0; sIdx < allSheets.length; sIdx++) {
    var curSheet = allSheets[sIdx];
    var sName = curSheet.getName();
    var sNameNorm = normH(sName);
    var sValues = curSheet.getDataRange().getValues();
    if (!sValues || sValues.length < 2) continue;

    var headerRow = sValues[0] || [];
    var headersNorm = headerRow.map(normH);

    // Landing Pages (leitura completa incluindo Modelo Hero, Tema, Cor e Config JSON!)
    if (sNameNorm.indexOf("landing") !== -1 || sNameNorm.indexOf("pagina") !== -1 || sNameNorm === "lps") {
      var sheetLpsRecovered = readLandingPagesFromSheet(ss);
      for (var sri = 0; sri < sheetLpsRecovered.length; sri++) {
        var sLp = sheetLpsRecovered[sri];
        var existingIndex = forcedData.landingPages.findIndex(function(p) {
          return p && (p.id === sLp.id || (sLp.slug && p.slug === sLp.slug));
        });
        if (existingIndex !== -1) {
          forcedData.landingPages[existingIndex] = mergeSingleLandingPageCandidate(sLp, forcedData.landingPages[existingIndex]);
        } else {
          forcedData.landingPages.push(sLp);
        }
      }
      continue;
    }

    // Leads
    var isLeadSheet = (sNameNorm === "leads" || (sNameNorm.indexOf("lead") !== -1 && sNameNorm.indexOf("landing") === -1 && sNameNorm.indexOf("test") === -1));
    if (isLeadSheet) {
      var fKeys = {};
      forcedData.leads.forEach(function(l) { if (l && l.id) fKeys[String(l.id)] = true; });
      var cId = headersNorm.indexOf("id") !== -1 ? headersNorm.indexOf("id") : 0;
      var cNome = headersNorm.indexOf("nome") !== -1 ? headersNorm.indexOf("nome") : 1;
      var cEmpresa = headersNorm.indexOf("empresa") !== -1 ? headersNorm.indexOf("empresa") : 2;
      var cEmail = headersNorm.indexOf("email") !== -1 ? headersNorm.indexOf("email") : 3;
      var cWhats = headersNorm.indexOf("whatsapp") !== -1 ? headersNorm.indexOf("whatsapp") : 4;
      var cValor = headersNorm.indexOf("valor") !== -1 ? headersNorm.indexOf("valor") : 5;
      var cEtapa = headersNorm.indexOf("fase / etapa") !== -1 ? headersNorm.indexOf("fase / etapa") : 6;
      var cResp = headersNorm.indexOf("responsavel") !== -1 ? headersNorm.indexOf("responsavel") : 7;
      var cTemp = headersNorm.indexOf("temperatura") !== -1 ? headersNorm.indexOf("temperatura") : 8;
      var cOrigem = headersNorm.indexOf("origem") !== -1 ? headersNorm.indexOf("origem") : 9;
      var cScore = headersNorm.indexOf("score") !== -1 ? headersNorm.indexOf("score") : 10;
      var cTags = headersNorm.indexOf("tags") !== -1 ? headersNorm.indexOf("tags") : 11;
      var cData = headersNorm.indexOf("data cadastro") !== -1 ? headersNorm.indexOf("data cadastro") : 12;

      for (var fli = 1; fli < sValues.length; fli++) {
        var flr = sValues[fli];
        if (!flr || (!flr[cId] && !flr[cNome] && !flr[cWhats] && !flr[cEmail])) continue;
        var fId = String(flr[cId] || ("lead_" + sNameNorm + "_" + fli));
        if (!fKeys[fId]) {
          fKeys[fId] = true;
          var fName = String(flr[cNome] || "").trim();
          forcedData.leads.push({
            id: fId,
            name: fName || "Lead Planilha",
            company: String(flr[cEmpresa] || (fName ? fName + " (" + sName + ")" : "Empresa")).trim(),
            email: String(flr[cEmail] || "").trim(),
            whatsapp: String(flr[cWhats] || "").trim(),
            value: Number(flr[cValor]) || 0,
            stage: String(flr[cEtapa] || "Leads").trim(),
            owner: String(flr[cResp] || "").trim(),
            temperature: String(flr[cTemp] || "Quente").trim(),
            source: String(flr[cOrigem] || sName).trim(),
            score: Number(flr[cScore]) || 85,
            tags: flr[cTags] ? String(flr[cTags]).split(",").map(function(t){ return t.trim(); }).filter(Boolean) : [sName],
            createdAt: flr[cData] ? (typeof flr[cData].toISOString === "function" ? flr[cData].toISOString() : String(flr[cData])) : new Date().toISOString(),
            lastInteraction: "Sincronizado do Sheets [" + sName + "]"
          });
        }
      }
      continue;
    }

    // Usuarios
    if (sNameNorm === "usuarios") {
      if (!Array.isArray(forcedData.users)) forcedData.users = [];
      var uKeys = {};
      forcedData.users.forEach(function(u) { if (u && u.email) uKeys[String(u.email).toLowerCase()] = true; });
      for (var ui = 1; ui < sValues.length; ui++) {
        var ur = sValues[ui];
        var uEmail = String(ur[2] || "").trim();
        if (!uEmail || uKeys[uEmail.toLowerCase()]) continue;
        uKeys[uEmail.toLowerCase()] = true;
        forcedData.users.push({
          id: String(ur[0] || ("user_" + ui)),
          name: String(ur[1] || "Usuário"),
          email: uEmail,
          role: String(ur[3] || "Seller"),
          status: String(ur[4] || "Ativo"),
          contact: String(ur[5] || ""),
          createdAt: String(ur[6] || new Date().toISOString())
        });
      }
      continue;
    }

    // Produtos
    if (sNameNorm === "produtos") {
      var pKeys = {};
      forcedData.products.forEach(function(p) { if (p && p.id) pKeys[String(p.id)] = true; });
      for (var pi = 1; pi < sValues.length; pi++) {
        var pr = sValues[pi];
        var prId = String(pr[0] || ("prod_" + pi));
        if (!pr[1] || pKeys[prId]) continue;
        pKeys[prId] = true;
        forcedData.products.push({
          id: prId,
          name: String(pr[1] || ""),
          category: String(pr[2] || "Geral"),
          costPrice: Number(pr[3]) || 0,
          salePrice: Number(pr[4]) || 0,
          recurring: String(pr[5] || "").toLowerCase() === "sim",
          recurrenceMonths: Number(pr[6]) || 12,
          strategy: String(pr[7] || "Nenhuma")
        });
      }
      continue;
    }

    // Diagnosticos_Surveys (preserva perguntas do JSON quando já existentes)
    if (sNameNorm.indexOf("diagnosticos") !== -1 || sNameNorm.indexOf("surveys") !== -1) {
      if (!Array.isArray(forcedData.surveys)) forcedData.surveys = [];
      var svKeys = {};
      forcedData.surveys.forEach(function(sv) { if (sv && sv.id) svKeys[String(sv.id)] = true; });
      for (var svi = 1; svi < sValues.length; svi++) {
        var svr = sValues[svi];
        var svId = String(svr[0] || "");
        if (!svId || svKeys[svId]) continue;
        svKeys[svId] = true;
        forcedData.surveys.push({
          id: svId,
          name: String(svr[1] || "Pesquisa"),
          type: String(svr[2] || "individual"),
          purpose: String(svr[3] || "min"),
          visits: Number(svr[4]) || 0,
          completions: Number(svr[5]) || 0,
          status: String(svr[6] || "active"),
          questions: [],
          createdAt: String(svr[8] || new Date().toISOString())
        });
      }
      continue;
    }

    // Tarefas
    if (sNameNorm.indexOf("tarefas") === 0) {
      if (!Array.isArray(forcedData.tasks)) forcedData.tasks = [];
      var tKeys = {};
      forcedData.tasks.forEach(function(t) { if (t && t.id) tKeys[String(t.id)] = true; });
      for (var tki = 1; tki < sValues.length; tki++) {
        var tkr = sValues[tki];
        var tkId = String(tkr[0] || ("task_" + tki));
        if (!tkr[1] || tKeys[tkId]) continue;
        tKeys[tkId] = true;
        forcedData.tasks.push({
          id: tkId,
          title: String(tkr[1] || ""),
          lead: String(tkr[2] || ""),
          owners: tkr[3] ? String(tkr[3]).split(",").map(function(x){ return x.trim(); }).filter(Boolean) : [],
          due: String(tkr[4] || ""),
          priority: String(tkr[5] || "media"),
          done: String(tkr[6] || "").toLowerCase() === "sim",
          createdAt: String(tkr[7] || new Date().toISOString())
        });
      }
      continue;
    }

    // Investimentos Marketing
    if (sNameNorm.indexOf("investimentos") !== -1) {
      if (!Array.isArray(forcedData.marketingInvestments)) forcedData.marketingInvestments = [];
      var iKeys = {};
      forcedData.marketingInvestments.forEach(function(inv) { if (inv && inv.id) iKeys[String(inv.id)] = true; });
      for (var ii = 1; ii < sValues.length; ii++) {
        var ir = sValues[ii];
        var iId = String(ir[0] || ("inv_" + ii));
        if (!ir[1] || iKeys[iId]) continue;
        iKeys[iId] = true;
        forcedData.marketingInvestments.push({
          id: iId,
          channel: String(ir[1] || "Meta Ads"),
          amount: Number(ir[2]) || 0,
          start_date: String(ir[3] || ""),
          end_date: String(ir[4] || ""),
          landing_page_id: String(ir[5] || ""),
          description: String(ir[6] || ""),
          createdAt: String(ir[7] || new Date().toISOString())
        });
      }
      continue;
    }
  }
  return forcedData;
}

// =========================================================================
// SINCRONIZAÇÃO COMPLETA DE TABELAS NO GOOGLE SHEETS (BATCH PROCESSING)
// =========================================================================
function syncDataToGoogleSheets(ss, data) {
  if (!data || typeof data !== "object") return;
  var currentYear = new Date().getFullYear();

  if (Array.isArray(data.leads)) {
    var sheetLeads = getOrCreateSheet(ss, "Leads", [
      "ID", "Nome", "Empresa", "Email", "WhatsApp", "Valor", "Fase / Etapa", "Responsável", "Temperatura", "Origem", "Score", "Tags", "Data Cadastro", "Última Interação", "ID Pipeline", "Data Movimentação"
    ]);
    var rowsLeads = data.leads.map(function(l) {
      return [
        l.id || "", l.name || "", l.company || "", l.email || "", l.whatsapp || "", l.value || 0,
        l.stage || "", l.owner || "", l.temperature || "Morno", l.source || "", l.score || 0,
        Array.isArray(l.tags) ? l.tags.join(", ") : (l.tags || ""),
        l.createdAt || l.created_at || "", l.lastInteraction || "", l.pipelineId || "prospection",
        l.dataMovimentacao || l.dataTransferencia || ""
      ];
    });
    writeRowsToSheet(sheetLeads, rowsLeads);
  }

  if (Array.isArray(data.users)) {
    var sheetUsers = getOrCreateSheet(ss, "Usuarios", [
      "ID", "Nome", "Email", "Cargo / Função", "Status", "Telefone", "Data Cadastro"
    ]);
    var rowsUsers = data.users.map(function(u) {
      return [u.id || "", u.name || "", u.email || "", u.role || "", u.status || "Ativo", u.contact || "", u.createdAt || ""];
    });
    writeRowsToSheet(sheetUsers, rowsUsers);
  }

  if (Array.isArray(data.landingPages)) {
    var lpHeaders = [
      "ID", "Nome / Título", "Slug", "Status", "Visitas", "Leads Capturados",
      "Taxa Conv (%)", "Tipo", "Nicho / Oferta", "Modelo Hero", "Tema",
      "Cor Destaque", "Survey ID", "URL Externa", "Data Criação",
      "Última Atualização", "Config JSON", "Config JSON (Cont.)"
    ];
    var sheetLP = getOrCreateSheet(ss, "Landing_Pages", lpHeaders);
    var rowsLP = data.landingPages.map(function(rawLp) {
      var lp = normalizeLandingPageModel(rawLp);
      var visits = Number(lp.visits || lp.viewsCount || 0);
      var leadsCount = Number(lp.leads || lp.leads_count || 0);
      var conv = visits > 0 ? Math.round((leadsCount / visits) * 100) : 0;
      var heroModel = (lp.hero && lp.hero.model) || lp.heroModel || lp.hero_model || "split_image";
      var fullJson = "";
      try {
        fullJson = JSON.stringify(lp);
      } catch (eSer) {
        fullJson = "";
      }
      var part1 = fullJson.length > 45000 ? fullJson.substring(0, 45000) : fullJson;
      var part2 = fullJson.length > 45000 ? fullJson.substring(45000, 90000) : "";

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
        heroModel,
        lp.theme || "dark",
        lp.accentColor || "purple",
        lp.surveyId || "",
        lp.externalUrl || "",
        lp.created_at || lp.createdAt || "",
        lp.updated_at || lp.updatedAt || "",
        part1,
        part2
      ];
    });
    writeRowsToSheet(sheetLP, rowsLP);
  }

  if (Array.isArray(data.surveys)) {
    var sheetSurveys = getOrCreateSheet(ss, "Diagnosticos_Surveys", [
      "ID", "Nome da Pesquisa / Diagnóstico", "Tipo", "Finalidade", "Visitas", "Respostas Concluídas", "Status", "Qtd Perguntas", "Data Criação"
    ]);
    var rowsSurveys = data.surveys.map(function(s) {
      var numQuestions = Array.isArray(s.questions) ? s.questions.length : 0;
      return [
        s.id || "", s.name || "", s.type || "individual", s.purpose || "min",
        s.visits || 0, s.completions || 0, s.status || "active", numQuestions, s.createdAt || s.created_at || ""
      ];
    });
    writeRowsToSheet(sheetSurveys, rowsSurveys);
  }

  if (Array.isArray(data.products)) {
    var sheetProd = getOrCreateSheet(ss, "Produtos", [
      "ID", "Nome do Produto", "Categoria", "Preço Custo", "Preço Venda", "Recorrência", "Meses Recorrência", "Estratégia"
    ]);
    var rowsProd = data.products.map(function(p) {
      return [
        p.id || "", p.name || "", p.category || "Geral", p.costPrice || p.cost_price || 0,
        p.salePrice || p.sale_price || 0, p.recurring ? "Sim" : "Não", p.recurrenceMonths || 12, p.strategy || "Nenhuma"
      ];
    });
    writeRowsToSheet(sheetProd, rowsProd);
  }

  if (Array.isArray(data.tasks)) {
    var sheetTasks = getOrCreateSheet(ss, "Tarefas_" + currentYear, [
      "ID", "Título", "Lead Relacionado", "Responsáveis", "Prazo", "Prioridade", "Concluído", "Data Criação"
    ]);
    var rowsTasks = data.tasks.map(function(t) {
      return [
        t.id || "", t.title || "", t.lead || "", Array.isArray(t.owners) ? t.owners.join(", ") : (t.owners || ""),
        t.due || "", t.priority || "media", t.done ? "Sim" : "Não", t.createdAt || ""
      ];
    });
    writeRowsToSheet(sheetTasks, rowsTasks);
  }

  var invData = Array.isArray(data.marketingInvestments) ? data.marketingInvestments : (Array.isArray(data.marketing_investments) ? data.marketing_investments : []);
  if (invData.length > 0) {
    var sheetInv = getOrCreateSheet(ss, "Investimentos_Marketing", [
      "ID", "Canal / Mídia", "Valor Investido (R$)", "Data Início", "Data Fim", "ID Landing Page / Campanha", "Descrição / Detalhes", "Data Lançamento"
    ]);
    var rowsInv = invData.map(function(inv) {
      return [
        inv.id || "", inv.channel || "Meta Ads", Number(inv.amount || 0),
        inv.start_date || inv.startDate || "", inv.end_date || inv.endDate || "",
        inv.landing_page_id || inv.landingPageId || "", inv.description || "", inv.createdAt || inv.created_at || ""
      ];
    });
    writeRowsToSheet(sheetInv, rowsInv);
  }

  if (Array.isArray(data.playbooks)) {
    var sheetPlaybooks = getOrCreateSheet(ss, "Playbooks", [
      "ID", "Título / Nome", "Tipo / Segmento", "Etapas (JSON)", "Perguntas de Qualificação (JSON)", "Critérios de Sucesso", "Data Criação", "Última Atualização"
    ]);
    var rowsPb = data.playbooks.map(function(pb) {
      return [
        pb.id || "", pb.title || pb.name || "", pb.type || pb.category || "Geral",
        JSON.stringify(pb.stages || []), JSON.stringify(pb.questions || []),
        pb.successCriteria || "", pb.createdAt || pb.created_at || "", pb.updatedAt || pb.updated_at || ""
      ];
    });
    writeRowsToSheet(sheetPlaybooks, rowsPb);
  }

  if (Array.isArray(data.pipelines)) {
    var sheetPipes = getOrCreateSheet(ss, "Pipelines_Config", [
      "ID", "Nome do Pipeline", "Código", "Função Comercial", "Cor", "Status", "Qtd Etapas", "Etapas e SLAs (JSON)"
    ]);
    var rowsPipes = data.pipelines.map(function(p) {
      return [
        p.id || "", p.name || "", p.code || "", p.functionRole || "", p.color || "",
        p.active !== false ? "Ativo" : "Inativo", Array.isArray(p.stages) ? p.stages.length : 0, JSON.stringify(p.stages || [])
      ];
    });
    writeRowsToSheet(sheetPipes, rowsPipes);
  }

  var histData = Array.isArray(data.historico_pipeline) ? data.historico_pipeline : (Array.isArray(data.pipelineHistory) ? data.pipelineHistory : []);
  if (histData.length > 0) {
    var sheetHist = getOrCreateSheet(ss, "Historico_Pipeline", [
      "ID Histórico", "ID Lead", "Nome Lead", "Funil Anterior", "Etapa Anterior", "Novo Funil", "Nova Etapa", "Responsável Anterior", "Novo Responsável", "Tipo Movimentação", "Usuário", "Data / Hora", "Observações"
    ]);
    var rowsHist = histData.map(function(h) {
      return [
        h.id || "", h.leadId || "", h.leadName || "", h.previousPipelineName || h.previousPipelineId || "",
        h.previousStage || "", h.newPipelineName || h.newPipelineId || "", h.newStage || "",
        h.previousOwner || "", h.newOwner || "", h.movementType || "", h.user || "", h.timestamp || "", h.note || ""
      ];
    });
    writeRowsToSheet(sheetHist, rowsHist);
  }
}

// =========================================================================
// CACHE SERVICE EM CHUNKS (SUPORTA BANCO COMPLETO ACIMA DE 100KB)
// =========================================================================
function getFromChunkedCache() {
  try {
    var cache = CacheService.getScriptCache();
    var metaRaw = cache.get(CACHE_META_KEY);
    if (!metaRaw) return null;
    var meta = JSON.parse(metaRaw);
    if (!meta || !meta.count || meta.count <= 0) return null;

    var keys = [];
    for (var i = 0; i < meta.count; i++) {
      keys.push(CACHE_CHUNK_PREFIX + i);
    }
    var map = cache.getAll(keys);
    var parts = [];
    for (var j = 0; j < keys.length; j++) {
      var chunk = map[keys[j]];
      if (chunk === undefined || chunk === null) {
        return null; // Algum chunk expirou
      }
      parts.push(chunk);
    }
    return parts.join("");
  } catch (e) {
    return null;
  }
}

function putToChunkedCache(valueStr, ttl) {
  try {
    if (!valueStr || typeof valueStr !== "string") return;
    var cache = CacheService.getScriptCache();
    var ttlSec = ttl || CACHE_TTL_SECONDS;
    var totalLen = valueStr.length;
    var count = Math.ceil(totalLen / CHUNK_CHAR_SIZE);
    if (count > MAX_CHUNKS) {
      return; // Excede limite máximo de 3MB em cache
    }
    var batch = {};
    for (var i = 0; i < count; i++) {
      var start = i * CHUNK_CHAR_SIZE;
      batch[CACHE_CHUNK_PREFIX + i] = valueStr.substring(start, start + CHUNK_CHAR_SIZE);
    }
    batch[CACHE_META_KEY] = JSON.stringify({ count: count, length: totalLen, ts: new Date().getTime() });
    cache.putAll(batch, ttlSec);
  } catch (e) {}
}

function invalidateDatabaseCache() {
  try {
    var cache = CacheService.getScriptCache();
    var keys = [CACHE_META_KEY, "SALEAD_DATABASE_ROOT_CACHE"];
    for (var i = 0; i < MAX_CHUNKS; i++) {
      keys.push(CACHE_CHUNK_PREFIX + i);
    }
    cache.removeAll(keys);
  } catch (e) {}
}

// =========================================================================
// SEGURANÇA, DRIVE FOLDERS, SHEETS BATCH HELPERS E BACKUP DIÁRIO
// =========================================================================
function validateSecurityToken(e, payload) {
  var scriptSecret = PropertiesService.getScriptProperties().getProperty("API_SECRET") || "";
  if (!scriptSecret) {
    return { valid: true };
  }
  var providedToken = "";
  if (payload && (payload.apiToken || payload.token)) {
    providedToken = String(payload.apiToken || payload.token).trim();
  } else if (e && e.parameter && (e.parameter.apiToken || e.parameter.token || e.parameter.access_token)) {
    providedToken = String(e.parameter.apiToken || e.parameter.token || e.parameter.access_token).trim();
  }
  if (providedToken && providedToken === scriptSecret) {
    return { valid: true };
  }
  return { valid: false, error: "Acesso não autorizado: Token de segurança (API Secret) ausente ou inválido." };
}

function writeRowsToSheet(sheet, rows) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn() || (rows && rows[0] ? rows[0].length : 1);
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  if (rows && rows.length > 0 && rows[0] && rows[0].length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function updateLandingPageLeadCount(ss, lpId, lpTitle) {
  try {
    var lpSheet = ss.getSheetByName("Landing_Pages");
    if (lpSheet) {
      var data = lpSheet.getDataRange().getValues();
      var headersL = (data[0] || []).map(function(h) {
        return String(h || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
      });
      var idxVisits = headersL.indexOf("visitas") !== -1 ? headersL.indexOf("visitas") : 4;
      var idxLeads = headersL.indexOf("leads capturados") !== -1 ? headersL.indexOf("leads capturados") : 5;
      var idxConv = headersL.indexOf("taxa conv (%)") !== -1 ? headersL.indexOf("taxa conv (%)") : 6;
      var idxUpdated = headersL.indexOf("ultima atualizacao") !== -1 ? headersL.indexOf("ultima atualizacao") : (data[0] && data[0].length >= 16 ? 15 : 10);

      for (var i = 1; i < data.length; i++) {
        var rowId = String(data[i][0] || "");
        var rowTitle = String(data[i][1] || "");
        var rowSlug = String(data[i][2] || "");
        if ((lpId && (rowId === String(lpId) || rowSlug === String(lpId))) || (lpTitle && rowTitle === String(lpTitle))) {
          var currentLeads = Number(data[i][idxLeads] || 0) + 1;
          var currentVisits = Number(data[i][idxVisits] || 0);
          if (currentVisits < currentLeads) currentVisits = currentLeads;
          var newConv = currentVisits > 0 ? Math.round((currentLeads / currentVisits) * 100) : 0;
          data[i][idxVisits] = currentVisits;
          data[i][idxLeads] = currentLeads;
          data[i][idxConv] = newConv + "%";
          if (idxUpdated < data[i].length) {
            data[i][idxUpdated] = new Date().toISOString();
          }
          lpSheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
          break;
        }
      }
    }
  } catch(e) {}
}

function getOrCreateSpreadsheet(folder, customSpreadsheetId) {
  if (customSpreadsheetId) {
    try {
      if (String(customSpreadsheetId).indexOf("docs.google.com") !== -1) {
        return SpreadsheetApp.openByUrl(String(customSpreadsheetId));
      }
      return SpreadsheetApp.openById(String(customSpreadsheetId));
    } catch (eCustom) {}
  }

  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) return activeSs;
  } catch (eActive) {}

  try {
    var files = folder.getFilesByName(SPREADSHEET_BASE_NAME);
    if (files.hasNext()) return SpreadsheetApp.openById(files.next().getId());
    var sheetFiles = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    if (sheetFiles.hasNext()) return SpreadsheetApp.openById(sheetFiles.next().getId());
  } catch (eSearch) {}

  if (DEFAULT_SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(String(DEFAULT_SPREADSHEET_ID));
    } catch (eDef) {}
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
  if (headers) {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      var range = sheet.getRange(1, 1, 1, headers.length);
      range.setFontWeight("bold");
      range.setBackground("#0F172A");
      range.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    } else if (sheet.getLastColumn() < headers.length) {
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0F172A");
      headerRange.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function buildSafeSurveySheetName(surveyName) {
  var clean = (surveyName || "Pesquisa")
    .replace(/[:\\/?*[\\]]/g, "-")
    .trim();
  if (clean.length > 24) clean = clean.substring(0, 24);
  return "Pesq - " + clean;
}

function mergeDatabaseObjects(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  var result = Object.assign({}, incoming);
  for (var key in existing) {
    if (incoming[key] === undefined) {
      result[key] = existing[key];
    }
  }
  if (Array.isArray(result.landingPages)) {
    result.landingPages = result.landingPages.map(normalizeLandingPageModel);
  }
  if (result.activePreviewPage) {
    result.activePreviewPage = normalizeLandingPageModel(result.activePreviewPage);
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

function jsonResponse(obj, statusCode) {
  var isErr = obj && (obj.status === "error" || obj.status === "unauthorized");
  var isBusy = obj && obj.status === "busy";
  var code = statusCode || (obj && obj.statusCode ? obj.statusCode : (isBusy ? 429 : (isErr ? 400 : 200)));
  var response = Object.assign({
    success: !isErr && !isBusy,
    status: isErr ? (obj.status || "error") : (isBusy ? "busy" : "success"),
    statusCode: code,
    timestamp: new Date().toISOString()
  }, obj);
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  var pad = function(n) { return n < 10 ? "0" + n : n; };
  return pad(date.getDate()) + "-" + pad(date.getMonth() + 1) + "-" + date.getFullYear() + "-" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}
`;
