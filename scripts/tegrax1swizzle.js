// port of my other tegrax1swizzles
/* An attempt to emulate https://github.com/KillzXGaming/Switch-Toolbox/blob/604f7b3d369bc97d9d05632da3211ed11b990ba7/Switch_Toolbox_Library/Texture%20Decoding/Switch/TegraX1Swizzle.cs
# jesus christ i do not know how to write code
# copied from https://github.com/aboood40091/BNTX-Extractor/blob/master/swizzle.py

# Based on Ryujinx's image table 
# https://github.com/Ryujinx/Ryujinx/blob/c86aacde76b5f8e503e2b412385c8491ecc86b3b/Ryujinx.Graphics/Graphics3d/Texture/ImageUtils.cs
# A nice way to get bpp, block data, and buffer types for formats
*/
formatTable = {
	"R8G8B8A8_UNORM": [4, 1, 1, 1],
	"BC1_UNORM": [8, 4, 4, 1],
	"BC2_UNORM": [16, 4, 4, 1],
	"BC3_UNORM": [16, 4, 4, 1],
	"BC4_UNORM": [8, 4, 4, 1],
	"BC1_UNORM_SRGB": [8, 4, 4, 1],
	"BC2_UNORM_SRGB": [16, 4, 4, 1],
	"BC3_UNORM_SRGB": [16, 4, 4, 1],
	"BC4_SNORM": [8, 4, 4, 1],
	"BC6H_UF16": [16, 4, 4, 1],
	"ASTC_4x4_UNORM": [16, 4, 4, 1],
	"ASTC_8x8_UNORM": [16, 8, 8, 1],
	"ASTC_4x4_SRGB": [16, 4, 4, 1],
	"ASTC_8x8_SRGB": [16, 8, 8, 1]
}
// each one: bytesPerPixel, blockWidth, blockHeight, blockDepth, targetBuffer (but i removed targetBuffer)

function returnFormatTable(_format) {
	return formatTable[_format];
}


function pow2_round_up(x) {
	x -= 1;
	x |= x >> 1;
	x |= x >> 2;
	x |= x >> 4;
	x |= x >> 8;
	x |= x >> 16;
	return x + 1;
}

function DIV_ROUND_UP(n, d) {
	return Math.floor((n + d - 1) / d);
}

function subArray(data, offset, length) {
	return data.slice(offset, offset+length);
}

function round_up(x, y) {
	return ((x - 1) | (y - 1)) + 1;
}


function _swizzle(width, height, depth, blkWidth, blkHeight, blkDepth, roundPitch, bpp, tileMode, blockHeightLog2, data, toSwizzle) {
	block_height = 1 << blockHeightLog2

	width = DIV_ROUND_UP(width, blkWidth)
	height = DIV_ROUND_UP(height, blkHeight)
	depth = DIV_ROUND_UP(depth, blkDepth)
	var pitch;
	var surfSize;
	if (tileMode == 1) {
		if (roundPitch == 1) {
				pitch = round_up(width * bpp, 32)
		} else {
				pitch = width * bpp
		};
		surfSize = round_up(pitch * height, 32);
	} else {
		pitch = round_up(width * bpp, 64)
		surfSize = pitch * round_up(height, block_height * 8)
	}
	var result = new Uint8Array(surfSize)

	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			var pos;
			if (tileMode == 1) {
				pos = y * pitch + x * bpp
			} else {
				pos = getAddrBlockLinear(x, y, width, bpp, 0, block_height)
			}

			var pos_ = (y * width + x) * bpp

			if (pos + bpp <= surfSize) {
				if (toSwizzle == 1) {
				// NEED TO REPLACE THIS ---------------------------------
					data.slice(pos_, pos_ + bpp).map(function (item, index) {result[pos + index] = item})
				} else {
					data.slice(pos, pos + bpp).map(function (item, index) {result[pos_ + index] = item})
				}
	  }
	}
  }
	size = width * height * bpp
	return result.slice(0, size);
}

function deswizzle(width, height, depth, blkWidth, blkHeight, blkDepth, roundPitch, bpp, tileMode, size_range, data) {
	return _swizzle(width, height, depth, blkWidth, blkHeight, blkDepth, roundPitch, bpp, tileMode, size_range, bytes(data), 0);
}

