import { _decorator, Node, Vec3 } from 'cc';
import { Enemy } from './Enemy';
const { ccclass, property } = _decorator;

@ccclass('Nailong')
export class Nailong extends Enemy {
    @property
    speed: number = 90;

    @property(Node)
    target: Node | null = null;

    private _myWorld: Vec3 = new Vec3();
    private _tgtWorld: Vec3 = new Vec3();
    private _local: Vec3 = new Vec3();

    onLoad() {
        this.life = 1;
    }

    update(dt: number) {
        if (!this.target || !this.target.isValid) return;
        this.node.getWorldPosition(this._myWorld);
        this.target.getWorldPosition(this._tgtWorld);
        const dx = this._tgtWorld.x - this._myWorld.x;
        const dy = this._tgtWorld.y - this._myWorld.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) return;
        const step = Math.min(this.speed * dt, dist);
        this.node.getPosition(this._local);
        this._local.x += (dx / dist) * step;
        this._local.y += (dy / dist) * step;
        this.node.setPosition(this._local);
    }
}
