export const GridInsets = 15;
export const RoundRectRadius = 10;

export enum Direction {
    None = 0,
    Left = 1 << 0,
    Right = 1 << 1,
    Down = 1 << 2,
    Up = 1 << 3
}

export function direction(dir: Direction): string {
    switch (dir) {
        case Direction.Left:
            return "⬅️";
        case Direction.Right:
            return "➡️";
        case Direction.Down:
            return "⬇️";
        case Direction.Up:
            return "⬆️";
        default:
            return "N/A";
    }
}

export function isValidDirection(dir: Direction): boolean {
    return dir !== Direction.None;
}

export const AnimationFrameInterval = 1 / 60;

export interface OverPrompt {
    prompt: string;
    button_text: string;
}

export abstract class OverPrompts {
    static readonly Win: OverPrompt = {
        prompt: 'You win!',
        button_text: 'Keep going'
    };

    static readonly Lose: OverPrompt = {
        prompt: 'Game over!',
        button_text: 'Try again'
    };
}
