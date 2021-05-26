//const Transform = require('stream').Transform;

//const ogg_packet = require('ogg-packet');


//const { Writable } = require('stream');
// streambuffer.js
class StreamBuffer {
    constructor(opts) {

        this.buffers = [];
    }

    appendBuffer(buf) {
        this.buffers.push(buf);
    }

    _write(chunk, encoding, done) {
        this.buffers.push(chunk);
        done();
    }

    getBuffer() {
        return Buffer.concat(this.buffers);
    }
}

// bitreadstream.js

class BitReadStream {
    constructor(buf) {
        this._buf = buf;
        this._byte_offset = 0;
        this._bit_offset = 0;
        this._total_read_bits = 0;
    }

    readBits(bits) {
        let ret = this._readBits(this._buf, bits, this._byte_offset, this._bit_offset);
        this.seekBits(bits);
        this._total_read_bits += bits;
        return ret;
    }

    seekBytes(bytes) {
        this._byte_offset += bytes;
        
        if(this._byte_offset < 0) {
            this._byte_offset = 0;
        }
        
        if(this._byte_offset > this._buf.length) {
            this._byte_offset = this._buf.lenght - 2;
        }
    }

    seekToByte(byte) {
        this._byte_offset = byte;
        this._bit_offset = 0;

        if(this._byte_offset < 0) {
            this._byte_offset = 0;
        }

        if(this._byte_offset > this._buf.length) {
            this._byte_offset = this._buf.length - 2;
        }
    }

    seekBits(bits) {
        let bit_seek = bits % 8;
        let byte_seek = Math.floor(bits / 8);

        this._bit_offset += bit_seek;
        byte_seek += Math.floor(this._bit_offset / 8);
        this._bit_offset = this._bit_offset % 8;

        this.seekBytes(byte_seek);
    }

    getTotalReadBits() {
        return this._total_read_bits;
    }

    _readBits(buf, bits, byte_offset, bit_offset) { // both offset are measured from the left
        let ret = 0;
        let left_mask = 0xFF;

        for(let i = 0; i < bit_offset; i++) {
            left_mask = left_mask >> 1;
        }
        
        let right_shift = (8 - ((bits + bit_offset) % 8)) % 8;
        let needed_bytes = Math.ceil((bit_offset + bits) / 8);

        if(byte_offset + needed_bytes > buf.length) {
            throw new Error('Trying to read out of bounds');
        }

        for(let cb = 0; cb < needed_bytes; cb++) {
            let byte = buf.readUInt8(byte_offset + cb);

            byte = this._mirrorBin(byte, 8);

            if(cb == 0) {
                byte = byte & left_mask;
            }

            ret += byte << (8 * (needed_bytes - 1 - cb));
        }

        ret = ret >> right_shift;
        ret = this._mirrorBin(ret, bits);

        return ret;
    }

    _mirrorBin(input, len) {
        let output = 0;
        
        for(let i = 0; i < len; i++) {
            output <<= 1;
            output += (input >> i) & 0x01;
        }
        
        return output;
    }
}


// bit-writestream.js
// based on https://github.com/kkaefer/node-bitstream/blob/master/bitstream.js
// originally, this class worked as a ReadStream, but apparently, it's impossible to use them synchronously in newer node versions, so I switched to just emitting data events

// const { Readable } = require('stream');
//const { EventEmitter } = require('events');

class Bitstream {
    static get _nulls() {
        return Buffer.alloc(32, 0);
    }

    static get BUFFER_SIZE() {
        return 1024;
    }

    constructor() {

        this._buffer = Buffer.alloc(Bitstream.BUFFER_SIZE);
        this._pos = 0; // Number of current byte.
        this._intra = 0; // Number of bits written in current byte.
        this._total = 0; // Number of bits that has been added to this stream.
    }

    /**
     * Writes a byte to the bitstream
     *
     * @param {Number} bits Byte to write.
     */
    writeByte(bits) {
        if (this._intra === 0) {
            // Aligned at byte boundary.
            this._buffer[this._pos] = bits;
            this._pos++;
            if (this._pos == this._buffer.length) this.flush();
        } else {
            // Copy first portion to current byte.
            this._buffer[this._pos] |= bits << this._intra;
            this._pos++;
            if (this._pos == this._buffer.length) this.flush();

            // Copy second portion to next byte.
            this._buffer[this._pos] = (bits & 0xFF) >> (8 - this._intra);
        }

        this._total += 8;
    }

