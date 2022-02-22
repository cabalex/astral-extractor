import * as THREE from 'https://cdn.skypack.dev/three';
import { loadMap } from '../THREE/MapLoader.js';
import { TransformControls } from '../THREE/TransformControls.js';
import { OrbitControls } from '../THREE/OrbitControls.js';

import { questAreaLookup, questLookup, lookup } from '../../core/LookupTable.js';
import { loadBxmAsEmSet } from '../Bxm/EmSet.js';

export class QuestViewer {
    constructor(dat) {
        this.file = dat;
        this.mouse = new THREE.Vector2(1, 1);
        this.realMouse = new THREE.Vector2(1, 1);
        this.renderer = null;
        this.loadedData = {
            emSets: [],
            areas: [],
            tasks: []
        }
    }

    // Renders in the Explorer.
    render() { 
        return '<div class="viewer">View in Quest Editor</div>';
    }

    // Adds listeners once loaded.
    addLoadListener(scope=this) {
        $(window).off('resize').on('resize', () => {
            scope.renderer.setSize($('main').width(), $('main').height());
            scope.camera.aspect = $('main').width() / $('main').height();
            scope.camera.updateProjectionMatrix();
        });

        $('main').off('mousemove').on('mousemove', (event) => {
            scope.mouse.x = ( (event.clientX - $('main').offset().left) / $('main').width() ) * 2 - 1;
    	    scope.mouse.y = - ( (event.clientY - $('main').offset().top) / $('main').height() ) * 2 + 1;
            scope.realMouse.x = (event.clientX - $('main').offset().left);
            scope.realMouse.y = (event.clientY - $('main').offset().top);
        })

        scope.animate(scope);
    }

    // Animate the scene, played on each animation frame after loading.
    animate(scope=this) {
        requestAnimationFrame(() => {scope.animate(scope)});
        
        scope.scene.updateMatrixWorld(); // VERY IMPORTANT

        scope.raycaster.setFromCamera(scope.mouse, scope.camera);

        let emGroup = scope.scene.getObjectByName('EmGroup');

        let intersects = scope.raycaster.intersectObject(emGroup, true);
        if (intersects.length > 0) {
            let object = intersects[0].object;

            $('main > .threejs-hover-text')
                .css({
                    left: scope.realMouse.x,
                    top: scope.realMouse.y,
                    display: 'block'
                })
                .text(lookup(questLookup(parseInt(object.name.split('-')[1]).toString(16))));

            if (!object.material.userData.oldColor) {

                object.material.userData.oldColor = object.material.color.getHex();
                object.material.color.setHex( object.material.userData.oldColor * 4 );
            }
            
        } else {
            $('main > .threejs-hover-text').css('display', 'none');
        }

        // reset selected colors
        emGroup.children.forEach((object) => {
            if (intersects.length && object == intersects[0].object) return;
            if (object.material.userData.oldColor) {
                object.material.color.setHex(object.material.userData.oldColor);
                delete object.material.userData.oldColor;
            }
        })


        scope.renderer.render(scope.scene, scope.camera);
    }

