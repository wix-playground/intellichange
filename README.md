# IntelliChange

This extension is triggered by code edits and applies additional changes when default behavior of VS Code can be improved.

## Features

* Extra whitespace removal after `Enter`

When editing single long line into multiple lines, often you have to
deal with pesky whitespace, e.g. between function parameters. This
feature eliminates the need to think about it, just press `Enter`.

![Removal of touching whitespace after pressing Enter key](images/whitespace-after-enter.gif)

## Installation

  1. > git clone git@github.com:wix-playground/intellichange.git
  2. > cd intellichange
  3. > npm install
  4. > msce package

Or, if you are from Wix, [download](https://drive.google.com/open?id=1xDFJ1qt63NpvS0aekQSKBCGhh9qmXlli) extension file instead of steps 1.-4.

  5. > code --install-extension intellichange-0.0.1.vsix