    /**
     * Writes an unsigned integer up to 8 bits to the bitstream
     *
     * @param {Number} number Number to write.
     * @param {Number} length Amount of bits of the number to write.
     */
    writeUnsigned(bits, length) {
        if (length > 8) throw new Error('You need to specify an endianness when writing more than 8 bits');

        // Make sure we're not accidentally setting bits that shouldn't be set.
        bits &= (1 << length) - 1;

        let current = 8 - this._intra;
        if (this._intra === 0) {
            // Aligned at byte boundary.
            this._buffer[this._pos] = bits;
        } else {
            // Number of bits we can fit into the current byte.
            // node's Buffer implementation clamps this to 0xFF.
            this._buffer[this._pos] |= bits << this._intra;
        }

        this._total += length;
        this._intra += length;
        if (this._intra >= 8) {
            this._intra -= 8;
            this._pos++;
            if (this._pos == this._buffer.length) this.flush();

            if (current < length) {
                // We also have to write bits to the second byte.
                this._buffer[this._pos] = bits >> current;
            }
        }
    }

    /**
     * Writes bits to the bitstream
     *
     * @param {Buffer} bits  Contains the bits to write, aligned at position 0.
     *                      Bits are | 76543210 | FEDCBA98 | etc.
     * @param {Number} length Amount of valid bits in the buffer.
     */
    writeBits(bits, length) {
        if (!this._buffer) throw new Error('Stream is closed');

        let remainder = length % 8;
        let max = (length - remainder) / 8;

        if (bits.length < max || (remainder > 0 && bits.length == max)) {
            throw new Error(length + ' bits expected, but ' + (bits.length * 8) + ' passed');
        }

        if (this._intra === 0) {
            // Do an aligned copy.
            if (this._pos + max < this._buffer.length) {
                // Copy the bits if they fit in the current buffer.
                if (max > 0) {
                    bits.copy(this._buffer, this._pos, 0, max);
                    this._pos += max;
                    if (this._pos == this._buffer.length) this.flush();
                }
            } else {
                // The new bits wouldn't fit into the current buffer anyway, so flush
                // and passthrough the new bits.
                this.flush();
                // this.push(bits.slice(0, max));
                this.emit('data', bits.slice(0, max));
            }
            this._total += max * 8;
        } else {
            // Do unaligned copy.
            for (let pos = 0; pos < max; pos++) {
                this.writeByte(bits[pos]);
            }
        }

        // Write last byte.
        if (remainder) {
            this.writeUnsigned(bits[max], remainder);
        }
    }

    /**
     * Writes an unsigned big endian integer with a specified length to the bitstream
     *
     * @param {Number} number Number to write.
     * @param {Number} length Amount of bits of the number to write.
     */
    writeUnsignedBE(number, length) {
        if (!this._buffer) throw new Error('Stream is closed');

        let remainder = length % 8;
        let max = length - remainder;

        if (remainder) {
            this.writeUnsigned(number >>> max, remainder);
        }

        for (let pos = max - 8; pos >= 0; pos -= 8) {
            this.writeByte(number >>> pos);
        }
    }

    /**
     * Writes an unsigned little endian integer with a specified length to the bitstream
     *
     * @param {Number} number Number to write.
     * @param {Number} length Amount of bits of the number to write.
     */
    writeUnsignedLE(number, length) {
        if (!this._buffer) throw new Error('Stream is closed');

        let remainder = length % 8;
        let max = length - remainder;

        for (let pos = 0; pos < max; pos += 8) {
            this.writeByte(number >>> pos);
        }

        if (remainder) {
            this.writeUnsigned(number >>> max, remainder);
        }
    }

    writeUnsignedReversed(number, length) {
        for (let shift = length - 1; shift >= 0; shift--) {
            this.writeUnsigned(number >> shift, 1);
        }
    }

    end() {
        this.align();
        this.flush();
        // this.push(null);

        this._buffer = null;
        // delete this._pos;
    }

    // Aligns to stream to the next byte boundary by writing zeros.
    align(boundary) {
        if (typeof boundary == 'undefined' || boundary < 0 || !boundary) {
            boundary = 1;
        }

        if (boundary > Bitstream._nulls.length) {
            throw new Error('Maximum boundary align size is ' + Bitstream._nulls.length);
        }

        let valid = this._total % (boundary * 8);
        if (valid > 0) {
            this.writeBits(Bitstream._nulls, boundary * 8 - valid);
        }
    }

    // _read(size) {
    //     console.log("_read");
    //     this.flush();
    // }

