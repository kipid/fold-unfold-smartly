import * as vscode from "vscode";

// --- Types and Interfaces ---
interface FoldInfo {
  startLine: number;
  endLine: number;
  isFolded: boolean; // Track folded state
}

// --- Decoration Types ---
let foldDownAvailableDecoration: vscode.TextEditorDecorationType;
let foldUpAvailableDecoration: vscode.TextEditorDecorationType;
let foldDownFoldedDecoration: vscode.TextEditorDecorationType;
let foldUpFoldedDecoration: vscode.TextEditorDecorationType;

// --- Helper Functions ---

/**
 * Finds the foldable range starting from a given line.
 */
function findFoldableRange(
  lines: string[],
  startLineIndex: number
): { start: number; end: number } | null {
  if (startLineIndex >= lines.length - 1) {
    return null;
  }

  const startLine = lines[startLineIndex];
  const startIndentationMatch = startLine.match(/^\\s*/);
  if (!startIndentationMatch) return null; // Should not happen with split
  const startIndentation = startIndentationMatch[0];

  let endLineIndex = -1;
  let k = startLineIndex + 1;
  let foundChild = false;

  while (k < lines.length) {
    const currentLine = lines[k];
    const currentIndentationMatch = currentLine.match(/^\\s*/);
    if (!currentIndentationMatch) break; // Should not happen
    const currentIndentation = currentIndentationMatch[0];

    // Check if it's a child or sibling with content
    if (
      currentIndentation.length > startIndentation.length &&
      !/^\\s*$/.test(currentLine)
    ) {
      foundChild = true;
      endLineIndex = k; // Keep track of the last potential line in the fold
      k++;
    } else if (
      currentIndentation.length <= startIndentation.length &&
      !/^\\s*$/.test(currentLine)
    ) {
      // Found a line with less or equal indentation and content, stop
      break;
    } else if (/^\\s*$/.test(currentLine) && foundChild) {
      // Found a blank line after finding children, potentially part of the block
      endLineIndex = k;
      k++;
    } else if (/^\\s*$/.test(currentLine) && !foundChild) {
      // Blank line before any children, stop
      break;
    } else {
      // Equal indentation or less before finding children, stop
      break;
    }
  }

  if (foundChild && endLineIndex !== -1) {
    return { start: startLineIndex, end: endLineIndex };
  }

  return null;
}

/**
 * Updates decorations based on foldable ranges and editor state.
 */
function updateDecorations(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    return;
  }
  console.log("[SmartFold] Updating decorations..."); // Log start

  // Clear previous decorations first
  editor.setDecorations(foldDownAvailableDecoration, []);
  editor.setDecorations(foldUpAvailableDecoration, []);
  editor.setDecorations(foldDownFoldedDecoration, []);
  editor.setDecorations(foldUpFoldedDecoration, []);

  const document = editor.document;
  const lines = document.getText().split("\\n");
  const decorations: { [key: string]: vscode.DecorationOptions[] } = {
    downAvailable: [],
    upAvailable: [],
    downFolded: [],
    upFolded: [],
  };

  const currentlyFoldedRanges = editor.visibleRanges
    .map((visibleRange, i, arr) => {
      if (i > 0) {
        const prevEnd = arr[i - 1].end.line;
        const currentStart = visibleRange.start.line;
        if (currentStart > prevEnd + 1) {
          return { start: prevEnd, end: currentStart }; // Folded range exists between visible ranges
        }
      }
      return null;
    })
    .filter((r) => r !== null) as { start: number; end: number }[];

  // Helper to check if a line is within a known folded range
  const isLineFolded = (line: number): boolean => {
    return currentlyFoldedRanges.some(
      (folded) => line > folded.start && line < folded.end
    );
  };
  const getFoldStartLine = (line: number): number | null => {
    const fold = currentlyFoldedRanges.find(
      (folded) => line > folded.start && line < folded.end
    );
    return fold ? fold.start : null;
  };

  for (let i = 0; i < lines.length; i++) {
    // Skip lines that are themselves folded away
    if (isLineFolded(i)) {
      // If the line *itself* is folded, potentially show the 'folded' icon
      // on the line *before* the fold starts
      const foldStart = getFoldStartLine(i);
      if (foldStart !== null && foldStart === i - 1) {
        // Check if this is the line immediately preceding the fold
        decorations.downFolded.push({
          range: new vscode.Range(foldStart, 0, foldStart, 0),
        });
        // Also need to show the up-folded icon at the end of the actual folded range
        // We don't know the *exact* end line from visibleRanges alone easily,
        // so we rely on the calculated range later.
      }
      continue;
    }

    const rangeInfo = findFoldableRange(lines, i);

    if (rangeInfo) {
      const { start, end } = rangeInfo;
      // console.log(`[SmartFold] Found foldable range: ${start + 1}-${end + 1}`); // More detailed log

      // --- Determine Folded State ---
      // Check if the line *immediately after* the start is visible.
      // This is a heuristic, not perfect for all folding scenarios.
      let isRangeActuallyFolded = false;
      if (start + 1 <= end) {
        // Make sure there's a line to check
        isRangeActuallyFolded = !editor.visibleRanges.some(
          (vr) => vr.start.line <= start + 1 && vr.end.line >= start + 1
        );
      }
      // console.log(`[SmartFold] Line: ${start + 1}, Is Range Folded? ${isRangeActuallyFolded}`);

      // --- Apply Decorations ---
      const startLineRange = new vscode.Range(start, 0, start, 0);
      const endLineRange = new vscode.Range(end, 0, end, 0);
      const isEndLineItselfHidden = isLineFolded(end);

      if (isRangeActuallyFolded) {
        // Folded state
        // console.log(`[SmartFold] Applying Folded icons for ${start + 1}-${end + 1}`);
        decorations.downFolded.push({ range: startLineRange });
        if (!isEndLineItselfHidden) {
          decorations.upFolded.push({ range: endLineRange });
        }
      } else {
        // Available state (not folded)
        // console.log(`[SmartFold] Applying Available icons for ${start + 1}-${end + 1}`);
        decorations.downAvailable.push({ range: startLineRange });
        if (!isEndLineItselfHidden) {
          decorations.upAvailable.push({ range: endLineRange });
        }
      }
    }
  }

  // Apply decorations
  editor.setDecorations(foldDownAvailableDecoration, decorations.downAvailable);
  editor.setDecorations(foldUpAvailableDecoration, decorations.upAvailable);
  editor.setDecorations(foldDownFoldedDecoration, decorations.downFolded);
  editor.setDecorations(foldUpFoldedDecoration, decorations.upFolded);
}

