// Handling of previewing model files.


function bufferToHex (buffer) {
	return [...new Uint8Array (buffer)]
		.map (b => b.toString (16).padStart (2, "0"))
		.join ("");
}

class WMB_Header {
	// to quote the greats of NieR modelling: "fucking header"
	constructor(arrayBuffer) {
		var header32Arr = new Uint32Array(arrayBuffer)
		if (header32Arr[0] == 859983191) {
			// WMB3
			// 35 headers total
			[this.magic, this.version, this.unknown08, this.flags,
			this.boundingBox1, this.boundingBox2, this.boundingBox3, this.boundingBox4,
			this.boundingBox5, this.boundingBox6, this.boneArrayOffset, this.boneCount,
			this.offsetBoneIndexTranslateTable, this.boneIndexTranslateTableSize, this.vertexGroupArrayOffset, this.vertexGroupCount,
			this.meshArrayOffset, this.meshCount, this.meshGroupInfoArrayHeaderOffset, this.meshGroupInfoArrayCount,
			this.colTreeNodesOffset, this.colTreeNodesCount, this.boneMapOffset, this.boneMapCount,
			this.bonesetOffset, this.bonesetCount, this.materialArrayOffset, this.materialCount,
			this.meshGroupOffset, this.meshGroupCount, this.offsetMeshMaterials, this.numMeshMaterials,
			this.unknownWorldDataArrayOffset, this.unknownWorldDataArrayCount, this.unknown8C] = new Uint32Array(arrayBuffer)
			// sike! these are floats
			this.boundingBoxXYZ = new Float32Array(arrayBuffer.slice(16, 28))
			this.boundingBoxUVW = new Float32Array(arrayBuffer.slice(28, 40))
		}
	}
}

class wmb3_mesh {
	constructor(arrayBuffer) {
		[this.vertexGroupIndex, this.bonesetIndex, this.vertexStart, this.faceStart,
		this.vertexCount, this.faceCount, this.unknown18] = new Uint32Array(arrayBuffer)
	}
}

class wmb3_bone {
	constructor(arrayBuffer, i) {
		this.boneIndex = i;
		var bone32Arr = new Float32Array(arrayBuffer.slice(4));
		[this.boneNumber, this.parentIndex] = new Int16Array(arrayBuffer.slice(0, 4))

		this.local_position = bone32Arr.slice(0, 3);
		this.local_rotation = bone32Arr.slice(3, 6);
		[this.local_scaleX, this.local_scaleY, this.local_scaleZ] = bone32Arr.slice(6, 9);

		this.world_position = bone32Arr.slice(9, 12);
		this.world_rotation = bone32Arr.slice(12, 15);
		this.world_scale = bone32Arr.slice(15, 18);

		this.world_position_tpose = bone32Arr.slice(18, 21);
	}
}

class wmb3_boneSet {
	constructor(arrayBuffer, pos, boneSetCount) {
		this.boneSetArray = [];
		this.boneSetCount = boneSetCount;
		for (var i = 0; i < boneSetCount; i++) {
			var [offset, count] = new Uint32Array(arrayBuffer.slice(pos+i*8, pos+(i+1)*8))
			this.boneSetArray.push(new Uint16Array(arrayBuffer.slice(offset, offset+count*2)))
		}
	}
}


class wmb3_material {
	constructor(arrayBuffer, pos) {
		var enc = new TextDecoder("utf-8")
		var [materialNameOffset, effectNameOffset, techniqueNameOffset, unk, textureOffset, textureNum, parameterGroupsOffset,
		numParameterGroups, varOffset, varNum] = new Uint32Array(arrayBuffer.slice(pos+8, pos+48))
		this.materialName = enc.decode(arrayBuffer.slice(materialNameOffset, materialNameOffset+256))
		this.effectName = enc.decode(arrayBuffer.slice(effectNameOffset, effectNameOffset+256))
		this.techniqueName = enc.decode(arrayBuffer.slice(techniqueNameOffset, techniqueNameOffset+256))

		this.textureArray = {}
		for (var i = 0; i < textureNum; i++) {
			var [offset, identifier] = new Uint32Array(arrayBuffer.slice(textureOffset + i*8, textureOffset + (i+1)*8))
			var identifier = identifier.toString(16);
			this.textureArray[enc.decode(arrayBuffer.slice(offset, offset+256))] = identifier
		}

		this.parameterGroups = [];
		for (var i = 0; i < numParameterGroups; i++) {
			var [index, offset, num] = new Uint32Array(arrayBuffer.slice(parameterGroupsOffset + i*12, parameterGroupsOffset + (i+1)*12))
			this.parameterGroups.push(new Float32Array(arrayBuffer.slice(offset, offset+num*4)))
		}

		this.uniformArray = {};
		for (var i = 0; i < varNum; i++) {
			// too lazy to make dataviews
			var offset = new Uint32Array(arrayBuffer.slice(varOffset + i*8, varOffset + (i+1)*8))[0]
			var value = new Float32Array(arrayBuffer.slice(varOffset + i*8, varOffset + (i+1)*8))[1]
			var identifier = identifier.toString(16);
			this.textureArray[enc.decode(arrayBuffer.slice(offset, offset+256))] = value;
		}
	}
}

