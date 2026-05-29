import { _decorator, Component, Label, AudioClip, AudioSource } from 'cc';
import { Enemy } from './Enemy';
import { DaodunFighter } from './DaodunFighter';
import { PierreCashonFighter } from './PierreCashonFighter';
import { ExpBar } from '../system/ExpBar';
import { SkillPicker } from '../system/SkillPicker';
import { getSkillTree } from '../skills/SkillTree';
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

    @property({ type: AudioSource, tooltip: 'AudioSource used to play level-up SFX. Falls back to Player\'s own AudioSource if unset.' })
    audioSource: AudioSource | null = null;

    @property({ type: AudioClip, tooltip: 'Clip played on level-up.' })
    levelUpClip: AudioClip | null = null;

    @property({ range: [0, 1, 0.01], slide: true })
    levelUpVolume: number = 1.0;

    get expToNext(): number {
        return Math.max(1, Math.floor(this.baseExpToLevel * Math.pow(this.expGrowthFactor, this.level - 1)));
    }

    onEnable() {
        Enemy.onKilled = (exp) => this.gainExp(exp);
        const tree = getSkillTree();
        const fighter = this.node.getComponent(DaodunFighter);
        if (fighter) tree.bindFighter(fighter);
        const pierre = this.node.getComponent(PierreCashonFighter);
        if (pierre) tree.bindPierre(pierre);
        if (!this.audioSource) this.audioSource = this.getComponent(AudioSource);
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
        if (leveledUp) {
            this._playLevelUpSfx();
            if (this.skillPicker) this.skillPicker.show();
        }
    }

    private _playLevelUpSfx() {
        if (this.audioSource && this.levelUpClip) {
            this.audioSource.playOneShot(this.levelUpClip, this.levelUpVolume);
        }
    }

    private _refreshUI() {
        const need = this.expToNext;
        if (this.expBar) this.expBar.setProgress(this.exp / need);
        if (this.levelLabel) this.levelLabel.string = `Lv ${this.level}`;
        if (this.expLabel) this.expLabel.string = `${this.exp} / ${need}`;
    }
}
