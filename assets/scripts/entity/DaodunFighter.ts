import { _decorator, Component, Sprite, SpriteFrame, Vec3 } from 'cc';
import { Enemy } from './Enemy';
const { ccclass, property } = _decorator;

@ccclass('DaodunFighter')
export class DaodunFighter extends Component {
    @property(SpriteFrame)
    idleFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    fightFrame1: SpriteFrame | null = null;

    @property(SpriteFrame)
    fightFrame2: SpriteFrame | null = null;

    @property
    attackRange: number = 200;

    @property
    attackInterval: number = 0.4;

    @property
    fightFps: number = 6;

    @property
    damage: number = 1;

    @property({ tooltip: 'How long the fight animation stays visible after each hit (seconds).' })
    fightHoldDuration: number = 0.4;

    private _sprite: Sprite | null = null;
    private _attackTimer: number = 0;
    private _fightTimer: number = 0;
    private _fightFrame: 0 | 1 = 0;
    private _fightHoldTimer: number = 0;
    private _myPos: Vec3 = new Vec3();
    private _otherPos: Vec3 = new Vec3();

    onLoad() {
        this._sprite = this.getComponent(Sprite);
    }

    update(dt: number) {
        if (this._attackTimer > 0) this._attackTimer -= dt;

        const target = this._findNearestEnemyInRange();
        if (target && this._attackTimer <= 0) {
            target.takeDamage(this.damage);
            this._attackTimer = this.attackInterval;
            this._fightHoldTimer = this.fightHoldDuration;
        }

        if (this._fightHoldTimer > 0) {
            this._fightHoldTimer -= dt;
            this._tickFightAnim(dt);
        } else {
            this._showIdle();
        }
    }

    private _findNearestEnemyInRange(): Enemy | null {
        if (Enemy.all.size === 0) return null;
        this.node.getWorldPosition(this._myPos);
        const r2 = this.attackRange * this.attackRange;
        let best: Enemy | null = null;
        let bestD2 = r2;
        for (const e of Enemy.all) {
            if (!e.node || !e.node.isValid) continue;
            e.node.getWorldPosition(this._otherPos);
            const dx = this._otherPos.x - this._myPos.x;
            const dy = this._otherPos.y - this._myPos.y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= bestD2) {
                bestD2 = d2;
                best = e;
            }
        }
        return best;
    }

    private _tickFightAnim(dt: number) {
        if (!this._sprite) return;
        const frameTime = 1 / this.fightFps;
        this._fightTimer += dt;
        if (this._fightTimer >= frameTime) {
            this._fightTimer = 0;
            this._fightFrame = this._fightFrame === 0 ? 1 : 0;
        }
        const frame = this._fightFrame === 0 ? this.fightFrame1 : this.fightFrame2;
        if (frame && this._sprite.spriteFrame !== frame) {
            this._sprite.spriteFrame = frame;
        }
    }

    private _showIdle() {
        if (!this._sprite) return;
        this._fightTimer = 0;
        this._fightFrame = 0;
        if (this.idleFrame && this._sprite.spriteFrame !== this.idleFrame) {
            this._sprite.spriteFrame = this.idleFrame;
        }
    }
}
