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
      'logic_blocks': { // IF
        'colourPrimary': '#FFAB19',
        'colourSecondary': '#CF8B17',
        'colourTertiary': '#CF8B17',
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
      'procedure_blocks': { // EXEC
        'colourPrimary': '#4C97FF',
        'colourSecondary': '#4C97FF',
        'colourTertiary': '#3373CC',
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
      'hat_blocks': { // top
        'colourPrimary': '#FF6680',
        'colourSecondary': '#FF6680',
        'colourTertiary': '#FF3355',
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
        'colour': '#5b80a5', // IF
      },
      'loop_category': {
        'colour': '#5ba55b',
      },
      'math_category': {
        'colour': '#5b67a5',
      },
      'procedure_category': {
        'colour': '#995ba5', // EXEC
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

// IDK WHY THEY CHANGE CAPITALIZATION, DID THEY GET LAZY OR SOMETHING ???
/*const capitalizeTypes = {
    "if-1": "IF",
    "if-2": "IF",
    "if-3": "IF",
    "if-4": "IF",
    "if-5": "IF",
    "if-6": "IF",
    "if-7": "IF",
    "if-8": "IF",
    "if-9": "IF",
    "if-10": "IF",
    "if-11": "IF",
    "if-12": "IF",
    "if-13": "IF",
    "if-14": "IF",
    "if-15": "IF",
    "if-16": "If",
    "if-17"
    "if-38": "IF",
}*/
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
            ["=>", "3"],
            ["<", "4"],
            ["<=", "5"]
        ]
    }
}
function trueFalse(name, statement1="true", statement2="false", def=true) {
    if (def) {
        return {
            "type": "field_dropdown",
            "name": name,
            "options": [
                [statement1, "1"],
                [statement2, "0"]
            ]
        }
    }
    return {
        "type": "field_dropdown",
        "name": name,
        "options": [
            [statement2, "0"],
            [statement1, "1"]
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
    ifDefine("if-3", "If Hash %1 is not %2", [
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
            "name": "IFEventNo",
            "value": 0,
            "min": 0
        },
        ifCommand("IFCondition"),
        {
            "type": "field_number",
            "name": "IFEventState",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "IFEventType",
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
            "text": "7B7AD42F"
        },
        {
            "type": "field_input",
            "name": "IFValue2Hash",
            "text": "7B7AD42F"
        },
        ]
    ),

    ifDefine("if-14", "If Player has %1 %2x of item %3", [
        ifCommand("IFHasItemCondition"),
        {
            "type": "field_number",
            "name": "IFHasItemValue",
            "text": "000000",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_input",
            "name": "IFHasItemId",
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
    ifDefine("if-17", "If state of Quest %1 %2 %3", [
        {
            "type": "field_input",
            "name": "IfQuestId",
            "text": "0000"
        },
        ifCommand("IfCondition"),
        trueFalse("IfbCheck", "done", "not done")]
    ),

    ifDefine("if-22", "If dialogue box %1", [
        trueFalse("IFbCheck", "closed", "open")]
    ),
    
    ifDefine("if-27", "If fade transition is %1 (type %2)", [
        trueFalse("IFbCheck", "finished", "unfinished"),
        {
            "type": "field_number",
            "name": "IFType",
            "value": 0,
            "min": 0
        }]
    ),
    ifDefine("if-28", "If SaveFlag %1 of quest %2 is %3", [
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
    
    ifDefine("if-30", "If %1", [
        trueFalse("IFbCheck")]
    ),

    ifDefine("if-33", "If %1", [
        trueFalse("IFbCheck")]
    ),
    ifDefine("if-36", "If %1", [
        trueFalse("IFbCheck")]
    ),
    ifDefine("if-37", "If SetNo %1 of GroupNo %2 %3 %4 (isGroup %5)", [
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
]);


// EXEC
Blockly.defineBlocksWithJsonArray([
    //execDefine("exec-1", "Execute next task fasfa", []),
    execDefine("exec-2", "%2 %1", [
        {
            "type": "field_number",
            "name": "EXECLine",
            "value": 0,
            "min": 0
        },
        trueFalse("EXECIsNextLine", "Execute next LineList in sequence", "Execute LineList #")
    ]),
    execDefine("exec-3", "%2 %1", [
        {
            "type": "field_number",
            "name": "EXECLine",
            "value": 0,
            "min": 0
        },
        trueFalse("EXECIsNextLine", "Execute next LineList in sequence", "Execute LineList #")
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
    execDefine("exec-7", "Load event %1 from PhaseNo %2 (EventType %3, ExecType %4, PreRead %5) [CHAIN %6: EventNo %7, PhaseNo %8, type %9] [FADEIN %10: Color: %11, type %12] [FADEOUT %13: CanFadeIn %14, Color: %15, type %16] [START %17: (%18, %19, %20, %21deg), OFFSET %22: (%23, %24, %25, rotX %26deg, rotY %27deg)", [
        {
            "type": "field_input",
            "name": "EXECEventNo",
            "text": "0000"
        },
        {
            "type": "field_input",
            "name": "EXECEventPhaseNo",
            "text": "-1"
        },
        {
            "type": "field_number",
            "name": "EXECEventType",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecType",
            "value": 0
        },
        trueFalse("EXECEventPreRead", def=false),
        trueFalse("EXECEventExecUseChainEvent", "enabled", "disabled", false),
        {
            "type": "field_input",
            "name": "EXECEventChainEventNo",
            "text": "0000"
        },
        {
            "type": "field_input",
            "name": "EXECEventChainPhaseNo",
            "text": "-1"
        },
        {
            "type": "field_number",
            "name": "EXECEventChainExecType",
            "value": 0
        },
        trueFalse("EXECEventExecUseBeginFade", "enabled", "disabled", false),
        {
            "type": "field_input",
            "name": "EXECEventExecBeginFadeColor",
            "text": "FF000000"
        },
        {
            "type": "field_number",
            "name": "EXECEventExecBeginFadeType",
            "value": 1
        },
        trueFalse("EXECEventExecUseEndFade", "enabled", "disabled", false),
        trueFalse("EXECEventExecEndFadeCanFadeIn"), // usually true first
        {
            "type": "field_input",
            "name": "EXECEventExecEndFadeColor",
            "text": "FF000000"
        },
        {
            "type": "field_number",
            "name": "EXECEventExecEndFadeType",
            "value": 0
        },
        trueFalse("EXECEventExecbSetStartPos", "enabled", "disabled", false),
        {
            "type": "field_number",
            "name": "EXECEventExecStartPosX",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecStartPosY",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecStartPosZ",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecStartRotY",
            "value": 0
        },
        trueFalse("EXECEventExecbSetOffsetPos", "enabled", "disabled", false),
        {
            "type": "field_number",
            "name": "EXECEventExecOffsetPosX",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecOffsetPosY",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecOffsetPosZ",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecOffsetRotX",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "EXECEventExecOffsetRotY",
            "value": 0
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
    execDefine("exec-10", "Set Counter %1 %2 %3 or %4", [
        {
            "type": "field_number",
            "name": "ExecCntNo",
            "value": 0,
            "min": 0
        },
        ifCommand("ExecCommand"),
        {
            "type": "field_number",
            "name": "ExecValue1",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecValue2",
            "value": 0,
            "min": 0
        }
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
            "type": "field_input",
            "name": "ExecFadeColor",
            "text": "0000"
        },
    ]),
    execDefine("exec-16", "Load New Area Data from Quest %1, PhaseNo %2, SubPhaseIndex %3 (POS %4, %5, %6, %7deg), LoadingType %8 (IsSet %9, IsCountUp %10)", [
        {
            "type": "field_input",
            "name": "ExecQuestId",
            "text": "0000"
        },
        {
            "type": "field_number",
            "name": "ExecPhaseNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecSubPhaseIndex",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecPosX",
            "value": 0,
        },
        {
            "type": "field_number",
            "name": "ExecPosY",
            "value": 0,
        },
        {
            "type": "field_number",
            "name": "ExecPosZ",
            "value": 0,
        },
        {
            "type": "field_number",
            "name": "ExecRotY",
            "value": 0,
        },
        {
            "type": "field_dropdown",
            "name": "ExecLoadingType",
            "options": [
                ["Default", "0"],
                ["Astral Plane [debug]", "1"],
                ["Astral Plane [player]", "2"],
                ["Astral Plane [no player]", "3"]
            ]
        },
        trueFalse("ExecIsSet"),
        trueFalse("ExecIsCountUp")
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
            "value": 1,
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
    execDefine("exec-23", "Load SubTitle %1 from Quest %2", [
        {
            "type": "field_number",
            "name": "ExecCallSubTitleNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_input",
            "name": "ExecCallSubTitleQuestId",
            "text": "0000"
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

    execDefine("exec-35", "UNKNOWN [Index %1, bOn %2]", [
        {
            "type": "field_number",
            "name": "Index",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "bOn",
            "value": 0
        }
    ]),
    execDefine("exec-36", "Set SetNo %1 of GroupNo %2's position to (%3, %4, %5, %6deg)", [
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
            "type": "field_number",
            "name": "PosX",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "PosY",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "PosZ",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "RotY",
            "value": 0
        }
    ]),
    (() => {var def = execDefine("exec-37", "Return", []); def['nextStatement'] = undefined; return def })(),

    execDefine("exec-39", "Load Astral Plane arena of Quest %1 | To pos (%2, %3, %4, %5deg), type %6, layout pattern %7, ObjGroupNo %8, %9, %10 [NOTICE: Hash %11, NoticeNo %12, type %13] [IN: NoticeNo %14, type %15]", [
        {
            "type": "field_input",
            "name": "QuestId",
            "text": "0"
        },
        {
            "type": "field_number",
            "name": "x",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "y",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "z",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "rot",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "Type",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "LayoutPattern",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "ObjGroupNo",
            "value": 0
        },
        trueFalse("bSetReturnPoint", "Set return point", "Don't set return point"),
        trueFalse("bSetEm", "Set em", "Don't set em"),
        {
            "type": "field_input",
            "name": "NoticeHash",
            "text": "0000"
        },
        {
            "type": "field_number",
            "name": "NoticeNo",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "NoticeType",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "InNoticeNo",
            "value": 0
        },
        {
            "type": "field_number",
            "name": "InNoticeType",
            "value": 0
        }
    ]),

    execDefine("exec-45", "Add Pin to Map", []),
    execDefine("exec-46", "Remove Pin from Map / Show case result screen", []),
    execDefine("exec-47", "Start Fade (Type %1, stop inputs %2, color %3)", [
        {
            "type": "field_number",
            "name": "Type",
            "value": 0,
            "min": 0
        },
        trueFalse("bKeyStop"),
        {
            "type": "field_input",
            "name": "Color",
            "text": "0000"
        },
    ]),
    execDefine("exec-48", "End Fade", []),
    execDefine("exec-49", "Set SaveFlag %1 to %2", [
        {
            "type": "field_number",
            "name": "ExecFlagNo",
            "value": 0,
            "min": 0
        },
        trueFalse("ExecbCheck")
    ]),
    execDefine("exec-50", "Load File Results Screen | Quest %1, PhaseNo %2, SubPhaseIndex %3 (POS %4, %5, %6, %7deg), LoadingType %8 (IsSet %9, IsCountUp %10, IsPhaseJump %11)", [
        {
            "type": "field_input",
            "name": "ExecQuestId",
            "text": "0"
        },
        {
            "type": "field_number",
            "name": "ExecPhaseNo",
            "value": 1,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecSubPhaseIndex",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecPosX",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecPosY",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecPosZ",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecRotY",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "ExecLoadingType",
            "value": 0,
            "min": 0
        },
        trueFalse("ExecIsSet"),
        trueFalse("ExecIsCountUp"),
        trueFalse("IsPhaseJump", "true", "false", false)
    ]),
    execDefine("exec-51", "Set a timer for %1 seconds (Notice # %2, type %3) (timer type %4)", [
        {
            "type": "field_number",
            "name": "SecTime",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "NoticeNo",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "NoticeType",
            "value": 0,
            "min": 0
        },
        {
            "type": "field_number",
            "name": "Type",
            "value": 0,
            "min": 0
        },
    ]),
    execDefine("exec-52", "UNKNOWN [Mode %1]", [
        {
            "type": "field_number",
            "name": "Mode",
            "value": 0
        }
    ]),
    execDefine("exec-53", "%1 countdown [Type %2]", [
        trueFalse("bSet", "Show", "Hide"),
        {
            "type": "field_number",
            "name": "Type",
            "value": 0
        }
    ]),
    execDefine("exec-54", "UNKNOWN - %1 the player's ability to %2", [
        trueFalse('bLock', 'lock', 'unlock'),
        {
            "type": "field_number",
            "name": "Type",
            "value": 0
        }
    ]),
    execDefine("exec-55", "UNKNOWN", []),

    execDefine("exec-59", "Stop all subtitles", []),
    execDefine("exec-60", "Force costume change to %1", [
        {
            "type": "field_dropdown",
            "name": "Type",
            "options": [
                ["Default", "0"],
                ["Lappy Costume", "1"],
                ["Raven Armor", "2"],
                ["Drab Civvies", "3"],
                ["ARI Medical Gear", "4"],
                ["Reset", "5"]
            ]
        }
    ]),
    execDefine("exec-61", "%1 GroupNo %2 to/from memory", [
        trueFalse("bRead", "Read", "Discard"),
        {
            "type": "field_number",
            "name": "GroupNo",
            "value": 0,
            "min": 0
        }
    ]),
]);

// SCRIPTS
var workspaceCache = ""
function renderTaskList(taskListNo, saveExisting=true) {
    var workspace = Blockly.getMainWorkspace()
    if (saveExisting && Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace()).outerHTML != workspaceCache) {
        var $dom = $(Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace()))
        if (!$dom.find('block[type="unknown-if"]').length && !$dom.find('block[type="unknown-exec"]').length) {
            var oldTaskListNo = $('#taskList').find('.li-selected').attr("id").split("-")[1] 
            var lineLists = []
            function parseDomTree(elem) {
                /*
                typeEXEC 1 means that the execution continues inside the IF block, while any other typeEXEC means that only that one is in  
                */
                var commandList = []
                var otherCommandLists = []
                if ($(elem).attr('type').startsWith("if-")) {
                    commandList.push({"name": "typeIF", "value": $(elem).attr('type').split("-")[1], "children": [], "attributes": {}});
                } else {
                    commandList.push({"name": "typeIF", "value": "0", "children": [], "attributes": {}}); // force no IF statement in EXEC
                    commandList.push({"name": "typeEXEC", "value": $(elem).attr('type').split("-")[1], "children": [], "attributes": {}});
                }
                $(elem).children("field").each(function (index) {
                    var fieldval = $(this).text()
                    if (questShouldHex($(this).attr('name'))) {
                        fieldval = parseInt(fieldval, 16)
                    }
                    commandList.push({"name": $(this).attr('name'), "value": fieldval.toString(), "children": [], "attributes": {}})
                })
                if ($(elem).children('statement[name="execarea"]').length && $(elem).attr('type').startsWith("if-")) {
                    // always a "connector" statement
                    if (!$(elem).children('statement[name="execarea"]').children("block").length) {
                        // If no elements inside, use EXEC 0
                        commandList.push({"name": "typeEXEC", "value": "0", "children": [], "attributes": {}});
                    } else if ($(elem).children('statement[name="execarea"]').children("block").children("next").length || $(elem).children('statement[name="execarea"]').children("block").attr("type").toLowerCase().startsWith('if')) {
                        // check to see if there is more than one statement in the block; if so, use EXEC 1 (connector)
                        // also happens if there's layered IF statements
                        commandList.push({"name": "typeEXEC", "value": "1", "children": [], "attributes": {}});
                        otherCommandLists.push(...parseDomTree($(elem).children('statement[name="execarea"]').children("block")))
                    } else {
                        // else, use the next EXEC
                        commandList.push({"name": "typeEXEC", "value": $(elem).children('statement[name="execarea"]').children("block").attr('type').split("-")[1], "children": [], "attributes": {}});
                        $(elem).children('statement[name="execarea"]').children("block").children("field").each(function (index) {
                            var fieldval = $(this).text()
                            if (questShouldHex($(this).attr('name'))) {
                                fieldval = parseInt(fieldval, 16)
                            }
                            commandList.push({"name": $(this).attr('name'), "value": fieldval.toString(), "children": [], "attributes": {}})
                        })
                    }
                }
                if ($(elem).children("next").length) {
                    // after exec or normal block
                    otherCommandLists.push(...parseDomTree($(elem).children('next').children("block")))
                }
                return [{"name": "CommandList", "value": "", "attributes": {}, "children": commandList}, ...otherCommandLists]
            }
            // ---- parse task starts ----
            $dom.find('block[type="task-start"]').each(function() {
                var taskNo = $(this).children('field[name="taskno"]').text();
                if ($(this).children("next").find("block").length) {
                    lineLists[taskNo] = {"name": "LineList", "value": "", "children": parseDomTree($(this).children("next").find("block")[0]), "attributes": {}};
                } else {
                    // EMPTY TASK
                    lineLists[taskNo] = {"name": "LineList", "value": "", "children": [
                        {"name": "CommandList", "value": "", "attributes": {}, "children": [
                            {"name": "typeIF", "value": "0", "attributes": {}, "children": []},
                            {"name": "typeEXEC", "value": "0", "attributes": {}, "children": []}
                        ]}
                    ], "attributes": {}};
                }
            })
            currentTaskList = loadedFile['files']['QuestData.bxm']['extracted']['children'][1]['children'][oldTaskListNo];
            if (Object.keys(currentTaskList).length > 0) {
                // overwrite existing task list
                var index = findItem(currentTaskList['children'], "LineListTree", true)
                loadedFile['files']['QuestData.bxm']['extracted']['children'][1]['children'][oldTaskListNo]['children'][index]['children'] = lineLists;
            } else {
                // create new task list
                alert("Unimplemented task list creation")
            }
            console.log("Changes saved successfully!")
        } else {
            console.log("Unknown EXEC or IF in this Task! Changes were not saved.")
        }
    }
    if (taskListNo < 0) {
        return;
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
                    if (['typeIF', 'typeEXEC'].includes(key) || key.substr(0,4).toLowerCase() == 'exec') { continue };
                    if (parseInt(taskList.LineListTree[x][y].typeEXEC) < 2 && !key.toLowerCase().startsWith('if')) {
                        xml += `<field name="IF${key}">${value}</field>`;
                    } else {
                        xml += `<field name="${key}">${value}</field>`;
                    }
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
    Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.Xml.textToDom(xml), workspace);
    workspace.cleanUp()
    workspace.trashcan.emptyContents()
    workspaceCache = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace()).outerHTML;
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
window.addEventListener("load", function(){
    // Blockly doesn't like it when display: none is set at page load, so i make it transparent until necessary
    $('#taskeditor').css({'filter': 'inherit', 'display': 'none'})
})