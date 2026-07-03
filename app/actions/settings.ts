"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { aiClient } from "@/lib/ai";
import { createStockProvider } from "@/lib/stocks";

function result(kind: "error" | "notice", value: string): never {
  redirect(`/settings?${kind}=${encodeURIComponent(value)}`);
}

export async function testAIAction() {
  await requireUser();
  try {
    await aiClient.generate({ systemPrompt: "Reply with exactly: connection ready", userPrompt: "Connection test", maxTokens: 10, temperature: 0 });
    result("notice", "AI connection is working.");
  } catch (error) { result("error", error instanceof Error ? error.message : "AI test failed."); }
}

export async function testStockAction(formData: FormData) {
  await requireUser();
  if ((process.env.STOCK_API_PROVIDER || "manual") === "manual") result("notice", "Manual mode is active; no external stock connection is needed.");
  try {
    const price = await createStockProvider().getCurrentPrice(String(formData.get("ticker") || "AAPL").toUpperCase());
    if (price === null) result("error", "The provider returned no price. Check its key and ticker format.");
    result("notice", `Stock connection is working. Test price: ${price}`);
  } catch (error) { result("error", error instanceof Error ? error.message : "Stock provider test failed."); }
}
