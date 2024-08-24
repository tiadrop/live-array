import { liveArray } from "../index";

const isOdd = (n: number) => n % 2 == 1;
const isGt10 = (n: number) => n > 10;
const baseStatic = [2, 5, 10, 16, 200, 16];

const createRange = (count: number) => Array(count).fill(0).map((_, i) => i);


describe("liveArray(array)", () => {
    it("should provide the correct length", () => {
        const live = liveArray(baseStatic);
        expect(live.length).toBe(baseStatic.length);
    });

    it("should provide the correct indexed values", () => {
        const live = liveArray(baseStatic);
        [-1, 0, 1, 2, 3].forEach(idx => expect(live[idx]).toBe(baseStatic[idx]));
    });

    it("should propagate changes both ways", () => {
        const base = [2, 5, 10];
        const live = liveArray(base);
        base[1] = 4;
        [-1, 0, 1, 2, 3].forEach(idx => expect(live[idx]).toBe(base[idx]));
        base.push(20);
        expect(live.length).toBe(base.length);
        live[0] = -10;
        expect(base[0]).toBe(-10);
    });

    it("should create a live map with liveArray(array, mapFn, unmapFn)", () => {
        const base = [...baseStatic];
        const live = liveArray(base, n => n * 2, n => n / 2);
        expect(live[3]).toBe(base[3] * 2);
        live[1] = 100;
        expect(base[1]).toBe(50);
    });

});

describe("liveArray(options)", () => {
    const createDoubles = (base: number[] = [...baseStatic]) => liveArray({
        getLength: () => base.length,
        get: index => base[index] * 2,
        set: (index, value) => base[index] = value / 2
    });

    const liveStatic = createDoubles();

    it("should provide the correct length", () => {
        expect(liveStatic.length).toBe(baseStatic.length);
    });

    it("should get() correctly", () => {
        expect(liveStatic[3]).toBe(baseStatic[3] * 2);
    });

    it("should set() correctly", () => {
        const base = [1, 3, 5, 6, 7];
        const live = createDoubles(base);
        live[3] = 100;
        expect(base[3]).toBe(50);
    });

    it("should throw on write if no set() provided", () => {
        const live = liveArray({
            getLength: () => 5,
            get: i => i,
        });
        expect(() => live[4] = 5).toThrow(Error);
    });
});

