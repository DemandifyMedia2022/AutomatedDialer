"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
	Field,
	FieldLabel,
} from "@/components/ui/field";
import { AtSignIcon, ChevronLeftIcon, LockIcon } from "lucide-react";
import type React from "react";
import { FloatingPaths } from "@/components/floating-paths";
import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { USE_AUTH_COOKIE, setToken } from "@/lib/auth";

export function AuthPage() {
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fpOpen, setFpOpen] = useState(false);
	const [fpStep, setFpStep] = useState<1 | 2 | 3>(1);
	const [fpEmail, setFpEmail] = useState("");
	const [fpOtp, setFpOtp] = useState("");
	const [fpToken, setFpToken] = useState("");
	const [fpPassword, setFpPassword] = useState("");
	const [fpLoading, setFpLoading] = useState(false);
	const [fpMessage, setFpMessage] = useState<string | null>(null);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setError(null);
		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);
		const email = String(fd.get("email") || "");
		const password = String(fd.get("password") || "");
		try {
			const res = await fetch(`${API_BASE}/api/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
				credentials: USE_AUTH_COOKIE ? "include" : "omit",
			});
			if (!res.ok) {
				const msg = (await res.json()).message || "Login failed";
				setError(msg);
				return;
			}
			const data = await res.json();
			if (data.token) setToken(data.token);
			const role = String((data.user?.role || "")).toLowerCase();
			if (role === "manager") router.replace("/dashboard/manager");
			else if (role === "superadmin") router.replace("/dashboard/superadmin");
			else if (role === "qa") router.replace("/dashboard/qa");
			else router.replace("/dashboard/agent");
		} catch {
			setError("Network error");
		} finally {
			setSubmitting(false);
		}
	};

	const startForgot = () => {
		setFpOpen(true);
		setFpStep(1);
		setFpEmail("");
		setFpOtp("");
		setFpToken("");
		setFpPassword("");
		setFpMessage(null);
	};

	const submitEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fpEmail) return;
		setFpLoading(true);
		setFpMessage(null);
		try {
			await fetch(`${API_BASE}/api/auth/forgot-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: fpEmail }),
			});
			setFpMessage("OTP is sent to your email.");
			setFpStep(2);
		} catch {
			setFpMessage("Request failed. Try again.");
		} finally {
			setFpLoading(false);
		}
	};

	const submitOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fpEmail || !fpOtp) return;
		setFpLoading(true);
		setFpMessage(null);
		try {
			const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: fpEmail, otp: fpOtp }),
			});
			const data = await res.json();
			if (!res.ok || !data.reset_token) {
				setFpMessage(data.message || "Invalid or expired OTP");
				return;
			}
			setFpToken(String(data.reset_token));
			setFpStep(3);
		} catch {
			setFpMessage("Verification failed. Try again.");
		} finally {
			setFpLoading(false);
		}
	};

	const submitReset = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!fpEmail || !fpToken || !fpPassword) return;
		setFpLoading(true);
		setFpMessage(null);
		try {
			const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: fpEmail, reset_token: fpToken, new_password: fpPassword }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				setFpMessage(data.message || "Reset failed");
				return;
			}
			setFpOpen(false);
		} catch {
			setFpMessage("Reset failed. Try again.");
		} finally {
			setFpLoading(false);
		}
	};

	return (
		<>
			<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
				<div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
					<Logo className="mr-auto h-5" />

					<div className="z-10 mt-auto">
						<blockquote className="space-y-2">
							<p className="text-xl">
								&ldquo;This Platform has helped me to save time and serve my
								clients faster than ever before.&rdquo;
							</p>
							<footer className="font-mono font-semibold text-sm">
								~ Jane Doe, Sales Manager
							</footer>
						</blockquote>
					</div>
					<div className="absolute inset-0">
						<FloatingPaths position={1} />
						<FloatingPaths position={-1} />
					</div>
				</div>
				<div className="relative flex min-h-screen flex-col justify-center p-4">
					<div
						aria-hidden
						className="-z-10 absolute inset-0 isolate opacity-60 contain-strict"
					>
						<div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
						<div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
						<div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
					</div>

					<div className="mx-auto space-y-6 sm:w-sm">
						<Logo className="h-5 lg:hidden" />
						<div className="flex flex-col space-y-3 text-center">
							<h1 className="font-bold text-3xl tracking-wide">
								Welcome Back
							</h1>
							<p className="text-base text-muted-foreground">
								Sign in to access your Automated Dialer dashboard and manage your campaigns efficiently.
							</p>
						</div>

						<form className="space-y-5" onSubmit={handleLogin}>
							<div className="space-y-3">
								<label htmlFor="email" className="text-sm font-medium">
									Email or User ID
								</label>
								<InputGroup>
									<InputGroupInput
										id="email"
										name="email"
										placeholder="m@example.com or DM-AB-0001"
										type="text"
										required
									/>
									<InputGroupAddon>
										<AtSignIcon />
									</InputGroupAddon>
								</InputGroup>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<label htmlFor="password" className="text-sm font-medium">
										Password
									</label>
									<button
										type="button"
										onClick={startForgot}
										className="text-sm underline-offset-2 hover:underline text-muted-foreground"
									>
										Forgot password?
									</button>
								</div>
								<InputGroup>
									<InputGroupInput
										id="password"
										name="password"
										placeholder="Enter your password"
										type="password"
										required
									/>
									<InputGroupAddon>
										<LockIcon />
									</InputGroupAddon>
								</InputGroup>
							</div>

							{error && (
								<p className="text-destructive text-sm">{error}</p>
							)}

							<Button className="w-full mt-2" size="lg" type="submit" disabled={submitting}>
								{submitting ? "Logging in..." : "Login"}
							</Button>
						</form>

						<p className="mt-8 text-muted-foreground text-sm text-center">
							By clicking continue, you agree to our{" "}
							<a
								className="underline underline-offset-4 hover:text-primary"
								href="#"
							>
								Terms of Service
							</a>{" "}
							and{" "}
							<a
								className="underline underline-offset-4 hover:text-primary"
								href="#"
							>
								Privacy Policy
							</a>
							.
						</p>
					</div>
				</div>
			</main>

			<Dialog open={fpOpen} onOpenChange={setFpOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reset password</DialogTitle>
						<DialogDescription>Use the email OTP to reset your password.</DialogDescription>
					</DialogHeader>
					{fpStep === 1 && (
						<form onSubmit={submitEmail} className="flex flex-col gap-4">
							<Field>
								<FieldLabel htmlFor="fp-email">Email</FieldLabel>
								<Input id="fp-email" type="email" required value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} />
							</Field>
							{fpMessage ? <p className="text-muted-foreground text-sm">{fpMessage}</p> : null}
							<Button type="submit" disabled={fpLoading}>{fpLoading ? "Sending..." : "Send OTP"}</Button>
						</form>
					)}
					{fpStep === 2 && (
						<form onSubmit={submitOtp} className="flex flex-col gap-4">
							<Field>
								<FieldLabel htmlFor="fp-otp">OTP</FieldLabel>
								<InputOTP value={fpOtp} onChange={(v) => setFpOtp(String(v).replace(/[^0-9]/g, '').slice(0, 6))} maxLength={6}>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
										<InputOTPSlot index={3} />
										<InputOTPSlot index={4} />
										<InputOTPSlot index={5} />
									</InputOTPGroup>
								</InputOTP>
							</Field>
							{fpMessage ? <p className="text-destructive text-sm">{fpMessage}</p> : null}
							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={() => setFpStep(1)}>Back</Button>
								<Button type="submit" disabled={fpLoading}>{fpLoading ? "Verifying..." : "Verify OTP"}</Button>
							</div>
						</form>
					)}
					{fpStep === 3 && (
						<form onSubmit={submitReset} className="flex flex-col gap-4">
							<Field>
								<FieldLabel htmlFor="fp-newpass">New password</FieldLabel>
								<Input id="fp-newpass" type="password" required value={fpPassword} onChange={(e) => setFpPassword(e.target.value)} />
							</Field>
							{fpMessage ? <p className="text-destructive text-sm">{fpMessage}</p> : null}
							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={() => setFpStep(2)}>Back</Button>
								<Button type="submit" disabled={fpLoading}>{fpLoading ? "Saving..." : "Reset password"}</Button>
							</div>
						</form>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
	<svg
		fill="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<g>
			<path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
		</g>
	</svg>
);

function AppleIcon({
	fill = "currentColor",
	...props
}: React.ComponentProps<"svg">) {
	return (
		<svg fill={fill} viewBox="0 0 24 24" {...props}>
			<g id="_Group_2">
				<g id="_Group_3">
					<path
						d="M18.546,12.763c0.024-1.87,1.004-3.597,2.597-4.576c-1.009-1.442-2.64-2.323-4.399-2.378    c-1.851-0.194-3.645,1.107-4.588,1.107c-0.961,0-2.413-1.088-3.977-1.056C6.122,5.927,4.25,7.068,3.249,8.867    c-2.131,3.69-0.542,9.114,1.5,12.097c1.022,1.461,2.215,3.092,3.778,3.035c1.529-0.063,2.1-0.975,3.945-0.975    c1.828,0,2.364,0.975,3.958,0.938c1.64-0.027,2.674-1.467,3.66-2.942c0.734-1.041,1.299-2.191,1.673-3.408    C19.815,16.788,18.548,14.879,18.546,12.763z"
						id="_Path_"
					/>
					<path
						d="M15.535,3.847C16.429,2.773,16.87,1.393,16.763,0c-1.366,0.144-2.629,0.797-3.535,1.829    c-0.895,1.019-1.349,2.351-1.261,3.705C13.352,5.548,14.667,4.926,15.535,3.847z"
						id="_Path_2"
					/>
				</g>
			</g>
		</svg>
	);
}

const GithubIcon = (props: React.ComponentProps<"svg">) => (
	<svg fill="currentColor" viewBox="0 0 1024 1024" {...props}>
		<path
			clipRule="evenodd"
			d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
			fill="currentColor"
			fillRule="evenodd"
			transform="scale(64)"
		/>
	</svg>
);
