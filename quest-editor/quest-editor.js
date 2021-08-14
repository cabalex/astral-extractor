// Quest Creator scripts.

var editorSettings = {
    "useBasicEditor": true,
    "activeTab": "emsets"
}


var mapPos = {
    "pos": [],
    "offset0": {}
}
var selectedItem = {
    "emSetNo": 0,
    "emNo": 0,
    "em": {}
}
// To get correct scale: Multiply orthographic scale by 4
const imageSizes = {
    "r100": 6000,
    "r200": 4000,
    "r240": 2000,
    "r300": 4000,
    "r310": 1200,
    "r400": 4000,
    "r500": 4000,
    "r600": 10000,
    "r800": 2000,
    "r840": 2000,
    "r900": 2000,
    "r910": 2000,
    "rb01": 2000,
    "rc00": 80
}

var loadedFile = {};
var loadedPKZ = {};

function dropHandler(ev) {

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    var files = [];
    if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (var i = 0; i < ev.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (ev.dataTransfer.items[i].kind === 'file') {
            files.push(ev.dataTransfer.items[i].getAsFile());
        }
        }
    } else {
        // Use DataTransfer interface to access the file(s)
        for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        files.push(ev.dataTransfer.files[i]);
        }
    }
    if (files.length > 0) {
        loadFiles(files);
    }
}
function dragOverHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}

async function clickFiles(event) {
    await loadFiles(event.files)
    $(event).val('')
}

async function loadFiles(files) {
    if (files[0].name.endsWith(".dat")) {
        $("#initial").css("display", "none")
        startQuestLoad(files[0])
    } else if (files[0].name.endsWith(".pkz")) {
        $('#pkzSelectorArea').replaceWith('<ul id="pkzSelectorArea"></ul>')
        loadedPKZ = await loadInitialPKZ("pkz", files[0], false, true);
        for (var i = 0; i < loadedPKZ['fileOrder'].length; i++) {
            $('#pkzSelectorArea').append(`<li class='clickableLi' title='${loadedPKZ['fileOrder'][i]}' onclick='exportToQuestDAT(this, "${loadedPKZ['fileOrder'][i]}")'>${loadedPKZ['fileOrder'][i].replace("quest", "").replace(".dat", "")} <b>${lookup(loadedPKZ['fileOrder'][i])}</b></li>`)
        }
        $("#initial-content").slideDown(100);
    } else {
        alert("We don't support that file type! Currently, we only support Quest .DATs and the main quest .PKZ.")
    }
}

function exportToQuestDAT(elem, subFile) {
    $('#initial-content').find('.li-selected').attr('class', 'clickableLi');
    $(elem).attr('class', 'li-selected');
    return new Promise(async (resolve, reject) => {
        var reader = new FileReader();
        reader.onloadend = async function(e) {
            if (e.target.readyState == FileReader.DONE) {
                // Old decoder is much faster for decoding purposes; using for decoding ZSTD
                const decoder = new ZSTDDecoder();
                await decoder.init();
                const decompressedArray = decoder.decode(new Uint8Array(e.target.result), Number(loadedPKZ['files'][subFile]['size']))
                var blob = new Blob([decompressedArray], {type: 'application/octet-stream'});
                blob.name = subFile;
                $("#initial").slideUp(100, complete=function() {$("#initial").css("display", "none")});
                await startQuestLoad(blob);
                resolve();
            }
        }
        reader.readAsArrayBuffer(loadedPKZ.fp.slice(Number(loadedPKZ['files'][subFile]['offset']), Number(loadedPKZ['files'][subFile]['offset']) + Number(loadedPKZ['files'][subFile]['compressedSize'])));
    })
}

function changeMap(elem, newMapId) {
    $('#map-main').attr({'src': '../assets/' + newMapId + '.png', 'currentmap': newMapId}).attr('height', imageSizes[newMapId]);
    // for some reason using css('background-image') doesn't work??
    document.documentElement.style.setProperty('--mapSize', imageSizes[newMapId] + "px");
    $('#mainselector').attr('style', `background-image: url('../assets/${newMapId}-thumb.png')`).text($(elem).text())
    mapZoom(0); // reset offsets and stuff
    $('#selector-dropdown').slideUp(100);
}

function mapZoom(changeSize) {
    const basezoom = parseFloat(getComputedStyle(document.body).getPropertyValue('--mapZoom'))
    if (basezoom <= 0.5 && changeSize < 0) {
        return
    } 
    var zoom = basezoom + changeSize;
    const currentMap = $('#map-main').attr('currentmap')
    document.documentElement.style.setProperty('--mapZoom', zoom);
    mapPos['offset0'] = $('#map-main').offset();
    $('#map-main').attr('height', imageSizes[currentMap] * zoom)
    $('#zoomindicator').text(zoom + "x");
}

