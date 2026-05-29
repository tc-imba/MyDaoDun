import { _decorator, Component, Graphics, Color, Node, Vec3 } from 'cc';
import { DaodunFighter } from '../entity/DaodunFighter';
import { Player } from '../entity/Player';
const { ccclass, property } = _decorator;

/**
 * Debug overlay that draws the DaodunFighter's attack arc as a sector.
 *
 * Live as a sibling of Player (NOT a child) so it has its own clean
 * transform: every frame, sync this node's world position to the player
 * and rotate it by Player.facingAngle (degrees). The arc is drawn at
 * local +X; the node rotation orients it.
 */
@ccclass('AttackRangeDebug')
export class AttackRangeDebug extends Component {
    @property({ type: Node, tooltip: 'Player node to follow and read facing from.' })
    player: Node | null = null;

    @property
    strokeColor: Color = new Color(255, 220, 80, 220);

    @property
    fillColor: Color = new Color(255, 220, 80, 40);

    @property
    lineWidth: number = 2;

    private _g: Graphics | null = null;
    private _playerComp: Player | null = null;
    private _fighter: DaodunFighter | null = null;
    private _tmpPos: Vec3 = new Vec3();
    private _lastKey: string = '';

    onLoad() {
        this._g = this.getComponent(Graphics);
        this._rebindPlayer();
    }

    private _rebindPlayer() {
        if (!this.player) return;
        this._playerComp = this.player.getComponent(Player);
        this._fighter = this.player.getComponent(DaodunFighter);
    }

    update() {
        if (!this._g || !this.player || !this._fighter) return;
        if (!this._playerComp) this._rebindPlayer();

        // Follow the player's world position.
        this.player.getWorldPosition(this._tmpPos);
        this.node.setWorldPosition(this._tmpPos);

        // Orient to player's facing angle (radians → degrees, CCW positive).
        const facingDeg = this._playerComp
            ? this._playerComp.facingAngle * 180 / Math.PI
            : 0;
        this.node.angle = facingDeg;

        // Redraw only when radius or fan angle changes; the rotation is
        // applied by the transform so the arc shape itself is constant.
        const r = this._fighter.attackRange;
        const arc = this._fighter.fanAngleDeg;
        const key = `${r}|${arc}`;
        if (key === this._lastKey) return;
        this._lastKey = key;

        const g = this._g;
        const halfArc = (arc * Math.PI) / 360;
        // Open arc symmetrically around local +X (angle 0).
        const sa = -halfArc;
        const ea = halfArc;

        g.clear();
        g.lineWidth = this.lineWidth;
        g.strokeColor = this.strokeColor;
        g.fillColor = this.fillColor;

        g.moveTo(0, 0);
        g.lineTo(r * Math.cos(sa), r * Math.sin(sa));
        g.arc(0, 0, r, sa, ea, true);
        g.lineTo(0, 0);
        g.close();
        g.fill();
        g.stroke();
    }
}
