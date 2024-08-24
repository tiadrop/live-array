# `liveArray()`

Lazy list transformation.

## Basics

A live array behaves similarly to a normal array, exposing a `length` property, number-indexed values and various methods such as `map`, `includes` and `reduce`. The difference is that those indexed values are opaquely virtualised through user-provided `get`, `set` and `getLength` functions.

This is useful, for example, when an array-like interface is needed but the potential size of calculated values makes it unfeasible to store them all in a standard mapped array, or if the mapping process is wastefully expensive while only some elements will ever be accessed.

```ts
const ids = ["main", "my-form", "my-submit-button"];

const elements = liveArray(ids, id => document.getElementById(id));

// or

const elements2 = liveArray({
    getLength: () => ids.length,
    get: idx => document.getElementById(ids[idx]),
});

console.log(elements[1]); // <form ...>

// changes to the source will be reflected in the live array:

ids[1] = "my-cancel-button";
console.log(elements[1]); // <button ...>

```

## Methods

The following methods mimic those of a normal array:

* `map`
* `forEach`
* `at`
* `find`
* `findIndex`
* `some`
* `every`
* `join`
* `reduce`
* `includes`
* `indexOf`
* `lastIndexOf`
* `slice`

The following methods are unique to a LiveArray:

### `mapLive(get, set?)`
Creates a new LiveArray that performs further transformation on read and write.

If `set` is provided, changes carry both ways:
```ts
const base = [2, 3, 4];
const doubles = liveArray(base).mapLive(n => n * 2, n => n / 2);
                                    //  ^ get       ^ set
console.log(doubles[0]); // 4
doubles[0] = 100;
console.log(base[0]); // 50
```

### `sliceLive(start, end?)`
Creates a new LiveArray from a range within the parent

```ts
const base = [1, 2, 3, 4, 5, 6];
const doubles = liveArray(base, n => n * 2);
const slice = base.sliceLive(2, 4);

console.log(slice.length); // 2
base[2] = 100;
console.log(slice[0]); // 200
```

### `reverseLive()`

Creates a new LiveArray that reads the parent in reverse order.

```ts
const words = ["world"];
const live = liveArray(words);
const backwards = live.reverseLive();

words.push("hello");
console.log(backwards.join(" ")); // "hello world"
```

### `withCache(invalidator?)`

Creates a new LiveArray that reads the parent with automatic value caching.

If `invalidator` is provided, it will be called for every value read where the value is already cached, and passed an object of

```ts
{
    ageMs: number; // ms since the value was cached
    value: T; // the cached value
    index: number;
    cacheCount: number; // the number of items currently cached
}
```

If `invalidator` returns `true`, the cache entry is considered invalid. The value will then be recalculated, as normal, by the parent's provided `get`.

```ts
function expensiveHash(s: string) {
    for (let i = 0; i < 100000000; i++) s = getHash(s);
    return s;
}

const keys = ["banana", "sausage", "lemon", "treacle", "shoes", "elephant"];
const hashes = liveArray(keys, expensiveHash).withCache();
```

Advanced example with smart invalidation:

```ts
const hashes = liveArray({
    getLength: () => keys.length,
    get: idx => ({
        key: keys[idx],
        hash: expensiveHash(keys[idx]),
    }),
})
// invalidate cache entries where the key has changed
.withCache(entry => entry.value.key == keys[entry.index])
// but return only the hash
.mapLive(v => v.hash);
```
