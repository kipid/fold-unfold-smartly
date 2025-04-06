import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: "⇑",
      margin: "0 0 0 .6em",
    },
  });

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      const text = editor.document.getText();
      const lines = text.split("\n");
      const decorations: vscode.DecorationOptions[] = [];

      for (let i = 0; i < lines.length; i++) {
        const range = new vscode.Range(i, lines[i].length, i, lines[i].length);
        decorations.push({ range });
      }

      editor.setDecorations(decorationType, decorations);
    }
  });

  vscode.window.onDidChangeTextEditorSelection((event) => {
    const editor = event.textEditor;
    const selections = event.selections;

    selections.forEach((selection) => {
      const line = selection.active.line;
      const text = editor.document.lineAt(line).text;

      if (text.endsWith("^")) {
        vscode.window.showInformationMessage(
          `Caret clicked on line ${line + 1}`
        );
      }

      // 같은 indentation의 마지막 줄 찾기
      const currentIndentation = text.match(/^\s*/)?.[0]!; // 현재 줄의 indentation
      let lastLine = line;

      // 아래로 내려가면서 같은 indentation을 가진 마지막 줄 찾기
      while (lastLine + 1 < editor.document.lineCount) {
        const nextLineText = editor.document.lineAt(lastLine + 1).text;
        if (nextLineText.startsWith(currentIndentation)) {
          lastLine++;
        } else {
          break;
        }
      }

      // 마지막 줄에서 fold 처리
      if (lastLine > line) {
        vscode.window.showInformationMessage(
          `Folding lines from ${line + 1} to ${lastLine + 1}`
        );
        // 여기에 fold 처리 로직 추가
      }

      // 위쪽으로 fold 처리
      let firstLine = line;
      while (firstLine - 1 >= 0) {
        const prevLineText = editor.document.lineAt(firstLine - 1).text;
        if (prevLineText.startsWith(currentIndentation)) {
          firstLine--;
        } else {
          break;
        }
      }

      // 위쪽 fold 처리 메시지
      if (firstLine < line) {
        vscode.window.showInformationMessage(
          `Folding lines from ${firstLine + 1} to ${line + 1}`
        );
        // 여기에 위쪽 fold 처리 로직 추가
      }
    });
  });

  context.subscriptions.push(decorationType);
}

export function deactivate() {}
