// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ConsoleReporter } from '@vscode/test-electron';
import { Dir, PathOrFileDescriptor, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { CipherNameAndProtocol } from 'tls';
import { pathToFileURL } from 'url';
import { isNull } from 'util';
import * as vscode from 'vscode';

//holds all STOL keywords
const keywords: Array<string> = [".lt.", ".gt.", ".ne.", ".eq.", ".and.", ".or.", "if", "then", "while", "for", "return", "acquire", 
	"archive", "ask", "break", "breakpoint", "cfgmon", "close", "cmd", "continue", "date", "dir", "disable", "do", "dumpfile", 
	"else", "elseif", "enable", "enddo", "endif", "endproc", "eval", "event", "free", "get", "global", "go", "goto", "gpib", "graph", 
	"hotkey", "if", "killproc", "let", "limits", "local", "log", "mode verification", "namespace", "open", "page", "pktdump", 
	"playback", "plot", "preview", "proc", "quit", "raw", "read", "rem", "report", "return", "scevent", "seqprt", "set", 
	"setcoef", "shoval", "snap", "speed", "start", "stripchart", "system", "tfdump", "timeon", "validate", "verify", "wait", 
	"write", "zero", ".not.", "concat", "until", "=", "", "(", ")", "[", "]", "{", "}",

	"exists", "iscommand", "isdate", "isfloat", "isglobal", "isinlimits", "isint", "islocal", "ismnemonic",
	"isnull", "isnumber", "isquality", "isred", "isredhi", "isredlo", "isstatic", "isstring", "issymbol", "istime", "isunsigned",
	"isvariable", "isyellow", "isyellowhi", "isyellowlo", "mkdate", "mkepochdate", "mktime", "todate", "tofloat", "tohexstring",
	"toint", "tonull", "tostring", "tostringnotnull", "totime", "tounsigned", "bwand", "bwinvert", "bwlshift", "bwor", "bsrshift", 
	"bwreverse", "bwxor", "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "cosh", "floor", "ln", "log", "max", "min", "mod",
	"round", "roundeven", "sin", "sinh", "sqrt", "tan", "tanh", "trunc", "coalesce", "concat", "contains", "convertescape", "escapexmlchars",
	"format", "lowercase", "name", "replace", "split", "strcasestr", "strfdate", "strlen", "strpackhex", "strstr", "strtok", "strtol", "strtoul", 
	"substr", "unconvertescape", "uppercase", "iif", "getenv", "ternary"
];

const PATH = require("path");
const FS = require("fs");


//tuple will hold all the members for each of the packet definitions.  
type TUPLE = [string, vscode.CompletionItem[]];
type ERRORTUPLE = [string, number];

//output channel to display stuff to
let channel = vscode.window.createOutputChannel("outChannel");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	//put initialization here if 
	//gets all proc file names
	const procnames = makeCompletionItems(getFileNames("procs"), vscode.CompletionItemKind.File);

	//gets all page file names
	const pageNames = makeCompletionItems(getFileNames("pages").filter(name => name.endsWith(".page")), vscode.CompletionItemKind.File);

	//get all plot file names
	const plotNames = makeCompletionItems(getFileNames("pages").filter(name => name.endsWith(".plot")), vscode.CompletionItemKind.File);
	
	//get all mneumonics, commands/tlm
	var mneumonicList = populateMneumonicsList();
	
	vscode.window.showInformationMessage('STOL helper loaded successfully');

	//This command goes through the file and checks for redeclared and undeccasdfsa
	let checkVars = vscode.commands.registerCommand('stol-ts.checkVars', function () {
		// Display a message box to the user
		vscode.window.showInformationMessage('Checking Variables');
		tokenizeCurrentFile();
	});

	//This command goes through and indents logic blocks properly 
	let indentBlocks = vscode.commands.registerCommand('stol-ts.indent', function () {
		// Display a message box to the user
		vscode.window.showInformationMessage('Indenting');
		indent();
	});

	//This command loads all the rec file definitions and members
	/*let loadRec = vscode.commands.registerCommand('stol-ts.loadRec', function () {
		// Display a message box to the user
		vscode.window.showInformationMessage('Loading rec database');

		databaseFields = populateDatabaseMembers();
		console.log(populateDatabaseMembers());

		vscode.window.showInformationMessage('Finished loading rec database');
	});*/

	// provides list of mneumonics on "ccr." trigger
	vscode.languages.registerCompletionItemProvider(
		'stol',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `ccr.`
				// and if so then return all mneumonics in xtce_tlm and xtce_cmd
				const linePrefix = document.lineAt(position).text.substring(0, position.character);
				if (!linePrefix.endsWith('ccr.')) {
					return undefined;
				}

				//have to create an entirely new list with current position information so 'ccr.' will be deleleted
				mneumonicList.forEach( item => {
					const rangeToRemove = new vscode.Range(position.line, position.character-'ccr.'.length, position.line, position.character);
    				item.additionalTextEdits = [vscode.TextEdit.delete(rangeToRemove)];
				});

				return mneumonicList;
			}
		},
		'.' // triggered whenever a '_' is being typed
	);
	
	//displays all proc file names after "start " trigger
	vscode.languages.registerCompletionItemProvider(
		'stol',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `ccr.`
				// and if so then return all mneumonics in xtce_tlm and xtce_cmd
				const linePrefix = document.lineAt(position).text.substring(0, position.character);
				if (!linePrefix.endsWith('start ') && !linePrefix.endsWith('START ')) {
					return undefined;
				}

				return procnames;
			}
		},
		' ' // triggered whenever a ' ' is being typed
	);

	//displays all page file names after "page " trigger
	vscode.languages.registerCompletionItemProvider(
		'stol',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `ccr.`
				// and if so then return all mneumonics in xtce_tlm and xtce_cmd
				const linePrefix = document.lineAt(position).text.substring(0, position.character);
				if (!linePrefix.endsWith('page ') && !linePrefix.endsWith('PAGE ')) {
					return undefined;
				}

				return pageNames;
			}
		},
		' ' // triggered whenever a ' ' is being typed
	);

	// displays all plot file names after "plot " trigger
	vscode.languages.registerCompletionItemProvider(
		'stol',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `ccr.`
				// and if so then return all mneumonics in xtce_tlm and xtce_cmd
				const linePrefix = document.lineAt(position).text.substring(0, position.character);
				if (!linePrefix.endsWith('plot ') && !linePrefix.endsWith('PLOT ')) {
					return undefined;
				}

				return plotNames;
			}
		},
		' ' // triggered whenever a ' ' is being typed
	);

	context.subscriptions.push(checkVars, indentBlocks);
}

