import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { login } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
      })
      .returning();

    await login(user.id, user.username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
