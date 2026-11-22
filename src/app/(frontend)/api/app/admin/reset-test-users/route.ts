import { NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/payload";

const MAINTENANCE_TOKEN = "aayah_reset_test_users_2026_98df82e1";

export async function POST(req: Request) {
  const auth = req.headers.get("x-maintenance-token") || "";
  if (auth !== MAINTENANCE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getPayloadClient();

    const usersRes = await payload.find({
      collection: "users",
      limit: 1000,
      overrideAccess: true,
    });

    const deletedUsers: { id: string | number; email: string }[] = [];
    let deletedProjectsCount = 0;
    let deletedUsageCount = 0;

    for (const u of usersRes.docs) {
      const uid = String(u.id);
      deletedUsers.push({ id: u.id, email: u.email });

      // 1. Delete user projects, folders, tags
      try {
        const p = await payload.delete({
          collection: "projects",
          where: { owner: { equals: uid } },
          overrideAccess: true,
        });
        deletedProjectsCount += (p.docs?.length || 0);
      } catch {}

      try {
        await payload.delete({
          collection: "folders",
          where: { owner: { equals: uid } },
          overrideAccess: true,
        });
      } catch {}

      try {
        await payload.delete({
          collection: "tags",
          where: { owner: { equals: uid } },
          overrideAccess: true,
        });
      } catch {}

      // 2. Delete usage tracking & billing events
      for (const coll of ["usage-projects", "usage-verses", "usage-auto-time", "billing-events"] as const) {
        try {
          const del = await payload.delete({
            collection: coll,
            where: { user: { equals: uid } },
            overrideAccess: true,
          });
          deletedUsageCount += (del.docs?.length || 0);
        } catch {}
      }

      // 3. Delete user document
      try {
        await payload.delete({
          collection: "users",
          id: uid,
          overrideAccess: true,
        });
      } catch (err) {
        console.error(`Failed to delete user ${u.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedUsers.length} test users and their associated records.`,
      deletedUsers,
      deletedProjectsCount,
      deletedUsageCount,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
