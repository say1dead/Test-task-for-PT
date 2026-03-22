import * as vscode from "vscode";
import { ScanIssue, SecretType } from "./types";

interface ScanRule {
  secretType: SecretType;
  displayName: string;
  regex: RegExp;
  replacement: string;
}

function buildRules(): ScanRule[] {
  const config = vscode.workspace.getConfiguration("VulnerabilityScanner");
  const rules: ScanRule[] = [];

  if (config.get<boolean>("enablePasswordScan", true)) {
    rules.push({
      secretType: "password",
      displayName: "password",
      regex:
        /\b(?:var|string)\s+\w*password\w*\s*=\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/gi,
      replacement: 'Environment.GetEnvironmentVariable("APP_PASSWORD")',
    });
  }

  if (config.get<boolean>("enableApiKeyScan", true)) {
    rules.push({
      secretType: "apiKey",
      displayName: "API key",
      regex:
        /\b(?:var|string)\s+\w*(?:api[_-]?key|apikey)\w*\s*=\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/gi,
      replacement: 'Environment.GetEnvironmentVariable("API_KEY")',
    });
  }

  if (config.get<boolean>("enableTokenScan", true)) {
    rules.push({
      secretType: "token",
      displayName: "token",
      regex:
        /\b(?:var|string)\s+\w*token\w*\s*=\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/gi,
      replacement: 'Environment.GetEnvironmentVariable("AUTH_TOKEN")',
    });
  }

  if (config.get<boolean>("enableConnectionStringScan", true)) {
    rules.push({
      secretType: "connectionString",
      displayName: "connection string",
      regex:
        /["']([^"']*(Server=|Data Source=|Database=|User Id=|Password=)[^"']*)["']/gi,
      replacement: 'Environment.GetEnvironmentVariable("CONNECTION_STRING")',
    });
  }

  return rules;
}

export function scanDocument(document: vscode.TextDocument): ScanIssue[] {
  if (document.languageId !== "csharp" && !document.fileName.toLowerCase().endsWith(".cs")) {
    return [];
  }

  const text = document.getText();
  const issues: ScanIssue[] = [];
  const rules = buildRules();

  for (const rule of rules) {
    rule.regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const literalMatch = fullMatch.match(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/);
      if (!literalMatch || literalMatch.index === undefined) {
        continue;
      }

      const literalStart = match.index + literalMatch.index;
      const literalEnd = literalStart + literalMatch[0].length;

      const startPos = document.positionAt(literalStart);
      const endPos = document.positionAt(literalEnd);

      issues.push({
        filePath: document.uri.fsPath,
        line: startPos.line,
        start: startPos.character,
        end: endPos.character,
        message: `Possible hardcoded ${rule.displayName}`,
        secretType: rule.secretType,
        replacement: rule.replacement,
      });
    }
  }

  const customRegexes = vscode.workspace
    .getConfiguration("VulnerabilityScanner")
    .get<string[]>("customRegexes", []);

  for (const custom of customRegexes) {
    try {
      const regex = new RegExp(custom, "gi");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);

        issues.push({
          filePath: document.uri.fsPath,
          line: startPos.line,
          start: startPos.character,
          end: endPos.character,
          message: "Possible hardcoded secret (custom rule)",
          secretType: "custom",
        });
      }
    } catch {
      vscode.window.showInformationMessage("Custom regex error."); 
    }
  }

  return issues;
}

export async function scanWorkspace(): Promise<Map<string, ScanIssue[]>> {
  const config = vscode.workspace.getConfiguration("VulnerabilityScanner");
  const includeGlobs = config.get<string[]>("includeGlobs", ["**/*.cs"]);
  const excludeGlobs = config.get<string[]>("excludeGlobs", []);
  const result = new Map<string, ScanIssue[]>();

  for (const include of includeGlobs) {
    const uris = await vscode.workspace.findFiles(
      include,
      excludeGlobs.length ? `{${excludeGlobs.join(",")}}` : undefined,
    );

    for (const uri of uris) {
      const document = await vscode.workspace.openTextDocument(uri);
      const issues = scanDocument(document);
      result.set(uri.toString(), issues);
    }
  }

  return result;
}
