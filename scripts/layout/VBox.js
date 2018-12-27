define(["require", "exports", "./EqContainer", "../animation/Frame"], function (require, exports, EqContainer_1, Frame_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class VBox extends EqContainer_1.default {
        constructor(children, padding) {
            super(children, padding);
        }
        calcHeight() {
            let totalHeight = 0;
            for (let i = 0; i < this.children.length; i++) {
                totalHeight += this.children[i].getHeight();
            }
            return totalHeight + this.padding.height();
        }
        calcWidth() {
            let maxWidth = 0;
            for (let i = 0; i < this.children.length; i++) {
                let childWidth = this.children[i].getWidth();
                if (childWidth > maxWidth) {
                    maxWidth = childWidth;
                }
            }
            return maxWidth + this.padding.width();
        }
        addDrawable(parentFrame, drawables, tlx, tly, currScale) {
            let frame = new Frame_1.default(parentFrame, this, tlx, tly, this.getWidth(), this.getHeight(), currScale);
            const innerWidth = this.getWidth() - this.padding.width();
            let upToY = tly + this.padding.top;
            for (let i = 0; i < this.children.length; i++) {
                let currChild = this.children[i];
                let childWidth = currChild.getWidth();
                //Position child in the middle horizontally
                let childTLX = (innerWidth - childWidth) / 2 + this.padding.left + tlx;
                upToY += currChild.addDrawable(frame, drawables, childTLX, upToY, currScale).height;
            }
            drawables.push(frame);
            return frame;
        }
    }
    exports.default = VBox;
});
