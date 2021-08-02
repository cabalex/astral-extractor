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
        reader.onloadend = function(e) {
          if (e.target.readyState == FileReader.DONE) {
            var view = new DataView(e.target.result);
            var [fileTableOffset, fileCount, objectDataTableOffset, objectCount, fileSize] = new Uint32Array(e.target.result.slice(8, 28));
            var fileArr = []
            for (var i = 0; i < fileCount; i++) {
                fileArr.push(String.fromCharCode(view.getUint8(fileTableOffset + i*4)) + String.fromCharCode(view.getUint8(fileTableOffset + 1 + i*4)) + view.getUint16(fileTableOffset + 2 + i*4, true).toString(16))
            }
            for (var i = 0; i < objectCount; i++) {

            }
            resolve();
          }
        }
        reader.readAsArrayBuffer(file)
      })
}