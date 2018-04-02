'use strict';
import * as vscode from 'vscode';
import log from './log';

const QUOTES = ['\'', '"', '`'];
const ESCAPE = '\\';

export default function replaceQuoteInsteadOfSurroundingWithNewQuotes(event: vscode.TextDocumentChangeEvent, editor: vscode.TextEditor) {
    let wrapping = detectWrappingQuoteInOtherQuotes(event, editor);
    if (!wrapping) {
        return;
    }

    const wrapped = wrapping.wrappedQuote;
    const line = wrapping.opening.line;
    const wrappingEnd = wrapping.closing.translate(0, 1);
    const originalLine =
        editor.document.getText(new vscode.Range(line, 0, line, wrapping.opening.character)) +
        wrapped +
        editor.document.getText(new vscode.Range(line, wrappingEnd.character, line, Infinity));

    const pairedQuote = findPairedWrappingQuote(originalLine, wrapping.opening.character);
    const pairedIsClosing = pairedQuote ? pairedQuote > wrapping.opening.character : false;
    let fullStringReplacement: {range: vscode.Range, text: string} | null = null;
    let newSelection: vscode.Selection | null = null;
    
    if (pairedQuote) {
        const stringStart = pairedIsClosing ? wrapping.opening.character + 1 : pairedQuote + 1;
        const stringEnd = pairedIsClosing ? pairedQuote : wrapping.opening.character;
        const stringText = originalLine.substring(stringStart, stringEnd);
        const fixedText = fixQuoteEscaping(stringText, wrapping.insertedQuote);
        const w = wrapped;
        const q = wrapping.insertedQuote;
        log(`transforming ${w}${stringText}${w} to ${q}${fixedText}${q}`);

        if (fixedText) {
            const start = pairedIsClosing ? wrapping.opening : new vscode.Position(line, pairedQuote);
            const endIndex = pairedIsClosing ? pairedQuote + 3 : wrapping.closing.character + 1;
            fullStringReplacement = {
                range: new vscode.Range(start, new vscode.Position(line, endIndex)),
                text: `${q}${fixedText}${q}`
            }
            const offset = pairedIsClosing ? 0 : fixedText.length - stringText.length;
            newSelection = new vscode.Selection(
                wrapping.opening.translate(0, offset),
                wrapping.opening.translate(0, offset + 1));
        } else {
            newSelection = new vscode.Selection(wrapping.opening, wrapping.opening.translate(0, 1));
        }
    }

    const replaceQuotes = (editBuilder: vscode.TextEditorEdit) => {
        if (fullStringReplacement) {
            editBuilder.replace(fullStringReplacement.range, fullStringReplacement.text);
        } else if (wrapping) {
            const wrappingRange = new vscode.Range(wrapping.opening, wrappingEnd);
            editBuilder.replace(wrappingRange, wrapping.insertedQuote);
            if (pairedQuote) {
                const offset = pairedIsClosing ? 2 : 0;
                const range = new vscode.Range(line, pairedQuote + offset, line, pairedQuote + offset + 1);
                editBuilder.replace(range, wrapping.insertedQuote);
            }
        }
    };

    return async () => {
        const replacement = editor.edit(replaceQuotes);
    
        if (newSelection) {
            await replacement;
            editor.selection = newSelection;
        }
    }
}

function detectWrappingQuoteInOtherQuotes(event: vscode.TextDocumentChangeEvent, editor: vscode.TextEditor) {
    if (event.contentChanges.length != 2) {
        log(`abort - made ${event.contentChanges.length} changes`);
        return;
    }

    const first = event.contentChanges[0];
    const second = event.contentChanges[1];
    if (first.text != second.text) {
        log(`abort - inserted texts do not match`);
        return;
    }

    if (QUOTES.indexOf(first.text) == -1) {
        log(`abort - '${first.text}' is not a quote`);
        return;
    }

    if (first.rangeLength != 0 || second.rangeLength != 0) {
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

    if (wrappedCharacterCount != 1) {
        log(`abort - wrapped ${wrappedCharacterCount} characters`);
        return;
    }

    const wrappedStart = start.translate(0, 1);
    const wrapped = editor.document.getText(new vscode.Range(wrappedStart, end));

    if (QUOTES.indexOf(wrapped) == -1) {
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

function findPairedWrappingQuote(text: string, position: number) {
    let wrappingQuote = null;
    let wrappingStart = null;
    let isEscaped = false;
    for (let index = 0; index < text.length; index++) {
        if (wrappingQuote) {
            if (isEscaped) {
                if (index == position) {
                    return undefined;
                } else {
                    isEscaped = false;
                    continue;
                }
            }
            const foundClosingQuote = wrappingQuote == text[index];
            if (index == position) {
                return foundClosingQuote ? wrappingStart : undefined;
            } else if (foundClosingQuote) {
                if (wrappingStart == position) {
                    return index;
                }
                wrappingQuote = null;
                wrappingStart = null;
            } else if (ESCAPE == text[index]) {
                isEscaped = true;
            }
        } else if (QUOTES.indexOf(text[index]) != -1) {
            wrappingQuote = text[index];
            wrappingStart = index;
        }
    }
    return undefined;
}

function fixQuoteEscaping(text: string, wrappingQuote: string): string | null {
    let isEscaped = false;
    let fixed = null;
    for (let i = 0; i < text.length; i++) {
        const symbol = text[i];
        if (ESCAPE == symbol) {
            isEscaped = !isEscaped;
        } else {
            if (QUOTES.indexOf(symbol) != -1) {
                const needsEscaping = symbol == wrappingQuote;
                const needsChanges = isEscaped != needsEscaping;
                if (needsChanges) {
                    if (fixed == null) {
                        fixed = text.substring(0, i);
                    }
                    if (needsEscaping) {
                        fixed += ESCAPE;
                    } else {
                        fixed = fixed.substring(0, fixed.length - 1);
                    }
                }
            }
            isEscaped = false;
        }

        if (fixed) {
            fixed += symbol;
        }
    }

    return fixed;
}
