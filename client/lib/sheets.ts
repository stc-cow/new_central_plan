export async function fetchPublishedSheetRows(pubhtmlUrl: string): Promise<string[][]> {
  const csvUrl = toCsvUrl(pubhtmlUrl);
  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

function toCsvUrl(url: string): string {
  try {
    const u = new URL(url);
    // Replace "/pubhtml" with "/pub" and ensure output=csv
    u.pathname = u.pathname.replace(/\/pubhtml$/, "/pub");
    u.searchParams.set("output", "csv");
    return u.toString();
  } catch {
    // Fallback simple replace
    if (url.includes("pubhtml")) {
      const base = url.replace("pubhtml", "pub");
      return base + (base.includes("?") ? "&" : "?") + "output=csv";
    }
    return url;
  }
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = input.length;
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  while (i < len) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      if (ch === '\r') { i++; continue; }
      field += ch;
      i++;
    }
  }
  // flush last field
  row.push(field);
  rows.push(row);
  return rows;
}
