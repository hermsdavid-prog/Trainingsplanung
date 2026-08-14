import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 px-4">
      <span className="flex size-12 items-center justify-center rounded-lg bg-brand text-lg font-bold text-brand-foreground">
        TP
      </span>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl text-brand">Trainingsplanung</CardTitle>
          <p className="text-sm text-muted-foreground">
            Melde dich mit deinen Zugangsdaten an.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
