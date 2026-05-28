import { _decorator, Component, Graphics, Color } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('HpBar')
@executeInEditMode(true)
export class HpBar extends Component {
    @property
    width: number = 400;

    @property
    height: number = 24;

    @property({ range: [0, 1, 0.01], slide: true })
    progress: number = 1;

    @property
    bgColor: Color = new Color(40, 40, 40, 220);

    @property
    fillColor: Color = new Color(220, 60, 60, 255);

    @property
    borderColor: Color = new Color(255, 255, 255, 255);

    private _g: Graphics | null = null;
    private _lastKey: string = '';

    onLoad() {
        this._g = this.getComponent(Graphics);
    }

    setProgress(p: number) {
        this.progress = Math.max(0, Math.min(1, p));
    }

    update() {
        if (!this._g) return;
        const key = `${this.width}x${this.height}|${this.progress.toFixed(4)}`;
        if (key === this._lastKey) return;
        this._lastKey = key;

        const g = this._g;
        const w = this.width;
        const h = this.height;
        const x = -w * 0.5;
        const y = -h * 0.5;

        g.clear();

        g.fillColor = this.bgColor;
        g.rect(x, y, w, h);
        g.fill();

        if (this.progress > 0) {
            g.fillColor = this.fillColor;
            g.rect(x, y, w * this.progress, h);
            g.fill();
        }

        g.lineWidth = 2;
        g.strokeColor = this.borderColor;
        g.rect(x, y, w, h);
        g.stroke();
    }
}
