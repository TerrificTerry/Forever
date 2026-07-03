import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockPerformance } from "@/lib/stocks";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const stock = await prisma.stockRecord.findUnique({ where: { id } });
  if (!stock) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  try {
    return NextResponse.json({ ticker: stock.ticker, provider: process.env.STOCK_API_PROVIDER || "manual", performance: await getStockPerformance(stock.ticker, stock.date, stock.price) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Provider failed" }, { status: 502 });
  }
}
