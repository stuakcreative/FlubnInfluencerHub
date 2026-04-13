import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

// Server v3.0 - Clean single-registration routes, no duplicate handlers
const app = new Hono();

app.onError((err, c) => {
  console.log(`[ERROR] ${c.req.method} ${c.req.url}: ${err.message}`);
  return c.json({ error: "Internal server error", details: err.message }, 500);
});

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function supabaseAnon() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
}

async function getAuthUser(c: any): Promise<{ id: string; email: string } | null> {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return null;
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return { id: data.user.id, email: data.user.email || "" };
  } catch (_e) {
    return null;
  }
}

async function requireAdmin(c: any): Promise<{ id: string; email: string } | null> {
  const authUser = await getAuthUser(c);
  if (!authUser) return null;
  try {
    const profile = await kv.get(`user:${authUser.id}`);
    if (profile?.role === "admin") return authUser;
  } catch (_e) { /* fall through */ }
  try {
    const sb = supabaseAdmin();
    const token = c.req.header("Authorization")?.split(" ")[1];
    const { data } = await sb.auth.getUser(token);
    if (data?.user?.user_metadata?.role === "admin") return authUser;
  } catch (_e) { /* ignore */ }
  return null;
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok", version: "3.0" }));

// ── Auth: Signup ──────────────────────────────────────────────────────────────

app.post("/signup", async (c) => {
  try {
    const { email, password, name, role, profileData } = await c.req.json();
    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields: email, password, name, role" }, 400);
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, ...profileData },
      email_confirm: true,
    });

    if (error) {
      console.log("Signup error:", error.message);
      if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
        try {
          const anonSb = supabaseAnon();
          const { data: signInData, error: signInError } = await anonSb.auth.signInWithPassword({ email, password });
          if (signInError) {
            return c.json({ error: "An account with this email already exists. Please log in instead." }, 409);
          }
          const userId = signInData.user.id;
          await sb.auth.admin.updateUserById(userId, { user_metadata: { name, role, ...profileData } });
          const existingProfile = await kv.get(`user:${userId}`);
          const userProfile = {
            id: userId, name, email, role,
            profileCompleted: !!profileData?.profileCompleted,
            agreedToTerms: profileData?.agreedToTerms || false,
            agreedToPrivacy: profileData?.agreedToPrivacy || false,
            registeredAt: existingProfile?.registeredAt || new Date().toISOString(),
            verified: existingProfile?.verified || false,
            ...profileData,
          };
          await kv.set(`user:${userId}`, userProfile);
          return c.json({ user: userProfile, session: signInData.session });
        } catch (_innerErr: any) {
          return c.json({ error: "An account with this email already exists. Please log in instead." }, 409);
        }
      }
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }

    const userId = data.user.id;
    const userProfile = {
      id: userId, name, email, role,
      profileCompleted: !!profileData?.profileCompleted,
      agreedToTerms: profileData?.agreedToTerms || false,
      agreedToPrivacy: profileData?.agreedToPrivacy || false,
      registeredAt: new Date().toISOString(),
      verified: false,
      ...profileData,
    };

    const adminUser = {
      id: userId, name, email, role,
      status: "Active",
      joinDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      plan: role === "brand" ? "Free" : undefined,
    };

    // ── OPTIMIZED: Parallelize admin_users update and sign-in ──
    const anonSb = supabaseAnon();
    const [signInData] = await Promise.all([
      // 1. Sign in to get session (parallel)
      anonSb.auth.signInWithPassword({ email, password }).then(r => r.data),
      // 2. Update KV in parallel
      (async () => {
        const existingAdminUsers = (await kv.get("admin_users")) || [];
        existingAdminUsers.unshift(adminUser);
        await kv.mset([
          { key: `user:${userId}`, value: userProfile },
          { key: "admin_users", value: existingAdminUsers }
        ]);
      })(),
    ]);

    if (!signInData?.session) {
      console.log("Auto-login after signup failed");
      return c.json({ user: userProfile, session: null });
    }
    return c.json({ user: userProfile, session: signInData.session });
  } catch (err: any) {
    console.log("Signup exception:", err.message);
    return c.json({ error: `Signup error: ${err.message}` }, 500);
  }
});

// ── Auth: Login ───────────────────────────────────────────────────────────────

