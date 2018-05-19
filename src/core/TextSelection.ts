import * as vscode from 'vscode';

export class TextSelection {
    constructor(selection: vscode.Selection, text: string) {
        this.selection = selection;
        this.text = text;
    }

    selection: vscode.Selection;
    text: string;
}
