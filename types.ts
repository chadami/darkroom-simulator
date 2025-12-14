export interface CMYValues {
  c: number;
  m: number;
  y: number;
}

export interface FilterAdjustment {
  initial: CMYValues;
  target: CMYValues;
}
