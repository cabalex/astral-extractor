import { ExplorerFile } from "../core/ExplorerFile.js";
import { readableBytes } from "../core/Explorer.js";

export class Bk2 extends ExplorerFile {
    constructor(arrayBuffer, name, size) {
        super(name, size, arrayBuffer);
    }

    async load() {
        return "<section><div>Astral Extractor doesn't support native BK2 file opening and conversion. Try using RAD Video Tools:</div><br><br><a href=\"http://www.radgametools.com/down/Bink/RADTools.7z\"><img src=\"http://www.radgametools.com/images/bink.jpg\"></div></section>"
    }
}