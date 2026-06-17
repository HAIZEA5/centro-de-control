// ─── LECTOR DE GOOGLE SHEETS ───
// Requiere que el Sheet sea público (Anyone with link can view)

async function fetchSheet(sheetId, range) {
  if (!CONFIG.GOOGLE_API_KEY || !sheetId) return null;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${CONFIG.GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.values || [];
  } catch {
    return null;
  }
}

// Convierte filas de Sheet en array de objetos usando la primera fila como cabecera
function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  );
}
