import { _decorator, Component, Label, Node } from 'cc';
import { Enemy } from './Enemy';
import { HpBar } from '../system/HpBar';
const { ccclass, property } = _decorator;

@ccclass('PlayerHp')
export class PlayerHp extends Component {
    @property
    maxHp: number = 30;

    @property({ type: HpBar })
    hpBar: HpBar | null = null;

    @property({ type: Label })
    hpLabel: Label | null = null;

    @property({ type: Node, tooltip: 'Node shown when the player dies (e.g. "You are dead" overlay). Activated on death.' })
    deathOverlay: Node | null = null;

    private _currentHp: number = 0;
    private _dead: boolean = false;

    onLoad() {
        this._currentHp = this.maxHp;
    }

    onEnable() {
        Enemy.onPlayerHit = (dmg) => this.takeDamage(dmg);
        if (this.deathOverlay) this.deathOverlay.active = false;
        this._refreshUI();
    }

    onDisable() {
        if (Enemy.onPlayerHit) Enemy.onPlayerHit = null;
    }

    takeDamage(amount: number) {
        if (this._dead || amount <= 0) return;
        this._currentHp = Math.max(0, this._currentHp - amount);
        this._refreshUI();
        if (this._currentHp === 0) this._die();
    }

    private _refreshUI() {
        if (this.hpBar) this.hpBar.setProgress(this._currentHp / this.maxHp);
        if (this.hpLabel) this.hpLabel.string = `${this._currentHp} / ${this.maxHp}`;
    }

    private _die() {
        this._dead = true;
        if (this.deathOverlay) this.deathOverlay.active = true;
    }
}
