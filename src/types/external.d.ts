declare module 'toml' {
  export function parse(input: string): any;
  export function stringify(obj: any): string;
}

declare module 'ini' {
  export function parse(input: string): any;
  export function stringify(obj: any, options?: any): string;
  export function encode(obj: any, options?: any): string;
  export function decode(input: string): any;
}