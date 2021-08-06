// full list of block ids
var blockIds = {};

var theme = Blockly.Theme.defineTheme('modern', {
    'base': Blockly.Themes.Classic,
    'blockStyles': {
      'colour_blocks': {
        'colourPrimary': '#a5745b',
        'colourSecondary': '#dbc7bd',
        'colourTertiary': '#845d49',
      },
      'list_blocks': {
        'colourPrimary': '#745ba5',
        'colourSecondary': '#c7bddb',
        'colourTertiary': '#5d4984',
      },
      'logic_blocks': {
        'colourPrimary': '#5b80a5',
        'colourSecondary': '#bdccdb',
        'colourTertiary': '#496684',
      },
      'loop_blocks': {
        'colourPrimary': '#5ba55b',
        'colourSecondary': '#bddbbd',
        'colourTertiary': '#498449',
      },
      'math_blocks': {
        'colourPrimary': '#5b67a5',
        'colourSecondary': '#bdc2db',
        'colourTertiary': '#495284',
      },
      'procedure_blocks': {
        'colourPrimary': '#995ba5',
        'colourSecondary': '#d6bddb',
        'colourTertiary': '#7a4984',
      },
      'text_blocks': {
        'colourPrimary': '#5ba58c',
        'colourSecondary': '#bddbd1',
        'colourTertiary': '#498470',
      },
      'variable_blocks': {
        'colourPrimary': '#a55b99',
        'colourSecondary': '#dbbdd6',
        'colourTertiary': '#84497a',
      },
      'variable_dynamic_blocks': {
        'colourPrimary': '#a55b99',
        'colourSecondary': '#dbbdd6',
        'colourTertiary': '#84497a',
      },
      'hat_blocks': {
        'colourPrimary': '#A6905B',
        'colourSecondary': '#d6dbbd',
        'colourTertiary': '#7a8449',
        'hat': 'cap',
      },
    },
    'categoryStyles': {
      'colour_category': {
        'colour': '#a5745b',
      },
      'list_category': {
        'colour': '#745ba5',
      },
      'logic_category': {
        'colour': '#5b80a5',
      },
      'loop_category': {
        'colour': '#5ba55b',
      },
      'math_category': {
        'colour': '#5b67a5',
      },
      'procedure_category': {
        'colour': '#995ba5',
      },
      'text_category': {
        'colour': '#5ba58c',
      },
      'variable_category': {
        'colour': '#a55b99',
      },
      'variable_dynamic_category': {
        'colour': '#a55b99',
      },
    },
    'componentStyles': {},
    'fontStyle': {},
    'startHats': null,
});

// MISC
Blockly.defineBlocksWithJsonArray([
    {
        "type": "task-start",
        "message0": "When LineList %1 called",
        "args0": [
            {
                "type": "field_number",
                "value": 255,
                "min": 0,
                "name": "taskno"
            }
        ],
        "nextStatement": null,
        "style": "hat_blocks"
    },
    {
        "type": "next-linelist",
        "message0": "Go to next LineList",
        "previousStatement": null,
        "style": "hat_blocks"
    },
    {
        "type": "unknown-if",
        "message0": "Unknown IF %1 %2 %3",
        "args0": [{"type": "field_number", "value": -1, "min": 0, "name": "typeIF"}, {"type": "input_dummy"}, {"type": "input_statement","name": "execarea","align": "CENTRE"}],
        "previousStatement": null,
        "nextStatement": null,
        "style": "logic_blocks"
    },
    {
        "type": "unknown-exec",
        "message0": "Unknown EXEC %1",
        "args0": [{"type": "field_number", "value": -1, "min": 0, "name": "typeEXEC"}],
        "previousStatement": null,
        "nextStatement": null,
        "style": "procedure_blocks"
    }
]);

