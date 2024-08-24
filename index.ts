type ProxyContext = {
	methods: LiveArrayMethods<any>;
	get: (index: number) => any;
	set: (index: number, value: any) => void;
	length: number;
};

const laProxy = {
	get(context: ProxyContext, prop: any) {
		if (prop == "length") return context.length;
		if ((context.methods as any)[prop]) return (context.methods as any)[prop];
		if (!isNaN(prop)) return context.get(Number(prop));
	},
	set(context: ProxyContext, prop: any, value: any) {
		context.set(Number(prop), value);
		return true;
	}
};

type LiveArrayOptions<T> = {
	getLength: () => number;
	get: (index: number) => T;
	set?: (index: number, value: T) => void;
}

type LiveArrayMethods<T> = {
	[Symbol.iterator](): IterableIterator<T>;
	mapLive<U>(get: (item: T, idx: number) => U, set?: (item: U, idx: number) => T): LiveArray<U>;
	map<U>(fn: (item: T, idx: number) => U): U[];
	forEach(fn: (item: T, idx: number) => void): void;
	at(idx: number): T;
	find(fn: (item: T, idx: number) => boolean): T | undefined;
	findIndex(fn: (item: T, idx: number) => boolean): number;
	some(fn: (item: T, idx: number) => boolean): boolean;
	every(fn: (item: T, idx: number) => boolean): boolean;
	join(glue?: string): string;
	reduce(fn: (accum: T, item: T, idx: number) => T): T;
	reduce(fn: (accum: T, item: T, idx: number) => T, initial: T): T;
	reduce<U>(fn: (accum: U, item: T, idx: number) => U, initial: U): U;
	includes(item: T, fromIndex?: number): boolean;
	indexOf(item: T, fromIndex?: number): number;
	lastIndexOf(item: T, fromIndex?: number): number;
	slice(start: number, end?: number): T[];
	sliceLive(start: number, end?: number): LiveArray<T>;
	reverseLive(): LiveArray<T>;
	withCache(invalidator?: (context: LiveArrayCacheContext<T>) => (boolean | undefined)): LiveArray<T>;
}

type LiveArrayCacheContext<T> = {
	/**
	 * Number of milliseconds that have passed since the item was cached
	 */
	readonly ageMs: number;
	/**
	 * Total number of entries cached at the time of calling the invalidation check
	 */
	readonly cacheCount: number;
	/**
	 * Current cached value
	 */
	readonly value: T;
	readonly index: number;
}

export type LiveArray<T> = Readonly<LiveArrayMethods<T>> & {
	readonly length: number;
	[index: number]: T
};

