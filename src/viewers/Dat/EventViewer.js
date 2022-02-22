
export class EventViewer {
    constructor(dat) {
        this.file = dat;
    }

    // Renders in the Explorer.
    render() { 
        return '<div class="viewer">View in Event Viewer</div>';
    }

    view(scope=this) {
        $('main').html('Coming soon.');
    }

    addListener() {
        $(`#folder-${this.file.id}`).children('.folder-files').children('.viewer')
        .off('click')
        .on('click', (event) => {
            this.view(this);
            event.stopPropagation();
        })
    }
}