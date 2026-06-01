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

        // Hand Size. Poker hands now unlock automatically as the volley grows —
        // there are no per-hand skill nodes; _evaluateHand gates on card count.
        this._add({
            id: 'p_hand_size',
            get name() { return getI18n().t('skill.p_hand_size.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 4,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_hand_size.desc', lvl + 1),
            apply: (lvl, t) => { if (t.pierre) t.pierre.handSize = lvl; },
        });

        // Wildcard chain: Black Joker → Red Joker → Psychic.
        this._add({
            id: 'p_joker_black',
            get name() { return getI18n().t('skill.p_joker_black.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_joker_black.desc'),
            apply: (lvl, t) => { if (t.pierre) t.pierre.blackJoker = lvl; },
        });
        this._add({
            id: 'p_joker_red',
            get name() { return getI18n().t('skill.p_joker_red.name'); },
            parentId: 'p_joker_black',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_joker_red.desc'),
            apply: (lvl, t) => { if (t.pierre) t.pierre.redJoker = lvl; },
        });
        this._add({
            id: 'p_psychic',
            get name() { return getI18n().t('skill.p_psychic.name'); },
            parentId: 'p_joker_red',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_psychic.desc', lvl * 20),
            apply: (lvl, t) => { if (t.pierre) t.pierre.psychic = lvl; },
        });

        // Penetration: +1 pierce per level; leftover budget feeds Call's return.
        this._add({
            id: 'p_pierce',
            get name() { return getI18n().t('skill.p_pierce.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_pierce.desc', lvl),
            apply: (lvl, t) => { if (t.pierre) t.pierre.pierce = lvl; },
        });

        // The Pot — banks chips on hit and scales all damage. Gates Call & Fold.
        this._add({
            id: 'p_pot',
            get name() { return getI18n().t('skill.p_pot.name'); },
            parentId: 'pierre_cashon',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_pot.desc', lvl),
            apply: (lvl, t) => { if (t.pierre) t.pierre.potSkill = lvl; },
        });
        this._add({
            id: 'p_call',
            get name() { return getI18n().t('skill.p_call.name'); },
            parentId: 'p_pot',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_call.desc', lvl),
            apply: (lvl, t) => { if (t.pierre) t.pierre.call = lvl; },
        });
        this._add({
            id: 'p_fold',
            get name() { return getI18n().t('skill.p_fold.name'); },
            parentId: 'p_pot',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().t(`skill.p_fold.desc${lvl}`),
            apply: (lvl, t) => { if (t.pierre) t.pierre.fold = lvl; },
        });

        // All In overflows the pot into a guaranteed best-hand; Half keeps a damage floor.
        const potMaxFor = (lvl: number) => 38 - lvl * 8; // L1 30 · L2 22 · L3 14
        this._add({
            id: 'p_all_in',
            get name() { return getI18n().t('skill.p_all_in.name'); },
            parentId: 'p_fold',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => getI18n().tf('skill.p_all_in.desc', potMaxFor(lvl)),
            apply: (lvl, t) => { if (t.pierre) { t.pierre.allIn = lvl; t.pierre.potMax = potMaxFor(lvl); } },
        });
        this._add({
            id: 'p_all_in_half',
            get name() { return getI18n().t('skill.p_all_in_half.name'); },
            parentId: 'p_all_in',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => getI18n().t('skill.p_all_in_half.desc'),
            apply: (lvl, t) => { if (t.pierre) t.pierre.allInHalf = lvl; },
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

    /**
     * Pin unlearned roots, then guarantee every tree with an offerable option is
     * represented (so a level-up always lets you advance both Daodun and Pierre),
     * then fill any remaining slots with random upgrades.
     */
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

        // 1) Pin every unlearned root first.
        for (const r of roots) {
            if (result.length >= count) break;
            result.push(r);
        }

        // 2) Make sure each tree that still has offerable upgrades gets at least one slot.
        const treeId = (n: SkillNode) => this._rootOf(n).id;
        const present = new Set(result.map(treeId));
        const byTree = new Map<string, SkillNode[]>();
        for (const u of upgrades) {
            const id = treeId(u);
            if (!byTree.has(id)) byTree.set(id, []);
            byTree.get(id)!.push(u);
        }
        for (const [id, list] of byTree) {
            if (result.length >= count) break;
            if (present.has(id)) continue;
            result.push(list[0]);
            present.add(id);
        }

        // 3) Fill the rest with random upgrades.
        for (const u of upgrades) {
            if (result.length >= count) break;
            if (result.includes(u)) continue;
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
