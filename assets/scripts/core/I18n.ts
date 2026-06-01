import { sys, EventTarget, resources, JsonAsset } from 'cc';

export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'mydaodun.lang';

/** Locale → resources path (under assets/resources, no extension). */
const LOCALE_PATH: Record<Lang, string> = {
    en: 'i18n/en-US',
    zh: 'i18n/zh-CN',
};

type Table = Record<string, string>;

export const I18N_EVENT = { CHANGED: 'i18n-changed' } as const;

class I18nManager {
    readonly events = new EventTarget();
    private _lang: Lang = 'en';
    private _tables: Partial<Record<Lang, Table>> = {};
    private _loaded = false;

    get lang(): Lang { return this._lang; }
    get loaded(): boolean { return this._loaded; }

    /** Resolve the starting language: saved preference → device locale → en. */
    initLang() {
        const saved = sys.localStorage.getItem(STORAGE_KEY) as Lang | null;
        if (saved === 'en' || saved === 'zh') {
            this._lang = saved;
            return;
        }
        this._lang = sys.language === sys.Language.CHINESE ? 'zh' : 'en';
    }

    /** Preload every locale table, then announce readiness. Call once at boot. */
    load(): Promise<void> {
        this.initLang();
        const langs: Lang[] = ['en', 'zh'];
        return Promise.all(langs.map(l => this._loadOne(l))).then(() => {
            this._loaded = true;
            this.events.emit(I18N_EVENT.CHANGED, this._lang);
        });
    }

    private _loadOne(lang: Lang): Promise<void> {
        return new Promise(resolve => {
            resources.load(LOCALE_PATH[lang], JsonAsset, (err, asset) => {
                if (err || !asset) {
                    console.error(`[I18n] failed to load ${LOCALE_PATH[lang]}:`, err);
                } else {
                    this._tables[lang] = asset.json as Table;
                }
                resolve();
            });
        });
    }

    setLang(lang: Lang) {
        if (lang === this._lang) return;
        this._lang = lang;
        sys.localStorage.setItem(STORAGE_KEY, lang);
        this.events.emit(I18N_EVENT.CHANGED, lang);
    }

    toggle() {
        this.setLang(this._lang === 'en' ? 'zh' : 'en');
    }

    /** Look up a key for the current language. Falls back to en, then the key itself. */
    t(key: string): string {
        const cur = this._tables[this._lang];
        if (cur && cur[key] != null) return cur[key];
        const en = this._tables.en;
        if (en && en[key] != null) return en[key];
        return key;
    }

    /** Like t(), with positional {0}, {1}, … placeholder substitution. */
    tf(key: string, ...args: (string | number)[]): string {
        return this.t(key).replace(/\{(\d+)\}/g, (m, i) => {
            const v = args[Number(i)];
            return v === undefined ? m : String(v);
        });
    }
}

let _instance: I18nManager | null = null;
export function getI18n(): I18nManager {
    if (!_instance) {
        _instance = new I18nManager();
        _instance.initLang();
    }
    return _instance;
}
