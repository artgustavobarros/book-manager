/** Shared client/server API shape; this module has no server dependencies. */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export interface SheetExportState {
  currentWeek: string;
  currentWeekSucceeded: boolean;
  lastError: string | null;
  lastFailedAt: string | null;
  lastSucceededAt: string | null;
  spreadsheetUrl: string | null;
  status: "off" | "pending" | "enabled" | "reconnect" | "disabled";
}
