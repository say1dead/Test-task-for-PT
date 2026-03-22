import * as vscode from "vscode";
import { SecretCodeActionProvider } from "./codeActions";
import { scanDocument, scanWorkspace } from "./scanner";
import { makeDiagnostic, ScanIssue } from "./types";

class DiagnosticsManager implements vscode.Disposable {
    public readonly collection = vscode.languages.createDiagnosticCollection("vulnerability-scanner");

    public setIssuesByUri(issuesByUri: Map<string, ScanIssue[]>): void {
        this.collection.clear();

        for (const [uriString, issues] of issuesByUri) {
            const diagnostics = issues.map(makeDiagnostic);
            this.collection.set(vscode.Uri.parse(uriString), diagnostics);
        }
    }

    public updateDocument(document: vscode.TextDocument): void {
        const diagnostics = scanDocument(document).map(makeDiagnostic);
        this.collection.set(document.uri, diagnostics);
    }

    public clear(): void {
        this.collection.clear();
    }

    public dispose(): void {
        this.collection.dispose();
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const diagnostics = new DiagnosticsManager();

    context.subscriptions.push(diagnostics);

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: "csharp", scheme: "file" },
            new SecretCodeActionProvider(),
            { providedCodeActionKinds: SecretCodeActionProvider.providedCodeActionKinds }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("VulnerabilityScanner.startScan", async () => {
            try {
                const issuesByUri = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: "Vulnerability Scanner: scanning C# files"
                    },
                    async () => scanWorkspace()
                );

                diagnostics.setIssuesByUri(issuesByUri);

                const count = [...issuesByUri.values()].reduce((sum, items) => sum + items.length, 0);
                void vscode.window.showInformationMessage(
                    `Vulnerability Scanner finished: ${count} issue(s) found.`
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                void vscode.window.showErrorMessage(`Vulnerability Scanner failed: ${message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("VulnerabilityScanner.clearResults", () => {
            diagnostics.clear();
            void vscode.window.showInformationMessage("Vulnerability Scanner results cleared.");
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            const enabled = vscode.workspace
                .getConfiguration("VulnerabilityScanner")
                .get<boolean>("scanOnSave", true);

            if (!enabled) {
                return;
            }

            if (document.languageId !== "csharp" && !document.fileName.toLowerCase().endsWith(".cs")) {
                return;
            }

            diagnostics.updateDocument(document);
        })
    );
}

export function deactivate(): void {}