class wmb3_vertexHeader {
	constructor(arrayBuffer) {
		[this.vertexArrayOffset, this.vertexExDataArrayOffset, this.unknown08, this.unknown0C,
		this.vertexStride, this.vertexExDataStride, this.unknown18, this.unknown1C,
		this.vertexCount, this.vertexFlags, this.faceArrayOffset, this.faceCount] = new Uint32Array(arrayBuffer);
	}
}
class wmb3_vertexExData {
	constructor(arrayBuffer, vertex_flags) {
		var float16Arr = new Float16Array(arrayBuffer)
		if ([1, 4].includes(vertex_flags)) {
			this.normal = bufferToHex(arrayBuffer.slice(0, 8))
			this.posLength = 8;
		} else if ([5].includes(vertex_flags)) {
			this.normal = bufferToHex(arrayBuffer.slice(0, 8))
			this.textureU3 = float16Arr[4]
			this.textureV3 = float16Arr[5]
			this.posLength = 12;
		} else if ([7].includes(vertex_flags)) {
			this.textureU2 = float16Arr[0];
			this.textureV2 = float16Arr[1];
			this.normal = bufferToHex(arrayBuffer.slice(4, 12))
			this.posLength = 12;
		} else if ([10].includes(vertex_flags)) {
			this.textureU2 = float16Arr[0];
			this.textureV2 = float16Arr[1];
			this.color = new Uint8Array(arrayBuffer.slice(4, 8))
			this.normal = bufferToHex(arrayBuffer.slice(8, 16))
			this.posLength = 16;
		} else if ([11].includes(vertex_flags)) {
			this.textureU2 = float16Arr[0];
			this.textureV2 = float16Arr[1];
			this.color = new Uint8Array(arrayBuffer.slice(4, 8))
			this.normal = bufferToHex(arrayBuffer.slice(8, 16))
			this.textureU3 = float16Arr[8]
			this.textureV3 = float16Arr[9]
			this.posLength = 20;
		} else if ([12].includes(vertex_flags)) {
			this.normal = bufferToHex(arrayBuffer.slice(0, 8))
			this.textureU3 = float16Arr[4]
			this.textureV3 = float16Arr[5]
			this.textureU4 = float16Arr[6]
			this.textureV4 = float16Arr[7]
			this.textureU5 = float16Arr[8]
			this.textureV5 = float16Arr[9]
			this.posLength = 20;
		} else if ([14].includes(vertex_flags)) {
			this.normal = bufferToHex(arrayBuffer.slice(0, 8))
			this.textureU3 = float16Arr[4]
			this.textureV3 = float16Arr[5]
			this.textureU4 = float16Arr[6]
			this.textureV4 = float16Arr[7]
			this.posLength = 14;
		}
	}
}

class wmb3_vertex {
	constructor(arrayBuffer, vertex_flags) {
		var view = new DataView(arrayBuffer)
		this.positionX = view.getFloat32(0, true)
		this.positionY = view.getFloat32(4, true)
		this.positionZ = view.getFloat32(8, true)

		this.normalX = view.getUint8(12, true) * 2 / 255
		this.normalY = view.getUint8(13, true) * 2 / 255
		this.normalZ = view.getUint8(14, true) * 2 / 255
		// 1 byte padding
		this.textureU = view.getUint16(16, true);
		this.textureV = view.getUint16(18, true);
		var pos = 20
		if ([0].includes(vertex_flags)) {
			this.normal = bufferToHex(new Uint8Array(arrayBuffer.slice(20, 28)))
			pos += 8
		}
		if ([1, 4, 5, 12, 14].includes(vertex_flags)) {
			this.textureU2 = view.getUint16(pos, true);
			this.textureV2 = view.getUint16(pos+2, true);
			pos += 4;
		}
		if ([7, 10, 11].includes(vertex_flags)) {
			this.boneIndices = new Uint8Array(arrayBuffer.slice(pos, pos+4))
			this.boneWeights = [];
			var tmpArr = new Uint8Array(arrayBuffer.slice(pos+4, pos+8))
			for (var i = 0; i < 4; i++) {
				this.boneWeights.push(tmpArr[i]/255)
			}
			pos += 8
		}
		if ([4, 5, 12, 14].includes(vertex_flags)) {
			this.color = new Uint8Array(arrayBuffer.slice(pos, pos+4));
			pos += 4;
		}
		this.posLength = pos;
	}
}

class wmb3_vertexGroup {
	constructor(arrayBuffer, faceSize, pos) {
		this.faceSize = faceSize;
		this.vertexGroupHeader = new wmb3_vertexHeader(arrayBuffer.slice(pos, pos+48));

		this.vertexFlags = this.vertexGroupHeader.vertexFlags;

		this.vertexArray = []
		var pos = this.vertexGroupHeader.vertexArrayOffset;
		for (var vertex_index = 0; vertex_index < this.vertexGroupHeader.vertexCount; vertex_index++) {
			var vertex = new wmb3_vertex(arrayBuffer.slice(pos, pos+128), this.vertexGroupHeader.vertexFlags)
			this.vertexArray.push(vertex);
			pos += vertex.posLength;
		}

		this.vertexesExDataArray = []
		pos = this.vertexGroupHeader.vertexExDataArrayOffset;
		for (var vertexIndex = 0; vertexIndex < this.vertexGroupHeader.vertexCount; vertexIndex++) {
			var vertexExData = new wmb3_vertexExData(arrayBuffer.slice(pos, pos+128), this.vertexGroupHeader.vertexFlags)
			this.vertexesExDataArray.push(vertexExData);
			pos += vertexExData.posLength;
		}

		this.faceRawArray = []
		pos = this.vertexGroupHeader.faceArrayOffset;
		for (var face_index = 0; face_index < this.vertexGroupHeader.faceCount; face_index++) {
			if (this.faceSize == 2) {
				this.faceRawArray.push(new Uint16Array(arrayBuffer.slice(pos, pos+2))[0] + 1)
				pos += 2;
			} else {
				this.faceRawArray.push(new Uint32Array(arrayBuffer.slice(pos, pos+4))[0] + 1)
				pos += 4;
			}
		}
	}
}

class wmb3_groupedMesh {
	constructor(arrayBuffer) {
		var uint32Arr = new Uint32Array(arrayBuffer)
		this.vertexGroupIndex = uint32Arr[0]
		this.meshGroupIndex = uint32Arr[1]
		this.materialIndex = uint32Arr[2]
		this.colTreeNodeIndex = uint32Arr[3]
		if (this.colTreeNodeIndex == 4294967295) {
			this.colTreeNodeIndex = -1
		}
		this.meshGroupInfoMaterialPair = uint32Arr[4]
		this.unknownWorldDataIndex = uint32Arr[5]
		if (this.unknownWorldDataIndex == 4294967295) {	
			this.unknownWorldDataIndex = -1
		}
	}
}

