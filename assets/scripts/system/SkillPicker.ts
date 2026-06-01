import { _decorator, Component, Node, EventTouch, director, AudioClip, AudioSource } from 'cc';
import { SkillCard } from './SkillCard';
import { GameState, GAME_EVENT } from './GameState';
import { getSkillTree, SkillNode } from '../skills/SkillTree';
const { ccclass, property } = _decorator;

@ccclass('SkillPicker')
export class SkillPicker extends Component {
    @property({ type: Node })
    card1: Node | null = null;

    @property({ type: Node })
    card2: Node | null = null;

    @property({ type: Node })
    card3: Node | null = null;

    @property({ type: Node, tooltip: 'Confirm button node. Needs a SkillCard component for highlight state.' })
    confirmButton: Node | null = null;

    @property({ type: AudioClip, tooltip: 'Voice played when a Daodun-tree skill card is selected.' })
    daodunClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Voice played when a Pierre Cashon-tree skill card is selected.' })
    pierreClip: AudioClip | null = null;

    private _selectedIndex: number = -1;
    private _cards: Node[] = [];
    private _picked: (SkillNode | null)[] = [];
    private _audio: AudioSource | null = null;

    onLoad() {
        this.node.active = false;
        this._audio = this.getComponent(AudioSource) ?? this.addComponent(AudioSource);
        this._cards = [this.card1, this.card2, this.card3].filter((n): n is Node => !!n);

        for (let i = 0; i < this._cards.length; i++) {
            const card = this._cards[i];
            const idx = i;
            card.on(Node.EventType.TOUCH_END, (_e: EventTouch) => this._selectCard(idx), this);
        }

        if (this.confirmButton) {
            this.confirmButton.on(Node.EventType.TOUCH_END, this._onConfirm, this);
        }
    }

    show() {
        this._selectedIndex = -1;
        const tree = getSkillTree();
        const picks = tree.pickRandom(this._cards.length);
        this._picked = [];
        for (let i = 0; i < this._cards.length; i++) {
            const sc = this._cards[i].getComponent(SkillCard);
            if (!sc) { this._picked.push(null); continue; }
            const skill = picks[i] ?? null;
            this._picked.push(skill);
            if (skill) {
                sc.bind(skill);
                this._cards[i].active = true;
            } else {
                sc.clearBinding();
                this._cards[i].active = false;
            }
        }
        this.node.active = true;
        GameState.skillPickerOpen = true;
        GameState.events.emit(GAME_EVENT.RESET_INPUT);
        this._refreshVisuals();
        director.pause();
    }

    private _selectCard(index: number) {
        if (!this._picked[index]) return;
        this._selectedIndex = index;
        this._refreshVisuals();
    }

    /** Voice keyed by the skill's root tree: daodun → daodunClip, pierre_cashon → pierreClip. */
    private _playSelectAudio(skill: SkillNode) {
        if (!this._audio) return;
        const tree = getSkillTree();
        let cur: SkillNode = skill;
        while (cur.parentId) {
            const p = tree.get(cur.parentId);
            if (!p) break;
            cur = p;
        }
        const clip = cur.id === 'pierre_cashon' ? this.pierreClip : cur.id === 'daodun' ? this.daodunClip : null;
        if (clip) this._audio.playOneShot(clip);
    }

    private _onConfirm() {
        if (this._selectedIndex < 0) return;
        const picked = this._picked[this._selectedIndex];
        if (picked) {
            this._playSelectAudio(picked);
            getSkillTree().upgrade(picked.id);
        }
        director.resume();
        GameState.skillPickerOpen = false;
        this.node.active = false;
    }

    private _refreshVisuals() {
        for (let i = 0; i < this._cards.length; i++) {
            const sc = this._cards[i].getComponent(SkillCard);
            if (sc) sc.setHighlighted(i === this._selectedIndex);
        }
        if (this.confirmButton) {
            const sc = this.confirmButton.getComponent(SkillCard);
            if (sc) sc.setHighlighted(this._selectedIndex >= 0);
        }
    }
}
