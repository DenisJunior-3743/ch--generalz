import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loginSchema } from "../schemas/loginSchema";
import TextField from "../components/forms/TextField";
import logo from "../assets/must-logo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [banner, setBanner] = useState(
    location.state?.registered
      ? { type: "success", message: "Account created — sign in below." }
      : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: location.state?.username ?? "",
      password: "",
    },
  });

  async function onSubmit(values) {
    setBanner(null);
    try {
      await login(values.username, values.password);
      const redirectTo = location.state?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Invalid username or password.",
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-5">
      <div className="w-full max-w-[380px] rounded-lg bg-surface px-8 py-9 text-center shadow-md">
        <img src={logo} alt="MUST logo" className="mb-3 h-14 w-14 object-contain" />
        <h1 className="mb-1 text-[19px] text-foreground">MUST Records System</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to continue</p>

        {banner && (
          <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 text-left">
          <TextField
            label="Username"
            error={errors.username}
            {...register("username")}
          />
          <TextField
            label="Password"
            type="password"
            error={errors.password}
            {...register("password")}
          />
          <button type="submit" className="form-submit mt-1 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-xs text-muted-foreground">
          Have no account?{" "}
          <Link to="/register" className="font-semibold text-navy no-underline hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
