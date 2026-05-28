import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Enemy')
export class Enemy extends Component {
    @property
    life: number = 1;

    @property
    expValue: number = 1;

    static readonly all: Set<Enemy> = new Set();
    static onKilled: ((exp: number, enemy: Enemy) => void) | null = null;
    static onPlayerHit: ((damage: number, enemy: Enemy) => void) | null = null;

    onEnable() {
        Enemy.all.add(this);
    }

    onDisable() {
        Enemy.all.delete(this);
    }

    takeDamage(amount: number) {
        if (this.life <= 0) return;
        this.life -= amount;
        if (this.life <= 0) {
            this.die();
        }
    }

    protected die() {
        Enemy.onKilled?.(this.expValue, this);
        this.node.destroy();
    }
}
