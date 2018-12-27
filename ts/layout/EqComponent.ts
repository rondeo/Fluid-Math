import Frame from '../animation/Frame';
import Padding from './Padding';
import EqContainer from './EqContainer';

export default abstract class EqComponent {

    protected fixedWidth: number = -1;
    protected fixedHeight: number = -1;
    //The container of this component.
    //If undefined, is root component.
    padding: Padding;

    constructor(padding) {
        this.padding = padding;
    }

    setFixedWidth(newWidth: number) {
        this.fixedWidth = newWidth;
    }

    setFixedHeight(newHeight: number) {
        this.fixedHeight = newHeight;
    }

    getWidth(): number {
        if (this.fixedWidth < 0) {
            return this.calcWidth();
        } else {
            return this.fixedWidth;
        }
    }

    getHeight(): number {
        if (this.fixedHeight < 0) {
            return this.calcHeight();
        } else {
            return this.fixedHeight;
        }
    }

    protected abstract calcWidth(): number;
    protected abstract calcHeight(): number;

    /**
     * Add the Drawable for this component, and any other
     * related components such as children of a container.
     * 
     * @param parentFrame The frame of the container containing this component.
     * @param drawables The array of drawables to add to.
     * @param tlx The left x of this component.
     * @param tly The top y of this component.
     * @param currScale The current canvas scaling factor.
     */
    abstract addDrawable(parentFrame: Frame, drawables: Frame[], tlx: number, tly: number, currScale: number): Frame;

    /**
     * Draws the component on the canvas.
     * 
     * @param f The frame to draw.
     * @param ctx The context of the canvas to draw on.
     */
    abstract draw(f: Frame, ctx: CanvasRenderingContext2D);

    /**
     * Return a Component an amount-th between
     * this component and another component. For
     * example, amount=0.5 means halfway between. 
     * 
     * @param otherComp The other component
     * @param amount The percentage between as a decimal.
     */
    abstract interpolate(otherComp: EqComponent, amount: number): EqComponent;

    /**
     * Whether this component should be animated.
     */
    abstract shouldAnimate(): boolean;
}