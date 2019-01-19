import Controller from "./main";
import C from '../main/consts';
import { getFontSizeForTier } from "../main/helpers";

export default class ContentPane {

    private controller: Controller;

    private element: HTMLElement = document.getElementById('right-centre');
    private containerEl: HTMLElement;

    private termEl: HTMLElement;
    private terms: string[] = [];

    private hDividerEl: HTMLElement;
    private hDividers: number;

    private selected: HTMLElement;

    constructor(controller: Controller) {
        this.controller = controller;

        //Selection
        let select = document.createElement('div');
        select.innerHTML = 'Select';
        select.className = 'content';
        select.addEventListener('click', function() {
            //Select the clicked selection element
            this.select(select);
            //Tell the canvas to start selecting
            this.controller.currCanvas.select();
        }.bind(this));
        this.element.appendChild(select);

        //Containers
        let containerTitle = document.createElement('div');
        containerTitle.className = 'title';
        containerTitle.innerHTML = 'CONTAINER';
        this.element.appendChild(containerTitle);

        this.containerEl = document.createElement('div');
        this.element.appendChild(this.containerEl);
        this.addContainers();

        //Terms
        let termTitle = document.createElement('div');
        termTitle.className = 'title';
        termTitle.innerHTML = 'TERM';
        this.element.appendChild(termTitle);

        this.termEl = document.createElement('div');
        this.element.appendChild(this.termEl);

        let addTerm = document.createElement('div');
        addTerm.innerHTML = "add";
        addTerm.className = "content material-icons";
        addTerm.addEventListener('click', this.addTerm.bind(this));
        this.element.appendChild(addTerm);

        //H dividers
        this.hDividers = 0;
        let dividerTitle = document.createElement('div');
        dividerTitle.className = 'title';
        dividerTitle.innerHTML = "HORIZONTAL DIVIDER";
        this.element.appendChild(dividerTitle);

        this.hDividerEl = document.createElement('div');
        this.element.appendChild(this.hDividerEl);

        let addDivider = document.createElement('div');
        addDivider.innerHTML = 'add';
        addDivider.className = 'content material-icons';
        addDivider.addEventListener('click', this.addDivider.bind(this));
        this.element.appendChild(addDivider);
    }

    /**
     * Bring up a dialog to add a term.
     */
    private addTerm() {
        let termCont = document.createElement('div');

        let textBox: HTMLTextAreaElement = document.createElement('textarea');
        textBox.rows = 1;
        textBox.cols = 50;
        termCont.appendChild(textBox);
        
        function close() {
            this.newTerm(textBox.value);
            this.controller.removeModal();
            document.removeEventListener('keydown', onKey);
        };
        
        //Make enter mean OK too
        function onKey_(event) {
            if (event.key === 'Enter') {
                close.call(this);
            }
        };
        let onKey = onKey_.bind(this);
        document.addEventListener('keydown', onKey);
        
        let ok = this.controller.getOkButton(close.bind(this));
        termCont.appendChild(ok);
        
        this.controller.modal(termCont);
        textBox.focus();
    }
    
    //Add a new term
    private newTerm(text: string): void {
        let index = this.terms.length;
        this.terms[index] = text;

        let el = this.newTermEl(index);
        this.termEl.appendChild(el);
        this.select(el);
        this.controller.currCanvas.setAdding('t' + index);
        this.controller.setDisplayCanvas(this.controller.currCanvas.getStepAsInstructions());
    }

    /**
     * Return a new term element
     * representing content with a 
     * particular index.
     * 
     * @param index The index.
     */
    private newTermEl(index: number): HTMLElement {
        let el = document.createElement('div');
        el.innerHTML = this.terms[index];
        el.className = 'content';
        el.addEventListener('click', function () {
            this.deselect();
            this.select(el);
            this.controller.currCanvas.setAdding('t' + index);
        }.bind(this));
        return el;
    }

    /**
     * Add a new divider.
     */
    private addDivider() {
        this.hDividers++;
        this.refreshDividers();
        this.select(this.hDividerEl.children[this.hDividerEl.childElementCount - 1] as HTMLElement);
        this.controller.currCanvas.setAdding('h' + (this.hDividers - 1));
        this.controller.setDisplayCanvas(this.controller.currCanvas.getStepAsInstructions());
    }