app.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }
    const anonSb = supabaseAnon();
    const { data, error } = await anonSb.auth.signInWithPassword({ email, password });
    if (error) {
      console.log("Login error:", error.message);
      return c.json({ error: `Login failed: ${error.message}` }, 401);
    }
    const userId = data.user.id;
    const meta = data.user.user_metadata || {};
    let userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      userProfile = {
        id: userId,
        name: meta.name || email.split("@")[0],
        email,
        role: meta.role || "brand",
        registeredAt: data.user.created_at,
      };
      await kv.set(`user:${userId}`, userProfile);
    }

    // ── Upsert into admin_users KV so the user always appears in the admin
    //    panel and in /stats even after localStorage resets ──────────────────
    try {
      const role = userProfile.role || meta.role || "brand";
      if (role !== "admin") {
        const adminUsers: any[] = (await kv.get("admin_users")) || [];
        const existingIdx = adminUsers.findIndex(
          (u: any) => u.id === userId || u.email?.toLowerCase() === email.toLowerCase()
        );
        if (existingIdx < 0) {
          adminUsers.unshift({
            id: userId,
            name: userProfile.name || meta.name || email.split("@")[0],
            email: email.toLowerCase(),
            role,
            status: "active",
            joinDate: userProfile.registeredAt || new Date().toISOString(),
            plan: role === "brand" ? "Free" : undefined,
          });
          await kv.set("admin_users", adminUsers);
        }
      }
    } catch (_e) { /* non-critical — don't block login */ }

    return c.json({ user: userProfile, session: data.session });
  } catch (err: any) {
    console.log("Login exception:", err.message);
    return c.json({ error: `Login error: ${err.message}` }, 500);
  }
});

// ── User Profile ──────────────────────────────────────────────────────────────

app.get("/me", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  const profile = await kv.get(`user:${authUser.id}`);
  if (!profile) return c.json({ error: "Profile not found" }, 404);
  return c.json(profile);
});

app.put("/me", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  const updates = await c.req.json();
  const existing = (await kv.get(`user:${authUser.id}`)) || { id: authUser.id, email: authUser.email };
  const updated = { ...existing, ...updates, id: authUser.id };
  await kv.set(`user:${authUser.id}`, updated);
  try {
    const adminUsers = (await kv.get("admin_users")) || [];
    const idx = adminUsers.findIndex((u: any) => u.id === authUser.id);
    if (idx >= 0) {
      adminUsers[idx] = { ...adminUsers[idx], name: updated.name, email: updated.email };
      await kv.set("admin_users", adminUsers);
    }
  } catch (_e) { /* non-critical */ }
  return c.json(updated);
});

// ── Seed Data (NO auth required — runs on first app load before login) ────────

app.post("/seed", async (c) => {
  try {
    const body = await c.req.json();
    const { influencers, collaborations, adminUsers, blogPosts, verifications, pricingPlans, testimonials, createAdminUser } = body;

    const operations: Promise<void>[] = [];

    if (influencers) {
      const existing = await kv.get("influencers");
      if (!existing || existing.length === 0) operations.push(kv.set("influencers", influencers));
    }
    if (collaborations) {
      const existing = await kv.get("collaborations");
      if (!existing || existing.length === 0) operations.push(kv.set("collaborations", collaborations));
    }
    if (adminUsers) {
      const existing = await kv.get("admin_users");
      if (!existing || existing.length === 0) operations.push(kv.set("admin_users", adminUsers));
    }
    if (blogPosts) {
      const existing = await kv.get("blog_posts");
      if (!existing || existing.length === 0) operations.push(kv.set("blog_posts", blogPosts));
    }
    if (verifications) {
      const existing = await kv.get("brand_verifications");
      if (!existing || existing.length === 0) operations.push(kv.set("brand_verifications", verifications));
    }
    if (pricingPlans) {
      const existing = await kv.get("settings:pricing_plans");
      if (!existing || existing.length === 0) operations.push(kv.set("settings:pricing_plans", pricingPlans));
    }
    if (testimonials) {
      const existing = await kv.get("settings:testimonials");
      if (!existing || existing.length === 0) operations.push(kv.set("settings:testimonials", testimonials));
    }

    if (createAdminUser) {
      try {
        const sb = supabaseAdmin();
        const { email, password, name } = createAdminUser;
        const { data: existingUsers } = await sb.auth.admin.listUsers();
        const adminExists = existingUsers?.users?.some((u: any) => u.email === email);
        if (!adminExists) {
          const { data: adminData, error: adminError } = await sb.auth.admin.createUser({
            email,
            password,
            user_metadata: { name, role: "admin" },
            email_confirm: true,
          });
          if (adminError) {
            console.log("Admin user creation error:", adminError.message);
          } else if (adminData?.user) {
            await kv.set(`user:${adminData.user.id}`, {
              id: adminData.user.id, name, email, role: "admin",
              profileCompleted: true,
              registeredAt: new Date().toISOString(),
              verified: true,
            });
            console.log("Admin user created:", email);
          }
        }
      } catch (err: any) {
        console.log("Admin user creation skipped:", err.message);
      }
    }

    await Promise.all(operations);
    return c.json({ success: true, message: "Data seeded (skipped existing collections)" });
  } catch (err: any) {
    console.log("Seed error:", err.message);
    return c.json({ error: `Seed error: ${err.message}` }, 500);
  }
});

