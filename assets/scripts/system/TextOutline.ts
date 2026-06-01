import { _decorator, Color, Component, Label, LabelOutline, RichText } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

/**
 * Adds a colored outline to a cc.RichText or cc.Label on the same node.
 *
 * - cc.RichText: wraps the current RichText.string with an <outline> BBCode
 *   tag in lateUpdate, so it composes with components that write to .string
 *   in update (e.g. RainbowText).
 * - cc.Label: drives a cc.LabelOutline sibling component (auto-added if
 *   missing) with the same color/width.
 *
 * If the node has both, RichText wins.
 */
@ccclass('TextOutline')
@executeInEditMode(true)
export class TextOutline extends Component {
    @property(Color)
    color: Color = new Color(255, 255, 255, 255);

    @property({ range: [0, 10, 1], slide: true, tooltip: 'Outline width in pixels. 0 disables the outline.' })
    width: number = 2;

    private _rt: RichText | null = null;
    private _labelOutline: LabelOutline | null = null;
    private _lastWrapped: string = '';
    private _lastKey: string = '';

    onLoad() {
        this._resolveTarget();
    }

    private _resolveTarget() {
        // Prefer RichText if both are present.
        this._rt = this.getComponent(RichText);
        if (this._rt) {
            this._labelOutline = null;
            return;
        }
        const label = this.getComponent(Label);
        if (label) {
            this._labelOutline = this.getComponent(LabelOutline) ?? this.addComponent(LabelOutline);
        } else {
            this._labelOutline = null;
        }
    }

    lateUpdate() {
        // Re-resolve in case the user swapped Label/RichText after onLoad.
        if (!this._rt && !this._labelOutline) this._resolveTarget();

        if (this._rt) {
            this._updateRichText();
            return;
        }
        if (this._labelOutline) {
            this._updateLabel();
        }
    }

    private _updateRichText() {
        const rt = this._rt!;
        const current = rt.string;
        const key = `${this.width}|${this._colorKey(this.color)}`;
        if (current === this._lastWrapped && key === this._lastKey) return;

        // Strip a previous <outline>...</outline> wrap, if any, so we don't compound.
        let inner = current ?? '';
        const m = inner.match(/^<outline[^>]*>([\s\S]*)<\/outline>$/);
        if (m) inner = m[1];

        if (this.width <= 0 || !inner) {
            this._lastWrapped = inner;
            this._lastKey = key;
            rt.string = inner;
            return;
        }

        const hex = this._colorHex(this.color);
        const wrapped = `<outline color=${hex} width=${this.width}>${inner}</outline>`;
        this._lastWrapped = wrapped;
        this._lastKey = key;
        rt.string = wrapped;
    }

    private _updateLabel() {
        const lo = this._labelOutline!;
        if (lo.width !== this.width) lo.width = this.width;
        // LabelOutline.color is a setter that triggers re-render on assign.
        const c = lo.color;
        if (c.r !== this.color.r || c.g !== this.color.g || c.b !== this.color.b || c.a !== this.color.a) {
            lo.color = new Color(this.color.r, this.color.g, this.color.b, this.color.a);
        }
    }

    private _colorKey(c: Color): string {
        return `${c.r},${c.g},${c.b},${c.a}`;
    }

    private _colorHex(c: Color): string {
        const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
        return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`.toUpperCase();
    }
}
