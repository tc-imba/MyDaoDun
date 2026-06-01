import { DaodunFighter } from '../entity/DaodunFighter';
import { PierreCashonFighter } from '../entity/PierreCashonFighter';
import { getI18n } from '../core/I18n';

export interface SkillNode {
    id: string;
    name: string;
    parentId: string | null;
    maxLevel: number;
    currentLevel: number;
    /** Human-readable effect text for a given level (cur+1 when shown in picker). */
    describeLevel(level: number): string;
    /** Mutate runtime state. Called once per upgrade with the new currentLevel. */
    apply(level: number, tree: SkillTree): void;
    /** Optional extra gate beyond parent.currentLevel >= 1 (e.g. cross-branch deps). */
    prereq?: (tree: SkillTree) => boolean;
}

export class SkillTree {
    fighter: DaodunFighter | null = null;
    pierre: PierreCashonFighter | null = null;
    private _nodes: Map<string, SkillNode> = new Map();

    bindFighter(fighter: DaodunFighter) {
        this.fighter = fighter;
        if (this._nodes.size === 0) this._defineAll();
    }

    bindPierre(pierre: PierreCashonFighter) {
        this.pierre = pierre;
        if (this._nodes.size === 0) this._defineAll();
    }

    private _defineAll() {
        this._defineDaodun();
        this._definePierreCashon();
    }

    private _defineDaodun() {
        this._add({
            id: 'daodun',
            get name() { return getI18n().t('skill.daodun.name'); },
            parentId: null,
            maxLevel: 1,
            currentLevel: 1,
            describeLevel: () => getI18n().t('skill.daodun.desc'),
            apply: () => { /* root, no effect */ },
            prereq: t => !!t.fighter,
        });
        this._add({
            id: 'radius',
            get name() { return getI18n().t('skill.radius.name'); },
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.radius.desc'),
            apply: (_lvl, tree) => { if (tree.fighter) tree.fighter.attackRange += 30; },
        });
        this._add({
            id: 'degree',
            get name() { return getI18n().t('skill.degree.name'); },
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.degree.desc'),
            apply: (_lvl, tree) => {
                if (tree.fighter) {
                    tree.fighter.fanAngleDeg = Math.min(360, tree.fighter.fanAngleDeg + 30);
                }
            },
        });
        this._add({
            id: 'damage',
            get name() { return getI18n().t('skill.damage.name'); },
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.damage.desc'),
            apply: (_lvl, tree) => { if (tree.fighter) tree.fighter.damage += 1; },
        });
        this._add({
            id: 'speed',
            get name() { return getI18n().t('skill.speed.name'); },
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.speed.desc'),
            apply: (_lvl, tree) => {
                if (tree.fighter) {
                    tree.fighter.attackInterval = Math.max(0.1, tree.fighter.attackInterval - 0.05);
                }
            },
        });
    }

