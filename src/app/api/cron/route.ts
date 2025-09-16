
import { updateWidgetData } from "@/app/admin/actions";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const result = await updateWidgetData();
        if (result.success) {
            return NextResponse.json({ message: result.message }, { status: 200 });
        } else {
            return NextResponse.json({ message: result.message }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: `Cron job failed: ${error.message}` }, { status: 500 });
    }
}
