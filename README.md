# stol-ts README

This extension has basic grammar for files used in Ground Software for the Galaxy interface. Also has some useful features and commands.

## Features

Affected file endings .rec, .page, .proc, .page, .sch
- includes highlighting for comments, keywords

Auto complete items:
    - Can type 'ccr.' to get drop down of the entire list of mneumonics.  Tlm and Cmd.  
    - Can type 'start ' or 'START ' to get a dropdown list of proc names.  Triggered on the space ' '.
    - Can type 'plot ' or 'PLOT ' to get a dropdown list of plot names.  Triggered on the space ' '.
    - Can type 'page ' or 'PAGE ' to get a dropdown list of page names.  Triggered on the space ' '.

Commands.  Type "Ctrl + Shift + P" for command pallette.
    - "Indent"
        - Prints out the full, correctly indented .proc file in OUTPUT > outChannel.
    - "CheckVars"
        - TODO, essentially a syntax checker.

## Requirements

You MUST be in the root ccor*_gsw repo for everything other than the grammar to work.  File > Open Folder > ccor_ground/ccor2_gsw

Then either install or reload this extension.  All the init stuff is done on startup.

## Extension Settings

## Known Issues

- Have to re-install or reload extension if you install it not opened on the ground repo

## Release Notes

Initial release

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
