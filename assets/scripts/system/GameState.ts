import { EventTarget } from 'cc';

export const GameState = {
    skillPickerOpen: false,
    events: new EventTarget(),
};

export const GAME_EVENT = {
    RESET_INPUT: 'reset-input',
} as const;
