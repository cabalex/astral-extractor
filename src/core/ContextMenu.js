export class ContextMenu {
    constructor(explorer) {
        this.explorer = explorer;
        this.activeOpts = {};
        $('.explorerFile').on('contextmenu', this.openContextMenu);
        $(document).bind('mousedown', (e) => {
            if ($(e.target).closest('.contextMenu').length == 0) {
                this.close();
            }
        })
    }

    open(event, json) {
        this.close();
        this.activeOpts = json;

        let output = `<ul style="transform: translateX(${event.pageX + 10}px) translateY(${event.pageY}px)" class="contextMenu"><li>${json.scope.name}</li>`;
        for (const [key, value] of Object.entries(json.items)) {
            if (key.includes('<!--spacing')) {
                output += `<li class="spacing"></li>`;
            } else if (typeof value === 'string') {
                output += `<li class="contextDisplay"><span class="contextKey">${key}</span> ${value}</li>`;
            } else {
                // if "danger" in comment, then make the item red
                output += `<li class="contextItem ${key.includes('<!--danger-->') ? 'contextItemDanger' : ''}" id="cm-${key}">${key}</li>`;
            }
        }

        $('body').append(output + '</ul>');
        $('.contextMenu').show(100);
        $('.contextItem').on('click', (event) => {
            this.activeOpts['items'][event.target.id.slice(3)].call(this.activeOpts.scope);
            this.close();
        })
    }

    close() {
        $('.contextMenu').hide(100, function() { this.remove() });
    }
}