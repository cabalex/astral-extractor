// Quest Creator scripts.

const defaultEm = "{\"name\":\"SetInfo\",\"value\":\"\",\"attributes\":{},\"children\":[{\"name\":\"SetNo\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"Id\",\"value\":\"131120\",\"attributes\":{},\"children\":[]},{\"name\":\"Id\",\"value\":\"131120\",\"attributes\":{},\"children\":[]},{\"name\":\"BaseRot\",\"value\":\"0.000000 -0.000000 0.000000 1.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"BaseRotL\",\"value\":\"0.000000 0.000000 0.000000 0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"Trans\",\"value\":\"0.000000 0.000000 0.000000 0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"TransL\",\"value\":\"0.000000 0.000000 0.000000 0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"Rotation\",\"value\":\"0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"SetType\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"Type\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"SetRtn\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"SetFlag\",\"value\":\"1073741824\",\"attributes\":{},\"children\":[]},{\"name\":\"PathNo\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"EscapeNo\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"TmpPos\",\"value\":\"0.000000 0.000000 0.000000 0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetTypeA\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetTypeB\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetTypeC\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetTypeD\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetAttr\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetRtn\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ExSetFlag\",\"value\":\"1073741824\",\"attributes\":{},\"children\":[]},{\"name\":\"NoticeNo\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"SetWait\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"LvMin\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"LvMax\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ParentId\",\"value\":\"4294967295\",\"attributes\":{},\"children\":[]},{\"name\":\"PartsNo\",\"value\":\"-1\",\"attributes\":{},\"children\":[]},{\"name\":\"HashNo\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"ItemId\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"SetTimer\",\"value\":\"0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"SetCounter\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"SetRadius\",\"value\":\"0.000000\",\"attributes\":{},\"children\":[]},{\"name\":\"GroupPos\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"GridDisp\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"EventSuspend\",\"value\":\"0\",\"attributes\":{},\"children\":[]},{\"name\":\"SimpleSubspaceSuspend\",\"value\":\"0\",\"attributes\":{},\"children\":[]}]}"
const defaultArea = '{"name":"WorkList","value":"","children":[{"name":"AreaIndex","value":0,"children":[],"attributes":{}},{"name":"AreaType","value":"1","children":[],"attributes":{}},{"name":"Center","value":"0.000000 0.000000 0.000000 1000.000000","children":[],"attributes":{}},{"name":"Pos1","value":"-10.000000 0.000000 10.000000 1000.000000","children":[],"attributes":{}},{"name":"Pos2","value":"-10.000000 0.000000 -10.000000 1000.000000","children":[],"attributes":{}},{"name":"Pos3","value":"10.000000 0.000000 -10.000000 1000.000000","children":[],"attributes":{}},{"name":"Pos4","value":"10.000000 0.000000 10.000000 1000.000000","children":[],"attributes":{}},{"name":"Height","value":"11.000000","children":[],"attributes":{}},{"name":"DebugDisp","value":"0","children":[],"attributes":{}}],"attributes":{}}'

// clipboard used for copying within the editor - don't really wanna use user clipboard
var localClipboard = defaultEm;

var editorSettings = {
    "contextMenuDisplayMode": "basic",
    "activeTab": "emsets"
}


var mapPos = {
    "pos": [],
    "offset0": {}
}
var currentSelection = {
    "obj": null,
    "elem": this
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

var emSets = [];
var areaGroups = [];

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
        $("#initial").css("display", "none");
        startQuestLoad(files[0])
    } else if (files[0].name.endsWith(".pkz")) {
        $('#pkzSelectorArea').replaceWith('<ul id="pkzSelectorArea"></ul>')
        loadedPKZ = await loadInitialPKZ("pkz", files[0], false, true);
        for (var i = 0; i < loadedPKZ['fileOrder'].length; i++) {
            $('#pkzSelectorArea').append(`<li class='clickableLi' title='${loadedPKZ['fileOrder'][i]}' oncontextmenu="showContextMenu(event, 'dat', [\'${loadedPKZ['fileOrder'][i]}\'])" onclick='exportToQuestDAT(this, "${loadedPKZ['fileOrder'][i]}")'>${loadedPKZ['fileOrder'][i].replace("quest", "").replace(".dat", "")} <b>${lookup(loadedPKZ['fileOrder'][i])}</b></li>`)
        }
        $("#initial-content").slideDown(100);
    } else {
        alert("We don't support that file type! Currently, we only support Quest .DATs and the main quest .PKZ.")
    }
}

