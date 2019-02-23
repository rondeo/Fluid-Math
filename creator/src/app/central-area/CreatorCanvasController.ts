import CanvasController from '@shared/main/CanvasController';
import EqContainer from '@shared/layout/EqContainer';
import C from '@shared/main/consts';
import VBox from '@shared/layout/VBox';
import HBox from '@shared/layout/HBox';
import TightHBox from '@shared/layout/TightHBox';
import SubSuper from '@shared/layout/SubSuper';
import EqComponent from '@shared/layout/EqComponent';
import LayoutState from '@shared/animation/LayoutState';
import EqContent from '@shared/layout/EqContent';
import HDivider from '@shared/layout/HDivider';
import { deepClone, inLayout } from '../helpers';
import { UndoRedoService } from '../undo-redo.service';
import { ContentSelectionService } from '../content-selection.service';
import { SelectedStepService } from '../selected-step.service';
import { ErrorService } from '../error.service';

export default class CreatorCanvasController extends CanvasController {

    private originalInstructions;

    private rootContainer: EqContainer;

    private undoRedo: UndoRedoService;
    private selection: ContentSelectionService;
    private step: SelectedStepService;
    private error: ErrorService;

    private selectedLayout: LayoutState;

    constructor(container: HTMLElement, instructions, undoRedo, selection, step: SelectedStepService, error: ErrorService) {
        super(container, instructions);
        // Remove progress line and upper area
        container.removeChild(container.firstChild);
        container.removeChild(container.firstChild);
        this.undoRedo = undoRedo;
        this.selection = selection;
        this.step = step;
        this.error = error;
        this.redraw = this.redraw.bind(this);
        this.delete = this.delete.bind(this);
        this.selection.addSelectedOnCanvasListener(() => {
            if (this.selection.selectedOnCanvas === undefined) {
                this.selectedLayout = undefined;
            }
            this.redraw();
        });
        this.selection.canvasInstance = this;
        this.currStep = step.selected;
        this.recalc();
        // Don't allow going to next step
        this.canvas.removeEventListener('click', this.nextStep);
        this.originalInstructions = instructions;
        // Whether dragging or clicking, mouse up could mean add
        this.onMoveOver = this.onMoveOver.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.canvas.addEventListener('click', this.onMouseUp);
        this.canvas.addEventListener('drop', (e) => {
            this.onMouseUp(e);
            e.preventDefault();
        });
        this.canvas.addEventListener('dragover', this.onMoveOver);
        this.canvas.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });
        this.canvas.setAttribute('droppable', 'true');
    }

    /**
     * Fires when mouse moved over canvas.
     * @param e The mouse event.
     */
    private onMoveOver(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.selection.adding) {
            this.previewAdd(e.offsetX, e.offsetY);
        }
    }

    /**
     * Fires when mouse is released over the canvas.
     * @param e The mouse event.
     */
    private onMouseUp(e: MouseEvent) {
        if (this.selection.adding) {
            this.finalizeAdd(e.offsetX, e.offsetY);
        } else {
            e.stopPropagation();
            this.select(e.offsetX, e.offsetY);
        }
    }

    redraw() {
        super.redraw();
        this.currStates.forEach(l => {
            if (l.component instanceof EqContainer) {
                l.component.creatorDraw(l, this.ctx);
            }
            if (this.selection) {
                if (l.component instanceof EqContent &&
                    this.getContentReference(l.component) === this.selection.adding) {
                    // Highlight what's selected on the content pane.
                    this.ctx.save();
                    this.ctx.strokeStyle = '#2196F3';
                    this.ctx.rect(l.tlx, l.tly, l.width, l.height);
                    this.ctx.stroke();
                    this.ctx.restore();
                } else if (l === this.selectedLayout) {
                    this.ctx.save();
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    this.ctx.fillRect(l.tlx, l.tly, l.width, l.height);
                    this.ctx.restore();
                }
            }
        });
    }

    /**
     * Recalculates and redraws the current step.
     * Override to store the root layout for later.
     */
    protected recalc() {
        // Whenever we recalc, the selection becomes invalid as we have new
        // layout states.
        if (this.selection) {
            this.selection.selectedOnCanvas = undefined;
            this.selectedLayout = undefined;
        }
        let rootLayout;
        [this.currStates, rootLayout] = this.calcLayout(this.currStep);
        this.rootContainer = rootLayout.component;
        const [width, height] = this.getSize(rootLayout);
        this.setSize(width, height);
        this.redraw();
    }

    // Override to change padding
    protected parseContainer(containerObj): EqContainer {
        const type: string = containerObj.type;
        if (type === 'vbox') {
            return new VBox(
                this.parseContainerChildren(containerObj.children),
                C.creatorContainerPadding);
        } else if (type === 'hbox') {
            return new HBox(
                this.parseContainerChildren(containerObj.children),
                C.creatorContainerPadding);
        } else if (type === 'tightHBox') {
            return new TightHBox(
                this.parseContainerChildren(containerObj.children),
                C.creatorContainerPadding
            );
        } else if (type === 'subSuper') {
            const top = new HBox(
                this.parseContainerChildren(containerObj.top),
                C.creatorContainerPadding
            );
            const middle = new TightHBox(
                this.parseContainerChildren(containerObj.middle),
                C.creatorContainerPadding
            );
            const bottom = new HBox(
                this.parseContainerChildren(containerObj.bottom),
                C.creatorContainerPadding
            );
            const portrusion = containerObj.portrusion ? containerObj.portrusion : C.defaultExpPortrusion;
            return new SubSuper(top, middle, bottom, portrusion, C.creatorContainerPadding);
        } else if (type === undefined) {
            throw new Error('Invalid JSON File: Missing type attribute on container descriptor.');
        } else {
            throw new Error('Invalid JSON File: Unrecognized type: ' + type);
        }
    }

    /**
     * Add something at (x, y) and save the new state.
     * @param x X-ordinate of mouse
     * @param y Y-ordinate of mouse
     */
    private finalizeAdd(x: number, y: number) {
        this.undoRedo.publishChange(this.getChangedLayout(x, y, true));
        this.selection.adding = undefined;
    }

    /**
     * Add something at (x, y), but show a preview without saving the state.
     * @param x X-ordinate of mouse.
     * @param y Y-ordinate of mouse.
     */
    private previewAdd(x: number, y: number) {
        const newLayout: any = this.getChangedLayout(x, y, false);
        const realSteps = this.steps;
        this.steps = newLayout.steps;
        super.recalc();
        this.steps = realSteps;
        let newRootState;
        [this.currStates, newRootState] = this.calcLayout(this.currStep);
        this.rootContainer = newRootState.component;
    }

    /**
     * Get the new layout resulting from adding something at (x, y)
     * @param x The x-ordinate of the mouse.
     * @param y The y-ordinate of the mouse.
     * @param showError Whether to show an error message onscreen if one occurs.
     */
    private getChangedLayout(x: number, y: number, showError: boolean): object {
        // Check if the content is already on the canvas
        if (this.onCanvas()) {
            if (showError) {
                this.error.text = 'Duplicate content not allowed in a step.';
            }
            return this.getLayoutForPublish();
        }
        const clickedLayout: LayoutState = this.getClickedLayout(x, y);
        if (clickedLayout === undefined) {
            // Didn't click on anything
            return this.getLayoutForPublish();
        } else if (clickedLayout.component instanceof EqContent) {
            this.addClickOnComponent(clickedLayout, x, y);
        } else if (clickedLayout.component instanceof EqContainer) {
            try {
                clickedLayout.component.addClick(clickedLayout, x, y, this.getAddComponent());
            } catch (e) {
                if (showError) {
                    this.error.text = e.message;
                }
            }
        } else {
            return this.getLayoutForPublish();
        }
        return this.getLayoutForPublish();
    }

    /**
     * Get the current layout in the format
     * that can be published.
     */
    private getLayoutForPublish(): object {
        const newStepLayout = this.rootContainer.toStepLayout(this);
        const origInstructionsClone: any = deepClone(this.originalInstructions);
        origInstructionsClone.steps[this.currStep].root = newStepLayout;
        return origInstructionsClone;
    }

    /**
     * Adds content when the click was on a
     * component. This adds the content
     * adjacent to the component.
     * @param clickedLayout The Layout state of the clicked component.
     * @param x The x-ordinate clicked.
     * @param y The y-ordinate clicked.
     */
    private addClickOnComponent(clickedLayout: LayoutState, x: number, y: number): void {
        // Add adjacent to content
        const container: EqContainer = clickedLayout.layoutParent.component as EqContainer;
        container.addClickOnChild(clickedLayout, x, y, this.getAddComponent());
    }

    /**
     * Given clicked coordinates, find
     * the layout that was clicked. If not
     * found, returns undefined.
     * @param x X-ordinate on the canvas.
     * @param y Y-ordinate on the canvas.
     */
    protected getClickedLayout(x: number, y: number): LayoutState {
        let clicked;
        this.currStates.forEach(currState => {
            if (!clicked && currState.contains(x, y)) {
                clicked = currState;
            }
        });
        return clicked;
    }

    /**
     * Whether the component to be added
     * is already on the canvas.
     */
    private onCanvas(): boolean {
        // Duplicate containers allowed
        if (this.selection.addingContainer()) {
            return false;
        }

        return inLayout(this.steps[this.currStep].root, this.selection.adding);
    }

    /**
     * Select something at (x, y)
     * @param x X-ordinate of mouse.
     * @param y Y-ordinate of mouse.
     */
    private select(x: number, y: number) {
        const selectedLayout = this.getClickedLayout(x, y);
        if (!selectedLayout) {
            return;
        }
        const selectedComponent = selectedLayout.component;
        const select = (ref: string) => {
            this.selectedLayout = selectedLayout;
            this.selection.selectedOnCanvas = ref;
        };
        if (selectedComponent instanceof EqContainer) {
            if (selectedComponent instanceof TightHBox) {
                select('c2');
            } else if (selectedComponent instanceof HBox) {
                select('c0');
            } else if (selectedComponent instanceof VBox) {
                select('c1');
            } else if (selectedComponent instanceof SubSuper) {
                select('c3');
            } else {
                throw new Error('Unrecognized container selected.');
            }
        } else if (selectedComponent instanceof EqContent) {
            select(this.getContentReference(selectedComponent));
        }
    }

    /**
     * Delete the currently selected component.
     * @param state The layout state generated by a component.
     */
    delete() {
        const parent = (this.selectedLayout.layoutParent.component as EqContainer);
        parent.delete(this.selectedLayout.component);
        this.undoRedo.publishChange(this.getLayoutForPublish());
    }

    /**
     * Return whether something is selected
     * and it can be deleted.
     */
    canDelete() {
        return  this.selectedLayout &&
                this.selectedLayout.layoutParent &&
                !(this.selectedLayout.layoutParent.component instanceof SubSuper);
    }

    /**
     * Returns the thing to add as a component.
     */
    private getAddComponent(): EqComponent {
        if (this.selection.addingContainer()) {
            // Adding a container
            return this.parseContainer(this.selection.getContainer());
        } else {
            return this.getContentFromRef(this.selection.adding);
        }
    }

    // Override to give h dividers some padding
    protected initContent(instructions) {
        super.initContent(instructions);
        this.hDividers = [];
        for (let i = 0; i < instructions.hDividers; i++) {
            this.hDividers.push(new HDivider(C.creatorHDividerPadding, 'h' + i));
        }
    }

    /**
     * Apply color and opacity to the currently
     * selected component. If content is selected,
     * just applies to that content. If a container
     * is selected, applies to all content contained
     * within it.
     * @param opacity The opacity to apply.
     * @param colorName The name of the color to apply.
     */
    applyColorAndOpacity(opacity: number, colorName: string) {
        const selected = this.selectedLayout.component;
        const newState: any = this.undoRedo.getStateClone();
        const step = newState.steps[this.currStep];
        if (selected instanceof EqContent) {
            this.applyColor(selected, colorName, step);
            this.applyOpacity(selected, opacity, step);
        } else if (selected instanceof EqContainer) {
            selected.forEachUnder((content) => {
                this.applyColor(content, colorName, step);
                this.applyOpacity(content, opacity, step);
            });
        }
        this.undoRedo.publishChange(newState);
    }

    /**
     * Applies color to a particular piece of content.
     * @param content The content to apply color to.
     * @param colorName The name of the color.
     * @param stepObj The step object to apply to.
     */
    private applyColor(content: EqContent<any>, colorName: string, stepObj) {
        if (stepObj.color === undefined) {
            stepObj.color = {};
        }
        const ref = this.getContentReference(content);
        if (colorName === 'default') {
            // Remove any color already set for this content
            delete stepObj.color[ref];
            if (Object.keys(stepObj.color).length === 0) {
                // Empty colors, delete as well
                delete stepObj.color;
            }
        } else {
            stepObj.color[ref] = colorName;
        }
    }

    /**
     * Applies opacity to a particular piece of content.
     * @param content The content to apply opacity to.
     * @param opacity The opacity to apply.
     * @param stepObj The step object to apply to.
     */
    private applyOpacity(content: EqContent<any>, opacity: number, stepObj) {
        if (stepObj.opacity === undefined) {
            stepObj.opacity = {};
        }
        const ref = this.getContentReference(content);
        if (opacity === C.normalOpacity) {
            // Remove any opacity already set for this content
            delete stepObj.opacity[ref];
            if (Object.keys(stepObj.opacity).length === 0) {
                // Empty opacity, delete as well
                delete stepObj.opacity;
            }
        } else {
            stepObj.opacity[ref] = opacity;
        }
    }

    /**
     * Change the currently showing step.
     * @param newStep The new step to show.
     */
    showStep(newStep: number) {
        this.currStep = newStep;
        this.recalc();
    }

    /**
     * Return the step layout of the currently
     * selected container.
     */
    getStepLayoutOfSelected() {
        const container = this.selectedLayout.component as EqContainer;
        return container.toStepLayout(this);
    }

    /**
     * Get the currently selected layout state.
     */
    getSelectedLayout() {
        return this.selectedLayout;
    }

    /**
     * Create a new state with the changes
     * made to this canvas saved.
     */
    save() {
        const newState: any = this.undoRedo.getStateClone();
        newState.steps[this.step.selected].root = this.rootContainer.toStepLayout(this);
        this.undoRedo.publishChange(newState);
    }
}
