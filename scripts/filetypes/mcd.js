class MCDHeader {
    constructor(head) {
        this.offsetEvents = head[0]
        this.eventCount = head[1]
        this.offsetCharSet = head[2]
        this.charCount = head[3]
        this.offsetCharGraphs = head[4]
        this.charGraphsCount = head[5]
        this.offsetSpecialGraphs = head[6]
        this.specialGraphsCount = head[7]
        this.offsetUsedEvents = head[8]
        this.usedEventCount = head[9]
    }
}

chars = []
function readLetterMCD(chars, n) {
    if (n[0] <= 0x8000) {
        return chars[n[0]]['wchar_t c']
    } else if (n[0] == 0x8001) {
        return " "
    } else if (n[0] == 0x8020) {
        // button - copied from bayonetta_tools
        const keycodes = {
            9: "+",
            10: "-",
            11: "B",
            12: "A",
            13: "Y",
            14: "X",
            15: "R",
            16: "L",
            17: "DPadUpDown",
            18: "DPadLeftRight",
            19: "RightStick",
            20: "RightStickPress",
            21: "LeftStick",
            22: "LeftStickPress",
            23: "LeftStickRotate",
            24: "LeftStickUpDown"
        }
        return `[BTN: ${keycodes[n[1]]}]`
    } else {
        return `<Special0x${n[0]}_${n[1]}`
    }
}

function save_letter(n) {
    var s = [0x8001, 0]
    for (var i = 0; i < chars.length; i++) {
        if (chars[i]['wchar_t c'] == n) {
            s[0] = x
            s[1] = char['positionOffset']
        }
    }
    return s
}

function read_string(chars, unpacked) {
    var s = []
    for (var i = 0; i < unpacked.length; i++) {
        s.push(readLetterMCD(chars, unpacked[i]));
    }
    return s;
}

