import { describe, expect, it } from "vitest";

import { canUnlockYukiDownload, canUploadYukiFile } from "@/lib/yuki-access";

describe("Yuki access rules", () => {
  it("requires an 18+ confirmation before upload access", () => {
    expect(canUploadYukiFile(false, true)).toBe(false);
    expect(canUploadYukiFile(true, true)).toBe(true);
  });

  it("requires a signed-in account before upload access", () => {
    expect(canUploadYukiFile(true, false)).toBe(false);
    expect(canUploadYukiFile(true, true)).toBe(true);
  });

  it("unlocks Yuki only after an uploaded file, adult confirmation, and sign-in", () => {
    expect(canUnlockYukiDownload(true, true, false)).toBe(false);
    expect(canUnlockYukiDownload(false, true, true)).toBe(false);
    expect(canUnlockYukiDownload(true, false, true)).toBe(false);
    expect(canUnlockYukiDownload(true, true, true)).toBe(true);
  });
});
