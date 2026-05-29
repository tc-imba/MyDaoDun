import { _decorator, Component, Sprite, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Radial swoosh effect played once per attack swing.
 *
 * Expects a cc.Sprite with Type=FILLED, FillType=RADIAL on the same node,
 * and a cc.UIOpacity for the fade. play(facing) snaps fillStart to the
 * facing direction, sweeps fillRange 0 → fanDeg over the first peakAt
 * fraction of duration, and fades opacity in then out.
 */
@ccclass('SwooshFX')
export class SwooshFX extends Component {
    @property({ tooltip: 'Total angular spread of the swoosh at peak (degrees).' })
    fanDeg: number = 120;

    @property({ tooltip: 'Total time the swoosh stays visible (seconds).' })
    duration: number = 0.4;

    @property({ range: [0.05, 0.95, 0.01], slide: true, tooltip: 'Fraction of duration at which the swoosh is fully open before fading.' })
    peakAt: number = 0.4;

    @property({ range: [0, 255, 1], slide: true })
    peakOpacity: number = 220;

    private _sprite: Sprite | null = null;
    private _opacity: UIOpacity | null = null;
    private _timer: number = -1;

    onLoad() {
        this._sprite = this.getComponent(Sprite);
        this._opacity = this.getComponent(UIOpacity);
        this._reset();
    }

    /**
     * Trigger a swoosh. The `facing` parameter is kept for API symmetry but the
     * arc is always written in the swoosh's local frame as if facing left
     * (centered on -X, sweeping CCW). When the parent (Player) flips its
     * scale.x to face right, the renderer mirrors the whole subtree — which
     * naturally maps the arc to the right side AND inverts the CCW sweep into
     * a CW sweep. That's the symmetric mirror behavior the player expects.
     */
    play(_facing: number) {
        this._timer = 0;
        // Make sure no prior counter-flip lingers on local scale.x.
        const s = this.node.scale;
        this.node.setScale(Math.abs(s.x), s.y, s.z);
        if (this._sprite) {
            const fanRange = this.fanDeg / 360;
            // Cocos radial-fill: 0 = +X, 0.25 = +Y, CCW. Center the arc on -X
            // (0.5 in fillStart units) so it lives on the left side in the
            // swoosh's local frame.
            this._sprite.fillStart = (0.5 - fanRange / 2 + 1) % 1;
            this._sprite.fillRange = 0;
        }
        if (this._opacity) this._opacity.opacity = 0;
    }

    update(dt: number) {
        if (this._timer < 0) return;
        this._timer += dt;
        const t = this._timer / this.duration;
        if (t >= 1) {
            this._reset();
            return;
        }
        if (this._sprite) {
            const fanRange = this.fanDeg / 360;
            const sweepT = Math.min(1, t / this.peakAt);
            this._sprite.fillRange = fanRange * sweepT;
        }
        if (this._opacity) {
            const o = t < this.peakAt
                ? t / this.peakAt
                : 1 - (t - this.peakAt) / (1 - this.peakAt);
            this._opacity.opacity = Math.max(0, Math.min(this.peakOpacity, o * this.peakOpacity));
        }
    }

    private _reset() {
        this._timer = -1;
        if (this._sprite) this._sprite.fillRange = 0;
        if (this._opacity) this._opacity.opacity = 0;
    }
}