    // Flushes the current buffer.
    flush() {
        if (this._buffer == null) {
            throw new Error("Stream has already been ended");
        }
        
        // Emit all valid whole bytes that have been written so far.
        // let result = this.push(this._buffer.slice(0, this._pos));
        this.emit('data', this._buffer.slice(0, this._pos));

        // Clean out the buffer and copy the last partial byte that we didn't emit yet.
        let buffer = Buffer.alloc(Bitstream.BUFFER_SIZE);
        buffer[0] = this._buffer[this._pos];
        this._buffer = buffer;
        this._pos = 0;

        // return result;
    }
}


// codebook.js

class InvalidIdError extends Error {
    constructor(message) {
        super(message);

        this.name = this.constructor.name;

        Error.captureStackTrace(this, this.constructor);
    }
}

class Codebook {
    constructor(buf) {
        this._offsets_offset = buf.readUInt32LE(buf.length - 4);
        this._count = (buf.length - this._offsets_offset) / 4;
        this._data = buf.slice(0, this._offsets_offset);
        this._offsets = [];
    
        for (let i = 0; i < this._count; i++) {
            this._offsets[i] = buf.readUInt32LE(this._offsets_offset + i * 4);
        }
    }

    get_codebook(i) {
        // console.log("codebook:", i);
        if (i < 0 || i > this._offsets.length) {
            throw new InvalidIdError();
        }
        
        let start = this._offsets[i];
        let end = (i == this._offsets.length - 1) ? this._offsets_offset : this._offsets[i+1];

        return this._data.slice(start, end);
    }

    rebuild(id, outstream) {
        let codebook = this.get_codebook(id);
        this._rebuild(codebook, outstream);
    }

    _rebuild(buf, os) {
        //let ret = new Buffer(1024);
        /*let ret = new StreamBuffer();
        let os = new Bitstream();
        os.pipe(ret);*/

        let is = new BitReadStream(buf);

        let dimensions = is.readBits(4); //read 4 bits
        let entries = is.readBits(14); //read 14 bits

        //console.log("Codebook with", dimensions, "dimensions,", entries, "entries");

        /*ret.writeUIntBE(0x564342, 0, 3); //24bits
        ret.writeUInt16BE(dimensions, 3);
        ret.writeUIntBE(entries, 5, 3); //24bits*/
        os.writeBits(Buffer.from([ 0x42, 0x43, 0x56 ]), 24);
        os.writeUnsignedLE(dimensions, 16);
        os.writeUnsignedLE(entries, 24);

        let ordered = is.readBits(1);
        os.writeUnsignedLE(ordered, 1);

        if (ordered) {
            //console.log("Ordered");

            let initial_length = is.readBits(5);
            os.writeUnsignedLE(initial_length, 5);

            //console.log('intial length:', initial_length);

            let current_entry = 0;

            while (current_entry < entries) {
                let len = ilog(entries - current_entry);
                let number = is.readBits(len);
                os.writeUnsignedLE(number, len);

                //console.log('len', len);

                current_entry += number;
            }
        } else {
            let codeword_length_length = is.readBits(3);
            let sparse = is.readBits(1);

            //console.log("Unordered", codeword_length_length, "bit lengths");

            if (codeword_length_length == 0 || codeword_length_length > 5) {
                throw new Error('Nonsense codeword length');
            }

            os.writeUnsignedLE(sparse, 1);

            for (let i = 0; i < entries; i++) {
                let present_bool = true;

                if(sparse) {
                    let present = is.readBits(1);
                    os.writeUnsignedLE(present, 1);
                    present_bool = (0 != present);
                }

                // console.log("present_bool", present_bool);
                if (present_bool) {
                    let codeword_length = is.readBits(codeword_length_length);

                    os.writeUnsignedLE(codeword_length, 5);
                }
            }

            // console.log("true:", test_true, "| false:", test_false);
        }

        let lookup_type = is.readBits(1);
        os.writeUnsignedLE(lookup_type, 4);

        // if(lookup_type == 0) {
        //     console.log("no lookup table");
        // }
        if (lookup_type == 1) {
            //console.log("lookup type 1");
            os.writeUnsignedLE(is.readBits(32), 32); //min
            os.writeUnsignedLE(is.readBits(32), 32); //max
            let value_length = is.readBits(4);
            os.writeUnsignedLE(value_length, 4);
            os.writeUnsignedLE(is.readBits(1), 1); //sequence_flag(1)

            let quantvals = _book_maptype1_quantvals(entries, dimensions);
            for(let i = 0; i < quantvals; i++) {
                os.writeUnsignedLE(is.readBits(value_length + 1), value_length + 1);
            }
        }

        //console.log("total bits read =", is.getTotalReadBits());
        if (Math.floor(is.getTotalReadBits()/8) + 1 != buf.length) {
            console.log('Size mismatch. cb size: ' + buf.length + ' read: ' + (is.getTotalReadBits()/8 + 1));
            throw new Error('Size mismatch');
        }

        /*os.align();
        os.end();

        return ret.getBuffer();*/
    }
}


