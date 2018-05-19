'use strict';
import * as vscode from 'vscode';
import {TextSelection} from './core/TextSelection';
import {findPairedWrappingQuote, transformQuoteEscaping, extractStringLiteralText, stringLiteralRange, QUOTES} from './core/string-literal';
import log from './core/log';

export default function replacePairedQuoteWhenReplacingQuoteWithQuote(
    event: vscode.TextDocumentChangeEvent,
    editor: vscode.TextEditor,
    activeSelection?: TextSelection
) {
    let replacement = detectQuoteReplacement(event, activeSelection);
    if (replacement) {
        return generateFix(editor, replacement);
    }
}

function generateFix(editor: vscode.TextEditor, {position, newQuote, oldQuote}: any) {
    const lineIndex = position.line;
    const originalLine =
        editor.document.getText(new vscode.Range(lineIndex, 0, lineIndex, position.character)) +
        oldQuote +
        editor.document.getText(new vscode.Range(lineIndex, position.character + 1, lineIndex, Infinity));

    const pairedQuote = findPairedWrappingQuote(originalLine, position.character);
    if (!pairedQuote) {
        log(`nothing to do - paired quote not found`);
        return;
    }

    const stringText = extractStringLiteralText(originalLine, position.character, pairedQuote);
    const fixedText = transformQuoteEscaping(stringText, newQuote);
    log(`transforming ${oldQuote}${stringText}${oldQuote} to ${newQuote}${fixedText}${newQuote}`);

    const replaceQuotes = (editBuilder: vscode.TextEditorEdit) => {
        const range = stringLiteralRange(position.line, position.character, pairedQuote);
        editBuilder.replace(range, `${newQuote}${fixedText}${newQuote}`);
    };

    return async () => {
        await editor.edit(replaceQuotes);
        editor.selection = new vscode.Selection(position, position.translate(0, 1));
    };
}

function detectQuoteReplacement(event: vscode.TextDocumentChangeEvent, activeSelection?: TextSelection) {
    if (!activeSelection) {
        log(`abort - no active selection`);
        return;
    }

    if (QUOTES.indexOf(activeSelection.text) === -1) {
        log(`abort - selected '${activeSelection.text}' is not a quote`);
        return;
    }

    if (event.contentChanges.length !== 1) {
        log(`abort - made ${event.contentChanges.length} changes`);
        return;
    }

    const change = event.contentChanges[0];

    if (QUOTES.indexOf(change.text) === -1) {
        log(`abort - inserted '${change.text}' is not a quote`);
        return;
    }

    if (activeSelection.text === change.text) {
        log(`abort - quotes match`);
        return;
    }

    if (change.rangeLength === 0) {
        log(`abort - no text replacement detected`);
        return;
    }

    const result = {
        newQuote: change.text,
        oldQuote: activeSelection.text,
        position: change.range.start,
    };

    log(`single quote replaced by another quote ${JSON.stringify(result)}`);
    return result;
}
