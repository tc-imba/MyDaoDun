import { _decorator, Component, Node, Vec2, Vec3, UITransform, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
    @property(Node)
    thumb: Node | null = null;

    @property
    radius: number = 80;

    private _dir: Vec2 = new Vec2(0, 0);
    private _touching: boolean = false;
    private _tmp: Vec3 = new Vec3();

    get direction(): Vec2 {
        return this._dir;
    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private updateFromTouch(event: EventTouch) {
        const ui = this.node.getComponent(UITransform);
        if (!ui) return;
        const ui_pt = event.getUILocation();
        this._tmp.set(ui_pt.x, ui_pt.y, 0);
        const local = ui.convertToNodeSpaceAR(this._tmp);
        const dx = local.x;
        const dy = local.y;
        const len = Math.hypot(dx, dy);
        const clamped = Math.min(len, this.radius);
        let nx = 0, ny = 0;
        if (len > 0) {
            nx = dx / len;
            ny = dy / len;
        }
        if (this.thumb) {
            this.thumb.setPosition(nx * clamped, ny * clamped, 0);
        }
        const mag = clamped / this.radius;
        this._dir.set(nx * mag, ny * mag);
    }

    onTouchStart(event: EventTouch) {
        this._touching = true;
        this.updateFromTouch(event);
    }

    onTouchMove(event: EventTouch) {
        if (!this._touching) return;
        this.updateFromTouch(event);
    }

    onTouchEnd(_event: EventTouch) {
        this._touching = false;
        this._dir.set(0, 0);
        if (this.thumb) this.thumb.setPosition(0, 0, 0);
    }
}
