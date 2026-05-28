import { _decorator, Component, Label } from 'cc';
import { Enemy } from './Enemy';
import { ExpBar } from '../system/ExpBar';
import { SkillPicker } from '../system/SkillPicker';
const { ccclass, property } = _decorator;

@ccclass('PlayerLevel')
export class PlayerLevel extends Component {
    @property
    level: number = 1;

    @property
    exp: number = 0;

    @property({ tooltip: 'EXP needed for level 1 → 2.' })
    baseExpToLevel: number = 5;

    @property({ tooltip: 'Each level multiplies the cost by this factor.' })
    expGrowthFactor: number = 1.5;

    @property({ type: ExpBar })
    expBar: ExpBar | null = null;

    @property({ type: Label })
    levelLabel: Label | null = null;

    @property({ type: Label })
    expLabel: Label | null = null;

    @property({ type: SkillPicker })
    skillPicker: SkillPicker | null = null;

    get expToNext(): number {
        return Math.max(1, Math.floor(this.baseExpToLevel * Math.pow(this.expGrowthFactor, this.level - 1)));
    }

    onEnable() {
        Enemy.onKilled = (exp) => this.gainExp(exp);
        this._refreshUI();
    }

    onDisable() {
        if (Enemy.onKilled) Enemy.onKilled = null;
    }

    gainExp(amount: number) {
        if (amount <= 0) return;
        this.exp += amount;
        let leveledUp = false;
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            leveledUp = true;
        }
        this._refreshUI();
        if (leveledUp && this.skillPicker) {
            this.skillPicker.show();
        }
    }

    private _refreshUI() {
        const need = this.expToNext;
        if (this.expBar) this.expBar.setProgress(this.exp / need);
        if (this.levelLabel) this.levelLabel.string = `Lv ${this.level}`;
        if (this.expLabel) this.expLabel.string = `${this.exp} / ${need}`;
    }
}
