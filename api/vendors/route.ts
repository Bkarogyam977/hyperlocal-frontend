import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        *
      FROM vendors WHERE is_active is TRUE
      ORDER BY id ASC
    `);

    return NextResponse.json(result.rows);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {

    console.log("FULL ERROR =>", error);

    return NextResponse.json(
      {
        message: error.message,
      },
      { status: 500 }
    );
  }
}