import * as vscode from "vscode";

export type SecretType =
  | "password"
  | "apiKey"
  | "token"
  | "connectionString"
  | "custom";

export interface ScanIssue {
  filePath: string;
  line: number;
  start: number;
  end: number;
  message: string;
  secretType: SecretType;
  replacement?: string;
}

export interface QuickFixPayload {
  secretType: SecretType;
  replacement?: string;
}

export function makeDiagnostic(issue: ScanIssue): vscode.Diagnostic {
  const range = new vscode.Range(
    new vscode.Position(issue.line, issue.start),
    new vscode.Position(issue.line, issue.end),
  );

  const diagnostic = new vscode.Diagnostic(
    range,
    issue.message,
    vscode.DiagnosticSeverity.Warning,
  );

  diagnostic.source = "vulnerability-scanner";

  diagnostic.code = {
    value: JSON.stringify({
      secretType: issue.secretType,
      replacement: issue.replacement,
    } satisfies QuickFixPayload),
    target: vscode.Uri.file(issue.filePath),
  };

  return diagnostic;
}
