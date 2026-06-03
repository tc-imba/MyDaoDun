import { _decorator, Color, Component, Label, LabelOutline, Material, EffectAsset, Texture2D, UITransform, Vec4, Rect } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/**
 * Fills a cc.Label with a continuous horizontal gradient sampled from a
 * texture (e.g. a rainbow strip), instead of per-character flat colors.
 *
 * Uses the rainbow-gradient.effect: the shader keeps the glyph alpha and
 * replaces RGB with gradientMap sampled left->right across the label's world
 * X bounds. When the label also has cc.LabelOutline, the shader needs to tell
 * outline pixels from body pixels - both share the same glyph cache texture
 * and only differ in RGB. We feed Label.color as `bodyColor` and
 * LabelOutline.color as `outlineColor` so the shader can classify each pixel.
 * That requires the two colors to differ in the bitmap: if they happen to
 * match (default white/white), we silently flip Label.color to black, since
 * the gradient overrides the body RGB anyway so it is visually invisible.
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
    private _outline: LabelOutline | null = null;
    private _ui: UITransform | null = null;
    private _mat: Material | null = null;
    private _bounds: Vec4 = new Vec4();
    private _bodyColor: Vec4 = new Vec4(1, 1, 1, 1);
    private _outlineColor: Vec4 = new Vec4(1, 1, 1, 1);
    private _lastKey: string = '';
    private _lastColorKey: string = '';

    onLoad() {
        this._label = this.getComponent(Label);
        this._outline = this.getComponent(LabelOutline);
        this._ui = this.getComponent(UITransform);
        this._reconcileBodySentinel();
        this._ensureMaterial();
    }

    onEnable() {
        this._ensureMaterial();
        this._reconcileBodySentinel();
        this._updateBounds(true);
        this._updateColors(true);
    }

    update() {
        // Also ensure here: in the editor onLoad runs before the Effect /
        // Gradient @properties are assigned, so the material must be (re)built
        // once those are set.
        this._ensureMaterial();
        this._updateBounds(false);
        this._updateColors(false);
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

    private _updateColors(force: boolean) {
        if (!this._mat || !this._label) return;
        if (!this._outline) this._outline = this.getComponent(LabelOutline);
        this._reconcileBodySentinel();

        const bc = this._label.color;
        const oc = this._outline?.color ?? bc;
        const key = `${bc.r},${bc.g},${bc.b},${bc.a}|${oc.r},${oc.g},${oc.b},${oc.a}`;
        if (!force && key === this._lastColorKey) return;
        this._lastColorKey = key;

        this._bodyColor.set(bc.r / 255, bc.g / 255, bc.b / 255, bc.a / 255);
        this._outlineColor.set(oc.r / 255, oc.g / 255, oc.b / 255, oc.a / 255);
        this._mat.setProperty('bodyColor', this._bodyColor);
        this._mat.setProperty('outlineColor', this._outlineColor);
    }

    // If Label.color matches LabelOutline.color, the bitmap stores identical
    // RGB for body and outline pixels and the shader cannot distinguish them
    // (the outline would vanish under the gradient). Since the gradient
    // shader overrides body RGB regardless, the Label.color is visually a
    // free variable - flip it to black so it differs from the typical white
    // outline. Skip when no outline exists.
    private _reconcileBodySentinel() {
        if (!this._label || !this._outline) return;
        const bc = this._label.color;
        const oc = this._outline.color;
        if (bc.r === oc.r && bc.g === oc.g && bc.b === oc.b) {
            const flipped = new Color(0, 0, 0, bc.a);
            if (oc.r === 0 && oc.g === 0 && oc.b === 0) {
                flipped.set(255, 255, 255, bc.a);
            }
            this._label.color = flipped;
        }
    }
}