function ifCommand(alt="IFCommand") {
    return {
        "type": "field_dropdown",
        "name": alt,
        "options": [
            ["==", "0"],
            ["!=", "1"],
            [">", "2"],
            ["<", "3"],
            [">=", "4"],
            ["<=", "5"]
        ]
    }
}
function trueFalse(name, statement1="true", statement2="false") {
    return {
        "type": "field_dropdown",
        "name": name,
        "options": [
            [statement1, "1"],
            [statement2, "0"]
        ]
    }
}
function execDefine(type, msg, args) {
    blockIds[type] = args.map(item => item['name']);
    return {
        "type": type,
        "message0": type.split("-")[1] + ") " + msg,
        "args0": args,
        "previousStatement": null,
        "nextStatement": null,
        "style": "procedure_blocks"
    }
}
function ifDefine(type, msg, args) {
    var argslist = [...args, {"type": "input_dummy"}, {"type": "input_statement","name": "execarea","align": "CENTRE"}];
    blockIds[type] = [args.map(item => item['name'])];
    return {
        "type": type,
        "message0": type.split("-")[1] + ") " + msg + ` %${argslist.length-1} %${argslist.length}`,
        "args0": argslist,
        "previousStatement": null,
        "nextStatement": null,
        "style": "logic_blocks"
    }
}
// IF
Blockly.defineBlocksWithJsonArray([
    ifDefine("if-1", "If Player in Area %1 of GroupNo %2 is %3 (Multiple: %4)", [
        {
            "type": "field_number",
            "name": "IFIndexNo",
            "value": 0,
            "min": 0,
        },
        {
            "type": "field_number",
            "name": "IFGroupNo",
            "value": 0,
            "min": 0
        },
        trueFalse("IFbCheck"),
        {
            "type": "field_dropdown",
            "name": "IFMultiple",
            "options": [
                ["true", "1"],
                ["false", "0"]
            ]
        }]
    ),
    ifDefine("if-38", "If GroupNo %1 is %2", [
        {
            "type": "field_input",
            "name": "IFGroupNo",
            "value": 0,
            "min": 0
        },
        trueFalse("IFbCheck", "alive", "dead")]
    ),
    ifDefine("if-2", "If # of Ems in GroupNo %1 %2 %3 (type %4)", [
        {
            "type": "field_number",
            "name": "IFGroupNo",
            "value": 0,
            "min": 0
        },
        ifCommand(),
        {
            "type": "field_number",
            "name": "IFValue",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "IfType",
            "value": 0,
            "min": 0
        }]
    ),
    ifDefine("if-3", "If Hash %1 is %2", [
        {
            "type": "field_input",
            "name": "IFHash",
            "text": "000000"
        },
        trueFalse("IFbCheck")]
    ),
    ifDefine("if-4", "If Flag %1 of quest %2 is %3", [
        {
            "type": "field_number",
            "name": "IFFlagNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_input",
            "name": "IFQuestId",
            "text": "0000"
        },
        trueFalse("IFbCheck")]
    ),
    ifDefine("if-5", "If Counter %1 %2 %3", [
        {
            "type": "field_number",
            "name": "IFCntNo",
            "value": 0,
            "min": 0
        },
        ifCommand(),
        {
            "type": "field_number",
            "name": "IFValue",
            "value": 0,
            "min": 0
        },
    ]),
    //ifDefine("if-6", "*** UNKNOWN ***", []),
    ifDefine("if-7", "If Flag %1 of quest %2 is %3", [
        {
            "type": "field_number",
            "name": "IFFlagNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "IFQuestId",
            "value": 0,
            "min": 0
        },
        trueFalse("IFbCheck")]
    ),
    ifDefine("if-8", "If Counter %1 %2 %3", [
        {
            "type": "field_number",
            "name": "IFCntNo",
            "value": 0,
            "min": 0
        },
        ifCommand(),
        {
            "type": "field_number",
            "name": "IFValue",
            "value": 0,
            "min": 0
        },
    ]),
    //ifDefine("if-9", "*** UNKNOWN ***", []),
    ifDefine("if-10", "If Event %1 %2 state %3 (type %4)", [
        {
            "type": "field_input",
            "name": "EventNo",
            "value": 0,
            "min": 0
        },
        ifCommand("Condition"),
        {
            "type": "field_number",
            "name": "EventState",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "EventType",
            "value": 0,
            "min": 0
        },
    ]),
    ifDefine("if-11", "If Hash %1 %2 %3 or %4", [
        {
            "type": "field_input",
            "name": "IFHash",
            "text": "000000"
        },
        ifCommand("IFCondition"),
        {
            "type": "field_input",
            "name": "IFValueHash",
            "text": "000000"
        },
        {
            "type": "field_input",
            "name": "IFValue2Hash",
            "text": "000000"
        },
        ]
    ),
    
    ifDefine("if-16", "If SetNo %1 of GroupNo %2 %3 %4 (isGroup %5)", [
        {
            "type": "field_number",
            "name": "IfEmSetNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "IfEmGroupNo",
            "value": 0,
            "min": 0
        },
        ifCommand("IfCondition"),
        {
            "type": "field_number",
            "name": "IfValue",
            "value": 0
        },
        trueFalse("IfIsGroup")]
    ),

    ifDefine("if-28", "If Flag %1 of quest %2 is %3", [
        {
            "type": "field_number",
            "name": "IFFlagNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "IFQuestId",
            "value": 0,
            "min": 0
        },
        trueFalse("IFbCheck")]
    ),

    ifDefine("if-33", "If %1", [
        trueFalse("IFbCheck")]
    ),
    ifDefine("if-36", "If %1", [
        trueFalse("IFbCheck")]
    ),
]);