export function liveArray<T>(options: LiveArrayOptions<T>): LiveArray<T>
export function liveArray<T>(source: T[]): LiveArray<T>
export function liveArray<T, U>(source: T[], mapFn: (item: T) => U, unmapFn?: (item: U) => T): LiveArray<U>
export function liveArray<T, U>(options: any[] | LiveArrayOptions<T>, mapFn?: (item: T) => U, unmapFn?: (item: U) => T): LiveArray<U> {
	if (Array.isArray(options)) {
		const source = options;
		options = {
			getLength: () => source.length,
			get: i => source[i],
			set: (i, v) => source[i] = v,
		}
	}
	const {get, set, getLength} = {
		set: () => { throw new Error("This LiveArray is read-only" )},
		...options
	};

	const methods: LiveArrayMethods<T> = {
		[Symbol.iterator](){
			let i = 0;
			const length = getLength();
			return {
				next(){
					return i >= length ? { done: true, value: undefined } : {
						value: get(i++)
					};
				},
				[Symbol.iterator](){ return this }
			};
		},
		mapLive<U>(fn: (item: T, idx: number) => U, setter?: (item: U, idx: number) => T) {
            return liveArray({
                getLength: getLength,
                get: i => fn(get(i), i),
                set: setter ? ((idx: number, value: U) => {
                    set(idx, setter(value, idx));
                }) : (() => {
                    throw new Error("This LiveArray map is read-only")
                })
            });
        },
		map<U>(fn: (item: T, idx: number) => U) {
            return [...this.mapLive(fn)];
        },
		forEach(fn: (item: T, idx: number) => void) {
			let l = getLength();
			for (let i = 0; i < l; i++) fn(get(i), i);
		},
		at(idx: number) {
			if (idx < 0) idx += getLength();
			return get(idx);
		},
		every(fn) {
			let l = getLength();
			for (let i = 0; i < l; i++) {
				if (!fn(get(i), i)) return false;
			}
			return true;
		},
		some(fn) {
			let l = getLength();
			for (let i = 0; i < l; i++) {
				if (fn(get(i), i)) return true;
			}
			return false;
		},
		find(fn) {
			let l = getLength();
			for (let i = 0; i < l; i++) {
				const value = get(i);
				if (fn(value, i)) return value;
			}
			return undefined;
		},
		findIndex(fn) {
			let l = getLength();
			for (let i = 0; i < l; i++) {
				if (fn(get(i), i)) return i;
			}
			return -1;
		},
		reduce(fn: (accum: any, item: T, idx: number) => T, initial?: any) {
            let [accum, start] = initial === undefined ? [get(0), 1] : [initial, 0];
            let length = getLength();
            for (let i = start; i < length; i++) {
                accum = fn(accum, get(i), i);
            }
            return accum;
        },
		includes(item, fromIndex = 0) {
			const length = getLength();
			for (let i = fromIndex; i < length; i++) {
				if (get(i) === item) return true;
			}
			return false;
		},
		indexOf(item, fromIndex = 0) {
			const length = getLength();
			for (let i = fromIndex; i < length; i++) {
				if (get(i) === item) return i;
			}
			return -1;
		},
		lastIndexOf(item, fromIndex = getLength()) {
			for (let i = fromIndex; i >= 0; i--) {
				if (get(i) === item) return i;
			}
			return -1;
		},
		join(glue = ",") {
			const length = getLength();
			let s = "";
			for (let i = 0; i < length; i++) {
				s += get(i);
				if (i != length - 1) s += glue;
			}
			return s;
		},
		slice(start, end = getLength()) {
			if (end < 0) end = getLength() + end;
			const items: T[] = [];
			for (let i = start; i < end; i++) {
				items.push(get(i));
			}
			return items;
		},
		sliceLive(start, end = getLength()) {
			if (end < 0) end = getLength() + end;
			const length = end - start;
			return liveArray({
				getLength: () => length,
				get: (idx) => {
					if (idx >= length || idx < 0) throw new RangeError("Index out of range");
					return get(idx + start);
				},
				set: (idx, value) => {
					if (idx >= length || idx < 0) throw new RangeError("Index out of range");
					set(idx + start, value);
				}
			})
		},
		reverseLive() {
			return liveArray({
				getLength: () => getLength(),
				get: i => get(getLength() - (i + 1)),
				set: (i, v) => set(getLength() - (i + 1), v),
			});
		},
		withCache(invalidator?) {
			// let length: number | undefined = undefined;
			type Entry = {
				value: T;
				timeCached: number;
			}
			const cache: Map<number, Entry> = new Map();
			const setCache = (i: number, v: T) => {
				cache.set(i, {
					get value(){ return v },
					timeCached: Date.now(),
				});
			}
			return liveArray({
				get: i => {
					if (invalidator && cache.has(i)) {
						const entry = cache.get(i) as Entry;
						if (invalidator({
							get value(){ return entry.value },
							cacheCount: cache.size,
							index: i,
							ageMs: Date.now() - entry.timeCached,
						})) {
							cache.delete(i);
						}
					}
					if (!cache.has(i)) {
						setCache(i, get(i));
					}
					return (cache.get(i) as Entry).value;
				},
				set: (i, v) => {
					set(i, v);
					setCache(i, v);
				},
				getLength: () => {
					return getLength();
					// if (length === undefined) length = getLength();
					// return length;
				}
			})
		
		}
	};
	const proxy = new Proxy(
		Object.create({ get, set, methods }, {
			length: { // passing as a prototype + length prop to make console.log(liveArray) more sensible
				get: getLength,
				enumerable: true,
			}
		}),
		laProxy
	) as unknown as LiveArray<U>;
	if (mapFn !== undefined) return methods.mapLive(mapFn, unmapFn);
	return proxy;
};

