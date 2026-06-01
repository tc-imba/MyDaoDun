import { _decorator, Component, Graphics, Color, Enum } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

enum InsetMode {
    CENTER = 0,
    INSIDE = 1,
    OUTSIDE = 2,
}
Enum(InsetMode);

/**
 * Draws a single rectangular outline centered on the node origin.
 *
 * The rectangle is sized by the width / height @properties (in pixels) and
 * drawn with the given color and thickness. The stroke is "stroke-on-path"
 * which means lines are centered on the edge — half thickness inside, half
 * outside the width/height box. To bias the stroke inside or outside, use
 * insetMode below.
 */
@ccclass('RectOutline')
@executeInEditMode(true)
@requireComponent(Graphics)
export class RectOutline extends Component {
    @property
    width: number = 180;

    @property
    height: number = 260;

    @property(Color)
    color: Color = new Color(255, 255, 255, 255);

    @property({ tooltip: 'Stroke width in pixels.' })
    thickness: number = 3;

    @property({
        type: Enum(InsetMode),
        tooltip: 'Where the stroke sits relative to the width/height box. CENTER (default) splits the line on the edge; INSIDE keeps the line fully within the box; OUTSIDE expands the line fully outside the box.',
    })
    insetMode: InsetMode = InsetMode.CENTER;

    private _g: Graphics | null = null;
    private _lastKey: string = '';

    onLoad() {
        this._g = this.getComponent(Graphics);
    }

    update() {
        const key = `${this.width}|${this.height}|${this.thickness}|${this.insetMode}|${this._colorKey(this.color)}`;
        if (key === this._lastKey) return;
        this._lastKey = key;
        this._redraw();
    }

    private _redraw() {
        if (!this._g) this._g = this.getComponent(Graphics);
        if (!this._g || this.thickness <= 0) {
            if (this._g) this._g.clear();
            return;
        }
        const g = this._g;
        g.clear();

        // Adjust the rectangle so the stroke sits as requested. By default
        // cc.Graphics strokes are centered on the path.
        let w = this.width;
        let h = this.height;
        if (this.insetMode === 1) {           // INSIDE
            w -= this.thickness;
            h -= this.thickness;
        } else if (this.insetMode === 2) {    // OUTSIDE
            w += this.thickness;
            h += this.thickness;
        }
        const x = -w / 2;
        const y = -h / 2;

        g.lineWidth = this.thickness;
        g.strokeColor = this.color;
        g.rect(x, y, w, h);
        g.stroke();
    }

    private _colorKey(c: Color): string {
        return `${c.r},${c.g},${c.b},${c.a}`;
    }
}