// EXEC
Blockly.defineBlocksWithJsonArray([
    //execDefine("exec-1", "Execute next task fasfa", []),
    execDefine("exec-2", "Execute line %1 (%2)", [
        {
            "type": "field_number",
            "name": "EXECLine",
            "value": 0,
            "min": 0
        },
        trueFalse("EXECIsNextLine", "next LineList", "not next LineList")
    ]),
    execDefine("exec-3", "Execute line %1 (next line %2)", [
        {
            "type": "field_number",
            "name": "EXECLine",
            "value": 0,
            "min": 0
        },
        trueFalse("EXECIsNextLine")
    ]),
    execDefine("exec-4", "Wait %1 seconds", [{
        "type": "field_number",
        "name": "EXECTimer",
        "value": 0,
        "min": 0
    }]),
    execDefine("exec-5", "Load GroupNo %1 (setMax %2)", [
        {
            "type": "field_number",
            "name": "EXECGroupNo",
            "value": 0,
            "min": 0
        },
        trueFalse("EXECSetMax"),
    ]),
    execDefine("exec-6", "Unload GroupNo %1", [
        {
            "type": "field_number",
            "name": "EXECGroupNo",
            "value": 0,
            "min": 0
        }
    ]),
    execDefine("exec-7", "Load event %1 from PhaseNo %2 (event type %3) (todo: add other params)", [
        {
            "type": "field_input",
            "name": "EXECEventNo",
            "text": "0000"
        },
        {
            "type": "field_number",
            "name": "EXECEventPhaseNo",
            "text": "0000"
        },
        {
            "type": "field_number",
            "name": "EXECEventType",
            "value": 0,
            "min": 0
        }
    ]),
    execDefine("exec-8", "Set Hash %1 to %2", [
        {
            "type": "field_input",
            "name": "ExecHash",
            "text": "000000"
        },
        trueFalse("ExecbCheck")]
    ),
    execDefine("exec-9", "Set Flag %1 to %2", [
        {
            "type": "field_number",
            "name": "ExecFlagNo",
            "value": 0,
            "min": 0
        },
        trueFalse("ExecbCheck")
    ]),

    execDefine("exec-12", "Set Flag %1 to %2", [
        {
            "type": "field_number",
            "name": "ExecFlagNo",
            "value": 0,
            "min": 0
        },
        trueFalse("ExecbCheck")
    ]),

    execDefine("exec-15", "Teleport player to (%1, %2, %3), Rot %4deg (Use fade %5, fade color %6)", [
        {
            "type": "field_number",
            "name": "ExecPosX",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "ExecPosY",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "ExecPosZ",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "ExecRotY",
            "value": 0
        },
        trueFalse("ExecUseFade"),
        {
            "type": "field_number",
            "name": "ExecFadeColor",
            "value": 0
        },
    ]),

    execDefine("exec-18", "%1 Button Prompt Dialog Box (Tip %2)", [
        {
            "type": "field_dropdown",
            "name": "ExecDispTipsEnable",
            "options": [
                ["enable", "1"],
                ["disable", "0"]
            ]
        },
        {
            "type": "field_number",
            "name": "ExecDispTipsNo",
            "value": -1,
            "min": -1
        }
    ]),

    execDefine("exec-20", "Set counter at Hash %1 to %2 (counter type %3)", [
        {
            "type": "field_input",
            "name": "ExecCounterHash",
            "text": "000000"
        },
        {
            "type": "field_input",
            "name": "ExecCounterValueHash",
            "text": "000000"
        },
        {
            "type": "field_number",
            "name": "ExecCounterType",
            "value": 0,
            "min": 0
        }
    ]),
    execDefine("exec-21", "Load GroupNo %1", [
        {
            "type": "field_number",
            "name": "EXECGroupNo",
            "value": 0,
            "min": 0
        }
    ]),
    execDefine("exec-22", "Load GroupNo %1", [
        {
            "type": "field_number",
            "name": "EXECGroupNo",
            "value": 0,
            "min": 0
        }
    ]),
    execDefine("exec-30", "Call Task %1 (type %2)", [
        {
            "type": "field_number",
            "name": "ExecTaskNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecType",
            "value": 0,
            "min": 0
        }
    ]),
    execDefine("exec-31", "Have SetNo %1 of GroupNo %2 say TalkScript %3 of quest %4 (%5)", [
        {
            "type": "field_number",
            "name": "SetNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "GroupNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_input",
            "name": "TalkId",
            "text": "0000"
        },
        {
            "type": "field_input",
            "name": "QuestId",
            "text": "0000"
        },
        trueFalse("ExistSpeaker", "Speaker exists", "Speaker does not exist")
    ]),

    (() => {var def = execDefine("exec-37", "Return", []); def['nextStatement'] = undefined; return def })(),

    execDefine("exec-45", "Add Pin to Map", []),
    execDefine("exec-46", "Remove Pin from Map", []),
    execDefine("exec-49", "Set global Flag %1 to %2", [
        {
            "type": "field_number",
            "name": "ExecFlagNo",
            "value": 0,
            "min": 0
        },
        trueFalse("ExecbCheck")
    ]),
]);

