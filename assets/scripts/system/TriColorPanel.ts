import { _decorator, Component, Graphics, Color } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/**
 * Card background of three stacked rectangles (top → middle → bottom),
 * each with its own width, height, and fill color.
 *
 * Drawing origin is the node position; the stack is centered vertically
 * around y=0 and each band is centered horizontally on x=0.
 *
 * Lives on a node with cc.Graphics; runs in edit mode so inspector tweaks
 * preview live. No outline — pair with RectOutline (on the same node or
 * a sibling/child) if you want a border.
 */
@ccclass('TriColorPanel')
@executeInEditMode(true)
@requireComponent(Graphics)
export class TriColorPanel extends Component {
    @property
    topWidth: number = 180;

    @property
    topHeight: number = 80;

    @property(Color)
    topColor: Color = new Color(255, 200, 120, 255);

    @property
    midWidth: number = 180;

    @property
    midHeight: number = 100;

    @property(Color)
    midColor: Color = new Color(120, 200, 120, 255);

    @property
    botWidth: number = 180;

    @property
    botHeight: number = 80;

    @property(Color)
    botColor: Color = new Color(120, 160, 255, 255);

    private _g: Graphics | null = null;
    private _lastKey: string = '';

    onLoad() {
        this._g = this.getComponent(Graphics);
    }

    // Draw immediately on activation. The skill picker opens with
    // director.pause(), which freezes update(); onEnable still fires
    // synchronously when the node is activated, so the bands appear.
    onEnable() {
        this._lastKey = '';
        this._redraw();
    }

    update() {
        const key = [
            this.topWidth, this.topHeight, this._colorKey(this.topColor),
            this.midWidth, this.midHeight, this._colorKey(this.midColor),
            this.botWidth, this.botHeight, this._colorKey(this.botColor),
        ].join('|');
        if (key === this._lastKey) return;
        this._lastKey = key;
        this._redraw();
    }

    private _redraw() {
        if (!this._g) this._g = this.getComponent(Graphics);
        if (!this._g) return;
        const g = this._g;
        g.clear();

        const totalH = this.topHeight + this.midHeight + this.botHeight;
        const halfH = totalH / 2;
        const y1 = halfH - this.topHeight;          // top / mid boundary
        const y2 = y1 - this.midHeight;             // mid / bot boundary
        const yBot = y2 - this.botHeight;           // = -halfH

        g.fillColor = this.topColor;
        g.rect(-this.topWidth / 2, y1, this.topWidth, this.topHeight);
        g.fill();

        g.fillColor = this.midColor;
        g.rect(-this.midWidth / 2, y2, this.midWidth, this.midHeight);
        g.fill();

        g.fillColor = this.botColor;
        g.rect(-this.botWidth / 2, yBot, this.botWidth, this.botHeight);
        g.fill();
    }

    private _colorKey(c: Color): string {
        return `${c.r},${c.g},${c.b},${c.a}`;
    }
}