function exportToQuestDAT(elem, subFile, download=false) {
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
                if (download) {
                    // DL the file
                    saveAs(blob, subFile);
                } else {
                    // load it
                    $("#initial").slideUp(100, complete=function() {$("#initial").css("display", "none")});
                    await startQuestLoad(blob);
                }
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
    // have to redraw all the svg areas :/
    areaGroups.forEach((item) => {item.display()});
}

function deleteFile() {
    $('.marker').remove()
    $('#sidebar-content').slideUp(100, complete=function() {$(this).replaceWith('<div id="sidebar-content"></div>')});
    $('#sidebar-header').slideUp(100, complete=function() {$(this).css('display', 'none').children('h1').remove()});
    $('#sidebar-contentHeader').slideUp(100);
    $("#contextMenu").hide(100);
    $("#rightClickMenu").hide(100);
    $('#repack').slideUp(100);
    $('#taskeditor').slideUp(100);
    $('#initial').slideDown(100, complete=function() {$(this).css('display', '')});
    var name = loadedFile['fp'].name
    loadedFile = {};
    emSets = [];
    areaGroups = [];
    if (Object.keys(loadedPKZ).length > 0) {
        $('#initial-content').scrollTo(`li[title="${name}"]`, 0, {"offset": {"top": -20}});
    }
}

function startQuestNew(event) {
    $("#initial").css("display", "none");
    let defaultQuest = {
        "fp":{
            'name': 'New Quest.dat'
        },
        "files":{
            "SignboardData.bxm":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "ReliefSupplies.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "ResultData.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "ExData.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "TalkFlag_0c0f.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "TalkCondition_0c0f.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "TalkData_0c0f.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "SubtitleInfo_0c0f.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "SpeechBalloon_0c0f.csv":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "TalkScript_0c0f.bxm":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "TalkScript_speech_0c0f.bxm":{
                "offset":0,
                "size":0,
                "kind":"extracted",
                "raw":{},
                "extracted":{}
            },
            "EnemySet.bxm":{
                "offset":704,
                "size":1123,
                "kind":"extracted",
                "raw":{},
                "extracted":{"name":"EmSetRoot","value":"","attributes":{},"children":[{"name":"EmSetList","value":"","attributes":{},"children":[]},{"name":"GroupPosList","value":"","attributes":{},"children":[{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]},{"name":"GroupList","value":"","attributes":{},"children":[]}]}]}
            },
            "BezierData.bxm":{
                "offset":1840,
                "size":35,
                "kind":"extracted","raw":{},"extracted":{"name":"BEZEIR","value":"","attributes":{},"children":[]}},
                "QuestData.bxm":{
                    "offset":1888,
                    "size":3865,
                    "kind":"extracted",
                    "raw":{},
                "extracted":{"name":"QuestRoot","value":"","attributes":{},"children":[{"name":"Version","value":"16","attributes":{},"children":[]},{"name":"QuestData","value":"","attributes":{},"children":[{"name":"TaskList","value":"","attributes":{"TaskName":"タスク1","TemplateName":""},"children":[{"name":"TaskEnable","value":"1","attributes":{},"children":[]},{"name":"TaskColor","value":"0","attributes":{},"children":[]},{"name":"LineListTree","value":"","attributes":{},"children":[{"name":"LineList","value":"","attributes":{},"children":[{"name":"CommandList","value":"","attributes":{},"children":[{"name":"typeIF","value":"0","attributes":{},"children":[]},{"name":"typeEXEC","value":"0","attributes":{},"children":[]}]}]}]}]}]},{"name":"QuestSub","value":"","attributes":{"SetMainScenarioValueStr":"case1_100"},"children":[{"name":"MinLevel","value":"1","attributes":{},"children":[]},{"name":"MaxLevel","value":"1","attributes":{},"children":[]},{"name":"bSetPlStartPos","value":"1","attributes":{},"children":[]},{"name":"PlStartPos","value":"1.000000 0.000000 0.000000 0.000000","attributes":{},"children":[]},{"name":"PlStartRotY","value":"0.000000","attributes":{},"children":[]},{"name":"bSetMainScenario","value":"0","attributes":{},"children":[]}]},{"name":"QuestFlagNameList","value":"","attributes":{},"children":[{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag00"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag01"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag02"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag03"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag04"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag05"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag06"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag07"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag08"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag09"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag10"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag11"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag12"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag13"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag14"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag15"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag16"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag17"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag18"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag19"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag20"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag21"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag22"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag23"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag24"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag25"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag26"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag27"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag28"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag29"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag30"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag31"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag32"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag33"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag34"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag35"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag36"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag37"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag38"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag39"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag40"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag41"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag42"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag43"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag44"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag45"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag46"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag47"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag48"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag49"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag50"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag51"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag52"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag53"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag54"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag55"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag56"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag57"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag58"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag59"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag60"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag61"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag62"},"children":[]},{"name":"Name","value":"","attributes":{"QuestFlagName":"Flag63"},"children":[]}]},{"name":"SaveFlagNameList","value":"","attributes":{},"children":[{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag00"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag01"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag02"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag03"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag04"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag05"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag06"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag07"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag08"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag09"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag10"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag11"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag12"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag13"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag14"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag15"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag16"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag17"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag18"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag19"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag20"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag21"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag22"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag23"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag24"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag25"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag26"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag27"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag28"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag29"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag30"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag31"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag32"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag33"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag34"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag35"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag36"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag37"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag38"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag39"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag40"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag41"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag42"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag43"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag44"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag45"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag46"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag47"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag48"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag49"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag50"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag51"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag52"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag53"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag54"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag55"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag56"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag57"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag58"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag59"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag60"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag61"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag62"},"children":[]},{"name":"Name","value":"","attributes":{"SaveFlagName":"SaveFlag63"},"children":[]}]},{"name":"AreaList","value":"","attributes":{},"children":[]}]}}},"fileOrder":["SignboardData.bxm","ReliefSupplies.csv","ResultData.csv","ExData.csv","TalkFlag_0c0f.csv","TalkCondition_0c0f.csv","TalkData_0c0f.csv","SubtitleInfo_0c0f.csv","SpeechBalloon_0c0f.csv","TalkScript_0c0f.bxm","TalkScript_speech_0c0f.bxm","EnemySet.bxm","BezierData.bxm","QuestData.bxm"],"hashMap":{},"id":"0c0f"}
    loadedFile = defaultQuest;
    startQuestLoad();
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
            
            switch(loadedFile['fileOrder'][i]) {
                // Allow for expansion
                case "EnemySet.bxm":
                    loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']['children'][0]['children'] = [];
                    for (var ii = 0; ii < emSets.length; ii++) {
                        loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']['children'][0]['children'].push(emSets[ii].export());
                    }
                    break;
                case "QuestData.bxm":
                    loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']['children'][5]['children'] = [];
                    for (var ii = 0; ii < areaGroups.length; ii++) {
                        loadedFile['files'][loadedFile['fileOrder'][i]]['extracted']['children'][5]['children'].push(areaGroups[ii].export());
                    }
                    break;
            }
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