class wmb3_meshGroupInfo {
	constructor(arrayBuffer, pos) {
		var meshGroupInfoOffset;
		[this.nameOffset, this.lodLevel, this.meshStart, meshGroupInfoOffset, this.meshCount] = new Uint32Array(arrayBuffer.slice(pos, pos+20));
		if (this.lodLevel == 4294967295) {	
			this.lodLevel = -1
		}
		var enc = new TextDecoder("utf-8")
		this.meshGroupInfoname = enc.decode(arrayBuffer.slice(this.nameOffset, this.nameOffset+256)).split("\x00")[0]
		this.groupedMeshArray = []
		for (var i = 0; i < this.meshCount; i++) {
			this.groupedMeshArray.push(new wmb3_groupedMesh(arrayBuffer.slice(meshGroupInfoOffset+24*i, meshGroupInfoOffset+24*(i+1))))
		}
	}
}

class wmb3_colTreeNode {
	constructor(arrayBuffer) {
		this.p1 = new Float32Array(arrayBuffer.slice(0, 12));
		this.p2 = new Float32Array(arrayBuffer.slice(12, 24));
		[this.left, this.right] = new Uint32Array(arrayBuffer.slice(24, 32))
		if (this.left == 4294967295) {
			this.left = -1;
		}
		if (this.right == 4294967295) {
			this.right = -1;
		}
	}
}

class wmb3_worldData {
	constructor(arrayBuffer) {
		this.unknownWorldData = arrayBuffer
	}
}

class wmb3_meshGroup {
	constructor(arrayBuffer, pos) {
		var uint32Arr = new Uint32Array(arrayBuffer.slice(pos, pos+0x2c))
		var nameOffset = uint32Arr[0]
		this.boundingBox = new Float32Array(arrayBuffer.slice(4, 28))							
		var materialIndexArrayOffset = uint32Arr[7]
		var materialIndexArrayCount = uint32Arr[8]
		var boneIndexArrayOffset = uint32Arr[9]
		var boneIndexArrayCount = uint32Arr[10]
		var enc = new TextDecoder("utf-8")
		this.meshGroupname = enc.decode(arrayBuffer.slice(nameOffset, nameOffset+256)).split("\x00")[0]
		this.materialIndexArray = new Uint16Array(arrayBuffer.slice(materialIndexArrayOffset, materialIndexArrayOffset+(materialIndexArrayCount*2)))
		this.boneIndexArray = new Uint16Array(arrayBuffer.slice(boneIndexArrayOffset, boneIndexArrayOffset+(boneIndexArrayCount*2)))
	}
}

class WMB3 {
	constructor(arrayBuffer) {
		this.wmb_fp = arrayBuffer;
		this.wta_fp;
		this.wtp_fp;
		this.wta;
		// todo: implement wta/wtp
		if (this.wta_fp) {
			// todo
		}
		this.wmb3_header = new WMB_Header(arrayBuffer.slice(0, 144))
		this.hasBone = false;
		if (this.wmb3_header.boneCount > 0) {
			this.hasBone = true;
		}
		var pos = this.wmb3_header.boneArrayOffset;
		this.boneArray = [];
		for (var i = 0; i < this.wmb3_header.boneCount; i++) {
			this.boneArray.push(new wmb3_bone(arrayBuffer.slice(pos, pos+88), i))
			pos += 88;
		}
		// indexBoneTranslateTable
		pos = this.wmb3_header.offsetBoneIndexTranslateTable;
		var firstLevel_Entry_Count = 0
		this.firstLevel = new Int16Array(arrayBuffer.slice(pos, pos+32));
		for (var i = 0; i < 16; i++) {
			if (this.firstLevel[i] != -1) {
				firstLevel_Entry_Count += 1
			}
			pos += 2
		}

		var secondLevel_Entry_Count = 0
		this.secondLevel = new Int16Array(arrayBuffer.slice(pos, pos+(firstLevel_Entry_Count*32)));
		for (var i = 0; i < (firstLevel_Entry_Count * 16); i++) {
			if (this.secondLevel[i] != -1) {
				secondLevel_Entry_Count += 1
			}
			pos += 2
		}

		this.thirdLevel = new Int16Array(arrayBuffer.slice(pos, pos+(secondLevel_Entry_Count*32)));
		for (var i = 0; i < (secondLevel_Entry_Count * 16); i++) {
			pos += 2
		}
		// offsetBoneIndexTranslateTable
		pos = this.wmb3_header.offsetBoneIndexTranslateTable;
		// var unknownData1Array = new Uint8Array(arrayBuffer.slice(pos, pos+this.wmb3_header.boneIndexTranslateTableSize))
		pos += this.wmb3_header.boneIndexTranslateTableSize;
		this.vertexGroupArray = [];
		for (var i = 0; i < this.wmb3_header.vertexGroupCount; i++) {
			this.vertexGroupArray.push(new wmb3_vertexGroup(arrayBuffer, ((this.wmb3_header.flags & 0x08) && 4 || 2), this.wmb3_header.vertexGroupArrayOffset + 0x30 * i)) // might not work in JS?
			console.log(`[${i+1}/${this.wmb3_header.vertexGroupCount}] Building vertex groups`)
		}

		this.meshArray = [];
		pos = this.wmb3_header.meshArrayOffset;
		for (var i = 0; i < this.wmb3_header.meshCount; i++) {
			this.meshArray.push(new wmb3_mesh(arrayBuffer.slice(pos, pos+28)))
			pos += 28
		}

		this.meshGroupInfoArray = []
		for (var i = 0; i < this.wmb3_header.meshGroupInfoArrayCount; i++) {
			pos = this.wmb3_header.meshGroupInfoArrayHeaderOffset + i * 0x14
			this.meshGroupInfoArray.push(new wmb3_meshGroupInfo(arrayBuffer, pos)) // for some reason i ported this incorrectly whoops
		}
		this.meshGroupArray = []
		for (var i = 0; i < this.wmb3_header.meshGroupCount; i++) {
			pos = this.wmb3_header.meshGroupOffset + i * 0x2c
			this.meshGroupArray.push(new wmb3_meshGroup(arrayBuffer, pos))
		}
		this.materialArray = []
		for (var i = 0; i < this.wmb3_header.materialCount; i++) {
			this.materialArray.push(new wmb3_material(arrayBuffer, this.wmb3_header.materialArrayOffset + i * 0x30))
		}
		
		this.boneMap = new Uint32Array(arrayBuffer.slice(this.wmb3_header.boneMapOffset, this.wmb3_header.boneMapOffset + this.wmb3_header.boneMapCount*4))
		
		this.boneSetArray = new wmb3_boneSet(arrayBuffer, this.wmb3_header.bonesetOffset, this.wmb3_header.bonesetCount).boneSetArray
		
		// colTreeNode
		this.hasColTreeNodes = false
		if (this.wmb3_header.colTreeNodesOffset > 0) {
			this.hasColTreeNodes = true;
			this.colTreeNodes = [];
			for (var i = 0; i < this.wmb3_header.colTreeNodesCount; i++) {
				this.colTreeNodes.append(new wmb3_colTreeNode(arrayBuffer.slice(this.wmb3_header.colTreeNodesOffset+i*32, this.wmb3_header.colTreeNodesOffset+(i+1)*32)))
			}
		}
		
		// World Model Data
		this.hasUnknownWorldData = false;
		if (this.wmb3_header.unknownWorldDataArrayOffset > 0) {
			this.hasUnknownWorldData = true;
			this.unknownWorldDataArray = [];
			for (var i = 0; i < this.wmb3_header.unknownWorldDataArrayCount; i++) {
				this.unknownWorldDataArray.append(new wmb3_worldData(arrayBuffer.slice(this.wmb3_header.unknownWorldDataArrayOffset+i*24, this.wmb3_header.unknownWorldDataArrayOffset+(i+1)*24)))
			}
		}
		console.log("WMB3 parsed successfully! (I think.)")
	}

