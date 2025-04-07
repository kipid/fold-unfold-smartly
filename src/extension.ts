import * as vscode from "vscode";
import * as path from "path";

function findCurrentToInitialIndentFoldRange(
  document: vscode.TextDocument,
  startLineIndex: number
): { start: number; end: number } | null {
  try {
    const startLine = document.lineAt(startLineIndex);
    if (startLine.isEmptyOrWhitespace) {
      return null;
    }
    const startIndentation = startLine.firstNonWhitespaceCharacterIndex;
    let endLineIndex = -1;

    // Find the initial indentation of the same depth
    let i = startLineIndex - 1;
    if (
      document.lineAt(i).firstNonWhitespaceCharacterIndex <= startIndentation
    ) {
      return null;
    }
    for (i = startLineIndex - 2; i >= 0; i--) {
      const currentLine = document.lineAt(i);
      if (currentLine.isEmptyOrWhitespace) {
        continue;
      }
      const currentIndentation = currentLine.firstNonWhitespaceCharacterIndex;
      if (currentIndentation === startIndentation) {
        endLineIndex = i;
        break;
      } else if (currentIndentation < startIndentation) {
        console.log(
          `[SmartFold] No foldable range found from current to initial indent`
        );
        return null;
      }
    }

    if (endLineIndex !== -1) {
      console.log(
        `[SmartFold] Found range from current indent at line ${
          startLineIndex + 1
        } to initial indent at line ${endLineIndex + 1}`
      );
      return { start: endLineIndex, end: startLineIndex };
    } else {
      console.log(
        `[SmartFold] No foldable range found from current to initial indent`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `[SmartFold] findCurrentToInitialIndentFoldRange 오류: ${error}`
    );
    return null;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const iconPath = context.asAbsolutePath(path.join("resources", "icon.svg"));

  const decorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentIconPath: iconPath,
      width: "1em",
      height: "1em",
      margin: "0 0 0 0",
    },
  });

  function updateDecorations(editor: vscode.TextEditor | undefined) {
    if (editor) {
      const decorations: vscode.DecorationOptions[] = [];
      for (let i = 2; i < editor.document.lineCount; i++) {
        const range = findCurrentToInitialIndentFoldRange(editor.document, i);
        if (range) {
          decorations.push({ range: new vscode.Range(i, 0, i, 0) });
        }
      }
      editor.setDecorations(decorationType, decorations);
    }
  }

  // 현재 활성화된 에디터에 대해 데코레이션 업데이트
  const editor = vscode.window.activeTextEditor;
  updateDecorations(editor);

  // 에디터가 변경될 때마다 데코레이션 업데이트
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      updateDecorations(editor);
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("fold-unfold-smartly.foldUpward", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // 현재 선택된 줄 번호 가져오기
      const lineIndex = editor.selection.active.line;
      console.log(`[SmartFold] foldUpward 명령 실행 - lineIndex: ${lineIndex}`);

      // lineIndex가 유효한지 확인
      if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
        console.error(`[SmartFold] 유효하지 않은 lineIndex: ${lineIndex}`);
        return;
      }

      const range = findCurrentToInitialIndentFoldRange(
        editor.document,
        lineIndex
      );
      if (range) {
        const visibleRange = editor.visibleRanges[0];
        const startLine = visibleRange.start.line;

        vscode.commands.executeCommand("editor.fold", {
          selectionLines: [range.start + 1],
        });

        const newStartPosition = new vscode.Position(
          startLine + range.start - range.end + 3,
          0
        );
        editor.revealRange(
          new vscode.Range(newStartPosition, newStartPosition),
          vscode.TextEditorRevealType.AtTop
        );
      }
    })
  );

  console.log("[SmartFold] 확장 프로그램이 활성화되었습니다.");
  vscode.window.showInformationMessage(
    "[SmartFold] 확장 프로그램이 활성화되었습니다."
  );
}

export function deactivate() {
  console.log("[SmartFold] 비활성화되었습니다.");
}
