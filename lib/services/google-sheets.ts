import { createHash, randomInt } from "node:crypto";

import { BOOK_SHEET_HEADERS, type SheetRow } from "@/lib/domain/weekly-sheets";

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE = "https://www.googleapis.com/drive/v3/files";
const MAX_BATCH_BYTES = 1_500_000;
const CHUNK_ROWS = 150;

export type GoogleFailure =
  | "reconnect"
  | "temporary"
  | "missing"
  | "unavailable";

export class GoogleSheetsError extends Error {
  constructor(public kind: GoogleFailure) {
    super(kind);
  }
}

async function googleJson<T>(
  url: string,
  token: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new GoogleSheetsError("temporary");
  }
  if (!response.ok) {
    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      const reasons: string[] =
        (
          body as { error?: { errors?: { reason?: string }[] } }
        ).error?.errors?.map((entry) => entry.reason ?? "") ?? [];
      if (
        reasons.some((reason) =>
          [
            "rateLimitExceeded",
            "userRateLimitExceeded",
            "quotaExceeded",
          ].includes(reason)
        )
      ) {
        throw new GoogleSheetsError("temporary");
      }
      throw new GoogleSheetsError("reconnect");
    }
    if (response.status === 401) {
      throw new GoogleSheetsError("reconnect");
    }
    if (response.status === 404) {
      throw new GoogleSheetsError("missing");
    }
    throw new GoogleSheetsError(
      response.status === 429 || response.status >= 500
        ? "temporary"
        : "unavailable"
    );
  }
  return response.json() as Promise<T>;
}

/** Stable, non-identifying name allows recovery after a remote create/local DB failure. */
export function managedSheetName(userId: string): string {
  const suffix = createHash("sha256").update(userId).digest("hex").slice(0, 12);
  return `Bodega Literária — Acervo ${suffix}`;
}

export async function createOrRecoverSpreadsheet(
  token: string,
  userId: string,
  weekKey: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const name = managedSheetName(userId);
  const query = new URLSearchParams({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: "nextPageToken,files(id,name)",
    pageSize: "100",
  });
  const found = await googleJson<{ files?: { id: string }[] }>(
    `${DRIVE}?${query}`,
    token,
    {},
    fetcher
  );
  if (found.files?.[0]?.id) {
    return found.files[0].id;
  }
  const created = await googleJson<{ spreadsheetId: string }>(
    SHEETS,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        properties: { title: name },
        sheets: [
          {
            properties: {
              title: "__initializing",
              hidden: false,
              gridProperties: { rowCount: 1, columnCount: 1 },
            },
          },
          {
            properties: {
              title: pendingTitle(weekKey),
              hidden: true,
              gridProperties: {
                rowCount: 1,
                columnCount: Object.keys(BOOK_SHEET_HEADERS).length,
              },
            },
          },
        ],
      }),
    },
    fetcher
  );
  if (!created.spreadsheetId) {
    throw new GoogleSheetsError("unavailable");
  }
  return created.spreadsheetId;
}

interface GoogleSheet {
  properties: {
    sheetId: number;
    title: string;
    gridProperties?: { rowCount?: number; columnCount?: number };
  };
}

function pendingTitle(weekKey: string) {
  return `__pending_${weekKey}`;
}

