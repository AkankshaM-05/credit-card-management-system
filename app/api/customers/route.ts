import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
    createCustomer,
    searchCustomers,
    getCustomerById,
    getMyCustomer,
    getCustomers,
} from "@/lib/services/customer";

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search");
        const customerId = searchParams.get("id");
        const me = searchParams.get("me");

        // Customer viewing their own information
        if (me === "true") {
            if (session.userType !== "CUSTOMER") {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            const customer = await getMyCustomer(session.userId);

            if (!customer) {
                return NextResponse.json(
                    { error: "Customer not found." },
                    { status: 404 }
                );
            }

            return NextResponse.json(customer);
        }

        // Employee or Manager searching customers
        if (search !== null) {
            if (
                session.userType !== "EMPLOYEE" &&
                session.userType !== "MANAGER"
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            if (!search.trim()) {
                return NextResponse.json([]);
            }

            const customers = await searchCustomers(search);

            return NextResponse.json(customers);
        }

        // Customer, Employee, or Manager viewing a specific customer
        if (customerId) {
            if (
                session.userType !== "CUSTOMER" &&
                session.userType !== "EMPLOYEE" &&
                session.userType !== "MANAGER"
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            // Customer can view only their own information
            if (
                session.userType === "CUSTOMER" &&
                session.customerId !== Number(customerId)
            ) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }

            const customer = await getCustomerById(
                Number(customerId)
            );

            if (!customer) {
                return NextResponse.json(
                    { error: "Customer not found." },
                    { status: 404 }
                );
            }

            return NextResponse.json(customer);
        }

        // Admin viewing all customers
        if (session.userType === "ADMIN") {
            const customers = await getCustomers();

            return NextResponse.json(customers);
        }

        return NextResponse.json(
            { error: "Invalid request." },
            { status: 400 }
        );
    } catch (error) {
        console.error("Get customer error:", error);

        return NextResponse.json(
            { error: "Failed to get customer information." },
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
            !data.phone ||
            !data.email ||
            !data.username ||
            !data.password
        ) {
            return NextResponse.json(
                { error: "All customer fields are required." },
                { status: 400 }
            );
        }

        const customer = await createCustomer({
            name: data.name,
            phone: data.phone,
            email: data.email,
            username: data.username,
            password: data.password,
        });

        return NextResponse.json(customer, {
            status: 201,
        });
    } catch (error) {
        console.error("Create customer error:", error);

        return NextResponse.json(
            { error: "Failed to create customer." },
            { status: 500 }
        );
    }
}