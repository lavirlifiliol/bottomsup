export type Num = { tag: "number"; value: number };
export type Op = { tag: "operator"; operator: string };
export type Token = Num | Op;