// ── Seed: Force (admin only, overwrites) ─────────────────────────────────────

app.post("/seed/force", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  try {
    const body = await c.req.json();
    const ops: Promise<void>[] = [];
    if (body.influencers) ops.push(kv.set("influencers", body.influencers));
    if (body.collaborations) ops.push(kv.set("collaborations", body.collaborations));
    if (body.adminUsers) ops.push(kv.set("admin_users", body.adminUsers));
    if (body.blogPosts) ops.push(kv.set("blog_posts", body.blogPosts));
    if (body.verifications) ops.push(kv.set("brand_verifications", body.verifications));
    if (body.pricingPlans) ops.push(kv.set("settings:pricing_plans", body.pricingPlans));
    if (body.testimonials) ops.push(kv.set("settings:testimonials", body.testimonials));
    await Promise.all(ops);
    return c.json({ success: true, message: "Data force-seeded" });
  } catch (err: any) {
    console.log("Force seed error:", err.message);
    return c.json({ error: `Force seed error: ${err.message}` }, 500);
  }
});

// ── Seed: Cleanup mock data ───────────────────────────────────────────────────

app.post("/seed/cleanup-mock", async (c) => {
  console.log("[SEED] cleanup-mock called");
  try {
    const MOCK_INFLUENCER_IDS = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"];
    const MOCK_ADMIN_EMAILS = ["priya@email.com","contact@stylecraft.com","arjun@email.com","hello@fitlifepro.com","sneha@email.com","vikram@email.com","team@glowup.com","contact@technova.com"];
    const MOCK_BRANDS = ["StyleCraft India","FitLife Pro","GlowUp Skincare","TechNova","WanderLust Travel","BeautyBliss India","ZenTech Gadgets"];
    const MOCK_TESTIMONIAL_IDS = ["t1","t2","t3","t4","t5"];

    const ops: Promise<void>[] = [];

    const influencers = await kv.get("influencers");
    if (Array.isArray(influencers)) {
      const clean = influencers.filter((inf: any) => !MOCK_INFLUENCER_IDS.includes(inf.id));
      if (clean.length !== influencers.length) ops.push(kv.set("influencers", clean));
    }

    const collabs = await kv.get("collaborations");
    if (Array.isArray(collabs)) {
      const clean = collabs.filter((col: any) => {
        const numId = parseInt(col.id);
        return isNaN(numId) || numId > 12 || !MOCK_BRANDS.includes(col.brandName);
      });
      if (clean.length !== collabs.length) ops.push(kv.set("collaborations", clean));
    }

    const admins = await kv.get("admin_users");
    if (Array.isArray(admins)) {
      const clean = admins.filter((u: any) => !MOCK_ADMIN_EMAILS.includes(u.email));
      if (clean.length !== admins.length) ops.push(kv.set("admin_users", clean));
    }

    const testimonials = await kv.get("settings:testimonials");
    if (Array.isArray(testimonials)) {
      const clean = testimonials.filter((t: any) => !MOCK_TESTIMONIAL_IDS.includes(t.id));
      if (clean.length !== testimonials.length) ops.push(kv.set("settings:testimonials", clean));
    }

    const blogs = await kv.get("blog_posts");
    if (Array.isArray(blogs) && blogs.length > 0) {
      const clean = blogs.filter((b: any) => { const n = parseInt(b.id); return isNaN(n) || n > 6; });
      if (clean.length !== blogs.length) ops.push(kv.set("blog_posts", clean));
    }

    await Promise.all(ops);
    return c.json({ success: true, cleaned: ops.length });
  } catch (err: any) {
    console.log("Mock cleanup error:", err.message);
    return c.json({ error: `Cleanup error: ${err.message}` }, 500);
  }
});

// ── Influencers ───────────────────────────────────────────────────────────────

app.get("/influencers", async (c) => {
  const influencers = (await kv.get("influencers")) || [];
  return c.json(influencers);
});

app.get("/influencers/:id", async (c) => {
  const id = c.req.param("id");
  const influencers = (await kv.get("influencers")) || [];
  const inf = influencers.find((i: any) => i.id === id);
  if (!inf) return c.json({ error: "Influencer not found" }, 404);
  return c.json(inf);
});

