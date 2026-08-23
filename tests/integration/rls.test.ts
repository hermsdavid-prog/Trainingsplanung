import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAdminClient, createTestUser, type TestUser } from "../helpers/supabase";

const admin = createAdminClient();

describe("training_plans RLS", () => {
  let athleteA: TestUser;
  let athleteB: TestUser;
  let planId: string;

  beforeAll(async () => {
    athleteA = await createTestUser(admin, "athlete");
    athleteB = await createTestUser(admin, "athlete");

    const { data, error } = await admin
      .from("training_plans")
      .insert({
        title: "Vitest private plan",
        category_label: "Athletik",
        scope_type: "athlete",
        athlete_id: athleteA.id,
        date: "2026-08-24",
        created_by: athleteA.id,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`fixture setup failed: ${error?.message}`);
    planId = data.id;
  });

  afterAll(async () => {
    await admin.from("training_plans").delete().eq("id", planId);
    await athleteA.cleanup();
    await athleteB.cleanup();
  });

  it("lets the owning athlete read their own plan", async () => {
    const { data, error } = await athleteA.client
      .from("training_plans")
      .select("id")
      .eq("id", planId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(planId);
  });

  // This is the exact boundary that was manually verified during the code
  // review (a 404 on the page, no data returned) — pinned here so it can't
  // regress silently.
  it("hides the plan from a different athlete (IDOR protection)", async () => {
    const { data, error } = await athleteB.client
      .from("training_plans")
      .select("id")
      .eq("id", planId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});

describe("exercises unique-name index", () => {
  let trainer: TestUser;
  const baseName = `Vitest Kniebeuge ${Date.now()}`;

  beforeAll(async () => {
    trainer = await createTestUser(admin, "trainer");
  });

  afterAll(async () => {
    await admin.from("exercises").delete().ilike("name", baseName);
    await trainer.cleanup();
  });

  // Regression test for the case-sensitivity bug found in the code review:
  // the unique constraint used to be case-sensitive while every app-level
  // lookup is case-insensitive (ilike), so two differently-cased inserts of
  // "the same" exercise name could both succeed and create duplicates.
  it("rejects a second exercise whose name differs only by case", async () => {
    const { error: firstError } = await trainer.client
      .from("exercises")
      .insert({ name: baseName, created_by: trainer.id });
    expect(firstError).toBeNull();

    const { error: secondError } = await trainer.client
      .from("exercises")
      .insert({ name: baseName.toLowerCase(), created_by: trainer.id });
    expect(secondError).not.toBeNull();
  });
});

describe("health_logs RLS", () => {
  let athleteA: TestUser;
  let athleteB: TestUser;

  beforeAll(async () => {
    athleteA = await createTestUser(admin, "athlete");
    athleteB = await createTestUser(admin, "athlete");
    const { error } = await admin
      .from("health_logs")
      .insert({ athlete_id: athleteA.id, date: "2026-08-24", wellbeing: 8, hrv: 55, resting_hr: 58 });
    if (error) throw new Error(`fixture setup failed: ${error.message}`);
  });

  afterAll(async () => {
    await admin.from("health_logs").delete().eq("athlete_id", athleteA.id);
    await athleteA.cleanup();
    await athleteB.cleanup();
  });

  it("hides an athlete's health data from an unrelated athlete", async () => {
    const { data, error } = await athleteB.client
      .from("health_logs")
      .select("id")
      .eq("athlete_id", athleteA.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