function deleteFile() {
    $('.marker').remove()
    $('#sidebar-content').slideUp(100, complete=function() {$(this).replaceWith('<div id="sidebar-content"></div>')});
    $('#sidebar-header').slideUp(100, complete=function() {$(this).css('display', 'none').children('h1').remove()});
    $('#sidebar-contentHeader').slideUp(100);
    $('#repack').slideUp(100);
    $('#taskeditor').slideUp(100);
    $('#initial').slideDown(100, complete=function() {$(this).css('display', '')});
    var name = loadedFile['fp'].name
    loadedFile = {};
    if (Object.keys(loadedPKZ).length > 0) {
        $('#initial-content').scrollTo(`li[title="${name}"]`, 0, {"offset": {"top": -20}});
    }
}

function startQuestNew(event) {
    alert("Coming soon!")
}

async function questRepack() {
    console.log("Saving current quest changes...")
    renderTaskList(-1, true);
    var enc = new TextEncoder();
    var outputFiles = []
    var numFiles = loadedFile['fileOrder'].length;
    for (var i = 0; i < numFiles; i++) {
        if (Object.keys(loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']).length === 0) {
            // File is zero bytes
            outputFiles.push(new ArrayBuffer())
        } else if (loadedFile['fileOrder'][i].endsWith(".bxm")) {
            outputFiles.push(questBXMWriter(loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']))
        } else if (loadedFile['fileOrder'][i].endsWith(".csv")) {
            outputFiles.push(questCSVWriter(loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']))
        } else {
            console.warn("Unknown file type for quest repacking (ignoring file) - " + loadedFile['fileOrder'][i])
            outputFiles.push(new ArrayBuffer())
        }
    }
    var fileExtensions = []
    var fileExtensionsSize = 0
    var nameLength = 0
    var fileOffsets = []
    // ---
    var fileOffsetsOffset = 32
    var fileExtensionsOffset = Math.ceil((fileOffsetsOffset + (numFiles * 4))/4)*4
    for (var i = 0; i < numFiles; i++) {
        let subFile = loadedFile['fileOrder'][i]
        let extArray = subFile.split(".")
        let ext = extArray[extArray.length-1]
        if (subFile.length + 1 > nameLength) {
            nameLength = subFile.length+1
        }
        fileExtensionsSize += ext.length+1
        fileExtensions.push(ext)
    }
    var fileNamesOffset = Math.ceil((fileExtensionsOffset + fileExtensionsSize)/4)*4
    var fileSizesOffset = Math.ceil((fileNamesOffset + (numFiles * nameLength) + 4)/4)*4
    var hashMapOffset = fileSizesOffset + (numFiles * 4)
    var hashMapSize = loadedFile['hashMap'].byteLength;
    var pos = Math.ceil((hashMapOffset + hashMapSize)/16)*16
    for (var i = 0; i < numFiles; i++) {
        // file padding n stuff
        if (outputFiles[i].byteLength == 0) {
            fileOffsets.push(0)
        } else if (loadedFile['fileOrder'][i].endsWith('bnk')){
            pos = Math.ceil(pos/2048)*2048
            fileOffsets.push(pos)
        } else {
            fileOffsets.push(pos)
        }
        pos += outputFiles[i].byteLength;
        pos = Math.ceil(pos/16)*16
    }

    // big boys
    var outputArray = new Uint32Array([5521732, numFiles, fileOffsetsOffset, fileExtensionsOffset, fileNamesOffset, fileSizesOffset, hashMapOffset, 0])
    pos = 32
    for (var i = 0; i < numFiles; i++) {
        outputArray = concatenateToUint8(outputArray, Uint32Array.of(fileOffsets[i]));
        pos += 4;
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(fileExtensionsOffset - pos))
    pos = fileExtensionsOffset;
    for (var i = 0; i < numFiles; i++) {
        outputArray = concatenateToUint8(outputArray, enc.encode(fileExtensions[i].padEnd(4, "\x00")));
        pos += 4;
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(fileNamesOffset - pos))
    outputArray = concatenateToUint8(outputArray, Uint32Array.of(nameLength));
    pos = fileNamesOffset
    for (var i = 0; i < numFiles; i++) {
        if (i+1 < numFiles) {
            outputArray = concatenateToUint8(outputArray, enc.encode(loadedFile['fileOrder'][i].padEnd(nameLength, "\x00")));
        } else {
            outputArray = concatenateToUint8(outputArray, enc.encode(loadedFile['fileOrder'][i]));
        }
        pos = outputArray.length
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(fileSizesOffset - pos))
    pos = fileSizesOffset
    for (var i = 0; i < numFiles; i++) {
        outputArray = concatenateToUint8(outputArray, Uint32Array.of(loadedFile['files'][loadedFile['fileOrder'][i]]['size']));
        pos += 4;
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(hashMapOffset - pos))
    outputArray = concatenateToUint8(outputArray, new Uint8Array(loadedFile['hashMap']));
    pos += loadedFile['hashMap'].byteLength
    console.log("[DAT REPACKING] Writing DAT body...")
    for (var x = 0; x < numFiles; x++) {
        if (fileOffsets[x] == 0) {
            continue
        }
        outputArray = concatenateToUint8(outputArray, new Uint8Array(fileOffsets[x] - pos));
        pos = fileOffsets[x];
        outputArray = concatenateToUint8(outputArray, new Uint8Array(outputFiles[x]));
        pos = outputArray.byteLength;
        console.log(`[${x+1}/${numFiles}][${loadedFile['fileOrder'][x]}]`)
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(Math.ceil(pos/16)*16 - pos));
    var blob = new Blob([outputArray], {type: 'application/octet-stream'});
    console.log("DAT Export complete. :)")
    saveAs(blob, loadedFile['fp'].name)
    return;
}

function startQuestLoad(file) {
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
            var firstOffset = 0;
            for (var i = 0; i < header[1]; i++) {
                localFiles[names[i]] = {'offset': fileOffsetsTable[i], 'size': sizesTable[i], 'kind': 'extracted', 'raw': e.target.result.slice(fileOffsetsTable[i], fileOffsetsTable[i] + sizesTable[i])}; // kinds: "extracted" and "custom"
                // Sometimes the first offset is 0 (0-byte file), find the first real file
                if (!firstOffset && fileOffsetsTable[i]) {
                    firstOffset = fileOffsetsTable[i];
                }
                if (sizesTable[i] != 0) {
                    if (wholeFileExt.substr(i*4, 3) == "bxm") {
                        localFiles[names[i]]['extracted'] = QuestBXMLoader(localFiles[names[i]]['raw'])
                    } else if (wholeFileExt.substr(i*4, 3) == "csv") {
                        localFiles[names[i]]['extracted'] = QuestCSVLoader(localFiles[names[i]]['raw'])
                    }
                } else {
                    localFiles[names[i]]['extracted'] = {}
                }
            }
            const questId = file.name.substr(5, 4);
            loadedFile = {'fp': file, 'files': localFiles, 'fileOrder': names.slice(0, Object.keys(localFiles).length), 'hashMap': e.target.result.slice(header[6], firstOffset), 'id': questId}
            
            var area = questAreaLookup("q" + questId)
            if (area) {
                changeMap(`li#${area}`, area)
            }
            /*
            LOAD EM DATA
            */
            var emSets = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children']
            
            var emListOutput = "<ul id='emList' style='list-style: none; padding: 5px;'><li class='listheader'><span onclick='copyEmList(this, \"csv\")' class='listBtn'><span class='material-icons'>content_copy</span> CSV</span><span onclick='copyEmList(this, \"json\")' class='listBtn'><span class='material-icons'>content_copy</span> JSON</span></li>"
            for (var i = 0; i < emSets.length; i++) {
                var set = emSets[i]['children'];
                var setNo = emSets[i]['attributes']['number']
                emListOutput += `<li class="listheader" translate="yes"><span title="Add an item" translate="no" class="material-icons">add</span> ${emSets[i]['attributes']['name']}</li>`
                for (var ii = 0; ii < set.length; ii++) {
                    var id = parseInt(findItem(set[ii]['children'], 'Id')).toString(16);
                    const pos = findItem(set[ii]['children'], 'Trans').split(" ").map(item => parseFloat(item));
                    const pos2 = findItem(set[ii]['children'], 'TransL').split(" ").map(item => parseFloat(item));
                    const rot = findItem(set[ii]['children'], 'Rotation')
                    var name = questLookup(id)
                    if (id.startsWith("2") || id.startsWith("1")) {
                        $('#map').append(`<div class="marker" id="set-${i}-${ii}" oncontextmenu="showContextMenu(event, 'em', [${i}, ${ii}]); return false" onclick="showContextMenu(event, 'em', [${i}, ${ii}])" style="filter: hue-rotate(${i*45}deg); transform: translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom))) rotate(${rot}rad)"><img src="../assets/marker-3.png" height="30px"></div>`)
                        if (pos[0] != pos2[0] || pos[1] != pos2[1] && pos[2] != pos2[2]) {
                            $('#map').append(`<div class="marker" id="set-${i}-${ii}" oncontextmenu="showContextMenu(event, 'em', [${i}, ${ii}]); return false" onclick="showContextMenu(event, 'em', [${i}, ${ii}])" style="filter: hue-rotate(${i*45}deg); transform: translateX(calc(${pos2[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos2[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/marker-2b.png" height="30px"></div>`)
                        }
                        emListOutput += `<li id="set-${i}-${ii}" class="clickableLi" oncontextmenu="showContextMenu(event, 'em', [${i}, ${ii}]); return false" onclick="showContextMenu(event, 'em', [${i}, ${ii}])" style="filter: hue-rotate(${i*45}deg); color: #F25086">${setNo} <b>${name}</b></li>`
                    } else if (true||id.startsWith("ba")) {
                        $('#map').append(`<div class="marker" id="set-${i}-${ii}" oncontextmenu="showContextMenu(event, 'em', [${i}, ${ii}]); return false" onclick="showContextMenu(event, 'em', [${i}, ${ii}])" style="filter: hue-rotate(${i*45}deg); transform: translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom))) rotate(${rot}rad)"><img src="../assets/marker-1b.png" height="30px"></div>`)
                        if ((parseInt(id, 16) > 827391 && parseInt(id, 16) < 827396) || (parseInt(id, 16) > 827439 && parseInt(id, 16) < 827445)) {
                            const typ = findItem(set[ii]['children'], 'Type')
                            $(`div#set-${i}-${ii}`).css('--markerHeight', typ*4 + 'px')
                        }
                        if (pos[0] != pos2[0] || pos[1] != pos2[1] && pos[2] != pos2[2]) {
                            $('#map').append(`<div class="marker" id="set-${i}-${ii}" oncontextmenu="showContextMenu(event, 'em', [${i}, ${ii}]); return false" onclick="showContextMenu(event, ${i}, ${ii})" style="filter: hue-rotate(${i*45}deg); transform: translateX(calc(${pos2[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos2[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/marker-2b.png" height="30px"></div>`)
                        }
                        emListOutput += `<li id="set-${i}-${ii}" class="clickableLi" oncontextmenu="showContextMenu(event, 'em', [${i}, ${ii}]); return false" onclick="showContextMenu(event, ${i}, ${ii})" style="filter: hue-rotate(${i*45}deg); color: #F25086">${setNo} <b>${name}</b></li>`
                    }
                }
            }
            /*
            LOAD TASKS
            */
            var questData = loadedFile['files']['QuestData.bxm']['extracted']

            var taskListOutput = "<ul class='taskeditor' id='taskList' style='list-style: none; padding: 5px;'>"
            taskListOutput += `<li class="listheader"><span title="Add an item" class="material-icons">add</span> Task List<br><span class='li-subtext'>See nothing on the right? Try refreshing.</span></li>`
            const colors = ['#EF5184', '#C5C5C5', '#0000FF', '#808080', '#F7931E']
            for (var i = 0; i < questData['children'][1]['children'].length; i++) {
                const taskList = new questDataTaskList(questData['children'][1]['children'][i])
                var rightnav = ""
                if (taskList.TaskEnable) {
                    rightnav += `<span class="material-icons" onclick="updateTaskAttribute(this, ${i}, 'TaskEnable', '0')">update</span>`
                } else {
                    rightnav += `<span class="material-icons" onclick="updateTaskAttribute(this, ${i}, 'TaskEnable', '1')">update_disabled</span>`
                }
                if (taskList.WorkInAdvanced) {
                    rightnav += `<span class="material-icons" onclick="updateTaskAttribute(this, ${i}, 'WorkInAdvanced', '0')">check_circle</span>`
                } else {
                    rightnav += `<span class="material-icons" onclick="updateTaskAttribute(this, ${i}, 'WorkInAdvanced', '1')">cancel</span>`
                }
                taskListOutput += `<li class="clickableLi" onclick="renderTaskList(${i})" id="tl-${i}"><span style="color: ${colors[taskList.TaskColor]}">${i}</span> <b translate="yes">${taskList.TaskName}</b><span class="li-rightnav" title="Toggle if the task works in advance, and is enabled">${rightnav}</span><br><span class="li-subtext" translate="yes">${taskList.TemplateName}</span></li>`;
            }
            taskListOutput += `<li class="listheader"><span style="filter: opacity(0.5)" class="material-icons">add</span> Quest Flags<br><span class="li-subtext">Can't find a flag? It still exists, just has the default name (e.g. Flag05)</span></li>`
            questData['children'][3]['children'].map(function (item, index) {if (item['attributes']['QuestFlagName'].startsWith("Flag")) { return }; taskListOutput += `<li class="clickableLi" style="cursor: default">${index} <b translate="yes">${item['attributes']['QuestFlagName']}</b></li>`})
            taskListOutput += `<li class="listheader"><span style="filter: opacity(0.5)" class="material-icons">add</span> Save Flags<br><span class="li-subtext">Can't find a flag? It still exists, just has the default name (e.g. SaveFlag09)</span></li>`
            questData['children'][4]['children'].map(function (item, index) {if (item['attributes']['SaveFlagName'].startsWith("SaveFlag")) { return }; taskListOutput += `<li class="clickableLi" style="cursor: default">${index} <b translate="yes">${item['attributes']['SaveFlagName']}</b></li>`})
            /*
            LOAD EM AREAS
            */
            var areaListOutput = "<ul id='areaList' style='list-style: none; padding: 5px;'>"
            for (var i = 0; i < questData['children'][5]['children'].length; i++) {
                const areaGroup = questData['children'][5]['children'][i];
                var rightnav = ""
                if (areaGroup['attributes']['GroupDebugDisp'] == "1") {
                    rightnav += `<span class="material-icons" onclick="updateAreaGroupAttribute(this, ${i}, 'GroupDebugDisp', '0')">visibility</span>`
                } else {
                    rightnav += `<span class="material-icons" onclick="updateAreaGroupAttribute(this, ${i}, 'GroupDebugDisp', '1')">visibility_off</span>`
                }
                areaListOutput += `<li class="li-header" id="areagroup-${i}">${areaGroup['attributes']['GroupIndex']} <b translate="yes">${areaGroup['attributes']['GroupName']}</b><span class="li-rightnav" title="Toggle if debug display is enabled">${rightnav}</span></li>`;
                for (var ii = 0; ii < areaGroup['children'].length; ii++) {
                    rightnav = ""
                    if (findItem(areaGroup['children'][ii]['children'], 'DebugDisp') == "1") {
                        rightnav += `<span class="material-icons" onclick="updateAreaAttribute(this, ${i}, ${ii}, 'DebugDisp', '0')">visibility</span>`
                    } else {
                        rightnav += `<span class="material-icons" onclick="updateAreaAttribute(this, ${i}, ${ii}, 'DebugDisp', '1')">visibility_off</span>`
                    }
                    areaListOutput += `<li class="clickableLi" id="area-${i}">${findItem(areaGroup['children'][ii]['children'], 'AreaIndex')} <b>Area</b><span class="li-rightnav" title="Toggle if debug display is enabled">${rightnav}</span></li>`;
                }
            }
            /*
            LOAD TALKSCRIPTS
            */
            var talkScripts = loadedFile['files']['TalkScript_' + questId + '.bxm']['extracted'];
            var talkScriptSpeeches = loadedFile['files']['TalkScript_speech_' + questId + '.bxm']['extracted'];
            var talkScriptOutput = "<ul id='talkScriptList' style='list-style: none; padding: 5px;'>"
            talkScriptOutput += `<li class="listheader"><span title="Add an item" class="material-icons">add</span> TalkScripts</li>`
            if (Object.keys(talkScripts).length) {
                for (var i = 0; i < talkScripts['children'].length; i++) {
                    talkScriptOutput += `<li class="clickableLi" onclick="renderTaskList(${i})" id="ts-${i}">${i} <b>${findItem(talkScripts['children'][i]['children'], 'ObjId')}</b> ${findItem(talkScripts['children'][i]['children'], 'QuestId')}</li>`;
                }
            }
            talkScriptOutput += `<li class="listheader"><span title="Add an item" class="material-icons">add</span> Spoken TalkScripts</li>`
            if (Object.keys(talkScriptSpeeches).length) {
                for (var i = 0; i < talkScriptSpeeches['children'].length; i++) {
                    talkScriptOutput += `<li class="clickableLi" onclick="showContextMenu(event, [${i}])" id="ts-${i}">${i} <b>${findItem(talkScriptSpeeches['children'][i]['children'], 'ObjId')}</b> ${findItem(talkScriptSpeeches['children'][i]['children'], 'QuestId')}</li>`;
                }
            }
            $("#sidebar-header").prepend(`<h1 style='padding-left: 10px'>${lookup(file.name).replace(".dat", "")} <span style="font-size: 16px; font-weight: 700; vertical-align: baseline">${file.name}</span></h1>`).slideDown(100, complete=function() {$(this).css('display', 'flex')})
            $("#sidebar-contentHeader").css('display', 'grid').hide().slideDown(100);
            $('#repack').slideDown(100)
            $("#sidebar-content").hide().append([emListOutput, taskListOutput, areaListOutput, talkScriptOutput].join("</ul>") + "</ul>").slideDown(100)
            
            renderTaskList(0, false);
            sidebarDisplay(editorSettings['activeTab'])
            resolve();
            }
        }
        reader.readAsArrayBuffer(file) // read whole file
    })
}

function copyEmList(elem, copyType) {
    if (copyType == 'csv') {
        var outcsv = `${loadedFile['fp'].name},${lookup(loadedFile['fp'].name)}`
        const emSets = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children']
        for (var i = 0; i < emSets.length; i++) {
            var set = emSets[i]['children'];
            var setNo = emSets[i]['attributes']['number']
            var emList = []
            for (var ii = 0; ii < set.length; ii++) {
                emList.push(questLookup(parseInt(findItem(set[ii]['children'], 'Id')).toString(16)));
            }
            outcsv += `\n${setNo},${emSets[i]['attributes']['name']},${emList.join(",")},`
        }
        navigator.clipboard.writeText(outcsv)
    } else {
        var outjson = {"name": lookup(loadedFile['fp'].name), "enemySets": {}}
        const emSets = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children']
        for (var i = 0; i < emSets.length; i++) {
            var set = emSets[i]['children'];
            var setNo = emSets[i]['attributes']['number']
            var emList = []
            outjson['enemySets'][emSets[i]['attributes']['name']] = {"setNo": setNo, "em": []}
            for (var ii = 0; ii < set.length; ii++) {
                outjson['enemySets'][emSets[i]['attributes']['name']]['em'].push(questLookup(parseInt(findItem(set[ii]['children'], 'Id')).toString(16)));
            }
        }
        navigator.clipboard.writeText(JSON.stringify(outjson))
    }
    $(elem).css('background-color', '#57F287')
    setTimeout(function(){ $(elem).css('background-color', '') }, 200);
    /*var text = $(elem).contents().get(0).nodeValue
    $(elem).contents().get(0).nodeValue = "COPIED!"
    setTimeout(function(){ $(elem).contents().get(0).nodeValue = text }, 1000);*/
}

function findItem(arr, name, returnIndex=false, multiple=false) {
    var returning = [];
    for (var i = 0; i < arr.length; i++) {
        if (arr[i]['name'] == name) {
            if (returnIndex) {
                returning.push(i);
            } else {
                returning.push(arr[i]['value']);
            }
        }
    }
    if (multiple) {
        return returning;
    } else {
        return returning[0];
    }
}

function updateEmAttribute(name, elem) {
    // find indexes of name (there might be more than one, e.g. Id)
    var indexes = findItem(loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'][selectedItem['SetNo']]['children'], name, true, true);
    var val = $(elem).val()
    if (name == "Id" && editorSettings['useBasicEditor']) {
        // "em00a0" => "200a0"
        val = questUnlookup(val)
    }
    for (var i = 0; i < indexes.length; i++) {
        loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'][selectedItem['SetNo']]['children'][indexes[i]]['value'] = val;
    }
    var selected = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'][selectedItem['SetNo']]['children']
    $(`li#set-${selectedItem['emSetNo']}-${selectedItem['SetNo']}`).find('b').html(questLookup(findItem(selected, 'Id')));
    // reset position and rotation of marker
    if (['Trans', 'Rotation'].includes(name)) {
        var pos = findItem(selected, 'Trans').split(" ")
        var rot = findItem(selected, 'Rotation')
        $(`div#set-${selectedItem['emSetNo']}-${selectedItem['SetNo']}`).css('transform', `translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom))) rotate(${rot}rad)`)
    }
    showContextMenu(elem, [selectedItem['emSetNo'], selectedItem['SetNo']], true)
}
function updateTaskAttribute(elem, elemId, name, value) {
    var index = findItem(loadedFile['files']['QuestData.bxm']['extracted']['children'][1]['children'][elemId]['children'], name, true);
    loadedFile['files']['QuestData.bxm']['extracted']['children'][1]['children'][elemId]['children'][index]['value'] = value;
    var out = `<span class="material-icons" onclick='updateTaskAttribute(this, ${elemId}, "${name}", "${[1,0][parseInt(value)]}")'>`
    if (name == "TaskEnable") {
        if (value == "1") {
            out += "update"
        } else {
            out += "update_disabled"
        }
    } else if (name == "WorkInAdvanced") {
        if (value == "1") {
            out += "check_circle"
        } else {
            out += "cancel"
        }
    }
    $(elem).replaceWith(out + "</span>")
}
function updateAreaGroupAttribute(elem, elemId, name, value) {
    loadedFile['files']['QuestData.bxm']['extracted']['children'][5]['children'][elemId]['attributes'][name] = value;
    var out = `<span class="material-icons" onclick='updateAreaGroupAttribute(this, ${elemId}, "${name}", "${[1,0][parseInt(value)]}")'>`
    if (name == "GroupDebugDisp") {
        if (value == "1") {
            out += "visibility"
        } else {
            out += "visibility_off"
        }
    }
    $(elem).replaceWith(out + "</span>")
}
function updateAreaAttribute(elem, elemId, elemIdId, name, value) {
    var index = findItem(loadedFile['files']['QuestData.bxm']['extracted']['children'][5]['children'][elemId]['children'][elemIdId]['children'], name, true);
    loadedFile['files']['QuestData.bxm']['extracted']['children'][5]['children'][elemId]['children'][elemIdId]['children'][index]['value'] = value;
    var out = `<span class="material-icons" onclick='updateAreaAttribute(this, ${elemId}, ${elemIdId}, "${name}", "${[1,0][parseInt(value)]}")'>`
    if (name == "DebugDisp") {
        if (value == "1") {
            out += "visibility"
        } else {
            out += "visibility_off"
        }
    }
    $(elem).replaceWith(out + "</span>")
}
function showContextMenu(event, menuType, args, update=false) {
    if (menuType == "em") {
        var [emSetNo, SetNo] = args;
        var em = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][emSetNo]['children'][SetNo]
        var emid = parseInt(findItem(em['children'], 'Id')).toString(16)
        if (event.pageX > 300) {
            // Don't scroll the sidebar if selecting from it
            $('#sidebar-content').scrollTo(`li#set-${emSetNo}-${SetNo}`, 100, {"offset": {"top": -50}});
        }
        if (!update) {
            event.preventDefault();
        }
        selectedItem = {"emSetNo": emSetNo, "SetNo": SetNo, "em": em}
        $('.marker-selected').attr('class', 'marker');
        $('#emList').find('.li-selected').attr('class', 'clickableLi');
        $(`div#set-${selectedItem['emSetNo']}-${selectedItem['SetNo']}`).attr('class', 'marker-selected');
        $(`li#set-${selectedItem['emSetNo']}-${selectedItem['SetNo']}`).attr('class', 'li-selected');
        $('.emSearch').val(questLookup(emid, returnId=true)).select2()

        $('#rightClickMenuHeader').text(questLookup(emid)); // Updated with select2
        if (event.which === 3) {
            $('#rightClickMenu').css({"top": event.pageY, "left": Math.max(event.pageX, 310)}).show(100);
        } else {
            // Advanced
            var cmattrs = "<table id='contextMenuAttrs'>"
            for (var i = 0; i < em['children'].length; i++) {
                cmattrs += `<tr><th class='tablekey'>${em['children'][i]['name']}</th><th class='tablevalue'><input onchange="updateEmAttribute('${em['children'][i]['name']}', this)" type="text" size="32" value="${em['children'][i]['value']}"></th></tr>`
            }
            // Basic
            //
            if (emid.startsWith("2")) {
                $('#contextMenu').find('#contextMenuImg').attr('src', 'https://www.nintendo.co.jp/switch/ab48a/assets/images/legion/detail/item/01/chara.png').css('top', event.pageY-40)
                $('#contextMenu').find('#contextMenuThumb').css('background-color', 'var(--secondary-color)')
            } else {
                $('#contextMenu').find('#contextMenuImg').attr('src', 'https://www.nintendo.co.jp/switch/ab48a/assets/images/legion/detail/item/05/chara.png').css('top', event.pageY-40)
                $('#contextMenu').find('#contextMenuThumb').css('background-color', 'var(--primary-color)')
            }
            $('#contextMenu').find('#contextMenuAttrs').replaceWith(cmattrs + "</table>")
            if (editorSettings['useBasicEditor']) {
                $('#contextMenuAttrs').hide()
                $('#contextMenuBasicAttrs').show()
            } else {
                $('#contextMenuAttrs').show()
                $('#contextMenuBasicAttrs').hide()
            }
            $('#contextMenu').find('#contextMenuBody').css('max-height', window.innerHeight - (event.pageY + 120))
            $('#contextMenu').find('#emName').replaceWith(`<h1 id="emName">${questLookup(emid)} <span id='emSubtext'>${emid}</span></h1>`);
            if (!update) {
                $('#contextMenu').css({"top": event.pageY, "left": Math.max(event.pageX, 310)}).show(100)
            }
        }
    }
}

const showhide = {
    "emsets": ['active', 'block', 'inactive', 'none', 'inactive', 'none', 'inactive', 'none'],
    "tasks": ['inactive', 'none', 'active', 'block', 'inactive', 'none', 'inactive', 'none'],
    "talkscripts": ['inactive', 'none', 'inactive', 'none', 'inactive', 'none', 'active', 'block'],
    "areas": ['inactive', 'none', 'inactive', 'none', 'active', 'block', 'inactive', 'none']
}

function sidebarDisplay(mode) {
    let tabDisplay = showhide[mode];
    $('#sidebar-contentHeader-emSets').attr('class', tabDisplay[0]);
    if (tabDisplay[1] == "block") {
        $('#emList').slideDown(100, function() {$('#emList').css('display', tabDisplay[1])});
    } else if ($('#emList').css('display') != "none") {
        $('#emList').slideUp(100, function() {$('#emList').css('display', tabDisplay[1])});
    }
    $('#sidebar-contentHeader-tasks').attr('class', tabDisplay[2]);
    if (tabDisplay[3] == "block") {
        $('.taskeditor').slideDown(100, function() {$('.taskeditor').css('display', tabDisplay[3])});
    } else if ($('.taskeditor').css('display') != "none") {
        $('.taskeditor').slideUp(100, function() {$('.taskeditor').css('display', tabDisplay[3])});
    }
    $('#sidebar-contentHeader-areas').attr('class', tabDisplay[4]);
    if (tabDisplay[5] == "block") {
        $('#areaList').slideDown(100, function() {$('#areaList').css('display', tabDisplay[5])});
    } else if ($('#areaList').css('display') != "none") {
        $('#areaList').slideUp(100, function() {$('#areaList').css('display', tabDisplay[5])});
    }
    $('#sidebar-contentHeader-talkScripts').attr('class', tabDisplay[6]);
    if (tabDisplay[7] == "block") {
        $('#talkScriptList').slideDown(100, function() {$('#talkScriptList').css('display', tabDisplay[7])});
    } else if ($('#talkScriptList').css('display') != "none") {
        $('#talkScriptList').slideUp(100, function() {$('#talkScriptList').css('display', tabDisplay[7])});
    }
    editorSettings['activeTab'] = mode;
}

function contextMenuDisplay(difficulty) {
    if (difficulty == "basic") {
        $('#contextMenuBasicAttrs').show(100, function() {$('#contextMenuBasicAttrs').css('display', 'block')});
        $('#contextMenuAttrs').hide(100, function() {$('#contextMenuAttrs').css('display', 'none')});
        $('#contextMenuBasic').attr('class', 'active');
        $('#contextMenuAdvanced').attr('class', 'inactive');
        editorSettings['useBasicEditor'] = true;
    } else {
        $('#contextMenuBasicAttrs').hide(100, function() {$('#contextMenuBasicAttrs').css('display', 'none')});
        $('#contextMenuAttrs').show(100, function() {$('#contextMenuAttrs').css('display', 'block')});
        $('#contextMenuBasic').attr('class', 'inactive')
        $('#contextMenuAdvanced').attr('class', 'active')
        editorSettings['useBasicEditor'] = false;
    }
}

function mutateMap(operation, args="") {
    if (operation == "delete") {
        loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'].splice(selectedItem['SetNo'], 1);
        $(`div#set-${selectedItem['emSetNo']}-${selectedItem['SetNo']}`).remove()
        $(`li#set-${selectedItem['emSetNo']}-${selectedItem['SetNo']}`).remove()
    }
    loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'][selectedItem['SetNo']]

    $("#rightClickMenu").hide(100);
}

$(document).bind("mousedown", function (e) {
    // If clicked outside the active menu, hide it
    if (!$(e.target).parents("#contextMenu").length > 0) {
        $("#contextMenu").hide(100);
    }
    if (!$(e.target).parents("#rightClickMenu").length > 0) {
        $("#rightClickMenu").hide(100);
    }
    if (!$(e.target).parents("#contextMenu").length > 0 && !$(e.target).parents("#rightClickMenu").length > 0) {
        $('.marker-selected').attr('class', 'marker');
        $('#emList').find('.li-selected').attr('class', 'clickableLi');
    }
});

// MAP FUNCTIONALITY
function mapDrag(e){
    if (editorSettings['activeTab'] == "tasks" && Object.keys(loadedFile).length) {
        return
    }
    e.preventDefault()
    mapPos['pos'][0] = e.pageX;
    mapPos['pos'][1] = e.pageY;
    mapPos['elem'] = "#map";
    mapPos['offset0'] = $("#map").offset();
    function handle_dragging(e){
        var left = mapPos['offset0']['left'] + (e.pageX - mapPos['pos'][0]);
        var top = mapPos['offset0']['top'] + (e.pageY - mapPos['pos'][1]);
        $(mapPos.elem).offset({top: top, left: left});
    }
    function handle_mouseup(e){
        $('body')
        .off('mousemove', handle_dragging)
        .off('mouseup', handle_mouseup);
    }
    $('body')
    .on('mouseup', handle_mouseup)
    .on('mousemove', handle_dragging);
}
function updateMouseTracker(e) {
    // calc(${pos[0] * 4 + "px"} * var(--mapZoom))
    var zoom = parseFloat(getComputedStyle(document.body).getPropertyValue('--mapZoom'))
    var offset = $(mapPos.elem).offset()
    if (!offset) { return }
    $('#posz').text(Math.round((e.pageX - parseInt(offset['left'])) / (-4 / zoom)))
    $('#posx').text(Math.round((e.pageY - parseInt(offset['top'])) / (4 / zoom)))
}
var selectableLookups = [em, pl, ba, bg];
for (var i = 0; i < selectableLookups.length; i++) {
    for (const [key, value] of Object.entries(selectableLookups[i])) {
        if (key.endsWith("ff") || value.startsWith("<")) { continue };
        $('.emSearch').append(`<option value="${key}">${value}</option>`)
    }
}
// Task Editor hotkeys
function keyEventHandler(e) {
    if (Object.keys(loadedFile).length && editorSettings['activeTab'] == "tasks") {
        e = e || window.event;
        var taskListId = parseInt($('#taskList').find('.li-selected').attr('id').split("-")[1]);
        if (e.keyCode == '38' || e.keyCode == '87') {
            // up
            taskListId -= 1;
            if (!$('#taskList').find('#tl-' + taskListId).length) { return };
            renderTaskList(taskListId);
        }
        else if (e.keyCode == '40' || e.keyCode == '83') {
            // down
            taskListId += 1;
            if (!$('#taskList').find('#tl-' + taskListId).length) { return };
            renderTaskList(taskListId);
        }
        $('#sidebar-content').scrollTo(`li#tl-${taskListId}`, 50, {"offset": {"top": -20}});
        /*else if (e.keyCode == '37' || e.keyCode == '65') {
            // left
        }
        else if (e.keyCode == '39' || e.keyCode == '68') {
            // right
        }*/
    }
}

document.onkeydown = keyEventHandler;


$(document).ready(function() {
    // generate EM id dialogue
    $('#map').mousedown(mapDrag).mousemove(updateMouseTracker);
    $('#mapcontainer').mousedown(mapDrag).mousemove(updateMouseTracker);
})