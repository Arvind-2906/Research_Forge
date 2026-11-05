import { api } from "../lib/api/client";

export const authService = {
  async signIn(email, password) {
    return api.post("/auth/sign-in/email", { email, password });
  },

  async signUp(name, email, password) {
    return api.post("/auth/sign-up/email", { name, email, password });
  },

  async signOut() {
    return api.post("/auth/sign-out", {});
  },

  async getSession() {
    try {
      const res = await api.get("/auth/get-session");
      // Better-auth returns { user, session } or null
      return res;
    } catch {
      return null;
    }
  },
};

