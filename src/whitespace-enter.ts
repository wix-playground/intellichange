'use strict';
import * as vscode from 'vscode';
import log from './log';

export default function eraseTouchingWhitespaceAfterEnter(event: vscode.TextDocumentChangeEvent, editor: vscode.TextEditor) {
    const changesCausedByEnter = detectEnterKeyPress(event);
    if (!changesCausedByEnter) {
        return;
    }

    const oldLineIndex = changesCausedByEnter.range.start.line;
    const newLineIndex = oldLineIndex + 1;
    const oldLineText = editor.document.getText(new vscode.Range(oldLineIndex, 0, oldLineIndex, Infinity));
    const newLineText = editor.document.getText(new vscode.Range(newLineIndex, 0, newLineIndex, Infinity));
    const oldLineWhitespace = oldLineText.match(/\s+$/);
    const newLineWhitespace = newLineText.substring(changesCausedByEnter.text.length - 1).match(/^\s+/);

    const eraseTouchingWhitespace = (editBuilder: vscode.TextEditorEdit) => {
        if (oldLineWhitespace) {
            const size = oldLineWhitespace[0].length;
            const endingWhitespace = new vscode.Range(oldLineIndex, oldLineText.length - size, oldLineIndex, oldLineText.length);
            editBuilder.delete(endingWhitespace);
            log(`remove ${size} characters from old line`);
        }
        if (newLineWhitespace) {
            const size = newLineWhitespace[0].length;
            const start = changesCausedByEnter.text.length - 1;
            const cursorWhitespace = new vscode.Range(newLineIndex, start, newLineIndex, start + size);
            editBuilder.delete(cursorWhitespace);
            log(`remove ${size} characters from new line`);
        }
    };

    return async () => {
        editor.edit(eraseTouchingWhitespace);
    }
}

function detectEnterKeyPress(event: vscode.TextDocumentChangeEvent) {
    if (event.contentChanges.length !== 1) {
        log(`abort - made ${event.contentChanges.length} changes`);
        return;
    }

    const change = event.contentChanges[0];
    if (!change.text.match(/^\n\s*$/)) {
        log(`abort - change does not match enter key press pattern`);
        return;
    }

    return change;
}