app.post("/influencers", async (c) => {
  const influencer = await c.req.json();
  const influencers = (await kv.get("influencers")) || [];
  const idx = influencers.findIndex((i: any) => i.id === influencer.id);
  if (idx >= 0) { influencers[idx] = { ...influencers[idx], ...influencer }; }
  else { influencers.push(influencer); }
  await kv.set("influencers", influencers);
  return c.json(influencer);
});

app.put("/influencers/:id", async (c) => {
  const id = c.req.param("id");
  const updates = await c.req.json();
  const influencers = (await kv.get("influencers")) || [];
  const idx = influencers.findIndex((i: any) => i.id === id);
  if (idx < 0) return c.json({ error: "Influencer not found" }, 404);
  influencers[idx] = { ...influencers[idx], ...updates };
  await kv.set("influencers", influencers);
  return c.json(influencers[idx]);
});

app.delete("/influencers/:id", async (c) => {
  const id = c.req.param("id");
  const influencers = (await kv.get("influencers")) || [];
  await kv.set("influencers", influencers.filter((i: any) => i.id !== id));
  return c.json({ success: true });
});

// ── Collaborations ────────────────────────────────────────────────────────────

app.get("/collaborations", async (c) => {
  const collaborations = (await kv.get("collaborations")) || [];
  const brandId = c.req.query("brandId");
  const influencerId = c.req.query("influencerId");
  let filtered = collaborations;
  if (brandId) filtered = filtered.filter((r: any) => r.brandId === brandId);
  if (influencerId) filtered = filtered.filter((r: any) => r.influencerId === influencerId);
  return c.json(filtered);
});

app.post("/collaborations", async (c) => {
  const req = await c.req.json();
  const collaborations = (await kv.get("collaborations")) || [];
  const newCollab = {
    ...req,
    id: req.id || Date.now().toString(),
    status: req.status || "pending",
    contactShareStatus: req.contactShareStatus || "none",
    negotiationRound: req.negotiationRound || 0,
    chatMessages: req.chatMessages || [],
  };
  collaborations.unshift(newCollab);
  await kv.set("collaborations", collaborations);
  return c.json(newCollab);
});

app.put("/collaborations/:id", async (c) => {
  const id = c.req.param("id");
  const updates = await c.req.json();
  const collaborations = (await kv.get("collaborations")) || [];
  const idx = collaborations.findIndex((r: any) => r.id === id);
  if (idx < 0) return c.json({ error: "Collaboration not found" }, 404);
  collaborations[idx] = { ...collaborations[idx], ...updates };
  await kv.set("collaborations", collaborations);
  return c.json(collaborations[idx]);
});

app.post("/collaborations/:id/message", async (c) => {
  const id = c.req.param("id");
  const message = await c.req.json();
  const collaborations = (await kv.get("collaborations")) || [];
  const idx = collaborations.findIndex((r: any) => r.id === id);
  if (idx < 0) return c.json({ error: "Collaboration not found" }, 404);
  const newMsg = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: message.timestamp || new Date().toISOString(),
  };
  collaborations[idx].chatMessages = [...(collaborations[idx].chatMessages || []), newMsg];
  await kv.set("collaborations", collaborations);
  return c.json(newMsg);
});

app.put("/collaborations", async (c) => {
  const collaborations = await c.req.json();
  await kv.set("collaborations", collaborations);
  return c.json({ success: true });
});

// ── Admin Users ─────────────────────────────────────────────────────────────

app.get("/admin/users", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const users = (await kv.get("admin_users")) || [];
  return c.json(users);
});

app.post("/admin/users", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const user = await c.req.json();
  const users = (await kv.get("admin_users")) || [];
  users.unshift(user);
  await kv.set("admin_users", users);
  return c.json(user);
});

app.put("/admin/users/:id", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const id = c.req.param("id");
  const updates = await c.req.json();
  const users = (await kv.get("admin_users")) || [];
  const idx = users.findIndex((u: any) => u.id === id);
  if (idx < 0) return c.json({ error: "User not found" }, 404);
  users[idx] = { ...users[idx], ...updates };
  await kv.set("admin_users", users);
  return c.json(users[idx]);
});

app.delete("/admin/users/:id", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const id = c.req.param("id");
  const users = (await kv.get("admin_users")) || [];
  await kv.set("admin_users", users.filter((u: any) => u.id !== id));
  return c.json({ success: true });
});

