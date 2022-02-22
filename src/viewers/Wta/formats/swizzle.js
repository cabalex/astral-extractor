/* An attempt to emulate https://github.com/KillzXGaming/Switch-Toolbox/blob/604f7b3d369bc97d9d05632da3211ed11b990ba7/Switch_Toolbox_Library/Texture%20Decoding/Switch/TegraX1Swizzle.cs
 jesus christ i do not know how to write code
 copied from https://github.com/aboood40091/BNTX-Extractor/blob/master/swizzle.py

 Based on Ryujinx's image table 
 https://github.com/Ryujinx/Ryujinx/blob/c86aacde76b5f8e503e2b412385c8491ecc86b3b/Ryujinx.Graphics/Graphics3d/Texture/ImageUtils.cs
 A nice way to get bpp, block data, and buffer types for formats
*/
export const formatTable = {
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

export function returnFormatTable(_format) {
	return formatTable[_format]
}

function pow2_round_up(x) {
	x -= 1
	x |= x >> 1
	x |= x >> 2
	x |= x >> 4
	x |= x >> 8
	x |= x >> 16
	return x + 1
}

function DIV_ROUND_UP(n, d) {
	return Math.floor((n + d - 1) / d)
}

function subArray(data, offset, length) {
	return data.slice(offset, offset + length);
}

function round_up(x, y) {
	return ((x - 1) | (y - 1)) + 1
}


function _swizzle(width, height, depth, blkWidth, blkHeight, blkDepth, roundPitch, bpp, tileMode, blockHeightLog2, data, toSwizzle) {
	let block_height = 1 << blockHeightLog2
    
    let pitch, surfSize;

	width = DIV_ROUND_UP(width, blkWidth);
	height = DIV_ROUND_UP(height, blkHeight);
	depth = DIV_ROUND_UP(depth, blkDepth);

	if (tileMode == 1) {
        pitch = (roundPitch == 1 ? round_up(width * bpp, 32) : width * bpp)
		surfSize = round_up(pitch * height, 32)
    } else {
		pitch = round_up(width * bpp, 64)
		surfSize = pitch * round_up(height, block_height * 8)
    }

	let result = new Uint8Array(surfSize)

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
            let pos = (
                tileMode == 1 ?
                    y * pitch + x * bpp :
                    getAddrBlockLinear(x, y, width, bpp, 0, block_height)
            )

			let pos_ = (y * width + x) * bpp

			if (pos + bpp <= surfSize) {
				if (toSwizzle == 1) {
                    for (let i = 0; i < bpp; i++) {
                        result[pos + i] = data[pos_ + i]
                    }

                } else {
                    for (let i = 0; i < bpp; i++) {
                        result[pos_ + i] = data[pos + i]
                    }
                }
            }
        }
    }
	return result.slice(0, width * height * bpp).buffer;
}

//def deswizzle(width, height, blkWidth, blkHeight, bpp, tileMode, alignment, size_range, data):
export function deswizzle(width, height, depth, blkWidth, blkHeight, blkDepth, roundPitch, bpp, tileMode, size_range, data) {
	return _swizzle(width, height, depth, blkWidth, blkHeight, blkDepth, roundPitch, bpp, tileMode, size_range, data, 0)
	//return _swizzle(width, height, blkWidth, blkHeight, bpp, tileMode, alignment, size_range, data, 0)
}

export function swizzle(width, height, blkWidth, blkHeight, bpp, tileMode, alignment, size_range, data) {
	return _swizzle(width, height, blkWidth, blkHeight, bpp, tileMode, alignment, size_range, new Uint8Array(data), 1)
}

export function getAddrBlockLinear(x, y, image_width, bytes_per_pixel, base_address, block_height) {
	/*
	From the Tegra X1 TRM
	*/
	let image_width_in_gobs = DIV_ROUND_UP(image_width * bytes_per_pixel, 64)

	let GOB_address = (base_address
				   + Math.floor(y / (8 * block_height)) * 512 * block_height * image_width_in_gobs
				   + Math.floor(x * bytes_per_pixel / 64) * 512 * block_height
				   + Math.floor(y % (8 * block_height) / 8) * 512)

	x *= bytes_per_pixel

	return (GOB_address + Math.floor((x % 64) / 32) * 256 + Math.floor((y % 8) / 2) * 64
			   + Math.floor((x % 32) / 16) * 32 + (y % 2) * 16 + (x % 16))

}

