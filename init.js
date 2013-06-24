/*
 * Copyright (c) Codiad & Andr3as, distributed
 * as-is and without warranty under the MIT License. 
 * See [root]/license.md for more information. This information must remain intact.
 */

(function(global, $){
    
    var codiad  = global.codiad,
        scripts = document.getElementsByTagName('script'),
        path    = scripts[scripts.length-1].src.split('?')[0],
        curpath = path.split('/').slice(0, -1).join('/')+'/';

    $(function() {    
        codiad.AutoAlignment.init();
    });

    codiad.AutoAlignment = {
        
        path    : curpath,
        bindKeys: null,
        tabWidth: 4,
        
        wordPre : ["+","-","*","/","%",":","!"],
        
        init: function() {
            var _this       = this;
            this.bindKeys   = window.setInterval(function(){_this.addKeyBindings()},1000);
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Add key bindings
        //
        //////////////////////////////////////////////////////////
        addKeyBindings: function() {
            if (codiad.editor.getActive() !== null) {
                var _this           = this;
                var _commandManager = codiad.editor.getActive().commands;
                _commandManager.addCommand({
                    name: 'autoAlignment',
                    bindKey: {
                        "win": "Ctrl-Alt-A",
                        "mac": "Command-Alt-A"
                    },
                    exec: function() {
                        _this.runAlignment();
                    }
                });
            }
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Get settings from Codiad
        //
        //////////////////////////////////////////////////////////
        getSettings: function() {
			this.tabWidth	= codiad.editor.getActive().getSession().getTabSize();
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Run alignment to correct the style
        //
        //////////////////////////////////////////////////////////
        runAlignment: function() {
            this.getSettings();
            var trimedArray = [];
            var _editor     = codiad.editor.getActive();
            var selText     = codiad.editor.getSelectedText();
            if (selText === "") {
                codiad.message.error("Nothing selected!");
                return false;
            }
            // multi selection
            // ?Todo - rewrite - allow multiselection
            if (codiad.editor.getActive().inMultiSelectMode) {
                codiad.message.error("Multiselection is not supported!");
                return false;
            }
            //Get line ending
            var type = this.getLineEnding(selText);
            //Split selected text
            var selArray= selText.split(type);
            //Generate space
            var space	= "";
            for (var i = 0; i < this.tabWidth; i++) {
				space	+= " ";
			}
            //Trim whitespace at the start of each line
            for (var j = 0; j < selArray.length; j++) {
                var obj = this.trimStartSpace(selArray[j]);
                obj.string	= obj.string.replace(new RegExp("\t", "g"), space);
                selArray[j] = obj.string;
                if (trimedArray == []) {
                    trimedArray[0] = obj.trimed;
                } else {
                    trimedArray.push(obj.trimed);
                }
            }
            
            //Check whether to handle an equal sign or a colon
            var sign    = "";
            var lastPos = this.findLastPos(selArray, "=");
            if (lastPos == -1) {
                lastPos = this.findLastPos(selArray, ":");
                if (lastPos == -1) {
                    //neither an equal sing nor a colon
                    return false;
                }
                sign    = ":";
            } else {
                sign    = "=";
            }
            //Check if sign is on a "tab position"
            var rest    = lastPos % this.tabWidth;
            
            //Insert space until sign is on a "tab position"
            while ( (lastPos % this.tabWidth) !== 0) {
                lastPos++;
            }
            //Edit each line and insert space until the sign of this line 
            //  is on the "lastposition"
            for (var n = 0; n < selArray.length; n++) {
                selArray[n] = this.moveSign(selArray[n], lastPos, sign);
            }
            //Insert Text
            insText = "";
            for (var t = 0; t < (selArray.length-1);t++) {
                insText += trimedArray[t] + selArray[t] + "\n";
            }
            insText += trimedArray[selArray.length-1] + selArray[selArray.length-1];
            //Normalize line endings
            insText = this.normalizeLineEnding(insText, type);
            codiad.editor.insertText(insText);
            return true;
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Trim all space at the beginning of the string
        //
        //  Parameter
        //
        //  str - {String} - Untrimmed string
        //
        //////////////////////////////////////////////////////////
        trimStartSpace: function(str) {
            trimedSpace = "";
            while ((str[0] == " ") || (str[0] == "\t")) {
                if (str[0] == " ") {
                    trimedSpace += " ";
                    str = this.minusFirstChar(str);
                } else if (str[0] == "\t") {
                    trimedSpace += "\t";
                    str = this.minusFirstChar(str);
                }
            }
            var obj = {string : str, trimed : trimedSpace};
            return obj;
        },
        //////////////////////////////////////////////////////////
        //
        //  Delete the first char of the string
        //
        //  Parameter
        //
        //  str - {String} - String to edit
        //
        //////////////////////////////////////////////////////////
        minusFirstChar: function(str) {
            backStr = "";
            for (var j = 1; j < str.length; j++) {
                backStr += str[j];
            }
            return backStr;
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Find the highest position of the first occurance of the char
        //
        //  Parameters
        //
        //  strArray - {Array} - Array to search in
        //  char - {String} - Character to search for
        //
        //////////////////////////////////////////////////////////
        findLastPos: function(strArray, char) {
            var lastPos = -2;
            var findPos = 0;
            for (var m = 0; m < strArray.length; m++) {
                findPos = strArray[m].indexOf(char);
                if (findPos > lastPos) {
                    lastPos = findPos;
                }
            }
            return lastPos;
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Insert space before the first occurance of sign until
        //      the position of the first occurance of sign 
        //      is equal to lastPos
        //
        //  Parameters
        //
        //  bufferStr - {String} - String to edit
        //  lastPos - {Integer} - Position
        //  sign - {String} - Sign to move
        //
        //////////////////////////////////////////////////////////
        moveSign: function(bufferStr, lastPos, sign) {
            var bufferPos;
            var preSign = "";
            //Line contains no sign
            if (bufferStr.indexOf(sign) != -1) {
                while (bufferStr.indexOf(sign) != lastPos) {
                    bufferPos   = bufferStr.indexOf(sign);
                    preSign     = bufferStr.charAt(bufferPos-1);
                    if (this.wordPre.indexOf(preSign) != -1) {
                        //Special char before sign, insert space before special char
                        bufferStr   = this.insertSign(bufferStr, bufferPos-1, " ");
                    } else {
                        //No special char before sign, insert space before sign
                        bufferStr   = this.insertSign(bufferStr, bufferPos, " ");
                    }
                }
            }
            return bufferStr;
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Instert String at position
        //
        //  Parameters
        //
        //  str - {String} - String to edit
        //  pos - {Integer} - Position to insert string
        //  value - {String} - String to insert
        //
        //////////////////////////////////////////////////////////
        insertSign: function(str, pos, value) {
            var firstStr    = str.substring(0,pos);
            var secondStr   = str.substring(pos, str.length);
            return (firstStr + value + secondStr);
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Normalize line ending
        //
        //  Parameters
        //
        //  str - {String} - String to edit
        //  ending - {String} - Ending to replace with
        //
        //////////////////////////////////////////////////////////
        normalizeLineEnding: function(str, ending) {
            return str.replace(new RegExp("\n", "g"), ending);
        },
        
        //////////////////////////////////////////////////////////
        //
        //  Get line ending
        //
        //  Parameters
        //
        //  str - {String} - String to search in
        //
        //////////////////////////////////////////////////////////
        getLineEnding: function(str) {
            //Insert tabs
            if (str.search("\r\n") != -1) {
                //Windows
                return "\r\n";
            } else if (str.search("\r") != -1) {
                //Mac
                return "\r";
            } else {
                //Unix
                return "\n";
            }
        }
    };
})(this, jQuery);