// just serves as a prefab for WTA/WTP files, so that names are shown.

function loadInitialUVD(fileType, file) {
  var reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      // stuff is in BIG ENDIAN; gotta do some jank
      const header = new DataView(e.target.result.slice(0, 16));
      // uint32 table 2 length (texture count)
      // uint32 table 1 length
      // uint32 table 1 offset
      // uint32 table 2 offset
      
      // todo
  }
  reader.readAsArrayBuffer(file)
}

function downloadUVD(fileType, name) {
  // todo
}