app.post("/admin/change-password", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  try {
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) return c.json({ error: "Both passwords required" }, 400);
    if (newPassword.length < 6) return c.json({ error: "New password must be at least 6 characters" }, 400);
    const anonSb = supabaseAnon();
    const { error: verifyError } = await anonSb.auth.signInWithPassword({ email: admin.email, password: currentPassword });
    if (verifyError) return c.json({ error: "Incorrect current password" }, 401);
    const sb = supabaseAdmin();
    const { error: updateError } = await sb.auth.admin.updateUserById(admin.id, { password: newPassword });
    if (updateError) return c.json({ error: `Failed to update password: ${updateError.message}` }, 500);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: `Password change error: ${err.message}` }, 500);
  }
});

// ── User Account Management ──────────────────────────────────────────────────

app.post("/user/change-password", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) return c.json({ error: "Both passwords required" }, 400);
    if (newPassword.length < 8) return c.json({ error: "New password must be at least 8 characters" }, 400);
    const anonSb = supabaseAnon();
    const { error: verifyError } = await anonSb.auth.signInWithPassword({ email: authUser.email, password: currentPassword });
    if (verifyError) return c.json({ error: "Incorrect current password" }, 401);
    const sb = supabaseAdmin();
    const { error: updateError } = await sb.auth.admin.updateUserById(authUser.id, { password: newPassword });
    if (updateError) return c.json({ error: `Failed to update password: ${updateError.message}` }, 500);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: `Password change error: ${err.message}` }, 500);
  }
});

app.post("/user/delete-account", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { reason, notes } = await c.req.json();
    console.log(`[ACCOUNT DELETE] User ${authUser.id} (${authUser.email}) - Reason: ${reason} - Notes: ${notes || "none"}`);
    try { await kv.del(`user:${authUser.id}`); } catch (_e) { /* ignore */ }
    const sb = supabaseAdmin();
    const { error: deleteError } = await sb.auth.admin.deleteUser(authUser.id);
    if (deleteError) return c.json({ error: `Failed to delete account: ${deleteError.message}` }, 500);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: `Account deletion error: ${err.message}` }, 500);
  }
});

// ── Blog Posts ────────────────────────────────────────────────────────────────

app.get("/blogs", async (c) => c.json((await kv.get("blog_posts")) || []));

app.post("/blogs", async (c) => {
  const post = await c.req.json();
  const blogs = (await kv.get("blog_posts")) || [];
  const newPost = { id: post.id || String(Date.now()), ...post };
  blogs.unshift(newPost);
  await kv.set("blog_posts", blogs);
  return c.json(newPost);
});

app.put("/blogs/batch", async (c) => {
  const blogs = await c.req.json();
  await kv.set("blog_posts", blogs);
  return c.json({ success: true });
});

app.put("/blogs/:id", async (c) => {
  const id = c.req.param("id");
  const updates = await c.req.json();
  const blogs = (await kv.get("blog_posts")) || [];
  const idx = blogs.findIndex((b: any) => b.id === id);
  if (idx < 0) return c.json({ error: "Blog post not found" }, 404);
  blogs[idx] = { ...blogs[idx], ...updates };
  await kv.set("blog_posts", blogs);
  return c.json(blogs[idx]);
});

app.delete("/blogs/:id", async (c) => {
  const id = c.req.param("id");
  const blogs = (await kv.get("blog_posts")) || [];
  await kv.set("blog_posts", blogs.filter((b: any) => b.id !== id));
  return c.json({ success: true });
});

// ── Brand Verification ────────────────────────────────────────────────────────

app.get("/verifications", async (c) => c.json((await kv.get("brand_verifications")) || []));

app.get("/verifications/:brandId", async (c) => {
  const brandId = c.req.param("brandId");
  const verifications = (await kv.get("brand_verifications")) || [];
  return c.json(verifications.find((v: any) => v.brandId === brandId) || null);
});

app.post("/verifications", async (c) => {
  const data = await c.req.json();
  const verifications = (await kv.get("brand_verifications")) || [];
  const idx = verifications.findIndex((v: any) => v.brandId === data.brandId);
  const entry = { ...data, submittedAt: data.submittedAt || new Date().toISOString(), status: "pending" };
  if (idx >= 0) { verifications[idx] = entry; } else { verifications.push(entry); }
  await kv.set("brand_verifications", verifications);
  return c.json(entry);
});

