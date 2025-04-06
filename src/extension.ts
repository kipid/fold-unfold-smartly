import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const upwardDecorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: "⇑",
      margin: "0 0 0 .6em",
    },
  });

  const downwardDecorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: "▼",
      margin: "0 0 0 .6em",
    },
  });

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      const text = editor.document.getText();
      const lines = text.split("\n");
      const upwardDecorations: vscode.DecorationOptions[] = [];
      const downwardDecorations: vscode.DecorationOptions[] = [];

      for (let i = 0; i < lines.length; i++) {
        const currentIndentation = lines[i].match(/^\s*/)?.[0] || "";

        // 아래쪽 방향 caret 표시
        if (
          i < lines.length - 1 &&
          lines[i + 1].startsWith(currentIndentation)
        ) {
          const range = new vscode.Range(
            i,
            lines[i].length,
            i,
            lines[i].length
          );
          downwardDecorations.push({ range });
        }

        // 위쪽 방향 caret 표시
        if (
          i > 0 &&
          lines[i].startsWith(currentIndentation) &&
          !lines[i - 1].startsWith(currentIndentation)
        ) {
          const range = new vscode.Range(
            i,
            lines[i].length,
            i,
            lines[i].length
          );
          upwardDecorations.push({ range });
        }
      }

      editor.setDecorations(downwardDecorationType, downwardDecorations);
      editor.setDecorations(upwardDecorationType, upwardDecorations);
    }
  });

  vscode.window.onDidChangeTextEditorSelection((event) => {
    const editor = event.textEditor;
    const selections = event.selections;

    selections.forEach((selection) => {
      const line = selection.active.line;
      const text = editor.document.lineAt(line).text;

      // 클릭된 줄의 indentation 확인
      const currentIndentation = text.match(/^\s*/)?.[0]!;

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

        // 실제 fold 처리 로직 추가
        const rangesToFold: vscode.Range[] = [];
        for (let i = firstLine; i <= line; i++) {
          rangesToFold.push(
            new vscode.Range(i, 0, i, editor.document.lineAt(i).text.length)
          );
        }
        // 여기에 fold 처리 로직을 추가할 수 있습니다.
      }
    });
  });

  context.subscriptions.push(upwardDecorationType);
  context.subscriptions.push(downwardDecorationType);
}

export function deactivate() {}
