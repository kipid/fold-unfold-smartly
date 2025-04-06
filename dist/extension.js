import * as vscode from "vscode";
export function activate(context) {
    // 위쪽으로 fold 되었을 때 표시할 기호 설정
    const upwardDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: "≻", // 위쪽으로 fold 되었을 때 표시
            margin: "0 0 0 -1em",
        },
    });
    // 아래쪽으로 fold 되었을 때 표시할 기호 설정
    const downwardDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: "≺", // 아래쪽으로 fold 되었을 때 표시
            margin: "0 0 0 -1em",
        },
    });
    // 위쪽에서 fold 될 수 있는 상태 표시 기호 설정
    const upwardAvailableDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: "∨", // 위쪽에서 fold 가능한 상태일 때 표시
            margin: "0 0 0 -1em",
        },
    });
    // 아래쪽에서 fold 될 수 있는 상태 표시 기호 설정
    const downwardAvailableDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: "∧", // 아래쪽에서 fold 가능한 상태일 때 표시
            margin: "0 0 0 -1em",
        },
    });
    const foldRange = function (lines, i, currentIndentation) {
        if (!new RegExp(`^${currentIndentation}[\\s\\t]`).test(lines[i + 1])) {
            return null;
        }
        let k;
        for (k = i + 2; k < lines.length; k++) {
            if (!new RegExp(`^${currentIndentation}[\\s\\t]`).test(lines[k])) {
                break;
            }
        }
        const initialRange = new vscode.Range(i, 0, i, lines[i].length);
        if (k === lines.length) {
            k--;
        }
        const lastRange = new vscode.Range(k, 0, k, lines[k].length);
        return {
            initialRange: { range: initialRange, initialLine: i, lastLine: k },
            lastRange: { range: lastRange, initialLine: i, lastLine: k },
        };
    };
    // 활성화된 텍스트 에디터가 변경될 때마다 호출되는 이벤트 리스너
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        var _a;
        if (editor) {
            const text = editor.document.getText(); // 현재 문서의 텍스트 가져오기
            const lines = text.split("\n"); // 텍스트를 줄 단위로 나누기
            const upwardDecorations = []; // 위쪽 방향 기호를 위한 배열 "≻"
            const downwardDecorations = []; // 아래쪽 방향 기호를 위한 배열 "≺"
            const upwardAvailableDecorations = []; // 위쪽에서 fold 가능한 상태 기호 배열 "∨"
            const downwardAvailableDecorations = []; // 아래쪽에서 fold 가능한 상태 기호 배열 "∧"
            // 각 줄을 순회하며 기호를 설정
            for (let i = 0; i < lines.length; i++) {
                const currentIndentation = (_a = lines[i].match(/^\s*/)) === null || _a === void 0 ? void 0 : _a[0]; // 현재 줄의 indentation 가져오기
                const res = foldRange(lines, i, currentIndentation);
                if (res) {
                    // 아래쪽으로 fold 가능한 상태일 때 "∧" 기호 표시
                    downwardAvailableDecorations.push({
                        range: new vscode.Range(res.initialRange.initialLine, 0, res.initialRange.initialLine, 0),
                    });
                    // 아래쪽으로 fold 되었을 때 "≺" 기호 표시
                    downwardDecorations.push({
                        range: new vscode.Range(res.initialRange.initialLine, 0, res.initialRange.initialLine, 0),
                    });
                    // 위쪽으로 fold 가능한 상태일 때 "∨" 기호 표시
                    upwardAvailableDecorations.push({
                        range: new vscode.Range(res.lastRange.lastLine, 0, res.lastRange.lastLine, 0),
                    });
                    // 위쪽으로 fold 되었을 때 "≻" 기호 표시
                    upwardDecorations.push({
                        range: new vscode.Range(res.lastRange.lastLine, 0, res.lastRange.lastLine, 0),
                    });
                }
            }
            // 에디터에 기호 설정
            editor.setDecorations(downwardDecorationType, downwardDecorations);
            editor.setDecorations(upwardDecorationType, upwardDecorations);
            editor.setDecorations(upwardAvailableDecorationType, upwardAvailableDecorations);
            editor.setDecorations(downwardAvailableDecorationType, downwardAvailableDecorations);
        }
    });
    // 텍스트 에디터의 선택이 변경될 때마다 호출되는 이벤트 리스너
    vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor; // 현재 에디터 가져오기
        const selections = event.selections; // 현재 선택된 영역 가져오기
        selections.forEach((selection) => {
            var _a;
            const line = selection.active.line; // 선택된 줄 번호
            const text = editor.document.lineAt(line).text; // 선택된 줄의 텍스트
            // 클릭된 줄의 indentation 확인
            const currentIndentation = (_a = text.match(/^\s*/)) === null || _a === void 0 ? void 0 : _a[0];
            // foldRange 함수에서 이미 같은 indentation을 가진 위쪽 줄을 찾았으므로, 여기서는 foldRange를 사용하여 fold 처리
            const res = foldRange(editor.document.getText().split("\n"), line, currentIndentation);
            if (res) {
                vscode.window.showInformationMessage(`Folding lines from ${res.initialRange.initialLine + 1} to ${res.lastRange.lastLine + 1}`);
                // 실제 fold 처리 로직 추가
                const rangesToFold = [];
                for (let i = res.initialRange.initialLine; i <= res.lastRange.lastLine; i++) {
                    rangesToFold.push(new vscode.Range(i, 0, i, editor.document.lineAt(i).text.length));
                }
                // Fold 처리 로직
                editor.setDecorations(downwardDecorationType, []);
                editor.setDecorations(upwardDecorationType, []);
                editor.setDecorations(upwardAvailableDecorationType, []);
                editor.setDecorations(downwardAvailableDecorationType, []);
                // 스크롤 조정
                editor.revealRange(new vscode.Range(res.initialRange.initialLine, 0, res.initialRange.initialLine, 0), vscode.TextEditorRevealType.InCenter);
            }
        });
    });
    // 확장 기능을 사용할 수 있도록 context에 등록
    context.subscriptions.push(upwardDecorationType);
    context.subscriptions.push(downwardDecorationType);
    context.subscriptions.push(upwardAvailableDecorationType);
    context.subscriptions.push(downwardAvailableDecorationType);
}
export function deactivate() { }
