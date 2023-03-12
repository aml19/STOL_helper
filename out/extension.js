"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const fs_1 = require("fs");
const vscode = require("vscode");
var mneumonicList = [];
//holds all STOL keywords
let keywords = ["lt", "gt", "ne", "eq", "and", "or", "if", "then", "while", "for", "return", "acquire",
    "archive", "ask", "break", "breakpoint", "cfgmon", "close", "cmd", "continue", "date", "dir", "disable", "do", "dumpfile",
    "else", "elseif", "enable", "enddo", "endif", "endproc", "eval", "event", "free", "get", "global", "go", "goto", "gpib", "graph",
    "hotkey", "if", "killproc", "let", "limits", "local", "log", "mode verification", "namespace", "open", "page", "pktdump",
    "playback", "plot", "preview", "proc", "quit", "raw", "read", "rem", "report", "return", "scevent", "seqprt", "set",
    "setcoef", "shoval", "snap", "speed", "start", "stripchart", "system", "tfdump", "timeon", "validate", "verify", "wait",
    "write", "zero", "not", "concat", "until", "=", "", "(", ")", "[", "]", "{", "}"];
const PATH = require("path");
const FS = require("fs");
let FILES = [];
var databaseFields = new Array();
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    //put initialization here
    databaseFields = getPacketNames();
    //mneumonicList = populateMneumonicsList();
    //output channel to display stuff to
    let channel = vscode.window.createOutputChannel("outChannel");
    console.log('STOL helper loaded successfully');
    //This is a test command
    let testCmd = vscode.commands.registerCommand('stol-ts.test', function () {
        // Display a message box to the user
        vscode.window.showInformationMessage('Testing Commands');
        console.log("TESTING");
        channel.appendLine("TESTING");
        channel.append("TESTING2");
        channel.appendLine("TESTING3");
        channel.append("4");
        channel.show();
        vscode.window.showInformationMessage('Finished testing command');
    });
    //This is a test command
    let checkVars = vscode.commands.registerCommand('stol-ts.checkVars', function () {
        // Display a message box to the user
        vscode.window.showInformationMessage('Checking Variables');
        findBadVariables();
    });
    //This command goes through the file and checks for redeclared and undeccasdfsa
    //This command loads all the rec file definitions and members
    /*let loadRec = vscode.commands.registerCommand('stol-ts.loadRec', function () {
        // Display a message box to the user
        vscode.window.showInformationMessage('Loading rec database');

        databaseFields = populateDatabaseMembers();
        console.log(populateDatabaseMembers());

        vscode.window.showInformationMessage('Finished loading rec database');
    });*/
    // provides list of mneumonics on "CCR_" trigger
    /*const mneumonicProvider = vscode.languages.registerCompletionItemProvider(
        'stol',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

                // get all text until the `position` and check if it reads `ccr.`
                // and if so then return all mneumonics in xtce_tlm and xtce_cmd
                const linePrefix = document.lineAt(position).text.substring(0, position.character);
                if (!linePrefix.endsWith('ccr.')) {
                    return undefined;
                }

                return mneumonicList;
            }
        },
        '.' // triggered whenever a '.' is being typed
    );*/
    //provides autocomplete for all rec file definitions including packets
    /*const databaseProvider = vscode.languages.registerCompletionItemProvider(
        'rec',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position){
                const linePrefix = document.lineAt(position).text.substring(0,position.character);
                //wrap in for each
                databaseFields.forEach(field =>{
                    if(!linePrefix.endsWith(field[0])){
                        return undefined;
                    }
                    //if a valid name and '.' is pressed, return all tokens belonging to that name
                    return field[1];
                });
                
            }
        },
        '.'		// triggered when a '.' is being typed
        );

*/
    //context.subscriptions.push(mneumonicProvider, loadRec);
    context.subscriptions.push(testCmd);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
/**
 * 	Purpose: goes through current file and looks for undeclared/redeclared variables
 * 	Inputs:
 * 	Outputs: returns list of tuple of words and row,col format
 * 	Details: Only works with local and LOCAL, can't do mixed case
 */