// SCRIPTS

function renderTaskList(taskListNo, saveExisting=false) {
    if (saveExisting) {

    }
    // sorta inefficient and lazy method but its whatever
    const taskList = new questDataTaskList(loadedFile['files']['QuestData.bxm']['extracted']['children'][1]['children'][taskListNo])
    var xml = '<xml>'
    
    for (var x = 0; x < taskList.LineListTree.length; x++) {
        //taskListOutput += `<tr><th>${x}</th><th>-------------</th></tr>`
        xml += `<block type="task-start" inline="false" y="${x*200}"><field name="taskno">${x}</field>`
        var nested = []
        for (var y = 0; y < taskList.LineListTree[x].length; y++) {
            if (!xml.endsWith('<statement name="execarea">')) {
                xml += "<next>"
                nested.push('next')
            }
            //taskListOutput += "<tr><th>" + taskList.LineListTree[x][y].prettyPrint().join("</th><th>").trimRight("<th>") + "</tr>";
            /*
            A NON-ZERO IF MUST ALSO HAVE AN ACCOMPANYING EXEC 1.
            */
            if (Object.keys(blockIds).includes("if-" + taskList.LineListTree[x][y].typeIF)) {
                xml += `<block type="if-${taskList.LineListTree[x][y].typeIF}">`
                for (const [key, value] of Object.entries(taskList.LineListTree[x][y])) {
                    if (['typeIF', 'typeEXEC'].includes(key) || key.toLowerCase().startsWith('exec')) { continue };
                    xml += `<field name="${key}">${value}</field>`;
                }
                xml += '<statement name="execarea">'
                nested.push('block', 'statement')
            } else if (parseInt(taskList.LineListTree[x][y].typeIF)) {
                console.log(taskList.LineListTree[x][y])
                xml += `<block type="unknown-if"><field name="typeIF">${taskList.LineListTree[x][y].typeIF}</field><statement name="execarea">`
                nested.push('block', 'statement')
            }
            if (Object.keys(blockIds).includes("exec-" + taskList.LineListTree[x][y].typeEXEC)) {
                xml += `<block type="exec-${taskList.LineListTree[x][y].typeEXEC}">`
                for (const [key, value] of Object.entries(taskList.LineListTree[x][y])) {
                    if (['typeIF', 'typeEXEC'].includes(key) || key.toLowerCase().startsWith('if')) { continue };
                    xml += `<field name="${key}">${value}</field>`;
                }
                nested.push('block')
            } else if (parseInt(taskList.LineListTree[x][y].typeEXEC) > 1) {
                console.log(taskList.LineListTree[x][y])
                xml += `<block inline="false" type="unknown-exec"><field name="typeEXEC">${taskList.LineListTree[x][y].typeEXEC}</field>`
                nested.push('block')
            }
            if (parseInt(taskList.LineListTree[x][y].typeIF) && parseInt(taskList.LineListTree[x][y].typeEXEC) != 1) {
                nested.splice(nested.length-2, 2);
                xml += "</block></statement>";
            }
        }
        xml += nested.map(item => `</${item}>`).reverse().join("")
        xml += "</block>"
    }
    xml += "</xml>"
    let workspace = Blockly.getMainWorkspace()
    Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.Xml.textToDom(xml), workspace);
    workspace.cleanUp()
    workspace.trashcan.emptyContents()
    $('#taskList').find('.li-selected').attr('class', 'clickableLi');
    $('#taskList').find("li#tl-" + taskListNo).attr('class', 'li-selected');
}


var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');
var workspace = Blockly.inject('blocklyDiv',
    {toolbox: document.getElementById('toolbox'),
    sounds: false,
    theme: theme,
    scrollbars: true,
    zoom: {
        controls: true,
        wheel: true
    },
    move: {
        drag: true,
        wheel: true
    }
});
var onresize = function(e) {
    // Compute the absolute coordinates and dimensions of blocklyArea.
    var element = blocklyArea;
    var x = 0;
    var y = 0;
    do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    } while (element);
    // Position blocklyDiv over blocklyArea.
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
    blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    Blockly.svgResize(workspace);
};
window.addEventListener('resize', onresize, false);
onresize();
Blockly.svgResize(workspace);
// Blockly doesn't like it when display: none is set at page load, so i make it transparent until necessary
$('#taskeditor').css({'filter': 'inherit', 'display': 'none'})