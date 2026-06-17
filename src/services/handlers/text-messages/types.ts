export interface BultoParseado {
  cant: number;
  vol: number; //m^3
  raw: string;
}

export interface BultoError {
  raw: string;
  reason: string;
}

export interface Cliente {
  name: string;
  bultos: BultoParseado[];
  err: BultoError[];
}