app.put("/verifications/:brandId/approve", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const brandId = c.req.param("brandId");
  const { adminName, adminNotes } = await c.req.json();
  const verifications = (await kv.get("brand_verifications")) || [];
  const idx = verifications.findIndex((v: any) => v.brandId === brandId);
  if (idx < 0) return c.json({ error: "Verification not found" }, 404);
  verifications[idx] = { ...verifications[idx], status: "verified", verifiedAt: new Date().toISOString(), verifiedBy: adminName || "Admin", adminNotes: adminNotes || undefined, rejectedAt: undefined, rejectionReason: undefined };
  await kv.set("brand_verifications", verifications);
  return c.json(verifications[idx]);
});

app.put("/verifications/:brandId/reject", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const brandId = c.req.param("brandId");
  const { reason } = await c.req.json();
  const verifications = (await kv.get("brand_verifications")) || [];
  const idx = verifications.findIndex((v: any) => v.brandId === brandId);
  if (idx < 0) return c.json({ error: "Verification not found" }, 404);
  verifications[idx] = { ...verifications[idx], status: "rejected", rejectedAt: new Date().toISOString(), rejectionReason: reason, verifiedAt: undefined, verifiedBy: undefined };
  await kv.set("brand_verifications", verifications);
  return c.json(verifications[idx]);
});

app.put("/verifications", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  const verifications = await c.req.json();
  await kv.set("brand_verifications", verifications);
  return c.json({ success: true });
});

// ── Subscription ──────────────────────────────────────────────────────────────

app.get("/subscription/:userId", async (c) => {
  const userId = c.req.param("userId");
  return c.json((await kv.get(`brand_plan:${userId}`)) || { name: "Basic", isPaid: true });
});

app.put("/subscription/:userId", async (c) => {
  const userId = c.req.param("userId");
  const planData = await c.req.json();
  await kv.set(`brand_plan:${userId}`, planData);
  return c.json(planData);
});

app.get("/message-usage/:userId", async (c) => {
  const userId = c.req.param("userId");
  const today = new Date().toISOString().split("T")[0];
  return c.json({ count: (await kv.get(`msg_usage:${userId}:${today}`)) || 0 });
});

app.post("/message-usage/:userId/increment", async (c) => {
  const userId = c.req.param("userId");
  const today = new Date().toISOString().split("T")[0];
  const key = `msg_usage:${userId}:${today}`;
  const count = ((await kv.get(key)) || 0) + 1;
  await kv.set(key, count);
  return c.json({ count });
});

// ── Settings ──────────────────────────────────────────────────────────────────

app.get("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const data = await kv.get(`settings:${key}`);
  if (data && typeof data === "object") {
    const { adminPassword, ...safe } = data as any;
    return c.json(safe);
  }
  return c.json(data || null);
});

app.put("/settings/:key", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  const key = c.req.param("key");
  const data = await c.req.json();
  if (data && typeof data === "object") delete (data as any).adminPassword;
  await kv.set(`settings:${key}`, data);
  return c.json(data);
});

// ── Generic Data ──────────────────────────────────────────────────────────────

app.get("/data/:key", async (c) => {
  const key = c.req.param("key");
  return c.json((await kv.get(`data:${key}`)) || null);
});

app.put("/data/:key", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  const key = c.req.param("key");
  const data = await c.req.json();
  await kv.set(`data:${key}`, data);
  return c.json({ success: true });
});

// ── Statistics ───────────────────────────────────────────────────────────────

app.get("/stats", async (c) => {
  try {
    const [influencers, collaborations, adminUsers] = await Promise.all([
      kv.get("influencers"), kv.get("collaborations"), kv.get("admin_users"),
    ]);
    const infList = influencers || [];
    const collabList = collaborations || [];
    const userList = adminUsers || [];
    return c.json({
      totalInfluencers: infList.length,
      verifiedInfluencers: infList.filter((i: any) => i.status === "active").length,
      totalBrands: userList.filter((u: any) => u.role === "Brand" || u.role === "brand").length,
      totalCollaborations: collabList.length,
      activeCollaborations: collabList.filter((r: any) => r.status === "accepted").length,
    });
  } catch (err: any) {
    console.log("Stats error:", err.message);
    return c.json({ totalInfluencers: 0, verifiedInfluencers: 0, totalBrands: 0, totalCollaborations: 0, activeCollaborations: 0 });
  }
});

// ── IP Tracking ──────────────────────────────────────────────────────────────

app.get("/ip-tracking", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  return c.json((await kv.get("data:ip_records")) || []);
});

app.put("/ip-tracking", async (c) => {
  const records = await c.req.json();
  await kv.set("data:ip_records", records);
  return c.json({ success: true });
});

app.get("/ip-settings", async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Forbidden: admin access required" }, 403);
  return c.json((await kv.get("data:ip_settings")) || { maxFreeAccountsPerIP: 2, enableIPTracking: true, autoBlockAfterLimit: true });
});

