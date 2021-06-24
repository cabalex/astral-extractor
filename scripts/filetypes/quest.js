function loadInitialQuest(fileType, file) {
  return new Promise((resolve, reject) => {
    var header = null;
    var hashes = null;
    var localFiles = {};
    var names = [];
    var reader = new FileReader();
    reader.onloadend = async function(e) {
      if (e.target.readyState == FileReader.DONE) {
        header = new Uint32Array(e.target.result.slice(0, 28));
        // magic - 0
        // filenumber - 1
        // fileoffsetsoffset - 2
        // fileextensionsoffset - 3
        // filenamesoffset - 4
        // filesizesoffset - 5
        // hashmapoffset - 6
        const fileOffsetsTable = new Uint32Array(e.target.result.slice(header[2], header[2] + header[1]*4));
        const wholeFileExt = arrayBufferToString(e.target.result.slice(header[3], header[3] + header[1]*4));
        const sizesTable = new Uint32Array(e.target.result.slice(header[5], header[5] + header[1]*4));
        var substring = arrayBufferToString(e.target.result.slice(header[4], header[6])).replace(/[^\x20-\x7E]/g, '');
        var tmpstr = "";
        for (var i = 0; i < substring.length; i++) {
          tmpstr += substring[i];
          if (tmpstr.charAt(tmpstr.length-4) == ".") {
            names.push(tmpstr);
            tmpstr = "";
          }
        }
        for (var i = 0; i < header[1]; i++) {
          localFiles[names[i]] = {'offset': fileOffsetsTable[i], 'size': sizesTable[i], 'kind': 'extracted', 'raw': e.target.result.slice(fileOffsetsTable[i], fileOffsetsTable[i] + sizesTable[i])}; // kinds: "extracted" and "custom"
          if (sizesTable[i] != 0) {
            if (wholeFileExt.substr(i*4, 3) == "bxm") {
              localFiles[names[i]]['extracted'] = QuestBXMLoader(localFiles[names[i]]['raw'])
            } else if (wholeFileExt.substr(i*4, 3) == "csv") {
              localFiles[names[i]]['extracted'] = QuestCSVLoader(localFiles[names[i]]['raw'])
            }
          }
        }
        const questId = file.name.substr(5, 4);
        $('div[id="' + file.name + '"]').find('h4').append(` - q${questId} <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['quest'].replace(/{filename}/g, file.name))

        globalFiles[file.name] = {'fp': file, 'files': localFiles, 'fileOrder': names.slice(0, Object.keys(localFiles).length), 'hashMap': e.target.result.slice(header[6], fileOffsetsTable[0]), 'id': questId}
        QuestEditorSetup(file.name);
        resolve();
      }
    }
    reader.readAsArrayBuffer(file) // read whole file
  })
}

function findChild(childrenList, name) {
  return childrenList[childrenList.map(function (item) {return item['name']}).indexOf(name)];
}

// questData classes

const states = [false, true]
class questDataTaskList {
  constructor(child) {
    this.TaskName = child['attributes']['TaskName']
    this.TemplateName = child['attributes']['TemplateName']

    this.TaskEnable = states[parseInt(findChild(child['children'], "TaskEnable")['value'])];
    this.WorkInAdvanced = states[parseInt(findChild(child['children'], "TaskEnable")['value'])];
    this.TaskColor = parseInt(findChild(child['children'], "TaskEnable")['value']);
    this.LineListTree = [];
    const tmp_lineListTree = findChild(child['children'], "LineListTree")
    for (var i = 0; i < tmp_lineListTree['children'].length; i++) {
      var tmp_lineList = [];
      for (var x = 0; x < tmp_lineListTree['children'][i]['children'].length; x++) {
        tmp_lineList.push(new questDataCommandList(tmp_lineListTree['children'][i]['children'][x]));
      }
      this.LineListTree.push(tmp_lineList);
    }
  }
}
// don't need a linelist tree since it has no args, essentially an array
class questDataCommandList {
  constructor(child) {
    for (var i = 0; i < child['children'].length; i++) {
      if (child['children'][i]['value'].includes(" ")) {
        this[child['children'][i]['name']] = child['children'][i]['value'];
      } else {
        this[child['children'][i]['name']] = parseInt(child['children'][i]['value']);
        if (child['children'][i]['name'].includes("Hash") || child['children'][i]['name'].includes("QuestId")) {
          this[child['children'][i]['name']] = this[child['children'][i]['name']].toString(16).toUpperCase();
        } 
      }
    }
  }

  prettyPrint() {
    var output = [];
    switch (this.typeIF) {
      case 0:
        break;
      case 1:
        output.push(`IF IndexNo ${this.IFIndexNo} of GroupNo ${this.IFGroupNo} (multiple ${states[this.IFMultiple]}, bCheck ${states[this.IFbCheck]})`)
        break;
      case 38:
        output.push(`IF GroupNo ${this.IFGroupNo} (bCheck ${states[this.IFbCheck]})`)
        break;
      case 2:
        output.push(`IF Command ${this.IFCommand} of GroupNo ${this.IFGroupNo} == ${this.IFValue} (type ${this.IfType})`)
        break;
      case 3:
        output.push(`IF Hash ${this.IFHash} (bCheck ${states[this.IFbCheck]})`)
      case 4:
      case 28:
        // 4 has QuestId set to 0
        output.push(`IF FlagNo ${this.IFFlagNo} is set (bCheck ${states[this.IFbCheck]})`)
        break;
      case 5:
        output.push(`IF Counter ${this.IFCntNo} == ${this.IFValue} (Command ${this.IFCommand})`)
      case 7:
        output.push(`IF FlagNo ${this.IFFlagNo} of q${this.IFQuestId} is set (bCheck ${states[this.IFbCheck]})`)
        break;
      case 10:
        output.push(`IF EventNo ${this.EventNo} is in state ${this.EventState} (type ${this.EventType}, condition ${this.Condition})`)
        break;
      case 11:
        output.push(`IF ${this.IFValueHash} == ${this.IFValue2Hash} (IFHash ${this.IFHash}, condition ${this.IFCondition})`)
        break;
      case 15:
        output.push(`IF index ${this.IfAreaIndex} of AreaGroup ${this.IfAreaGroup} // EmSetNo ${this.IfEmSetNo} of EmGroupNo ${this.IfEmGroupNo} (check ${this.IfCheck}, isGroup ${states[this.IfIsGroup]}`)
        break;
      case 17:
        output.push(`IF Condition ${this.IfCondition} of q${this.IfQuestId} (bCheck ${states[this.IFbCheck]})`)
        break;
      case 27:
        output.push(`IF bCheck is ${states[this.bCheck]} (type ${this.Type})`)
      case 22:
      case 30:
      case 33:
      case 36:
        output.push(`IF bCheck is ${states[this.bCheck]}`)
        break;
      case 37:
        output.push(`IF EmSetNo ${this.IfEmSetNo} of EmGroupNo ${this.IfEmGroupNo} == ${this.IfValue} (condition ${this.IfCondition}, isGroup ${states[this.IfIsGroup]})`)
        break;
      default:
        output.push(`?? Unknown IF ${this.typeIF}`)
        console.log(`Unknown IF found ${this.typeIF}; printing class`);
        console.log(this)
    }
    switch (this.typeEXEC) {
      case 0:
        break;
      case 1:
        output.push('EXEC next command')
        break;
      case 2:
      case 3:
        if (this.EXECIsNextLine) {
          output.push(`EXEC next line (line ${this.EXECLine})`)
        } else {
          output.push(`EXEC line ${this.EXECLine}`)
        }
        break;
      case 4:
        output.push(`EXEC Wait ${this.EXECTimer} seconds`);
        break;
      case 5:
        output.push(`EXEC Load GroupNo ${this.EXECGroupNo} with SetMax ${this.EXECSetMax}`);
        break;
      case 6:
      case 21:
      case 22:
        output.push(`EXEC Load GroupNo ${this.EXECGroupNo}`);
        break;
      case 7:
        // THIS HAS MUCH MORE PARAMS: add later
        output.push(`EXEC Load Event ev${this.EXECEventNo.toString(16)}`)
        break;
      case 8:
        output.push(`EXEC Hash ${this.ExecHash}`)
        break;
      case 9:
      case 12:
      case 49:
        output.push(`EXEC FlagNo ${this.ExecFlagNo} (check? ${states[this.ExecbCheck]})`);
        break;
      case 10:
        output.push(`EXEC Set Counter ${this.ExecCntNo} to ${this.ExecValue1} and ${this.ExecValue2} (Command ${this.ExecCommand}`);
        break;
      case 15:
        output.push(`EXEC Fade at (${this.ExecPosX}, ${this.ExecPosY}, ${this.ExecPosZ}, RotY ${this.ExecRotY}) (UseFade ${states[this.ExecUseFade]}, FadeColor ${this.ExecFadeColor})`)
        break;
      case 16:
        output.push(`EXEC PhaseNo ${this.ExecPhaseNo} SubPhaseIndex ${this.ExecSubPhaseIndex} of q${this.ExecQuestId} at (${this.ExecPosX}, ${this.ExecPosY}, ${this.ExecPosZ}, RotY ${this.ExecRotY}) (IsCountUp ${states[this.ExecIsCountUp]}, IsSet ${this.ExecIsSet}, LoadingType ${this.ExecLoadingType})`)
        break;
      case 18:
        if (states[this.ExecDispTipsEnable]) {
          output.push(`EXEC Display TipNo ${this.ExecDispTipsNo}`);
        }
        break;
      case 20:
        output.push(`EXEC Set counter [Type ${this.ExecCounterType}] at Hash ${this.ExecCounterHash} to ${this.ExecCounterValueHash}`)
        break;
      case 23:
        output.push(`EXEC Call SubTitle ${this.ExecCallSubTitleNo} (QuestId ${this.ExecCallSubTitleQuestId})`);
        break;
      case 30:
        output.push(`EXEC Run Task ${this.ExecTaskNo} (type ${this.ExecType})`)
      case 31:
        output.push(`EXEC TalkId ${this.TalkId} of SetNo ${this.SetNo} of GroupNo ${this.GroupNo} of q${this.QuestId} (ExistSpeaker ${states[this.ExistSpeaker]})`)
        break;
      case 35:
        output.push(`EXEC ??? at pos ${this.Index} (bOn ${states[this.bOn]})`)
        break;
      case 36:
        output.push(`EXEC SetNo ${this.SetNo} of GroupNo ${this.GroupNo} at (${this.PosX}, ${this.PosY}, ${this.PosZ}, RotY ${this.RotY})`)
        break;
      case 27:
      case 37:
      case 38:
      case 45:
      case 46:
      case 48:
      case 55:
      case 59:
        output.push('END')
        break;
      case 47:
        output.push(`EXEC ??? with Type ${this.Type} and <b style="color: #${this.Color.toString(16).substr(2,6)}">Color ${this.Color.toString(16)}</b> (bKeyStop ${states[this.bKeyStop]})`)
        break;
      case 50:
        output.push(`EXEC PhaseNo ${this.ExecPhaseNo} SubPhaseIndex ${this.ExecSubPhaseIndex} of q${this.ExecQuestId} at (${this.ExecPosX}, ${this.ExecPosY}, ${this.ExecPosZ}, RotY ${this.ExecRotY}) (IsPhaseJump ${states[this.IsPhaseJump]}, LoadingType ${this.ExecLoadingType})`)
        break;
      case 51:
        output.push(`EXEC Show Notice ${this.NoticeNo} of NoticeType ${this.NoticeType} for ${this.secTime} secs (type ${this.Type})`);
        break;
      case 52:
        output.push(`EXEC Set Mode to ${this.Mode}`);
        break;
      case 53:
        output.push(`EXEC ??? with type ${this.Type} (bSet ${states[this.bSet]})`)
        break;
      case 58:
        output.push(`EXEC ??? with type ${this.Type} (bFlag ${states[this.bFlag]})`)
        break;
      case 60:
        output.push(`EXEC ??? with type ${this.Type}`)
      case 61:
        output.push(`EXEC GroupNo ${this.GroupNo} (bRead ${this.bRead})`)
        break;
      default:
        output.push(`?? Unknown EXEC ${this.typeEXEC}`)
        console.log(`Unknown EXEC found ${this.typeEXEC}; printing class`);
        console.log(this)
    }
    return output;
  }
}


function QuestEditorSetup(filename) {
  $('div[id="' + filename + '"]').append("<div id='files' style='display: flex' class='questEditorBody'></div>")
  const workingfile = globalFiles[filename];
  const questId = workingfile['id'];
  /*
  REQUIRED FILES
  - QuestData.bxm
  - EnemySet.bxm
  - BezierData.bxm
  OTHER
  - TalkScript_XXXX.bxm
  - TalkScript_speech_XXXX.bxm
  - SubtitleInfo_XXXX.csv
  - TalkCondition_XXXX.csv
  - TalkData_XXXX.csv
  - ExData.csv
  RARELY USED
  - SignboardData.bxm
  - ReliefSupplies.csv
  - ResultData.csv
  - TalkFlag_XXXX.csv
  SpeechBalloon_XXXX.csv
  */
  //////////////////////////// QuestData.bxm
  var questData = workingfile['files']['QuestData.bxm']['extracted']
  const colors = ['#EF5184', '#3C3744', '#0000FF', '#808080', '#F7931E']
  //const colors = ['#E8465A', '#3C3744', '#0000FF', '#808080', '#FFFF00'] // Really hard to see; using cleaner colors
  var output = `<h2>Quest Data (v${questData['children'][0]['value']})</h2>`
  // putting quest sub here for easy access
  output += `<h3>QuestSub</h3>`
  let questSub = questData['children'][2]
  if (questSub['children'][5]['value'] == "1") {
    output += `<table><tr><th><span title="File scenario value is set by this quest" class="material-icons">near_me</span>MainValueScenario</th><th>${questSub['attributes']['SetMainScenarioValueStr']}</th></tr>`
  } else {
    output += `<table><tr><th><span title="File scenario value is not set by this quest" class="material-icons">near_me_disabled</span>MainValueScenario</th><th>${questSub['attributes']['SetMainScenarioValueStr']}</th></tr>`
  }
  output += `<tr><th><span class="material-icons">star_outline</span>MinLevel</th><th>${questSub['children'][0]['value']}</th></tr><tr><th><span class="material-icons">star</span>MaxLevel</th><th>${questSub['children'][1]['value']}</th></tr>`
  if (questSub['children'][2]['value'] == "1") {
    output += `<tr><th><span title="Player Position is forced" class="material-icons">fmd_good</span>PlStartPos</th><th>${questSub['children'][3]['value']}</th></tr><tr><th><span title="Player Position is forced" class="material-icons">fmd_good</span>PlStartRotY</th><th>${questSub['children'][4]['value']}</th></tr>`
  } else {
    output += `<tr><th><span title="Player Position is not forced" class="material-icons">fmd_bad</span>PlStartPos</th><th>${questSub['children'][3]['value']}</th></tr><tr><th><span title="Player Position is not forced" class="material-icons">fmd_bad</span>PlStartRotY</th><th>${questSub['children'][4]['value']}</th></tr>`
  }
  output += '</table>'
  output += '<h3>AreaList</h3>'
  for (var i = 0; i < questData['children'][5]['children'].length; i++) {
    var child = questData['children'][5]['children'][i];
    output += `<p><b style="font-size: larger; color: ${colors[4]}">GroupList ${child['attributes']['GroupIndex']}</b> | ${child['attributes']['GroupName']}<table>`
    for (var x = 0; x < child['children'].length; x++) {
      var workList = child['children'][x];
      output += `<tr><th>${x}</th></tr>`
      for (var y = 0; y < workList['children'].length; y++) {
        output += `<tr><th>${workList['children'][y]['name']}</th><th>${workList['children'][y]['value']}</th></tr>`
      }
    }
    output += '</table>'
  }

  output += '<h3>QuestData</h3>'
  for (var i = 0; i < questData['children'][1]['children'].length; i++) {
    const taskList = new questDataTaskList(questData['children'][1]['children'][i])
    output += `<p><b style="color: ${taskList.TaskColor}; font-size: larger">Task ${i}</b> | ${taskList.TaskName} | ${taskList.TemplateName}`
    if (taskList.TaskEnable) {
      output += '<span title="Task enabled" class="material-icons">check_box</span>'
    } else {
      output += '<span title="Task disabled" class="material-icons">check_box_outline_blank</span>'
    }
    if (taskList.hasOwnProperty('WorkInAdvanced')) {
      if (taskList.WorkInAdvanced) {
        output += '<span title="Task works in advance" class="material-icons">update</span>'
      } else {
        output += '<span title="Task does not work in advance" class="material-icons">update_disabled</span>'
      }
    }
    output += '<table>'
    for (var x = 0; x < taskList.LineListTree.length; x++) {
      output += `<tr><th>${x}</th><th>-------------</th></tr>`
      for (var y = 0; y < taskList.LineListTree[x].length; y++) {
        output += "<tr><th>" + taskList.LineListTree[x][y].prettyPrint().join("</th><th>").trimRight("<th>") + "</tr>";
      }
    }
    output += '</table>'
    /*var child = questData['children'][1]['children'][i]
    output += `<p><b style="color: ${colors[child['children'][2]['value']]}; font-size: larger">Task ${i}</b> | ${child['attributes']['TaskName']} | ${child['attributes']['TemplateName']}`
    // task enabled
    if (child['children'][0]['value'] == "1") {
      output += '<span title="Task enabled" class="material-icons">check_box</span>'
    } else {
      output += '<span title="Task disabled" class="material-icons">check_box_outline_blank</span>'
    }
    // work in advance
    // NOTE: WorkInAdvanced doesn't always appear?
    if (child['children'][1]['value'] == "1") {
      output += '<span title="Task works in advance" class="material-icons">update</span>'
    } else {
      output += '<span title="Task does not work in advance" class="material-icons">update_disabled</span>'
    }
    output += "<br>"
    // LineLists and commandLists need their own pretty looking GUI; to be worked on
    for (var x = 0; x < child['children'][3]['children'].length; x++) {
      output += `<b class="tableHeader">LineList ${x}</b><table>`
      for (var y = 0; y < child['children'][3]['children'][x]['children'].length; y++) {
        var commandList = child['children'][3]['children'][x]['children'][y]
        output += `<tr><th>${y}</th></tr>`
        for (var z = 0; z < commandList['children'].length; z++) {
          output += `<tr><th></th><th>${commandList['children'][z]['name']}</th><th>${commandList['children'][z]['value']}</th>`
        }
        output += "</tr>"
      }
      output += '</table>'
    }
    output += '</p>'*/
  }
  output += '<h3>QuestFlagNameList</h3>'
  let questFlagNameList = questData['children'][3]['children'].map(function (item) {return item['attributes']['QuestFlagName']})
  output += `<p class="code">${questFlagNameList.join(", ")}</p>`
  output += '<h3>SaveFlagNameList</h3>'
  let saveFlagNameList = questData['children'][4]['children'].map(function (item) {return item['attributes']['SaveFlagName']})
  output += `<p class="code">${saveFlagNameList.join(", ")}</p>`

  $('div[id="' + filename + '"]').find("#files").append("<div style='display: block; margin-left: 10px;' class='scroll'>" + output + "</div><hr>");
  //////////////////////////// EnemySet.bxm
  // This is really ugly code. TODO: redo this
  output = `<h2>Enemy Sets</h2>`
  var enemySet = workingfile['files']['EnemySet.bxm']['extracted']
  //output += `<b>GroupPosList (${enemySet['children'][1]['children'].length} long)</b><br>` // todo: groupposlist (might be irrelevant?)
  const hiddenAtZero = ['PathNo', 'EscapeNo', 'ExSetTypeA', 'ExSetTypeB', 'ExSetTypeC', 'ExSetTypeD', 'ExSetAttr', 'ExSetRtn', 'ExSetFlag', 'TmpPos', 'NoticeNo', 'SetWait', 'LvMin', 'LvMax', 'HashNo', 'ItemId', 'SetTimer', 'SetCounter', 'SetRadius', 'GroupPos', 'GridDisp', 'EventSuspend', 'SimpleSubspaceSuspend']
  const convertToHex = ['Id', 'ParentId', 'ExSetFlag', 'SetFlag']
  for (var i = 0; i < enemySet['children'][0]['children'].length; i++) {
    var groupList = enemySet['children'][0]['children'][i];
    output += `<p><b style="font-size: larger; color: ${colors[0]}" title="hash ${groupList['attributes']['GroupNameHash']}">Set ${groupList['attributes']['number']}</b> | ${groupList['attributes']['name']}<table>`
    for (var x = 0; x < groupList['children'].length; x++) {
      var setInfo = groupList['children'][x];
      output += `<tr><th>${setInfo['children'][0]['value']}</th></tr>`
      for (var y = 0; y < setInfo['children'].length; y++) {
        if (hiddenAtZero.includes(setInfo['children'][y]['name']) && parseInt(setInfo['children'][y]['value'].split(" ")[0]) == 0) {
          continue
        }
        if (convertToHex.includes(setInfo['children'][y]['name'])) {
          if (setInfo['children'][y]['name'] == "Id") {
            var id = parseInt(setInfo['children'][y]['value']).toString(16)
            output += `<tr><th>${setInfo['children'][y]['name']}</th><th title="${id}">${questLookup(id)}</th></tr>`
          } else {
            output += `<tr><th>${setInfo['children'][y]['name']}</th><th>${parseInt(setInfo['children'][y]['value']).toString(16).toUpperCase()}</th></tr>`
          }
        } else {
          output += `<tr><th>${setInfo['children'][y]['name']}</th><th>${setInfo['children'][y]['value']}</th></tr>`
        }
      }
    }
    output += '</table></p>'
  }
  $('div[id="' + filename + '"]').find("#files").append("<div style='display: block; margin-left: 10px;' class='scroll'>" + output + "</div>");
}

function questLookup(id) {
  /*
  1 - pl/
  2 - em/
  3 - ???
  4 - ???
  5 - ???
  6 - ???
  7 - ???
  8 - ???
  9 - ???
  A - ???
  B - ???
  C - ba/?
  D - ???
  E - ???
  F - Astral Plane gates?
  */
  switch(id[0]) {
    case "1":
      return lookup("pl" + id.substr(1, 4));
    case "2": // 2 == em
      return lookup("em" + id.substr(1, 4));
    default:
      return id;
  }
}

function QuestCSVLoader(arrayBuffer) {
  var [lines, maxLengthLength] = convertCSVtoArray(arrayBuffer);
  var output = [];
  decoder = new TextDecoder("shift-jis");
  for (var i = 0; i < lines.length; i++) {
    // lines
    var currentLine = [];
    for (var x = 0; x < lines[i].length; x++) {
      // items in line
      currentLine.push(decoder.decode(lines[i][x].buffer));
    }
    output.push(currentLine);
  }
  return output;
}

function QuestBXMLoader(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  // magic - 0-4 - magic may be BXM\x00 or XML\x00
  // unk (flags?) - 4-8
  const nodeCount = view.getUint16(8);
  var dataCount = view.getUint16(10);
  const dataSize = view.getUint32(12);

  // node info starts at 0x10 (16)
  var nodeInfo = [];
  var offset = 16;
  for (var i = 0; i < nodeCount; i++) {
    nodeInfo.push([view.getUint16(offset), view.getUint16(offset+2), view.getUint16(offset+4), view.getUint16(offset+6)])
    offset += 8;
  }
  const dataOffsetsOffset = offset;
  var dataOffsets = [];
  for (var i = 0; i < dataCount; i++) {
    dataOffsets.push([view.getUint16(offset), view.getUint16(offset+2)])
    // name offset - 0
    // value offset - 1
    offset += 4;
  }
  var enc;
  var encAlt;
  enc = new TextDecoder("UTF-8")
  function readString(pos) {
    pos = pos + offset;
    var tmppos = pos;
    while (tmppos < arrayBuffer.byteLength && view.getUint8(tmppos) != 0) {
      tmppos += 1;
    }
    return enc.decode(arrayBuffer.slice(pos, tmppos));
  }
  function readTree(nodeNum) {
    var node = nodeInfo[nodeNum];
    // child count - 0
    // first child index/next sibling list index - 1
    // attribute count - 2
    // data index - offset inside the data offset table - 3
    var name = "";
    var value = "";
    
    if (dataOffsets[node[3]][0] != -1) {
      name = readString(dataOffsets[node[3]][0])
    }
    if (dataOffsets[node[3]][1] != -1) {
      value = readString(dataOffsets[node[3]][1])
    }
    var outputJSON = {"name": name, "value": value, "attributes": {}, "children": []}; // the current node
    // attributes
    if (node[2] > 0) {
      for (var i = 0; i < node[2]; i++) {
        var attrname = "";
        var attrvalue = "";
        if (dataOffsets[node[3]+i+1][0] != -1) {
          attrname = readString(dataOffsets[node[3]+i+1][0])
        }
        if (dataOffsets[node[3]+i+1][1] != -1) {
          attrvalue = readString(dataOffsets[node[3]+i+1][1])
        }
        outputJSON['attributes'][attrname] = attrvalue;
      }
    }
    // children
    if (node[0] > 0) {
      var childNodeNum = node[1];
      for (var i = 0; i < node[0]; i++) {
        outputJSON['children'].push(readTree(childNodeNum+i))
      }
    }
    return outputJSON;
  }
  return readTree(0);
  //globalFiles[file.name] = {'fp': file, 'json': output, 'xml': xmlOutput, 'encoding': encoding}
}

function questToDAT(filename, elem) {
  $('div[id="' + filename + '"]').remove();
  $('div#content').append(`<div id="${filename}"><h4 title="${filename}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${filename}</h4><div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> DAT File</h5><p>${fileInfo['dat']}</p></div></div>`);
  loadInitialDAT('dat', globalFiles[filename]['fp'])
}

function hideQuestEditorTables(filename, elem) {
  $('div[id="' + filename + '"]').find('#files').find('table').css('display', 'none')
  $('div[id="' + filename + '"]').find('#files').find('.tableHeader').css('display', 'none')
  $(elem).replaceWith(`<a onclick="showQuestEditorTables(\'${filename}\', this)"><span class="material-icons">visibility</span> Show table elements</a>`)
}

function showQuestEditorTables(filename, elem) {
  $('div[id="' + filename + '"]').find('#files').find('table').css('display', '')
  $('div[id="' + filename + '"]').find('#files').find('.tableHeader').css('display', '')
  $(elem).replaceWith(`<a onclick="hideQuestEditorTables(\'${filename}\', this)"><span class="material-icons">visibility</span> Hide table elements</a>`)
}