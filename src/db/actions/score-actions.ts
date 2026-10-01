"use server";

import { db } from "@/neynar-db-sdk/db";
import { rastetrisScores } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export type ScoreEntry = {
  id: string;
  fid: number;
  score: number;
  level: number;
  lines: number;
  invaders: number;
  createdAt: Date;
};

/** Salva o score quando o jogador leva game over. */
export async function saveScore(
  fid: number,
  score: number,
  level: number,
  lines = 0,
  invaders = 0,
): Promise<{ success: boolean }> {
  try {
    await db
      .insert(rastetrisScores)
      .values({ fid, score, level, lines, invaders });
    return { success: true };
  } catch (error) {
    console.error("Failed to save score:", error);
    return { success: false };
  }
}

/** Top 10 global. */
export async function getTopScores(): Promise<ScoreEntry[]> {
  try {
    return await db
      .select()
      .from(rastetrisScores)
      .orderBy(desc(rastetrisScores.score))
      .limit(10);
  } catch (error) {
    console.error("Failed to get top scores:", error);
    return [];
  }
}

/** Melhor score do jogador. */
export async function getPersonalBest(fid: number): Promise<ScoreEntry | null> {
  try {
    const result = await db
      .select()
      .from(rastetrisScores)
      .where(eq(rastetrisScores.fid, fid))
      .orderBy(desc(rastetrisScores.score))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.error("Failed to get personal best:", error);
    return null;
  }
}
