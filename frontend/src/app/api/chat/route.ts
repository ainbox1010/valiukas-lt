import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
};

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL is not configured." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body.message }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Upstream error." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Upstream unavailable." },
      { status: 502 }
    );
  }
}