app.put("/ip-settings", async (c) => {
  const settings = await c.req.json();
  await kv.set("data:ip_settings", settings);
  return c.json(settings);
});

// ── Billing ───────────────────────────────────────────────────────────────────

app.get("/billing/:userId", async (c) => {
  const userId = c.req.param("userId");
  return c.json((await kv.get(`billing:${userId}`)) || []);
});

app.post("/billing/:userId", async (c) => {
  const userId = c.req.param("userId");
  const entry = await c.req.json();
  const history = (await kv.get(`billing:${userId}`)) || [];
  history.unshift(entry);
  await kv.set(`billing:${userId}`, history);
  return c.json(history);
});

// ── Ratings ───────────────────────────────────────────────────────────────────

app.get("/ratings", async (c) => c.json((await kv.get("data:ratings")) || []));

app.put("/ratings", async (c) => {
  const ratings = await c.req.json();
  await kv.set("data:ratings", ratings);
  return c.json({ success: true });
});

// ── Inquiries ─────────────────────────────────────────────────────────────────

app.get("/inquiries", async (c) => c.json((await kv.get("data:sales_inquiries")) || []));

app.post("/inquiries", async (c) => {
  const inquiry = await c.req.json();
  const inquiries = (await kv.get("data:sales_inquiries")) || [];
  inquiries.unshift({ id: String(Date.now()), ...inquiry, submittedAt: new Date().toISOString(), status: "new" });
  await kv.set("data:sales_inquiries", inquiries);
  return c.json({ success: true });
});

app.put("/inquiries", async (c) => {
  const inquiries = await c.req.json();
  await kv.set("data:sales_inquiries", inquiries);
  return c.json({ success: true });
});

// ── Deletion Requests ─────────────────────────────────────────────────────────

app.get("/deletion-requests", async (c) => c.json((await kv.get("data:deletion_requests")) || []));

app.post("/deletion-requests", async (c) => {
  const request = await c.req.json();
  const requests = (await kv.get("data:deletion_requests")) || [];
  requests.unshift({ id: String(Date.now()), ...request, submittedAt: new Date().toISOString(), status: "pending" });
  await kv.set("data:deletion_requests", requests);
  return c.json({ success: true });
});

app.put("/deletion-requests", async (c) => {
  const requests = await c.req.json();
  await kv.set("data:deletion_requests", requests);
  return c.json({ success: true });
});

// ── Trust Badges ──────────────────────────────────────────────────────────────

app.get("/trust-badges", async (c) => c.json((await kv.get("data:trust_badges")) || null));

app.put("/trust-badges", async (c) => {
  const badges = await c.req.json();
  await kv.set("data:trust_badges", badges);
  return c.json({ success: true });
});

// ── Favorites ─────────────────────────────────────────────────────────────────

app.get("/favorites/:userId", async (c) => {
  const userId = c.req.param("userId");
  return c.json((await kv.get(`favorites:${userId}`)) || []);
});

app.put("/favorites/:userId", async (c) => {
  const userId = c.req.param("userId");
  const favorites = await c.req.json();
  await kv.set(`favorites:${userId}`, favorites);
  return c.json({ success: true });
});

// ── Email ─────────────────────────────────────────────────────────────────────
//
// Unified email-send endpoint that runs server-side, bypassing CORS restrictions
// that prevent browsers from calling Resend / SendGrid / Mailgun directly.
//
// Body: {
//   to, subject, htmlBody,
//   textBody?,
//   provider?  : "resend" | "sendgrid" | "mailgun" | "brevo"
//   apiKey?    : provider API key (passed from client config)
//   senderEmail?: verified sender address
//   senderName? : display name
//   // Mailgun-specific
//   domain?    : Mailgun sending domain
//   region?    : "us" | "eu"
//   templateId?: informational tag only
// }

