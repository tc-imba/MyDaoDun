import { _decorator, Component, Node, Vec3 } from 'cc';
import { Enemy } from './Enemy';
import { PokerCard, PokerCardOptions, Rank, Suit } from './PokerCard';
import { getSkillTree, SkillTree } from '../skills/SkillTree';
const { ccclass, property } = _decorator;

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const FACE_RANKS: Rank[] = [11, 12, 13, 1];

interface DrawnCard {
    rank: Rank;
    suit: Suit;
    isJoker: boolean;
}

type HandName =
    | 'One Pair' | 'Two Pair' | 'Three of a Kind'
    | 'Straight' | 'Flush' | 'Full House'
    | 'Four of a Kind' | 'Straight Flush' | 'Royal Flush';

interface HandModifier {
    pierce: boolean;
    homing: boolean;
    aoe: number;
    damageMul: number;
}

const HAND_MOD: Record<HandName, HandModifier> = {
    'One Pair':        { pierce: false, homing: false, aoe:  50, damageMul: 1.0 },
    'Two Pair':        { pierce: false, homing: false, aoe:  70, damageMul: 1.2 },
    'Three of a Kind': { pierce: true,  homing: false, aoe:   0, damageMul: 1.2 },
    'Straight':        { pierce: true,  homing: false, aoe:   0, damageMul: 1.5 },
    'Flush':           { pierce: false, homing: true,  aoe:   0, damageMul: 1.3 },
    'Full House':      { pierce: false, homing: false, aoe: 130, damageMul: 2.0 },
    'Four of a Kind':  { pierce: false, homing: true,  aoe:   0, damageMul: 1.5 },
    'Straight Flush':  { pierce: false, homing: true,  aoe: 100, damageMul: 2.5 },
    'Royal Flush':     { pierce: true,  homing: true,  aoe: 160, damageMul: 3.0 },
};

@ccclass('PierreCashonFighter')
export class PierreCashonFighter extends Component {
    @property({ type: Node, tooltip: 'World node that scrolls; cards parent here so they share coordinates with enemies.' })
    worldNode: Node | null = null;

    @property
    baseDamage: number = 1;

    @property
    attackInterval: number = 0.9;

    @property
    baseRange: number = 600;

    @property
    baseSpeed: number = 520;

    @property
    cardLifespan: number = 1.8;

    @property({ tooltip: 'Total fan spread (degrees) when firing multi-card volleys.' })
    fanSpreadDeg: number = 20;

    // Mutated by skill upgrades.
    handSize: number = 0;
    bonusDamage: number = 0;
    rangeMult: number = 1.0;
    speedMult: number = 1.0;
    jokers: number = 0;
    faceCardBias: number = 0;

    private _timer: number = 0;
    private _myPos: Vec3 = new Vec3();
    private _otherPos: Vec3 = new Vec3();

    update(dt: number) {
        this._timer -= dt;
        if (this._timer > 0) return;
        const target = this._pickTarget();
        if (!target) return;
        this._timer = this.attackInterval;
        this._fireVolley(target);
    }

