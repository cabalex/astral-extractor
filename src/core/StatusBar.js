
export class StatusBar {
    constructor() {
        this.defaultMessage = 'Ready'
        let defaultStatusText = $('#status').html();
        $('#status').replaceWith('<footer id="status">' + defaultStatusText + " - " + this.defaultMessage + '</footer>');
    }

    setMessage(msg, timeout=-1, percent=0) {
        $('#status').text(msg);
        if (percent > 0) {
            document.documentElement.style.setProperty('--status-percent', percent + '%');
            document.documentElement.style.setProperty('--status-background', 'var(--primary)');
        } else {
            document.documentElement.style.setProperty('--status-percent', '100%');
            document.documentElement.style.setProperty('--status-background', 'var(--dark-grey)');
        }
        
        
        if (timeout > 0) {
            setTimeout(() => { 
                if (msg == $('#status').text()) {
                    $('#status').text('Ready');
                }
            }, timeout)
        }
    }
    
    removeMessage() {
        $('#status').text(this.defaultMessage);
    }
}