    private _definePierreCashon() {
        // Root — must be picked from the level-up panel before any Pierre upgrade
        // becomes available. The PierreCashonFighter component only starts firing
        // once currentLevel >= 1, and is gated below by the prereq.
        this._add({
            id: 'pierre_cashon',
            get name() { return getI18n().t('skill.pierre_cashon.name'); },
            parentId: null,
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.pierre_cashon.desc'),
            apply: () => { /* root */ },
            prereq: t => !!t.pierre,
        });

        // Basic stats.
        this._add({
            id: 'p_hand_size',
            get name() { return getI18n().t('skill.p_hand_size.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 4,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_hand_size.desc', lvl + 1),
            apply: (lvl, t) => { if (t.pierre) t.pierre.handSize = lvl; },
        });
        this._add({
            id: 'p_card_damage',
            get name() { return getI18n().t('skill.p_card_damage.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_card_damage.desc'),
            apply: (_lvl, t) => { if (t.pierre) t.pierre.bonusDamage += 1; },
        });
        this._add({
            id: 'p_reach',
            get name() { return getI18n().t('skill.p_reach.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_reach.desc'),
            apply: (_lvl, t) => {
                if (t.pierre) {
                    t.pierre.rangeMult *= 1.2;
                    t.pierre.speedMult *= 1.2;
                }
            },
        });
        this._add({
            id: 'p_stacked_deck',
            get name() { return getI18n().t('skill.p_stacked_deck.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_stacked_deck.desc', lvl * 15),
            apply: (lvl, t) => { if (t.pierre) t.pierre.faceCardBias = lvl; },
        });
        this._add({
            id: 'p_joker',
            get name() { return getI18n().t('skill.p_joker.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_joker.desc'),
            apply: (lvl, t) => { if (t.pierre) t.pierre.jokers = lvl; },
        });

        // Hand-detection sub-branch.
        this._add({
            id: 'p_hand_reader',
            get name() { return getI18n().t('skill.p_hand_reader.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_hand_reader.desc', [20, 40, 60][lvl - 1] ?? 60),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 1,
        });
        this._add({
            id: 'p_pair',
            get name() { return getI18n().t('skill.p_pair.name'); },
            parentId: 'p_hand_reader',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_pair.desc'),
            apply: () => { /* read at evaluation time */ },
        });
        this._add({
            id: 'p_two_pair',
            get name() { return getI18n().t('skill.p_two_pair.name'); },
            parentId: 'p_pair',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_two_pair.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 3,
        });
        this._add({
            id: 'p_three_kind',
            get name() { return getI18n().t('skill.p_three_kind.name'); },
            parentId: 'p_pair',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_three_kind.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 2,
        });
        this._add({
            id: 'p_straight',
            get name() { return getI18n().t('skill.p_straight.name'); },
            parentId: 'p_three_kind',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_straight.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 4,
        });
        this._add({
            id: 'p_four_kind',
            get name() { return getI18n().t('skill.p_four_kind.name'); },
            parentId: 'p_three_kind',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_four_kind.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 3,
        });
        this._add({
            id: 'p_full_house',
            get name() { return getI18n().t('skill.p_full_house.name'); },
            parentId: 'p_three_kind',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_full_house.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 4,
        });
        this._add({
            id: 'p_flush',
            get name() { return getI18n().t('skill.p_flush.name'); },
            parentId: 'p_hand_reader',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_flush.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 4,
        });
        this._add({
            id: 'p_straight_flush',
            get name() { return getI18n().t('skill.p_straight_flush.name'); },
            parentId: 'p_flush',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_straight_flush.desc'),
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_flush')?.currentLevel ?? 0) >= 2,
        });
        this._add({
            id: 'p_royal_flush',
            get name() { return getI18n().t('skill.p_royal_flush.name'); },
            parentId: 'p_straight_flush',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_royal_flush.desc'),
            apply: () => { /* read at evaluation time */ },
        });
    }

    private _add(node: SkillNode) { this._nodes.set(node.id, node); }

    get(id: string): SkillNode | undefined { return this._nodes.get(id); }

    private _rootOf(n: SkillNode): SkillNode {
        let cur: SkillNode = n;
        while (cur.parentId) {
            const p = this._nodes.get(cur.parentId);
            if (!p) break;
            cur = p;
        }
        return cur;
    }

    /** Upgrade nodes (non-root) the picker can offer: parent learned (>=1), prereqs pass, not maxed. */
    available(): SkillNode[] {
        const result: SkillNode[] = [];
        for (const n of this._nodes.values()) {
            if (n.parentId === null) continue;
            if (n.currentLevel >= n.maxLevel) continue;
            const parent = this._nodes.get(n.parentId);
            if (!parent) continue;
            if (parent.currentLevel < 1) continue;
            if (n.prereq && !n.prereq(this)) continue;
            const root = this._rootOf(n);
            if (root.prereq && !root.prereq(this)) continue;
            result.push(n);
        }
        return result;
    }

    /** Roots that have not been learned yet (currentLevel < maxLevel) and whose prereq passes. */
    availableRoots(): SkillNode[] {
        const result: SkillNode[] = [];
        for (const n of this._nodes.values()) {
            if (n.parentId !== null) continue;
            if (n.currentLevel >= n.maxLevel) continue;
            if (n.prereq && !n.prereq(this)) continue;
            result.push(n);
        }
        return result;
    }

    /** Pin every unlearned root into the first slots, then fill the rest with random upgrades. */
    pickRandom(count: number): SkillNode[] {
        const shuffle = <T>(arr: T[]): T[] => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };
        const roots = shuffle(this.availableRoots());
        const upgrades = shuffle(this.available());
        const result: SkillNode[] = [];
        for (const r of roots) {
            if (result.length >= count) break;
            result.push(r);
        }
        for (const u of upgrades) {
            if (result.length >= count) break;
            result.push(u);
        }
        return result;
    }

    upgrade(id: string) {
        const node = this._nodes.get(id);
        if (!node || node.currentLevel >= node.maxLevel) return;
        node.currentLevel++;
        node.apply(node.currentLevel, this);
    }
}

let _instance: SkillTree | null = null;
export function getSkillTree(): SkillTree {
    if (!_instance) _instance = new SkillTree();
    return _instance;
}
