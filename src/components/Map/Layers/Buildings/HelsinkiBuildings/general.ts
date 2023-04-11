export type ValueOf<T> = T[keyof T]

export type StringValueOf<T> = T[keyof T] & string