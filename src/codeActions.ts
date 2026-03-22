import * as vscode from "vscode";

export class SecretCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== "vulnerability-scanner") {
                continue;
            }

            const code = diagnostic.code;
            if (!code || typeof code === "string" || typeof code === "number") {
                continue;
            }

            let payload: { secretType: string; replacement?: string };
            try {
                payload = JSON.parse(String(code.value));
            } catch {
                continue;
            }

            if (!payload.replacement) {
                continue;
            }

            const action = new vscode.CodeAction(
                `replace ${payload.secretType} with QuickFix`,
                vscode.CodeActionKind.QuickFix
            );

            action.isPreferred = true;
            action.diagnostics = [diagnostic];
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, diagnostic.range, payload.replacement);
            actions.push(action);
        }

        return actions;
    }
}
