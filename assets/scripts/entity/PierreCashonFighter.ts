import { _decorator, Component, Node, Vec3 } from 'cc';
import { Enemy } from './Enemy';
import { PokerCard, PokerCardOptions, Rank, Suit } from './PokerCard';
import { getSkillTree } from '../skills/SkillTree';
import { ExpBar } from '../system/ExpBar';
const { ccclass, property } = _decorator;

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const FACE_RANKS: Rank[] = [11, 12, 13, 1];

interface DrawnCard {
    rank: Rank;
    suit: Suit;
    isJoker: boolean;
    jokerColor?: 'black' | 'red';
}

type HandName =
    | 'One Pair' | 'Two Pair' | 'Three of a Kind'
    | 'Straight' | 'Flush' | 'Full House'
    | 'Four of a Kind' | 'Straight Flush' | 'Royal Flush';

interface HandModifier {
    /** Extra enemies a card of this hand punches through, on top of the Penetration skill. */
    pierce: number;
    homing: boolean;
    aoe: number;
    damageMul: number;
    /** Fire the whole volley as an evenly-spaced 360° ring instead of a forward fan. */
    radial?: boolean;
    /** Extra projectiles added to the volley on top of the drawn cards. */
    count?: number;
}

const DEFAULT_MOD: HandModifier = { pierce: 0, homing: false, aoe: 0, damageMul: 1.0 };

const HAND_MOD: Record<HandName, HandModifier> = {
    'One Pair':        { pierce: 0,  homing: false, aoe:  50, damageMul: 1.0 },
    'Two Pair':        { pierce: 0,  homing: false, aoe:  90, damageMul: 1.4, count: 2 },
    'Three of a Kind': { pierce: 3,  homing: false, aoe:   0, damageMul: 1.2 },
    'Straight':        { pierce: 3,  homing: true,  aoe:   0, damageMul: 1.8, count: 2 },
    'Flush':           { pierce: 0,  homing: true,  aoe:  60, damageMul: 1.6, radial: true },
    'Full House':      { pierce: 4,  homing: false, aoe: 170, damageMul: 2.4, count: 3 },
    'Four of a Kind':  { pierce: 5,  homing: true,  aoe:  90, damageMul: 2.6, count: 4 },
    'Straight Flush':  { pierce: 6,  homing: true,  aoe: 140, damageMul: 3.2, radial: true, count: 6 },
    'Royal Flush':     { pierce: 99, homing: true,  aoe: 230, damageMul: 4.5, radial: true, count: 12 },
};