    // Initialize the quest editor.
    async view(scope=this) {
        if (window.loaded) {
            window.loaded.unload();
        }
        $('#file-data-content').text('');

        [scope.renderer, scope.scene, scope.camera, scope.controls, scope.transformControls, scope.raycaster] =
            await scope.load(scope).catch(error => {$('main').html(error); console.error(error)});

        if (!scope.renderer) return; // if error, none will be loaded
        window.scene = scope.scene; // debugging

        scope.renderer.setSize($('main').width(), $('main').height());

        $('main').html(scope.renderer.domElement);
        window.loaded = this;

        $('main').append('<div class="threejs-hover-text">Nothing selected</div>');
        $('main').append(`
<div class="threejs-panel">
    <section class="panel-tablist">
        <div class="panel-tab material-icons active">help</div>
        <div class="panel-tab material-icons">people</div>
        <div class="panel-tab material-icons">location_on</div>
        <div class="panel-tab material-icons">history</div>
        <div class="panel-tab material-icons">message</div>
        <div class="panel-tab close-tab material-icons">close</div>
    </section>
    <section class="help-section">
        <h1>Quest Editor - ${lookup(this.file.name)}</h1>
        <h3>Controls</h3>
        <p><span class="material-icons">360</span> Left click drag to rotate the camera.</p>
        <p><span class="material-icons">open_with</span> Right click drag to pan the camera.</p>
        <p><span class="material-icons">zoom_in</span> Zoom in and out with the scroll wheel.</p>
        <p><span class="material-icons">not_listed_location</span> Click an object in the world to see info about it.</p>
        <h3>Sections</h3>
        <p><span class="material-icons">help</span> Help (you're here)</p>
        <p><span class="material-icons">people</span> EmSets (enemies, NPCs, objects, etc)</p>
        <p><span class="material-icons">location_on</span> Areas (how the game detects you)</p>
        <p><span class="material-icons">history</span> Tasks (logic the game runs)</p>
        <p><span class="material-icons">message</span> TalkScripts (Dialogue)</p>
        <h3>Need more help?</h3>
        <p><a href="https://github.com/cabalex/astral-extractor/wiki/Using-the-Quest-Editor">How to use the Quest Editor</a></p>
        <p><a href="https://github.com/cabalex/astral-extractor/wiki/Cases-and-quests">About Cases and Quests</a></p>
    </section>
</div>
        `)
        scope.addLoadListener(scope);

        window.statusBar.setMessage(`Loaded Quest Viewer for ${scope.file.name}`, 2000);
    }

    // On unload.
    unload() {}

    // Add listener when loading the Explorer.
    addListener() {
        let scope = this;
        $(`#folder-${this.file.id}`).children('.folder-files').children('.viewer')
        .off('click')
        .on('click', (event) => {
            this.view(this);
            event.stopPropagation();
        })
    }

    // Loads the viewer and returns a [WebGLRenderer, scene, camera].
    async load(scope=this) {
        const scene = questAreaLookup(scope.file.name) ? await loadMap(questAreaLookup(scope.file.name).split('.')[0]) : new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, $('main').width() / $('main').height(), 0.1, 1000 );
        const renderer = new THREE.WebGLRenderer({alpha: true});
        const controls = new OrbitControls( camera, renderer.domElement );
        const transformControls = new TransformControls( camera, renderer.domElement );
        const raycaster = new THREE.Raycaster();

        scope.ObjectToEm = new Map();

        camera.position.set( 0, 100, 0 );
        camera.lookAt(0, 0, 0)
        controls.listenToKeyEvents( $('main')[0] );

        scene.add(new THREE.AmbientLight( 0xa0a0a0 )); // soft white light

        // add EmSets
        if (scope.file.files.has('EnemySet.bxm')) {
            let emGroup = new THREE.Group();
            emGroup.name = 'EmGroup';
            let emSet = await loadBxmAsEmSet(scope.file.files.get('EnemySet.bxm'));

            const geometry = new THREE.BoxGeometry(1, 2, 1);
            geometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, 1, 0));

            // iterate through file, then emsets, then ems
            emSet.forEach((emSets, emSetNo) => {
                emSets.forEach(em => {
                    const material = new THREE.MeshBasicMaterial( { color: new THREE.Color(`hsl(${emSetNo*10},90%,50%)`), wireframe: true} );

                    let cube = new THREE.Mesh( geometry, material );
                    cube.position.set(...em.getPosition());
                    cube.rotation.y = parseFloat(em.attributes.Rotation);
                    cube.name = 'Em-' + em.attributes.Id;

                    // No-Entry Wall visualization
                    let id = parseInt(em.attributes.Id);
                    if ((id > 0xC9FFF && id < 0xCA004) || (id > 0xCA02F && id < 0xCA035)) {
                        cube.scale.x = parseInt(em.attributes.Type);
                        cube.scale.y = 3.5;
                    }

                    emGroup.add( cube );
                    scope.ObjectToEm.set(cube, em);
                })
            })

            scene.add(emGroup);
        }

        return [renderer, scene, camera, controls, transformControls, raycaster];
    }
}