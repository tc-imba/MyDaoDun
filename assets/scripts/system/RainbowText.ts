import { _decorator, Component, RichText } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/**
 * Applies a hue-gradient (rainbow) across the characters of a cc.RichText.
 *
 * Edit the plain `text` @property; the component regenerates the RichText
 * BBCode string each frame as
 *   <color=#H0>char0</color><color=#H1>char1</color>...
 * with H_i interpolated linearly from startHue to endHue across the text.
 *
 * Use startHue=0, endHue=300 for a classic red→magenta rainbow.
 * Set startHue == endHue for a uniform solid color (no gradient).
 */
@ccclass('RainbowText')
@executeInEditMode(true)
@requireComponent(RichText)
export class RainbowText extends Component {
    @property({ multiline: true, tooltip: 'Plain text to render with the hue gradient.' })
    text: string = 'Rainbow';

    @property({ tooltip: 'Hue (degrees) at the first character.' })
    startHue: number = 0;

    @property({ tooltip: 'Hue (degrees) at the last character. Use 300 for red→magenta, 360 to wrap back to red.' })
    endHue: number = 300;

    @property({ range: [0, 1, 0.01], slide: true })
    saturation: number = 1;

    @property({ range: [0, 1, 0.01], slide: true, tooltip: 'HSL lightness. 0.5 is fully saturated; <0.5 darkens, >0.5 brightens toward white.' })
    lightness: number = 0.5;

    private _rt: RichText | null = null;
    private _lastKey: string = '';

    onLoad() {
        this._rt = this.getComponent(RichText);
    }

    update() {
        const key = `${this.text}|${this.startHue}|${this.endHue}|${this.saturation}|${this.lightness}`;
        if (key === this._lastKey) return;
        this._lastKey = key;
        if (!this._rt) this._rt = this.getComponent(RichText);
        if (this._rt) this._rt.string = this._buildBBCode();
    }

    private _buildBBCode(): string {
        const chars = Array.from(this.text);
        const n = chars.length;
        if (n === 0) return '';
        const parts: string[] = [];
        for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0 : i / (n - 1);
            const hue = this.startHue + (this.endHue - this.startHue) * t;
            const hex = hslToHex(hue, this.saturation, this.lightness);
            const ch = escapeForBB(chars[i]);
            parts.push(`<color=${hex}>${ch}</color>`);
        }
        return parts.join('');
    }
}

/** HSL → "#RRGGBB" hex. Hue in degrees; saturation/lightness in 0..1. */
function hslToHex(h: number, s: number, l: number): string {
    h = (((h % 360) + 360) % 360) / 360;
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToChannel(p, q, h + 1 / 3);
        g = hueToChannel(p, q, h);
        b = hueToChannel(p, q, h - 1 / 3);
    }
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hueToChannel(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

/** Escape characters that would otherwise be parsed as BBCode markup. */
function escapeForBB(ch: string): string {
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '&') return '&amp;';
    return ch;
}
