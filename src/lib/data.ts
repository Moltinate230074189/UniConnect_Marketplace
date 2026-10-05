import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CAMPUSES = [
  "University of Cape Town",
  "Cape Peninsula University of Technology",
  "University of the Witwatersrand",
  "University of Pretoria",
  "University of Johannesburg",
  "Stellenbosch University",
  "University of KwaZulu-Natal",
  "North-West University",
  "University of the Free State",
  "Rhodes University",
  "University of the Western Cape",
];

export const isUniEmail = (email: string) => /@([a-z0-9-]+\.)*(ac\.za|edu)$/i.test(email.trim());

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const productsQuery = (opts: { category?: string; q?: string; limit?: number } = {}) =>
  queryOptions({
    queryKey: ["products", opts],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories!inner(slug,name)")
        .order("created_at", { ascending: false });
      if (opts.category) query = query.eq("categories.slug", opts.category);
      if (opts.q) query = query.ilike("title", `%${opts.q}%`);
      if (opts.limit) query = query.limit(opts.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, reviews(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, campus_name, avatar_url, two_factor_enabled, created_at").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    const r = roles?.map((x) => x.role) ?? [];
    const role = r.includes("admin") ? "Administrator" : r.includes("vendor") ? "Vendor" : r.includes("faculty") ? "Faculty" : "Student";
    return { user: u.user, profile, role };
  },
});
