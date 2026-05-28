import { _decorator, Component, Graphics, Color } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('SkillCard')
@executeInEditMode(true)
export class SkillCard extends Component {
    @property
    width: number = 180;

    @property
    height: number = 260;

    @property
    borderWidth: number = 3;

    @property
    bgColor: Color = new Color(60, 60, 80, 230);

    @property
    highlightedBgColor: Color = new Color(80, 100, 140, 240);

    @property
    borderColor: Color = new Color(120, 120, 120, 255);

    @property
    highlightedBorderColor: Color = new Color(255, 220, 80, 255);

    private _g: Graphics | null = null;
    private _highlighted: boolean = false;

    get highlighted(): boolean { return this._highlighted; }

    onLoad() {
        this._g = this.getComponent(Graphics);
        this._redraw();
    }

    setHighlighted(h: boolean) {
        if (this._highlighted === h) return;
        this._highlighted = h;
        this._redraw();
    }

    private _redraw() {
        if (!this._g) return;
        const g = this._g;
        const w = this.width;
        const h = this.height;
        const x = -w * 0.5;
        const y = -h * 0.5;
        g.clear();
        g.fillColor = this._highlighted ? this.highlightedBgColor : this.bgColor;
        g.rect(x, y, w, h);
        g.fill();
        g.lineWidth = this.borderWidth;
        g.strokeColor = this._highlighted ? this.highlightedBorderColor : this.borderColor;
        g.rect(x, y, w, h);
        g.stroke();
    }
}
