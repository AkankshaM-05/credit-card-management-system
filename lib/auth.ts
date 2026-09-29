import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "./types";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(
    userId: number,
    userType: UserRole,
    customerId?: number,
    staffId?: number
) {
    const token = await new SignJWT({
        userId,
        userType,
        customerId,
        staffId,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(secret);

    const cookieStore = await cookies();

    cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
    });
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, secret);

        return {
            userId: Number(payload.userId),
            userType: String(payload.userType) as UserRole,
            customerId: payload.customerId
                ? Number(payload.customerId)
                : undefined,
            staffId: payload.staffId
                ? Number(payload.staffId)
                : undefined,
        };
    } catch {
        return null;
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}