export function getImageData(texture, imageData, blockHeightLog2, arrayLevel=0, mipLevel=0, depthLevel=0, target=1, linearTileMode=false) {
	let [bpp, blkWidth, blkHeight, blkDepth] = formatTable[texture.info.format];
	let blockHeight = DIV_ROUND_UP(texture.info.height, blkHeight),
	    pitch = 0,
	    dataAlignment = 512,
        tileMode = (linearTileMode ? 1 : 0),
        numDepth = (texture.info.depth > 1 ? texture.info.depth : 1),
	    linesPerBlockHeight = (1 << Math.round(blockHeightLog2)) * 8,
	    arrayOffset = 0;
    
	for (depthLevel; depthLevel < numDepth; depthLevel++) {
		for (arrayLevel; arrayLevel < texture.info.arrayCount; arrayLevel++) {
			let surfaceSize = 0,
			    blockHeightShift = 0,
			    mipOffsets = []
            
			for (mipLevel = 0; mipLevel < texture.info.mipMapCount; mipLevel++) {
				let width = Math.max(1, texture.info.width >> mipLevel),
				    height = Math.max(1, texture.info.height >> mipLevel),
				    depth = Math.max(1, texture.info.depth >> mipLevel)
				
                if (pow2_round_up(DIV_ROUND_UP(height, blkWidth)) < linesPerBlockHeight)
					blockHeightShift++;

				let width__ = DIV_ROUND_UP(width, blkWidth)
				let height__ = DIV_ROUND_UP(height, blkHeight)

				// calculate the mip size instead
				surfaceSize += round_up(surfaceSize, dataAlignment) - surfaceSize;
				mipOffsets.push(surfaceSize)

				// get the first mip offset and current one and the total image size
				let msize = Math.round((mipOffsets[0] + imageData.byteLength - mipOffsets[mipLevel]) / texture.info.arrayCount)
				
				let data_ = subArray(new Uint8Array(imageData), arrayOffset + mipOffsets[mipLevel], msize)
				try {
					pitch = round_up(width__ * bpp, 64)
					surfaceSize += pitch * round_up(height__, Math.max(1, blockHeight >> blockHeightShift) * 8)
					return deswizzle(width, height, depth, blkWidth, blkHeight, blkDepth, target, bpp, tileMode, Math.max(0, blockHeightLog2 - blockHeightShift), data_)

					// the program creates a copy and uses that to remove unneeded data
					// yeah, i'm not doing that
                } catch(error) {
					console.error("Failed to swizzle texture!", error);
					return false;
                }
            }
			arrayOffset += len(imageData) / texture.arrayCount
        }
    }
	return false
}

export function compressImageData(texture, imageData, blockHeightLog2, arrayLevel=0, mipLevel=0, depthLevel=0, target=1, linearTileMode=false) {
	let [bpp, blkWidth, blkHeight, blkDepth] = formatTable[texture.info.format];
	let blockHeight = DIV_ROUND_UP(texture.info.height, blkHeight),
	    pitch = 0,
	    dataAlignment = 512,
        tileMode = (linearTileMode ? 1 : 0),
        numDepth = (texture.info.depth > 1 ? texture.info.depth : 1),
	    linesPerBlockHeight = (1 << Math.round(blockHeightLog2)) * 8
	    arrayOffset = 0;
    
	for (depthLevel; depthLevel < numDepth; depthLevel++) {
		for (arrayLevel; arrayLevel < texture.arrayCount; arrayLevel++) {
			let surfaceSize = 0,
			    blockHeightShift = 0,
			    mipOffsets = []
            
			for (mipLevel = 0; mipLevel < texture.info.mipMapCount; mipLevel++) {
				let width = Math.max(1, texture.info.width >> mipLevel),
				    height = Math.max(1, texture.info.height >> mipLevel),
				    depth = Math.max(1, texture.info.depth >> mipLevel)
				
                if (pow2_round_up(DIV_ROUND_UP(height, blkWidth)) < linesPerBlockHeight)
					blockHeightShift++;

				let width__ = DIV_ROUND_UP(width, blkWidth)
				let height__ = DIV_ROUND_UP(height, blkHeight)

				// calculate the mip size instead
				surfaceSize += round_up(surfaceSize, dataAlignment) - surfaceSize;
				mipOffsets.push(surfaceSize)

				// get the first mip offset and current one and the total image size
				let msize = Math.round((mipOffsets[0] + imageData.byteLength - mipOffsets[mipLevel]) / texture.info.arrayCount)
				
				let data_ = subArray(imageData, arrayOffset + mipOffsets[mipLevel], msize)
				try {
					pitch = round_up(width__ * bpp, 64)
					surfaceSize += pitch * round_up(height__, max(1, blockHeight >> blockHeightShift) * 8)
					return swizzle(width, height, depth, blkWidth, blkHeight, blkDepth, target, bpp, tileMode, Math.max(0, blockHeightLog2 - blockHeightShift), data_)

					// the program creates a copy and uses that to remove unneeded data
					// yeah, i'm not doing that
                } catch(error) {
					console.error("Failed to swizzle texture!", error);
					return false;
                }
            }
			arrayOffset += len(imageData) / texture.arrayCount
        }
    }
	return false
}