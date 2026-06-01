import { _decorator, Component, Graphics, Color, Node, Vec3 } from 'cc';
import { DaodunFighter } from '../entity/DaodunFighter';
const { ccclass, property } = _decorator;

/**
 * Debug overlay: a ring around the player that shows attack cooldown.
 *
 * Lives as a sibling of Player (own clean transform). Each frame it syncs
 * to the player's world position and redraws an arc whose sweep equals the
 * remaining cooldown (full ring right after an attack, empty when ready).
 */
@ccclass('CooldownRingDebug')
export class CooldownRingDebug extends Component {
    @property({ type: Node, tooltip: 'Player node to follow and read the fighter cooldown from.' })
    player: Node | null = null;

    @property({ tooltip: 'Ring radius in pixels.' })
    radius: number = 40;

    @property
    lineWidth: number = 4;

    @property({ tooltip: 'Color while cooling down.' })
    coolingColor: Color = new Color(255, 90, 90, 220);

    @property({ tooltip: 'Color shown briefly when ready (empty ring outline).' })
    readyColor: Color = new Color(90, 220, 120, 120);

    private _g: Graphics | null = null;
    private _fighter: DaodunFighter | null = null;
    private _tmpPos: Vec3 = new Vec3();

    onLoad() {
        this._g = this.getComponent(Graphics);
        this._rebind();
    }

    private _rebind() {
        if (this.player) this._fighter = this.player.getComponent(DaodunFighter);
    }

    update() {
        if (!this._g || !this.player) return;
        if (!this._fighter) { this._rebind(); if (!this._fighter) return; }

        this.player.getWorldPosition(this._tmpPos);
        this.node.setWorldPosition(this._tmpPos);

        const p = this._fighter.cooldownProgress; // 1 = just attacked, 0 = ready
        const g = this._g;
        g.clear();
        g.lineWidth = this.lineWidth;

        // Faint full outline so the gauge is always visible.
        g.strokeColor = this.readyColor;
        g.circle(0, 0, this.radius);
        g.stroke();

        if (p > 0) {
            // Sweep the remaining cooldown clockwise from the top (12 o'clock).
            const start = Math.PI / 2;
            const end = start - p * Math.PI * 2;
            g.strokeColor = this.coolingColor;
            g.arc(0, 0, this.radius, start, end, true);
            g.stroke();
        }
    }
}
