import { afterEach, describe, expect, it, vi } from "vitest";
import { processProfilePhoto } from "@/lib/profile-photo";

afterEach(() => vi.restoreAllMocks());

describe("profile photo processing", () => {
  it("center-crops to 1024 square and exports WebP at quality 0.88", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1600, height: 1200, close }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const output = new Blob(["optimized"], { type: "image/webp" });
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type, quality) => {
      expect(type).toBe("image/webp");
      expect(quality).toBe(0.88);
      callback(output);
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    const file = new File([new Uint8Array(2000)], "photo.jpg", { type: "image/jpeg" });

    const result = await processProfilePhoto(file);

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 200, 0, 1200, 1200, 0, 0, 1024, 1024);
    expect(toBlob).toHaveBeenCalled();
    expect(result.previewUrl).toBe("blob:preview");
    expect(result.processedBytes).toBe(output.size);
    expect(close).toHaveBeenCalled();
  });

  it("rejects unsupported and oversized inputs before decoding", async () => {
    await expect(processProfilePhoto(new File(["x"], "photo.svg", { type: "image/svg+xml" }))).rejects.toThrow("JPG, PNG ou WebP");
    const large = new File([new Uint8Array(10_000_001)], "photo.jpg", { type: "image/jpeg" });
    await expect(processProfilePhoto(large)).rejects.toThrow("10 MB");
  });
});
