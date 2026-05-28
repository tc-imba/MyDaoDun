import { _decorator, Component, Vec2, EventTouch, input, Input } from 'cc';
import { GameState, GAME_EVENT } from '../system/GameState';
const { ccclass, property } = _decorator;

@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {
    @property
    radius: number = 100;

    private _dir: Vec2 = new Vec2(0, 0);
    private _touching: boolean = false;
    private _startX: number = 0;
    private _startY: number = 0;

    get direction(): Vec2 {
        return this._dir;
    }

    onEnable() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        GameState.events.on(GAME_EVENT.RESET_INPUT, this._reset, this);
    }

    onDisable() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        GameState.events.off(GAME_EVENT.RESET_INPUT, this._reset, this);
    }

    private _reset() {
        this._touching = false;
        this._dir.set(0, 0);
    }

    onTouchStart(event: EventTouch) {
        if (GameState.skillPickerOpen) return;
        if (this._touching) return;
        const p = event.getUILocation();
        this._startX = p.x;
        this._startY = p.y;
        this._touching = true;
        this._dir.set(0, 0);
    }

    onTouchMove(event: EventTouch) {
        if (GameState.skillPickerOpen) return;
        if (!this._touching) return;
        const p = event.getUILocation();
        const dx = p.x - this._startX;
        const dy = p.y - this._startY;
        const len = Math.hypot(dx, dy);
        if (len === 0) {
            this._dir.set(0, 0);
            return;
        }
        const clamped = Math.min(len, this.radius);
        const mag = clamped / this.radius;
        this._dir.set((dx / len) * mag, (dy / len) * mag);
    }

    onTouchEnd(_event: EventTouch) {
        if (!this._touching) return;
        this._touching = false;
        this._dir.set(0, 0);
    }
}
