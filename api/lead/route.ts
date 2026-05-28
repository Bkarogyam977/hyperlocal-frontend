import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const { name, mobile } = body;

    // VALIDATION
    if (!name || !mobile) {

      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );

    }

    // INSERT INTO DATABASE
    await pool.query(
      "INSERT INTO leads (name, mobile) VALUES ($1, $2)",
      [name, mobile]
    );

    return NextResponse.json(
      { message: "Submitted successfully" },
      { status: 200 }
    );

  } catch (error) {

    console.log(error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );

  }
}