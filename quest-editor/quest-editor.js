// Quest Creator scripts.

var editorSettings = {
    "useBasicEditor": true
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
const imageSizes = {
    "r100": 6000,
    "r200": 4000,
    "r240": 2000,
    "r300": 4000,
    "r400": 4000,
    "r500": 4000,
    "r600": 10000,
    "r800": 2000,
    "r840": 2000,
    "r900": 2000,
    "r910": 2000,
    "rb01": 2000,
}


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

function loadFiles(files) {
    $("#initial").css("display", "none")
    startQuestLoad(files[0])
}

function changeMap(elem, newMapId) {
    $('#map-main').attr({'src': '../assets/' + newMapId + '.png', 'currentmap': newMapId}).attr('height', imageSizes[newMapId]);
    // for some reason using css('background-image') doesn't work??
    document.documentElement.style.setProperty('--mapSize', imageSizes[newMapId] + "px");
    $('#mainselector').attr('style', `background-image: url('../assets/${newMapId}-thumb.png')`).text($(elem).text())
    $('#selector-dropdown').toggle(100);
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
    $('#sidebar-content').replaceWith('<div id="sidebar-content"></div>');
    $('#sidebar-header').css('display', 'none').children('h1').remove();
    $('#initial').css('display', '')
}

function startQuestNew(event) {
    alert("Coming soon!")
}

async function questRepack() {
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
            var emSets = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children']
            
            var output = "<ul id='emList' style='list-style: none'>"
            for (var i = 0; i < emSets.length; i++) {
                var set = emSets[i]['children'];
                for (var ii = 0; ii < set.length; ii++) {
                    var id = parseInt(findItem(set[ii]['children'], 'Id')).toString(16);
                    var pos = findItem(set[ii]['children'], 'Trans').split(" ").map(item => parseFloat(item));
                    var name = questLookup(id)
                    console.log(i, id, name, pos)
                    if (id.startsWith("2")) {
                        $('#map').append(`<div class="marker" id="set-${i}-${ii}" oncontextmenu="showContextMenu(event, ${i}, ${ii}); return false" onclick="showContextMenu(event, ${i}, ${ii})" style="filter: hue-rotate(${i*45}deg); transform: translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/marker-3.png" height="30px"></div>`)
                        output += `<li id="set-${i}-${ii}" style="filter: hue-rotate(${i*45}deg); color: var(--accent-color)">${i} <b>${name}<b></li>`
                    } else if (true||id.startsWith("ba")) {
                        $('#map').append(`<div class="marker" id="set-${i}-${ii}" oncontextmenu="showContextMenu(event, ${i}, ${ii}); return false" onclick="showContextMenu(event, ${i}, ${ii})" style="filter: hue-rotate(${i*45}deg); transform: translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/marker-1.png" height="30px"></div>`)
                        output += `<li id="set-${i}-${ii}" style="filter: hue-rotate(${i*45 + 290}deg); color: var(--accent-color)">${i} <b>${name}<b></li>`
                    }
                }
            }
            $("#sidebar-header").css('display', 'flex').prepend(`<h1 style='padding-left: 10px'>${lookup(file.name).replace(".dat", "")} <span style="font-size: 16px; font-weight: 700; vertical-align: baseline">${file.name}</span></h1>`)
            $("#sidebar-content").append(output + "</ul>")
            resolve();
            }
        }
        reader.readAsArrayBuffer(file) // read whole file
    })
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
    var indexes = findItem(loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'][selectedItem['SetNo']]['children'], name, true, true);
    var val = $(elem).val()
    if (name == "Id" && editorSettings['useBasicEditor']) {
        val = questUnlookup(val)
    }
    for (var i = 0; i < indexes.length; i++) {
        loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][selectedItem['emSetNo']]['children'][selectedItem['SetNo']]['children'][indexes[i]]['value'] = val;
    }
    showContextMenu(elem, selectedItem['emSetNo'], selectedItem['SetNo'], true)
}
function showContextMenu(event, emSetNo, SetNo, update=false) {
    var em = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children'][emSetNo]['children'][SetNo]
    var emid = parseInt(findItem(em['children'], 'Id')).toString(16)
    if (!update) {
        event.preventDefault();
    }
    selectedItem = {"emSetNo": emSetNo, "SetNo": SetNo, "em": em}
    if (event.which === 3) {
        $('#rightClickMenuHeader').text(questLookup(emid));
        $('#rightClickMenu').css({"top": event.pageY, "left": event.pageX}).show(100);
    } else {
        // Advanced
        var cmattrs = "<table id='contextMenuAttrs'>"
        for (var i = 0; i < em['children'].length; i++) {
            cmattrs += `<tr><th class='tablekey'>${em['children'][i]['name']}</th><th class='tablevalue'><input onchange="updateEmAttribute('${em['children'][i]['name']}', this)" type="text" size="32" value="${em['children'][i]['value']}"></th></tr>`
        }
        // Basic
        $('.emSearch').val(questLookup(emid, returnId=true)).select2();
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
            $('#contextMenu').css({"top": event.pageY, "left": event.pageX}).show(100)
        }
    }
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

var loadedFile = {};

$(document).bind("mousedown", function (e) {
    // If the clicked element is not the menu
    if (!$(e.target).parents("#contextMenu").length > 0) {
        
        // Hide it
        $("#contextMenu").hide(100);
    }
    if (!$(e.target).parents("#rightClickMenu").length > 0) {
        
        // Hide it
        $("#rightClickMenu").hide(100);
    }
});

// MAP FUNCTIONALITY
function mapDrag(e){
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
$(document).ready(function() {
    // generate EM id dialogue
    $('#map').mousedown(mapDrag).mousemove(updateMouseTracker);
    $('#mapcontainer').mousedown(mapDrag).mousemove(updateMouseTracker);
})