    /**
     * Reset the divider selection elements
     * to match the content pane's model.
     */
    private refreshDividers() {
        let els = [];
        for (let i = 0; i < this.hDividers; i++) {
            let el = document.createElement('div');
            el.innerHTML = "" + i;
            el.className = 'content';
            el.addEventListener('click', function(select: HTMLElement, index: number) {
                this.deselect();
                this.select(select);
                this.controller.currCanvas.setAdding('h' + index);
            }.bind(this, el, i));
            els.push(el);
        }
        this.controller.fillEl(this.hDividerEl, els);
    }

    /**
     * Unhighlight selectable content.
     */
    private deselect(): void {
        if (this.selected) {
            this.selected.classList.remove('selected');
            this.selected = undefined;
        }
    }

    /**
     * Select an element.
     * 
     * @param el The element to select.
     */
    private select(el: HTMLElement): void {
        this.deselect();
        this.selected = el;
        this.selected.classList.add('selected');
    }

    /**
     * Add elements to select the available
     * containers.
     */
    private addContainers(): void {

        let vbox = document.createElement('div');
        vbox.innerHTML = 'vbox';
        vbox.className = 'content';
        let addVbox = function () {
            this.controller.currCanvas.setAdding({
                type: 'vbox',
                children: [

                ]
            });
            this.deselect();
            this.select(vbox);
            vbox.classList.add('selected');
        }.bind(this);
        vbox.addEventListener('click', addVbox.bind(this));
        this.containerEl.appendChild(vbox);

        let hbox = document.createElement('div');
        hbox.innerHTML = 'hbox';
        hbox.className = 'content';
        let addHbox = function () {
            this.controller.currCanvas.setAdding({
                type: 'hbox',
                children: [

                ]
            });
            this.deselect();
            this.select(hbox)
        }.bind(this);
        hbox.addEventListener('click', addHbox);
        this.containerEl.appendChild(hbox);

        let tightHbox = document.createElement('div');
        tightHbox.innerHTML = 'tight hbox';
        tightHbox.className = 'content';
        let addTightHbox = function () {
            this.controller.currCanvas.setAdding({
                type: 'tightHBox',
                children: [

                ]
            });
            this.deselect();
            this.select(tightHbox)
        }.bind(this);
        tightHbox.addEventListener('click', addTightHbox);
        this.containerEl.appendChild(tightHbox);

        let subSuper = document.createElement('div');
        subSuper.innerHTML = 'Pow/Subscript';
        subSuper.className = 'content';
        let addSubSuper = function () {
            this.controller.currCanvas.setAdding({
                type: 'subSuper',
                top: [],
                middle: [],
                bottom: []
            });
            this.deselect();
            this.select(subSuper)
        }.bind(this);
        subSuper.addEventListener('click', addSubSuper);
        this.containerEl.appendChild(subSuper);
    }

    /**
     * Update the elements to cause
     * adding of the correct content.
     * Called after removal of a piece
     * of content.
     */
    private refreshTerms() {
        this.termEl.innerHTML = "";
        for (let i = 0; i < this.terms.length; i++) {
            this.termEl.appendChild(this.newTermEl(i));
        }
    }

    /**
     * Get the font metrics object for the
     * terms in this slideshow.
     */
    getMetrics(): Object {
        let metricsArr = [];
        //Calculate a metrics object for each width tier
        for (let i = 0; i < C.widthTiers.length; i++) {
            let metrics = {};
            metricsArr.push(metrics);

            metrics['widths'] = [];
    
            /* Look for the max ascent and
               descent, which all terms will use. */
            let maxAscent = 0;
            let maxDescent = 0;
            this.terms.forEach(term => {
                let termMetrics = this.measureTerm(term, i);
                if (termMetrics['ascent'] > maxAscent) {
                    maxAscent = termMetrics['ascent'];
                }
                if (termMetrics['descent'] > maxDescent) {
                    maxDescent = termMetrics['descent'];
                }
                //All terms have their own width
                metrics['widths'].push(termMetrics['width']);
            });
            metrics['ascent'] = maxAscent;
            metrics['height'] = maxAscent + maxDescent;
        }
        return metricsArr;
    }