    private _pickTarget(): Enemy | null {
        if (Enemy.all.size === 0) return null;
        this.node.getWorldPosition(this._myPos);
        const r = this.baseRange * this.rangeMult;
        let best: Enemy | null = null;
        let bestD2 = r * r;
        for (const e of Enemy.all) {
            if (!e.node || !e.node.isValid) continue;
            e.node.getWorldPosition(this._otherPos);
            const dx = this._otherPos.x - this._myPos.x;
            const dy = this._otherPos.y - this._myPos.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; best = e; }
        }
        return best;
    }

    private _drawHand(n: number): DrawnCard[] {
        const cards: DrawnCard[] = [];
        let jokersLeft = this.jokers;
        for (let i = 0; i < n; i++) {
            // 25% per card of converting one of our available jokers into a wildcard slot.
            if (jokersLeft > 0 && Math.random() < 0.25) {
                jokersLeft--;
                cards.push({ rank: 1, suit: 'S', isJoker: true });
                continue;
            }
            let rank: Rank;
            const bias = this.faceCardBias * 0.15;
            if (bias > 0 && Math.random() < bias) {
                rank = FACE_RANKS[Math.floor(Math.random() * FACE_RANKS.length)];
            } else {
                rank = (Math.floor(Math.random() * 13) + 1) as Rank;
            }
            const suit = SUITS[Math.floor(Math.random() * 4)];
            cards.push({ rank, suit, isJoker: false });
        }
        return cards;
    }

    private _evaluateHand(cards: DrawnCard[], tree: SkillTree): HandName | null {
        const reader = tree.get('p_hand_reader');
        if (!reader || reader.currentLevel < 1) return null;
        const procMul = [0, 0.20, 0.40, 0.60][reader.currentLevel] ?? 0.60;
        const lvl = (id: string) => tree.get(id)?.currentLevel ?? 0;

        const real = cards.filter(c => !c.isJoker);
        const jokers = cards.length - real.length;

        const rankCount = new Map<number, number>();
        for (const c of real) rankCount.set(c.rank, (rankCount.get(c.rank) || 0) + 1);
        const counts = [...rankCount.values()].sort((a, b) => b - a);
        const top = (counts[0] || 0) + jokers;
        const second = counts[1] || 0;

        const suitCount = new Map<Suit, number>();
        for (const c of real) suitCount.set(c.suit, (suitCount.get(c.suit) || 0) + 1);
        let maxSuit = 0;
        let flushSuit: Suit | null = null;
        for (const [s, n] of suitCount) {
            if (n > maxSuit) { maxSuit = n; flushSuit = s; }
        }
        const isFlush = cards.length >= 5 && (maxSuit + jokers) >= 5;

        const isStraight = (() => {
            if (cards.length < 5) return false;
            const set = new Set<number>();
            for (const r of rankCount.keys()) set.add(r);
            if (set.has(1)) set.add(14);
            for (let lo = 1; lo <= 10; lo++) {
                let need = 0;
                for (let k = 0; k < 5; k++) if (!set.has(lo + k)) need++;
                if (need <= jokers) return true;
            }
            return false;
        })();

        const isRoyal = (() => {
            if (!isFlush || !isStraight || !flushSuit) return false;
            const flushRanks = new Set<number>();
            for (const c of real) if (c.suit === flushSuit) flushRanks.add(c.rank);
            const needed = [10, 11, 12, 13, 1];
            let missing = 0;
            for (const r of needed) if (!flushRanks.has(r)) missing++;
            return missing <= jokers;
        })();

        // Best → worst. Each gated by its node level and a per-hand base chance, modulated by Hand Reader.
        const candidates: { id: string, name: HandName, base: number, ok: boolean }[] = [
            { id: 'p_royal_flush',    name: 'Royal Flush',     base: 1.00, ok: isRoyal },
            { id: 'p_straight_flush', name: 'Straight Flush',  base: 0.80, ok: isFlush && isStraight && !isRoyal },
            { id: 'p_four_kind',      name: 'Four of a Kind',  base: 0.60, ok: top >= 4 },
            { id: 'p_full_house',     name: 'Full House',      base: 0.50, ok: top >= 3 && second >= 2 },
            { id: 'p_flush',          name: 'Flush',           base: 0.40, ok: isFlush },
            { id: 'p_straight',       name: 'Straight',        base: 0.40, ok: isStraight },
            { id: 'p_three_kind',     name: 'Three of a Kind', base: 0.35, ok: top >= 3 },
            { id: 'p_two_pair',       name: 'Two Pair',        base: 0.30, ok: top >= 2 && second >= 2 },
            { id: 'p_pair',           name: 'One Pair',        base: 0.25, ok: top >= 2 },
        ];
        for (const c of candidates) {
            const nodeLvl = lvl(c.id);
            if (nodeLvl < 1 || !c.ok) continue;
            const chance = c.base * procMul * (1 + (nodeLvl - 1) * 0.5);
            if (Math.random() < chance) return c.name;
        }
        return null;
    }

    private _fireVolley(target: Enemy) {
        if (!this.worldNode) return;
        const tree = getSkillTree();
        const n = Math.min(5, 1 + this.handSize);

        const cards = this._drawHand(n);
        const hand = this._evaluateHand(cards, tree);
        const mod = hand ? HAND_MOD[hand] : { pierce: false, homing: false, aoe: 0, damageMul: 1.0 };

        target.node.getWorldPosition(this._otherPos);
        this.node.getWorldPosition(this._myPos);
        const aimAng = Math.atan2(this._otherPos.y - this._myPos.y, this._otherPos.x - this._myPos.x);

        const spread = this.fanSpreadDeg * Math.PI / 180;
        const speed = this.baseSpeed * this.speedMult;

        for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            const t = n === 1 ? 0.5 : i / (n - 1);
            const angle = aimAng + (t - 0.5) * spread;

            const rankVal = c.rank === 1 ? 14 : c.rank; // ace high for damage
            const rankDmg = Math.max(1, Math.floor(rankVal * 0.4));
            const baseDmg = rankDmg + this.baseDamage + this.bonusDamage;
            const crit = !c.isJoker && rankVal >= 11 && this.faceCardBias > 0;
            const opts: PokerCardOptions = {
                rank: c.rank,
                suit: c.suit,
                isJoker: c.isJoker,
                damage: baseDmg * mod.damageMul,
                speed,
                lifespan: this.cardLifespan,
                angle,
                pierce: mod.pierce,
                homing: mod.homing,
                target,
                aoeRadius: mod.aoe,
                crit,
            };
            PokerCard.spawn(this.worldNode, this._myPos.x, this._myPos.y, opts);
        }
    }
}