	clear_unused_vertex(meshArrayIndex, vertexGroupIndex) {
		var mesh = this.meshArray[meshArrayIndex]
		var faceRawStart = mesh.faceStart
		var faceRawCount = mesh.faceCount
		var vertexStart = mesh.vertexStart
		var vertexCount = mesh.vertexCount

		var vertexesExDataArray = this.vertexGroupArray[vertexGroupIndex].vertexesExDataArray
		var vertexesExData = vertexesExDataArray.slice(vertexStart, vertexStart + vertexCount)

		var vertex_colors = []

		var faceRawArray = this.vertexGroupArray[vertexGroupIndex].faceRawArray
		var facesRaw = faceRawArray.slice(faceRawStart, faceRawStart + faceRawCount).map(function(index){return index-1})
		var usedVertexIndexArray = [...new Set(facesRaw)].sort((a,b)=>a-b);
		var mappingDict = {}
		for (var newIndex = 0; newIndex < usedVertexIndexArray.length; newIndex++) {
			mappingDict[usedVertexIndexArray[newIndex]] = newIndex
		}
		for (var i = 0; i < facesRaw.length; i++) {
			facesRaw[i] = mappingDict[facesRaw[i]]
		}
		var faces = new Array(Math.round(faceRawCount / 3)).fill(0)
		var usedVertices = new Array(usedVertexIndexArray.length).fill(0)
		var boneWeightInfos = [[],[]]
		for (var i = 0; i < faceRawCount; i += 3) {
			faces[Math.round(i/3)] = [facesRaw[i]  , facesRaw[i + 1]  , facesRaw[i + 2] ]
		}
		var meshVertices = this.vertexGroupArray[vertexGroupIndex].vertexArray

		if (this.hasBone == true) {
			var boneWeightInfos = new Array(usedVertexIndexArray.length).fill(0);
		}
		for (var newIndex = 0; newIndex < usedVertexIndexArray.length; newIndex++) {
			var i = usedVertexIndexArray[newIndex]
			usedVertices[newIndex] = [meshVertices[i].positionX, meshVertices[i].positionY, meshVertices[i].positionZ]
			// Vertex_Colors are stored in VertexData
			if ([4, 5, 12, 14].includes(this.vertexGroupArray[vertexGroupIndex].vertexFlags)) {
				vertex_colors.push(meshVertices[i].color)
			}
			// Vertex_Colors are stored in VertexExData
			if ([10, 11].includes(this.vertexGroupArray[vertexGroupIndex].vertexFlags)) {
				vertex_colors.push(vertexesExData[i].color)
			}

			if (this.hasBone == true) {
				var bonesetIndex = mesh.bonesetIndex
				var boneSetArray = this.boneSetArray
				var boneMap = this.boneMap
				if (bonesetIndex < 0xffffffff) {
					var boneSet = boneSetArray[bonesetIndex]
					var boneIndices = meshVertices[i].boneIndices.map(function(index){return boneMap[boneSet[index]]})
					boneWeightInfos[newIndex] = [boneIndices, meshVertices[i].boneWeights]
					var s = meshVertices[i].boneWeights.reduce((a, b) => a + b, 0) 
					if (s > 1.000000001 || s < 0.999999) {
						console.log(`[-] error weight detect ${s}`, meshVertices[i].boneWeights)
					} 
				} else {
					this.hasBone = false
				}
			}
		}
		return [usedVertices, faces, usedVertexIndexArray, boneWeightInfos, vertex_colors];
	}
}
function format_wmb_mesh(wmb, gltf) {
	var meshes = [];
	var uvMaps = [[], [], [], [], []];
	var usedVerticeIndexArrays = [];
	var mesh_array = wmb.mesh_array
	function uvmapper1(vertex) {return [vertex.textureU, 1 - vertex.textureV];}
	function uvmapper2(vertex) {return [vertex.textureU2, 1 - vertex.textureV2];}
	function uvmapper3(vertex) {return [vertex.textureU3, 1 - vertex.textureV3];}
	function uvmapper3(vertex) {return [vertex.textureU4, 1 - vertex.textureV4];}
	function uvmapper3(vertex) {return [vertex.textureU5, 1 - vertex.textureV5];}
	// each vertexgroup -> each lod -> each group -> mesh
	var finalArr = new ArrayBuffer();
	for (var vertexGroupIndex = 0; vertexGroupIndex < wmb.wmb3_header.vertexGroupCount; vertexGroupIndex++) {
		var vertex_flags = wmb.vertexGroupArray[vertexGroupIndex].vertexFlags

		if ([0].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			try {
				uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper2))
			} catch { // May not always have a second UV
				uvMaps[1].push(null)
			}
			uvMaps[2].push(null)
			uvMaps[3].push(null)
			uvMaps[4].push(null)
		}
		if ([1, 4].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper2))
			uvMaps[2].push(null)
			uvMaps[3].push(null)
			uvMaps[4].push(null)
		}
		if ([5].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper2))
			uvMaps[2].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper3))
			uvMaps[3].push(null)
			uvMaps[4].push(null)
		}
		if ([7, 10].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper2))
			uvMaps[2].push(null)
			uvMaps[3].push(null)
			uvMaps[4].push(null)
		}
		if ([11].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper2))
			uvMaps[2].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper3))
			uvMaps[3].push(null)
			uvMaps[4].push(null)
		}
		if ([12].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper2))
			uvMaps[2].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper3))
			uvMaps[3].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper4))
			uvMaps[4].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper5))
		}
		if ([14].includes(vertex_flags)) {
			uvMaps[0].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper1))
			uvMaps[1].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper2))
			uvMaps[2].push(wmb.vertexGroupArray[vertexGroupIndex].vertexesExDataArray.map(uvmapper3))
			uvMaps[3].push(wmb.vertexGroupArray[vertexGroupIndex].vertexArray.map(uvmapper4))
			uvMaps[4].push(null)
		}
		// set up crap
		// alright lets do this
		for (var meshGroupInfoArrayIndex = 0; meshGroupInfoArrayIndex < wmb.meshGroupInfoArray.length; meshGroupInfoArrayIndex++) {
			var meshGroupInfo =  wmb.meshGroupInfoArray[meshGroupInfoArrayIndex]
			var groupedMeshArray = meshGroupInfo.groupedMeshArray
			var mesh_start = meshGroupInfo.meshStart
			var LOD_name = meshGroupInfo.meshGroupInfoname
			var LOD_level = meshGroupInfo.lodLevel
			var meshesToPush = [];
			for (var meshGroupIndex = 0; meshGroupIndex < wmb.wmb3_header.meshGroupCount; meshGroupIndex++) {
				var meshIndexArray = []
				for (var groupedMeshIndex = 0; groupedMeshIndex < groupedMeshArray.length; groupedMeshIndex++) {
					if (groupedMeshArray[groupedMeshIndex].meshGroupIndex == meshGroupIndex) {
						meshIndexArray.push([mesh_start + groupedMeshIndex, groupedMeshArray[groupedMeshIndex].colTreeNodeIndex, groupedMeshArray[groupedMeshIndex].unknownWorldDataIndex])
					}
				}
				meshGroup = wmb.meshGroupArray[meshGroupIndex]
				for (const meshArrayData of meshIndexArray) {
					var meshArrayIndex = meshArrayData[0]
					var colTreeNodeIndex = meshArrayData[1]
					var unknownWorldDataIndex = meshArrayData[2]
					var meshVertexGroupIndex = wmb.meshArray[meshArrayIndex].vertexGroupIndex
					if (meshVertexGroupIndex == vertexGroupIndex) {
						var meshName = `${meshArrayIndex}-${meshGroup.meshGroupname}-${vertexGroupIndex}`
						var meshInfo = wmb.clear_unused_vertex(meshArrayIndex, meshVertexGroupIndex)
						var vertices = meshInfo[0]
						var faces =  meshInfo[1]
						var usedVerticeIndexArray = meshInfo[2]
						var boneWeightInfoArray = meshInfo[3]
						var vertex_colors = meshInfo[4]
						usedVerticeIndexArrays.push(usedVerticeIndexArray)
						var flag = false
						var has_bone = wmb.hasBone
						var boneSetIndex = wmb.meshArray[meshArrayIndex].bonesetIndex
						if (boneSetIndex == 0xffffffff) {
							boneSetIndex = -1
						}
						boundingBox = meshGroup.boundingBox
						/*obj = construct_mesh([meshName, vertices, faces, has_bone, boneWeightInfoArray, boneSetIndex, meshGroupIndex, vertex_colors, LOD_name, LOD_level, colTreeNodeIndex, unknownWorldDataIndex, boundingBox], collection_name)
						meshes.push(obj)*/
						
						// Mesh construction (i have some clue what i am doing)
						//console.log(`[+] Importing ${meshName}`)
						var [finalArr, faceoffset, gltf] = addDataToBuffer(gltf, finalArr, faces, "faces")
						var [finalArr, vertoffset, gltf] = addDataToBuffer(gltf, finalArr, vertices, "vertices")
						//var [finalArr, vertoffset, gltf] = addDataToBuffer(gltf, finalArr, uvMaps[0], "texcoord")
						gltf['meshes'].push(
						{
							'name': meshName,
							'id': meshArrayIndex,
							"primitives": [{
								'attributes': {"POSITION": gltf['accessors'].length-1},//, "TEXCOORD_0": gltf['accessors'].length-1},
								'indices': gltf['accessors'].length-2,
								//'material': 0
							}]
						})
						if (wmb.hasBone) {
							var [finalArr, faceoffset, gltf] = addDataToBuffer(gltf, finalArr, boneWeightInfoArray.map(k => k[0]), "joints");
							gltf['meshes'][gltf['meshes'].length-1]['primitives'][0]['attributes']['JOINTS_0'] = gltf['accessors'].length-1;
							var [finalArr, vertoffset, gltf] = addDataToBuffer(gltf, finalArr, boneWeightInfoArray.map(k => k[1]), "weights");
							gltf['meshes'][gltf['meshes'].length-1]['primitives'][0]['attributes']['WEIGHTS_0'] = gltf['accessors'].length-1;
						}
					}
				}
			}
		}
	}
	//return [meshes, uvMaps, usedVerticeIndexArrays]
	//let b64 = btoa(String.fromCharCode(...new Uint8Array(finalArr)))
	//gltf["buffers"].push({"uri": `data:application/gltf-buffer;base64,${b64}`, "byteLength": finalArr.byteLength})
	var blob = new Blob([finalArr], {type: "application/octet-stream"});
	gltf['meshes'].sort(function(first, second) {
		return first.id - second.id;
	});
	return [wmb, gltf, blob, finalArr.byteLength]
}


