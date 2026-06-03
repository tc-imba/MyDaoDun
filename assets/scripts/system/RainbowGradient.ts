import { _decorator, Component, Label, Material, EffectAsset, Texture2D, UITransform, Vec4, Rect } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/**
 * Fills a cc.Label with a continuous horizontal gradient sampled from a
 * texture (e.g. a rainbow strip), instead of per-character flat colors.
 *
 * Uses the rainbow-gradient.effect: the shader keeps the glyph alpha and
 * replaces RGB with gradientMap sampled left->right across the label's world
 * X bounds. This component owns a runtime Material, binds the gradient
 * texture, and feeds the world bounds each frame (and on enable, so it still
 * paints while the skill picker holds director.pause()).
 *
 * Pair with TextOutline (Label mode) for an outline; it composes since the
 * outline is a separate LabelOutline component.
 */
@ccclass('RainbowGradient')
@executeInEditMode(true)
@requireComponent(Label)
export class RainbowGradient extends Component {
    @property({ type: EffectAsset, tooltip: 'Assign rainbow-gradient.effect.' })
    effect: EffectAsset | null = null;

    @property({ type: Texture2D, tooltip: 'Gradient strip texture sampled left->right (e.g. rainbow_gradient).' })
    gradient: Texture2D | null = null;

    private _label: Label | null = null;
    private _ui: UITransform | null = null;
    private _mat: Material | null = null;
    private _bounds: Vec4 = new Vec4();
    private _lastKey: string = '';

    onLoad() {
        this._label = this.getComponent(Label);
        this._ui = this.getComponent(UITransform);
        this._ensureMaterial();
    }

    onEnable() {
        this._ensureMaterial();
        this._updateBounds(true);
    }

    update() {
        // Also ensure here: in the editor onLoad runs before the Effect /
        // Gradient @properties are assigned, so the material must be (re)built
        // once those are set.
        this._ensureMaterial();
        this._updateBounds(false);
    }

    private _ensureMaterial() {
        if (!this._label) this._label = this.getComponent(Label);
        if (!this.effect || !this._label) return;
        if (!this._mat) {
            this._mat = new Material();
            this._mat.initialize({ effectAsset: this.effect });
        }
        if (this.gradient) this._mat.setProperty('gradientMap', this.gradient);
        if (this._label.customMaterial !== this._mat) {
            this._label.customMaterial = this._mat;
        }
    }

    private _updateBounds(force: boolean) {
        if (!this._mat) return;
        if (!this._ui) this._ui = this.getComponent(UITransform);
        if (!this._ui) return;
        const box: Rect = this._ui.getBoundingBoxToWorld();
        const left = box.x;
        const right = box.x + box.width;
        const key = `${left.toFixed(2)}|${right.toFixed(2)}`;
        if (!force && key === this._lastKey) return;
        this._lastKey = key;
        this._bounds.set(left, right, 0, 0);
        this._mat.setProperty('bounds', this._bounds);
    }
}
