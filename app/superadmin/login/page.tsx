"use client";

/**
 * Superadmin Login Page
 * Separate authentication for system-level access
 * 
 * @module app/superadmin/login/page
 */

import { useState } from "react";
import { Lock, AlertCircle, Shield, Eye, EyeOff } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FieldErrors = {
  username?: string;
  password?: string;
  secretKey?: string;
};

export default function SuperadminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, secretKey }),
        credentials: "include", // Ensure cookies are sent and received
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Authentication failed";
        setError(errorMessage);
        
        // Set field-specific error and focus the failing field
        if (data.field) {
          setFieldErrors({ [data.field]: errorMessage });
          
          // Auto-focus the failing field
          setTimeout(() => {
            document.getElementById(data.field)?.focus();
          }, 100);
        }
        return;
      }

      // Log login response diagnostics (includes signing secret source)
      // eslint-disable-next-line no-console -- Auth flow debugging
      console.log("[SUPERADMIN] Login response", {
        success: data.success,
        role: data.role,
        _debug: data._debug, // Shows which secret was used for signing
      });

      // CRITICAL: Use window.location.href for full page reload after login
      // router.push() uses client-side navigation which doesn't properly
      // send the newly-set httpOnly cookie to the server on first request.
      // A full page reload ensures the browser includes the cookie.
      
      // Step 1: Wait for browser to process Set-Cookie header
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 2: Verify cookie was set by calling check-cookie endpoint
      try {
        const cookieCheck = await fetch("/api/superadmin/check-cookie", {
          credentials: "include",
        });
        
        // Handle non-200 responses explicitly
        if (!cookieCheck.ok) {
          // eslint-disable-next-line no-console -- Critical auth debugging
          console.error("[SUPERADMIN] Cookie check returned error", {
            status: cookieCheck.status,
            statusText: cookieCheck.statusText,
          });
          // Don't block redirect for check failures - the cookie might still work
          // eslint-disable-next-line no-console -- Auth flow debugging
          console.warn("[SUPERADMIN] Proceeding with redirect despite check-cookie error");
        } else {
          const cookieData = await cookieCheck.json();
          
          // Log full diagnostics for comparison
          // eslint-disable-next-line no-console -- Auth flow debugging
          console.log("[SUPERADMIN] Check-cookie response", {
            hasCookie: cookieData.cookies?.hasSuperadminCookie,
            cookieLength: cookieData.cookies?.superadminCookieLength,
            sessionValid: cookieData.session?.valid,
            sessionError: cookieData.session?.error,
            jwt: cookieData.jwt, // Shows which secret Edge runtime is using
          });
          
          if (!cookieData.cookies?.hasSuperadminCookie) {
            // Cookie wasn't set - show error instead of redirect loop
            // eslint-disable-next-line no-console -- Critical auth debugging
            console.error("[SUPERADMIN] Cookie not set after login", cookieData);
            setError("Login succeeded but session cookie was not set. This may be a server configuration issue. Check browser console for details.");
            return;
          }
          
          // Check if session verification failed (cookie present but JWT invalid)
          if (cookieData.session && !cookieData.session.valid) {
            // eslint-disable-next-line no-console -- Critical auth debugging
            console.error("[SUPERADMIN] Session verification failed", {
              error: cookieData.session.error,
              loginDebug: data._debug, // What the login API used
              checkCookieJwt: cookieData.jwt, // What the Edge runtime has
            });
            
            // Provide specific error message based on mismatch
            const loginSource = data._debug?.signingSecretSource;
            const edgeSource = cookieData.jwt?.secretSource;
            if (loginSource && edgeSource && loginSource !== edgeSource) {
              setError(`SECRET MISMATCH: Login signed with ${loginSource}, but Edge verifies with ${edgeSource}. Ensure both runtimes use the same secret.`);
            } else if (!cookieData.jwt?.hasSecret) {
              setError(`No JWT secret in Edge runtime. Set SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET in Vercel and redeploy.`);
            } else {
              setError(`Session verification failed: ${cookieData.session.error || 'JWT decode error'}. Check browser console for details.`);
            }
            return;
          }
          
          // eslint-disable-next-line no-console -- Auth flow debugging
          console.log("[SUPERADMIN] Cookie verified, redirecting...", {
            sessionData: cookieData.session?.data,
          });
        }
      } catch (checkError) {
        // If check fails entirely (network error), proceed anyway - might work
        // eslint-disable-next-line no-console -- Auth flow debugging
        console.warn("[SUPERADMIN] Cookie check failed, proceeding with redirect", checkError);
      }
      
      // Step 3: Redirect to issues page
      window.location.href = "/superadmin/issues";
    } catch (_err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Superadmin Access</CardTitle>
          <CardDescription>
            System-level administrative access. Authorized personnel only.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-red-600">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
                className={fieldErrors.username ? "border-red-500 focus-visible:ring-red-500" : ""}
                aria-invalid={!!fieldErrors.username}
              />
              {fieldErrors.username && (
                <p className="text-sm text-red-600">{fieldErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className={`pe-10 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Access key (if required)</Label>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Leave empty unless required"
                  autoComplete="one-time-code"
                  className={`pe-10 ${fieldErrors.secretKey ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  aria-invalid={!!fieldErrors.secretKey}
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute end-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showSecretKey ? "Hide access key" : "Show access key"}
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.secretKey && (
                <p className="text-sm text-red-600">{fieldErrors.secretKey}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Only required if server has SUPERADMIN_SECRET_KEY configured
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <Lock className="h-4 w-4 me-2" />
                  Sign In
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