function swizzle(width, height, blkWidth, blkHeight, bpp, tileMode, alignment, size_range, data) {
	return _swizzle(width, height, blkWidth, blkHeight, bpp, tileMode, alignment, size_range, bytes(data), 1);
}

function getAddrBlockLinear(x, y, image_width, bytes_per_pixel, base_address, block_height) {
	/*
	From the Tegra X1 TRM
	*/
	image_width_in_gobs = DIV_ROUND_UP(image_width * bytes_per_pixel, 64)

	GOB_address = (base_address
				   + Math.floor(y / (8 * block_height)) * 512 * block_height * image_width_in_gobs
				   + Math.floor(x * bytes_per_pixel / 64) * 512 * block_height
				   + Math.floor(y % (8 * block_height) / 8) * 512)

	x *= bytes_per_pixel

	Address = (GOB_address + Math.floor((x % 64) / 32) * 256 + Math.floor((y % 8) / 2) * 64
			   + Math.floor((x % 32) / 16) * 32 + (y % 2) * 16 + (x % 16))

	return Address
}


// get = true - getImageData | get = false - compressImageData
function getImageData(texture, imageData, arrayLevel, mipLevel, depthLevel, blockHeightLog2, get, target=1, linearTileMode=false) {
	var [bpp, blkWidth, blkHeight, blkDepth] = formatTable[texture._format]
	var blockHeight = DIV_ROUND_UP(texture.height, blkHeight)
	var pitch = 0
	var dataAlignment = 512
	var tileMode = 0
	if (linearTileMode == true) {
		tileMode = 1
	}
	var numDepth = 1;
	if (texture.depth > 1) {
		numDepth = texture.depth
	}
	var linesPerBlockHeight = (1 << int(blockHeightLog2)) * 8
	var arrayOffset = 0
	for (var depthLevel = 0; depthLevel < numDepth; depthLevel++) {
		for (var arrayLevel = 0; arrayLevel < texture.arrayCount; arrayLevel++) {
			var surfaceSize = 0
			var blockHeightShift = 0
			var mipOffsets = []
			for (var mipLevel = 0; mipLevel < texture.mipCount; mipLevel++) {
				var width = max(1, texture.width >> mipLevel)
				var height = max(1, texture.height >> mipLevel)
				var depth = max(1, texture.depth >> mipLevel)
				var size = DIV_ROUND_UP(width, blkWidth) * DIV_ROUND_UP(height, blkHeight) * bpp
				if (pow2_round_up(DIV_ROUND_UP(height, blkWidth)) < linesPerBlockHeight) {
					blockHeightShift += 1
				}
				width__ = DIV_ROUND_UP(width, blkWidth)
				height__ = DIV_ROUND_UP(height, blkHeight)

				// calculate the mip size instead
				alignedData = bytearray(round_up(surfaceSize, dataAlignment) - surfaceSize)
				surfaceSize += len(alignedData)
				mipOffsets.append(surfaceSize)

				// get the first mip offset and current one and the total image size
				msize = int((mipOffsets[0] + len(imageData) - mipOffsets[mipLevel]) / texture.arrayCount)
				
				data_ = subArray(imageData, arrayOffset + mipOffsets[mipLevel], msize)
				try {
					pitch = round_up(width__ * bpp, 64)
					surfaceSize += pitch * round_up(height__, max(1, blockHeight >> blockHeightShift) * 8)
					var result;
					if (get == true) { 
						result = deswizzle(width, height, depth, blkWidth, blkHeight, blkDepth, target, bpp, tileMode, max(0, blockHeightLog2 - blockHeightShift), data_)
								} else {
						result = swizzle(width, height, depth, blkWidth, blkHeight, blkDepth, target, bpp, tileMode, max(0, blockHeightLog2 - blockHeightShift), data_)
					}
		  			return result
				} catch {
					console.log("Failed to swizzle texture!")
				}
			arrayOffset += len(imageData) / texture.arrayCount
	  }
	}
  }
	return false;
}