function startQuestLoad(file=null) {
    return new Promise((resolve, reject) => {
        var header = null;
        var hashes = null;
        var localFiles = {};
        var names = [];
        var reader = new FileReader();

        const loadEnd = async function(e) {
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
                emSets = [];
                loadedFile = {'fp': file, 'files': localFiles, 'fileOrder': names.slice(0, Object.keys(localFiles).length), 'hashMap': e.target.result.slice(header[6], firstOffset), 'id': questId}
                await afterFileLoad();
            }
        }
        const afterFileLoad = async function() {
            const questId = loadedFile['id'];
            file = file || loadedFile['fp'];
            var area = questAreaLookup("q" + questId)
            if (area) {
                changeMap(`li#${area}`, area)
            }
            $('#rightClickMenu').hide() // hide it if it was shown in pkz
            /*
            LOAD EM DATA
            */
            var rawEmSets = loadedFile['files']['EnemySet.bxm']['extracted']['children'][0]['children']
            
            var emListOutput = "<ul id='emList' style='list-style: none; padding: 5px;'><li class='listheader'><span onclick='copyEmList(this, \"csv\")' class='listBtn'><span class='material-icons'>content_copy</span> CSV</span><span onclick='copyEmList(this, \"json\")' class='listBtn'><span class='material-icons'>content_copy</span> JSON</span><span onclick='addEmSet()' class='listBtn'><span class='material-icons'>add</span></span></li>"
            
            for (var i = 0; i < rawEmSets.length; i++) {
                const emSetObj = new EmSet(rawEmSets[i], i);
                emListOutput += emSetObj.display();
                emSets.push(emSetObj);
            }

            /*
            LOAD TASKS
            */
           // WAAAY too lazy to convert to a better format at the moment; will do that soon.
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
                const areaGroupObj = new AreaGroup(questData['children'][5]['children'][i], i);
                areaListOutput += areaGroupObj.display();
                areaGroups.push(areaGroupObj);
            }
            loadReferences();
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
        if (!file) {
            afterFileLoad();
        } else {
            reader.onloadend = loadEnd;
            reader.readAsArrayBuffer(file) // read whole file
        }
    })
}

