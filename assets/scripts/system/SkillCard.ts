import { _decorator, Component, Color, Label, RichText } from 'cc';
import { RainbowText } from './RainbowText';
import { RectOutline } from './RectOutline';
import { SkillNode } from '../skills/SkillTree';
const { ccclass, property } = _decorator;

/**
 * Controller for a single skill choice card (built from the Card prefab
 * layout). Populates the split text nodes — title / level-from / level-to /
 * description — and recolors the card outline on highlight.
 *
 * Visuals (3-colour background, border) are owned by the prefab's
 * TriColorPanel + RectOutline; this component only writes text and flips
 * the outline colour.
 */
@ccclass('SkillCard')
export class SkillCard extends Component {
    @property({ type: RainbowText, tooltip: 'Title text (skill name). Driven via RainbowText.text so it stays rainbow.' })
    titleText: RainbowText | null = null;

    @property({ type: Label, tooltip: 'Label showing the current level (left of the arrow).' })
    lvFromLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Label showing the next level (right of the arrow).' })
    lvToLabel: Label | null = null;

    @property({ type: RichText, tooltip: 'Description text explaining what the skill does.' })
    descriptionText: RichText | null = null;

    @property({ type: RectOutline, tooltip: 'Card border, recolored on highlight.' })
    outline: RectOutline | null = null;

    @property(Color)
    borderColor: Color = new Color(120, 120, 120, 255);

    @property(Color)
    highlightedBorderColor: Color = new Color(255, 220, 80, 255);

    private _highlighted: boolean = false;
    private _skillId: string = '';

    get highlighted(): boolean { return this._highlighted; }
    get skillId(): string { return this._skillId; }

    onLoad() {
        this._applyOutline();
    }

    bind(skill: SkillNode) {
        this._skillId = skill.id;
        const next = skill.currentLevel + 1;
        if (this.titleText) this.titleText.text = skill.name;
        if (this.lvFromLabel) this.lvFromLabel.string = `Lv ${skill.currentLevel}`;
        if (this.lvToLabel) this.lvToLabel.string = `Lv ${next}`;
        if (this.descriptionText) this.descriptionText.string = skill.describeLevel(next);
    }

    clearBinding() {
        this._skillId = '';
        if (this.titleText) this.titleText.text = '';
        if (this.lvFromLabel) this.lvFromLabel.string = '';
        if (this.lvToLabel) this.lvToLabel.string = '';
        if (this.descriptionText) this.descriptionText.string = '';
    }

    setHighlighted(h: boolean) {
        if (this._highlighted === h) return;
        this._highlighted = h;
        this._applyOutline();
    }

    private _applyOutline() {
        if (this.outline) {
            this.outline.color = this._highlighted ? this.highlightedBorderColor : this.borderColor;
        }
    }
}