describe(liveArray, () => {

    it("should accurately mimic array's reduce()", () => {
        const live = liveArray(baseStatic);
        const reducer = (accum: number, value: number, idx: number) => {
            return accum + value * idx;
        };
        expect(
            baseStatic.reduce(reducer)
        ).toBe(live.reduce(reducer));
        expect(
            baseStatic.reduce(reducer, 5)
        ).toBe(live.reduce(reducer, 5));
    });

    it("should accurately mimic array's find() and findIndex()", () => {
        const base = [2, 4, 5, 6, 8, 9, 10];
        const live = liveArray(base);
        expect(live.find(isOdd)).toBe(base.find(isOdd));
        expect(live.findIndex(isOdd)).toBe(base.findIndex(isOdd));
        expect(live.find(isGt10)).toBe(base.find(isGt10));
        expect(live.findIndex(isGt10)).toBe(base.findIndex(isGt10));
    });

    it("should index from end with at(-n)", () => {
        const live = liveArray(baseStatic);
        expect(live.at(-2)).toBe(baseStatic.at(-2));
    });

    it("should accurately mimic array's some()", () => {
        expect(liveArray([2, 4, 6]).some(isOdd)).toBeFalsy();
        expect(liveArray([2, 4, 5, 6]).some(isOdd)).toBeTruthy();
    });

    it("should accurately mimic array's every()", () => {
        expect(liveArray([1, 3, 5, 6]).every(isOdd)).toBeFalsy();
        expect(liveArray([1, 3, 5, 7]).every(isOdd)).toBeTruthy();
    });
    
    it("should accurately mimic array's indexOf() and lastIndexOf()", () => {
        const live = liveArray(baseStatic);
        createRange(10).forEach(n => {
            expect(live.indexOf(n)).toBe(baseStatic.indexOf(n));
            expect(live.lastIndexOf(n)).toBe(baseStatic.lastIndexOf(n));
        });
    });

    it("should accurately mimic array's join()", () => {
        const base = ["hello", " ", "world"];
        const live = liveArray(base);
        expect(live.join()).toBe(base.join());
    });

    it("should accurately mimic array's includes()", () => {
        const live = liveArray(baseStatic);
        const baseSlice = baseStatic.slice(3, 6);
        const liveSlice = live.slice(3, 6);
        const liveSliceLive = live.sliceLive(3, 6);
        createRange(baseStatic.length).forEach(c => {
            expect(live.includes(c)).toBe(baseStatic.includes(c));
            expect(liveSlice.includes(c)).toBe(baseSlice.includes(c));
            expect(liveSliceLive.includes(c)).toBe(baseSlice.includes(c));
        });
    });

    it("should accurately mimic array's slice() and join()", () => {
        expect(
            liveArray(baseStatic).slice(2, 4).join("|")
        ).toBe(baseStatic.slice(2, 4).join("|"));
        expect( // negative 'end'
            liveArray(baseStatic).slice(3, -2).join("|")
        ).toBe(baseStatic.slice(3, -2).join("|"));
        expect( // no 'end'
            liveArray(baseStatic).slice(2).join("|")
        ).toBe(baseStatic.slice(2).join("|"));
    });

    it("should carry changes to a sliceLive", () => {
        const base = [1, 2, 3, 5, 8, 13, 21, 34];
        const live = liveArray(base);
        const slice1 = live.sliceLive(2, 7); // [3, 5, 8, 13, 21]
        const slice2 = slice1.sliceLive(2); // [8, 13, 21];
        slice2[1] = -10;
        expect(base[5]).toBe(-10);
    });

    it("should throw RangeError when reading or writing out-of-range indices of sliceLive", () => {
        const live = liveArray(baseStatic).sliceLive(2, 4);
        expect(() => live[-1]).toThrow(RangeError);
        expect(() => live[-1] = 1).toThrow(RangeError);
        expect(() => live[100]).toThrow(RangeError);
        expect(live.length).toBe(baseStatic.slice(2, 4).length);
    });

    it("should accurately mimic array's map()", () => {
        const live = liveArray(baseStatic);
        const mapFunc = (n: number, i: number) => n * i;
        const mapped = live.map(mapFunc);
        expect(baseStatic.map(mapFunc)).toStrictEqual(mapped);
    });

    it("should carry changes to a mapLive", () => {
        const base = [2, 5, 9];
        const live = liveArray(base);
        const mappedLive = live.mapLive(n => n * 2, n => n / 2);
        expect(mappedLive[1]).toBe(base[1] * 2);
        mappedLive[1] = 14;
        expect(base[1]).toBe(7);
    });

    it("should accurately mimic array's filter()", () => {
        const live = liveArray(baseStatic);
        expect(live.filter(isOdd)).toStrictEqual(baseStatic.filter(isOdd));
    });

    it("should throw on writing to a mapLive without a setter", () => {
        const base = [2, 5, 9];
        const live = liveArray(base);
        const mappedLive = live.mapLive(n => n * 2);
        expect(mappedLive[1]).toBe(base[1] * 2);
        expect(() => mappedLive[1] = 14).toThrow(Error);
    });

    it("should read and carry changes via reverseLive()", () => {
        const base = [2, 4, 6, 8];
        const live = liveArray(base);
        const reversed = live.reverseLive();
        expect(reversed.length).toBe(base.length);
        expect(reversed[0]).toBe(base.pop());
        expect(reversed.length).toBe(base.length);
        expect(reversed[0]).toBe(base.at(-1));
        expect(reversed.at(-1)).toBe(base[0]);
        reversed[0] = 100;
        expect(base.at(-1)).toBe(100);
    });

    it("should call getLength() only once for each iterative method", () => {
        let lengthReads = 0;
        const live = liveArray({
            getLength() {
                lengthReads++;
                return baseStatic.length;
            },
            get: i => baseStatic[i],
        });
        [...live]; // including iterator
        live.forEach(() => {});
        live.map(() => {});
        live.find(() => false);
        live.findIndex(() => false);
        live.includes(0);
        live.indexOf(0);
        live.reduce(() => 0);
        live.some(() => false);
        live.every(() => true);
        live.join();
        live.lastIndexOf(0);
        live.filter(() => false);
        expect(lengthReads).toBe(13);
    });

    it("should be spreadable", () => {
        const live = liveArray([3, -1]);
        const string = "abcdefghijklmnop";
        expect(string.slice(...live)).toBe(string.slice(3, -1));
    });

    it("should be compatible with jest's expect().toContain()", () => {
        expect(liveArray(baseStatic)).toContain(10);
        expect(liveArray(baseStatic)).not.toContain(11);
    });

    it("should accurately mimic array's forEach()", () => {
        const base = ["a", "b", "z"];
        const live = liveArray(base);
        let str = "";
        live.forEach((item, i) => {
            str += item + i;
        });
        expect(str).toBe("a0b1z2");
    })

    describe("withCache()", () => {

        it("should cache reads", () => {
            let reads = 0;
            const live = liveArray({
                getLength: () => 5,
                get: i => {
                    reads++;
                    return i * 5;
                },
            }).withCache();
            expect(live[4]).toBe(20); // reads
            expect(reads).toBe(1);
            expect(live[5]).toBe(25); // reads
            expect(reads).toBe(2);
            expect(live[4]).toBe(20); // cached; no read
            expect(reads).toBe(2);
        });

        it("should cache on write", () => {
            let base = [...baseStatic];
            let reads = 0;
            const live = liveArray({
                get: i => {
                    reads++;
                    return base[i];
                },
                set: (i, v) => base[i] = v,
                getLength: () => 10,
            }).withCache();
            live[3] = 500;
            expect(live[3]).toBe(500);
            expect(reads).toBe(0);
            expect(base[3]).toBe(500);
        });

        it("should invalidate according to callback", () => {
            const invalid = new Set<number>();
            let reads = 0;
            const live = liveArray({
                getLength: () => 5,
                get: i => {
                    reads++;
                    return i * 5;
                },
            }).withCache(context => invalid.has(context.index));

            expect(live[4]).toBe(20); // reads = 1
            expect(reads).toBe(1);
            expect(live[4]).toBe(20); // cached; no read
            expect(reads).toBe(1);
            invalid.add(4);
            expect(live[4]).toBe(20);
            expect(reads).toBe(2);
        });

    });

})