async function batch(
  spreadsheetId: string,
  token: string,
  requests: unknown[],
  fetcher: typeof fetch
) {
  await googleJson(
    `${SHEETS}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    token,
    { method: "POST", body: JSON.stringify({ requests }) },
    fetcher
  );
}

function sheetId(used: Set<number>): number {
  let id = randomInt(1, 2_147_483_647);
  while (used.has(id)) {
    id = randomInt(1, 2_147_483_647);
  }
  return id;
}

function writeRows(id: number, rows: SheetRow[], endRow: number) {
  return {
    updateCells: {
      range: {
        sheetId: id,
        startRowIndex: 0,
        endRowIndex: endRow,
        startColumnIndex: 0,
        endColumnIndex: Object.keys(BOOK_SHEET_HEADERS).length,
      },
      rows,
      fields: "userEnteredValue",
    },
  };
}

function chunkEnd(rows: SheetRow[], start: number): number {
  let end = start;
  let size = 5000;
  while (end < rows.length && end - start < CHUNK_ROWS) {
    const rowBytes = Buffer.byteLength(JSON.stringify(rows[end])) + 2;
    if (rowBytes > MAX_BATCH_BYTES - 5000) {
      throw new GoogleSheetsError("unavailable");
    }
    if (size + rowBytes > MAX_BATCH_BYTES && end > start) {
      break;
    }
    size += rowBytes;
    end++;
  }
  return end;
}

/** Returns the published tab ID. An existing dated tab is a completed remote run. */
export async function publishWeek(
  spreadsheetId: string,
  token: string,
  weekKey: string,
  rows: SheetRow[],
  fetcher: typeof fetch = fetch
): Promise<number> {
  const metadata = await googleJson<{ sheets?: GoogleSheet[] }>(
    `${SHEETS}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title,gridProperties)`,
    token,
    {},
    fetcher
  );
  const sheets = metadata.sheets ?? [];
  const published = sheets.find((s) => s.properties.title === weekKey);
  if (published) {
    return published.properties.sheetId;
  }
  const pending = sheets.find(
    (s) => s.properties.title === pendingTitle(weekKey)
  );
  const id = pending
    ? pending.properties.sheetId
    : sheetId(new Set(sheets.map((s) => s.properties.sheetId)));
  const cols = Object.keys(BOOK_SHEET_HEADERS).length;
  const existingRows = pending?.properties.gridProperties?.rowCount ?? 0;
  const add = pending
    ? []
    : [
        {
          addSheet: {
            properties: {
              sheetId: id,
              title: pendingTitle(weekKey),
              hidden: true,
              gridProperties: { rowCount: rows.length, columnCount: cols },
            },
          },
        },
      ];
  const resize =
    pending && existingRows < rows.length
      ? [
          {
            updateSheetProperties: {
              properties: {
                sheetId: id,
                gridProperties: { rowCount: rows.length },
              },
              fields: "gridProperties.rowCount",
            },
          },
        ]
      : [];
  const publish = {
    updateSheetProperties: {
      properties: { sheetId: id, title: weekKey, hidden: false },
      fields: "title,hidden",
    },
  };
  const initial = sheets.find(
    (sheet) => sheet.properties.title === "__initializing"
  );
  const finish = [
    publish,
    ...(initial
      ? [{ deleteSheet: { sheetId: initial.properties.sheetId } }]
      : []),
  ];
  const whole = [
    ...add,
    ...resize,
    writeRows(id, rows, Math.max(rows.length, existingRows)),
    ...finish,
  ];
  if (
    Buffer.byteLength(JSON.stringify({ requests: whole })) <= MAX_BATCH_BYTES
  ) {
    await batch(spreadsheetId, token, whole, fetcher);
    return id;
  }

  // A large export stays hidden until every chunk has been confirmed.
  if (add.length || resize.length) {
    await batch(spreadsheetId, token, [...add, ...resize], fetcher);
  }
  for (let start = 0; start < rows.length; ) {
    const end = chunkEnd(rows, start);
    await batch(
      spreadsheetId,
      token,
      [
        {
          updateCells: {
            start: { sheetId: id, rowIndex: start, columnIndex: 0 },
            rows: rows.slice(start, end),
            fields: "userEnteredValue",
          },
        },
      ],
      fetcher
    );
    start = end;
  }
  // Clear stale rows if a retry has fewer books than its earlier partial write.
  if (existingRows > rows.length) {
    await batch(
      spreadsheetId,
      token,
      [
        {
          updateCells: {
            range: {
              sheetId: id,
              startRowIndex: rows.length,
              endRowIndex: existingRows,
              startColumnIndex: 0,
              endColumnIndex: cols,
            },
            rows: [],
            fields: "userEnteredValue",
          },
        },
      ],
      fetcher
    );
  }
  await batch(spreadsheetId, token, finish, fetcher);
  return id;
}
