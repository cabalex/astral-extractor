// Relies on a lot of quest.js functions
function loadInitialEvent(fileType, file) {
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
            if (names.includes(tmpstr)) { 
              var z = 1;
              while (names.includes(tmpstr + `~${z}`)) {
                z += 1;
              }
              names.push(tmpstr + `~${z}`)
            } else {
              names.push(tmpstr);
            }
            tmpstr = "";
          }
        }
        for (var i = 0; i < header[1]; i++) {
          localFiles[names[i]] = {'offset': fileOffsetsTable[i], 'size': sizesTable[i], 'kind': 'extracted', 'raw': e.target.result.slice(fileOffsetsTable[i], fileOffsetsTable[i] + sizesTable[i])}; // kinds: "extracted" and "custom"
          if (sizesTable[i] != 0) {
            if (['bxm', 'gad', 'seq'].includes(wholeFileExt.substr(i*4, 3))) {
              localFiles[names[i]]['extracted'] = QuestBXMLoader(localFiles[names[i]]['raw'])
            } else if (wholeFileExt.substr(i*4, 3) == "csv") {
              localFiles[names[i]]['extracted'] = QuestCSVLoader(localFiles[names[i]]['raw'])
            }
          }
        }
        const questId = file.name.substr(2, 4);
        $('div[id="' + file.name + '"]').find('h4').append(` - ev${questId} <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['quest'].replace(/{filename}/g, file.name))

        globalFiles[file.name] = {'fp': file, 'files': localFiles, 'fileOrder': names.slice(0, Object.keys(localFiles).length), 'hashMap': e.target.result.slice(header[6], fileOffsetsTable[0]), 'id': questId}
        EventEditorSetup(file.name);
        resolve();
      }
    }
    reader.readAsArrayBuffer(file) // read whole file
  })
}

class Cut {
	constructor(child) {
		this.CutNo = child['attributes']['CutNo']
		this.FrameNum = child['attributes']['FrameNum'] // length
    this.ModelControl = [];
    this.Bgm = [];
    this.Sub = [];
    this.Se = [];
    this.CameraSeq = [];
	}

	prettyPrint() {
    var output = `<div id="cut-${this.CutNo}" class="cut" style="min-height: ${this.FrameNum*2}px"><h3 style="z-index: 2">Cut ${this.CutNo} - ${this.FrameNum} frames `;
    if (this.camera) {
      output += '<span title="Camera is defined here" class="material-icons">add_a_photo</span>'
    }
    output += "</h3>"
    for (var i = 0; i < this.ModelControl.length; i++) {
      if (this.ModelControl[i]['UniqueParamActorObjId'] != undefined) {
        output += `<div style="overflow-wrap: anywhere; line-height: 25px; position: relative; margin-top: ${this.ModelControl[i]['LaunchFrame']*2}px;">Launch ModelControl on <b>${this.ModelControl[i]['UniqueParamActorSubNo']} <span style="color: var(--secondary-color)">${questLookup(this.ModelControl[i]['UniqueParamActorObjId'])}</span></b></div>`
      } else { 
        output += `<div style="overflow-wrap: anywhere; line-height: 25px; position: relative; margin-top: ${this.ModelControl[i]['LaunchFrame']*2}px;">Launch ModelControl on flag <b>${this.ModelControl[i]['OnFlag']}</b> to <b>${this.ModelControl[i]['OffFlag']}</b></div>`
      }
    }
    for (var i = 0; i < this.Bgm.length; i++) {
      output += `<div style="background-color: var(--accent-color) !important; color: white !important; overflow-wrap: anywhere; line-height: 25px; position: relative; margin-top: ${this.Bgm[i]['LaunchFrame']*2}px;"><span title="Play BGM" class="material-icons">play_arrow</span> <b>${this.Bgm[i]['BgmEventName0']}</b> (ID ${this.Bgm[i]['BgmEventId0']})</div>`
    }
    for (var i = 0; i < this.Se.length; i++) {
      output += `<div style="background-color: var(--accent-color) !important; color: white !important; overflow-wrap: anywhere; line-height: 25px; position: relative; margin-top: ${this.Se[i]['LaunchFrame']*2}px;"><span title="Play sound" class="material-icons">play_arrow</span> SFX <b>${this.Se[i]['SeEventName0']}</b> (ID ${this.Se[i]['SeEventId0']})</div>`
    }
    for (var i = 0; i < this.Sub.length; i++) {
      output += `<div style="background-color: var(--secondary-color) !important; color: white !important; overflow-wrap: anywhere; line-height: 25px; position: relative; margin-top: ${this.Sub[i]['LaunchFrame']*2}px;">Dialogue <b>${this.Sub[i]['StrArg']}</b> (Act ${this.Sub[i]['Act']})</div>`
    }
    for (var i = 0; i < this.CameraSeq.length; i++) {
      output += `<div style="background-color: var(--dark-grey) !important; color: white !important; overflow-wrap: anywhere; line-height: 25px; position: relative; margin-top: ${this.CameraSeq[i]['LaunchFrame']*2}px;"><span title="Camera movement" class="material-icons">cameraswitch</span></b> From <b>${this.CameraSeq[i]['Pos']}</b> to <b>${this.CameraSeq[i]['Target']}</b> (Roll: ${this.CameraSeq[i]['Roll']}, FOV: ${this.CameraSeq[i]['Fovy']})<br>Jiggle speed: ${this.CameraSeq[i]['JiggleSpeed']} (hand: ${this.CameraSeq[i]['HandJiggleRate']}, roll: ${this.CameraSeq[i]['RollJiggleRate']})</div>`
    }
    return output + "</div>";
	}

  addCamera(child) {
    this.camera = true; // no other params
  }

	addModelControl(child) {
    Object.keys(child['attributes']).map(function(key) {if (key != "UniqueParamIntArgs") {child['attributes'][key] = parseInt(child['attributes'][key].split(" ")[0])}});
    child['attributes']['LaunchId'] = child['attributes']['LaunchId'].toString(16);
    if (child['attributes']['UniqueParamActorObjId']) {
      child['attributes']['UniqueParamActorObjId'] = child['attributes']['UniqueParamActorObjId'].toString(16);
    }
    if (child['attributes']['OnFlag']) {
      // OnFlag/OffFlag seems to be used in actual skippable cutscenes; only uses first of 4 addresses?
      child['attributes']['OnFlag'] = child['attributes']['OnFlag'].toString(16)
      child['attributes']['OffFlag'] = child['attributes']['OffFlag'].toString(16)
    }
    child['attributes']['LaunchFlag'] = child['attributes']['LaunchFlag'].toString(16);
    this.ModelControl.push(child['attributes']);
	}

  addBgm(child) {
    Object.keys(child['attributes']).map(function(key) {if (key != "BgmEventName0") {child['attributes'][key] = parseInt(child['attributes'][key])}});
    child['attributes']['LaunchId'] = child['attributes']['LaunchId'].toString(16);
    child['attributes']['LaunchFlag'] = child['attributes']['LaunchFlag'].toString(16);
    this.Bgm.push(child['attributes']);
  }

  addSe(child) {
    Object.keys(child['attributes']).map(function(key) {if (key != "SeEventName0") {child['attributes'][key] = parseInt(child['attributes'][key])}});
    child['attributes']['Rtpc'] = child['children'];
    child['attributes']['LaunchId'] = child['attributes']['LaunchId'].toString(16);
    child['attributes']['LaunchFlag'] = child['attributes']['LaunchFlag'].toString(16);
    this.Se.push(child['attributes']);
  }

  addSub(child) {
    Object.keys(child['attributes']).map(function(key) {if (key != "StrArg" && key != "IntArgs") {child['attributes'][key] = parseInt(child['attributes'][key])}});
    child['attributes']['LaunchId'] = child['attributes']['LaunchId'].toString(16);
    child['attributes']['LaunchFlag'] = child['attributes']['LaunchFlag'].toString(16);
    this.Sub.push(child['attributes']);
  }

  addCameraSeq(child) {
    Object.keys(child['attributes']).map(function(key) {if (key != "Pos" && key != "Target") {child['attributes'][key] = parseFloat(child['attributes'][key])}});
    child['attributes']['LaunchId'] = child['attributes']['LaunchId'].toString(16);
    child['attributes']['LaunchFlag'] = child['attributes']['LaunchFlag'].toString(16);
    this.CameraSeq.push(child['attributes']);
  }
}

class CutList {
	constructor(child) {
		this.MotionRate = child['attributes']['MotionRate']
		this.PlayRate = child['attributes']['PlayRate']

		this.cuts = child['children'].map(function (item) {return new Cut(item)});
		this.eventLength = 0;
		for (var i = 0; i < this.cuts.length; i++) {
			this.cuts[i].startFrame = this.length;
			this.eventLength += this.cuts[i]['FrameNum'];
		}
	}

  prettyPrint() {
    var output = [];
    for (var i = 0; i < this.cuts.length; i++) {
      output.push(this.cuts[i].prettyPrint());
    }
    return output.join('');
  }

  addCameraList(children) {
    for (var i = 0; i < children.length; i++) {
      this.cuts[parseInt(children[i]['attributes']['SubNo'])].addCamera(children[i])
    }
  }

  addModelControlSeq(children) {
    for (var i = 0; i < children.length; i++) {
      this.cuts[parseInt(children[i]['attributes']['LaunchCutNo'])].addModelControl(children[i])
    }
  }

  addBgmSeq(children) {
    for (var i = 0; i < children.length; i++) {
      this.cuts[parseInt(children[i]['attributes']['LaunchCutNo'])].addBgm(children[i])
    }
  }

  addSeSeq(children) {
    for (var i = 0; i < children.length; i++) {
      this.cuts[parseInt(children[i]['attributes']['LaunchCutNo'])].addSe(children[i])
    }
  }

  addSubSeq(children) {
    for (var i = 0; i < children.length; i++) {
      this.cuts[parseInt(children[i]['attributes']['LaunchCutNo'])].addSub(children[i])
    }
  }

  addCameraSeq(children) {
    for (var i = 0; i < children.length; i++) {
      this.cuts[parseInt(children[i]['attributes']['LaunchCutNo'])].addCameraSeq(children[i])
    }
  }
}

class Obj {
  constructor(child) {
    this.ObjId = child['attributes']['ObjId'];
    this.readObjId = child['attributes']['readObjId'] || child['attributes']['ObjId'];
    this.SubNo = parseInt(Number("0x" + child['attributes']['SubNo']));
    this.AttachType = parseInt(child['attributes']['AttachType']);
    this.HasParent = parseInt(child['attributes']['HasParent']);
    if (child['attributes']['Identifier']) {
      this.Identifier = child['attributes']['Identifier'];
    } else {
      this.Identifier = ""
    }
  }

  prettyPrint() {
    var output = "";
    if (this.ObjId == this.readObjId) {
      output += `<p><b style="color: var(--secondary-color); font-size: larger" title="${this.ObjId}"><span style="color: #808080">${this.SubNo}</span> ${lookup(this.ObjId)}</b> ${this.Identifier}`
    } else {
      output += `<p><b style="color: var(--secondary-color); font-size: larger" title="${this.ObjId}"><span style="color: #808080">${this.SubNo}</span> ${lookup(this.ObjId)} <span title="${this.readObjId}" style="color: var(--primary-color)">${lookup(this.readObjId)}</span> <span style="color: #808080" title="The game sets an object ID (in red), but it also has a 'read' object ID (in blue), which is the file it loads from the romFS." class="material-icons">help_center</span></b> ${this.Identifier}`
    }
    return output + "</p>"
  }

  addSubInfo(child) {
    // redefined?
    //this.ObjId = child['attributes']['ObjId'];
    //this.SubNo = parseInt(child['attributes']['SubNo']);
    //this.AttachType = parseInt(child['attributes']['AttachType']);
    //this.HasParent = parseInt(child['attributes']['HasParent']);
    this.CreateType = parseInt(child['attributes']['CreateType']);
    this.ReleaseType = parseInt(child['attributes']['ReleaseType']);
    this.CreateArgs = child['attributes']['CreateArgs'];
    this.ReleaseArgs = child['attributes']['ReleaseArgs'];
    this.Identifier = child['attributes']['Identifier'];
  }
}

class ObjList {
	constructor(child) {
		this.objs = {};
    this.objOrder = [];
    for (var i = 0; i < child['children'].length; i++) {
      var obj = new Obj(child['children'][i]);
      const objName = obj.ObjId + "-" + obj.SubNo;
      this.objs[objName] = obj;
      this.objOrder.push(objName);
    }
	}

  prettyPrint() {
    var output = [];
    for (var i = 0; i < this.objOrder.length; i++) {
      output.push(this.objs[this.objOrder[i]].prettyPrint());
    }
    return output.join('');
  }

  addObjSubInfo(children) {
    for (var i = 0; i < children.length; i++) {
      this.objs[`${children[i]['attributes']['ObjId']}-${parseInt(children[i]['attributes']['SubNo'])}`].addSubInfo(children[i])
    }
  }
} 

function EventEditorSetup(filename) {
  //-- Cuts
  $('div[id="' + filename + '"]').append("<div id='files' style='display: flex' class='eventEditorBody'></div>")
	const workingfile = globalFiles[filename];
	const id = workingfile['id'];
  
  // required
  try {
	  var cutList = new CutList(workingfile['files']['CutList.bxm']['extracted']);
    cutList.addCameraList(workingfile['files']['CameraList.bxm']['extracted']['children']);
  } catch {
    // Some files have .EVN but are actually .DATs, or don't have the CutList and CameraLists... fall back to DAT viewer
    questToDAT(filename, this)
    return
  }
  if (Object.keys(workingfile['files']).includes(`ev${id}_ModelControlSeq.seq`)) {
    cutList.addModelControlSeq(workingfile['files'][`ev${id}_ModelControlSeq.seq`]['extracted']['children']);
  }

  if (Object.keys(workingfile['files']).includes(`ev${id}_BgmSeq.seq`)) {
    cutList.addBgmSeq(workingfile['files'][`ev${id}_BgmSeq.seq`]['extracted']['children']);
  }

  // SeSeq ?? - Sound effect?
  if (Object.keys(workingfile['files']).includes(`ev${id}_SeSeq.seq`)) {
    cutList.addSeSeq(workingfile['files'][`ev${id}_SeSeq.seq`]['extracted']['children']);
  } 

  if (Object.keys(workingfile['files']).includes(`ev${id}_SubSeq.seq`)) {
    cutList.addSubSeq(workingfile['files'][`ev${id}_SubSeq.seq`]['extracted']['children']);
  }

  if (Object.keys(workingfile['files']).includes(`ev${id}_CameraSeq.seq`)) {
    cutList.addCameraSeq(workingfile['files'][`ev${id}_CameraSeq.seq`]['extracted']['children']);
  }

	$('div[id="' + filename + '"]').find("#files").append("<div style='display: block; margin-left: 10px;' class='scroll'><h3>CutList</h3>" + cutList.prettyPrint() + "</div>");

  //-- ObjList
  var objList = new ObjList(workingfile['files']['ObjList.bxm']['extracted']);
  if (Object.keys(workingfile['files']).includes('ObjSubInfo.bxm')) {
    objList.addObjSubInfo(workingfile['files']['ObjSubInfo.bxm']['extracted']['children']);
  }
  $('div[id="' + filename + '"]').find("#files").append("<div style='display: block; margin-left: 10px;' class='scroll'><h3>ObjList</h3>" + objList.prettyPrint() + "</div>");
}