'use strict';
import * as vscode from 'vscode';
import {TextSelection} from './core/TextSelection';
import {findPairedWrappingQuote, transformQuoteEscaping, extractStringLiteralText, stringLiteralRange, QUOTES} from './core/string-literal';
import log from './core/log';

export default function replaceQuoteInsteadOfSurroundingWithNewQuotes(
    event: vscode.TextDocumentChangeEvent,
    editor: vscode.TextEditor,
    activeSelection?: TextSelection
) {
    let wrapping = detectWrappingQuoteInOtherQuotes(event, editor);
    if (wrapping) {
        return generateFix(editor, wrapping);
    }
}

function generateFix(editor: vscode.TextEditor, wrapping: any) {
    const line = wrapping.opening.line;
    const originalLine =
        editor.document.getText(new vscode.Range(line, 0, line, wrapping.opening.character)) +
        wrapping.wrappedQuote +
        editor.document.getText(new vscode.Range(line, wrapping.closing.character + 1, line, Infinity));

    const pairedQuote = findPairedWrappingQuote(originalLine, wrapping.opening.character);

    if (pairedQuote) {
      return generateStringLiteralFix(editor, originalLine, pairedQuote, wrapping);
    } else {
      return generateIsolatedFix(editor, wrapping);
    }
}

function generateStringLiteralFix(editor: vscode.TextEditor, originalLine: string, pairedQuote: number, {wrappedQuote, insertedQuote, opening}: any) {
    const stringText = extractStringLiteralText(originalLine, opening.character, pairedQuote);
    const fixedText = transformQuoteEscaping(stringText, insertedQuote);
    log(`transforming ${wrappedQuote}${stringText}${wrappedQuote} to ${insertedQuote}${fixedText}${insertedQuote}`);

    const replaceString = (editBuilder: vscode.TextEditorEdit) => {
        const rangeInOriginalLine = stringLiteralRange(opening.line, opening.character, pairedQuote);
        const rangeInCurrentLine = rangeInOriginalLine.with(undefined, rangeInOriginalLine.end.translate(0, 2));
        editBuilder.replace(rangeInCurrentLine, `${insertedQuote}${fixedText}${insertedQuote}`);
    };

    return async () => {
        await editor.edit(replaceString);
        editor.selection = new vscode.Selection(opening, opening.translate(0, 1));
    };
}

function generateIsolatedFix(editor: vscode.TextEditor, {opening, insertedQuote, closing}: any) {
    const unwrap = (editBuilder: vscode.TextEditorEdit) => {
        const range = new vscode.Range(opening, closing.translate(0, 1));
        editBuilder.replace(range, insertedQuote);
    };

    return async () => {
        editor.edit(unwrap);
    };
}

function detectWrappingQuoteInOtherQuotes(event: vscode.TextDocumentChangeEvent, editor: vscode.TextEditor) {
    if (event.contentChanges.length !== 2) {
        log(`abort - made ${event.contentChanges.length} changes`);
        return;
    }

    const first = event.contentChanges[0];
    const second = event.contentChanges[1];
    if (first.text !== second.text) {
        log(`abort - inserted texts do not match`);
        return;
    }

    if (QUOTES.indexOf(first.text) === -1) {
        log(`abort - '${first.text}' is not a quote`);
        return;
    }

    if (first.rangeLength !== 0 || second.rangeLength !== 0) {
        log(`abort - some text was replaced`);
        return;
    }

    if (first.range.start.line !== second.range.start.line) {
        log(`abort - insertion in multiple lines`);
        return;
    }

    const insertion1 = first.range.start.character;
    const insertion2 = second.range.start.character;

    let wrappedCharacterCount, start, end;
    if (insertion1 > insertion2) {
        wrappedCharacterCount = insertion1 - insertion2;
        start = new vscode.Position(second.range.start.line, insertion2);
        end = new vscode.Position(first.range.start.line, insertion1 + second.text.length);
    } else {
        wrappedCharacterCount = insertion2 - insertion1 - first.text.length;
        start = new vscode.Position(first.range.start.line, insertion1);
        end = new vscode.Position(second.range.start.line, insertion2);
    }

    if (wrappedCharacterCount !== 1) {
        log(`abort - wrapped ${wrappedCharacterCount} characters`);
        return;
    }

    const wrappedStart = start.translate(0, 1);
    const wrapped = editor.document.getText(new vscode.Range(wrappedStart, end));

    if (QUOTES.indexOf(wrapped) === -1) {
        log(`abort - wrapped '${wrapped}' is not a quote`);
        return;
    }

    const result = {
        insertedQuote: first.text,
        wrappedQuote: wrapped,
        opening: start,
        closing: end
    };

    log(`single quote wrapped in quotes ${JSON.stringify(result)}`);
    return result;
}