function ilog(v) {
    let ret = 0;
    while (v != 0) {
        ret++;
        v = v >> 1;
    }

    return ret;
}

function _book_maptype1_quantvals(entries, dimensions) {
    let bits = ilog(entries);
    let vals = entries >> ((bits-1)*(dimensions-1)/dimensions);

    while (true) {
        let acc = 1;
        let acc1 = 1;

        for(let i = 0; i < dimensions; i++) {
            acc *= vals;
            acc1 *= vals+1;
        }

        if (acc <= entries && acc1 > entries) {
            return vals;
        } else {
            if (acc > entries) {
                vals--;
            } else {
                vals++;
            }
        }
    }
}
// decoder.js
class Wwriff_Decoder {
	constructor(size) {
		this._codebook = null;

		this._chunknumber = 0;
		this._chunk_offset = 0;

		this._packetno = 3; // first 3 packets are pre-defined

		this._fmt = null;
		this._vorb = null;
		this._info = {};
		this._found_chunks = [];
		this._current_chunk_type = null;
		this._current_chunk_rest = null;
		this._vorbis_header_written = false;
		this._total_offset = 0;

		this._last_blocksize = 0;
		this._granpos = 0;

		this._little_endian = true;
		if (size != undefined) {
			this._info.file_size = size;
		}
	}

	setCodebook(path) {
		if (!fs.existsSync(path)) {
			console.log('The given codebook file does not exist.');
			return;
		}

		try {
			const codebook = fs.readFileSync(path);
			this._codebook = new Codebook(codebook);
		} catch (e) {
			console.log('Error while reading codebook', e);
		}
	}

	setCodebookFromBuffer(buffer) {
		try {
			this._codebook = new Codebook(buffer);
		} catch (e) {
			console.log('Error while reading codebook', e);
		}
	}

	_transform(_chunk, encoding, done) {
		if (this._codebook == null) {
			throw new Error('No codebooks set.');
		}

		let chunk;
		if (this._current_chunk_rest != null) {
			chunk = Buffer.concat([this._current_chunk_rest, _chunk]);
		} else {
			chunk = _chunk;
		}

		let pos = 0;

		if (this._chunknumber == 0) {
			this._read_riff_header(chunk.slice(0, 12));
			pos = 12;
		}

		if (this._current_chunk_type == 'data') {
			this._read_data_chunk(chunk);
		} else {
			while (true) {
				if (pos + 8 > chunk.length) {
					this._current_chunk_rest = chunk.slice(pos);
					break;
				}
				const type = chunk.toString('utf8', pos, pos + 4);
				const size = read_32(chunk, pos + 4);
				pos += 8;
				if (pos + size > chunk.length && type != 'data') {
					this._current_chunk_rest = chunk.slice(pos - 8);
					break;
				}
				if (size == 0) {
					break;
				}

				switch (type) {
					case 'fmt ':
						this._read_fmt_chunk(chunk.slice(pos, pos + size));
						pos += size;
						break;
					case 'data':
						this._total_offset = pos;

						if (!('file_size' in this._info)) {
							this._info.file_size = pos + size;
						}
						this._current_chunk_type = 'data';
						this._read_data_chunk(chunk.slice(pos));
						this._chunknumber++;
						return done();
					default:
						pos += size;
						break;
				}
			}
		}

		this._chunknumber++;

		done();
	}

