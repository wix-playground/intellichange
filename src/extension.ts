'use strict';
import * as vscode from 'vscode';
import eraseTouchingWhitespaceAfterEnter from './whitespace-enter';
import replaceQuoteInsteadOfSurroundingWithNewQuotes from './quote-replacement';

export function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const improvement = selectImprovement(event, editor);
            if (improvement) {
                improvement();
            }
        }
    });
}

export function deactivate() {
}

const detectors = [
    eraseTouchingWhitespaceAfterEnter,
    replaceQuoteInsteadOfSurroundingWithNewQuotes,
];

function selectImprovement(event: vscode.TextDocumentChangeEvent, editor: vscode.TextEditor) {
    for (const detect of detectors) {
        const improvement = detect(event, editor);
        if (improvement)
            return improvement;
    }
    return null;
}
