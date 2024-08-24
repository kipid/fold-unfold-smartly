import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            contentText: '⇑',
            margin: '0 0 0 .6em'
        }
    });

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            const text = editor.document.getText();
            const lines = text.split('\n');
            const decorations: vscode.DecorationOptions[] = [];

            for (let i = 0; i < lines.length; i++) {
                const range = new vscode.Range(i, lines[i].length, i, lines[i].length);
                decorations.push({ range });
            }

            editor.setDecorations(decorationType, decorations);
        }
    });

    vscode.window.onDidChangeTextEditorSelection(event => {
        const editor = event.textEditor;
        const selections = event.selections;

        selections.forEach(selection => {
            const line = selection.active.line;
            const text = editor.document.lineAt(line).text;

            if (text.endsWith('^')) {
                vscode.window.showInformationMessage(`Caret clicked on line ${line + 1}`);
            }
        });
    });

    context.subscriptions.push(decorationType);
}

export function deactivate() {}