	_read_data_chunk(chunk) {
		if (!this._vorbis_header_written) {
			const setup_packet = this._generateOggPacket3(chunk);
			if (setup_packet != null) {
				this.push(this._generateOggPacket1());
				this.push(this._generateOggPacket2());
				this.push(setup_packet);
				this._vorbis_header_written = true;
			} else {
				this._current_chunk_rest = chunk;
				return;
			}
		}

		let offset = 0;
		let ogg_flush = false;
		if (this._packetno == 3) { // first audio packet after header
			offset = this._vorb.first_audio_packet_offset;
		}
		let ogg_end = 0;
		let next_ogg_end = false;

		let prev_blockflag = 0;
		let next_blockflag = 0;
		const is = new BitReadStream(chunk);

		let next_packet;

		while (true) {
			const packet = new Packet(chunk, offset, this._little_endian, true);

			if (!next_ogg_end) {
				if (packet.next_offset() + packet.header_size() + 1 > chunk.length) {
					this._total_offset += offset;
					this._current_chunk_rest = chunk.slice(offset);
					break;
				}
				next_packet = new Packet(chunk, packet.next_offset(), this._little_endian, true);

				if (this._info.file_size == next_packet.next_offset() + this._total_offset) {
					next_ogg_end = true;
				}

				if (next_packet.next_offset() + packet.header_size() > chunk.length && !next_ogg_end) {
					ogg_flush = true;
				}
				// is this the second last packet?

			} else { // last packet was second last. this is the last one
				ogg_end = 1;
				ogg_flush = true;
			}

			const buffer = new StreamBuffer();
			const os = new Bitstream();
			// os.pipe(buffer);

			// make is synchronous, screw pipes
			os.on("data", data => {
				buffer.appendBuffer(data);
			});

			is.seekToByte(packet.offset());

			os.writeUnsignedLE(0, 1); // packet type
			const mode_number = is.readBits(this._info.mode_bits);
			os.writeUnsignedLE(mode_number, this._info.mode_bits);

			const remainder = is.readBits(8 - this._info.mode_bits);
			if (this._info.mode_blockflag[mode_number]) {
				next_blockflag = false;
				if (this._total_offset + next_packet.next_offset() + next_packet.header_size() <= this._info.file_size) {
					if (next_packet.size() > 0) {
						is.seekToByte(next_packet.offset());
						const next_mode_number = is.readBits(this._info.mode_bits);
						next_blockflag = this._info.mode_blockflag[next_mode_number];
					}
				}

				os.writeUnsignedLE(prev_blockflag, 1);
				os.writeUnsignedLE(next_blockflag, 1);
			}

			prev_blockflag = this._info.mode_blockflag[mode_number];
			os.writeUnsignedLE(remainder, 8 - this._info.mode_bits);

			// buffer.appendBuffer(chunk.slice(packet.offset() + 1, packet.next_offset()));
			for (let i = 1; i < packet.size(); i++) {
				const v = chunk.readUInt8(packet.offset() + i);
				os.writeUnsignedLE(v, 8);
			}

			os.align();
			os.end();

			const bs = Math.pow(2, (this._info.mode_blockflag[mode_number] == 0) ? this._vorb.blocksize0_pow : this._vorb.blocksize1_pow);
			if (this._last_blocksize) {
				this._granpos += Math.round((this._last_blocksize + bs) / 4);
			}
			this._last_blocksize = bs;

			const ogg_p = new ogg_packet();
			const packet_buffer = buffer.getBuffer();
			ogg_p.packet = packet_buffer;
			ogg_p.bytes = packet_buffer.length;
			ogg_p.b_o_s = 0;
			ogg_p.e_o_s = ogg_end;
			ogg_p.granulepos = this._granpos;
			ogg_p.packetno = this._packetno;
			ogg_p.flush = ogg_flush;
			this.push(ogg_p);

			offset = packet.next_offset();
			this._packetno++;

			if (ogg_end) {
				break;
			}
		}
	}

	_read_fmt_chunk(chunk) {
		this._fmt = {};
		this._fmt.channels = read_16(chunk, 2);
		this._fmt.sample_rate = read_32(chunk, 4);
		this._fmt.avg_bps = read_32(chunk, 8); // *8
		this._fmt.subtype = read_32(chunk, 20);

		// this is usually not part of the fmt chunk, but it happens to be in the files we're dealing with here
		this._vorb = {};
		this._vorb.sample_count = read_32(chunk, 24 + 0); // 24 is the offset of the vorb data inside the fmt chunk
		this._vorb.mod_signal = read_32(chunk, 24 + 4);
		this._vorb.setup_packet_offset = read_32(chunk, 24 + 16);
		this._vorb.first_audio_packet_offset = read_32(chunk, 24 + 20);
		this._vorb.uid = read_32(chunk, 24 + 36);
		this._vorb.blocksize0_pow = chunk.readUInt8(24 + 36 + 4);
		this._vorb.blocksize1_pow = chunk.readUInt8(24 + 36 + 5);
	}