// --- Activation ---
export function activate(context: vscode.ExtensionContext) {
  console.log("[SmartFold] Activating extension..."); // Log activation
  // Initialize Decoration Types with Icons
  const iconPath = (iconName: string) =>
    vscode.Uri.file(context.asAbsolutePath(`icons/${iconName}.svg`));

  foldDownAvailableDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: iconPath("fold-down-available"),
    gutterIconSize: "contain", // Or 'cover'
  });
  foldUpAvailableDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: iconPath("fold-up-available"),
    gutterIconSize: "contain",
  });
  foldDownFoldedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: iconPath("fold-down-folded"),
    gutterIconSize: "contain",
  });
  foldUpFoldedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: iconPath("fold-up-folded"),
    gutterIconSize: "contain",
  });

  // --- Commands ---
  const foldCommand = vscode.commands.registerTextEditorCommand(
    "fold-unfold-smartly.fold",
    (editor, edit) => {
      console.log("[SmartFold] Executing fold command"); // Log command
      const line = editor.selection.active.line;
      const lines = editor.document.getText().split("\\n");
      const rangeInfo = findFoldableRange(lines, line);

      if (rangeInfo) {
        // Fold the direct children of the current line
        vscode.commands
          .executeCommand("editor.fold", { selectionLines: [line + 1] })
          .then(() => {
            // Update decorations after folding might have occurred
            updateDecorations(editor);
          });
      } else {
        // Maybe try folding the parent level if current line doesn't start a block?
        // Find parent line index 'p'
        // vscode.commands.executeCommand('editor.fold', { selectionLines: [p + 1] });
        vscode.window.showInformationMessage(
          "No foldable range starting at this line."
        );
      }
    }
  );

  const unfoldCommand = vscode.commands.registerTextEditorCommand(
    "fold-unfold-smartly.unfold",
    (editor, edit) => {
      console.log("[SmartFold] Executing unfold command"); // Log command
      const line = editor.selection.active.line;
      // Check if the *current line* might be the start of a folded region
      const isPotentiallyFoldedStart = !editor.visibleRanges.some(
        (vr) => vr.start.line <= line + 1 && vr.end.line >= line + 1
      );

      if (isPotentiallyFoldedStart) {
        vscode.commands
          .executeCommand("editor.unfold", { selectionLines: [line] })
          .then(() => {
            updateDecorations(editor);
          });
      } else {
        // Check if the current line is *within* a fold (need to unfold the parent)
        const isLineHidden = !editor.visibleRanges.some((vr) =>
          vr.contains(editor.selection.active)
        );
        if (isLineHidden) {
          // Unfold commands often work by unfolding the region containing the line
          vscode.commands
            .executeCommand("editor.unfold", { selectionLines: [line] })
            .then(() => {
              updateDecorations(editor);
            });
        } else {
          vscode.window.showInformationMessage(
            "No folded range to unfold at this line."
          );
        }
      }
    }
  );

  // --- Event Listeners ---
  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      updateDecorations(editor);
    }
  );

  const textChangeListener = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorations(activeEditor);
      }
    }
  );

  // Listener for when folding changes (e.g., user manually folds/unfolds)
  const foldingChangeListener =
    vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
      updateDecorations(event.textEditor);
    });

  // --- Subscriptions ---
  context.subscriptions.push(
    foldCommand,
    unfoldCommand,
    activeEditorListener,
    textChangeListener,
    foldingChangeListener, // Add the new listener
    foldDownAvailableDecoration,
    foldUpAvailableDecoration,
    foldDownFoldedDecoration,
    foldUpFoldedDecoration
  );

  // Initial update for the currently active editor
  console.log("[SmartFold] Initial decoration update.");
  updateDecorations(vscode.window.activeTextEditor);
}

// --- Deactivation ---
export function deactivate() {
  console.log("[SmartFold] Deactivating extension."); // Log deactivation
  // Dispose decoration types if necessary, although VS Code usually handles this
  foldDownAvailableDecoration?.dispose();
  foldUpAvailableDecoration?.dispose();
  foldDownFoldedDecoration?.dispose();
  foldUpFoldedDecoration?.dispose();
}
