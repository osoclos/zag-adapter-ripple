import { expect, test } from "vitest";
import { add } from "../src";

test("addition of 2 and 3", () => void expect(add(2, 3)).toBe(5));