function loadInitialMCD(fileType, file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = function(e) {
            if (e.target.readyState == FileReader.DONE) {
                const enc = new TextDecoder("utf-8");
                var chars = [];
                var view = new DataView(e.target.result);
                var header = new MCDHeader(new Uint32Array(e.target.result.slice(0, 40)));
                for (var x = 0; x < header.charCount; x++) {
                    chars.push({'code': view.getUint16(40+x*8, true), 'positionOffset': view.getInt16(44+x*8, true)});
                }
                for (var x = 0; x < header.charCount; x++) {
                    chars[x]['lang'] = view.getUint16(header.offsetCharSet + x*8, true);
                    chars[x]['wchar_t c'] = String.fromCharCode(view.getUint16(header.offsetCharSet + 2 + x*8, true));
                    chars[x]['index'] = view.getUint32(header.offsetCharSet + 4 + x*8, true);
                }
                // position tracking (this was ported from python so its really bad looking LMAO)
                var pos = [header.offsetEvents, 0, 0]
                var events = []
                for (var x = 0; x < header.eventCount; x++) { // EVENTS
                    var paragraphs = []
                    //console.log(f"\n{hex(o.tell())} --------- Event {x}")
                    var eventHeader = new Uint32Array(e.target.result.slice(pos[0], pos[0] + 16));
                    // eventHeader[0] - paragraphsOffset
                    // eventHeader[1] - paragraphCount
                    // eventHeader[2] - sequenceNumber
                    // eventHeader[3] - eventID
                    pos[0] += 16;
                    pos[1] = eventHeader[0]
                    for (var y = 0; y < eventHeader[1]; y++) { // PARAGRAPHS
                        var strings = []
                        var paragraphHeader = [view.getUint32(pos[1], true), view.getInt32(pos[1] + 4, true), view.getFloat32(pos[1] + 8, true), view.getFloat32(pos[1] + 12, true), view.getUint16(pos[1] + 16, true), view.getUint16(pos[1] + 18, true)];
                        // paragraphHeader[0] - stringsOffset
                        // paragraphHeader[1] - stringCount
                        // paragraphHeader[2] - belowSpacing
                        // paragraphHeader[3] - horziontalSpacing
                        // paragraphHeader[4] - languageFlags
                        //console.log(f"# {hex(o.tell())} --- Paragraph {y}")
                        //console.log(f"# Paragraph header: {paragraphHeader}")
                        pos[1] += 20;
                        pos[2] = paragraphHeader[0];
                        //console.log(hex(o.tell()))
                        for (var z = 0; z < paragraphHeader[1]; z++) { // STRINGS
                            var stringHeader = [...new Uint32Array(e.target.result.slice(pos[2], pos[2]+16)), view.getFloat32(pos[2] + 16, true), view.getFloat32(pos[2] + 20, true)];
                            // stringHeader[0] - stringOffset
                            // stringHeader[1] - u_a (always 0)
                            // stringHeader[2] - length
                            // stringHeader[3] - length2
                            // stringHeader[4] - belowSpacing
                            // stringHeader[5] - horizontalSpacing
                            //console.log(f"## {x} string header: {stringHeader}")
                            pos[2] += 24;
                            var stringLetters = [];
                            for (var c = 0; c < (stringHeader[2]-1)/2; c++) {
                                stringLetters.push(readLetterMCD(chars, [view.getUint16(stringHeader[0] + c*4, true), view.getInt16(stringHeader[0] + 2 + c*4, true)]));
                                //stringLetters.push(chars[chrcter % 300]['wchar_t c'])
                            }
                            var terminator = view.getUint16(stringHeader[0] + stringLetters.length*4);
                            strings.push({"stringHeader": stringHeader, "text": stringLetters.join(""), 'terminator': terminator})
                            break
                        }
                        paragraphs.push({'paragraphHeader': paragraphHeader, 'strings': strings})
                    }
                    events.push({'eventHeader': eventHeader, 'paragraphs': paragraphs})
                }
                // char graphs
                var charGraphs = []
                for (var x = 0; x < header.charGraphsCount; x++) {
                    var charGraph = [view.getUint32(header.offsetCharGraphs + x*40, true), ...new Float32Array(e.target.result.slice(header.offsetCharGraphs + 4 + x*40, header.offsetCharGraphs + 40 + x*40))]
                    // charGraph[0] - textureId
                    // charGraph[1] - u1
                    // charGraph[2] - v1
                    // charGraph[3] - u2
                    // charGraph[4] - v2
                    // charGraph[5] - width
                    // charGraph[6] - height
                    // charGraph[7] - always 0?
                    // charGraph[8] - belowSpacing
                    // charGraph[9] - horizontalSpacing
                    /*console.log(f"({charGraph[2]}, {charGraph[4]}) - {charGraph[5]}x{charGraph[6]}")
                    img2 = img.crop((int(img.width*charGraph[1]), int(img.height*charGraph[2]), int(img.width*charGraph[3]), int(img.height*charGraph[4])))
                    outputname = f"{charGraph[0]}-{x}.png"
                    img2.save(f"{outputfolder}/{outputname}", format="png")
                    if chars[x]['wchar_t c'] in outputjs.keys():
                        exist = False 
                        for character in outputjs[chars[x]['wchar_t c']]:
                            if open(f"{outputfolder}/{character}","rb").read() == open(f"{outputfolder}/{outputname}","rb").read():
                                os.remove(f"{outputfolder}/{outputname}")
                                exist = True
                                break
                        if not exist:
                            outputjs[chars[x]['wchar_t c']].push(outputname)
                    else:    
                        outputjs[chars[x]['wchar_t c']] = [outputname]*/
                    charGraphs.push(charGraph)
                }
                var specialGraphs = []
                for (var x = 0; x < header.specialGraphsCount; x++) {
                    var specialGraph = Array.from(new Uint32Array(e.target.result.slice(header.offsetSpecialGraphs + x*20, header.offsetSpecialGraphs + (x+1)*20)))
                    // specialGraph[0] - languageFlag
                    // specialGraph[1] - width
                    // specialGraph[2] - height
                    // specialGraph[3] - belowSpacing
                    // specialGraph[4] - horizontalSpacing
                    specialGraph[5] = view.getFloat32(header.offsetSpecialGraphs + x*20 + 16, true);
                    specialGraphs.push(specialGraph);
                }
                var usedEvents = []
                for (var x = 0; x < header.usedEventCount; x++) {
                    // usedEvent[0] - eventID
                    // usedEvent[1] - eventIndex
                    // usedEvent[2] - name[32]
                    var eventIndex = view.getUint32(header.offsetUsedEvents + x*40 + 4, true);
                    var formatout = enc.decode(e.target.result.slice(header.offsetUsedEvents + x*40 + 8, header.offsetUsedEvents + (x+1)*40)).replace(/\0/g, '');
                    usedEvents.push({"hash": view.getUint32(header.offsetUsedEvents + x*40, true), "eventIndex": eventIndex, "eventBody": events[eventIndex], "name": formatout})
                }
                usedEvents = usedEvents.sort((a,b)=>a['eventIndex']-b['eventIndex']);
                if (usedEvents.length != events.length) {
                    console.warn(`The event list is ${events.length-usedEvents.length} items longer than what is used (usedEvents). There may be unused events.`)
                }
                // output
                const langColors = ["var(--red-case)", "#306ABE", "#CD463C", "#3795A8", "#E7770C", "#2CAB92", "#E7B200", "#EF7E91", "#A52E10", "#8D59C5", "#B2B445", "#D648BB", "#A9AA79", "#3CC274", "#6F8027", "#6D8A8C"]
                var form = '<table id="glyphs">';
                // wta/wtp support coming soon i promise
                const imageDimensions = [Math.round(charGraphs[0][5] / (charGraphs[0][3] - charGraphs[0][1])), Math.round(charGraphs[0][6] / (charGraphs[0][2] - charGraphs[0][0]))]
                for (var i = 0; i < chars.length; i++) {
                    form += `<tr style="background-color: ${langColors[chars[i]['lang']]} !important"><th class="index">${chars[i]['index']}</th><th class="lang">${chars[i]['lang']}</th><th class="dimensions">${charGraphs[i][5]}x${charGraphs[i][6]}</th><th class="position">X: ${imageDimensions[0] * charGraphs[i][1]} | Y: ${imageDimensions[1] * charGraphs[i][2]}</th><th class="key"><input class="${file.name}?${i}" type="text" size="1" value="${chars[i]['wchar_t c']}"></input></th></tr>`
                }
                $('div[id="' + file.name + '"]').append(`<h3 style="margin-left: 10px;">Glyphs</h3><div id='files' style='display: inline-block;' class='scroll'>` + form + "</table></div>")
                
                form = '<table id="usedEvents">';
                for (var i = 0; i < usedEvents.length; i++) {
                    form += `<tr><th class="index">${usedEvents[i]['eventIndex']}</th><th class="hash">${usedEvents[i]['hash'].toString(16).toUpperCase()}</th><th class="key"><input class="${file.name}?${i}" type="text" size="32" value="${usedEvents[i]['name']}"></input></th>`
                    for (var x = 0; x < usedEvents[i]['eventBody']['paragraphs'].length; x++) {
                        form += `<th title="Lang ${usedEvents[i]['eventBody']['paragraphs'][x]['paragraphHeader'][4]}" style="background-color: ${langColors[usedEvents[i]['eventBody']['paragraphs'][x]['paragraphHeader'][4]]} !important" class="value${i}"><textarea class="${file.name}-${i}" rows="2" cols="36">${usedEvents[i]['eventBody']['paragraphs'][x]['strings'].map(x => x['text']).join("\n")}</textarea></th>`;
                    }
                    form += "</tr>"
                }
                $('div[id="' + file.name + '"]').append(`<h3 style="margin-left: 10px;">Used Events</h3><div id='files' style='display: inline-block;' class='scroll'>` + form + "</table></div>")
                $('div[id="' + file.name + '"]').find('h4').append(` - ${usedEvents.length} used events <a class='download' onclick="downloadMCD(\'mcd\', '${file.name}', 'false')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD AS JSON</a>`)
                $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
                globalFiles[file.name] = {'fp': file, 'data': {'chars': chars, 'events': events, 'charGraphs': charGraphs, 'specialGraphs': specialGraphs, 'usedEvents': usedEvents}}
                console.log(globalFiles[file.name]['data'])
                resolve();
            }
        }
        reader.readAsArrayBuffer(file);
    })
}

function downloadMCD(fileType, filename) {
    // TODO: this is just a data dump, make it cleaner and easier to read
    //const root = $(`div[id="${filename}"]`)
    var data = JSON.stringify(globalFiles[filename]['data'], null, 2)
    var blob = new Blob([data], {type: "application/text"})
    saveAs(blob, filename.replace(".mcd", ".json"));
  }