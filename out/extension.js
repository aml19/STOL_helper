"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const fs_1 = require("fs");
const vscode = require("vscode");
var mneumonicList = [];
const PATH = require("path");
const FS = require("fs");
let FILES = [];
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    //put initialization here
    var databaseFields = new Array();
    mneumonicList = populateMneumonicsList();
    console.log('STOL helper loaded successfully');
    //This command loads all the rec file definitions and members
    let loadRec = vscode.commands.registerCommand('stol-ts.loadRec', function () {
        // Display a message box to the user
        vscode.window.showInformationMessage('Loading rec database');
        databaseFields = populateDatabaseMembers();
        console.log(populateDatabaseMembers());
        vscode.window.showInformationMessage('Finished loading rec database');
    });
    // provides list of mneumonics on "CCR_" trigger
    const mneumonicProvider = vscode.languages.registerCompletionItemProvider('stol', {
        provideCompletionItems(document, position) {
            // get all text until the `position` and check if it reads `ccr.`
            // and if so then return all mneumonics in xtce_tlm and xtce_cmd
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            if (!linePrefix.endsWith('ccr.')) {
                return undefined;
            }
            return mneumonicList;
        }
    }, '.' // triggered whenever a '.' is being typed
    );
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
    context.subscriptions.push(mneumonicProvider, loadRec);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
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