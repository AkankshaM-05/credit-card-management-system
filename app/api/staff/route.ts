import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createStaff, getStaff } from "@/lib/services/staff";

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (session.userType !== "ADMIN") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const staff = await getStaff();

        return NextResponse.json(staff);
    } catch (error) {
        console.error("Get staff error:", error);

        return NextResponse.json(
            { error: "Failed to get staff." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (session.userType !== "ADMIN") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const data = await request.json();

        if (
            !data.name ||
            !data.role ||
            !data.username ||
            !data.password
        ) {
            return NextResponse.json(
                { error: "All staff fields are required." },
                { status: 400 }
            );
        }

        if (
            data.role !== "EMPLOYEE" &&
            data.role !== "MANAGER"
        ) {
            return NextResponse.json(
                { error: "Invalid staff role." },
                { status: 400 }
            );
        }

        const staff = await createStaff({
            name: data.name,
            role: data.role,
            username: data.username,
            password: data.password,
        });

        return NextResponse.json(staff, {
            status: 201,
        });
    } catch (error) {
        console.error("Create staff error:", error);

        return NextResponse.json(
            { error: "Failed to create staff." },
            { status: 500 }
        );
    }
}