app.post("/email/send", async (c) => {
  try {
    const body = await c.req.json();
    const {
      to, subject, htmlBody, textBody,
      provider, apiKey,
      senderEmail, senderName = "FLUBN",
      domain, region = "us",
    } = body;

    if (!to || !subject || !htmlBody) {
      return c.json({ success: false, error: "Missing required fields: to, subject, htmlBody" }, 400);
    }

    // ── Resend ────────────────────────────────────────────────────────────────
    if (provider === "resend" && apiKey && senderEmail) {
      const from = senderName ? `${senderName} <${senderEmail}>` : senderEmail;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: htmlBody,
          ...(textBody && { text: textBody }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return c.json({ success: false, error: data.message || data.name || `Resend error ${res.status}` });
      }
      return c.json({ success: true, messageId: data.id });
    }

    // ── SendGrid ──────────────────────────────────────────────────────────────
    if (provider === "sendgrid" && apiKey && senderEmail) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { email: senderEmail, name: senderName },
          personalizations: [{ to: [{ email: to }], subject }],
          content: [
            { type: "text/html", value: htmlBody },
            ...(textBody ? [{ type: "text/plain", value: textBody }] : []),
          ],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.errors?.[0]?.message || `SendGrid error ${res.status}`;
        return c.json({ success: false, error: msg });
      }
      return c.json({ success: true, messageId: `sg-${Date.now()}` });
    }

    // ── Mailgun ───────────────────────────────────────────────────────────────
    if (provider === "mailgun" && apiKey && senderEmail && domain) {
      const base = region === "eu" ? "https://api.eu.mailgun.net/v3" : "https://api.mailgun.net/v3";
      const from = senderName ? `${senderName} <${senderEmail}>` : senderEmail;
      const encoded = btoa(`api:${apiKey}`);
      const form = new FormData();
      form.append("from", from);
      form.append("to", to);
      form.append("subject", subject);
      form.append("html", htmlBody);
      if (textBody) form.append("text", textBody);
      const res = await fetch(`${base}/${domain}/messages`, {
        method: "POST",
        headers: { Authorization: `Basic ${encoded}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return c.json({ success: false, error: data.message || `Mailgun error ${res.status}` });
      }
      return c.json({ success: true, messageId: data.id || `mg-${Date.now()}` });
    }

    // ── Brevo (env-var fallback) ───────────────────────────────────────────────
    const brevoKey = (provider === "brevo" && apiKey) ? apiKey : Deno.env.get("BREVO_API_KEY");
    const brevoSender = senderEmail || Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@flubn.com";
    if (brevoKey) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { email: brevoSender, name: senderName },
          to: [{ email: to }],
          subject,
          htmlContent: htmlBody,
          ...(textBody && { textContent: textBody }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return c.json({ success: false, error: data.message || `Brevo error ${res.status}` });
      }
      return c.json({ success: true, messageId: data.messageId });
    }

    return c.json({ success: false, error: "No email provider configured. Pass provider + apiKey in the request body, or set BREVO_API_KEY in Edge Function secrets." });
  } catch (err: any) {
    console.log("[email/send] error:", err.message);
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post("/email/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const { recipients, subject, htmlBody, textBody, provider, apiKey, senderEmail, senderName } = body;

    if (!recipients?.length || !subject || !htmlBody) {
      return c.json({ success: false, error: "Missing required fields", sent: 0, failed: 0 }, 400);
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const singleBody = {
        to: recipient.email,
        subject,
        htmlBody,
        textBody,
        provider,
        apiKey,
        senderEmail,
        senderName,
      };

      // Re-use the single-send logic via an internal fetch to keep DRY
      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/server/email/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(singleBody),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.success) { sent++; } else { failed++; errors.push(data?.error || "Unknown"); }
      } catch (e: any) {
        failed++;
        errors.push(e.message);
      }
    }

    return c.json({ success: sent > 0, sent, failed, errors: errors.length ? errors : undefined });
  } catch (err: any) {
    console.log("[email/bulk] error:", err.message);
    return c.json({ success: false, sent: 0, failed: 0, error: err.message }, 500);
  }
});

// ── Dashboard Layouts ─────────────────────────────────────────────────────────

app.get("/dashboard-layout/:type", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json(null);
  const type = c.req.param("type");
  try {
    const layout = await kv.get(`dashboard_layout:${authUser.id}:${type}`);
    return c.json(layout || null);
  } catch (err: any) {
    console.log(`[dashboard-layout GET] error: ${err.message}`);
    return c.json(null);
  }
});

app.put("/dashboard-layout/:type", async (c) => {
  const authUser = await getAuthUser(c);
  if (!authUser) return c.json({ error: "Unauthorized" }, 401);
  const type = c.req.param("type");
  try {
    const body = await c.req.json();
    const { order } = body;
    if (!Array.isArray(order)) return c.json({ error: "Invalid layout: order must be an array" }, 400);
    await kv.set(`dashboard_layout:${authUser.id}:${type}`, {
      order,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[dashboard-layout] Saved layout for user ${authUser.id}, type: ${type}, widgets: ${order.length}`);
    return c.json({ success: true });
  } catch (err: any) {
    console.log(`[dashboard-layout PUT] error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

// ── Serve ─────────────────────────────────────────────────────────────────────

Deno.serve(app.fetch);