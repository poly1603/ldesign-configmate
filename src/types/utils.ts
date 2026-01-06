/**
 * Advanced TypeScript utility types for ConfigMate
 * Provides deep type manipulation and path-based type inference
 */

/**
 * Extracts keys from a type, including nested paths
 * @example
 * type Config = { server: { port: number; host: string } };
 * type Keys = PathKeys<Config>; // 'server' | 'server.port' | 'server.host'
 */
export type PathKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${Prefix}${K}` | PathKeys<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

/**
 * Gets the value type at a given path
 * @example
 * type Config = { server: { port: number } };
 * type Port = PathValue<Config, 'server.port'>; // number
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * Deep partial - makes all properties optional recursively
 * @example
 * type Config = { server: { port: number; host: string } };
 * type Partial = DeepPartial<Config>; // { server?: { port?: number; host?: string } }
 */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/**
 * Deep required - makes all properties required recursively
 */
export type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

/**
 * Deep readonly - makes all properties readonly recursively
 * @example
 * type Config = { server: { port: number } };
 * type Frozen = DeepReadonly<Config>; // { readonly server: { readonly port: number } }
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Deep mutable - removes readonly from all properties recursively
 */
export type DeepMutable<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

/**
 * Merge two types deeply
 */
export type DeepMerge<T, U> = T extends object
  ? U extends object
    ? {
        [K in keyof T | keyof U]: K extends keyof T
          ? K extends keyof U
            ? DeepMerge<T[K], U[K]>
            : T[K]
          : K extends keyof U
            ? U[K]
            : never;
      }
    : U
  : U;

/**
 * Primitive types
 */
export type Primitive = string | number | boolean | null | undefined | symbol | bigint;

/**
 * Check if type is a primitive
 */
export type IsPrimitive<T> = T extends Primitive ? true : false;

/**
 * Extract only primitive keys from an object
 */
export type PrimitiveKeys<T> = {
  [K in keyof T]: T[K] extends Primitive ? K : never;
}[keyof T];

/**
 * Extract only object keys from an object
 */
export type ObjectKeys<T> = {
  [K in keyof T]: T[K] extends object ? K : never;
}[keyof T];

/**
 * Flattened object type (dot notation keys)
 */
export type FlattenedObject<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? FlattenedObject<T[K], `${Prefix}${K}.`>
        : { [P in `${Prefix}${K}`]: T[K] };
    }[keyof T & string] extends infer O
    ? O extends object
      ? UnionToIntersection<O>
      : never
    : never
  : never;

/**
 * Union to intersection helper
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Environment configuration with overrides
 */
export type ConfigWithEnv<T> = T & {
  env?: Record<string, DeepPartial<T>>;
};

/**
 * Branded type for configuration paths
 */
export type ConfigPath<T> = PathKeys<T> & { readonly __brand: 'ConfigPath' };

/**
 * Safe key access - ensures key exists
 */
export type SafeGet<T, K> = K extends keyof T ? T[K] : never;

/**
 * Nullable type
 */
export type Nullable<T> = T | null | undefined;

/**
 * Non-nullable deep - removes null and undefined recursively
 */
export type DeepNonNullable<T> = T extends object
  ? { [K in keyof T]: DeepNonNullable<NonNullable<T[K]>> }
  : NonNullable<T>;

/**
 * Pick deep - pick nested properties
 */
export type PickDeep<T, K extends PathKeys<T>> = K extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? { [P in First]: PickDeep<T[First], Rest & PathKeys<T[First]>> }
    : never
  : K extends keyof T
    ? { [P in K]: T[P] }
    : never;

/**
 * Function type helpers
 */
export type AsyncFunction<T = void> = () => Promise<T>;
export type SyncFunction<T = void> = () => T;
export type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Event handler types
 */
export type EventHandler<T = void> = (data: T) => void;
export type AsyncEventHandler<T = void> = (data: T) => Promise<void>;

/**
 * Configuration validator function type
 */
export type ConfigValidator<T> = (config: T) => boolean | void | Promise<boolean | void>;

/**
 * Configuration transformer function type
 */
export type ConfigTransformer<T, U = T> = (config: T) => U;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Validation result type
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  path?: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Type guard helpers
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Record with string keys
 */
export type StringRecord<T> = Record<string, T>;

/**
 * JSON-serializable types
 */
export type JSONPrimitive = string | number | boolean | null;
export type JSONArray = JSONValue[];
export type JSONObject = { [key: string]: JSONValue };
export type JSONValue = JSONPrimitive | JSONArray | JSONObject;