function findBadVariables() {
    let message;
    let filepath;
    if (vscode.workspace.workspaceFolders !== undefined) {
        let wf = vscode.workspace.workspaceFolders[0].uri.path;
        let f = vscode.workspace.workspaceFolders[0].uri.fsPath;
        let f2 = vscode.workspace.workspaceFile?.path;
        let declaredArray = [];
        let errorsArray = [];
        let varString = "";
        let foundLocal = false;
        let lineCount = 1;
        let isQuote = false; //tracks quotes across multiple lines
        //message = `YOUR-EXTENSION: folder: ${wf} - ${f2}` ;
        filepath = vscode.window.activeTextEditor?.document.fileName;
        if (filepath === undefined) {
            message = "File in focus is weird.  Can't read the file";
            vscode.window.showInformationMessage(message);
            return;
        }
        console.log(filepath);
        //open file for reading and tokenizing
        const result = (0, fs_1.readFileSync)(filepath, 'utf-8');
        result.split(/\r?\n/).forEach(line => {
            //console.log(line);
            //find all declared variables denoted by line starting with 'local'.  case insensitive
            //TODO get first word and toUpper
            var indexlowerL = line.indexOf("local ");
            var indexUpperL = line.indexOf("LOCAL ");
            //init varString to line
            varString = line.trim();
            var commentPos = varString.indexOf(';');
            //get only non-commented part
            if (commentPos !== -1) {
                varString = varString.substring(0, commentPos);
            }
            //Check for quotations, delete text within
            var quotePos = varString.indexOf('"');
            var nextQuotePos = varString.indexOf('"', quotePos + 1);
            if (quotePos !== -1) {
                //while there are more quotes in the string
                while (quotePos !== -1) {
                    //see if quote spans lines
                    if (nextQuotePos === -1) {
                        isQuote = true;
                    }
                    else {
                        varString = varString.slice(0, quotePos + 1) + varString.slice(nextQuotePos, varString.length); //keep quotes in string to see assign
                        quotePos = varString.indexOf('"', quotePos + 2);
                        nextQuotePos = varString.indexOf('"', quotePos + 1);
                    }
                }
            }
            if (indexlowerL !== -1) {
                varString = line.substring(indexlowerL + 5, varString.length).trim();
                foundLocal = true;
            }
            else if (indexUpperL !== -1) {
                varString = line.substring(indexUpperL + 5, varString.length).trim();
                foundLocal = true;
            }
            /*Not local defintion. Check for excusable cases that ARE NOT errors:
                - mneumonic starting with ccr_
                - keyword or '='
                - number
                - inside a comment
            Skip if comment char is first in the line
            Skip if multiline quote
            */
            if (foundLocal === false && commentPos !== 0 && isQuote === false) {
                var previousVar = "";
                //split line with special chars
                varString.split(/[ (),\t]/).forEach(variable => {
                    variable = variable.trim();
                    var isError = true;
                    //Checking if it's a mneumonic
                    if (variable.indexOf("CCR_") === 0 || variable.indexOf('ccr_') === 0 || variable.indexOf("Ccr_") === 0) {
                        isError = false;
                    }
                    //Checking keywords
                    if (isError === true) {
                        //TODO optimize this to break out when keyword matches
                        keywords.forEach(keyword => {
                            if (keyword === variable) {
                                isError = false;
                            }
                        });
                    }
                    //Checking declared var list
                    if (isError === true) {
                        declaredArray.forEach(declaredVar => {
                            if (declaredVar === variable) {
                                isError = false;
                            }
                        });
                    }
                    //Checking if it's a number
                    if (isError === true) {
                        var numRegex = /([0-9])\w+/;
                        if (numRegex.test(variable)) {
                            isError = false;
                        }
                    }
                    //Checking if it's a comment
                    if (isError === true) {
                        if (varString.indexOf(variable) > commentPos && commentPos > 0) {
                            isError = false;
                        }
                    }
                    //check variable before quotes
                    if (isError === true && variable === '""') {
                        if (previousVar === "ask" || previousVar === "=") {
                            isError = false;
                        }
                    }
                    //It's an error, populate error array
                    if (isError === true) {
                        errorsArray.push([variable.trim(), lineCount]);
                    }
                    previousVar = variable;
                });
            }
            //get comma separated variables afterwards
            else {
                varString.split(/, /).forEach(variable => {
                    //Take tokens left of comment, or all of them if there is no comment
                    if (varString.indexOf(variable) < commentPos || commentPos === -1) {
                        declaredArray.push(variable.trim());
                    }
                });
            }
            //update flags for next pass
            varString = "";
            foundLocal = false;
            lineCount++;
        });
        if (isQuote === true) {
            errorsArray.push(["QUOTE NEVER ENDED!", lineCount]);
        }
        console.log("Declared Array: " + declaredArray);
        console.log("Errors Array: " + errorsArray);
    }
    else {
        message = "YOUR-EXTENSION: Working folder not found, open a folder an try again";
        vscode.window.showErrorMessage(message);
    }
}
/*
    Purpose: Go through all rec files and get packet structure names
    Details: reads until PROTOCOL.CCSDSCCORTelemetryPacket is in the line
    Outputs: list of packet names
*/
function getPacketNames() {
    var result = new Array();
    var lines;
    //get all the rec files
    var path = "";
    if (vscode.workspace.workspaceFolders !== undefined) {
        var path = vscode.workspace.workspaceFolders[0].uri.fsPath + "/rec";
        recurseThroughDirs(path); //populates FILES global
    }
    else {
        vscode.window.showInformationMessage('Unable to find rec files.');
        return result;
    }
    for (const file of FILES) {
        //if line contains CCSDSCCTelemtryPacket
        lines = (0, fs_1.readFileSync)(file, 'utf-8');
        lines.split(/\r?\n/).forEach(line => {
            if (line.indexOf("CCSDSCCORTelemetryPacket") !== -1) {
                var previousToken = "";
                //get word right after tlmpacket.  Can optimze this way better, by getting next group of letters instead of splitting.
                line.split(/\s/).forEach(token => {
                    if (previousToken.indexOf("CCSDSCCORTelemetryPacket") !== -1) {
                        if (token.indexOf("{") === -1 && token.indexOf("}") === -1) {
                            result.push(token);
                        }
                    }
                    previousToken = token;
                });
            }
        });
    }
    return result;
}
/*	Purpose: Goes through xtce_tlm and xtce_cmd.rec files to grab all the CCR_* mneumonics
    Inputs:
    Outputs: returns list of vscode.CompletionItem
    Details: Chops off "CCR_" from the string to auto complete when user types "ccr_"

*/
function populateMneumonicsList() {
    var path = "";
    if (vscode.workspace.workspaceFolders !== undefined) {
        var path = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    var tempA = [];
    var tlmString = "";
    const result = (0, fs_1.readFileSync)(path + "/rec/xtce_tlm.rec", 'utf-8');
    result.split(/\r?\n/).forEach(line => {
        var index = line.indexOf("CCR_");
        var end = line.indexOf("{", index + 1);
        var sub = line.substring(index, end - 1).trim();
        if (sub.length > 3) {
            tlmString += sub + "\n";
            var item = new vscode.CompletionItem(sub, vscode.CompletionItemKind.Variable);
            item.detail = "Detail";
            item.documentation = "documentation";
            tempA.push(item);
            //console.log(tlmString + "\n");
        }
    });
    //console.log(`${path}`);
    return tempA;
    //writeFile("/home/andrew/work/ccor2_gsw/rec/test.rec", tlmString);
}
/*	Purpose:	Find all packet structures and get their members for autocompletion
    Details:	Finds name before first '{' not with comment, goes until the matching closing bracket is found.
                    Uses U*\b, S*\b, etc identifiers for member names
*/
function populateDatabaseMembers() {
    var result = new Array();
    var line;
    var name = "";
    var paranths = 1; //used to keep track of paranths
    var insideParanths = false;
    var re = /^\s*(U|I|S)+\d/;
    var insidePacket = false;
    var token = "";
    var previousName = "";
    //get all the rec files
    var path = "";
    if (vscode.workspace.workspaceFolders !== undefined) {
        var path = vscode.workspace.workspaceFolders[0].uri.fsPath + "/rec";
        recurseThroughDirs(path); //populates FILES global
    }
    else {
        vscode.window.showInformationMessage('Unable to find rec files.');
        return result;
    }
    var identifiers = ["CCSDSCCORTelemetryPacket"];
    //go through each of the rec files and add to tuple
    for (const file of FILES) {
        //if line contains CCSDSCCTelemtryPacket
        line = (0, fs_1.readFileSync)(file, 'utf-8');
        line.split(/\r?\n/).forEach(line => {
            for (const element of identifiers) {
                if (insidePacket === true) { //check for paranths
                    //if line contains brackets, go through each and add/subtract from paranths count
                    if (line.indexOf("{") !== -1) {
                        for (const char of line) {
                            if (char === "{") {
                                paranths++;
                            }
                        }
                    }
                    if (line.indexOf("}") !== -1) {
                        for (const char of line) {
                            if (char === "}") {
                                paranths--;
                            }
                        }
                    }
                    //if paranths isn't 0 then inside identifier scope	UIS
                    if (paranths !== 0) {
                        //get first word of line regex (U|I|S####)
                        if (line.search(re) !== -1) {
                            var tokens = line.split(/\s/);
                            //get second word
                            var previousCharIsLetter = false;
                            var currentCharIsLetter = false;
                            var counter = 0;
                            for (const element of tokens) {
                                if (element === "") {
                                    currentCharIsLetter = false;
                                }
                                else {
                                    currentCharIsLetter = true;
                                }
                                if (currentCharIsLetter !== previousCharIsLetter) {
                                    counter++;
                                }
                                //found a token, add to array of 
                                if (counter === 3 && element !== '') {
                                    token += element;
                                    const item = new vscode.CompletionItem(token, vscode.CompletionItemKind.Variable);
                                    //console.log("Token: " + token);
                                    result.at(result.length - 1)?.[1].push(item); //get last element, add to second array element
                                    break;
                                }
                                previousCharIsLetter = currentCharIsLetter;
                            }
                            token = "";
                        }
                    }
                }
                if (line.indexOf(element) !== -1) { //start of declaration of a packet
                    insidePacket = true;
                    //get name of identifier by going to end of identifier length
                    name = line.substring(line.indexOf(element) + element.length, line.indexOf("{")).trim();
                    var spaceIndex = name.indexOf(" ");
                    if (spaceIndex !== -1) {
                        name = name.substring(spaceIndex).trim();
                        result.push([name, []]); //push name definition, add to array later
                    }
                    //console.log(name + " " + token + " " + file);
                }
            }
        });
    }
    return result;
}
function recurseThroughDirs(directory) {
    const files = FS.readdirSync(directory);
    for (const file of files) {
        const absoluteFilePath = PATH.join(directory, file);
        if (FS.statSync(absoluteFilePath).isDirectory()) {
            recurseThroughDirs(absoluteFilePath);
        }
        else {
            FILES.push(absoluteFilePath);
        }
    }
}
//# sourceMappingURL=extension.js.map