/** Each banked pot chip multiplies all card damage by this much. */
const POT_DMG = 0.02;

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

    @property({ type: ExpBar, tooltip: 'Optional gauge that displays the current Pot (pot / potMax).' })
    potBar: ExpBar | null = null;

    // Mutated by skill upgrades.
    handSize: number = 0;
    bonusDamage: number = 0;
    rangeMult: number = 1.0;
    speedMult: number = 1.0;
    blackJoker: number = 0;
    redJoker: number = 0;
    faceCardBias: number = 0;
    psychic: number = 0;
    pierce: number = 0;       // Penetration skill: extra enemies a card punches through.
    call: number = 0;         // Call skill: number of return swings.
    fold: number = 0;         // Fold skill level (1..3).
    potSkill: number = 0;     // Pot skill level; gates pot banking + damage scaling.
    allIn: number = 0;        // All In skill level.
    allInHalf: number = 0;    // All In, Half skill.
    pot: number = 0;
    potMax: number = 30;

    private _timer: number = 0;
    private _myPos: Vec3 = new Vec3();
    private _otherPos: Vec3 = new Vec3();

    update(dt: number) {
        const root = getSkillTree().get('pierre_cashon');
        if (!root || root.currentLevel < 1) return;
        this._syncPotBar();
        this._timer -= dt;
        if (this._timer > 0) return;
        const target = this._pickTarget();
        if (!target) {
            // Fold L1: no target → bank the whole would-be volley as chips instead of idling.
            if (this.fold >= 1 && this.potSkill > 0) {
                this._timer = this.attackInterval;
                this._addPot(Math.min(5, 1 + this.handSize));
            }
            return;
        }
        this._timer = this.attackInterval;
        this._fireVolley(target);
    }

    private _addPot(n: number) {
        if (this.potSkill <= 0) return;
        this.pot = Math.min(this.potMax, this.pot + n);
    }

    private _syncPotBar() {
        if (this.potBar) this.potBar.setProgress(this.potMax > 0 ? this.pot / this.potMax : 0);
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
        const jokerQueue: ('black' | 'red')[] = [];
        if (this.blackJoker > 0) jokerQueue.push('black');
        if (this.redJoker > 0) jokerQueue.push('red');
        for (let i = 0; i < n; i++) {
            // 25% per card of converting one of our available jokers into a wildcard slot.
            if (jokerQueue.length > 0 && Math.random() < 0.25) {
                const color = jokerQueue.shift()!;
                cards.push({ rank: 1, suit: 'S', isJoker: true, jokerColor: color });
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

    private _evaluateHand(cards: DrawnCard[]): HandName | null {
        const procMul = 0.4;

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

        // Hand types unlock purely by how many cards the volley holds (driven by Hand Size).
        const len = cards.length;
        const candidates: { name: HandName, base: number, ok: boolean, min: number }[] = [
            { name: 'Royal Flush',     base: 1.00, ok: isRoyal,                          min: 5 },
            { name: 'Straight Flush',  base: 0.80, ok: isFlush && isStraight && !isRoyal, min: 5 },
            { name: 'Four of a Kind',  base: 0.60, ok: top >= 4,                          min: 4 },
            { name: 'Full House',      base: 0.50, ok: top >= 3 && second >= 2,           min: 5 },
            { name: 'Flush',           base: 0.40, ok: isFlush,                           min: 5 },
            { name: 'Straight',        base: 0.40, ok: isStraight,                        min: 5 },
            { name: 'Three of a Kind', base: 0.35, ok: top >= 3,                          min: 3 },
            { name: 'Two Pair',        base: 0.30, ok: top >= 2 && second >= 2,           min: 4 },
            { name: 'One Pair',        base: 0.25, ok: top >= 2,                          min: 2 },
        ];
        for (const c of candidates) {
            if (len < c.min || !c.ok) continue;
            if (Math.random() < c.base * procMul) return c.name;
        }
        return null;
    }

    /** All In: overwrite the hand so it guarantees the best type the card count allows (never royal). */
    private _forceBestHand(cards: DrawnCard[]): HandName | null {
        const n = cards.length;
        const set = (i: number, rank: Rank, suit: Suit) => { cards[i] = { rank, suit, isJoker: false }; };
        if (n >= 5) {
            const ranks: Rank[] = [9, 10, 11, 12, 13]; // 9–K straight flush, deliberately below royal
            for (let i = 0; i < n; i++) set(i, ranks[i % 5], 'S');
            return 'Straight Flush';
        }
        if (n === 4) { for (let i = 0; i < 4; i++) set(i, 13, SUITS[i]); return 'Four of a Kind'; }
        if (n === 3) { for (let i = 0; i < 3; i++) set(i, 13, SUITS[i]); return 'Three of a Kind'; }
        if (n === 2) { set(0, 13, 'S'); set(1, 13, 'H'); return 'One Pair'; }
        return null;
    }

    /** Fold L3: mark which cards contribute to the made hand. Non-contributors get folded. */
    private _scoringMask(cards: DrawnCard[], hand: HandName): boolean[] {
        // Straights/flushes/full house use all five cards, so nothing folds.
        if (hand !== 'One Pair' && hand !== 'Two Pair' && hand !== 'Three of a Kind' && hand !== 'Four of a Kind') {
            return cards.map(() => true);
        }
        const mask = cards.map(c => c.isJoker); // jokers are wild — always kept
        const rankCount = new Map<number, number>();
        for (const c of cards) if (!c.isJoker) rankCount.set(c.rank, (rankCount.get(c.rank) || 0) + 1);
        const byCount = [...rankCount.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
        const keep = new Set<number>();
        if (byCount[0]) keep.add(byCount[0][0]);
        if (hand === 'Two Pair' && byCount[1]) keep.add(byCount[1][0]);
        cards.forEach((c, i) => { if (!c.isJoker && keep.has(c.rank)) mask[i] = true; });
        return mask;
    }

    /** Deterministic poker rank of a hand (0 high card … 9 royal flush). Jokers are wild. */
    private _handRank(cards: DrawnCard[]): number {
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
            const fr = new Set<number>();
            for (const c of real) if (c.suit === flushSuit) fr.add(c.rank);
            const needed = [10, 11, 12, 13, 1];
            let miss = 0;
            for (const r of needed) if (!fr.has(r)) miss++;
            return miss <= jokers;
        })();

        if (isRoyal) return 9;
        if (isFlush && isStraight) return 8;
        if (top >= 4) return 7;
        if (top >= 3 && second >= 2) return 6;
        if (isFlush) return 5;
        if (isStraight) return 4;
        if (top >= 3) return 3;
        if (top >= 2 && second >= 2) return 2;
        if (top >= 2) return 1;
        return 0;
    }

    /**
     * Psychic Power: swap one card in the hand for the concrete card that
     * yields the highest poker rank. The replacement must differ from every
     * other (non-joker) card already in the hand. Never worsens the hand.
     */
    private _applyPsychic(cards: DrawnCard[]) {
        if (cards.length === 0) return;
        let bestScore = this._handRank(cards);
        let best: DrawnCard[] | null = null;
        for (let i = 0; i < cards.length; i++) {
            for (let r = 1; r <= 13; r++) {
                for (const s of SUITS) {
                    let dup = false;
                    for (let k = 0; k < cards.length; k++) {
                        if (k === i) continue;
                        const o = cards[k];
                        if (!o.isJoker && o.rank === r && o.suit === s) { dup = true; break; }
                    }
                    if (dup) continue;
                    const cand = cards.slice();
                    cand[i] = { rank: r as Rank, suit: s, isJoker: false };
                    const score = this._handRank(cand);
                    if (score > bestScore) { bestScore = score; best = cand; }
                }
            }
        }
        if (best) for (let i = 0; i < cards.length; i++) cards[i] = best[i];
    }

    /** Damage every enemy currently alive — the black+red joker payoff. */
    private _fullScreenDamage() {
        const dmg = (this.baseDamage + this.bonusDamage) * 8 + 10;
        for (const e of Enemy.all) {
            if (e.node && e.node.isValid) e.takeDamage(dmg);
        }
    }

    private _fireVolley(target: Enemy) {
        if (!this.worldNode) return;
        const n = Math.min(5, 1 + this.handSize);

        const cards = this._drawHand(n);
        // Psychic: level × 20% chance per volley to swap one card to the best hand.
        if (this.psychic > 0 && Math.random() < this.psychic * 0.2) this._applyPsychic(cards);

        // Black + Red joker together in one hand: full-screen damage.
        const hasBlack = cards.some(c => c.isJoker && c.jokerColor === 'black');
        const hasRed = cards.some(c => c.isJoker && c.jokerColor === 'red');
        if (hasBlack && hasRed) this._fullScreenDamage();

        // All In: a full pot forces the strongest hand the card count allows.
        const allInReady = this.allIn > 0 && this.potSkill > 0 && this.pot >= this.potMax;
        const hand = allInReady ? this._forceBestHand(cards) : this._evaluateHand(cards);
        const mod = hand ? HAND_MOD[hand] : DEFAULT_MOD;

        // Pot scales all damage; spend it only after this volley is paid out.
        const potMul = this.potSkill > 0 ? 1 + this.pot * POT_DMG : 1;

        // Fold L3: cards not part of the made hand fold into chips instead of firing.
        let fireCards = cards;
        if (this.fold >= 3 && this.potSkill > 0 && hand && !allInReady) {
            const mask = this._scoringMask(cards, hand);
            const kept = cards.filter((_, i) => mask[i]);
            const folded = cards.length - kept.length;
            if (kept.length > 0 && folded > 0) { this._addPot(folded); fireCards = kept; }
        }

        target.node.getWorldPosition(this._otherPos);
        this.node.getWorldPosition(this._myPos);
        const aimAng = Math.atan2(this._otherPos.y - this._myPos.y, this._otherPos.x - this._myPos.x);

        const spread = this.fanSpreadDeg * Math.PI / 180;
        const speed = this.baseSpeed * this.speedMult;
        const returnRange = this.baseRange * this.rangeMult;

        // Total projectiles = fired cards + the hand's bonus count.
        const projectiles = fireCards.length + (mod.count ?? 0);

        for (let i = 0; i < projectiles; i++) {
            const c = fireCards[i % fireCards.length];
            let angle: number;
            if (mod.radial) {
                angle = aimAng + (i / projectiles) * Math.PI * 2;
            } else {
                const t = projectiles === 1 ? 0.5 : i / (projectiles - 1);
                angle = aimAng + (t - 0.5) * spread;
            }

            const rankVal = c.rank === 1 ? 14 : c.rank; // ace high for damage
            const rankDmg = Math.max(1, Math.floor(rankVal * 0.4));
            const baseDmg = rankDmg + this.baseDamage + this.bonusDamage;
            const crit = !c.isJoker && rankVal >= 11 && this.faceCardBias > 0;
            const opts: PokerCardOptions = {
                rank: c.rank,
                suit: c.suit,
                isJoker: c.isJoker,
                damage: baseDmg * mod.damageMul * potMul,
                speed,
                lifespan: this.cardLifespan,
                angle,
                pierceBudget: this.pierce + mod.pierce,
                homing: mod.homing,
                target,
                aoeRadius: mod.aoe,
                crit,
                returnTrips: this.call,
                returnTo: this.node,
                returnRange,
                onHit: () => this._addPot(this.potSkill),
                onFold: this.fold >= 2 ? () => this._addPot(1) : undefined,
            };
            PokerCard.spawn(this.worldNode, this._myPos.x, this._myPos.y, opts);
        }

        // Spend the pot for the All In payoff (half if the Half upgrade is owned).
        if (allInReady) this.pot = this.allInHalf > 0 ? Math.floor(this.pot / 2) : 0;
    }
}
