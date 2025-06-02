const roles = ["admin", "user", "moderator"] as const;
type Role = (typeof roles)[number];

export function assignRole(role: Role) {
    return `Assigned role: ${role}`;
}

// assignRole('guest'); // ❌ Error: Argument of type '"guest"' is not assignable
assignRole("admin"); // ✅ OK