function copyEmList(elem, copyType) {
    if (copyType == 'csv') {
        var emSetCSV = [`${loadedFile['fp'].name},${lookup(loadedFile['fp'].name)}`];
        for (var i = 0; i < emSets.length; i++) {
            emSetCSV.push(emSets[i].clipboardCopy('csv'))
        }
        navigator.clipboard.writeText(emSetCSV.join("\n"));
    } else {
        var emSetJSON = {"name": lookup(loadedFile['fp'].name), "emSets": []}
        for (var i = 0; i < emSets.length; i++) {
            emSetJSON.emSets.push(emSets[i].clipboardCopy('json'))
        }
        navigator.clipboard.writeText(JSON.stringify(outjson))
    }
    $(elem).css('background-color', '#57F287')
    setTimeout(function(){ $(elem).css('background-color', '') }, 200);
    /*var text = $(elem).contents().get(0).nodeValue
    $(elem).contents().get(0).nodeValue = "COPIED!"
    setTimeout(function(){ $(elem).contents().get(0).nodeValue = text }, 1000);*/
}

function addEmObj(elem, emSetNo, emToCopy=-1) {
    // HUM-C-F5DB3-00 from EmSetNo 2 in q2103 (File 01 Fighting Back)
    if (emToCopy == -1) {
        var emToAdd = new Em(JSON.parse(defaultEm), emSetNo);
    } else {
        // object is em as JSON
        var emToAdd = new Em(emToCopy, emSetNo);
    }
    emSets[getIndexByEmSetNo(emSetNo)].addEm(emToAdd);
}

function addEmSet() {
    const emSet = new EmSet("EmSet " + emSets.length, emSets.length);
    emSets.push(emSet);
    $('#emList').append(emSet.display());
}

function addAreaObj(areaGroupNo, areaToCopy=-1) {
    // HUM-C-F5DB3-00 from EmSetNo 2 in q2103 (File 01 Fighting Back)
    if (typeof areaToCopy == "number") {
        var areaToAdd = new Area(JSON.parse(defaultArea), areaGroupNo);
    } else {
        // object is em as JSON
        var areaToAdd = new Area(areaToCopy, areaGroupNo);
    }
    areaGroups[getIndexByAreaGroupNo(areaGroupNo)].addArea(areaToAdd);
}

function getIndexByEmSetNo(EmSetNo) {
    EmSetNo = parseInt(EmSetNo);
    for (var i = 0; i < emSets.length; i++) {
        if (parseInt(emSets[i].EmSetNo) == EmSetNo) {
            return i;
        }
    }
    console.warn("Could not find EmSet when searching... EmSet " + EmSetNo);
    return 0;
}

