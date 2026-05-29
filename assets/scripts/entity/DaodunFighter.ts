import { _decorator, Animation, Component, Sprite, SpriteFrame, Vec3 } from 'cc';
import { Enemy } from './Enemy';
import { Player } from './Player';
const { ccclass, property } = _decorator;

@ccclass('DaodunFighter')
export class DaodunFighter extends Component {
    @property(SpriteFrame)
    idleFrame: SpriteFrame | null = null;

    @property
    attackRange: number = 200;

    @property
    attackInterval: number = 0.4;

    @property
    damage: number = 1;

    @property({ tooltip: 'How long to stay in fight pose after each hit (seconds). Should be >= clip duration.' })
    fightHoldDuration: number = 0.4;

    @property({ tooltip: 'Total angle of the fan-shaped attack area in degrees (centered on the facing direction).' })
    fanAngleDeg: number = 120;

    @property({ tooltip: 'Optional clip name to play on hit. Leave empty to use cc.Animation defaultClip.' })
    fightClipName: string = '';

    private _sprite: Sprite | null = null;
    private _anim: Animation | null = null;
    private _player: Player | null = null;
    private _attackTimer: number = 0;
    private _fightHoldTimer: number = 0;
    private _myPos: Vec3 = new Vec3();
    private _otherPos: Vec3 = new Vec3();

    onLoad() {
        this._sprite = this.getComponent(Sprite);
        this._anim = this.getComponent(Animation);
        this._player = this.getComponent(Player);
    }

    update(dt: number) {
        if (this._attackTimer > 0) this._attackTimer -= dt;

        if (this._attackTimer <= 0 && this._damageAllEnemiesInRange()) {
            this._attackTimer = this.attackInterval;
            this._fightHoldTimer = this.fightHoldDuration;
            this._playFightAnim();
        }

        if (this._fightHoldTimer > 0) {
            this._fightHoldTimer -= dt;
        } else {
            this._showIdle();
        }
    }

    private _playFightAnim() {
        if (!this._anim) return;
        if (this.fightClipName) {
            this._anim.play(this.fightClipName);
        } else {
            this._anim.play();
        }
    }

    private _showIdle() {
        if (this._anim && this._anim.defaultClip) this._anim.stop();
        if (this._sprite && this.idleFrame && this._sprite.spriteFrame !== this.idleFrame) {
            this._sprite.spriteFrame = this.idleFrame;
        }
    }

    private _damageAllEnemiesInRange(): boolean {
        if (Enemy.all.size === 0) return false;
        this.node.getWorldPosition(this._myPos);
        const r2 = this.attackRange * this.attackRange;
        // Facing vector: unit (cos, sin) of Player.facingAngle (radians).
        const facingAngle = this._player ? this._player.facingAngle : Math.PI;
        const fx = Math.cos(facingAngle);
        const fy = Math.sin(facingAngle);
        const cosHalfFan = Math.cos((this.fanAngleDeg * Math.PI) / 360);
        let hitAny = false;
        for (const e of Enemy.all) {
            if (!e.node || !e.node.isValid) continue;
            e.node.getWorldPosition(this._otherPos);
            const dx = this._otherPos.x - this._myPos.x;
            const dy = this._otherPos.y - this._myPos.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > r2) continue;
            if (d2 < 0.0001) {
                e.takeDamage(this.damage);
                hitAny = true;
                continue;
            }
            const dist = Math.sqrt(d2);
            const dot = (fx * dx + fy * dy) / dist;
            if (dot >= cosHalfFan) {
                e.takeDamage(this.damage);
                hitAny = true;
            }
        }
        return hitAny;
    }
}
