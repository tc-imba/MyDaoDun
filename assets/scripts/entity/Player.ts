import { _decorator, Component, Vec3, Vec2 } from 'cc';
import { VirtualJoystick } from '../core/VirtualJoystick';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property({ type: VirtualJoystick })
    joystick: VirtualJoystick | null = null;

    @property
    speed: number = 300;

    private _tmpPos: Vec3 = new Vec3();

    update(dt: number) {
        if (!this.joystick) return;
        const dir: Vec2 = this.joystick.direction;
        if (dir.x === 0 && dir.y === 0) return;
        this.node.getPosition(this._tmpPos);
        this._tmpPos.x += dir.x * this.speed * dt;
        this._tmpPos.y += dir.y * this.speed * dt;
        this.node.setPosition(this._tmpPos);
    }
}