function getIndexByAreaGroupNo(AreaGroupNo) {
    AreaGroupNo = parseInt(AreaGroupNo);
    for (var i = 0; i < areaGroups.length; i++) {
        if (parseInt(areaGroups[i].GroupIndex) == AreaGroupNo) {
            return i;
        }
    }
    console.warn("Could not find area when searching... Area group " + AreaGroupNo);
    return 0;
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

function updateEmAttribute(name, elem, isHex=false) {
    var val = $(elem).val()
    if (name == "Id") {
        // "em00a0" => "200a0"
        val = questUnlookup(val)
    } else if (isHex) {
        val = parseInt(val, 16);
    }
    const em = currentSelection['obj'];
    em['attributes'][name] = val;
    $(`li#set-${em['position']}-${em.SetNo}`).replaceWith(em.display(em.SetNo));
    showContextMenu(elem, "em", [em], true)
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
function updateAreaAttribute(name, elem, value=null) {
    if (!value)
        value = $(elem).val()
    const area = currentSelection['obj'];
    area['attributes'][name] = value;
    $(`li#area-${area['position']}-${area.SetNo}`).replaceWith(area.display(area.SetNo));
    showContextMenu(elem, "area", [area], true)
}
async function showContextMenu(event, menuType, args, update=false) {
    if (!update) {
        event.preventDefault();
    }
    $('#rightClickMenuHeader').text("CONTEXT MENU");
    $('#contextMenuBasic').show();
    if (menuType == "em") {
        if (editorSettings['activeTab'] != 'emsets') await sidebarDisplay('emsets');
        if (args[0] instanceof Em) {
            var em = args[0];
            var position = em.position;
            var SetNo = em.SetNo;
        } else {
            var [position, SetNo] = args[0].id.split("-").slice(1);
            var em = emSets[position].ems[SetNo];
        }
        var emid = parseInt(em.attributes.Id).toString(16)
        if (event.pageX > 300) {
            // Don't scroll the sidebar if selecting from it
            $('#sidebar-content').scrollTo(`li#set-${position}-${SetNo}`, 100, {"offset": {"top": -50}});
        }
        currentSelection = {"obj": em, "elem": this}
        $('.marker-selected').attr('class', 'marker');
        $('#sidebar-content').find('.li-selected').attr('class', 'clickableLi');
        $(`div#set-${position}-${SetNo}`).attr('class', 'marker-selected');
        $(`li#set-${position}-${SetNo}`).attr('class', 'li-selected');
        // Probably not the best idea to load the right click menu EVERY time, but didn't want to duplicate code
        //
        $('#rightClickMenu').find("ul").replaceWith(`<ul><li style="height: 100%"><select onchange="updateEmAttribute('Id', this)" style="width: 100%" class="emSearch" name="state"></select></li>
        <li onclick="mutateMap('copy')"><span class="material-icons">control_point_duplicate</span> Duplicate</li>
        <li onclick="mutateMap('move')"><span class="material-icons">zoom_out_map</span> Move [soon]</li>
        <p id="rightClickMenuHeader" style="font-family: 'Work Sans', Roboto, sans-serif; padding-bottom: 0px;">EM CLIPBOARD</p>
        <li onclick="mutateMap('clipboard-copy')"><span class="material-icons">content_copy</span> Copy</li>
        <li onclick="mutateMap('clipboard-cut')"><span class="material-icons">content_cut</span> Cut</li>
        <li onclick="mutateMap('clipboard-paste')"><span class="material-icons">content_paste</span> Paste</li>
        <p style="height: 0"></p>
        <li onclick="mutateMap('delete')" class="warningBtn"><span class="material-icons">delete</span> Delete</li></ul>`)
        $('#rightClickMenuHeader').text(questLookup(emid)); // Updated with select2
        $('.emSearch').append(selectCompiled);
        $('.emSearch').val(questLookup(emid, returnId=true)).select2()
        const targetMenuPos = [Math.min(event.pageY, window.innerHeight-350), Math.max(event.pageX, 310)]
        if (event.which === 3) {
            $('#rightClickMenu').css({"top": targetMenuPos[0], "left": targetMenuPos[1]}).show(100);
        } else {
            // Advanced
            var cmattrs = "<table id='contextMenuAttrs'>"
            for (const [key, value] of Object.entries(em.attributes)) {
                cmattrs += `<tr><th class='tablekey'>${key}</th><th class='tablevalue'><input onchange="updateEmAttribute('${key}', this)" type="text" size="30" value="${value}"></th></tr>`
            }
            // References
            var reflist = "<table id='contextMenuReferenceList'>"
            for (const [key, value] of Object.entries(em.references)) {
                let text = $(`li#tl-${key}`).find('b').text();
                reflist += `<tr style="background-color: var(--dark-grey) !important" class="clickableLi" onclick="jumpToTask(${key})"><th class='tablekey'>${key} <b translate="yes">${text}</b></th></tr>`
                for (var i = 0; i < value.length; i++) {
                    reflist += `<tr><th>${value[i]}</th></tr>`
                }
            }
            if (Object.keys(em.references).length == 0) {
                reflist += `<tr style="line-height: 30px"><th>This Em isn't referenced in any Task.</th></tr>`
            }
            // Basic
            var cmbasic = "<table id='contextMenuBasicAttrs'>" + loadBasicView(em);


            if (emid.startsWith("2")) {
                $('#contextMenu').find('#contextMenuImg').attr('src', 'https://www.nintendo.co.jp/switch/ab48a/assets/images/legion/detail/item/01/chara.png')
                    .css('top', targetMenuPos[0]-40)
                $('#contextMenu').find('#contextMenuThumb').css('background-color', 'var(--secondary-color)')
            } else {
                $('#contextMenu').find('#contextMenuImg').attr('src', 'https://www.nintendo.co.jp/switch/ab48a/assets/images/legion/detail/item/05/chara.png')
                    .css('top', targetMenuPos[0]-40)
                $('#contextMenu').find('#contextMenuThumb').css('background-color', 'var(--primary-color)')
            }
            $('#contextMenu').find('#contextMenuAttrs').replaceWith(cmattrs + "</table>")
            $('#contextMenu').find('#contextMenuReferenceList').replaceWith(reflist + "</table>")
            $('#contextMenu').find('#contextMenuBasicAttrs').replaceWith(cmbasic + "</table>")
            $('#contextMenuBasicAttrs').hide()
            $('#contextMenuAttrs').hide()
            $('#contextMenuReferenceList').hide()
            if (editorSettings['contextMenuDisplayMode'] == "basic") {
                $('#contextMenuBasicAttrs').show()
                $("#contextMenuAdvanced").attr('class', 'inactive');
            } else if (editorSettings['contextMenuDisplayMode'] == "advanced") {
                $('#contextMenuAttrs').show()
            } else {
                $('#contextMenuReferenceList').show()
            }
            $('#contextMenu').find('#contextMenuBody').css('max-height', window.innerHeight - (targetMenuPos[0] + 120))
            $('#contextMenu').find('#emName').replaceWith(`<h1 id="emName">${questLookup(emid)} <span id='emSubtext'>${emid}</span></h1>`);
            if (!update) {
                $('#contextMenu').css({"top": targetMenuPos[0], "left": targetMenuPos[1]}).show(100)
            }
        }
    } else if (menuType == "area") {
        if (editorSettings['activeTab'] != 'areas') await sidebarDisplay('areas');
        if (args[0] instanceof Area) {
            var area = args[0];
            var position = area.position;
            var SetNo = area.SetNo;
        } else {
            var [position, SetNo] = args[0].id.split("-").slice(1);
            var area = areaGroups[position].areas[SetNo];
        }
        if (event.pageX > 300) {
            // Don't scroll the sidebar if selecting from it
            $('#sidebar-content').scrollTo(`li#area-${position}-${SetNo}`, 100, {"offset": {"top": -50}});
        }
        currentSelection = {"obj": area, "elem": this}
        $('.marker-selected').attr('class', 'marker');
        $('#sidebar-content').find('.li-selected').attr('class', 'clickableLi');
        $(`svg#area-${position}-${SetNo}`).attr('class', 'marker-selected');
        $(`li#area-${position}-${SetNo}`).attr('class', 'li-selected');
        // Probably not the best idea to load the right click menu EVERY time, but didn't want to duplicate code
        //
        $('#rightClickMenu').find("ul").replaceWith(`<ul>
        <li onclick="mutateMap('copy')"><span class="material-icons">control_point_duplicate</span> Duplicate</li>
        <p id="rightClickMenuHeader" style="font-family: 'Work Sans', Roboto, sans-serif; padding-bottom: 0px;">AREA CLIPBOARD</p>
        <li onclick="mutateMap('clipboard-copy')"><span class="material-icons">content_copy</span> Copy</li>
        <li onclick="mutateMap('clipboard-cut')"><span class="material-icons">content_cut</span> Cut</li>
        <li onclick="mutateMap('clipboard-paste')"><span class="material-icons">content_paste</span> Paste</li>
        <p style="height: 0"></p>
        <li onclick="mutateMap('delete')" class="warningBtn"><span class="material-icons">delete</span> Delete</li></ul>`)
        $('#rightClickMenuHeader').text(`Area ${area.AreaGroupNo} Index ${area.attributes.AreaIndex}`); // Updated with select2
        
        const targetMenuPos = [Math.min(event.pageY, window.innerHeight-350), Math.max(event.pageX, 310)]
        if (event.which === 3) {
            $('#rightClickMenu').css({"top": targetMenuPos[0], "left": targetMenuPos[1]}).show(100);
        } else {
            // Advanced
            var cmattrs = "<table id='contextMenuAttrs'>"
            for (const [key, value] of Object.entries(area.attributes)) {
                cmattrs += `<tr><th class='tablekey'>${key}</th><th class='tablevalue'><input onchange="updateAreaAttribute('${key}', this)" type="text" size="30" value="${value}"></th></tr>`
            }
            var reflist = "<table id='contextMenuReferenceList'>"
            for (const [key, value] of Object.entries(area.references)) {
                let text = $(`li#tl-${key}`).find('b').text();
                reflist += `<tr style="background-color: var(--dark-grey) !important" class="clickableLi" onclick="jumpToTask(${key})"><th class='tablekey'>${key} <b translate="yes">${text}</b></th></tr>`
                for (var i = 0; i < value.length; i++) {
                    reflist += `<tr><th>${value[i]}</th></tr>`
                }
            }
            if (Object.keys(area.references).length == 0) {
                reflist += `<tr style="line-height: 30px"><th>This Area isn't referenced in any Task.</th></tr>`
            }
            // Basic
            $('#contextMenu').find('#contextMenuImg').attr('src', 'https://www.nintendo.co.jp/switch/ab48a/assets/images/legion/detail/item/03/chara.png')
                .css('top', targetMenuPos[0]-80)
            $('#contextMenu').find('#contextMenuThumb').css('background-color', 'var(--secondary-color)')
            $('#contextMenu').find('#contextMenuAttrs').replaceWith(cmattrs + "</table>")
            $('#contextMenu').find('#contextMenuReferenceList').replaceWith(reflist + "</table>")
            $('#contextMenuBasicAttrs').hide()
            $('#contextMenuBasic').hide();
            $('#contextMenuAttrs').hide()
            $('#contextMenuReferenceList').hide()
            if (editorSettings['contextMenuDisplayMode'] == "advanced" || editorSettings['contextMenuDisplayMode'] == "basic") {
                $('#contextMenuAttrs').show()
                $("#contextMenuAdvanced").attr('class', 'active');
            } else {
                $('#contextMenuReferenceList').show()
            }
            $('#contextMenu').find('#contextMenuBody').css('max-height', window.innerHeight - (targetMenuPos[0] + 120))
            $('#contextMenu').find('#emName').replaceWith(`<h1 id="emName">${(parseInt(area.attributes.AreaType) == 1) ? "Zone-defined" : "Point-defined"} Area <span id='emSubtext'>TYPE ${area.attributes.AreaType}</span></h1>`);
            if (!update) {
                $('#contextMenu').css({"top": targetMenuPos[0], "left": targetMenuPos[1]}).show(100)
            }
        }
    } else if (menuType == "dat") {
        // always right click
        $('#rightClickMenuHeader').text(args[0]);
        $('#rightClickMenu').find("ul").replaceWith(`<ul>
        <li onclick="exportToQuestDAT(this, '${args[0]}', true)"><span class="material-icons">download</span> Download</li>
        </ul>`)
        $('#rightClickMenu').css({"top": event.pageY, "left": Math.max(event.pageX, 310)}).show(100);
    }
}

const showhide = {
    "emsets": ['active', 'block', 'inactive', 'none', 'inactive', 'none', 'inactive', 'none'],
    "tasks": ['inactive', 'none', 'active', 'block', 'inactive', 'none', 'inactive', 'none'],
    "talkscripts": ['inactive', 'none', 'inactive', 'none', 'inactive', 'none', 'active', 'block'],
    "areas": ['inactive', 'none', 'inactive', 'none', 'active', 'block', 'inactive', 'none']
}

async function jumpToTask(taskNo) {
    await sidebarDisplay('tasks');
    renderTaskList(taskNo);
}

function sidebarDisplay(mode) {
    return new Promise((resolve, reject) => {
        let tabDisplay = showhide[mode];
        $('#sidebar-contentHeader-emSets').attr('class', tabDisplay[0]);
        if (tabDisplay[1] == "block") {
            $('#emList').slideDown(100, function() {$('#emList').css('display', tabDisplay[1]); resolve()});
        } else if ($('#emList').css('display') != "none") {
            $('#emList').slideUp(100, function() {$('#emList').css('display', tabDisplay[1]); resolve()});
        }
        $('#sidebar-contentHeader-tasks').attr('class', tabDisplay[2]);
        if (tabDisplay[3] == "block") {
            $('.taskeditor').slideDown(100, function() {$('.taskeditor').css('display', tabDisplay[3]); resolve()});
        } else if ($('.taskeditor').css('display') != "none") {
            $('.taskeditor').slideUp(100, function() {$('.taskeditor').css('display', tabDisplay[3]); resolve()});
        }
        $('#sidebar-contentHeader-areas').attr('class', tabDisplay[4]);
        if (tabDisplay[5] == "block") {
            $('#areaList').slideDown(100, function() {$('#areaList').css('display', tabDisplay[5]); resolve()});
        } else if ($('#areaList').css('display') != "none") {
            $('#areaList').slideUp(100, function() {$('#areaList').css('display', tabDisplay[5]); resolve()});
        }
        $('#sidebar-contentHeader-talkScripts').attr('class', tabDisplay[6]);
        if (tabDisplay[7] == "block") {
            $('#talkScriptList').slideDown(100, function() {$('#talkScriptList').css('display', tabDisplay[7]); resolve()});
        } else if ($('#talkScriptList').css('display') != "none") {
            $('#talkScriptList').slideUp(100, function() {$('#talkScriptList').css('display', tabDisplay[7]); resolve()});
        }
        editorSettings['activeTab'] = mode;
    })
}

// Changes the display mode of the contextMenu (ems only). Not very clean, but it does the job.
function contextMenuDisplay(displayMode) {
    if (displayMode == "basic") {
        $('#contextMenuBasicAttrs').show(100, function() {$('#contextMenuBasicAttrs').css('display', 'block')});
        $('#contextMenuBasic').attr('class', 'active');
        $('#contextMenuAttrs').hide(100, function() {$('#contextMenuAttrs').css('display', 'none')});
        $('#contextMenuAdvanced').attr('class', 'inactive');
        $('#contextMenuReferenceList').hide(100, function() {$('#contextMenuReferenceList').css('display', 'none')});
        $('#contextMenuReferences').attr('class', 'inactive');
        editorSettings['contextMenuDisplayMode'] = "basic";
        return;
    }
    $('#contextMenuBasicAttrs').hide(100, function() {$('#contextMenuBasicAttrs').css('display', 'none')});
    $('#contextMenuBasic').attr('class', 'inactive')

    if (displayMode == "advanced") {
        $('#contextMenuAttrs').show(100, function() {$('#contextMenuAttrs').css('display', 'block')});
        $('#contextMenuAdvanced').attr('class', 'active');
        $('#contextMenuReferenceList').hide(100, function() {$('#contextMenuReferenceList').css('display', 'none')});
        $('#contextMenuReferences').attr('class', 'inactive');
        editorSettings['contextMenuDisplayMode'] = "advanced";
        return;
    }
    $('#contextMenuAttrs').hide(100, function() {$('#contextMenuAttrs').css('display', 'none')});
    $('#contextMenuAdvanced').attr('class', 'inactive');

    if (displayMode == "references") {
        $('#contextMenuReferenceList').show(100, function() {$('#contextMenuReferences').css('display', 'block')});
        $('#contextMenuReferences').attr('class', 'active')
        editorSettings['contextMenuDisplayMode'] = "references";
        return;
    }
}

function mutateMap(operation, args="") {
    if (currentSelection['obj'] instanceof Em) {
        if (operation == "delete") {
            emSets[currentSelection['obj'].position].removeEm(currentSelection['obj'].SetNo)
        } else if (operation == "copy") {
            addEmObj(currentSelection['elem'], currentSelection['obj'].EmSetNo, currentSelection['obj'].export());
        } else if (operation == "clipboard-copy" || operation == "clipboard-cut") {
            localClipboard = currentSelection['obj'].export();
            if (operation == "clipboard-cut") mutateMap("delete", "");
        } else if (operation == "clipboard-paste") {
            addEmObj(currentSelection['elem'], currentSelection['obj'].EmSetNo, localClipboard);
        }
    } else {
        if (operation == "delete") {
            areaGroups[currentSelection['obj'].position].removeArea(currentSelection['obj'].SetNo)
        } else if (operation == "copy") {
            addAreaObj(currentSelection['obj'].AreaGroupNo, currentSelection['obj'].export());
        } else if (operation == "clipboard-copy" || operation == "clipboard-cut") {
            localClipboard = currentSelection['obj'].export();
            if (operation == "clipboard-cut") mutateMap("delete", "");
        } else if (operation == "clipboard-paste") {
            addAreaObj(currentSelection['obj'].AreaGroupNo, localClipboard);
        }
    }
    
    $("#rightClickMenu").hide(100);
}

$(document).bind("mousedown", function (e) {
    // If clicked outside the active menu, hide it
    if (editorSettings['activeTab'] != "tasks") {
        if (!$(e.target).parents("#contextMenu").length > 0) {
            $("#contextMenu").hide(100);
        }
        if (!$(e.target).parents("#rightClickMenu").length > 0) {
            $("#rightClickMenu").hide(100);
        }
        if (!$(e.target).parents("#contextMenu").length > 0 && !$(e.target).parents("#rightClickMenu").length > 0) {
            $('.marker-selected').attr('class', 'marker');
            // make sure there the task list selection isn't hidden
            $('.li-selected').not('[id^="tl-"]').attr('class', 'clickableLi');
        }
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
    $('#posz').text(Math.round((e.pageX - parseInt(offset['left'])) / (-4 * zoom)))
    $('#posx').text(Math.round((e.pageY - parseInt(offset['top'])) / (4 * zoom)))
}
var selectableLookups = [em, pl, ba, bg];
var selectCompiled = ""
for (var i = 0; i < selectableLookups.length; i++) {
    for (const [key, value] of Object.entries(selectableLookups[i])) {
        if (key.endsWith("ff") || value.startsWith("<")) { continue };
        selectCompiled += `<option value="${key}">${value}</option>`
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