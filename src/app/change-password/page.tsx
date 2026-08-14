import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 px-4">
      <span className="flex size-12 items-center justify-center rounded-lg bg-brand text-lg font-bold text-brand-foreground">
        TP
      </span>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl text-brand">Passwort ändern</CardTitle>
          <p className="text-sm text-muted-foreground">
            Beim ersten Login muss ein neues, persönliches Passwort vergeben werden.
          </p>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
