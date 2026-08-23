import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAdminClient, createTestUser, type TestUser } from "../helpers/supabase";

const admin = createAdminClient();

// Regression coverage for the "Fix data-loss risk in plan saving" commit:
// exercise rows used to be replaced via a separate delete-then-insert, so a
// failed insert could leave a plan's exercise table permanently empty. It's
// now done through the replace_training_plan_items() DB function, which
// runs as a single atomic operation and still respects the same RLS as a
// direct delete/insert would (SECURITY INVOKER).
describe("replace_training_plan_items RPC", () => {
  let owner: TestUser;
  let outsider: TestUser;
  let planId: string;

  beforeAll(async () => {
    owner = await createTestUser(admin, "trainer");
    outsider = await createTestUser(admin, "trainer");

    const { data, error } = await admin
      .from("training_plans")
      .insert({
        title: "Vitest RPC plan",
        category_label: "Athletik",
        scope_type: "athlete",
        athlete_id: owner.id,
        date: "2026-08-24",
        created_by: owner.id,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`fixture setup failed: ${error?.message}`);
    planId = data.id;
  });

  afterAll(async () => {
    await admin.from("training_plan_items").delete().eq("training_plan_id", planId);
    await admin.from("training_plans").delete().eq("id", planId);
    await owner.cleanup();
    await outsider.cleanup();
  });

  it("saves items for the plan's owner", async () => {
    const { data, error } = await owner.client.rpc("replace_training_plan_items", {
      p_plan_id: planId,
      p_items: [
        { position: 0, exercise_name: "Kniebeuge", section: "kraft", exercise_id: null },
        { position: 1, exercise_name: "Bankdrücken", section: "kraft", exercise_id: null },
      ],
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const { data: rows } = await admin
      .from("training_plan_items")
      .select("exercise_name")
      .eq("training_plan_id", planId)
      .order("position");
    expect(rows?.map((r) => r.exercise_name)).toEqual(["Kniebeuge", "Bankdrücken"]);
  });

  it("fully replaces the previous items rather than appending to them", async () => {
    const { error } = await owner.client.rpc("replace_training_plan_items", {
      p_plan_id: planId,
      p_items: [{ position: 0, exercise_name: "Nur noch diese", section: "kraft", exercise_id: null }],
    });
    expect(error).toBeNull();

    const { data: rows } = await admin
      .from("training_plan_items")
      .select("exercise_name")
      .eq("training_plan_id", planId);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].exercise_name).toBe("Nur noch diese");
  });

  it("rejects a trainer with no access to the plan, leaving its items untouched", async () => {
    const { error } = await outsider.client.rpc("replace_training_plan_items", {
      p_plan_id: planId,
      p_items: [{ position: 0, exercise_name: "Sollte nicht ankommen", section: "kraft", exercise_id: null }],
    });
    expect(error).not.toBeNull();

    const { data: rows } = await admin
      .from("training_plan_items")
      .select("exercise_name")
      .eq("training_plan_id", planId);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].exercise_name).toBe("Nur noch diese");
  });
});
