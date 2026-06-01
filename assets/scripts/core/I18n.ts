import { sys, EventTarget } from 'cc';

export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'mydaodun.lang';

/** Flat key → per-language string table. Add entries as UI text appears. */
const DICT: Record<string, Record<Lang, string>> = {
    'ui.confirm':      { en: 'Confirm',        zh: '确认' },
    'ui.you_are_dead': { en: 'You are dead',   zh: '你死了' },
    'ui.level_prefix': { en: 'Lv',             zh: '等级' },
    'ui.hp':           { en: 'HP',             zh: '生命' },
    'ui.exp':          { en: 'EXP',            zh: '经验' },
    'ui.level_up':     { en: 'Level Up!',      zh: '升级！' },
    'ui.choose_skill': { en: 'Choose a skill', zh: '选择一个技能' },
};

export const I18N_EVENT = { CHANGED: 'i18n-changed' } as const;

class I18nManager {
    readonly events = new EventTarget();
    private _lang: Lang = 'en';

    get lang(): Lang { return this._lang; }

    /** Resolve the starting language: saved preference → device locale → en. */
    init() {
        const saved = sys.localStorage.getItem(STORAGE_KEY) as Lang | null;
        if (saved === 'en' || saved === 'zh') {
            this._lang = saved;
            return;
        }
        this._lang = sys.language === sys.Language.CHINESE ? 'zh' : 'en';
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
        const row = DICT[key];
        if (!row) return key;
        return row[this._lang] ?? row.en ?? key;
    }
}

let _instance: I18nManager | null = null;
export function getI18n(): I18nManager {
    if (!_instance) {
        _instance = new I18nManager();
        _instance.init();
    }
    return _instance;
}