// this method is called when your extension is deactivated
export function deactivate() {}


/** 
 * Purpose: Indents all block statements (IF, WHILE, etc)
*/

function indent(){

	let message;
	let filepath: PathOrFileDescriptor | string[] | undefined;

	if(vscode.workspace.workspaceFolders !== undefined) {
		filepath = vscode.window.activeTextEditor?.document.fileName;

		if(filepath === undefined){
			message = "File in focus is weird.  Can't read the file";

			vscode.window.showInformationMessage(message);
			return;
		}

		let loopElements: string[] = ["if", "else", "elseif", "do"];
		let endLoop : string[] = ["endif", "enddo"];
		let indentCounter: number = 0;

		const editor = vscode.window.activeTextEditor;
		if(editor){
			const document = editor.document;
			const text = document.getText();
			let indentedText = "";
			const ifRegex = /^\s*if.*then$/i;
			const beginRegex = /^do|else|elseif$/i;
			const endRegex = /^\s*enddo|\s*endif|\s*else|\s*elseif$/i;


			const result = readFileSync(filepath , 'utf-8');
			result.split(/\r?\n/).forEach(line => {

				let newline = line.trim();
				let debug = "";

				//end of loop so go back an indentation level
				if(endRegex.test(newline)){
					indentCounter--;
				}

				for(let i = 0; i < indentCounter; i++){
					newline = "\t" + newline;
				}

				//look to see if line is a loop statement
				if(ifRegex.test(newline) || beginRegex.test(newline)){
					indentCounter++;
				}

				indentedText += newline+"\n";
			});

			console.log(indentedText);
			channel.append(indentedText);
			channel.show();
		}
	}
}

