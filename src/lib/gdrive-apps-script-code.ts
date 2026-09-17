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

    // 3b. REGISTRAR VISITA VIA GET (Suporte universal sem restrição de CORS em qualquer navegador)
    if (action === "RECORD_LP_VISIT" || action === "INCREMENT_LP_VISIT" || action === "lp_visit") {
      var getLpId = params.lpId || params.id || params.pageId || params.slug;
      var getLpTitle = params.landingPageTitle || params.pageTitle || params.title;
      var ssVisit = getOrCreateSpreadsheet(folder);
      var lpVisits = 1;
      var lpConv = 0;

      var sheetLp = ssVisit.getSheetByName("Landing_Pages");
      if (sheetLp) {
        var vData = sheetLp.getDataRange().getValues();
        for (var vi = 1; vi < vData.length; vi++) {
          var rId = String(vData[vi][0] || "");
          var rTitle = String(vData[vi][1] || "");
          var rSlug = String(vData[vi][2] || "");
          if ((getLpId && (rId === String(getLpId) || rSlug === String(getLpId))) || (getLpTitle && rTitle === String(getLpTitle))) {
            var currVisits = Number(vData[vi][4] || 0) + 1;
            var currLeads = Number(vData[vi][5] || 0);
            lpVisits = currVisits;
            lpConv = currVisits > 0 ? Math.round((currLeads / currVisits) * 100) : 0;
            sheetLp.getRange(vi + 1, 5).setValue(currVisits);
            sheetLp.getRange(vi + 1, 7).setValue(lpConv + "%");
            break;
          }
        }
      }

      try {
        var rFs = folder.getFilesByName(ROOT_FILE_NAME);
        if (rFs.hasNext()) {
          var rFileItem = rFs.next();
          var dbRootObj = JSON.parse(rFileItem.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbRootObj.landingPages)) {
            dbRootObj.landingPages.forEach(function(lp) {
              if (lp.id === getLpId || lp.slug === getLpId || (getLpTitle && lp.title === getLpTitle)) {
                lp.visits = (Number(lp.visits) || 0) + 1;
                lp.viewsCount = lp.visits;
                lp.views_count = lp.visits;
                var leads = Number(lp.leads || lp.leads_count) || 0;
                lp.conv = Math.round((leads / lp.visits) * 100);
                lpVisits = lp.visits;
                lpConv = lp.conv;
              }
            });
            var delF = folder.getFilesByName(ROOT_FILE_NAME);
            while (delF.hasNext()) { delF.next().setTrashed(true); }
            folder.createFile(ROOT_FILE_NAME, JSON.stringify(dbRootObj, null, 2), MimeType.PLAIN_TEXT);
          }
        }
      } catch (eGetVisit) {}

      return jsonResponse({
        status: "success",
        visits: lpVisits,
        conv: lpConv,
        message: "Visita computada com sucesso no Sheets!"
      });
    }

    // 4. GET PADRÃO (RETORNA O BANCO COMPLETO E MERGEC COM ABA LANDING_PAGES)
    var dbData = {};
    var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
    if (rootFiles.hasNext()) {
      var rootFile = rootFiles.next();
      try {
        dbData = JSON.parse(rootFile.getBlob().getDataAsString("UTF-8")) || {};
      } catch (eDb) {}
    }

    // Mescla dados das abas do Google Sheets caso o usuário tenha adicionado/editado abas diretamente
    try {
      var ss = getOrCreateSpreadsheet(folder);

      // 1. Aba Landing_Pages
      var lpSheet = ss.getSheetByName("Landing_Pages");
      if (lpSheet) {
        var lpValues = lpSheet.getDataRange().getValues();
        if (lpValues && lpValues.length > 1) {
          var sheetLps = [];
          for (var rowIdx = 1; rowIdx < lpValues.length; rowIdx++) {
            var r = lpValues[rowIdx];
            if (!r || (!r[0] && !r[1])) continue;
            var rId = String(r[0] || "");
            var rTitle = String(r[1] || "");
            var rSlug = String(r[2] || "");

            sheetLps.push({
              id: rId || ("lp_sheet_" + rowIdx),
              title: rTitle || "Landing Page",
              name: rTitle || "Landing Page",
              slug: rSlug || rTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              status: String(r[3] || "Ativa"),
              visits: Number(r[4] || 0),
              leads: Number(r[5] || 0),
              conv: Number(String(r[6] || "0").replace("%", "")) || 0,
              type: String(r[7] || "COMET CRO"),
              sector: String(r[8] || "Geral"),
              created_at: String(r[9] || ""),
              updated_at: String(r[10] || "")
            });
          }
          if (sheetLps.length > 0) {
            dbData.landingPages = sheetLps;
          }
        }
      }

      // 2. Aba Leads (Tabela Principal)
      var leadsSheet = ss.getSheetByName("Leads");
      if (leadsSheet) {
        var lValues = leadsSheet.getDataRange().getValues();
        if (lValues && lValues.length > 1) {
          if (!Array.isArray(dbData.leads)) dbData.leads = [];
          var existingLeadKeys = {};
          dbData.leads.forEach(function(item) {
            if (item && item.id) existingLeadKeys[String(item.id)] = true;
          });

          for (var li = 1; li < lValues.length; li++) {
            var lr = lValues[li];
            if (!lr || (!lr[0] && !lr[1] && !lr[3])) continue;
            var leadId = String(lr[0] || ("lead_sheet_" + li));
            var leadName = String(lr[1] || "").trim();
            var leadCompany = String(lr[2] || "").trim();
            var leadEmail = String(lr[3] || "").trim();
            var leadWhatsapp = String(lr[4] || "").trim();
            var leadValue = Number(lr[5]) || 0;
            var leadStage = String(lr[6] || "Leads").trim();
            var leadOwner = String(lr[7] || "").trim();
            var leadTemp = String(lr[8] || "Quente").trim();
            var leadSource = String(lr[9] || "Google Sheets").trim();
            var leadScore = Number(lr[10]) || 85;
            var leadTags = Array.isArray(lr[11]) ? lr[11] : (lr[11] ? String(lr[11]).split(",").map(function(t){ return t.trim(); }).filter(Boolean) : ["Planilha"]);
            var leadCreatedAt = lr[12] ? (typeof lr[12].toISOString === "function" ? lr[12].toISOString() : String(lr[12])) : new Date().toISOString();
            var leadLastInter = String(lr[13] || "Importado da Planilha");

            if (!existingLeadKeys[leadId]) {
              existingLeadKeys[leadId] = true;
              dbData.leads.push({
                id: leadId,
                name: leadName || "Lead Planilha",
                company: leadCompany || (leadName ? leadName + " (Planilha)" : "Empresa"),
                email: leadEmail,
                whatsapp: leadWhatsapp,
                value: leadValue,
                stage: leadStage,
                owner: leadOwner,
                temperature: leadTemp,
                source: leadSource,
                score: leadScore,
                tags: leadTags,
                createdAt: leadCreatedAt,
                lastInteraction: leadLastInter
              });
            }
          }
        }
      }

      // 2b. Aba Leads_LandingPages (Capturas diretas de LP)
      var lpLeadsSheet = ss.getSheetByName("Leads_LandingPages");
      if (lpLeadsSheet) {
        var lpLValues = lpLeadsSheet.getDataRange().getValues();
        if (lpLValues && lpLValues.length > 1) {
          if (!Array.isArray(dbData.leads)) dbData.leads = [];
          var existingLpLeadKeys = {};
          dbData.leads.forEach(function(item) {
            if (item && item.id) existingLpLeadKeys[String(item.id)] = true;
          });

          for (var lpi = 1; lpi < lpLValues.length; lpi++) {
            var lpr = lpLValues[lpi];
            if (!lpr || (!lpr[1] && !lpr[4] && !lpr[6])) continue;
            var lpLeadId = String(lpr[1] || ("lead_lp_sheet_" + lpi));
            var lpDate = lpr[0] ? (typeof lpr[0].toISOString === "function" ? lpr[0].toISOString() : String(lpr[0])) : new Date().toISOString();
            var lpTitle = String(lpr[2] || "Landing Page").trim();
            var lpPageId = String(lpr[3] || "").trim();
            var lpName = String(lpr[4] || "").trim();
            var lpWhatsapp = String(lpr[5] || "").trim();
            var lpEmail = String(lpr[6] || "").trim();
            var lpCompany = String(lpr[7] || "").trim();
            var lpSource = String(lpr[8] || "Landing Page").trim();

            if (!existingLpLeadKeys[lpLeadId]) {
              existingLpLeadKeys[lpLeadId] = true;
              dbData.leads.push({
                id: lpLeadId,
                name: lpName || "Lead LP",
                company: lpCompany || (lpName ? lpName + " (LP: " + lpTitle + ")" : "Empresa"),
                email: lpEmail,
                whatsapp: lpWhatsapp,
                value: 0,
                stage: "Leads",
                owner: "",
                temperature: "Quente",
                source: lpSource,
                score: 85,
                tags: ["LP", lpTitle],
                createdAt: lpDate,
                lastInteraction: "Capturado via LP: " + lpTitle
              });
            }
          }
        }
      }

      // 3. Aba Produtos
      var pSheet = ss.getSheetByName("Produtos");
      if (pSheet) {
        var pValues = pSheet.getDataRange().getValues();
        if (pValues && pValues.length > 1) {
          if (!Array.isArray(dbData.products)) dbData.products = [];
          var existingPKeys = {};
          dbData.products.forEach(function(item) {
            if (item && item.id) existingPKeys[String(item.id)] = true;
            if (item && item.name) existingPKeys[String(item.name).toLowerCase()] = true;
          });

          for (var pi = 1; pi < pValues.length; pi++) {
            var pr = pValues[pi];
            if (!pr || (!pr[0] && !pr[1])) continue;
            var prId = String(pr[0] || "");
            var prName = String(pr[1] || "");

            var alreadyPInJson = Boolean(
              (prId && existingPKeys[prId]) ||
              (prName && existingPKeys[prName.toLowerCase()])
            );

            if (!alreadyPInJson) {
              dbData.products.push({
                id: prId || ("prod_sheet_" + pi),
                name: prName || "Produto",
                category: String(pr[2] || "Geral"),
                price: Number(pr[3]) || 0,
                billingPeriod: String(pr[4] || "Único"),
                status: String(pr[5] || "Ativo")
              });
            }
          }
        }
      }

      // 4. Aba Investimentos_Marketing
      var invSheet = ss.getSheetByName("Investimentos_Marketing");
      if (invSheet) {
        var invValues = invSheet.getDataRange().getValues();
        if (invValues && invValues.length > 1) {
          if (!Array.isArray(dbData.marketing_investments)) dbData.marketing_investments = [];
          var existingInvKeys = {};
          dbData.marketing_investments.forEach(function(item) {
            if (item && item.id) existingInvKeys[String(item.id)] = true;
          });

          for (var invI = 1; invI < invValues.length; invI++) {
            var invR = invValues[invI];
            if (!invR || (!invR[0] && !invR[1])) continue;
            var invId = String(invR[0] || ("inv_sheet_" + invI));

            if (!existingInvKeys[invId]) {
              existingInvKeys[invId] = true;
              dbData.marketing_investments.push({
                id: invId,
                channel: String(invR[1] || "Geral"),
                amount: Number(invR[2]) || 0,
                start_date: invR[3] ? (typeof invR[3].toISOString === "function" ? invR[3].toISOString() : String(invR[3])) : "",
                end_date: invR[4] ? (typeof invR[4].toISOString === "function" ? invR[4].toISOString() : String(invR[4])) : "",
                landing_page_id: String(invR[5] || ""),
                description: String(invR[6] || ""),
                createdAt: invR[7] ? (typeof invR[7].toISOString === "function" ? invR[7].toISOString() : String(invR[7])) : new Date().toISOString()
              });
            }
          }
        }
      }

      // 5. Aba Playbooks
      var pbSheet = ss.getSheetByName("Playbooks");
      if (pbSheet) {
        var pbValues = pbSheet.getDataRange().getValues();
        if (pbValues && pbValues.length > 1) {
          if (!Array.isArray(dbData.playbooks)) dbData.playbooks = [];
          var existingPbKeys = {};
          dbData.playbooks.forEach(function(item) {
            if (item && item.id) existingPbKeys[String(item.id)] = true;
          });

          for (var pbi = 1; pbi < pbValues.length; pbi++) {
            var pbr = pbValues[pbi];
            if (!pbr || (!pbr[0] && !pbr[1])) continue;
            var pbId = String(pbr[0] || ("pb_sheet_" + pbi));

            if (!existingPbKeys[pbId]) {
              existingPbKeys[pbId] = true;
              var parsedStages = [];
              try { parsedStages = JSON.parse(pbr[3]); } catch (e) { parsedStages = []; }
              var parsedQuestions = [];
              try { parsedQuestions = JSON.parse(pbr[4]); } catch (e) { parsedQuestions = []; }

              dbData.playbooks.push({
                id: pbId,
                title: String(pbr[1] || "Playbook"),
                type: String(pbr[2] || "Geral"),
                stages: parsedStages,
                questions: parsedQuestions,
                successCriteria: String(pbr[5] || ""),
                createdAt: pbr[6] ? (typeof pbr[6].toISOString === "function" ? pbr[6].toISOString() : String(pbr[6])) : new Date().toISOString(),
                updatedAt: pbr[7] ? (typeof pbr[7].toISOString === "function" ? pbr[7].toISOString() : String(pbr[7])) : new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (eSheetMerge) {}

    return ContentService.createTextOutput(JSON.stringify(dbData))
      .setMimeType(ContentService.MimeType.JSON);
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
    // AÇÃO: FORÇAR LEITURA DE TODAS AS ABAS DO SHEETS E SINCRONIZAR TUDO
    // =========================================================================
    if (action === "FORCE_READ_SHEETS" || action === "RECOVER_FROM_SHEETS" || action === "force_read") {
      var forcedData = {};
      var rFiles = folder.getFilesByName(ROOT_FILE_NAME);
      if (rFiles.hasNext()) {
        try { forcedData = JSON.parse(rFiles.next().getBlob().getDataAsString("UTF-8")) || {}; } catch (eF) { forcedData = {}; }
      }
      if (!Array.isArray(forcedData.leads)) forcedData.leads = [];
      if (!Array.isArray(forcedData.landingPages)) forcedData.landingPages = [];
      if (!Array.isArray(forcedData.surveys)) forcedData.surveys = [];
      if (!Array.isArray(forcedData.surveyResponses)) forcedData.surveyResponses = [];
      if (!Array.isArray(forcedData.products)) forcedData.products = [];
      if (!Array.isArray(forcedData.tasks)) forcedData.tasks = [];
      if (!Array.isArray(forcedData.playbooks)) forcedData.playbooks = [];

      var allSheets = spreadsheet.getSheets();

      // Função utilitária para normalizar nomes de cabeçalhos
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

        // A. Aba de Landing Pages
        if (sNameNorm.indexOf("landing") !== -1 || sNameNorm.indexOf("pagina") !== -1 || sNameNorm === "lps") {
          var lpKeys = {};
          forcedData.landingPages.forEach(function(p) { if (p && p.id) lpKeys[String(p.id)] = true; if (p && p.slug) lpKeys[String(p.slug)] = true; });

          var colId = headersNorm.indexOf("id");
          var colTitle = headersNorm.indexOf("titulo") !== -1 ? headersNorm.indexOf("titulo") : (headersNorm.indexOf("nome") !== -1 ? headersNorm.indexOf("nome") : 1);
          var colSlug = headersNorm.indexOf("slug") !== -1 ? headersNorm.indexOf("slug") : 2;
          var colStatus = headersNorm.indexOf("status") !== -1 ? headersNorm.indexOf("status") : 3;
          var colVisits = headersNorm.indexOf("visitas") !== -1 ? headersNorm.indexOf("visitas") : (headersNorm.indexOf("visualizacoes") !== -1 ? headersNorm.indexOf("visualizacoes") : 4);
          var colLeads = headersNorm.indexOf("conversoes") !== -1 ? headersNorm.indexOf("conversoes") : (headersNorm.indexOf("leads") !== -1 ? headersNorm.indexOf("leads") : 5);
          var colConv = headersNorm.indexOf("taxa conversao") !== -1 ? headersNorm.indexOf("taxa conversao") : (headersNorm.indexOf("taxa") !== -1 ? headersNorm.indexOf("taxa") : 6);

          for (var rIdx = 1; rIdx < sValues.length; rIdx++) {
            var row = sValues[rIdx];
            if (!row || (!row[0] && !row[colTitle])) continue;
            var pId = String((colId !== -1 ? row[colId] : row[0]) || ("lp_sheet_" + rIdx));
            var pTitle = String(row[colTitle] || "Landing Page");
            var pSlug = String((colSlug !== -1 ? row[colSlug] : "") || pTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
            var pVisits = Number((colVisits !== -1 ? row[colVisits] : row[4]) || 0);
            var pLeads = Number((colLeads !== -1 ? row[colLeads] : row[5]) || 0);
            var pConv = Number(String((colConv !== -1 ? row[colConv] : row[6]) || "0").replace("%", "")) || (pVisits > 0 ? Math.round((pLeads / pVisits) * 100) : 0);

            var existingIndex = forcedData.landingPages.findIndex(function(p) { return p.id === pId || (pSlug && p.slug === pSlug); });
            var pageObj = {
              id: pId,
              title: pTitle,
              name: pTitle,
              slug: pSlug,
              status: String((colStatus !== -1 ? row[colStatus] : row[3]) || "Ativa"),
              visits: pVisits,
              viewsCount: pVisits,
              views_count: pVisits,
              leads: pLeads,
              leads_count: pLeads,
              conv: pConv,
              type: "COMET CRO",
              updated_at: new Date().toISOString()
            };

            if (existingIndex !== -1) {
              forcedData.landingPages[existingIndex] = Object.assign({}, forcedData.landingPages[existingIndex], pageObj, {
                visits: Math.max(Number(forcedData.landingPages[existingIndex].visits || 0), pVisits),
                leads: Math.max(Number(forcedData.landingPages[existingIndex].leads || 0), pLeads)
              });
            } else {
              forcedData.landingPages.push(pageObj);
            }
          }
          continue;
        }

        // B. Aba de Leads de Landing Pages específicas
        if (sNameNorm.indexOf("leads_landing") !== -1 || sNameNorm === "leads_lps") {
          var lpLeadKeys = {};
          forcedData.leads.forEach(function(l) { if (l && l.id) lpLeadKeys[String(l.id)] = true; });

          for (var flpi = 1; flpi < sValues.length; flpi++) {
            var flpr = sValues[flpi];
            if (!flpr || (!flpr[1] && !flpr[4] && !flpr[6])) continue;
            var fLpId = String(flpr[1] || ("lead_lp_sheet_" + flpi));
            if (!lpLeadKeys[fLpId]) {
              lpLeadKeys[fLpId] = true;
              var flpName = String(flpr[4] || "").trim();
              var flpTitle = String(flpr[2] || "Landing Page").trim();
              forcedData.leads.push({
                id: fLpId,
                name: flpName || "Lead LP",
                company: String(flpr[7] || (flpName ? flpName + " (LP: " + flpTitle + ")" : "Empresa")).trim(),
                email: String(flpr[6] || "").trim(),
                whatsapp: String(flpr[5] || "").trim(),
                value: 0,
                stage: "Leads",
                owner: "",
                temperature: "Quente",
                source: String(flpr[8] || "Landing Page").trim(),
                score: 85,
                tags: ["LP", flpTitle],
                createdAt: flpr[0] ? (typeof flpr[0].toISOString === "function" ? flpr[0].toISOString() : String(flpr[0])) : new Date().toISOString(),
                lastInteraction: "Capturado via LP: " + flpTitle
              });
            }
          }
          continue;
        }

        // C. Aba de Leads Principal ou Qualquer aba com colunas de contatos
        var isLeadSheet = sNameNorm.indexOf("lead") !== -1 || sNameNorm.indexOf("cliente") !== -1 || sNameNorm.indexOf("contato") !== -1 || headersNorm.indexOf("whatsapp") !== -1 || headersNorm.indexOf("telefone") !== -1;
        if (isLeadSheet) {
          var fKeys = {};
          forcedData.leads.forEach(function(l) { if (l && l.id) fKeys[String(l.id)] = true; });

          var cId = headersNorm.indexOf("id") !== -1 ? headersNorm.indexOf("id") : 0;
          var cNome = headersNorm.indexOf("nome") !== -1 ? headersNorm.indexOf("nome") : (headersNorm.indexOf("name") !== -1 ? headersNorm.indexOf("name") : (headersNorm.indexOf("contato") !== -1 ? headersNorm.indexOf("contato") : 1));
          var cEmpresa = headersNorm.indexOf("empresa") !== -1 ? headersNorm.indexOf("empresa") : (headersNorm.indexOf("company") !== -1 ? headersNorm.indexOf("company") : 2);
          var cEmail = headersNorm.indexOf("email") !== -1 ? headersNorm.indexOf("email") : (headersNorm.indexOf("e-mail") !== -1 ? headersNorm.indexOf("e-mail") : 3);
          var cWhats = headersNorm.indexOf("whatsapp") !== -1 ? headersNorm.indexOf("whatsapp") : (headersNorm.indexOf("telefone") !== -1 ? headersNorm.indexOf("telefone") : (headersNorm.indexOf("phone") !== -1 ? headersNorm.indexOf("phone") : 4));
          var cValor = headersNorm.indexOf("valor") !== -1 ? headersNorm.indexOf("valor") : (headersNorm.indexOf("value") !== -1 ? headersNorm.indexOf("value") : 5);
          var cEtapa = headersNorm.indexOf("fase / etapa") !== -1 ? headersNorm.indexOf("fase / etapa") : (headersNorm.indexOf("etapa") !== -1 ? headersNorm.indexOf("etapa") : (headersNorm.indexOf("stage") !== -1 ? headersNorm.indexOf("stage") : 6));
          var cResp = headersNorm.indexOf("responsavel") !== -1 ? headersNorm.indexOf("responsavel") : (headersNorm.indexOf("owner") !== -1 ? headersNorm.indexOf("owner") : 7);
          var cTemp = headersNorm.indexOf("temperatura") !== -1 ? headersNorm.indexOf("temperatura") : (headersNorm.indexOf("temperature") !== -1 ? headersNorm.indexOf("temperature") : 8);
          var cOrigem = headersNorm.indexOf("origem") !== -1 ? headersNorm.indexOf("origem") : (headersNorm.indexOf("source") !== -1 ? headersNorm.indexOf("source") : 9);
          var cScore = headersNorm.indexOf("score") !== -1 ? headersNorm.indexOf("score") : 10;
          var cTags = headersNorm.indexOf("tags") !== -1 ? headersNorm.indexOf("tags") : 11;
          var cData = headersNorm.indexOf("data cadastro") !== -1 ? headersNorm.indexOf("data cadastro") : (headersNorm.indexOf("data / hora") !== -1 ? headersNorm.indexOf("data / hora") : (headersNorm.indexOf("data") !== -1 ? headersNorm.indexOf("data") : 12));

          for (var fli = 1; fli < sValues.length; fli++) {
            var flr = sValues[fli];
            if (!flr || (!flr[cId] && !flr[cNome] && !flr[cWhats] && !flr[cEmail])) continue;
            var fId = String((cId !== -1 ? flr[cId] : flr[0]) || ("lead_" + sNameNorm + "_" + fli));
            if (!fKeys[fId]) {
              fKeys[fId] = true;
              var fName = String((cNome !== -1 ? flr[cNome] : flr[1]) || "").trim();
              forcedData.leads.push({
                id: fId,
                name: fName || "Lead Planilha",
                company: String((cEmpresa !== -1 ? flr[cEmpresa] : flr[2]) || (fName ? fName + " (" + sName + ")" : "Empresa")).trim(),
                email: String((cEmail !== -1 ? flr[cEmail] : flr[3]) || "").trim(),
                whatsapp: String((cWhats !== -1 ? flr[cWhats] : flr[4]) || "").trim(),
                value: Number((cValor !== -1 ? flr[cValor] : flr[5])) || 0,
                stage: String((cEtapa !== -1 ? flr[cEtapa] : flr[6]) || "Leads").trim(),
                owner: String((cResp !== -1 ? flr[cResp] : flr[7]) || "").trim(),
                temperature: String((cTemp !== -1 ? flr[cTemp] : flr[8]) || "Quente").trim(),
                source: String((cOrigem !== -1 ? flr[cOrigem] : flr[9]) || sName).trim(),
                score: Number((cScore !== -1 ? flr[cScore] : flr[10])) || 85,
                tags: (cTags !== -1 && flr[cTags]) ? (Array.isArray(flr[cTags]) ? flr[cTags] : String(flr[cTags]).split(",").map(function(t){ return t.trim(); }).filter(Boolean)) : [sName],
                createdAt: (cData !== -1 && flr[cData]) ? (typeof flr[cData].toISOString === "function" ? flr[cData].toISOString() : String(flr[cData])) : new Date().toISOString(),
                lastInteraction: "Importado da aba [" + sName + "]"
              });
            }
          }
        }
      }

      // Atualiza o JSON raiz no Drive com os dados consolidados
      var fDel = folder.getFilesByName(ROOT_FILE_NAME);
      while (fDel.hasNext()) { fDel.next().setTrashed(true); }
      folder.createFile(ROOT_FILE_NAME, JSON.stringify(forcedData, null, 2), MimeType.PLAIN_TEXT);

      return jsonResponse({
        status: "success",
        message: "Todas as abas da planilha foram lidas com sucesso! " + forcedData.leads.length + " leads e " + forcedData.landingPages.length + " páginas sincronizados.",
        leadsCount: forcedData.leads.length,
        pagesCount: forcedData.landingPages.length,
        spreadsheetName: spreadsheet.getName(),
        spreadsheetUrl: spreadsheet.getUrl(),
        data: forcedData
      });
    }

    // =========================================================================
    // REGISTRAR VISITA DE LANDING PAGE
    // =========================================================================
    if (action === "RECORD_LP_VISIT" || action === "INCREMENT_LP_VISIT" || action === "lp_visit") {
      var targetId = payload.lpId || payload.id || payload.pageId || payload.slug;
      var targetTitle = payload.landingPageTitle || payload.pageTitle || payload.title;
      var newVisits = 1;
      var newConv = 0;

      var lpSheet = spreadsheet.getSheetByName("Landing_Pages");
      if (lpSheet) {
        var data = lpSheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          var rowId = String(data[i][0] || "");
          var rowTitle = String(data[i][1] || "");
          var rowSlug = String(data[i][2] || "");
          if ((targetId && (rowId === String(targetId) || rowSlug === String(targetId))) || (targetTitle && rowTitle === String(targetTitle))) {
            var currentVisits = Number(data[i][4] || 0) + 1;
            var currentLeads = Number(data[i][5] || 0);
            newVisits = currentVisits;
            newConv = currentVisits > 0 ? Math.round((currentLeads / currentVisits) * 100) : 0;
            lpSheet.getRange(i + 1, 5).setValue(currentVisits);
            lpSheet.getRange(i + 1, 7).setValue(newConv + "%");
            break;
          }
        }
      }

      // Atualiza também no ROOT_FILE_NAME (JSON no Drive)
      try {
        var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
        if (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          var dbObj = JSON.parse(rf.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbObj.landingPages)) {
            dbObj.landingPages.forEach(function(lp) {
              if (lp.id === targetId || lp.slug === targetId || (targetTitle && lp.title === targetTitle)) {
                lp.visits = (Number(lp.visits) || 0) + 1;
                lp.viewsCount = lp.visits;
                lp.views_count = lp.visits;
                var leads = Number(lp.leads || lp.leads_count) || 0;
                lp.conv = Math.round((leads / lp.visits) * 100);
                newVisits = lp.visits;
                newConv = lp.conv;
              }
            });
            var toDel = folder.getFilesByName(ROOT_FILE_NAME);
            while (toDel.hasNext()) { toDel.next().setTrashed(true); }
            folder.createFile(ROOT_FILE_NAME, JSON.stringify(dbObj, null, 2), MimeType.PLAIN_TEXT);
          }
        }
      } catch (eDb) {}

      return jsonResponse({
        status: "success",
        visits: newVisits,
        conv: newConv,
        message: "Visita registrada com sucesso na planilha!"
      });
    }
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

      // 3. Grava também o participante na aba principal de Leads do Google Sheets
      if (sr.leadName || sr.leadWhatsapp || sr.leadEmail) {
        try {
          var leadsSheet = getOrCreateSheet(spreadsheet, "Leads", [
            "ID", "Nome", "Empresa", "Email", "WhatsApp", "Valor", "Fase / Etapa", "Responsável", "Temperatura", "Origem", "Score", "Tags", "Data Cadastro", "Última Interação"
          ]);
          var srvLeadId = "lead_srv_" + now.getTime() + "_" + Math.random().toString(36).substring(2, 6);
          leadsSheet.appendRow([
            srvLeadId,
            sr.leadName || "",
            sr.leadCompany || "",
            sr.leadEmail || "",
            sr.leadWhatsapp || "",
            sr.temperature === "Quente" ? 8500 : 3500,
            sr.temperature === "Quente" ? "Oportunidade" : "Leads",
            "",
            sr.temperature || "Morno",
            "Pesquisa: " + surveyName,
            sr.score || 0,
            "Pesquisa, " + surveyName,
            dateFormatted,
            "Respondeu Pesquisa: " + surveyName + " (Score: " + (sr.score || 0) + ")"
          ]);
        } catch (eLd) {}
      }

      // 4. Atualiza contador no JSON raiz
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
    // AÇÃO: EXCLUIR LANDING PAGE(S) DO GOOGLE DRIVE E SHEETS
    // =========================================================================
    if (action === "DELETE_LANDING_PAGE" || action === "DELETE_LP" || action === "DELETE_MULTIPLE_LANDING_PAGES") {
      var rawIds = payload.ids || (payload.landingPageId ? [payload.landingPageId] : (payload.pageId ? [payload.pageId] : []));
      var targetIds = Array.isArray(rawIds) ? rawIds.map(String) : [String(rawIds)];
      var targetTitle = payload.landingPageTitle || payload.pageTitle || "";
      var targetSlug = payload.slug || "";
      var idSet = {};
      targetIds.forEach(function(id) { if (id) idSet[id] = true; });

      // 1. Remove linha(s) da aba Landing_Pages do Google Sheets
      var lpSheet = spreadsheet.getSheetByName("Landing_Pages");
      if (lpSheet) {
        var lpData = lpSheet.getDataRange().getValues();
        for (var i = lpData.length - 1; i >= 1; i--) {
          var rowId = String(lpData[i][0] || "");
          var rowTitle = String(lpData[i][1] || "");
          var rowSlug = String(lpData[i][2] || "");
          var shouldDelete = Boolean(
            (rowId && idSet[rowId]) ||
            (targetTitle && rowTitle.toLowerCase() === String(targetTitle).toLowerCase()) ||
            (targetSlug && rowSlug.toLowerCase() === String(targetSlug).toLowerCase())
          );
          if (shouldDelete) {
            lpSheet.deleteRow(i + 1);
          }
        }
      }

      // 2. Remove leads relacionados na aba Leads_LandingPages se solicitado ou por ID/Título
      var leadsLpSheet = spreadsheet.getSheetByName("Leads_LandingPages");
      if (leadsLpSheet) {
        var lData = leadsLpSheet.getDataRange().getValues();
        for (var li = lData.length - 1; li >= 1; li--) {
          var rLpTitle = String(lData[li][2] || "");
          var rLpId = String(lData[li][3] || "");
          var isMatch = Boolean(
            (rLpId && idSet[rLpId]) ||
            (targetTitle && rLpTitle.toLowerCase() === String(targetTitle).toLowerCase())
          );
          if (isMatch) {
            leadsLpSheet.deleteRow(li + 1);
          }
        }
      }

      // 3. Atualiza JSON raiz no Drive
      var updatedLpList = [];
      try {
        var rootFiles = folder.getFilesByName(ROOT_FILE_NAME);
        if (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          var db = JSON.parse(rf.getBlob().getDataAsString("UTF-8")) || {};
          
          if (Array.isArray(db.landingPages)) {
            db.landingPages = db.landingPages.filter(function(p) {
              if (!p) return false;
              var pId = String(p.id || "");
              var pSlug = String(p.slug || "");
              var pTitle = String(p.title || p.name || "");
              if (pId && idSet[pId]) return false;
              if (targetSlug && pSlug.toLowerCase() === String(targetSlug).toLowerCase()) return false;
              if (targetTitle && pTitle.toLowerCase() === String(targetTitle).toLowerCase()) return false;
              return true;
            });
            updatedLpList = db.landingPages;
          }

          if (Array.isArray(db.leads_landing_pages)) {
            db.leads_landing_pages = db.leads_landing_pages.filter(function(l) {
              var lId = String(l.landingPageId || l["ID Landing Page"] || "");
              var lTitle = String(l.landingPageTitle || l.landingPage || "");
              if (lId && idSet[lId]) return false;
              if (targetTitle && lTitle.toLowerCase() === String(targetTitle).toLowerCase()) return false;
              return true;
            });
          }

          rf.setContent(JSON.stringify(db, null, 2));
        }
      } catch(eDbDel) {}

      return jsonResponse({
        status: "success",
        deletedIds: targetIds,
        remainingCount: updatedLpList.length,
        message: "Landing Page excluída permanentemente do Google Drive e Google Sheets!"
      });
    }

    // =========================================================================
    // AÇÃO: EXCLUIR LEAD(S) DO GOOGLE DRIVE E SHEETS
    // =========================================================================
    if (action === "DELETE_LEAD" || action === "DELETE_MULTIPLE_LEADS") {
      var rawLeadIds = payload.ids || (payload.leadId ? [payload.leadId] : (payload.id ? [payload.id] : []));
      var targetLeadIds = Array.isArray(rawLeadIds) ? rawLeadIds.map(String) : [String(rawLeadIds)];
      var leadEmail = (payload.email || "").trim().toLowerCase();
      var leadPhone = (payload.whatsapp || payload.phone || "").replace(/[^0-9]/g, "");
      var leadIdSet = {};
      targetLeadIds.forEach(function(id) { if (id) leadIdSet[id] = true; });

      // 1. Remove da aba principal Leads
      var mainLeads = spreadsheet.getSheetByName("Leads");
      if (mainLeads) {
        var mRows = mainLeads.getDataRange().getValues();
        for (var mi = mRows.length - 1; mi >= 1; mi--) {
          var rId = String(mRows[mi][0] || "");
          var rEmail = String(mRows[mi][3] || "").trim().toLowerCase();
          var rPhone = String(mRows[mi][4] || "").replace(/[^0-9]/g, "");
          var match = Boolean(
            (rId && leadIdSet[rId]) ||
            (leadEmail && rEmail === leadEmail) ||
            (leadPhone && leadPhone.length >= 8 && rPhone === leadPhone)
          );
          if (match) {
            mainLeads.deleteRow(mi + 1);
          }
        }
      }

      // 2. Remove da aba Leads_LandingPages
      var llSheet = spreadsheet.getSheetByName("Leads_LandingPages");
      if (llSheet) {
        var llRows = llSheet.getDataRange().getValues();
        for (var lli = llRows.length - 1; lli >= 1; lli--) {
          var lId = String(llRows[lli][1] || "");
          var lEmail = String(llRows[lli][6] || "").trim().toLowerCase();
          var lPhone = String(llRows[lli][5] || "").replace(/[^0-9]/g, "");
          var lMatch = Boolean(
            (lId && leadIdSet[lId]) ||
            (leadEmail && lEmail === leadEmail) ||
            (leadPhone && leadPhone.length >= 8 && lPhone === leadPhone)
          );
          if (lMatch) {
            llSheet.deleteRow(lli + 1);
          }
        }
      }

      // 3. Remove da aba leadtest
      var ltSheet = spreadsheet.getSheetByName("leadtest");
      if (ltSheet) {
        var ltRows = ltSheet.getDataRange().getValues();
        for (var lti = ltRows.length - 1; lti >= 1; lti--) {
          var tId = String(ltRows[lti][1] || "");
          var tEmail = String(ltRows[lti][6] || "").trim().toLowerCase();
          var tPhone = String(ltRows[lti][5] || "").replace(/[^0-9]/g, "");
          var tMatch = Boolean(
            (tId && leadIdSet[tId]) ||
            (leadEmail && tEmail === leadEmail) ||
            (leadPhone && leadPhone.length >= 8 && tPhone === leadPhone)
          );
          if (tMatch) {
            ltSheet.deleteRow(lti + 1);
          }
        }
      }

      // 4. Atualiza JSON raiz
      try {
        var rFiles = folder.getFilesByName(ROOT_FILE_NAME);
        if (rFiles.hasNext()) {
          var rRoot = rFiles.next();
          var dbRoot = JSON.parse(rRoot.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbRoot.leads)) {
            dbRoot.leads = dbRoot.leads.filter(function(l) {
              if (!l) return false;
              var lId = String(l.id || "");
              var lEm = String(l.email || "").trim().toLowerCase();
              var lPh = String(l.whatsapp || "").replace(/[^0-9]/g, "");
              if (lId && leadIdSet[lId]) return false;
              if (leadEmail && lEm === leadEmail) return false;
              if (leadPhone && leadPhone.length >= 8 && lPh === leadPhone) return false;
              return true;
            });
          }
          rRoot.setContent(JSON.stringify(dbRoot, null, 2));
        }
      } catch(eDbLeadDel) {}

      return jsonResponse({
        status: "success",
        deletedIds: targetLeadIds,
        message: "Lead(s) excluído(s) permanentemente do Google Drive e Sheets!"
      });
    }

    // =========================================================================
    // AÇÃO: EXCLUIR PRODUTO DO GOOGLE DRIVE E SHEETS
    // =========================================================================
    if (action === "DELETE_PRODUCT") {
      var prodId = String(payload.productId || payload.id || "");
      var pSheet = spreadsheet.getSheetByName("Produtos");
      if (pSheet) {
        var pData = pSheet.getDataRange().getValues();
        for (var pi = pData.length - 1; pi >= 1; pi--) {
          if (String(pData[pi][0] || "") === prodId) {
            pSheet.deleteRow(pi + 1);
          }
        }
      }
      try {
        var rfProd = folder.getFilesByName(ROOT_FILE_NAME);
        if (rfProd.hasNext()) {
          var rfp = rfProd.next();
          var dbP = JSON.parse(rfp.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbP.products)) {
            dbP.products = dbP.products.filter(function(p) { return String(p.id || "") !== prodId; });
          }
          rfp.setContent(JSON.stringify(dbP, null, 2));
        }
      } catch(eDbP) {}
      return jsonResponse({ status: "success", message: "Produto excluído com sucesso do Drive e Sheets!" });
    }

    // =========================================================================
    // AÇÃO: EXCLUIR TAREFA DO GOOGLE DRIVE E SHEETS
    // =========================================================================
    if (action === "DELETE_TASK") {
      var taskId = String(payload.taskId || payload.id || "");
      var currentYear = new Date().getFullYear();
      var tSheet = spreadsheet.getSheetByName("Tarefas_" + currentYear);
      if (tSheet) {
        var tData = tSheet.getDataRange().getValues();
        for (var ti = tData.length - 1; ti >= 1; ti--) {
          if (String(tData[ti][0] || "") === taskId) {
            tSheet.deleteRow(ti + 1);
          }
        }
      }
      try {
        var rfTask = folder.getFilesByName(ROOT_FILE_NAME);
        if (rfTask.hasNext()) {
          var rft = rfTask.next();
          var dbT = JSON.parse(rft.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbT.tasks)) {
            dbT.tasks = dbT.tasks.filter(function(t) { return String(t.id || "") !== taskId; });
          }
          rft.setContent(JSON.stringify(dbT, null, 2));
        }
      } catch(eDbT) {}
      return jsonResponse({ status: "success", message: "Tarefa excluída com sucesso do Drive e Sheets!" });
    }

    // =========================================================================
    // AÇÃO: EXCLUIR PESQUISA / DIAGNÓSTICO DO GOOGLE DRIVE E SHEETS
    // =========================================================================
    if (action === "DELETE_SURVEY") {
      var surveyId = String(payload.surveyId || payload.id || "");
      var surveyName = String(payload.surveyName || payload.name || "");
      var sSheet = spreadsheet.getSheetByName("Diagnosticos_Surveys");
      if (sSheet) {
        var sData = sSheet.getDataRange().getValues();
        for (var si = sData.length - 1; si >= 1; si--) {
          var rSId = String(sData[si][0] || "");
          var rSName = String(sData[si][1] || "");
          if ((surveyId && rSId === surveyId) || (surveyName && rSName.toLowerCase() === surveyName.toLowerCase())) {
            sSheet.deleteRow(si + 1);
          }
        }
      }
      try {
        var rfSurvey = folder.getFilesByName(ROOT_FILE_NAME);
        if (rfSurvey.hasNext()) {
          var rfs = rfSurvey.next();
          var dbS = JSON.parse(rfs.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbS.surveys)) {
            dbS.surveys = dbS.surveys.filter(function(s) {
              var sId = String(s.id || "");
              var sNm = String(s.name || "");
              if (surveyId && sId === surveyId) return false;
              if (surveyName && sNm.toLowerCase() === surveyName.toLowerCase()) return false;
              return true;
            });
          }
          rfs.setContent(JSON.stringify(dbS, null, 2));
        }
      } catch(eDbS) {}
      return jsonResponse({ status: "success", message: "Pesquisa excluída com sucesso do Drive e Sheets!" });
    }

    // =========================================================================
    // AÇÃO: LIMPAR BANCO E MANTER APENAS 1 LANDING PAGE (CLEAN_KEEP_ONE)
    // =========================================================================
    if (action === "CLEAN_DATABASE_KEEP_ONE") {
      var keepId = String(payload.keepId || payload.id || "");
      try {
        var rfRoot = folder.getFilesByName(ROOT_FILE_NAME);
        if (rfRoot.hasNext()) {
          var rfr = rfRoot.next();
          var dbK = JSON.parse(rfr.getBlob().getDataAsString("UTF-8")) || {};
          if (Array.isArray(dbK.landingPages)) {
            var keptLp = dbK.landingPages.find(function(p) { return String(p.id || "") === keepId || String(p.slug || "") === keepId; });
            if (!keptLp && dbK.landingPages.length > 0) keptLp = dbK.landingPages[0];
            dbK.landingPages = keptLp ? [keptLp] : [];
          }
          rfr.setContent(JSON.stringify(dbK, null, 2));
          syncDataToGoogleSheets(spreadsheet, dbK);
        }
      } catch(eDbK) {}
      return jsonResponse({ status: "success", message: "Banco limpo mantendo apenas 1 Landing Page!" });
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

  // 8. Tabela de Investimentos de Marketing
  var invData = Array.isArray(data.marketingInvestments) ? data.marketingInvestments : (Array.isArray(data.marketing_investments) ? data.marketing_investments : []);
  if (invData.length > 0) {
    var sheetInv = getOrCreateSheet(ss, "Investimentos_Marketing", [
      "ID", "Canal / Mídia", "Valor Investido (R$)", "Data Início", "Data Fim", "ID Landing Page / Campanha", "Descrição / Detalhes", "Data Lançamento"
    ]);
    var rowsInv = invData.map(function(inv) {
      return [
        inv.id || "",
        inv.channel || "Meta Ads",
        Number(inv.amount || 0),
        inv.start_date || inv.startDate || "",
        inv.end_date || inv.endDate || "",
        inv.landing_page_id || inv.landingPageId || "",
        inv.description || "",
        inv.createdAt || inv.created_at || ""
      ];
    });
    writeRowsToSheet(sheetInv, rowsInv);
  }

  // 9. Tabela de Sales Playbooks
  if (Array.isArray(data.playbooks)) {
    var sheetPlaybooks = getOrCreateSheet(ss, "Playbooks", [
      "ID", "Título / Nome", "Tipo / Segmento", "Etapas (JSON)", "Perguntas de Qualificação (JSON)", "Critérios de Sucesso", "Data Criação", "Última Atualização"
    ]);
    var rowsPb = data.playbooks.map(function(pb) {
      return [
        pb.id || "",
        pb.title || pb.name || "",
        pb.type || pb.category || "Geral",
        JSON.stringify(pb.stages || []),
        JSON.stringify(pb.questions || []),
        pb.successCriteria || "",
        pb.createdAt || pb.created_at || "",
        pb.updatedAt || pb.updated_at || ""
      ];
    });
    writeRowsToSheet(sheetPlaybooks, rowsPb);
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

function getOrCreateSpreadsheet(folder, customSpreadsheetId) {
  // 1. Prioridade Máxima: Planilha Ativa (onde o script foi aberto/vinculado via Extensões > Apps Script)
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      return activeSs;
    }
  } catch (eActive) {}

  // 2. ID ou URL explícito passado na requisição
  if (customSpreadsheetId) {
    try {
      if (String(customSpreadsheetId).indexOf("docs.google.com") !== -1) {
        return SpreadsheetApp.openByUrl(String(customSpreadsheetId));
      }
      return SpreadsheetApp.openById(String(customSpreadsheetId));
    } catch (eCustom) {}
  }

  // 3. Procura no Drive pelo nome padrão ou qualquer planilha na pasta
  try {
    var files = folder.getFilesByName(SPREADSHEET_BASE_NAME);
    if (files.hasNext()) {
      return SpreadsheetApp.openById(files.next().getId());
    }
    var sheetFiles = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    if (sheetFiles.hasNext()) {
      return SpreadsheetApp.openById(sheetFiles.next().getId());
    }
  } catch (eSearch) {}

  // 4. Cria nova planilha caso não exista nenhuma
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
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn() || (rows && rows[0] ? rows[0].length : 1);
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  if (rows && rows.length > 0 && rows[0] && rows[0].length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function mergeDatabaseObjects(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  var result = Object.assign({}, incoming);

  // Se o incoming não contém alguma chave existente, preserva do existing
  for (var key in existing) {
    if (incoming[key] === undefined) {
      result[key] = existing[key];
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
