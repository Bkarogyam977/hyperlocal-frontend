import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try{
    const result = await pool.query(
        "SELECT * FROM MENUlIST ORDER BY ID"
    );

    return NextResponse.json(result.rows);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }catch(error){
return NextResponse.json(
    { error: "Database Error" },
    { status: 500}
    );
  }
}