/**
 * 	Purpose: goes through current file and looks for undeclared/redeclared variables
 * 	Inputs:
 * 	Outputs: returns list of tuple of words and row,col format
 * 	Details: Only works with local and LOCAL, can't do mixed case (Local, etc)
 * DEPRACATED
 */
function findBadVariables(){

	let message;
	let filepath: PathOrFileDescriptor | string[] | undefined;
	console.log("findBadVariables");
	console.log(vscode.workspace.workspaceFolders );

	if(vscode.workspace.workspaceFolders !== undefined) {
		// keywords that have to be first in a line
		// get global definitions and add them to declaredArray
		let wf = vscode.workspace.workspaceFolders[0].uri.path ;
		let f = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
		let f2 = vscode.workspace.workspaceFile?.path;
		let declaredArray: Array<string> = [];
		let errorsArray: Array<ERRORTUPLE> = [];
		let varString: string = "";
		let foundLocal = false;
		let lineCount: number = 1;
		let isQuote: Boolean = false;		//tracks quotes across multiple lines
		let isCommand :Boolean = false;
		let isProcDef : Boolean = false;
		const localRegex = /^\s*local$\i/;
	
		//message = `YOUR-EXTENSION: folder: ${wf} - ${f2}` ;
		filepath = vscode.window.activeTextEditor?.document.fileName;

		if(filepath === undefined){
			message = "File in focus is weird.  Can't read the file";

			vscode.window.showInformationMessage(message);
			return;
		}
		console.log(filepath);

		//open file for reading and tokenizing
		const result = readFileSync(filepath , 'utf-8');
		result.split(/\r?\n/).forEach(line => {

			//console.log(line);
			isProcDef = false;
			isCommand = false;

			//find all declared variables denoted by line starting with 'local'.  case insensitive
			//TODO get first word and toUpper
			var indexlowerL = line.indexOf("local ");
			var indexUpperL = line.indexOf("LOCAL ");

			//init varString to line
			varString = line.trim();

			console.log(varString);

			var commentPos = varString.indexOf(';');
			//get only non-commented part
			if(commentPos !== -1){
				varString = varString.substring(0, commentPos);
			}		
			//Check for quotations, delete text within
			var quotePos = varString.indexOf('"');
			var nextQuotePos = varString.indexOf('"', quotePos+1);
			if( quotePos!== -1){
				//while there are more quotes in the string
				while(quotePos !== -1){
					//see if quote spans lines
					if(nextQuotePos === -1){
						isQuote = true;
					}
					else{
						varString = varString.slice(0, quotePos+1) + varString.slice(nextQuotePos, varString.length);	//keep quotes in string to see assign
						quotePos = varString.indexOf('"', quotePos +2);
						nextQuotePos = varString.indexOf('"', quotePos+1);
					}
				}
			}
			if(indexlowerL !== -1){
				varString = line.substring(indexlowerL+5, varString.length).trim();
				foundLocal = true;
			}
			else if(indexUpperL !== -1){
				varString = line.substring(indexUpperL+5, varString.length).trim();
				foundLocal = true;
			}

			//Checking if it's a command. Assume params are correct.
			var cmdSub = varString.toLowerCase().substring(0,2);
			if(varString.toLowerCase().substring(0,3) === "cmd" || varString.indexOf("/") === 0){
				isCommand = true;
				varString="";		//gross workaround to get declaredArray to not take them
			}

			/*Not local defintion. Check for excusable cases that ARE NOT errors:
				- mneumonic starting with ccr_
				- keyword or '='
				- number
				- inside a comment
			Skip if comment char is first in the line
			Skip if multiline quote
			*/
			if(foundLocal === false && commentPos !== 0 && isQuote===false && isCommand === false){
				var previousVar = "";
				//split line with special chars
				varString.split(/[ (),\t=]/).forEach(variable => {
					variable=variable.trim().toLowerCase();
					var isError = true;

					//Checking if proc keyword, check filename and match to procname
					if(previousVar.toLowerCase() === "proc"){
						var filename = filepath?.toString();
						var filename = filename?.substring(filename.lastIndexOf("/")+1,filename.lastIndexOf("."));
						if(filename === variable){
							isProcDef = true;
						}
					}

					//Checking if it's a mneumonic
					if(variable.indexOf("CCR_") === 0 || variable.indexOf('ccr_') === 0 ||variable.indexOf("Ccr_") === 0){
						isError = false;
					}
					//Checking keywords
					if(isError === true){
						//TODO optimize this to break out when keyword matches
						keywords.forEach(keyword => {
							if(keyword === variable){
								isError = false;
							}
						});
					}
					//Checking declared var list
					if(isError === true){
						declaredArray.forEach(declaredVar => {
							if(declaredVar === variable){
								isError = false;
							}
						});
					}
					//Checking if it's a number
					if(isError === true){
						var numRegex = /([0-9])\w+/;
						if(numRegex.test(variable)){isError=false;}	
					}
					//Checking if it's a comment
					if(isError === true){
						if(varString.indexOf(variable) > commentPos && commentPos > 0){isError=false;}
					}
					//check variable before quotes
					if(isError === true && variable === '""'){
						if(previousVar === "ask" || previousVar === "="){
							isError=false;
						}
					}
					//It's an error, populate error array
					if(isError === true && isProcDef === false){
						errorsArray.push([variable.trim().toLowerCase(), lineCount]);
					}

					//It's proc parameters
					if(isProcDef === true){
						declaredArray.push(variable.toLowerCase());
					}

					previousVar = variable;
				});
			}
			//get comma separated variables afterwards
			else{
				varString.split(/,/).forEach(variable => {
					//Take tokens left of comment, or all of them if there is no comment
					if(variable !== ""){
						declaredArray.push(variable.trim());
					}
				});
			}

			//update flags for next pass
			varString = "";
			foundLocal = false;
			lineCount++;
		});
		if(isQuote === true){
			errorsArray.push(["QUOTE NEVER ENDED!", lineCount]);
		}

		console.log("Declared Array: " + declaredArray);
		console.log("Errors Array: " + errorsArray);

	} 
	else {
		message = "YOUR-EXTENSION: Working folder not found, open a folder an try again" ;
	
		vscode.window.showErrorMessage(message);
	}
	console.log("end of findbadvariables");

}
/**
 * Purpose: tokenizes and throws errors when undeclared var is used
 * Input:
 * Output: prints list of bad variables to console
 */