    /**
     * Measure the metrics for a term.
     * 
     * @param term The term to measure.
     * @param tier The width tier to measure this term for.
     */
    private measureTerm(term: string, tier: number): object {
        let toReturn = {};

        let fontSize = getFontSizeForTier(tier);

        //Create a canvas to measure with
        let testCanvas = document.createElement("canvas");
        testCanvas.width = C.testCanvasWidth;
        testCanvas.height = fontSize * C.testCanvasFontSizeMultiple;
        let testCtx = testCanvas.getContext("2d");
        testCtx.font = fontSize + "px " + C.fontFamily;

        //Get the width
        toReturn['width'] = testCtx.measureText(term).width;

        //Draw the text on the canvas to measure ascent and descent
        testCtx.fillStyle = "white";
        testCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
        testCtx.fillStyle = "black";
        testCtx.fillText(term, 0, testCanvas.height / 2);

        let image = testCtx.getImageData(0, 0, toReturn['width'], testCanvas.height);
        let imageData = image.data;
        
        //Go down until we find text
        let i = 0;
        while (++i < imageData.length && imageData[i] === 255);
        let ascent = i / (image.width * 4);
        
        //Go up until we find text
        i = imageData.length - 1;
        while (--i > 0 && imageData[i] === 255);
        let descent = i / (image.width * 4);
        
        toReturn['ascent'] = testCanvas.height / 2 - ascent;
        toReturn['descent'] = descent - testCanvas.height / 2;

        return toReturn;
    }

    /**
     * Returns the reference of the
     * selected content. If nothing is
     * selected, returns undefined.
     */
    private findRefOfSelected(): string {
        //Search terms
        for (let i = 0; i < this.termEl.childElementCount; i++) {
            let currEl = this.termEl.children[i];
            if (currEl === this.selected) {
                return 't' + i;
            }
        }
        //Search h dividers
        for (let i = 0; i < this.hDividerEl.childElementCount; i++) {
            let currEl = this.hDividerEl.children[i];
            if (currEl === this.selected) {
                return 'h' + i;
            }
        }
    }

    /**
     * Given a reference to content,
     * delete the content pane's copy
     * of the content from its arrays.
     * 
     * @param ref The reference of the content to delete.
     */
    private deleteContent(ref: string) {
        let type: string = ref.charAt(0);
        let index: number = parseFloat(ref.substring(1, ref.length));

        if (type === 't') {
            this.terms.splice(index, 1);
            this.refreshTerms();
        } else if (type === 'h') {
            this.hDividers--;
            this.refreshDividers();
        } else {
            throw "unrecognized content type";
        }
    }

    /**
     * Delete the currently selected content.
     */
    delete() {
        if (this.selected === undefined) {
            throw "select content to delete";
        }
        if (this.selected.parentElement === this.element) {
            throw "can't delete that";
        }
        if (this.selected.parentElement === this.containerEl) {
            throw "can't delete that";
        }
        //Look through content to see if selected is there
        let ref = this.findRefOfSelected();

        //Remove element representing the content
        this.selected.parentElement.removeChild(this.selected);
        this.deselect();

        //Remove from array
        this.deleteContent(ref);

        //Remove the content from all steps
        this.controller.slideManager.removeContent(ref);
    }

    getTerms(): string[] {
        return this.terms;
    }

    getDividers(): number {
        return this.hDividers;
    }

    /**
     * Add content information to
     * a JSON object for saving.
     * 
     * @param toJSON The JSON object.
     */
    addJSON(toJSON: Object): void {
        toJSON['metrics'] = this.getMetrics();
        toJSON['hDividers'] = this.hDividers;
        toJSON['terms'] = this.terms;
    }

    /**
     * Load the content pane from an
     * instructions object.
     * 
     * @param instructions The instructions object.
     */
    fromJSON(instructions: Object): void {
        this.selected = undefined;
        this.terms = instructions['terms'];
        this.refreshTerms();
        this.hDividers = instructions['hDividers'];
        this.refreshDividers();
    }
}