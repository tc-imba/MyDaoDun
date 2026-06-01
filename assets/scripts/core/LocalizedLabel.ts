import { _decorator, Component, Label } from 'cc';
import { getI18n, I18N_EVENT } from './I18n';
const { ccclass, property, requireComponent } = _decorator;

/**
 * Binds a cc.Label's text to an I18n key. The label updates on enable and
 * whenever the language changes, so static UI text follows the active locale.
 */
@ccclass('LocalizedLabel')
@requireComponent(Label)
export class LocalizedLabel extends Component {
    @property({ tooltip: 'I18n dictionary key, e.g. "ui.confirm".' })
    key: string = '';

    private _label: Label | null = null;

    onEnable() {
        this._label = this.getComponent(Label);
        getI18n().events.on(I18N_EVENT.CHANGED, this._refresh, this);
        this._refresh();
    }

    onDisable() {
        getI18n().events.off(I18N_EVENT.CHANGED, this._refresh, this);
    }

    /** Change the key at runtime (e.g. for dynamic UI) and re-render. */
    setKey(key: string) {
        this.key = key;
        this._refresh();
    }

    private _refresh() {
        if (!this._label) this._label = this.getComponent(Label);
        if (this._label && this.key) this._label.string = getI18n().t(this.key);
    }
}
