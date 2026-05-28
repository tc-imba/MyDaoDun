import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node, tooltip: 'Node the camera tracks.' })
    target: Node | null = null;

    @property({ tooltip: 'Smoothing factor (0 = instant snap, 0.9 = very smooth).' })
    smoothing: number = 0;

    private _tgt: Vec3 = new Vec3();
    private _cur: Vec3 = new Vec3();

    lateUpdate() {
        if (!this.target || !this.target.isValid) return;
        this.target.getWorldPosition(this._tgt);
        this.node.getWorldPosition(this._cur);
        if (this.smoothing <= 0) {
            this.node.setWorldPosition(this._tgt.x, this._tgt.y, this._cur.z);
        } else {
            const a = 1 - this.smoothing;
            const x = this._cur.x + (this._tgt.x - this._cur.x) * a;
            const y = this._cur.y + (this._tgt.y - this._cur.y) * a;
            this.node.setWorldPosition(x, y, this._cur.z);
        }
    }
}
