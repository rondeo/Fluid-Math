import { Component, OnInit } from '@angular/core';
import C from '@shared/main/consts';
import { ContentSelectionService } from '../content-selection.service';
import { UndoRedoService } from '../undo-redo.service';
import { ModalService } from '../modal.service';
import { cap } from '../helpers';

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.css']
})
export class ColorPickerComponent implements OnInit {

  opacityData: SelectorData[] = [];
  selectedOpacityIdx: number;

  colorData: SelectorData[] = [];
  selectedColorIdx: number;
  defaultColorIdx: number;

  constructor(private selection: ContentSelectionService, private undoRedo: UndoRedoService, private modal: ModalService) {
    this.opacityData = [
      new SelectorData('rgba(0, 0, 0, ' + C.fadedOpacity + ')', 'Faded'),
      new SelectorData('rgba(0, 0, 0, ' + C.normalOpacity + ')', 'Normal'),
      new SelectorData('rgba(0, 0, 0, ' + C.focusedOpacity + ')', 'Focused')
    ];
    const colNames = Object.keys(C.colors);
    this.colorData = colNames
      .map(colName => {
        const colVal = C.colors[colName];
        return new SelectorData('rgb(' + colVal[0] + ',' + colVal[1] + ',' + colVal[2] + ')', cap(colName));
      });
    this.defaultColorIdx = colNames.indexOf('default');

    // Find the color and opacity of what's selected
    const selectedRef = this.selection.selectedOnCanvas;
    const state: any = this.undoRedo.getState();
    const step: any = state.steps[0];
    // If selected already has opacity, show it as selected
    if (step.opacity && step.opacity[selectedRef]) {
      const opacity = step.opacity[selectedRef];
      if (opacity === C.fadedOpacity) {
        this.selectedOpacityIdx = 0;
      } else if (opacity === C.focusedOpacity) {
        this.selectedOpacityIdx = 2;
      }
    } else {
      this.selectDefaultOpacity();
    }
    // If selected already has color, show it as selected
    if (step.color && step.color[selectedRef]) {
      const colName = step.color[selectedRef];
      this.selectedColorIdx = colNames.indexOf(colName);
    } else {
      this.selectDefaultColor();
    }
  }

  ngOnInit() {
  }

  /**
   * Select the default opacity.
   */
  selectDefaultOpacity() {
    this.selectedOpacityIdx = 1;
  }

  /**
   * Select an opacity using an index.
   * @param idx The index.
   */
  selectO(idx: number) {
    this.selectedOpacityIdx = idx;
  }

  /**
   * Select the default color.
   */
  selectDefaultColor() {
    this.selectedColorIdx = this.defaultColorIdx;
  }

  /**
   * Select a color using an index.
   * Automatically focus color, unless
   * the default color is selected.
   * @param idx The index.
   */
  selectC(idx: number) {
    this.selectedColorIdx = idx;
    if (idx === this.defaultColorIdx) {
      this.selectedOpacityIdx = 1;
    } else {
      this.selectedOpacityIdx = 2;
    }
  }

  /**
   * Apply the selected color
   * and opacity to whatever is
   * selected on the canvas.
   */
  apply() {
    let opacity: number;
    switch (this.selectedOpacityIdx) {
      case 0: opacity = C.fadedOpacity;   break;
      case 1: opacity = C.normalOpacity;  break;
      case 2: opacity = C.focusedOpacity; break;
      default:  throw new Error('Illegal selected opacity index.');
    }
    const colorName = Object.keys(C.colors)[this.selectedColorIdx];
    this.selection.canvasInstance.applyColorAndOpacity(opacity, colorName);
    this.modal.remove();
  }

}

export class SelectorData {
  constructor(public color: string, public text: string) { }
}
