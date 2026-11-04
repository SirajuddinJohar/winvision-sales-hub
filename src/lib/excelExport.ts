export interface ExcelSheet {
  /** Sheet tab name (max 31 chars, Excel-safe characters enforced). */
  name: string;
  rows: Record<string, unknown>[];
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later so Safari/iOS keeps the download alive.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Build and download an .xlsx workbook. xlsx is imported lazily (only on export). */
export async function deliverExcel(sheets: ExcelSheet[], filename: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of sheets) {
    const rows = sheet.rows.length ? sheet.rows : [{ Info: 'No records' }];
    const ws = XLSX.utils.json_to_sheet(rows);

    // Sensible column widths based on header + first 200 rows.
    const headers = Object.keys(rows[0]);
    ws['!cols'] = headers.map((h) => ({
      wch: Math.min(
        42,
        Math.max(
          12,
          h.length + 2,
          ...rows.slice(0, 200).map((r) => String(r[h] ?? '').length + 2),
        ),
      ),
    }));

    let name = sheet.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' ').trim();
    let n = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${sheet.name.slice(0, 28)} ${n++}`;
    }
    usedNames.add(name.toLowerCase());
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: XLSX_MIME }), filename);
}

export const todayStamp = () => new Date().toISOString().slice(0, 10);
