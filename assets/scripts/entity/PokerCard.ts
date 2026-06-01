import { _decorator, Component, Node, Vec3, Graphics, Color, Label, UITransform } from 'cc';
import { Enemy } from './Enemy';
const { ccclass } = _decorator;

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_RED = new Color(210, 50, 50, 255);
const SUIT_BLACK = new Color(25, 25, 25, 255);
const JOKER_COLOR = new Color(120, 60, 180, 255);
const CARD_BG = new Color(248, 244, 226, 255);
const CARD_BORDER = new Color(20, 20, 20, 255);

const CARD_W = 44;
const CARD_H = 60;
const HIT_RADIUS = 26;

export function rankToText(r: Rank): string {
    if (r === 1) return 'A';
    if (r === 11) return 'J';
    if (r === 12) return 'Q';
    if (r === 13) return 'K';
    return String(r);
}

export interface PokerCardOptions {
    rank: Rank;
    suit: Suit;
    isJoker: boolean;
    damage: number;
    speed: number;
    lifespan: number;
    /** Initial flight direction in radians. */
    angle: number;
    /** Extra enemies the card can punch through; it dies after hitting (1 + pierceBudget) of them. */
    pierceBudget: number;
    homing: boolean;
    target: Enemy | null;
    /** 0 disables AoE; otherwise radius around impact. */
    aoeRadius: number;
    crit: boolean;
    /** Call: number of out→back swings before the card gives up. 0 disables the return. */
    returnTrips: number;
    /** Node the card flies back toward on a return swing (the player). */
    returnTo: Node | null;
    /** Distance from launch at which an unspent card swings back. */
    returnRange: number;
    /** Pot: invoked once per direct enemy hit. */
    onHit?: () => void;
    /** Fold L2: invoked when the card expires having never hit anything. */
    onFold?: () => void;
}

@ccclass('PokerCard')
export class PokerCard extends Component {
    private _vx: number = 0;
    private _vy: number = 0;
    private _life: number = 1;
    private _opts: PokerCardOptions | null = null;
    private _hit: Set<Enemy> = new Set();
    private _tmpPos: Vec3 = new Vec3();
    private _other: Vec3 = new Vec3();
    private _pierceLeft: number = 0;
    private _returnsLeft: number = 0;
    private _phase: number = 0; // 0 = outbound, 1 = returning to player
    private _originX: number = 0;
    private _originY: number = 0;
    private _returnRange2: number = 0;
    private _anyHit: boolean = false;

    init(opts: PokerCardOptions) {
        this._opts = opts;
        this._vx = Math.cos(opts.angle) * opts.speed;
        this._vy = Math.sin(opts.angle) * opts.speed;
        this._life = opts.lifespan;
        this._pierceLeft = opts.pierceBudget;
        this._returnsLeft = opts.returnTrips;
        this._returnRange2 = opts.returnRange * opts.returnRange;
        this.node.getWorldPosition(this._tmpPos);
        this._originX = this._tmpPos.x;
        this._originY = this._tmpPos.y;
    }

    update(dt: number) {
        const opts = this._opts;
        if (!opts) return;
        this._life -= dt;
        if (this._life <= 0) {
            if (!this._anyHit) opts.onFold?.();
            this.node.destroy();
            return;
        }

        this.node.getWorldPosition(this._tmpPos);

        if (this._phase === 1) {
            // Returning: steer straight back toward the player and strike whatever we cross.
            if (opts.returnTo?.isValid) {
                opts.returnTo.getWorldPosition(this._other);
                const dx = this._other.x - this._tmpPos.x;
                const dy = this._other.y - this._tmpPos.y;
                const d = Math.hypot(dx, dy) || 1;
                this._vx = (dx / d) * opts.speed;
                this._vy = (dy / d) * opts.speed;
                if (d < 40) {
                    // Reached the player. Swing back out toward the nearest enemy if trips remain.
                    if (this._returnsLeft > 0) {
                        this._returnsLeft--;
                        this._phase = 0;
                        this._life = opts.lifespan;
                        const dir = this._nearestDir(this._tmpPos);
                        if (dir) { this._vx = dir.x * opts.speed; this._vy = dir.y * opts.speed; }
                    } else {
                        if (!this._anyHit) opts.onFold?.();
                        this.node.destroy();
                        return;
                    }
                }
            } else {
                this._phase = 0; // player gone; resume outbound flight
            }
        } else {
            if (opts.homing) {
                if (opts.target?.node?.isValid) {
                    opts.target.node.getWorldPosition(this._other);
                    const dx = this._other.x - this._tmpPos.x;
                    const dy = this._other.y - this._tmpPos.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const desiredVx = (dx / d) * opts.speed;
                    const desiredVy = (dy / d) * opts.speed;
                    const turn = Math.min(1, 6 * dt);
                    this._vx += (desiredVx - this._vx) * turn;
                    this._vy += (desiredVy - this._vy) * turn;
                } else {
                    opts.homing = false;
                }
            }
            // Still alive at the border means it never spent its pierce — swing it back.
            const dx = this._tmpPos.x - this._originX;
            const dy = this._tmpPos.y - this._originY;
            if (dx * dx + dy * dy >= this._returnRange2 && this._returnsLeft > 0) {
                this._returnsLeft--;
                this._phase = 1;
                this._life = opts.lifespan;
            }
        }

        this._tmpPos.x += this._vx * dt;
        this._tmpPos.y += this._vy * dt;
        this.node.setWorldPosition(this._tmpPos);

        // Visual spin oriented along travel direction.
        const ang = Math.atan2(this._vy, this._vx);
        this.node.angle = (ang * 180 / Math.PI) - 90;

        this._checkHits();
    }

