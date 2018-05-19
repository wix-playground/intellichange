'use strict';
import * as vscode from 'vscode';
import eraseTouchingWhitespaceAfterEnter from './whitespace-enter';
import replaceQuoteInsteadOfSurroundingWithNewQuotes from './quote-replacement';
import replacePairedQuoteWhenReplacingQuoteWithQuote from './quote-pairing';
import {TextSelection} from './core/TextSelection';

export function activate(context: vscode.ExtensionContext) {

    let activeSelection : TextSelection | undefined = getSelectionData(vscode.window.activeTextEditor);
    const subscriptions: vscode.Disposable[] = [];

    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const improvement = selectImprovement(event, editor, activeSelection);
            if (improvement) {
                improvement();
            }
        }
    }, null, subscriptions);

    vscode.window.onDidChangeTextEditorSelection(event => {
        activeSelection = getSelectionData(event.textEditor, event.selections);
    }, null, subscriptions);

    context.subscriptions.push(...subscriptions);
}

export function deactivate() {
}

const detectors = [
    eraseTouchingWhitespaceAfterEnter,
    replaceQuoteInsteadOfSurroundingWithNewQuotes,
    replacePairedQuoteWhenReplacingQuoteWithQuote,
];

function selectImprovement(event: vscode.TextDocumentChangeEvent, editor: vscode.TextEditor, activeSelection?: TextSelection) {
    for (const detect of detectors) {
        const improvement = detect(event, editor, activeSelection);
        if (improvement) {
            return improvement;
        }
    }
    return null;
}

function getSelectionData(editor?: vscode.TextEditor, selections?: vscode.Selection[]) : TextSelection | undefined {
    if (!editor) {
        return;
    }

    const source = selections || editor.selections;
    if (source.length !== 1) {
        return;
    }

    const text = editor.document.getText(source[0]);
    return new TextSelection(source[0], text);
}
