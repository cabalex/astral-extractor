class DDSPixelFormat {
	constructor(pixelFormat) {
		this.size = 32;
		this.flags = 4;
		if (pixelFormat._format == "BC6H_UF16") {
			this.fourCC = 'DX10'
		} else {
			this.fourCC = 'DXT5'
		}
		this.RGBBitCount = 0
		this.RBitMask = 0x00000000
		this.GBitMask = 0x00000000
		this.BBitMask = 0x00000000
		this.ABitMask = 0x00000000
	}
}

class DDSHeader {
	// https://docs.microsoft.com/en-us/windows/win32/direct3ddds/dds-header
	
	constructor(texture) {
		this.magic = 'DDS\x20'
		this.size = 124
		this.flags = 0x1 + 0x2 + 0x4 + 0x1000 + 0x20000 + 0x80000 // Defaults (caps, height, width, pixelformat) + mipmapcount and linearsize
		this.height = texture.height
		this.width = texture.width
		this._format = texture._format
		if (this._format == "R8G8B8A8_UNORM") {
			this.pitchOrLinearSize = ((width + 1) >> 1) * 4
		} else {
			this.pitchOrLinearSize = int(max(1, ((this.width+3)/4) ) * returnFormatTable(this._format)[0]) // https://docs.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide
		}
		this.depth = texture.depth
		this.mipmapCount = 1 //texture.mipCount # Setting this to the normal value breaks everything, don't do that
		this.reserved1 = [0x00000000] * 11
		this.ddspf = new DDSPixelFormat(texture)
		this.caps = 4198408 // Defaults (DDSCAPS_TEXTURE) + mipmap and complex
		this.caps2 = 0 
		this.caps3 = 0
		this.caps4 = 0
		this.reserved2 = 0
	}

	save() {
		output = this.magic + pack("20I4s10I", this.size, this.flags, this.height, this.width, this.pitchOrLinearSize, this.depth,
			this.mipmapCount, this.reserved1[0], this.reserved1[1], this.reserved1[2], this.reserved1[3], this.reserved1[4],
			this.reserved1[5], this.reserved1[6], this.reserved1[7], this.reserved1[8], this.reserved1[9], this.reserved1[10],
			this.ddspf.size, this.ddspf.flags, this.ddspf.fourCC, this.ddspf.RGBBitCount, this.ddspf.RBitMask, this.ddspf.GBitMask,
			this.ddspf.BBitMask, this.ddspf.ABitMask, this.caps, this.caps2, this.caps3, this.caps4, this.reserved2)
		if (this._format == "BC6H_UF16") {
			output += bytearray("\x5F\x00\x00\x00\x03\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00");
		}
		return output;
	}
}
class AstralChainTexture {
	constructor(wtaheader) {
		formats = {
			0x25: "R8G8B8A8_UNORM",
			0x42: "BC1_UNORM",
			0x43: "BC2_UNORM",
			0x44: "BC3_UNORM",
			0x45: "BC4_UNORM",
			0x46: "BC1_UNORM_SRGB",
			0x47: "BC2_UNORM_SRGB",
			0x48: "BC3_UNORM_SRGB",
			0x49: "BC4_SNORM",
			0x50: "BC6H_UF16",
			0x79: "ASTC_4x4_UNORM",
			0x80: "ASTC_8x8_UNORM",
			0x87: "ASTC_4x4_SRGB",
			0x8E: "ASTC_8x8_SRGB"
		}
		surfaceTypes = ["T_1D", "T_2D", "T_3D", "T_Cube", "T_1D_Array", "T_2D_Array", "T_2D_Multisample", "T_2D_Multisample_Array", "T_Cube_Array"];
		[this.magic, this.unknown, this.imageSize, this.headerSize,
			this.mipCount, this._typeval, this._formatval, this.width,
			this.height, this.depth, this.unknown4, this.textureLayout,
			this.textureLayout2, this.arrayCount] = new Uint32Array(wtaheader);
		this._format = formats[this._formatval];
		this._type = surfaceTypes[this._typeval];
		if (["T_Cube", "T_Cube_Array"].includes(this._type)) { this.ArrayCount = 6 };
	}

	getImageData(textureData) {
		const blockHeightLog2 = this.textureLayout & 7;
		var texture = getImageData(textureData, 0, 0, 0, blockHeightLog2, 1);
		console.log(`Loaded texture ${this.identifier} ({this._format})`);
		if (this._format.startsWith("ASTC")) {
			// ASTC
			var byteheight = new Uint8Array(Uint32Array.from([this.width]).buffer);
			var bytewidth = new Uint8Array(Uint32Array.from([this.width]));
			var formatInfo = returnFormatTable(this._format);
			outBuffer = Uint8Array.from([0x13, 0xAB, 0xA1, 0x5C,
				formatInfo[1], formatInfo[2], 1, bytewidth[1], bytewidth[2],
			bytewidth[3], byteheight[1], byteheight[2], byteheight[3], 1, 0, 0])
			return [concatenateToUint8(outBuffer, texture), true];
		} else {
			// DDS
			var headerDataObject = DDSHeader(this);
			var headerData = headerDataObject.save();
			return [concatenateToUint8(headerData, texture), false];
		}
	}
}

function loadInitialWTA(fileType, file) {
	return new Promise((resolve, reject) => {
	  var textures = [];
	  var reader = new FileReader();
	  reader.onloadend = async function(e) {
		if (e.target.readyState == FileReader.DONE) {
			const [magic, unknown, textureCount, textureOffsetArrayOffset,
				textureSizeArrayOffset, unknownArrayOffset1, textureIdentifierArrayOffset, unknownArrayOffset2] = new Uint32Array(e.target.result.slice(0, 32));
			view = new DataView(e.target.result);
			var textures = [];
			for (var i = 0; i < textureCount; i++) {
				var texture = new AstralChainTexture(e.target.result.slice(unknownArrayOffset2 + i*56));
				texture.offset = view.getUint32(textureOffsetArrayOffset + i*4);
				texture.size = view.getUint32(textureSizeArrayOffset + i*4);
				texture.identifier = view.getUint32(textureIdentifierArrayOffset + i*4).toString(16);
				texture.unknownArray = view.getUint32(unknownArrayOffset1 + i*4);
				textures.push(texture);
			}
			$('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
			$('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
			$('div[id="' + file.name + '"]').append("<div id='files' style='display: inline-block;' class='scroll'>" + form + "</table></div>")
			for (const key of Object.keys(localFiles)) {
				document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitDAT("dat", file.name, key, event.target.files) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
			}
			globalFiles[file.name] = {'fp': file, 'textures': textures}
			resolve()
		}
	  }
	  reader.readAsArrayBuffer(file.slice(0, 28))
	})
  }