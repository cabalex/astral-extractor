function loadInitialBXM(fileType, file) {
  var reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      var header = new Int16Array(e.target.result);
      // magic - 0/1
      // unk - 2/3
      // nodeNumber - 4
      // dataNumber - 5
      const dataSize = new Uint32Array(e.target.result.slice(12, 16))
      var offsets = []
      for (var i; i < header[5]; i++) {
        offsets.push(e.target.result.slice(16 + 8*header[4] + 4*i, 16 + 8*header[4] + 4*(i+1)))
        // nameoffset - 0
        // dataoffset - 1
      }
      var datasOffset = 16 + 8*header[4] + header[5] * 4;
      var pos = 16;
      var tree = {};
      function readTree(){
        (pos + 8)
      }
      for (var i; i < header[5]; i++) {
        // TODO lol
      }
    }
  }
  reader.readAsArrayBuffer(file) // bxms are small enough to read the whole thing in one go
}

function exportSubFilePKZ(fileType, name, subFile, returnFile) {
  var reader = new FileReader();
  var workingfile = globalFiles[name]
  reader.onloadend = async function(e) {
    if (e.target.readyState == FileReader.DONE) {
      const decoder = new ZSTDDecoder();
      await decoder.init();
      const decompressedArray = decoder.decode(new Uint8Array(e.target.result), Number(workingfile['files'][subFile][1]))
      var blob = new Blob([decompressedArray], {type: 'application/octet-stream'});
      sendOutSubFile(fileType, name, subFile, blob, returnFile);
    }
  }
  reader.readAsArrayBuffer(workingfile.fp.slice(Number(workingfile['files'][subFile][2]), Number(workingfile['files'][subFile][2]) + Number(workingfile['files'][subFile][3])));
}