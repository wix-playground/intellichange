'use strict';
import * as vscode from 'vscode';

export const QUOTES = ['\'', '"', '`'];
export const ESCAPE = '\\';

export function findPairedWrappingQuote(text: string, position: number) {
    let wrappingQuote = null;
    let wrappingStart = null;
    let isEscaped = false;
    for (let index = 0; index < text.length; index++) {
        if (wrappingQuote) {
            if (isEscaped) {
                if (index === position) {
                    return undefined;
                } else {
                    isEscaped = false;
                    continue;
                }
            }
            const foundClosingQuote = wrappingQuote === text[index];
            if (index === position) {
                return foundClosingQuote ? wrappingStart : undefined;
            } else if (foundClosingQuote) {
                if (wrappingStart === position) {
                    return index;
                }
                wrappingQuote = null;
                wrappingStart = null;
            } else if (ESCAPE === text[index]) {
                isEscaped = true;
            }
        } else if (QUOTES.indexOf(text[index]) !== -1) {
            wrappingQuote = text[index];
            wrappingStart = index;
        }
    }
    return undefined;
}

export function transformQuoteEscaping(text: string, wrappingQuote: string): string {
    let isEscaped = false;
    let fixed = null;
    for (let i = 0; i < text.length; i++) {
        const symbol = text[i];
        if (ESCAPE === symbol) {
            isEscaped = !isEscaped;
        } else {
            if (QUOTES.indexOf(symbol) !== -1) {
                const needsEscaping = symbol === wrappingQuote;
                const needsChanges = isEscaped !== needsEscaping;
                if (needsChanges) {
                    if (fixed === null) {
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

    return fixed || text;
}

export function extractStringLiteralText(text: string, quoteIndex: number, pairedQuoteIndex: number) : string {
  const stringStart = Math.min(quoteIndex, pairedQuoteIndex) + 1;
  const stringEnd = Math.max(quoteIndex, pairedQuoteIndex);
  return text.substring(stringStart, stringEnd);
}

export function stringLiteralRange(line: number, quoteIndex: number, pairedQuoteIndex: number): vscode.Range {
  const start = Math.min(quoteIndex, pairedQuoteIndex);
  const end = Math.max(quoteIndex, pairedQuoteIndex) + 1;
  return new vscode.Range(new vscode.Position(line, start), new vscode.Position(line, end));
}
