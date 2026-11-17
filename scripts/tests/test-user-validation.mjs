import assert from "node:assert/strict";
import { importTs } from "./load-ts.mjs";

const {
  MAX_USER_IMAGE_DATA_URL_LENGTH,
  MAX_USER_IMAGE_URL_LENGTH,
  MAX_USER_NAME_LENGTH,
  UserValidationError,
  parseUserImage,
  parseUserName,
  sanitizeUserCreate,
  sanitizeUserUpdate,
} = await importTs("src/features/auth/lib/user-validation.ts");

assert.equal(parseUserName("  Alex Kim  "), "Alex Kim");
assert.equal(parseUserName("สมชาย ใจดี"), "สมชาย ใจดี");
assert.equal(
  parseUserName(` ${"a".repeat(MAX_USER_NAME_LENGTH)} `),
  "a".repeat(MAX_USER_NAME_LENGTH),
);
for (const invalid of [
  null,
  undefined,
  123,
  "",
  "   ",
  "a".repeat(MAX_USER_NAME_LENGTH + 1),
  "Alex\0Kim",
  "Alex\nKim",
  "Alex\tKim",
]) {
  assert.throws(
    () => parseUserName(invalid),
    (error) => error instanceof UserValidationError,
  );
}

assert.equal(parseUserImage(null), null);
assert.equal(parseUserImage(""), null);
assert.equal(parseUserImage("   "), null);
assert.equal(
  parseUserImage("  https://example.com/avatar.png?v=1  "),
  "https://example.com/avatar.png?v=1",
);
assert.equal(
  parseUserImage("http://localhost:3000/avatar.png"),
  "http://localhost:3000/avatar.png",
);
assert.equal(
  parseUserImage("DATA:IMAGE/JPEG;BASE64,/9j/4AAQ"),
  "data:image/jpeg;base64,/9j/4AAQ",
);
assert.equal(
  parseUserImage("data:image/png;base64,iVBORw0K"),
  "data:image/png;base64,iVBORw0K",
);
assert.equal(
  parseUserImage("data:image/webp;base64,UklGRg=="),
  "data:image/webp;base64,UklGRg==",
);

const validDataPrefix = "data:image/jpeg;base64,";
const maxBase64Len =
  Math.floor((MAX_USER_IMAGE_DATA_URL_LENGTH - validDataPrefix.length) / 4) * 4;
assert.equal(
  parseUserImage(validDataPrefix + "A".repeat(maxBase64Len)),
  validDataPrefix + "A".repeat(maxBase64Len),
);

for (const invalid of [
  undefined,
  123,
  {},
  [],
  "/relative/avatar.png",
  "//evil.example/avatar.png",
  "javascript:alert(1)",
  "java\nscript:alert(1)",
  "ftp://example.com/avatar.png",
  "https://user:pass@example.com/avatar.png",
  "https://example.com/avatar name.png",
  `https://example.com/${"a".repeat(MAX_USER_IMAGE_URL_LENGTH)}`,
  "data:image/svg+xml;base64,PHN2Zz4=",
  "data:text/html,<script>alert(1)</script>",
  "data:image/jpeg;charset=utf-8;base64,/9j/4AAQ",
  "data:image/jpeg;base64,",
  "data:image/jpeg;base64,====",
  "data:image/jpeg;base64,ABC",
  "data:image/jpeg;base64,ABCD\nEFGH",
  validDataPrefix + "A".repeat(maxBase64Len + 4),
]) {
  assert.throws(
    () => parseUserImage(invalid),
    (error) => error instanceof UserValidationError,
    `Expected rejection for ${String(invalid).slice(0, 60)}`,
  );
}

assert.deepEqual(sanitizeUserCreate({ name: "  Alex  " }), { name: "Alex" });
assert.deepEqual(sanitizeUserCreate({ name: "  Alex  ", image: "" }), {
  name: "Alex",
  image: null,
});
assert.equal(sanitizeUserUpdate({ timezone: "UTC" }), undefined);
assert.deepEqual(sanitizeUserUpdate({ name: "  Alex  ", image: undefined }), {
  name: "Alex",
});
assert.deepEqual(sanitizeUserUpdate({ name: undefined, image: "  " }), {
  image: null,
});

console.log(
  "User validation checks passed: name trimming/limits/control chars, image URL/data-URI/size limits, and create/update sanitization.",
);
