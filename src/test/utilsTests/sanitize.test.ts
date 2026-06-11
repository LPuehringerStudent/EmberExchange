import { escapeHtml, sanitizeText } from "../../backend/utils/sanitize";

describe("sanitize utilities", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>&`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#x27;alert(1)&#x27;&gt;&amp;"
    );
  });

  it("trims and escapes valid user text", () => {
    expect(sanitizeText("  Hello <b>friend</b>  ")).toBe("Hello &lt;b&gt;friend&lt;/b&gt;");
  });

  it("rejects non-strings, empty strings, and overlong strings", () => {
    expect(sanitizeText(null)).toBeNull();
    expect(sanitizeText("   ")).toBeNull();
    expect(sanitizeText("abcdef", 5)).toBeNull();
  });
});
