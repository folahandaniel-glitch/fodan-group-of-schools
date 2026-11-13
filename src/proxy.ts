import { NextResponse, type NextRequest } from "next/server";

/** Passes the requested portal path to the layout, so a page whose module or menu the Developer switched off can be blocked even by direct link. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/portal/:path*"] };
