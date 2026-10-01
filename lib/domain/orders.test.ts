import { describe, expect, it } from "vitest";

import { nextOrder, withOrders } from "./orders";

describe("nextOrder", () => {
  it("é o maior nº + 1", () => {
    expect(nextOrder([])).toBe(1);
    expect(nextOrder([{ orderNo: 3 }, { orderNo: null }, { orderNo: 7 }])).toBe(8);
  });
});

describe("withOrders", () => {
  it("numera os livros sem nº pela data de aquisição, a partir do maior", () => {
    const books = [
      { id: "a", orderNo: 5, acquiredOn: "2020-01-01" },
      { id: "b", orderNo: null, acquiredOn: "2024-01-01" },
      { id: "c", orderNo: null, acquiredOn: "2019-05-05" },
      { id: "d", orderNo: null, acquiredOn: null },
    ];
    expect(withOrders(books).map((b) => [b.id, b.orderNo])).toEqual([
      ["a", 5],
      ["b", 8],
      ["c", 7],
      ["d", 6],
    ]);
  });
  it("não altera livros que já têm nº", () => {
    const books = [{ orderNo: 1, acquiredOn: null }];
    expect(withOrders(books)[0]).toBe(books[0]);
  });
});
