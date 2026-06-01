import { _decorator, Component, Node, Label, Graphics, Color } from 'cc';
import { getI18n, I18N_EVENT } from './I18n';
const { ccclass, property, requireComponent } = _decorator;

/**
 * A tap-to-toggle EN/中文 button. Draws its own rounded-rect background via
 * cc.Graphics, shows the active language on a child Label, and flips the
 * language on tap. Self-contained so it can live as a reusable prefab.
 */
@ccclass('LanguageToggle')
@requireComponent(Graphics)
export class LanguageToggle extends Component {
    @property({ type: Label, tooltip: 'Child label that shows the current language.' })
    label: Label | null = null;

    @property
    width: number = 120;

    @property
    height: number = 56;

    @property
    bgColor: Color = new Color(40, 40, 60, 220);

    @property
    borderColor: Color = new Color(200, 200, 200, 255);

    onLoad() {
        this._drawBg();
    }

    onEnable() {
        this.node.on(Node.EventType.TOUCH_END, this._onTap, this);
        getI18n().events.on(I18N_EVENT.CHANGED, this._refresh, this);
        this._refresh();
    }

    onDisable() {
        this.node.off(Node.EventType.TOUCH_END, this._onTap, this);
        getI18n().events.off(I18N_EVENT.CHANGED, this._refresh, this);
    }

    private _onTap() {
        getI18n().toggle();
    }

    private _refresh() {
        if (this.label) this.label.string = getI18n().lang === 'zh' ? '中文' : 'EN';
    }

    private _drawBg() {
        const g = this.getComponent(Graphics);
        if (!g) return;
        const w = this.width;
        const h = this.height;
        g.clear();
        g.fillColor = this.bgColor;
        g.roundRect(-w / 2, -h / 2, w, h, 8);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = this.borderColor;
        g.roundRect(-w / 2, -h / 2, w, h, 8);
        g.stroke();
    }
}
