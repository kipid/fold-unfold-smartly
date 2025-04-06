import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const upwardDecorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: "≻",
      margin: "0 0 0 0",
    },
  });

  const downwardDecorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: "≺",
      margin: "0 0 0 0",
    },
  });

  const upwardAvailableDecorationType =
    vscode.window.createTextEditorDecorationType({
      before: {
        contentText: "∨",
        margin: "0 0 0 0",
      },
    });

  const downwardAvailableDecorationType =
    vscode.window.createTextEditorDecorationType({
      before: {
        contentText: "∧",
        margin: "0 0 0 0",
      },
    });

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      const text = editor.document.getText();
      const lines = text.split("\n");
      const upwardDecorations: vscode.DecorationOptions[] = [];
      const downwardDecorations: vscode.DecorationOptions[] = [];
      const upwardAvailableDecorations: vscode.DecorationOptions[] = [];
      const downwardAvailableDecorations: vscode.DecorationOptions[] = [];

      for (let i = 0; i < lines.length; i++) {
        const currentIndentation = lines[i].match(/^\s*/)?.[0] || "";

        // 아래쪽 방향 caret 표시
        if (
          i < lines.length - 1 &&
          lines[i + 1].startsWith(currentIndentation + "s")
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
          lines[i].startsWith(currentIndentation + "s") &&
          !lines[i - 1].startsWith(currentIndentation + "s")
        ) {
          const range = new vscode.Range(
            i,
            lines[i].length,
            i,
            lines[i].length
          );
          upwardDecorations.push({ range });
        }

        // 위쪽에서 fold 될 수 있는 상태 표시
        if (
          i > 0 &&
          lines[i].startsWith(currentIndentation + "s") &&
          lines[i - 1].startsWith(currentIndentation + "s")
        ) {
          const range = new vscode.Range(
            i,
            lines[i].length,
            i,
            lines[i].length
          );
          upwardAvailableDecorations.push({ range });
        }

        // 아래쪽에서 fold 될 수 있는 상태 표시
        if (
          i < lines.length - 1 &&
          lines[i + 1].startsWith(currentIndentation + "s")
        ) {
          const range = new vscode.Range(
            i,
            lines[i].length,
            i,
            lines[i].length
          );
          downwardAvailableDecorations.push({ range });
        }
      }

      editor.setDecorations(downwardDecorationType, downwardDecorations);
      editor.setDecorations(upwardDecorationType, upwardDecorations);
      editor.setDecorations(
        upwardAvailableDecorationType,
        upwardAvailableDecorations
      );
      editor.setDecorations(
        downwardAvailableDecorationType,
        downwardAvailableDecorations
      );
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
        if (prevLineText.startsWith(currentIndentation + "s")) {
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

        // Fold 처리 로직
        editor.setDecorations(downwardDecorationType, []);
        editor.setDecorations(upwardDecorationType, []);
        editor.setDecorations(upwardAvailableDecorationType, []);
        editor.setDecorations(downwardAvailableDecorationType, []);

        // 스크롤 조정
        editor.revealRange(
          new vscode.Range(firstLine, 0, firstLine, 0),
          vscode.TextEditorRevealType.InCenter
        );
      }
    });
  });

  // 마우스 오버 이벤트를 통해 기호 표시
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("*", {
      provideHover(document, position) {
        const line = position.line;
        const text = document.lineAt(line).text;

        // 현재 줄의 indentation 확인
        const currentIndentation = text.match(/^\s*/)?.[0]!;

        // 아래쪽에서 fold 될 수 있는 상태일 때
        if (
          line < document.lineCount - 1 &&
          document.lineAt(line + 1).text.startsWith(currentIndentation + "s")
        ) {
          return new vscode.Hover("∧"); // 아래쪽 fold 기호
        }

        // 위쪽에서 fold 될 수 있는 상태일 때
        if (
          line > 0 &&
          document.lineAt(line - 1).text.startsWith(currentIndentation + "s")
        ) {
          return new vscode.Hover("∨"); // 위쪽 fold 기호
        }

        return null; // 기호를 표시하지 않음
      },
    })
  );

  context.subscriptions.push(upwardDecorationType);
  context.subscriptions.push(downwardDecorationType);
  context.subscriptions.push(upwardAvailableDecorationType);
  context.subscriptions.push(downwardAvailableDecorationType);
}

export function deactivate() {}
