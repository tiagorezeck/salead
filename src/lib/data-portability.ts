"use client";

/**
 * Converte um array de objetos para uma string CSV.
 * Lida com valores nulos, objetos aninhados e escape de caracteres especiais.
 */
export function convertToCSV(data: any[]): string {
  if (!data || !Array.isArray(data) || data.length === 0) return "";
  
  // Coleta todas as chaves únicas de todos os objetos (caso o primeiro objeto não tenha todas)
  const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header];
      
      if (val === undefined || val === null) return "";
      
      // Converte objetos/arrays aninhados para string JSON para não quebrar o CSV
      if (typeof val === 'object') {
        try {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        } catch {
          return "";
        }
      }
      
      // Converte para string e limpa quebras de linha que quebram o CSV
      const str = String(val).replace(/"/g, '""');
      
      // Adiciona aspas se houver vírgulas, quebras de linha ou aspas no valor
      if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
        return `"${str}"`;
      }
      
      return str;
    }).join(",")
  );
  
  return [headers.join(","), ...rows].join("\n");
}

/**
 * Converte uma string CSV de volta para um array de objetos.
 */
export function parseCSV(csv: string): any[] {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const headers = lines[0].split(",");
  
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(regex).map(v => {
      let cleaned = v.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
      }
      
      if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
        try { return JSON.parse(cleaned); } catch { return cleaned; }
      }
      
      if (!isNaN(cleaned as any) && cleaned !== "") return Number(cleaned);
      if (cleaned.toLowerCase() === 'true') return true;
      if (cleaned.toLowerCase() === 'false') return false;
      
      return cleaned;
    });
    
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {} as any);
  });
}

/**
 * Dispara o download de um arquivo no navegador com tratamento de erro.
 */
export function downloadDataFile(content: string, fileName: string, contentType: string) {
  try {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.error("Erro ao gerar download:", err);
    throw new Error("Não foi possível gerar o arquivo de exportação.");
  }
}