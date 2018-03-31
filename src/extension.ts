'use strict';
import * as vscode from 'vscode';
import eraseTouchingWhitespaceAfterEnter from './whitespace-enter';

export function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const improvement = eraseTouchingWhitespaceAfterEnter(event, editor);
            if (improvement) {
                improvement.apply();
            }
        }
    });
}

export function deactivate() {
}