    /** Unit vector toward the nearest live enemy, or null if none. */
    private _nearestDir(from: Vec3): { x: number, y: number } | null {
        let bestD2 = Infinity;
        let bx = 0, by = 0;
        for (const e of Enemy.all) {
            if (!e.node || !e.node.isValid) continue;
            e.node.getWorldPosition(this._other);
            const dx = this._other.x - from.x;
            const dy = this._other.y - from.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; bx = dx; by = dy; }
        }
        if (bestD2 === Infinity) return null;
        const d = Math.sqrt(bestD2) || 1;
        return { x: bx / d, y: by / d };
    }

    private _checkHits() {
        const opts = this._opts;
        if (!opts || Enemy.all.size === 0) return;
        this.node.getWorldPosition(this._tmpPos);
        const r2 = HIT_RADIUS * HIT_RADIUS;
        for (const e of Enemy.all) {
            if (this._hit.has(e)) continue;
            if (!e.node || !e.node.isValid) continue;
            e.node.getWorldPosition(this._other);
            const dx = this._other.x - this._tmpPos.x;
            const dy = this._other.y - this._tmpPos.y;
            if (dx * dx + dy * dy > r2) continue;
            this._hit.add(e);
            const dmg = opts.crit ? opts.damage * 2 : opts.damage;
            e.takeDamage(dmg);
            this._anyHit = true;
            opts.onHit?.();
            if (opts.aoeRadius > 0) this._aoe(this._tmpPos, dmg, e);
            if (this._pierceLeft <= 0) { this.node.destroy(); return; }
            this._pierceLeft--;
        }
    }

    private _aoe(center: Vec3, dmg: number, ignore: Enemy) {
        const opts = this._opts;
        if (!opts) return;
        const r2 = opts.aoeRadius * opts.aoeRadius;
        for (const e of Enemy.all) {
            if (e === ignore) continue;
            if (!e.node || !e.node.isValid) continue;
            e.node.getWorldPosition(this._other);
            const dx = this._other.x - center.x;
            const dy = this._other.y - center.y;
            if (dx * dx + dy * dy <= r2) e.takeDamage(dmg);
        }
    }

    /**
     * Build a card node procedurally — a rounded rect frame with a 2-line label
     * for rank + suit glyph. No prefab needed.
     */
    static spawn(parent: Node, worldX: number, worldY: number, opts: PokerCardOptions): PokerCard {
        const card = new Node('PokerCard');
        card.layer = parent.layer;

        const ui = card.addComponent(UITransform);
        ui.setContentSize(CARD_W, CARD_H);
        ui.setAnchorPoint(0.5, 0.5);

        const g = card.addComponent(Graphics);
        const hw = CARD_W / 2;
        const hh = CARD_H / 2;
        g.fillColor = CARD_BG;
        g.roundRect(-hw, -hh, CARD_W, CARD_H, 5);
        g.fill();
        g.strokeColor = CARD_BORDER;
        g.lineWidth = 2;
        g.roundRect(-hw, -hh, CARD_W, CARD_H, 5);
        g.stroke();

        const labelNode = new Node('Text');
        labelNode.layer = card.layer;
        const lui = labelNode.addComponent(UITransform);
        lui.setContentSize(CARD_W, CARD_H);
        lui.setAnchorPoint(0.5, 0.5);
        const lbl = labelNode.addComponent(Label);
        const isRed = opts.suit === 'H' || opts.suit === 'D';
        lbl.color = opts.isJoker ? JOKER_COLOR : (isRed ? SUIT_RED : SUIT_BLACK);
        lbl.fontSize = 18;
        lbl.lineHeight = 22;
        lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = Label.VerticalAlign.CENTER;
        lbl.string = opts.isJoker ? 'JK\n★' : `${rankToText(opts.rank)}\n${SUIT_GLYPH[opts.suit]}`;
        labelNode.parent = card;

        parent.addChild(card);
        card.setWorldPosition(worldX, worldY, 0);

        const pc = card.addComponent(PokerCard);
        pc.init(opts);
        return pc;
    }
}