	_read_riff_header(header) {
		const riff_head = header.toString('utf8', 0, 4);
		if (riff_head == 'RIFX') {
			this._little_endian = false;
		} else if (riff_head != 'RIFF') {
			throw new Error('missing RIFF');
		}

		// const riff_size = read_32(header, 4);

		const wave_head = header.toString('utf8', 8, 12);
		if (wave_head != 'WAVE') {
			throw new Error('missing WAVE');
		}
	}

	_generateOggPacket1() { // identification packet
		const buffer = Buffer.alloc(23);
		buffer.writeUInt32LE(0, 0); // version
		buffer.writeUInt8(this._fmt.channels, 4); // channels (1byte? dafuq? in the fmt header its 2 bytes O.o)
		buffer.writeUInt32LE(this._fmt.sample_rate, 5); // sample rate
		buffer.writeUInt32LE(0, 9); // bitrate max
		buffer.writeUInt32LE(this._fmt.avg_bps * 8, 13); // bitrate nominal
		buffer.writeUInt32LE(0, 17); // bitrate minimum
		buffer.writeUInt8((this._vorb.blocksize1_pow << 4) | this._vorb.blocksize0_pow, 21); // blocksize1, blocksize0
		buffer.writeUInt8(1, 22); // framing

		const ret = new ogg_packet();
		const packet_buffer = Buffer.concat([generateVorbisPacketHeader(1), buffer]);
		ret.packet = packet_buffer;
		ret.bytes = packet_buffer.length;
		ret.b_o_s = 1;
		ret.e_o_s = 0;
		ret.granulepos = 0;
		ret.packetno = 0;
		ret.flush = true;
		return ret;
	}

	_generateOggPacket2() { // comment packet
		const vendor = 'Converted from Audiokinetic Wwise by node-wwriff';
		const vendor_length = vendor.length;

		const buffer = Buffer.alloc(4 + vendor_length + 4 + 1);
		buffer.writeUInt32LE(vendor_length, 0);
		buffer.write(vendor, 4, vendor_length, 'ascii');
		buffer.writeUInt32LE(0, 4 + vendor_length); // user comment count
		buffer.writeUInt8(1, 4 + vendor_length + 4); // framing

		const ret = new ogg_packet();
		const packet_buffer = Buffer.concat([generateVorbisPacketHeader(3), buffer]);
		ret.packet = packet_buffer;
		ret.bytes = packet_buffer.length;
		ret.b_o_s = 0;
		ret.e_o_s = 0;
		ret.granulepos = 0;
		ret.packetno = 1;
		ret.flush = true;
		return ret;
	}

