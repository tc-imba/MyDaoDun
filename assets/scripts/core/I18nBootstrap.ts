import { _decorator, Component } from 'cc';
import { getI18n } from './I18n';
const { ccclass } = _decorator;

/**
 * Loads all locale tables once at startup. Place on a node in the scene so
 * i18n data is ready (and a CHANGED event fired) before/while the UI binds.
 * t() falls back to keys until load completes, then everything re-renders.
 */
@ccclass('I18nBootstrap')
export class I18nBootstrap extends Component {
    onLoad() {
        getI18n().load();
    }
}
