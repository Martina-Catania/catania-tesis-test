export interface ParsedPackage {
  qty: number;
  width: number;
  height: number;
  depth: number;
  raw: string;
}

export interface PackageError {
  raw: string;
  reason: string;
}

export interface DeliveryClient {
  name: string;
  packages: ParsedPackage[];
  errors: PackageError[];
}