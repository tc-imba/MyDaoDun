import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('NailongWalk')
export class NailongWalk extends Component {
    @property(SpriteFrame)
    frame1: SpriteFrame | null = null;

    @property(SpriteFrame)
    frame2: SpriteFrame | null = null;

    @property(SpriteFrame)
    frame3: SpriteFrame | null = null;

    @property({ tooltip: 'Frames per second. Pattern is 1-2-3-2 then loops.' })
    fps: number = 6;

    private _sprite: Sprite | null = null;
    private _step: number = 0;

    private readonly _cycle: ReadonlyArray<number> = [0, 1, 2, 1];

    onLoad() {
        this._sprite = this.getComponent(Sprite);
    }

    onEnable() {
        this._step = 0;
        this._apply();
        this.schedule(this._tick, 1 / this.fps);
    }

    onDisable() {
        this.unschedule(this._tick);
    }

    private _tick = () => {
        this._step = (this._step + 1) % this._cycle.length;
        this._apply();
    };

    private _apply() {
        if (!this._sprite) return;
        const idx = this._cycle[this._step];
        const f = idx === 0 ? this.frame1 : idx === 1 ? this.frame2 : this.frame3;
        if (f && this._sprite.spriteFrame !== f) {
            this._sprite.spriteFrame = f;
        }
    }
}