function addDataToBuffer(gltf, arrayBuffer, arrayBeingAdded, type) {
	var count = arrayBeingAdded.length;
	var tmpArr;
	
	var xlist = [];
	var ylist = [];
	var zlist = [];
	var all = [];
	if (type == "vertices") {
		var invalidVerts = false;
		arrayBeingAdded.map(function(x) {if (Math.max(...x) < 10000000000000 && Math.min(...x) > -10000000000000) {
			xlist.push(x[0]); ylist.push(x[1]); zlist.push(x[2]); all.push(...x)
		} else {
			invalidVerts = true;
			xlist.push(0); ylist.push(0); zlist.push(0); all.push(0, 0, 0)
		}})
		if (invalidVerts) {
			// INCREDIBLY JANK WAY TO GO ABOUT THIS; It's pretty much a bandaid for the problem but eh
			console.log(`[WARNING] Model was interpreted incorrectly on buffer view ${gltf['bufferViews'].length}, and the selected mesh was reset.`)
			try {
				xlist = new Array(count).fill(gltf['accessors'][1]['min'][0]);
				ylist = new Array(count).fill(gltf['accessors'][1]['min'][1]);
				zlist = new Array(count).fill(gltf['accessors'][1]['min'][2]);
			} catch {
				xlist = new Array(count).fill(0)
				ylist = new Array(count).fill(0)
				zlist = new Array(count).fill(0)
			}
			all = [];
			for (var i = 0; i < count; i++) {
				all.push(xlist[i])
				all.push(ylist[i])
				all.push(zlist[i])
			}
		}
	} else {
		arrayBeingAdded.map(function(x) {all.push(...x)})
	}
	if (type == "faces" || type == "joints") {
		tmpArr = Uint16Array.from(all);
	} else {
		tmpArr = Float32Array.from(all);
	}
	arrayBeingAdded = tmpArr;
	newArr = new Uint8Array(arrayBuffer.byteLength + arrayBeingAdded.byteLength);
	newArr.set(new Uint8Array(arrayBuffer))
	newArr.set(new Uint8Array(arrayBeingAdded.buffer), arrayBuffer.byteLength)
	if (type == "vertices") {
		// vertices
		gltf['accessors'].push({'bufferView': gltf['bufferViews'].length, 'byteOffset': 0, 'type': 'VEC3', 'componentType': 5126, 'count': count, 'min': [Math.min(...xlist), Math.min(...ylist), Math.min(...zlist)], 'max': [Math.max(...xlist), Math.max(...ylist), Math.max(...zlist)]})
		gltf['bufferViews'].push({'buffer': 0, 'byteOffset': arrayBuffer.byteLength, 'byteLength': arrayBeingAdded.byteLength})
	} else if (type == "texcoord") {
		gltf['accessors'].push({'bufferView': gltf['bufferViews'].length, 'byteOffset': 0, 'type': 'VEC2', 'componentType': 5126, 'count': count, 'max': [1.0, 1.0], 'min': [0.0, 0.0]})
		gltf['bufferViews'].push({'buffer': 0, 'byteOffset': arrayBuffer.byteLength, 'byteLength': arrayBeingAdded.byteLength})
	} else if (type == "joints") {
		// Joints also use uint16
		gltf['accessors'].push({'bufferView': gltf['bufferViews'].length, 'byteOffset': 0, 'type': 'VEC4', 'componentType': 5123, 'count': count})
		gltf['bufferViews'].push({'buffer': 0, 'byteOffset': arrayBuffer.byteLength, 'byteLength': arrayBeingAdded.byteLength})
	} else if (type == "weights") {
		gltf['accessors'].push({'bufferView': gltf['bufferViews'].length, 'byteOffset': 0, 'type': 'VEC4', 'componentType': 5126, 'count': count})
		gltf['bufferViews'].push({'buffer': 0, 'byteOffset': arrayBuffer.byteLength, 'byteLength': arrayBeingAdded.byteLength})
	} else if (type == "ibm") {
		gltf['accessors'].push({'bufferView': gltf['bufferViews'].length, 'byteOffset': 0, 'type': 'MAT4', 'componentType': 5126, 'count': count})
		gltf['bufferViews'].push({'buffer': 0, 'byteOffset': arrayBuffer.byteLength, 'byteLength': arrayBeingAdded.byteLength})
	} else {
		gltf['accessors'].push({'bufferView': gltf['bufferViews'].length, 'byteOffset': 0, 'type': 'SCALAR', 'componentType': 5123, 'count': count*3})
		gltf['bufferViews'].push({'buffer': 0, 'byteOffset': arrayBuffer.byteLength, 'byteLength': arrayBeingAdded.byteLength})
	}
	
	return [newArr.buffer, arrayBuffer.byteLength, gltf];
}

