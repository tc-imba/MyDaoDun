import { _decorator, Component, Node, Sprite, UIOpacity, UITransform, Vec3 } from 'cc';
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

    @property({ type: Sprite, tooltip: 'Optional halo sprite (child) drawn for the bloom effect, synced to fillStart/fillRange.' })
    haloSprite: Sprite | null = null;

    @property({ type: UIOpacity, tooltip: 'UIOpacity on the halo node; driven each frame as peakOpacity * haloOpacityRatio.' })
    haloOpacity: UIOpacity | null = null;

    @property({ range: [0, 1, 0.01], slide: true, tooltip: 'Halo peak opacity as a fraction of the main peakOpacity.' })
    haloOpacityRatio: number = 0.4;

    @property({ type: Node, tooltip: 'Player node to follow each frame. Sibling of this node so its scale.x flip does not corrupt our rotation.' })
    followTarget: Node | null = null;

    @property({ tooltip: 'Vertical offset above the target world position (px), so the swoosh hovers around the character body.' })
    followOffsetY: number = 70;

    private _sprite: Sprite | null = null;
    private _opacity: UIOpacity | null = null;
    private _baseRadius: number = 200;
    private _timer: number = -1;
    private _tmpPos: Vec3 = new Vec3();

    onLoad() {
        this._sprite = this.getComponent(Sprite);
        this._opacity = this.getComponent(UIOpacity);
        const ui = this.getComponent(UITransform);
        if (ui) this._baseRadius = ui.contentSize.width * 0.5;
        this._reset();
    }

    /**
     * Trigger a swoosh in the given facing direction (radians, atan2 convention:
     * 0 = +X right, PI/2 = +Y up, PI = -X left).
     *
     * The arc is drawn on local +X and the node is rotated to facingAngle so
     * the same convention as AttackRangeDebug applies — meaning arbitrary
     * angles work, not just left/right. We also counter the parent's scale.x
     * flip so the rotation is performed in clean world-aligned coords.
     */
    play(facingAngleRad: number, radius?: number, fanDeg?: number) {
        this._timer = 0;
        if (fanDeg !== undefined) this.fanDeg = fanDeg;

        // No parent-flip math needed: SwooshFX lives as a sibling of Player,
        // so its transform is clean. Just set uniform scale for the radius.
        const scaleAbs = (radius !== undefined && this._baseRadius > 0)
            ? radius / this._baseRadius
            : Math.abs(this.node.scale.x) || 1;
        this.node.setScale(scaleAbs, scaleAbs, this.node.scale.z);

        // Orient local +X to the player's facing direction (Cocos node.angle
        // is degrees, CCW positive — same convention as AttackRangeDebug).
        this.node.angle = facingAngleRad * 180 / Math.PI;

        const fanRange = this.fanDeg / 360;
        const fillStart = (-fanRange / 2 + 1) % 1;
        if (this._sprite) {
            // Arc centered on local +X (fillStart 0), opening CCW symmetrically.
            this._sprite.fillStart = fillStart;
            this._sprite.fillRange = 0;
        }
        if (this.haloSprite) {
            this.haloSprite.fillStart = fillStart;
            this.haloSprite.fillRange = 0;
        }
        if (this._opacity) this._opacity.opacity = 0;
        if (this.haloOpacity) this.haloOpacity.opacity = 0;
    }

    update(dt: number) {
        // Follow the target's world position every frame so the swoosh stays
        // glued to the player regardless of who's parent.
        if (this.followTarget) {
            this.followTarget.getWorldPosition(this._tmpPos);
            this._tmpPos.y += this.followOffsetY;
            this.node.setWorldPosition(this._tmpPos);
        }

        if (this._timer < 0) return;
        this._timer += dt;
        const t = this._timer / this.duration;
        if (t >= 1) {
            this._reset();
            return;
        }
        const fanRange = this.fanDeg / 360;
        const sweepT = Math.min(1, t / this.peakAt);
        const fillRange = fanRange * sweepT;
        if (this._sprite) this._sprite.fillRange = fillRange;
        if (this.haloSprite) this.haloSprite.fillRange = fillRange;

        const o = t < this.peakAt
            ? t / this.peakAt
            : 1 - (t - this.peakAt) / (1 - this.peakAt);
        const main = Math.max(0, Math.min(this.peakOpacity, o * this.peakOpacity));
        if (this._opacity) this._opacity.opacity = main;
        if (this.haloOpacity) this.haloOpacity.opacity = main * this.haloOpacityRatio;
    }

    private _reset() {
        this._timer = -1;
        if (this._sprite) this._sprite.fillRange = 0;
        if (this.haloSprite) this.haloSprite.fillRange = 0;
        if (this._opacity) this._opacity.opacity = 0;
        if (this.haloOpacity) this.haloOpacity.opacity = 0;
    }
}
