import { DaodunFighter } from '../entity/DaodunFighter';

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
}

export class SkillTree {
    fighter: DaodunFighter | null = null;
    private _nodes: Map<string, SkillNode> = new Map();

    bindFighter(fighter: DaodunFighter) {
        this.fighter = fighter;
        if (this._nodes.size === 0) this._defineDaodun();
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

    private _add(node: SkillNode) { this._nodes.set(node.id, node); }

    get(id: string): SkillNode | undefined { return this._nodes.get(id); }

    /** Nodes the picker can offer: not maxed, parent root or parent has level >= 1. */
    available(): SkillNode[] {
        const result: SkillNode[] = [];
        for (const n of this._nodes.values()) {
            if (n.parentId === null) continue; // root never offered
            if (n.currentLevel >= n.maxLevel) continue;
            const parent = this._nodes.get(n.parentId);
            if (!parent) continue;
            const parentIsRoot = parent.parentId === null;
            if (parentIsRoot || parent.currentLevel >= 1) result.push(n);
        }
        return result;
    }

    /** Pick up to `count` random available nodes, without replacement. */
    pickRandom(count: number): SkillNode[] {
        const pool = this.available();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, count);
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
