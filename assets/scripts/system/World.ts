import { _decorator, Component, Graphics, Color, Node, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('World')
export class World extends Component {
    @property
    gridSize: number = 100;

    @property({ type: Node, tooltip: 'Camera the grid follows.' })
    camera: Node | null = null;

    @property
    minorColor: Color = new Color(70, 70, 70, 255);

    @property
    axisColor: Color = new Color(120, 200, 120, 255);

    private _graphics: Graphics | null = null;
    private _lastKey: string = '';
    private _camPos: Vec3 = new Vec3();

    onLoad() {
        this._graphics = this.getComponent(Graphics);
    }

    update() {
        if (!this._graphics || !this.camera) return;

        this.camera.getWorldPosition(this._camPos);
        const camX = this._camPos.x;
        const camY = this._camPos.y;

        const vs = view.getVisibleSize();
        const halfW = vs.width * 0.5 + this.gridSize;
        const halfH = vs.height * 0.5 + this.gridSize;

        const startX = Math.floor((camX - halfW) / this.gridSize) * this.gridSize;
        const endX = Math.ceil((camX + halfW) / this.gridSize) * this.gridSize;
        const startY = Math.floor((camY - halfH) / this.gridSize) * this.gridSize;
        const endY = Math.ceil((camY + halfH) / this.gridSize) * this.gridSize;

        const key = `${startX},${endX},${startY},${endY}`;
        if (key === this._lastKey) return;
        this._lastKey = key;

        const g = this._graphics;
        g.clear();
        g.lineWidth = 2;

        for (let x = startX; x <= endX; x += this.gridSize) {
            g.strokeColor = x === 0 ? this.axisColor : this.minorColor;
            g.moveTo(x, startY);
            g.lineTo(x, endY);
            g.stroke();
        }
        for (let y = startY; y <= endY; y += this.gridSize) {
            g.strokeColor = y === 0 ? this.axisColor : this.minorColor;
            g.moveTo(startX, y);
            g.lineTo(endX, y);
            g.stroke();
        }
    }
}