function tokenizeCurrentFile(){

	let message;
	if(vscode.workspace.workspaceFolders !== undefined) {

		let filepath = vscode.window.activeTextEditor?.document.fileName;

		if(filepath === undefined){
			message = "File in focus is weird.  Can't read the file";

			vscode.window.showInformationMessage(message);
			return;
		}

		const token_patterns:[RegExp, string][] = [
			[/.lt.|.gt.|.ne.|.eq.|.and.|.or.|if|then|while|for|return|acquire|archive|ask|break|breakpoint|cfgmon|close|cmd|continue|date|dir|disable|do|dumpfile|else|elseif|enable|enddo|endif|endproc|eval|event|free|get|global|go|goto|gpib|graph|hotkey|if|killproc|let|limits|local|log|mode verification|namespace|open|page|pktdump|playback|plot|preview|proc|quit|raw|read|rem|report|return|scevent|seqprt|set|setcoef|shoval|snap|speed|start|stripchart|system|tfdump|timeon|validate|verify|wait|write|zero|.not.|concat|until|=||(|)|[|]|{|}|exists|iscommand|isdate|isfloat|isglobal|isinlimits|isint|islocal|ismnemonic|isnull|isnumber|isquality|isred|isredhi|isredlo|isstatic|isstring|issymbol|istime|isunsigned|isvariable|isyellow|isyellowhi|isyellowlo|mkdate|mkepochdate|mktime|todate|tofloat|tohexstring|toint|tonull|tostring|tostringnotnull|totime|tounsigned|bwand|bwinvert|bwlshift|bwor|bsrshift|bwreverse|bwxor|abs|acos|asin|atan|atan2|ceil|cos|cosh|floor|ln|log|max|min|mod|round|roundeven|sin|sinh|sqrt|tan|tanh|trunc|coalesce|concat|contains|convertescape|escapexmlchars|format|lowercase|name|replace|split|strcasestr|strfdate|strlen|strpackhex|strstr|strtok|strtol|strtoul|substr|unconvertescape|uppercase|iif|getenv|ternary\i/, 'KEYWORD'],// Keywords
			[/\d+\.\d+|\d+/, 'NUMBER'],	//Numbers (floats and integers)
			[/'[^']*'|"[^"]*"/, 'STRING'],      // Strings
			[/\w+/, 'IDENTIFIER'],              // Identifiers
			[/\=/, 'ASSIGNMENT'],               // Assignment operator
			[/\;/, 'SEMICOLON'],                // Semicolon
		];
		const result = readFileSync(filepath , 'utf-8');
		result.split(/\r?\n/).forEach(line => {


		});
	}
}
/*
	Purpose: Go through all rec files and get packet structure names
	Details: reads until PROTOCOL.CCSDSCCORTelemetryPacket is in the line
	Outputs: list of packet names
*/
function getPacketNames(){
		
	var result = new Array<string>();
	var lines;
	let files : string [];

	//get all the rec files
	var path = "";
	if(vscode.workspace.workspaceFolders !== undefined) {
		var path = vscode.workspace.workspaceFolders[0].uri.fsPath + "/rec";
		files = recurseThroughDirs(path, false);
	}
	else{
		vscode.window.showInformationMessage('Unable to find rec files.');
		return result;
	}
	for(const file of files){
		
		//if line contains CCSDSCCTelemtryPacket
		lines = readFileSync(file, 'utf-8');
		lines.split(/\r?\n/).forEach(line => {
			if(line.indexOf("CCSDSCCORTelemetryPacket") !== -1){
				var previousToken = "";
				//get word right after tlmpacket.  Can optimze this way better, by getting next group of letters instead of splitting.
				line.split(/\s/).forEach( token => {
					if(previousToken.indexOf("CCSDSCCORTelemetryPacket")!== -1){
						if(token.indexOf("{") === -1 && token.indexOf("}") === -1){
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
/*
	Purpose: Gets all the procnames in ground repo
*/
function getProcNames(){
	var result = new Array<string>();

	//get all the proc file names
	var path = "";
	if(vscode.workspace.workspaceFolders !== undefined) {
		var path = vscode.workspace.workspaceFolders[0].uri.fsPath + "/procs";
		result = recurseThroughDirs(path);	//populates FILES global
	}
	else{
		vscode.window.showInformationMessage('Unable to find rec files.');
		return result;
	}
	return result;
}

/*
	Purpose: Gets all the pages/plot file names in ground repo
*/
function getFileNames(dirName : string){
	
	var result = new Array<string>();
	var name = "/"+dirName;

	//get all the proc file names
	var path = "";
	if(vscode.workspace.workspaceFolders !== undefined) {
		var path = vscode.workspace.workspaceFolders[0].uri.fsPath + name;
		result = recurseThroughDirs(path);	//populates FILES global
	}
	else{
		vscode.window.showInformationMessage('Unable to find rec files.');
		return result;
	}
	return result;
}


/**
 * Converts an array of strings into completion items.  Assumes the string elemet
 * @returns list of completion items
 */
function makeCompletionItems(list : string[], kind : vscode.CompletionItemKind){
	const result = list.map(name => {
		name = name.substring(0, name.lastIndexOf("."));
		const item = new vscode.CompletionItem(name);
		item.kind = kind;
		return item;
	});
	return result;
}

/*	Purpose: Goes through xtce_tlm and xtce_cmd.rec files to grab all the CCR_* mneumonics
	Inputs:
	Outputs: returns list of vscode.CompletionItem
	Details: Chops off "CCR_" from the string to auto complete when user types "ccr_"

*/
function populateMneumonicsList() {
	var path = "";
	if(vscode.workspace.workspaceFolders !== undefined) {
		var path = vscode.workspace.workspaceFolders[0].uri.fsPath;
	}
	var tempA: vscode.CompletionItem[] = [];
	const result = readFileSync(path + "/rec/xtce_tlm.rec", 'utf-8');
	result.split(/\r?\n/).forEach(line => {
		var index = line.indexOf("CCR_");
		var end = line.indexOf("{", index+1);
		var ccrString = line.substring(index, end-1).trim();
		if(ccrString.length > 3){
			//var item = new vscode.CompletionItem(ccrString, vscode.CompletionItemKind.Variable);
			var item = new vscode.CompletionItem(ccrString);
			item.detail = "Detail";
			item.documentation = "documentation";
			item.insertText = ccrString;
			tempA.push(item);
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
function populateDatabaseMembers(){
	
	var result = new Array<TUPLE>();
	var files : string[];
	var line;
	var name:string = "";
	var paranths = 1;		//used to keep track of paranths
	var insideParanths : boolean = false;
	var  re : RegExp = /^\s*(U|I|S)+\d/;
	var insidePacket : boolean = false;
	var token = "";
	var previousName = "";

	//get all the rec files
	var path = "";
	if(vscode.workspace.workspaceFolders !== undefined) {
		var path = vscode.workspace.workspaceFolders[0].uri.fsPath + "/rec";
		files = recurseThroughDirs(path);	//populates FILES global
	}
	else{
		vscode.window.showInformationMessage('Unable to find rec files.');
		return result;
	}
	var identifiers : string[] = ["CCSDSCCORTelemetryPacket"];
	//go through each of the rec files and add to tuple
	for(const file of files){
		
		//if line contains CCSDSCCTelemtryPacket
		line = readFileSync(file, 'utf-8');
		line.split(/\r?\n/).forEach(line => {
		for(const element of identifiers){
			if(insidePacket === true){			//check for paranths

				//if line contains brackets, go through each and add/subtract from paranths count
				if(line.indexOf("{") !== -1){				
					for(const char of line){
						if(char === "{")	{paranths++;}
					}
				}
				if(line.indexOf("}") !== -1){
					for(const char of line){
						if(char === "}")	{paranths--;}
					}
				}
				//if paranths isn't 0 then inside identifier scope	UIS
				if(paranths !== 0){
					
					//get first word of line regex (U|I|S####)
					if(line.search(re) !== -1){
						var tokens = line.split(/\s/);
						//get second word
						var previousCharIsLetter = false;
						var currentCharIsLetter = false;
						var counter = 0;
						
						for(const element of tokens){
							if(element === ""){
								currentCharIsLetter = false;
							}
							else{
								currentCharIsLetter = true;
							}

							if(currentCharIsLetter !== previousCharIsLetter){
								counter++;
							}

							//found a token, add to array of 
							if(counter === 3 && element !== ''){
								token += element;
								const item = new vscode.CompletionItem(token, vscode.CompletionItemKind.Variable);
								//console.log("Token: " + token);
								result.at(result.length-1)?.[1].push(item);		//get last element, add to second array element
								break;
							}

							previousCharIsLetter = currentCharIsLetter;
						}
						token = "";
					}
				}
			}
			if(line.indexOf(element) !== -1){			//start of declaration of a packet

				insidePacket = true;

				//get name of identifier by going to end of identifier length
				name = line.substring(line.indexOf(element) + element.length, line.indexOf("{")).trim();
				var spaceIndex = name.indexOf(" ");
				if(spaceIndex !== -1){
					name = name.substring(spaceIndex).trim();
					result.push([name, []]);		//push name definition, add to array later

				}
				//console.log(name + " " + token + " " + file);
			}

		}
		
	});
	}
	return result;
}

function recurseThroughDirs(directory: string, trimFileNames:Boolean = true, result: string[] = []) {
	const files = FS.readdirSync(directory);
	//var result : string [] = [];
	for(const file of files){
		const absoluteFilePath:string = PATH.join(directory, file);
		if(FS.statSync(absoluteFilePath).isDirectory()) {recurseThroughDirs(absoluteFilePath);}
		else {
			var nameOnly = absoluteFilePath.substring(absoluteFilePath.lastIndexOf("/")+1);
			if(trimFileNames === false){nameOnly = absoluteFilePath;}
			result.push(nameOnly);
		}
	}
	return result;
}