	_generateOggPacket3(buf) { // setup packet
		if (buf.length < this._vorb.setup_packet_offset) {
			return null;
		}

		const setup_packet = new Packet(buf, this._vorb.setup_packet_offset, this._little_endian, true);

		if (buf.length < setup_packet.next_offset()) {
			return null;
		}

		const buffer = new StreamBuffer();
		const os = new Bitstream();
		// os.pipe(buffer);

		// make it synchronous
		os.on("data", data => {
			buffer.appendBuffer(data);
		});

		const is = new BitReadStream(buf);
		is.seekBytes(setup_packet.offset());

		const codebook_count = is.readBits(8) + 1; // we're reading codebook_count_less1
		os.writeUnsignedLE(codebook_count - 1, 8);

		for (let i = 0; i < codebook_count; i++) {
			// read 10 bits
			const codebook_id = is.readBits(10);
			this._codebook.rebuild(codebook_id, os);
		}

		os.writeUnsignedLE(0, 6); // time_count_less1 placeholder
		os.writeUnsignedLE(0, 16); // dummy_time_value

		// floor_count
		const floor_count = is.readBits(6) + 1;
		os.writeUnsignedLE(floor_count - 1, 6);

		// rebuild floors
		for (let i = 0; i < floor_count; i++) {
			os.writeUnsignedLE(1, 16); // always floor type 1

			const floor1_partitions = is.readBits(5);
			os.writeUnsignedLE(floor1_partitions, 5);

			const floor1_partition_class_list = [];
			let maximum_class = 0;

			for (let j = 0; j < floor1_partitions; j++) {
				const floor1_partition_class = is.readBits(4);
				os.writeUnsignedLE(floor1_partition_class, 4);

				floor1_partition_class_list.push(floor1_partition_class);

				if (floor1_partition_class > maximum_class) {
					maximum_class = floor1_partition_class;
				}
			}

			const floor1_class_dimensions_list = [];

			for (let j = 0; j <= maximum_class; j++) {
				const class_dimensions_less1 = is.readBits(3);
				os.writeUnsignedLE(class_dimensions_less1, 3);

				floor1_class_dimensions_list.push(class_dimensions_less1 + 1);

				const class_subclasses = is.readBits(2);
				os.writeUnsignedLE(class_subclasses, 2);

				if (0 != class_subclasses) {
					const masterbook = is.readBits(8);
					os.writeUnsignedLE(masterbook, 8);

					if (masterbook > codebook_count) {
						throw new Error("Invalid floor1 masterbook");
					}
				}

				for (let k = 0; k < (1 << class_subclasses); k++) {
					const subclass_book_plus1 = is.readBits(8);
					os.writeUnsignedLE(subclass_book_plus1, 8);

					if (subclass_book_plus1 - 1 >= 0 && subclass_book_plus1 - 1 >= codebook_count) {
						throw new Error('Invalid floor1 subclass book');
					}
				}
			}

			const floor1_multiplier = is.readBits(2) + 1;
			os.writeUnsignedLE(floor1_multiplier - 1, 2);

			const rangebits = is.readBits(4);
			os.writeUnsignedLE(rangebits, 4);

			for (let j = 0; j < floor1_partitions; j++) {
				const current_class_number = floor1_partition_class_list[j];

				for (let k = 0; k < floor1_class_dimensions_list[current_class_number]; k++) {
					const X = is.readBits(rangebits);
					os.writeUnsignedLE(X, rangebits);
				}
			}

		}

		// residue count
		const residue_count = is.readBits(6) + 1;
		os.writeUnsignedLE(residue_count - 1, 6);

		// rebuild residues
		for (let i = 0; i < residue_count; i++) {
			const residue_type = is.readBits(2);
			os.writeUnsignedLE(residue_type, 16);

			if (residue_type > 2) {
				throw new Error("Invalid residue type");
			}

			const residue_begin = is.readBits(24);
			const residue_end = is.readBits(24);
			const residue_partition_size = is.readBits(24) + 1;
			const residue_classifications = is.readBits(6) + 1;
			const residue_classbook = is.readBits(8);

			os.writeUnsignedLE(residue_begin, 24);
			os.writeUnsignedLE(residue_end, 24);
			os.writeUnsignedLE(residue_partition_size - 1, 24);
			os.writeUnsignedLE(residue_classifications - 1, 6);
			os.writeUnsignedLE(residue_classbook, 8);

			if (residue_classbook >= codebook_count) {
				throw new Error('Invalid residue classbook');
			}

			const residue_cascade = [];

			for (let j = 0; j < residue_classifications; j++) {
				let high_bits = 0;
				const low_bits = is.readBits(3);
				os.writeUnsignedLE(low_bits, 3);
				const bitflag = is.readBits(1);
				os.writeUnsignedLE(bitflag, 1);

				if (bitflag) {
					high_bits = is.readBits(5);
					os.writeUnsignedLE(high_bits, 5);
				}

				residue_cascade.push(high_bits * 8 + low_bits);
			}

			for (let j = 0; j < residue_classifications; j++) {
				for (let k = 0; k < 8; k++) {
					if (residue_cascade[j] & (1 << k)) {
						const residue_book = is.readBits(8);
						os.writeUnsignedLE(residue_book, 8);

						if (residue_book >= codebook_count) {
							throw new Error("Invalid residue book");
						}
					}
				}
			}
		}

		// mapping count
		const mapping_count = is.readBits(6) + 1;
		os.writeUnsignedLE(mapping_count - 1, 6);


		for (let i = 0; i < mapping_count; i++) {
			os.writeUnsignedLE(0, 16); // mapping_type is always 0

			const submaps_flag = is.readBits(1);
			os.writeUnsignedLE(submaps_flag, 1);

			let submaps = 1;
			if (submaps_flag) {
				const submaps_less1 = is.readBits(4);
				submaps = submaps_less1 + 1;
				os.writeUnsignedLE(submaps_less1, 4);
			}

			const square_polar_flag = is.readBits(1);
			os.writeUnsignedLE(square_polar_flag, 1);

			if (square_polar_flag) {
				const coupling_steps = is.readBits(8) + 1;
				os.writeUnsignedLE(coupling_steps - 1, 8);

				for (let j = 0; j < coupling_steps; j++) {
					const m_l = ilog(this._fmt.channels - 1);
					const a_l = ilog(this._fmt.channels - 1);

					const magnitude = is.readBits(m_l);
					os.writeUnsignedLE(magnitude, m_l);

					const angle = is.readBits(a_l);
					os.writeUnsignedLE(angle, a_l);

					if (angle == magnitude || magnitude >= this._fmt.channels || angle >= this._fmt.channels) {
						throw new Error('Invalid coupling');
					}
				}
			}

			const mapping_reserved = is.readBits(2);
			os.writeUnsignedLE(mapping_reserved, 2);

			if (mapping_reserved != 0) {
				throw new Error('mapping reserved field nonzero');
			}

			if (submaps > 1) {
				for (let j = 0; j < this._fmt.channels; j++) {
					const mapping_mux = is.readBits(4);
					os.writeUnsignedLE(mapping_mux, 4);

					if (mapping_mux >= submaps) {
						throw new Error("mapping mux >= submaps");
					}
				}
			}

			for (let j = 0; j < submaps; j++) {
				os.writeUnsignedLE(is.readBits(8), 8);

				const floor_number = is.readBits(8);
				os.writeUnsignedLE(floor_number, 8);
				if (floor_number >= floor_count) {
					throw new Error('Invalid floor mapping');
				}

				const residue_number = is.readBits(8);
				os.writeUnsignedLE(residue_number, 8);
				if (residue_number >= residue_count) {
					throw new Error('Invalid residue mapping');
				}
			}
		}

		// mode count
		const mode_count = is.readBits(6) + 1;
		os.writeUnsignedLE(mode_count - 1, 6);

		const mode_blockflag = [];
		const mode_bits = ilog(mode_count - 1);

		this._info.mode_bits = mode_bits;

		for (let i = 0; i < mode_count; i++) {
			const block_flag = is.readBits(1);
			os.writeUnsignedLE(block_flag, 1);

			mode_blockflag.push(block_flag != 0);

			os.writeUnsignedLE(0, 16); // windowtype
			os.writeUnsignedLE(0, 16); // transformtype

			const mapping = is.readBits(8);
			os.writeUnsignedLE(mapping, 8);
			if (mapping > mapping_count) {
				throw new Error('Invalid mode mapping');
			}
		}

		this._info.mode_blockflag = mode_blockflag;

		os.writeUnsignedLE(1, 1); // framing;

		os.align();
		os.end();

		if (Math.floor((is.getTotalReadBits() + 7) / 8) != setup_packet.size()) {
			throw new Error("Didn't read exactly setup packet");
		}

		const ret = new ogg_packet();
		const packet_buffer = Buffer.concat([generateVorbisPacketHeader(5), buffer.getBuffer()]);
		ret.packet = packet_buffer;
		ret.bytes = packet_buffer.length;
		ret.b_o_s = 0;
		ret.e_o_s = 0;
		ret.granulepos = 0;
		ret.packetno = 2;
		ret.flush = true;
		return ret;
	}
}

