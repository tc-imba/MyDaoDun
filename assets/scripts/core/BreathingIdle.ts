import { _decorator, Component, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BreathingIdle')
export class BreathingIdle extends Component {
    @property({ tooltip: 'Frames per second. With 2 frames, each frame is held for 1/fps seconds.' })
    fps: number = 3;

    @property({ tooltip: 'Y scale of the "short" frame (relative to base scale).' })
    shortScaleY: number = 0.9;

    private _baseScale: Vec3 = new Vec3();
    private _short: boolean = false;

    onLoad() {
        Vec3.copy(this._baseScale, this.node.scale);
    }

    onEnable() {
        this._short = false;
        this._applyFrame();
        this.schedule(this._tick, 1 / this.fps);
    }

    onDisable() {
        this.unschedule(this._tick);
        const s = this.node.scale;
        this.node.setScale(s.x, this._baseScale.y, s.z);
    }

    private _tick = () => {
        this._short = !this._short;
        this._applyFrame();
    };

    private _applyFrame() {
        const s = this.node.scale;
        const y = this._short ? this._baseScale.y * this.shortScaleY : this._baseScale.y;
        this.node.setScale(s.x, y, s.z);
    }
}
