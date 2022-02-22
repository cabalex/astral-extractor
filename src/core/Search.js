import { Folder } from './Folder.js';


export class Search {
    constructor(explorer) {
        this.explorer = explorer;
        this.selectedIndex = -1;
    }
    
    search() {
        this.selectedIndex = -1;

        const val = $('#search > input').val().toLowerCase();

        $('.sr').off('click');
        if (val.length < 2) {
            $('#search-completions').html('');
            return;
        }
        
        const results = this.explorer.rootDirectory.search(val);

        results.sort((a, b) => {if (a.type == 'folder') return -1; return 1});

        var output = '';

        const regexp = new RegExp(val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig');
        results.forEach((elem) => {
            if (elem.ext == 'dtt') { return }; // don't match dtt files

            const useTrueName = elem.name.toLowerCase().includes(val.toLowerCase());
            let path = this.explorer.getPathFromFile(elem);

            let displayPath = '<span class="sr-path">' + path.slice(0, path.length - 1).join('/') +
                (path.length - 1 > 0 ? '/<br>' : '') + '</span>';

            let escapedName = (useTrueName ? elem.name : elem.friendlyName).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\$&');
            let highlightedName = displayPath + escapedName.replace(new RegExp(regexp, 'ig'), '<b>$&</b>').replace('\\', '')

            output += `<div id="${path.join('/')}" class="sr ${elem.type == 'folder' ? 'folder' : 'explorerFile'} ${elem.ext}">${highlightedName}${useTrueName ? "" : `<div class="sr-subtext">${elem.name}</div>`}</div>`
        })

        $('#search-completions').html(output);
        $('.sr').on('click', (event) => {
            this.searchNavigate($(event.target).closest('.sr').attr('id'));
            $('#search-completions').slideUp(100); })
    }

    searchNavigate(path) {
        this.explorer.navigatePathForFile(path);
    }

    addListener() {
        $('#search').off('keyup').off('blur')
            .on('keyup', (event) => {
                $('#search-completions').slideDown(100) // redundancy; fixes bug where textbox stays focused

                switch(event.keyCode) {
                    case 13: // enter - go to selected item if selected
                        if (this.selectedIndex >= 0) {
                            $('#search').blur();
                            $('.sr').removeClass('active');
                            $('.sr')[this.selectedIndex].click();
                            this.selectedIndex = -1;
                        }
                        return;

                    case 38: // up - move up
                        if (this.selectedIndex > 0) {
                            this.selectedIndex--;
                        }
                        break;

                    case 40: // down - move down
                        if (this.selectedIndex < $('.sr').length - 1 && this.selectedIndex >= 0) {
                            this.selectedIndex++;
                        }
                        break;

                    default: // if any other key, search with this query
                        this.search();
                        $('.sr').removeClass('active');
                        return;
                }
                // up or down keys

                if (this.selectedIndex == -1) {
                    this.selectedIndex = 0;
                }
                
                $('.sr').removeClass('active');
                $('.sr')[this.selectedIndex].classList.add('active');
            })
            .on('blur', () => { $('#search-completions').slideUp(100) })
        
        $(window).on('click', (e) => {
            if(!$(e.target).closest('#search').length) {
                $('#search-completions').slideUp(100);
            }
        })
        
        // only when input is focused
        $('#search > input').off('focus')
        .on('focus', () => { $('#search-completions').slideDown(100) })
    }

    render() {
        return `<div id="search"><input type="text" autocomplete="off" placeholder="SEARCH..."><div id="search-completions"></div></div>`
    }
}