class Packet {
	constructor(buf, offset, le, no_granule) {
		this._no_granule = (no_granule != undefined) ? no_granule : false;

		this._offset = offset;
		this._size = 0;
		this._abs_granule = 0;
	
		if (le) { // little endian
			this._size = buf.readUInt16LE(this._offset);
			if (!this._no_granule) {
				this._abs_granule = buf.readUInt32LE(this._offset + 2);
			}
		} else {
			this._size = buf.readUInt16BE(this._offset);
			if (!this._no_granule) {
				this._abs_granule = buf.readUInt32BE(this._offset + 2);
			}
		}
	}

	header_size() {
		return (this._no_granule) ? 2 : 6;
	}

	offset() {
		return this._offset + this.header_size();
	}

	size() {
		return this._size;
	}

	granule() {
		return this._abs_granule;
	}

	next_offset() {
		return this.offset() + this._size;
	}
}

function generateVorbisPacketHeader(_type) {
	const type = (_type != undefined) ? _type : 0;
	const ret = Buffer.alloc(7);
	ret.writeUInt8(type, 0);
	ret.write('vorbis', 1);
	return ret;
}

function read_16(buf, offset) { 
	return buf.readUInt16LE(offset);
}

function read_32(buf, offset) {
	return buf.readUInt32LE(offset);
}

function ilog(v) {
	let ret = 0;

	while (v != 0) {
		ret++;
		v = v >> 1;
	}

	return ret;
}
