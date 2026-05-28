import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode } from 'cc';
import { VirtualJoystick } from '../core/VirtualJoystick';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    @property({ type: VirtualJoystick })
    joystick: VirtualJoystick | null = null;

    @property(Node)
    world: Node | null = null;

    @property
    speed: number = 300;

    private _tmpPos: Vec3 = new Vec3();
    private _keyW = false;
    private _keyA = false;
    private _keyS = false;
    private _keyD = false;

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private setKey(code: number, down: boolean) {
        switch (code) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP:    this._keyW = down; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT:  this._keyA = down; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN:  this._keyS = down; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._keyD = down; break;
        }
    }

    onKeyDown(e: EventKeyboard) { this.setKey(e.keyCode, true); }
    onKeyUp(e: EventKeyboard) { this.setKey(e.keyCode, false); }

    update(dt: number) {
        let dx = 0, dy = 0;
        if (this._keyD) dx += 1;
        if (this._keyA) dx -= 1;
        if (this._keyW) dy += 1;
        if (this._keyS) dy -= 1;
        const klen = Math.hypot(dx, dy);
        if (klen > 0) { dx /= klen; dy /= klen; }

        if (this.joystick) {
            const jd = this.joystick.direction;
            dx += jd.x;
            dy += jd.y;
        }

        const len = Math.hypot(dx, dy);
        if (len === 0) return;
        if (len > 1) { dx /= len; dy /= len; }

        const target = this.world ?? this.node;
        const sign = this.world ? -1 : 1;
        target.getPosition(this._tmpPos);
        this._tmpPos.x += sign * dx * this.speed * dt;
        this._tmpPos.y += sign * dy * this.speed * dt;
        target.setPosition(this._tmpPos);
    }
}