function construct_armature(gltf, finalArr, wmb, name, bone_data_array, firstLevel, secondLevel, thirdLevel, boneMap, boneSetArray) {
	gltf['skins'][0] = {"joints": [], "inverseBindMatrices": 0};
	for (var i = 0; i < bone_data_array.length; i++) {
		gltf['nodes'].push({
			"n": bone_data_array[1],
			"translation": Array.from(bone_data_array[i][4]),
			"rotation": Array.from([...bone_data_array[i][5], 1.0]),
			"children": []
		});
		gltf['skins'][0]['joints'].push(i)
	}
	
	for (var i = 0; i < bone_data_array.length; i++) {
		gltf['nodes'][i]['children'] = bone_data_array.filter(item => item[2] == i).map(item => item[0]);
		if (gltf['nodes'][i]['children'].length == 0) {
			delete gltf['nodes'][i]['children']
		}
	}
	var [finalArr, IBMoffset, gltf] = addDataToBuffer(gltf, finalArr, [new Array(gltf['nodes'].length).fill(0)], "weights");
	return [gltf, finalArr];
}

function loadInitialWMB(fileType, file) {
	return new Promise(async (resolve, reject) => {
		// probably check if there's a WTA/WTP here
		var reader = new FileReader()
		$('div[id="' + file.name + '"]').append(`<div class="spinner"><img width="48px" height="48px" src="assets/loading-small.png"></img></div>`)
		reader.onloadend = async function(e) {
			if (e.target.readyState == FileReader.DONE) {
				var gltf = {
					"asset": {
						"version": "2.0",
						"copyright": "2019 (c) Nintendo"
					},
					"bufferViews": [],
					"accessors": [],
					"materials" : [{
						"pbrMetallicRoughness" : {
							"baseColorTexture" : {
								"index" : 0
							},
							"metallicFactor" : 1.0,
							"roughnessFactor" : 1.0
						}
					}],
					"images" : [],
	  				"textures": [],
					"buffers": [],
					"meshes": [],
					"nodes": [],
					"skins": [],
					"scene": 0,
					"scenes": [{"nodes": []}]
				}
				var wmb = new WMB3(e.target.result);
				var finalArr = new ArrayBuffer();
				// FORCE BONE OFF FOR TESTING
				wmb.hasBone = false
				//
				if (wmb.hasBone) {
					console.log("Attempting to create bone structure...")
					var boneArray = wmb.boneArray.map(function(bone) {return [bone.boneIndex, `bone${bone.boneIndex}`, bone.parentIndex,`bone${bone.parentIndex}`, bone.world_position, bone.world_rotation, bone.boneNumber, bone.local_position, bone.local_rotation, bone.world_rotation, bone.world_position_tpose]})
					var armature_no_wmb = file.name.replace('.wmb','')
					var armature_name_split = armature_no_wmb.split('/')
					var armature_name = armature_name_split[armature_name_split.length-1]
					[gltf, finalArr] = construct_armature(gltf, finalArr, wmb, armature_name, boneArray, wmb.firstLevel, wmb.secondLevel, wmb.thirdLevel, wmb.boneMap, wmb.boneSetArray) 
				}
				var [wmb, gltf, finalBlob, blobLength] = await format_wmb_mesh(wmb, gltf, finalArr)
				var numNodes = [];
				if (wmb.hasBone) {
					for (var i = 0; i < gltf['meshes'].length; i++) {
						gltf['nodes'].push({'mesh': i, 'skin': 0, 'name': gltf['meshes'][i]['name']})
					}
				} else {
					for (var i = 0; i < gltf['meshes'].length; i++) {
						gltf['nodes'].push({'mesh': i, 'name': gltf['meshes'][i]['name']})
						gltf['scenes'][0]['nodes'].push(i)
					}
				}
				var url1  = URL.createObjectURL(finalBlob);
				gltf["buffers"].push({"uri": url1, "byteLength": blobLength})
				console.log(gltf)
				var jsonse = JSON.stringify(gltf)
				var blob = new Blob([jsonse], {type: "application/json"});
				var url2  = URL.createObjectURL(blob);
				// for when i add other uv maps
				// skybox-image="assets/skybox.png"
				$('div[id="' + file.name + '"]').closest('div').append(`<model-viewer camera-controls ar autoplay touch-action shadow-intensity="1" shadow-softness="0.5" interaction-prompt="none" id="modelViewer" poster="assets/loading.png" style="--poster-color: #2C2C2C; width: calc(100vw - 400px); height: 500px;" src="${url2}"></model-viewer>`)
				globalFiles[file.name] = {'fp': file, 'gltf': gltf, 'bin': finalBlob, 'textures': [], 'og-primitives': gltf['meshes'], 'disabled-primitives': []}
				// debug error logging
				document.getElementById("modelViewer").addEventListener('error', function(event) {
					console.error(event, `<model-viewer> ERROR! | ${event.detail}`)
				}, true) 
				var items = [];
				for (var i = 0; i < gltf['meshes'].length; i++) {
					items.push(`<li title="${gltf['meshes'][i]['name']}"><img height="30px" style="cursor: pointer" onclick="disableLayerWMB(this);" src="assets/enabled.png">${gltf['meshes'][i]['name']}</li>`)
				}
				$('.spinner').remove();
				$('div[id="' + file.name + '"]').closest('div').append(`<div class='model-sidebar' id='${file.name}-sidebar'><h3 style="margin-left: 10px">${file.name.split(".")[0]}</h3><div style="margin: 10px;">LOD <input oninput="WMBLODslider('${file.name}', this)" type="range" min="0" max="${parseInt(gltf['meshes'][gltf['meshes'].length-1]['name'].split("-")[2])}" value="${parseInt(gltf['meshes'][gltf['meshes'].length-1]['name'].split("-")[2])}" class="LODslider"></div><ul>${items.join('')}</ul></div>`)
				$('div[id="' + file.name + '"]').find('h4').append(` <a class='download' title='Export the selected model to GLTF.' onclick="downloadFile(\'wmb\', '${file.name}')"><span class='material-icons'>folder</span> EXPORT AS ZIPPED GLTF</a>`)
				$('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['wmb'])
				$('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
				resolve();
			}
		}
		reader.readAsArrayBuffer(file)
	})
}


async function downloadWMB(fileType, name) {
	blobWriter = new zip.BlobWriter("application/zip");
	writer = new zip.ZipWriter(blobWriter);
	var output_gltf = JSON.parse(JSON.stringify(globalFiles[name]['gltf'])); // needs to be deep copied
	var nums = [];
	for (var i = 0; i < globalFiles[name]['og-primitives'].length; i++) {
		nums.push(i)
	}
	output_gltf['scenes'][0]['nodes'] = nums;
	output_gltf['buffers'][0]['uri'] = "buffer.bin"
	var jsonse = JSON.stringify(output_gltf)
	var gltfblob = new Blob([jsonse], {type: "application/json"});
	await writer.add(name.replace(".wmb", ".gltf"), new zip.BlobReader(gltfblob));
	await writer.add("buffer.bin", new zip.BlobReader(globalFiles[name]['bin']));
	await writer.close()
	const blob = await blobWriter.getData();
	saveAs(blob, name.split('.')[0] + '.zip');
}

function WMBLODslider(filename, elem) {
	var sliderValue = $(elem).val();
	const modelviewer = $(elem).parents('div[class="model-sidebar"]').parent().find("model-viewer");
	var nums = [];
	var gltf = globalFiles[filename]['gltf'];
	globalFiles[filename]['disabled-primitives'] = [];
	for (var i = 0; i < globalFiles[filename]['og-primitives'].length; i++) {
		if (parseInt(globalFiles[filename]['og-primitives'][i]['name'].split("-")[2]) > sliderValue) {
			globalFiles[filename]['disabled-primitives'].push(globalFiles[filename]['og-primitives'][i]['name']);
		} else {
			nums.push(i);
		}
	}
	$(elem).parent().siblings('ul').find("li").each(function(index) {
		if (globalFiles[filename]['disabled-primitives'].includes($(this).attr('title'))) {
			$(this).find("img").replaceWith(`<img height="30px" style="cursor: pointer" onclick="enableLayerWMB(this);" src="assets/disabled.png">`)
		} else {
			$(this).find("img").replaceWith(`<img height="30px" style="cursor: pointer" onclick="disableLayerWMB(this);" src="assets/enabled.png">`)
		}
	})
	gltf['scenes'][0]['nodes'] = nums;
	var jsonse = JSON.stringify(gltf);
	var blob = new Blob([jsonse], {type: "application/json"});
	var url  = URL.createObjectURL(blob);
	const currenturl = modelviewer.attr('src');
	modelviewer.attr('src', url);
	URL.revokeObjectURL(currenturl);
}

function disableLayerWMB(elem) {
	const text = $(elem).parent().text().trim()
	const filename = $(elem).parents('div[class="model-sidebar"]').attr('id').split("-")[0]
	const modelviewer = $(elem).parents('div[class="model-sidebar"]').parent().find("model-viewer")
	var nums = [];
	var gltf = globalFiles[filename]['gltf'];
	globalFiles[filename]['disabled-primitives'].push(text)
	for (var i = 0; i < globalFiles[filename]['og-primitives'].length; i++) {
		if (!(globalFiles[filename]['disabled-primitives'].includes(globalFiles[filename]['og-primitives'][i]['name']))) {
			nums.push(i)
		}
	}
	gltf['scenes'][0]['nodes'] = nums;
	var jsonse = JSON.stringify(gltf)
	var blob = new Blob([jsonse], {type: "application/json"});
	var url  = URL.createObjectURL(blob);
	const currenturl = modelviewer.attr('src')
	modelviewer.attr('src', url)
	URL.revokeObjectURL(currenturl)
	$(elem).replaceWith(`<img height="30px" style="cursor: pointer" onclick="enableLayerWMB(this);" src="assets/disabled.png">`)
}


function enableLayerWMB(elem) {
	const text = $(elem).parent().text().trim()
	const filename = $(elem).parents('div[class="model-sidebar"]').attr('id').split("-")[0]
	const modelviewer = $(elem).parents('div[class="model-sidebar"]').parent().find("model-viewer")
	var items = [];
	var gltf = globalFiles[filename]['gltf'];
	let index = globalFiles[filename]['disabled-primitives'].indexOf(text)
	globalFiles[filename]['disabled-primitives'].splice(index, 1)
	var nums = [];
	for (var i = 0; i < globalFiles[filename]['og-primitives'].length; i++) {
		if (!(globalFiles[filename]['disabled-primitives'].includes(globalFiles[filename]['og-primitives'][i]['name']))) {
			nums.push(i)
		}
		
	}
	gltf['scenes'][0]['nodes'] = nums;
	var jsonse = JSON.stringify(gltf)
	var blob = new Blob([jsonse], {type: "application/json"});
	var url  = URL.createObjectURL(blob);
	const currenturl = modelviewer.attr('src')
	modelviewer.attr('src', url)
	URL.revokeObjectURL(currenturl)
	$(elem).replaceWith(`<img height="30px" style="cursor: pointer" onclick="disableLayerWMB(this);" src="assets/enabled.png">`)
}

function addTexturesWMB(fileType, elem) {
	// looking for wta/wtp of same name (em0000.wmb <-> em0000.wta / em0000.wtp)
	alert("Coming soon!")
}

function addAnimationsWMB(fileType, elem) {
	// may need to add more functionality; animations aren't as clear cut
	const text = $(elem).parent().text().trim()
	const filename = $(elem).parents('div[class="model-sidebar"]').attr('id').split("-")[0]
	const modelviewer = $(elem).parents('div[class="model-sidebar"]').parent().find("model-viewer")
	const animfilename = prompt("Enter the animation's filename that has already been loaded. (Yes, this is an ugly prompt. I'll replace it soon)", filename.replace(".wmb", ".mot"))

}