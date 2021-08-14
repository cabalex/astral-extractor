/*
0 uint32 - magic (LAY\x00)
4 uint32 - idk version? identifier? always constant
8 uint32 - file table offset (0x20, 32)
12 uint32 - file count
16 uint32 - object data table offset
20 uint32 - object count
24 uint32? - File size
28 uint32 - Padding (or could be uint64 for previous)

File table
0 char[2] - first file id (ba, bg)
2 uint8 - second hex values of id
3 uint8 - first hex values of id

E.G. 62 61 10 B0 (ba\x10\xB0) = ba + B010 = bab010

0 char[32] - <File name>_<SubNo>

*/


function loadInitialLAY(fileType, file) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        const decoder = new TextDecoder();
        reader.onloadend = function(e) {
          if (e.target.readyState == FileReader.DONE) {
            var view = new DataView(e.target.result);
            var [fileTableOffset, fileCount, objectDataTableOffset, objectCount, fileSize] = new Uint32Array(e.target.result.slice(8, 28));
            var fileArr = []
            for (var i = 0; i < fileCount; i++) {
                fileArr.push(String.fromCharCode(view.getUint8(fileTableOffset + i*4)) + String.fromCharCode(view.getUint8(fileTableOffset + 1 + i*4)) + view.getUint16(fileTableOffset + 2 + i*4, true).toString(16))
            }
            var objectDataTable = []
            var objects = {}
            for (var i = 0; i < objectCount; i++) {
                objectDataTable.push(e.target.result.slice(objectDataTableOffset + i*112))
            }
            for (var i = 0; i < objectCount; i++) {
                var splitted = decoder.decode(objectDataTable[i].slice(0, 16)).replace(/^\0+/, '').replace(/\0+$/, '').split("_");
                switch(splitted.length) {
                    case 2:
                        objects[splitted[0]] = {"subNo": splitted[1], "area": ""};
                        break;
                    case 3:
                        objects[splitted[0]] = {"subNo": splitted[2], "area": splitted[1]};
                        break;
                    default:
                        console.error(splitted)
                }
            }
            var form = `<table><tr><th>ID</th><th>AREA</th><th>NAME</th>`;
            console.log(objects)
            for (const [ key, value ] of Object.entries(objects)) {
                form += `<tr><th>${value['subNo']}</th><th>${value['area']}</th><th><input type="text" size="25" value='${key}'></input></th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
            }
            //$('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(objects).length} objects <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'lay\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
            //$('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
            $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
            $('div[id="' + file.name + '"]').append("<div id='files' style='display: inline-block;' class='scroll'>" + form + "</table></div>")
            globalFiles[file.name] = {'fp': file, 'objects': objects}
            resolve();
          }
        }
        reader.readAsArrayBuffer(file)
      })
}