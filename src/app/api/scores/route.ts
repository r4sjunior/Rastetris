import { NextRequest, NextResponse } from "next/server";
import {
  getPersonalBest,
  getTopScores,
  saveScore,
} from "@/db/actions/score-actions";

const MAX_SCORE = 50_000_000; // teto de sanidade contra valores absurdos

export async function GET(req: NextRequest) {
  const fid = parseInt(req.nextUrl.searchParams.get("fid") ?? "", 10);
  const [top10, personalBest] = await Promise.all([
    getTopScores(),
    Number.isFinite(fid) && fid > 0
      ? getPersonalBest(fid)
      : Promise.resolve(null),
  ]);
  return NextResponse.json({ top10, personalBest });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const num = (v: unknown) =>
      Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 0;
    const fid = num(body.fid);
    const score = num(body.score);
    const level = num(body.level);
    if (fid <= 0 || score <= 0 || score > MAX_SCORE || level <= 0) {
      return NextResponse.json({ success: false }, { status: 400 });
    }
    const { success } = await saveScore(
      fid,
      score,
      level,
      Math.max(0, num(body.lines)),
      Math.max(0, num(body.invaders)),
    );
    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ success: false });
  }
}
