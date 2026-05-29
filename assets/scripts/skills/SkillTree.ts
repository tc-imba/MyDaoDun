import { DaodunFighter } from '../entity/DaodunFighter';
import { PierreCashonFighter } from '../entity/PierreCashonFighter';

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
            name: 'Daodun',
            parentId: null,
            maxLevel: 1,
            currentLevel: 1,
            describeLevel: () => 'Base style',
            apply: () => { /* root, no effect */ },
            prereq: t => !!t.fighter,
        });
        this._add({
            id: 'radius',
            name: 'Radius',
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => 'Attack radius +30',
            apply: (_lvl, tree) => { if (tree.fighter) tree.fighter.attackRange += 30; },
        });
        this._add({
            id: 'degree',
            name: 'Degree',
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => 'Attack arc +30°',
            apply: (_lvl, tree) => {
                if (tree.fighter) {
                    tree.fighter.fanAngleDeg = Math.min(360, tree.fighter.fanAngleDeg + 30);
                }
            },
        });
        this._add({
            id: 'damage',
            name: 'Damage',
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => 'Attack damage +1',
            apply: (_lvl, tree) => { if (tree.fighter) tree.fighter.damage += 1; },
        });
        this._add({
            id: 'speed',
            name: 'Speed',
            parentId: 'daodun',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => 'Attack interval -0.05s',
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
            name: 'Pierre Cashon',
            parentId: null,
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => 'Unlock: throw a poker card at the nearest enemy',
            apply: () => { /* root */ },
            prereq: t => !!t.pierre,
        });

        // Basic stats.
        this._add({
            id: 'p_hand_size',
            name: 'Hand Size',
            parentId: 'pierre_cashon',
            maxLevel: 4,
            currentLevel: 0,
            describeLevel: lvl => `Fire ${lvl + 1} cards per volley`,
            apply: (lvl, t) => { if (t.pierre) t.pierre.handSize = lvl; },
        });
        this._add({
            id: 'p_card_damage',
            name: 'High Roller',
            parentId: 'pierre_cashon',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => 'Card damage +1',
            apply: (_lvl, t) => { if (t.pierre) t.pierre.bonusDamage += 1; },
        });
        this._add({
            id: 'p_reach',
            name: "Dealer's Reach",
            parentId: 'pierre_cashon',
            maxLevel: 5,
            currentLevel: 0,
            describeLevel: () => 'Range & speed +20%',
            apply: (_lvl, t) => {
                if (t.pierre) {
                    t.pierre.rangeMult *= 1.2;
                    t.pierre.speedMult *= 1.2;
                }
            },
        });
        this._add({
            id: 'p_stacked_deck',
            name: 'Stacked Deck',
            parentId: 'pierre_cashon',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => `Face cards crit; +${lvl * 15}% face-card draws`,
            apply: (lvl, t) => { if (t.pierre) t.pierre.faceCardBias = lvl; },
        });
        this._add({
            id: 'p_joker',
            name: 'Wild Joker',
            parentId: 'pierre_cashon',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => 'Adds a joker (wildcard) to your deck',
            apply: (lvl, t) => { if (t.pierre) t.pierre.jokers = lvl; },
        });

        // Hand-detection sub-branch.
        this._add({
            id: 'p_hand_reader',
            name: 'Hand Reader',
            parentId: 'pierre_cashon',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: lvl => `Hand proc multiplier ${[20, 40, 60][lvl - 1] ?? 60}%`,
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 1,
        });
        this._add({
            id: 'p_pair',
            name: 'One Pair',
            parentId: 'p_hand_reader',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: () => 'Pairs explode in a small AoE',
            apply: () => { /* read at evaluation time */ },
        });
        this._add({
            id: 'p_two_pair',
            name: 'Two Pair',
            parentId: 'p_pair',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => 'Two pairs: bigger AoE + bonus dmg',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 3,
        });
        this._add({
            id: 'p_three_kind',
            name: 'Three of a Kind',
            parentId: 'p_pair',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: () => 'Triples pierce through enemies',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 2,
        });
        this._add({
            id: 'p_straight',
            name: 'Straight',
            parentId: 'p_three_kind',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => '5 consecutive ranks: piercing volley',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 4,
        });
        this._add({
            id: 'p_four_kind',
            name: 'Four of a Kind',
            parentId: 'p_three_kind',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => 'Quads: homing volley',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 3,
        });
        this._add({
            id: 'p_full_house',
            name: 'Full House',
            parentId: 'p_three_kind',
            maxLevel: 2,
            currentLevel: 0,
            describeLevel: () => '3+2: huge AoE detonation',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 4,
        });
        this._add({
            id: 'p_flush',
            name: 'Flush',
            parentId: 'p_hand_reader',
            maxLevel: 3,
            currentLevel: 0,
            describeLevel: () => 'Same suit: all cards home',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_hand_size')?.currentLevel ?? 0) >= 4,
        });
        this._add({
            id: 'p_straight_flush',
            name: 'Straight Flush',
            parentId: 'p_flush',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => 'Straight + flush: homing AoE wipe',
            apply: () => { /* read at evaluation time */ },
            prereq: t => (t.get('p_flush')?.currentLevel ?? 0) >= 2,
        });
        this._add({
            id: 'p_royal_flush',
            name: 'Royal Flush',
            parentId: 'p_straight_flush',
            maxLevel: 1,
            currentLevel: 0,
            describeLevel: () => '10-J-Q-K-A suited: screen nuke',
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
