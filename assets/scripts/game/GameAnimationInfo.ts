export interface Grid {
    x: number;
    y: number;
}

export interface MoveAnimationInfo {
    from: Grid;
    to: Grid;
}

export interface MergeAnimationInfo {
    lhs: Grid;
    rhs: Grid;
    to: Grid;
    score: number;
}
